import { useState } from 'react'
import { FolderTree } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Field, Panel, Tag, cx, inputClass } from '../../ui/kit'

const PRESETS: Record<string, { labels: string; text: string }> = {
  'Support inbox': { labels: 'billing, bug report, feature request, account access, cancellation, praise', text: "I was charged twice this month\nThe export button crashes the app\nCan you add a dark mode?\nI can't log in after resetting my password\nYour team was super helpful, thanks!" },
  'Email triage': { labels: 'urgent, meeting, newsletter, invoice, personal, spam', text: 'Server down in production, need help now\nCan we move our sync to Thursday 3pm?\nYour March invoice is attached\nYou won a free cruise, click here' },
  'News topics': { labels: 'politics, sports, technology, business, health, entertainment', text: 'Central bank holds interest rates steady\nLocal team wins championship in overtime\nNew phone chip promises double battery life' },
}

type Result = { line: string; labels: string[]; scores: number[] }

export default function ClassifyPage() {
  const { model, callWith } = usePipeline({ task: 'zero-shot-classification', model: 'Xenova/mobilebert-uncased-mnli', dtype: { wasm: 'q8' }, webgpu: false })
  const task = useTask()
  const [labels, setLabels] = useState(PRESETS['Support inbox'].labels)
  const [text, setText] = useState(PRESETS['Support inbox'].text)
  const [multi, setMulti] = useState(false)
  const [rows, setRows] = useState<Result[]>([])

  const list = labels.split(',').map((s) => s.trim()).filter(Boolean)
  const run = () =>
    task.go(async () => {
      if (list.length < 2) throw new Error('Enter at least two categories.')
      const out: Result[] = []
      for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 100)) {
        const r = await callWith<{ labels: string[]; scores: number[] }>([line, list], { multi_label: multi })
        out.push({ line, ...r })
        setRows([...out])
      }
    })

  const csv = ['text,category,confidence', ...rows.map((r) => `"${r.line.replace(/"/g, '""')}",${r.labels[0]},${r.scores[0].toFixed(3)}`)].join('\n')

  return (
    <ToolPage slug="classify" model={model} error={task.error} info={{ name: 'Xenova/mobilebert-uncased-mnli', href: 'https://huggingface.co/Xenova/mobilebert-uncased-mnli', size: '~25 MB', task: 'zero-shot classification' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Setup" title="Your categories, no training needed">
          <Field label="Categories" htmlFor="cats" hint="comma separated"><input id="cats" className={inputClass} value={labels} onChange={(e) => setLabels(e.target.value)} /></Field>
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(PRESETS).map(([k, v]) => <Chip key={k} onClick={() => { setLabels(v.labels); setText(v.text) }}>{k}</Chip>)}</div>
          <Field label="Items, one per line" htmlFor="items"><textarea id="items" rows={9} className={cx(inputClass, 'mt-4 text-sm')} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="accent-[var(--accent)]" /> Allow several categories per item</label>
          <Button className="mt-4" tone="primary" disabled={task.busy || !text.trim()} onClick={() => void run()}><FolderTree size={16} /> {task.busy ? `Sorting ${rows.length}…` : 'Sort items'}</Button>
        </Panel>
        <Panel kicker="Results" title={`${rows.length} sorted`} actions={<CopyButton text={csv} label="CSV" disabled={!rows.length} />}>
          <ul className="max-h-[560px] space-y-2 overflow-auto">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-rule p-3">
                <p className="text-sm">{r.line}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {r.labels.slice(0, 3).map((l, j) => (multi ? r.scores[j] > 0.5 : j === 0) || j === 0 ? <Tag key={l} tone={j === 0 ? 'accent' : 'plain'}>{l} {Math.round(r.scores[j] * 100)}%</Tag> : null)}
                </p>
              </li>
            ))}
            {!rows.length && <li className="py-10 text-center text-sm text-ink-3">Route tickets, tag feedback, or organise notes into any buckets you make up.</li>}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
