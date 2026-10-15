import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, CopyButton, Field, Panel, Tag, cx, inputClass } from '../../ui/kit'

type Label = { label: string; score: number }

export default function ModeratePage() {
  const { model, callWith } = usePipeline({ task: 'text-classification', model: 'Xenova/toxic-bert', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(0.5)
  const [rows, setRows] = useState<{ line: string; labels: Label[] }[]>([])

  const run = () =>
    task.go(async () => {
      const out: { line: string; labels: Label[] }[] = []
      for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200)) {
        out.push({ line, labels: await callWith<Label[]>([line], { top_k: null }) })
        setRows([...out])
      }
    })

  const flagged = (r: { labels: Label[] }) => r.labels.filter((l) => l.score >= limit)
  const bad = rows.filter((r) => flagged(r).length)

  return (
    <ToolPage slug="moderate" model={model} error={task.error} info={{ name: 'Xenova/toxic-bert', href: 'https://huggingface.co/Xenova/toxic-bert', size: '~110 MB', task: 'toxicity detection (English)' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title="Comments, chat messages or posts, one per line">
          <textarea aria-label="Comments" rows={12} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'text-sm')} placeholder="Paste user-generated content to screen…" />
          <div className="mt-4">
            <Field label="Flag at" htmlFor="lim" hint={`${Math.round(limit * 100)}%`}><input id="lim" type="range" min={0.2} max={0.95} step={0.05} value={limit} onChange={(e) => setLimit(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
          </div>
          <Button className="mt-4" tone="primary" disabled={!text.trim() || task.busy} onClick={() => void run()}><ShieldAlert size={16} /> {task.busy ? `Checking ${rows.length}…` : 'Check'}</Button>
        </Panel>
        <Panel kicker="Results" title={rows.length ? `${bad.length} of ${rows.length} flagged` : 'Results'} actions={<CopyButton text={rows.filter((r) => !flagged(r).length).map((r) => r.line).join('\n')} label="Copy clean only" disabled={!rows.length} />}>
          <ul className="max-h-[520px] space-y-2 overflow-auto">
            {rows.map((r, i) => {
              const f = flagged(r)
              return (
                <li key={i} className={cx('rounded-lg border p-3 text-sm', f.length ? 'border-danger/50 bg-accent-soft' : 'border-rule')}>
                  <p>{r.line}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">{f.length ? f.map((l) => <Tag key={l.label} tone="accent">{l.label.replace('_', ' ')} {Math.round(l.score * 100)}%</Tag>) : <Tag tone="sea">ok</Tag>}</p>
                </li>
              )
            })}
            {!rows.length && <li className="py-10 text-center text-sm text-ink-3">Screens for toxicity, insults, threats, obscenity and identity hate. Keep a human in the loop for final decisions.</li>}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
