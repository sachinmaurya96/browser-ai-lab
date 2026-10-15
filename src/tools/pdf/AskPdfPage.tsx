import { useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { pdfText } from '../../lib/pdf'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { FileBadge, FileDrop, usePdf } from '../../ui/PdfKit'
import { Button, Chip, Panel, Tag, inputClass } from '../../ui/kit'

interface Passage {
  page: number
  text: string
}
interface Answer {
  q: string
  answer: string
  score: number
  page: number
  context: string
}

/** ~250-word overlapping windows, remembering which page each came from. */
function passages(pages: string[]): Passage[] {
  const out: Passage[] = []
  pages.forEach((text, i) => {
    const w = text.split(/\s+/).filter(Boolean)
    for (let s = 0; s < w.length; s += 200) out.push({ page: i + 1, text: w.slice(s, s + 250).join(' ') })
  })
  return out
}

const STARTERS = ['What is this document about?', 'What is the total amount?', 'What is the deadline?', 'Who are the parties involved?']

export default function AskPdfPage() {
  const { model, callWith } = usePipeline({ task: 'question-answering', model: 'Xenova/distilbert-base-cased-distilled-squad', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const pdf = usePdf()
  const task = useTask()
  const [chunks, setChunks] = useState<Passage[]>([])
  const [q, setQ] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])

  useEffect(() => {
    setChunks([])
    setAnswers([])
    if (pdf.doc) void task.go(async () => setChunks(passages(await pdfText(pdf.doc!))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.doc])

  const ask = (question: string) =>
    task.go(async () => {
      if (!chunks.length) throw new Error('No selectable text in this PDF. Run it through Scan OCR first.')
      let best: Answer | null = null
      for (const c of chunks) {
        const r = await callWith<{ answer: string; score: number }>([question, c.text], {})
        if (!best || r.score > best.score) best = { q: question, answer: r.answer, score: r.score, page: c.page, context: c.text }
      }
      setAnswers((a) => [best!, ...a])
      setQ('')
    })

  return (
    <ToolPage slug="pdf-ask" model={model} error={task.error ?? pdf.error} info={{ name: 'Xenova/distilbert-base-cased-distilled-squad', href: 'https://huggingface.co/Xenova/distilbert-base-cased-distilled-squad', size: '~65 MB', task: 'document question answering' }}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} label="Drop a contract, invoice, paper or manual" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={pdf.clear} />
            <p className="font-mono text-xs text-ink-3">{chunks.length} passages indexed</p>
            <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <Chip key={s} disabled={task.busy} onClick={() => void ask(s)}>{s}</Chip>)}</div>
          </div>
          <Panel kicker="Ask" title="Answers are quoted from the PDF, with page numbers">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) void ask(q) }}>
              <input aria-label="Question" className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question about the PDF…" />
              <Button tone="primary" type="submit" disabled={!q.trim() || task.busy}><MessageCircleQuestion size={16} /></Button>
            </form>
            {task.busy && <p className="mt-3 font-mono text-xs text-ink-3">Reading through the document…</p>}
            <ul className="mt-5 space-y-4">
              {answers.map((a, i) => (
                <li key={i} className="rounded-lg border border-rule p-4">
                  <p className="text-sm text-ink-3">{a.q}</p>
                  <p className="mt-1 text-lg font-semibold">{a.score < 0.1 ? 'Not clearly answered in this PDF.' : a.answer}</p>
                  <p className="mt-1 flex gap-2"><Tag>page {a.page}</Tag><Tag tone={a.score > 0.5 ? 'sea' : 'sun'}>{Math.round(a.score * 100)}%</Tag></p>
                  {a.score >= 0.1 && <p className="mt-3 border-l-2 border-rule pl-3 text-sm text-ink-2">…{a.context.slice(Math.max(0, a.context.indexOf(a.answer) - 150), a.context.indexOf(a.answer) + a.answer.length + 150)}…</p>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </ToolPage>
  )
}
