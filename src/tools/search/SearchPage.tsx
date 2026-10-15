import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, CaseSensitive, Database, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { ModelCard } from '../../ui/ModelCard'
import { ToolIntro } from '../../ui/Shell'
import { Button, Chip, Field, Kicker, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'
import { EXAMPLE_QUERIES, SAMPLE_DOCS, docText, type Doc } from './corpus'
import { keywordRank, semanticRank, terms, type Hit } from './rank'
import type { EmbedInput, EmbedOutput } from './worker'

const TOP_K = 6
const STORE_KEY = 'recall-docs-v1'

function loadDocs(): Doc[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (Array.isArray(saved) && saved.every((d) => d && typeof d.id === 'string' && typeof d.title === 'string')) return saved
  } catch {
    /* ignore corrupt or unavailable storage */
  }
  return SAMPLE_DOCS
}

export default function SearchPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const [docs, setDocs] = useState<Doc[]>(loadDocs)
  const vectors = useRef(new Map<string, Float32Array>())
  const [indexed, setIndexed] = useState(0)
  const [indexing, setIndexing] = useState<{ done: number; total: number } | null>(null)
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [semantic, setSemantic] = useState<Hit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(docs))
    } catch {
      /* storage unavailable: the collection just won't persist */
    }
  }, [docs])

  const embed = async (texts: string[]) => {
    const out = await model.run<EmbedOutput>('embed', { texts } satisfies EmbedInput, (p) => setIndexing(p as { done: number; total: number }))
    return texts.map((_, i) => out.data.subarray(i * out.dim, (i + 1) * out.dim))
  }

  /** Embed only documents whose text has no cached vector yet. */
  const syncIndex = async (list: Doc[]) => {
    const missing = [...new Set(list.map(docText))].filter((t) => !vectors.current.has(t))
    if (missing.length) {
      setIndexing({ done: 0, total: missing.length })
      try {
        const vs = await embed(missing)
        missing.forEach((t, i) => vectors.current.set(t, vs[i]))
      } finally {
        setIndexing(null)
      }
    }
    setIndexed(list.filter((d) => vectors.current.has(docText(d))).length)
  }

  // Keep the index current whenever the model is up and the collection changes.
  useEffect(() => {
    if (model.phase === 'ready') syncIndex(docs).catch((e) => setError((e as Error).message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.phase, docs])

  const run = async (q: string) => {
    const text = q.trim()
    if (!text) return
    setQuery(text)
    setSubmitted(text)
    setError(null)
    setSearching(true)
    try {
      await syncIndex(docs)
      const [qv] = await embed([text])
      setSemantic(semanticRank(qv, docs, vectors.current, TOP_K))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  const keyword = useMemo(() => (submitted ? keywordRank(submitted, docs, TOP_K) : null), [submitted, docs])

  return (
    <div className="space-y-6">
      <ToolIntro slug="search" />
      <ModelCard
        model={model}
        info={{ name: 'Xenova/all-MiniLM-L6-v2', href: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2', size: '~23 MB', task: 'sentence embeddings' }}
        autoNote="Loads automatically on your first search. "
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run(query)
        }}
        className="rounded-xl border border-ink bg-card p-2 shadow-[4px_4px_0_var(--ink)]"
      >
        <div className="flex items-center gap-2">
          <Search size={20} className="ml-2 shrink-0 text-ink-3" />
          <input
            aria-label="Search query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe a problem in your own words…"
            className="min-w-0 flex-1 bg-transparent py-2 text-lg placeholder:text-ink-3 focus:outline-none"
          />
          <Button tone="primary" type="submit" disabled={!query.trim() || searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </form>
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <Kicker>Try</Kicker>
        {EXAMPLE_QUERIES.map((q) => (
          <Chip key={q} disabled={searching} onClick={() => void run(q)}>
            {q}
          </Chip>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <ResultColumn
          icon={<Brain size={16} />}
          title="By meaning"
          caption="Cosine similarity between embedding vectors"
          hits={semantic}
          loading={searching}
          tone="accent"
          empty="No documents indexed yet."
        />
        <ResultColumn
          icon={<CaseSensitive size={16} />}
          title="By words"
          caption="BM25 keyword ranking — no AI involved"
          hits={keyword}
          loading={false}
          tone="sea"
          highlight={submitted ? terms(submitted) : []}
          empty="No document shares a word with that query. That's the point."
        />
      </div>

      <Collection
        docs={docs}
        indexed={indexed}
        indexing={indexing}
        onAdd={(d) => setDocs((list) => [d, ...list])}
        onRemove={(id) => setDocs((list) => list.filter((d) => d.id !== id))}
        onReset={() => setDocs(SAMPLE_DOCS)}
      />
    </div>
  )
}

function ResultColumn({
  icon,
  title,
  caption,
  hits,
  loading,
  tone,
  highlight = [],
  empty,
}: {
  icon: React.ReactNode
  title: string
  caption: string
  hits: Hit[] | null
  loading: boolean
  tone: 'accent' | 'sea'
  highlight?: string[]
  empty: string
}) {
  const bar = tone === 'accent' ? 'bg-accent' : 'bg-sea'
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {icon} {title}
        </span>
      }
      actions={<span className="font-mono text-[11px] text-ink-3">{caption}</span>}
    >
      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-lg bg-paper-2" />
          ))}
        </ul>
      ) : hits === null ? (
        <p className="py-10 text-center text-sm text-ink-3">Run a search to see results.</p>
      ) : hits.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {hits.map((h, i) => (
            <li key={h.doc.id} className="rounded-lg border border-rule p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-ink-3">
                    #{i + 1} · {h.doc.id} · {h.doc.area}
                  </p>
                  <p className="font-medium leading-snug">
                    <Highlight text={h.doc.title} terms={highlight} />
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">
                    <Highlight text={h.doc.body} terms={highlight} />
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-medium">{h.score.toFixed(2)}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-2">
                <div className={cx('h-full rounded-full', bar)} style={{ width: `${Math.max(0, Math.min(1, h.score)) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function Highlight({ text, terms: ts }: { text: string; terms: string[] }) {
  if (!ts.length) return <>{text}</>
  const set = new Set(ts)
  return (
    <>
      {text.split(/(\s+)/).map((word, i) => {
        const [t] = terms(word)
        return t && set.has(t) ? (
          <mark key={i} className="rounded-sm bg-sea-soft px-0.5 text-sea">
            {word}
          </mark>
        ) : (
          <span key={i}>{word}</span>
        )
      })}
    </>
  )
}

function Collection({
  docs,
  indexed,
  indexing,
  onAdd,
  onRemove,
  onReset,
}: {
  docs: Doc[]
  indexed: number
  indexing: { done: number; total: number } | null
  onAdd: (d: Doc) => void
  onRemove: (id: string) => void
  onReset: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Panel
      kicker="Collection"
      title={
        <span className="flex items-center gap-2">
          <Database size={16} /> {docs.length} documents
          <Tag tone={indexed === docs.length ? 'sea' : 'plain'}>
            {indexing ? `indexing ${indexing.done}/${indexing.total}` : `${indexed} indexed`}
          </Tag>
        </span>
      }
      actions={
        <>
          <Button size="sm" tone="outline" onClick={() => setOpen((o) => !o)}>
            <Plus size={15} /> Add
          </Button>
          <Button size="sm" tone="ghost" onClick={onReset}>
            <RotateCcw size={15} /> Reset samples
          </Button>
        </>
      }
    >
      {open && (
        <form
          className="mb-5 grid gap-3 rounded-lg border border-dashed border-rule bg-paper p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) return
            onAdd({ id: `MY-${Date.now().toString(36).slice(-4).toUpperCase()}`, title: title.trim(), body: body.trim(), area: 'Custom', mine: true })
            setTitle('')
            setBody('')
          }}
        >
          <Field label="Title" htmlFor="doc-title">
            <input id="doc-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
          </Field>
          <Field label="Details" htmlFor="doc-body" hint="optional">
            <textarea id="doc-body" rows={2} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div>
            <Button tone="primary" size="sm" type="submit" disabled={!title.trim()}>
              Add to collection
            </Button>
          </div>
        </form>
      )}
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <li key={d.id} className="group flex items-start gap-2 rounded-lg border border-rule p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-ink-3">
                {d.id} · {d.area} {d.mine && <span className="text-accent">· yours</span>}
              </p>
              <p className="truncate font-medium">{d.title}</p>
            </div>
            <button type="button" aria-label={`Remove ${d.id}`} onClick={() => onRemove(d.id)} className="text-ink-3 opacity-60 hover:text-danger group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">Your additions are saved in this browser only. Vectors are cached per text, so only new or edited documents get re-embedded.</p>
    </Panel>
  )
}
