import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Cpu, FileWarning, MessageCircleQuestion, RotateCw, Sparkles, Square, Trash2, X, Zap } from 'lucide-react'
import { usePipeline } from '../../lib/hooks'
import { useModel } from '../../lib/useModel'
import { ModelCard, type ModelInfo } from '../../ui/ModelCard'
import { ToolIntro } from '../../ui/Shell'
import { FileBadge, FileDrop, usePdf } from '../../ui/PdfKit'
import { PdfViewer, type Highlight } from '../../ui/PdfViewer'
import { Button, Chip, CopyButton, Kicker, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'
import { terms } from '../search/rank'
import { CHUNKER_VERSION } from './rag/chunk'
import type { EmbedInput, IndexOutput, IndexProgress } from './rag/embed.worker'
import { extractPages, hasText, joinPages, pageStarts } from './rag/extract'
import { isRefusal, type OccStage } from './rag/occ'
import type { AnswerInput, AnswerOutput, AnswerProgress, OccConfig } from './rag/occ.worker'
import { buildBm25, retrieve, type DocIndex } from './rag/retrieve'
import { clearIndexes, countIndexes, fileHash, indexKey, loadIndex, saveIndex } from './rag/store'
import type { PageText, Passage } from './rag/types'

const TOP_K = 5
/** Above this the browser tab is likely to run out of memory while indexing. */
const MAX_PAGES = 2000
/** Extractive mode declines below these (cosine of the best passage, reader confidence). */
const MIN_COSINE = 0.2
const MIN_QA = 0.4
const NO_ANSWER = "I couldn't produce a reliable answer from this PDF for that question. Try asking it more specifically."
const NOT_FOUND = "I couldn't find enough information in this PDF to answer that question."

const EMBED_INFO: ModelInfo = { name: 'mixedbread-ai/mxbai-embed-xsmall-v1', href: 'https://huggingface.co/mixedbread-ai/mxbai-embed-xsmall-v1', size: '~25–50 MB', task: 'search index (embeddings)' }
const OCC_INFO: ModelInfo = { name: 'occ-ai/OCC-RAG-0.6B-ONNX', href: 'https://huggingface.co/occ-ai/OCC-RAG-0.6B-ONNX', size: '~470–560 MB', task: 'grounded answers', license: 'The answer model is a one-time download of roughly half a gigabyte; it is cached for later visits.' }
const QA_INFO: ModelInfo = { name: 'Xenova/distilbert-base-cased-distilled-squad', href: 'https://huggingface.co/Xenova/distilbert-base-cased-distilled-squad', size: '~65 MB', task: 'extractive answers (lightweight mode)' }

const STARTERS = ['What is this document about?', 'What are the key dates and deadlines?', 'Who are the people or parties involved?', 'What amounts or numbers are mentioned?']

type Mode = 'generative' | 'extractive'

type DocStatus =
  | { kind: 'idle' }
  | { kind: 'extracting'; page: number; total: number }
  | { kind: 'indexing'; done: number; total: number }
  | { kind: 'ready'; restored: boolean }
  | { kind: 'no-text' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }

interface Turn {
  id: number
  question: string
  mode: Mode
  status: 'retrieving' | 'generating' | 'done' | 'refused' | 'stopped' | 'error'
  stage?: OccStage
  tokens?: number
  answer: string
  /** Passages given to the model, best first. */
  passages: Passage[]
  /** Indexes into `passages` the answer is attributed to. */
  cited: number[]
  /** False when the model answered without naming sources: we then list what it was given. */
  citedByModel: boolean
  error?: string
}

interface Evidence {
  page: number
  start: number
  end: number
}

const pageOf = (starts: number[], offset: number) => {
  let page = 1
  for (let i = 0; i < starts.length; i++) if (starts[i] <= offset) page = i + 1
  return page
}

/**
 * The sentences of a passage that support an answer, one per page, best
 * first. A passage can span pages, so an answer combining two facts can cite
 * both. Matches on the answer's words; question words only break ties, so a
 * sentence that merely repeats the question doesn't win. Every page returned
 * is a real page of the passage.
 */
function evidence(passage: Passage, docText: string, starts: number[], answer: string, question: string): Evidence[] {
  const slice = docText.slice(passage.start, passage.end)
  const fallback = [{ page: passage.pageNumbers[0], start: passage.start, end: passage.end }]
  // Extractive answers are verbatim: find them directly.
  const literal = answer.length > 2 ? slice.indexOf(answer) : -1
  const sentences = [...slice.matchAll(/[^.!?\n]+[.!?]*/g)].map((m) => ({ start: passage.start + m.index, end: passage.start + m.index + m[0].length, text: m[0] }))
  if (literal >= 0) {
    const at = passage.start + literal
    const s = sentences.find((x) => x.start <= at && x.end > at)
    return [{ page: pageOf(starts, at), start: s?.start ?? at, end: s?.end ?? at + answer.length }]
  }
  // Greedy cover: keep taking the sentence that explains the most answer
  // words not yet explained, so "X is Priya Raman (p.2) and reports every two
  // weeks (p.5)" cites both pages.
  const uncovered = new Set(terms(answer))
  const ask = new Set(terms(question))
  const pool = sentences.map((x) => ({ ...x, terms: new Set(terms(x.text)) }))
  const byPage = new Map<number, Evidence>()
  while (uncovered.size && byPage.size < 3) {
    let best: (typeof pool)[number] | null = null
    let gain = 0
    for (const x of pool) {
      const g = [...uncovered].filter((w) => x.terms.has(w)).length + 0.1 * [...ask].filter((w) => x.terms.has(w)).length
      if (g > gain) [best, gain] = [x, g]
    }
    // A later sentence must add at least two answer words to count as evidence.
    if (!best || gain < (byPage.size ? 2 : 1)) break
    for (const w of best.terms) uncovered.delete(w)
    pool.splice(pool.indexOf(best), 1)
    const page = pageOf(starts, best.start)
    if (!byPage.has(page) && passage.pageNumbers.includes(page)) byPage.set(page, { page, start: best.start, end: best.end })
  }
  return byPage.size ? [...byPage.values()] : fallback
}

/** Tidy DistilBERT's token spacing: "$ 1, 250, 000" → "$1,250,000". */
const tidy = (s: string) =>
  s
    .replace(/([$£€¥#])\s+(?=\d)/g, '$1')
    .replace(/(\d)\s*([,.])\s*(?=\d)/g, '$1$2')
    .replace(/\s+([,.;:%)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/(\w) - (\w)/g, '$1-$2')

function friendlyPdfError(msg: string | null) {
  if (!msg) return null
  if (/invalid pdf|structure|xref|unexpected/i.test(msg)) return 'This PDF looks damaged and could not be opened. Try re-saving or re-exporting it.'
  return msg
}

export default function AskPdfPage() {
  const embedder = useModel(() => new Worker(new URL('./rag/embed.worker.ts', import.meta.url), { type: 'module' }))
  const generator = useModel(() => new Worker(new URL('./rag/occ.worker.ts', import.meta.url), { type: 'module' }), { allowCpu: false } satisfies OccConfig)
  const { model: qa, callWith: qaCall } = usePipeline({ task: 'question-answering', model: 'Xenova/distilbert-base-cased-distilled-squad', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const pdf = usePdf()

  const [fileError, setFileError] = useState<string | null>(null)
  const [pages, setPages] = useState<PageText[] | null>(null)
  const [index, setIndex] = useState<DocIndex | null>(null)
  const [status, setStatus] = useState<DocStatus>({ kind: 'idle' })
  const [turns, setTurns] = useState<Turn[]>([])
  const [q, setQ] = useState('')
  const [viewerPage, setViewerPage] = useState(1)
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const [quote, setQuote] = useState<{ page: number; text: string } | null>(null)
  const [cpuOptIn, setCpuOptIn] = useState(false)
  const [remember, setRemember] = useState(false)
  const [saved, setSaved] = useState(0)
  const [online, setOnline] = useState(true)
  const job = useRef<AbortController | null>(null)
  const turnId = useRef(0)
  const viewerRef = useRef<HTMLDivElement>(null)

  const gpu = generator.gpu
  const deviceMemory = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined
  // Generative mode needs WebGPU (or an explicit CPU opt-in). If the answer
  // model fails to load we drop to extractive answers over the same index.
  const mode: Mode | null = !gpu ? null : (gpu.webgpu || cpuOptIn) && generator.phase !== 'error' ? 'generative' : 'extractive'
  const busy = turns.some((t) => t.status === 'retrieving' || t.status === 'generating')
  const starts = pages ? pageStarts(pages) : []

  useEffect(() => {
    void countIndexes().then(setSaved)
    setOnline(navigator.onLine)
    const on = () => setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  // ── Indexing ────────────────────────────────────────────────────────────
  const indexDocument = useCallback(
    async (signal: AbortSignal) => {
      const doc = pdf.doc
      const file = pdf.file
      if (!doc || !file) return
      const alive = () => !signal.aborted
      try {
        if (doc.numPages > MAX_PAGES) throw new Error(`This PDF has ${doc.numPages} pages. Ask PDF handles up to ${MAX_PAGES}; split it first with Split PDF.`)
        setStatus({ kind: 'extracting', page: 0, total: doc.numPages })
        const extracted = await extractPages(doc, (n) => alive() && setStatus({ kind: 'extracting', page: n, total: doc.numPages }), signal)
        if (!alive()) return
        setPages(extracted)
        if (!extracted.some(hasText)) return setStatus({ kind: 'no-text' })

        setStatus({ kind: 'indexing', done: 0, total: 0 })
        const hash = await fileHash(file)
        const variant = await embedder.run<string>('info', null) // boots the embedder
        if (!alive()) return
        const key = indexKey(hash, variant, CHUNKER_VERSION)
        const text = joinPages(extracted)

        const restored = await loadIndex(key)
        let built: DocIndex
        if (restored) {
          const chunks = restored.chunks.map((c, i) => ({ ...c, embedding: restored.vectors.subarray(i * restored.dim, (i + 1) * restored.dim) }))
          built = { key, chunks, text, bm25: buildBm25(chunks) }
        } else {
          const out = await embedder.run<IndexOutput>('index', { pages: extracted.map((p) => ({ text: p.text })) }, (p) => alive() && setStatus({ kind: 'indexing', ...(p as IndexProgress) }))
          if (!alive()) return
          const chunks = out.chunks.map((c, i) => ({ ...c, embedding: out.vectors.subarray(i * out.dim, (i + 1) * out.dim) }))
          built = { key, chunks, text, bm25: buildBm25(chunks) }
          if (remember) {
            await saveIndex({ key, name: file.name, savedAt: Date.now(), chunks: out.chunks, vectors: out.vectors, dim: out.dim })
            setSaved(await countIndexes())
          }
        }
        if (!alive()) return
        if (!built.chunks.length) return setStatus({ kind: 'no-text' })
        setIndex(built)
        setStatus({ kind: 'ready', restored: Boolean(restored) })
      } catch (e) {
        if (!alive()) return
        const msg = (e as Error).message
        if (/cancel|abort/i.test(msg)) return setStatus({ kind: 'cancelled' })
        setStatus({
          kind: 'error',
          message: /fetch|network|load/i.test(msg) && !navigator.onLine
            ? "You're offline and the search model isn't downloaded yet. Reconnect and retry."
            : /fetch|network/i.test(msg)
              ? "Couldn't download the search model. Check your connection and retry; files that finished downloading are kept."
              : msg,
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pdf.doc, pdf.file, embedder.run, remember],
  )

  const startIndexing = () => {
    job.current?.abort()
    const ctl = new AbortController()
    job.current = ctl
    void indexDocument(ctl.signal)
  }

  // A new PDF (or none) resets everything that belonged to the previous one.
  useEffect(() => {
    setPages(null)
    setIndex(null)
    setTurns([])
    setHighlight(null)
    setQuote(null)
    setViewerPage(1)
    setStatus({ kind: 'idle' })
    if (pdf.doc) startIndexing()
    return () => {
      job.current?.abort()
      embedder.stop()
      generator.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.doc])

  // If indexing failed because the embedder couldn't load, pick it back up
  // as soon as the model card's Retry brings the embedder up.
  useEffect(() => {
    if (embedder.phase === 'ready' && status.kind === 'error' && pdf.doc) startIndexing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedder.phase])

  const cancelIndexing = () => {
    job.current?.abort()
    embedder.stop()
    setStatus({ kind: 'cancelled' })
  }

  // Load the answer model once the small embedder is up, one download at a time.
  useEffect(() => {
    if (!pdf.doc || embedder.phase !== 'ready') return
    if (mode === 'generative' && generator.phase === 'idle') generator.boot()
    if (mode === 'extractive' && qa.phase === 'idle') qa.boot()
  }, [pdf.doc, embedder.phase, mode, generator, qa])

  const enableCpu = () => {
    generator.configure({ allowCpu: true } satisfies OccConfig)
    setCpuOptIn(true)
  }

  // ── Asking ──────────────────────────────────────────────────────────────
  const patch = (id: number, p: Partial<Turn>) => setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...p } : t)))

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || !index || !mode || busy) return
    const id = ++turnId.current
    const prev = turns.filter((t) => t.status === 'done').at(-1)
    setTurns((all) => [...all, { id, question: text, mode, status: 'retrieving', answer: '', passages: [], cited: [], citedByModel: false }])
    setQ('')
    try {
      const queries = prev ? [text, `${prev.question} ${text}`] : [text]
      const emb = await embedder.run<{ data: Float32Array; dim: number }>('embed', { texts: queries } satisfies EmbedInput)
      const vec = (i: number) => emb.data.subarray(i * emb.dim, (i + 1) * emb.dim)
      const passages = retrieve(index, vec(0), text, { k: TOP_K, context: prev ? { vector: vec(1), text: prev.question } : undefined })
      if (!passages.length) return patch(id, { status: 'refused', answer: NOT_FOUND })

      if (mode === 'generative') {
        patch(id, { status: 'generating', stage: 'analysing', passages })
        const input: AnswerInput = { question: text, sources: passages.map((p) => p.text), history: prev ? [{ question: prev.question, answer: prev.answer }] : [] }
        const generate = (inp: AnswerInput) =>
          generator.run<AnswerOutput>('answer', inp, (d) => {
            const e = d as AnswerProgress
            patch(id, { stage: e.stage, answer: e.answer, tokens: e.tokens })
          })
        let out = await generate(input)
        // A follow-up note about an unrelated earlier turn can send the model
        // in circles; if it loops, ask once more without that context.
        if (out.looped && !out.answer && input.history.length) {
          patch(id, { stage: 'analysing', answer: '', tokens: 0 })
          out = await generate({ ...input, history: [] })
        }
        const used = passages.slice(0, out.used)
        if (isRefusal(out)) return patch(id, { status: 'refused', answer: NOT_FOUND, passages: used, cited: [] })
        if (!out.answer) {
          if (out.stoppedByUser) return patch(id, { status: 'stopped', answer: '', passages: used })
          return patch(id, { status: 'refused', answer: NO_ANSWER, passages: used })
        }
        const cited = out.cited.map((n) => n - 1).filter((i) => i < used.length)
        patch(id, {
          status: out.truncated && out.stoppedByUser ? 'stopped' : 'done',
          answer: out.answer,
          passages: used,
          cited: cited.length ? cited : used.map((_, i) => i),
          citedByModel: cited.length > 0,
        })
      } else {
        patch(id, { status: 'generating', passages })
        // DistilBERT reads 512 tokens at a time, so score each chunk separately.
        let best: { answer: string; score: number; passage: number } | null = null
        for (const [pi, p] of passages.entries()) {
          for (const cid of p.chunkIds) {
            const chunk = index.chunks.find((c) => c.id === cid)
            if (!chunk) continue
            const r = await qaCall<{ answer: string; score: number }>([text, chunk.text], {})
            if (!best || r.score > best.score) best = { answer: r.answer, score: r.score, passage: pi }
          }
        }
        // DistilBERT always returns some span, so refuse when retrieval found
        // nothing related or the reader isn't confident (calibrated on
        // answerable vs. unanswerable questions).
        if (!best || best.score < MIN_QA || passages[0].score < MIN_COSINE) return patch(id, { status: 'refused', answer: NOT_FOUND })
        patch(id, { status: 'done', answer: tidy(best.answer), cited: [best.passage], citedByModel: true })
      }
    } catch (e) {
      patch(id, { status: 'error', error: (e as Error).message })
    }
  }

  const openSource = (turn: Turn, pi: number, page?: number) => {
    const p = turn.passages[pi]
    if (!p || !index || !pages) return
    const found = evidence(p, index.text, starts, turn.answer, turn.question)
    const span = found.find((e) => e.page === page) ?? found[0]
    const target = page ?? span.page
    const base = starts[target - 1] ?? 0
    const local = (s: number, e: number) => ({ start: Math.max(0, s - base), end: Math.min(pages[target - 1].text.length, e - base) })
    setViewerPage(target)
    setHighlight({ page: target, ranges: [local(p.start, p.end), ...(span.page === target ? [{ ...local(span.start, span.end), strong: true }] : [])] })
    const r = local(p.start, p.end)
    setQuote({ page: target, text: pages[target - 1].text.slice(r.start, r.end) })
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const openFile = async (f: File | undefined) => {
    setFileError(null)
    if (!f) return
    if (pdf.file && f.name === pdf.file.name && f.size === pdf.file.size && f.lastModified === pdf.file.lastModified) return
    if (!f.size) return setFileError('This file is empty.')
    const head = new TextDecoder().decode(await f.slice(0, 1024).arrayBuffer())
    if (!head.includes('%PDF-')) return setFileError('This file is not a valid PDF.')
    await pdf.load(f)
  }

  const removePdf = () => {
    cancelIndexing()
    generator.stop()
    pdf.clear()
  }

  const toggleRemember = async (on: boolean) => {
    setRemember(on)
    if (on && index && pdf.file) {
      const dim = index.chunks[0]?.embedding?.length ?? 0
      const vectors = new Float32Array(index.chunks.length * dim)
      index.chunks.forEach((c, i) => vectors.set(c.embedding!, i * dim))
      await saveIndex({ key: index.key, name: pdf.file.name, savedAt: Date.now(), chunks: index.chunks.map(({ embedding: _e, ...c }) => c), vectors, dim })
      setSaved(await countIndexes())
    }
  }

  const answerModel = mode === 'extractive' ? qa : generator
  const emptyPages = pages ? pages.filter((p) => !hasText(p)).map((p) => p.page) : []
  const ready = status.kind === 'ready' && answerModel.phase === 'ready'
  const lastTurn = turns.at(-1)

  return (
    <div className="space-y-6">
      <ToolIntro slug="ask-pdf" />

      <ModeBanner mode={mode} gpu={gpu} cpuOptIn={cpuOptIn} canOptIn={!gpu?.webgpu && (deviceMemory === undefined || deviceMemory >= 8)} onOptIn={enableCpu} genError={generator.phase === 'error' ? generator.error : null} onRetry={generator.boot} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ModelCard model={embedder} info={EMBED_INFO} autoNote="Loads when you add a PDF. " />
        {mode === 'extractive' ? <ModelCard model={qa} info={QA_INFO} autoNote="Loads when you add a PDF. " /> : <ModelCard model={generator} info={OCC_INFO} autoNote="Loads after your PDF is indexed. " />}
      </div>

      {!online && <Notice tone="warn">You're offline. Models already downloaded on this device still work; anything not yet cached needs a connection.</Notice>}
      {(fileError || pdf.error) && <Notice tone="error">{fileError ?? friendlyPdfError(pdf.error)}</Notice>}

      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void openFile(f[0])} label="Drop a report, contract, manual or paper" />
      ) : (
        <>
          <Steps gpu={gpu} status={status} downloading={embedder.phase === 'downloading' || answerModel.phase === 'downloading'} answerReady={answerModel.phase === 'ready'} generating={busy} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={removePdf} />
              <IndexStatus status={status} emptyPages={emptyPages} chunks={index?.chunks.length ?? 0} onCancel={cancelIndexing} onRetry={startIndexing} />

              <Panel
                kicker={mode === 'extractive' ? 'Ask · extractive mode' : 'Ask · generative RAG'}
                title="Answers come only from this PDF"
                actions={turns.length > 0 && <Button size="sm" tone="ghost" disabled={busy} onClick={() => { setTurns([]); setHighlight(null); setQuote(null) }}><Trash2 size={14} /> Clear chat</Button>}
              >
                {turns.length === 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {STARTERS.map((s) => <Chip key={s} disabled={!ready || busy} onClick={() => void ask(s)}>{s}</Chip>)}
                  </div>
                )}

                <ol className="space-y-5" aria-live="polite">
                  {turns.map((t) => <TurnView key={t.id} turn={t} onSource={(pi, page) => openSource(t, pi, page)} docText={index?.text ?? ''} starts={starts} />)}
                </ol>

                <form className={cx('flex gap-2', turns.length > 0 && 'mt-5')} onSubmit={(e) => { e.preventDefault(); void ask(q) }}>
                  <input aria-label="Question" className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} disabled={!ready} placeholder={ready ? (turns.length ? 'Ask a follow-up…' : 'Ask a question about the PDF…') : 'Preparing the document…'} />
                  {busy && lastTurn?.mode === 'generative' ? (
                    <Button tone="danger" onClick={generator.stop} aria-label="Stop generating"><Square size={15} /></Button>
                  ) : (
                    <Button tone="primary" type="submit" disabled={!q.trim() || !ready || busy} aria-label="Ask"><MessageCircleQuestion size={16} /></Button>
                  )}
                </form>
                <p className="mt-2 text-xs text-ink-3">
                  {mode === 'extractive'
                    ? 'Lightweight mode quotes the single best-matching phrase. It cannot combine facts from several places.'
                    : 'Answers are generated by a small local model from the passages it retrieves. Check important answers against the quoted pages.'}
                </p>
              </Panel>

              <SavedIndexes remember={remember} onRemember={(v) => void toggleRemember(v)} saved={saved} onForget={async () => { await clearIndexes(); setSaved(0) }} />
            </div>

            <div ref={viewerRef} className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <Panel kicker="Document" title={pdf.file.name}>
                <PdfViewer doc={pdf.doc} pages={pages} page={viewerPage} onPage={(n) => { setViewerPage(n); setQuote(null) }} highlight={highlight} />
              </Panel>
              {quote && (
                <div className="rounded-lg border border-rule bg-paper p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Kicker>Quoted from the PDF · page {quote.page}</Kicker>
                    <button type="button" className="text-ink-3 hover:text-ink" aria-label="Close quote" onClick={() => { setQuote(null); setHighlight(null) }}><X size={14} /></button>
                  </div>
                  <blockquote className="max-h-72 overflow-auto border-l-2 border-sun pl-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{quote.text}</blockquote>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ModeBanner({ mode, gpu, cpuOptIn, canOptIn, onOptIn, genError, onRetry }: { mode: Mode | null; gpu: { webgpu: boolean } | null; cpuOptIn: boolean; canOptIn: boolean; onOptIn: () => void; genError: string | null; onRetry: () => void }) {
  if (!mode) return <p className="font-mono text-xs text-ink-3">Checking WebGPU support…</p>
  if (mode === 'generative') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Tag tone="sea">{cpuOptIn && !gpu?.webgpu ? <Cpu size={12} /> : <Zap size={12} />} Generative RAG mode</Tag>
        <span className="text-ink-2">Finds the relevant passages, then writes an answer from them with citations.{cpuOptIn && !gpu?.webgpu ? ' Running on CPU: expect a minute or more per answer.' : ''}</span>
      </div>
    )
  }
  return (
    <Notice tone="warn">
      <p className="flex flex-wrap items-center gap-2"><Tag tone="sun">Lightweight extractive mode</Tag></p>
      <p className="mt-2">
        {genError
          ? <>The answer model couldn't start ({genError}). You can still ask questions: the best matching phrase is quoted from the retrieved passages.</>
          : <>This browser doesn't offer WebGPU, so instead of writing answers, Ask PDF quotes the best-matching phrase from the most relevant passages. Chrome or Edge on desktop gives the full experience.</>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {genError && <Button size="sm" onClick={onRetry}><RotateCw size={14} /> Retry answer model</Button>}
        {!genError && canOptIn && <Button size="sm" onClick={onOptIn}><Cpu size={14} /> Use generative mode on CPU (~470 MB, slow)</Button>}
      </div>
    </Notice>
  )
}

const STEP_LABELS = ['Check WebGPU', 'Download AI models', 'Extract text', 'Create embeddings', 'Ready to answer', 'Generating answer']

function Steps({ gpu, status, downloading, answerReady, generating }: { gpu: unknown; status: DocStatus; downloading: boolean; answerReady: boolean; generating: boolean }) {
  const indexed = status.kind === 'ready'
  const state = (i: number): 'done' | 'active' | 'todo' => {
    switch (i) {
      case 0: return gpu ? 'done' : 'active'
      case 1: return downloading ? 'active' : answerReady ? 'done' : 'todo'
      case 2: return status.kind === 'extracting' ? 'active' : status.kind === 'idle' ? 'todo' : 'done'
      case 3: return status.kind === 'indexing' ? 'active' : indexed ? 'done' : 'todo'
      case 4: return indexed && answerReady ? (generating ? 'done' : 'active') : 'todo'
      default: return generating ? 'active' : 'todo'
    }
  }
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wide" aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const s = state(i)
        return (
          <li key={label} className={cx('flex items-center gap-1.5', s === 'todo' ? 'text-ink-3' : s === 'active' ? 'text-accent' : 'text-sea')} aria-current={s === 'active' ? 'step' : undefined}>
            <span className={cx('grid size-4 place-items-center rounded-full border', s === 'done' ? 'border-sea bg-sea text-paper' : s === 'active' ? 'border-accent' : 'border-rule')}>
              {s === 'done' ? <Check size={10} /> : s === 'active' ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

function IndexStatus({ status, emptyPages, chunks, onCancel, onRetry }: { status: DocStatus; emptyPages: number[]; chunks: number; onCancel: () => void; onRetry: () => void }) {
  const bar = (ratio: number | null, label: string) => (
    <div className="rounded-lg border border-rule bg-card px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[11px] text-ink-3">
        <span>{label}</span>
        <button type="button" onClick={onCancel} className="hover:text-danger">Cancel</button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx('h-full rounded-full bg-accent transition-[width]', ratio === null && 'w-1/4 animate-pulse')} style={ratio === null ? undefined : { width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  )
  switch (status.kind) {
    case 'extracting':
      return bar(status.total ? status.page / status.total : null, `Extracting text · page ${status.page} of ${status.total}`)
    case 'indexing':
      return bar(status.total ? status.done / status.total : null, status.total ? `Creating embeddings · ${status.done} of ${status.total} passages` : 'Loading the embedding model…')
    case 'no-text':
      return (
        <Notice tone="warn">
          <p className="flex items-center gap-2 font-medium"><FileWarning size={16} /> No selectable text in this PDF</p>
          <p className="mt-1">It looks like a scan or images of pages. Ask PDF won't guess at text it can't read: run it through <Link href="/tools/ocr-scanned-pdf" className="underline">Scan OCR</Link> first, then ask about the extracted text.</p>
        </Notice>
      )
    case 'cancelled':
      return <Notice tone="warn">Indexing cancelled. <button type="button" className="ml-1 underline" onClick={onRetry}>Start again</button></Notice>
    case 'error':
      return <Notice tone="error">{status.message} <button type="button" className="ml-1 underline" onClick={onRetry}>Retry</button></Notice>
    case 'ready':
      return (
        <div className="space-y-2">
          <p className="font-mono text-xs text-ink-3">{chunks} passages indexed{status.restored ? ' · loaded from this device' : ''}</p>
          {emptyPages.length > 0 && (
            <Notice tone="info">
              {emptyPages.length === 1 ? `Page ${emptyPages[0]} has` : `${emptyPages.length} pages (${emptyPages.slice(0, 8).join(', ')}${emptyPages.length > 8 ? '…' : ''}) have`} no selectable text and can't be searched. If they are scans, <Link href="/tools/ocr-scanned-pdf" className="underline">Scan OCR</Link> can read them.
            </Notice>
          )}
        </div>
      )
    default:
      return null
  }
}

const STAGE_TEXT: Record<OccStage, string> = {
  analysing: 'Reading your question and the passages…',
  reasoning: 'Checking which passages support an answer…',
  answering: 'Writing the answer…',
}

function TurnView({ turn: t, onSource, docText, starts }: { turn: Turn; onSource: (passage: number, page?: number) => void; docText: string; starts: number[] }) {
  const working = t.status === 'retrieving' || t.status === 'generating'
  // One citation per distinct page, pointing at the passage that page came from.
  const pages = new Map<number, number>()
  for (const pi of t.cited) {
    const p = t.passages[pi]
    if (p) for (const { page } of evidence(p, docText, starts, t.answer, t.question)) if (!pages.has(page)) pages.set(page, pi)
  }
  const sources = [...pages.entries()].sort((a, b) => a[0] - b[0])

  return (
    <li className="space-y-2">
      <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-paper-2 px-3 py-2 text-sm">{t.question}</p>
      <div className="rounded-lg border border-rule p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Kicker>{t.mode === 'generative' ? <span className="inline-flex items-center gap-1"><Sparkles size={11} /> AI answer · written from the passages</span> : 'Best-matching phrase · quoted'}</Kicker>
          {(t.status === 'done' || t.status === 'stopped') && t.answer && <CopyButton text={t.answer} />}
        </div>

        {t.status === 'retrieving' && <p className="font-mono text-xs text-ink-3">Searching the document…</p>}
        {t.status === 'generating' && !t.answer && (
          <p className="font-mono text-xs text-ink-3">
            {t.mode === 'generative' ? STAGE_TEXT[t.stage ?? 'analysing'] : 'Reading the best passages…'}
            {t.tokens ? ` · ${t.tokens} tokens` : ''}
          </p>
        )}
        {t.answer && <p className={cx('text-[15px] leading-relaxed whitespace-pre-wrap', t.status === 'refused' && 'text-ink-2', working && 'caret')}>{t.answer}</p>}
        {t.status === 'stopped' && <p className="mt-1 font-mono text-xs text-ink-3">{t.answer ? 'Stopped before the answer finished.' : 'Stopped.'}</p>}
        {t.status === 'error' && <p className="text-sm text-danger" role="alert">{t.error}</p>}

        {t.status === 'done' && sources.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-ink-3">{t.citedByModel ? 'Sources:' : 'Retrieved from:'}</span>
            {sources.map(([page, pi]) => (
              <button key={page} type="button" onClick={() => onSource(pi, page)} className="rounded border border-rule px-1.5 py-0.5 font-mono text-xs hover:border-accent hover:text-accent">
                Page {page}
              </button>
            ))}
          </p>
        )}
        {(t.status === 'done' || t.status === 'refused' || t.status === 'stopped') && t.passages.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-3 hover:text-ink">Passages the answer was based on ({t.passages.length})</summary>
            <ul className="mt-2 space-y-2">
              {t.passages.map((p, pi) => (
                <li key={p.chunkIds.join()}>
                  <button type="button" onClick={() => onSource(pi)} className="w-full rounded border-l-2 border-rule bg-paper px-3 py-2 text-left hover:border-accent">
                    <span className="font-mono text-[11px] text-ink-3">
                      {p.pageNumbers.length > 1 ? `Pages ${p.pageNumbers[0]}–${p.pageNumbers.at(-1)}` : `Page ${p.pageNumbers[0]}`}
                      {t.cited.includes(pi) && t.citedByModel ? ' · cited' : ''}
                    </span>
                    <span className="mt-1 line-clamp-3 block text-ink-2">{p.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  )
}

function SavedIndexes({ remember, onRemember, saved, onForget }: { remember: boolean; onRemember: (v: boolean) => void; saved: number; onForget: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-rule px-4 py-3 text-sm">
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={remember} onChange={(e) => onRemember(e.target.checked)} />
        <span>
          Remember this PDF's index on this device
          <span className="block text-xs text-ink-3">Off by default. When on, the PDF's extracted text and embeddings are stored in this browser (never uploaded) so reopening the same file skips indexing.</span>
        </span>
      </label>
      {saved > 0 && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-3">
          {saved} saved {saved === 1 ? 'index' : 'indexes'} on this device
          <button type="button" className="underline hover:text-danger" onClick={onForget}>Delete all</button>
        </p>
      )}
    </div>
  )
}
