import { useMemo, useState } from 'react'
import { Copy as CopyIcon } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Field, Panel, Tag, cx, inputClass } from '../../ui/kit'

const SAMPLE = `App crashes when I upload a photo
The application closes after attaching an image
Please add dark mode
Can you support a night theme?
Login page is very slow
I was billed twice this month
Signing in takes forever
Double charge on my credit card
Uploading pictures makes the app quit`

export default function DedupePage() {
  const { model, callWith } = usePipeline({ task: 'feature-extraction', model: 'Xenova/all-MiniLM-L6-v2', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [text, setText] = useState('')
  const [vecs, setVecs] = useState<{ lines: string[]; data: Float32Array; dim: number } | null>(null)
  const [limit, setLimit] = useState(0.6)

  const run = () =>
    task.go(async () => {
      const lines = [...new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))].slice(0, 1000)
      const r = await callWith<{ dims: number[]; data: Float32Array }>([lines], { pooling: 'mean', normalize: true })
      setVecs({ lines, data: r.data, dim: r.dims[1] })
    })

  // Union-find over pairs whose cosine similarity passes the threshold.
  const groups = useMemo(() => {
    if (!vecs) return []
    const { lines, data, dim } = vecs
    const parent = lines.map((_, i) => i)
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    for (let a = 0; a < lines.length; a++)
      for (let b = a + 1; b < lines.length; b++) {
        let s = 0
        for (let k = 0; k < dim; k++) s += data[a * dim + k] * data[b * dim + k]
        if (s >= limit) parent[find(a)] = find(b)
      }
    const m = new Map<number, string[]>()
    lines.forEach((l, i) => m.set(find(i), [...(m.get(find(i)) ?? []), l]))
    return [...m.values()].sort((x, y) => y.length - x.length)
  }, [vecs, limit])

  const dupes = groups.filter((g) => g.length > 1)
  const unique = groups.map((g) => g[0]).join('\n')

  return (
    <ToolPage slug="dedupe" model={model} error={task.error} info={{ name: 'Xenova/all-MiniLM-L6-v2', href: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2', size: '~23 MB', task: 'sentence embeddings' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title="One item per line">
          <textarea aria-label="Items" rows={14} value={text} onChange={(e) => { setText(e.target.value); setVecs(null) }} className={cx(inputClass, 'text-sm')} placeholder="Bug reports, survey answers, FAQ questions, product names, keywords…" />
          <div className="mt-3 flex gap-2">
            <Button tone="primary" disabled={!text.trim() || task.busy} onClick={() => void run()}><CopyIcon size={16} /> {task.busy ? 'Comparing…' : 'Find duplicates'}</Button>
            <Chip onClick={() => { setText(SAMPLE); setVecs(null) }}>Load sample</Chip>
          </div>
          <div className="mt-5">
            <Field label="Similarity needed" htmlFor="sim" hint={`${Math.round(limit * 100)}%`}><input id="sim" type="range" min={0.4} max={0.95} step={0.05} value={limit} onChange={(e) => setLimit(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
            <p className="mt-1 text-xs text-ink-3">Matches by meaning, so different wording of the same thing groups together.</p>
          </div>
        </Panel>
        <Panel kicker="Groups" title={vecs ? `${dupes.length} duplicate groups · ${groups.length} unique` : 'Groups'} actions={<CopyButton text={unique} label="Copy unique" disabled={!vecs} />}>
          <ul className="max-h-[560px] space-y-3 overflow-auto">
            {dupes.map((g, i) => (
              <li key={i} className="rounded-lg border border-rule p-3">
                <Tag tone="accent">{g.length} similar</Tag>
                <ul className="mt-2 space-y-1 text-sm">{g.map((l, j) => <li key={j} className={j === 0 ? 'font-medium' : 'text-ink-2'}>{j === 0 ? '★ ' : '· '}{l}</li>)}</ul>
              </li>
            ))}
            {vecs && !dupes.length && <li className="py-10 text-center text-sm text-ink-3">No duplicates at this threshold. Try lowering it.</li>}
            {!vecs && <li className="py-10 text-center text-sm text-ink-3">Clean up a backlog, merge repeated feedback, or dedupe a keyword list.</li>}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
