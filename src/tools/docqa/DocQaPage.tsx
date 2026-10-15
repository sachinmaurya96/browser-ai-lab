import { useRef, useState } from 'react'
import { FileUp, MessageCircleQuestion } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Panel, Tag, cx, inputClass } from '../../ui/kit'

/** Overlapping ~250-word windows so answers near a boundary aren't cut. */
function windows(text: string, size = 250, overlap = 50): string[] {
  const w = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < w.length; i += size - overlap) {
    out.push(w.slice(i, i + size).join(' '))
    if (i + size >= w.length) break
  }
  return out
}

interface Answer {
  q: string
  answer: string
  score: number
  context: string
}

export default function DocQaPage() {
  const { model, callWith } = usePipeline({ task: 'question-answering', model: 'Xenova/distilbert-base-cased-distilled-squad', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [doc, setDoc] = useState('')
  const [q, setQ] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const ask = () =>
    task.go(async () => {
      let best: Answer | null = null
      for (const ctx of windows(doc)) {
        const r = await callWith<{ answer: string; score: number }>([q, ctx], {})
        if (!best || r.score > best.score) best = { q, answer: r.answer, score: r.score, context: ctx }
      }
      if (best) setAnswers((a) => [best!, ...a])
      setQ('')
    })

  const highlight = (ctx: string, ans: string) => {
    const i = ctx.indexOf(ans)
    if (i < 0) return ctx
    const from = Math.max(0, i - 160)
    return (
      <>
        {from > 0 && '…'}{ctx.slice(from, i)}<mark className="rounded bg-accent-soft px-0.5 text-accent">{ans}</mark>{ctx.slice(i + ans.length, i + ans.length + 160)}…
      </>
    )
  }

  return (
    <ToolPage slug="docqa" model={model} error={task.error} info={{ name: 'Xenova/distilbert-base-cased-distilled-squad', href: 'https://huggingface.co/Xenova/distilbert-base-cased-distilled-squad', size: '~65 MB', task: 'extractive question answering' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Document" title="Paste text or open a .txt / .md file" actions={<Button size="sm" tone="ghost" onClick={() => fileRef.current?.click()}><FileUp size={15} /> Open</Button>}>
          <textarea aria-label="Document" rows={16} value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Contracts, manuals, policies, meeting notes, terms of service…" className={cx(inputClass, 'text-sm leading-relaxed')} />
          <p className="mt-1 font-mono text-[11px] text-ink-3">{doc.split(/\s+/).filter(Boolean).length} words</p>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.html,text/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDoc(await f.text()); e.target.value = '' }} />
        </Panel>
        <Panel kicker="Ask" title="Answers are quoted straight from the document">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim() && doc.trim()) void ask() }}>
            <input aria-label="Question" className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is the notice period?" />
            <Button tone="primary" type="submit" disabled={!q.trim() || !doc.trim() || task.busy}><MessageCircleQuestion size={16} /></Button>
          </form>
          {task.busy && <p className="mt-3 font-mono text-xs text-ink-3">Searching the document…</p>}
          <ul className="mt-5 space-y-4">
            {answers.map((a, i) => (
              <li key={i} className="rounded-lg border border-rule p-4">
                <p className="text-sm text-ink-3">{a.q}</p>
                <p className="mt-1 text-lg font-semibold">{a.score < 0.1 ? 'Not clearly answered in the document.' : a.answer}</p>
                <Tag tone={a.score > 0.5 ? 'sea' : a.score > 0.1 ? 'sun' : 'plain'}>{Math.round(a.score * 100)}% confidence</Tag>
                {a.score >= 0.1 && <p className="mt-3 border-l-2 border-rule pl-3 text-sm text-ink-2">{highlight(a.context, a.answer)}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
