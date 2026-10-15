import { useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Panel, Tag, cx, inputClass } from '../../ui/kit'

type Label = { label: string; score: number }
const POSITIVE = new Set(['admiration', 'amusement', 'approval', 'caring', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief', 'desire'])
const NEGATIVE = new Set(['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'])

const SAMPLE = `Absolutely love the new update, great job team!
The delivery was late again and nobody answered my emails.
Not sure how I feel about the redesign yet.
Thank you so much for helping me out yesterday.
I'm worried the price increase will push customers away.`

const tone = (l: string) => (POSITIVE.has(l) ? 'sea' : NEGATIVE.has(l) ? 'accent' : 'plain') as 'sea' | 'accent' | 'plain'

export default function MoodPage() {
  const { model, callWith } = usePipeline({ task: 'text-classification', model: 'SamLowe/roberta-base-go_emotions-onnx', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [text, setText] = useState('')
  const [rows, setRows] = useState<{ line: string; labels: Label[] }[]>([])

  const run = () =>
    task.go(async () => {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200)
      const out: { line: string; labels: Label[] }[] = []
      for (const line of lines) {
        const labels = await callWith<Label[]>([line], { top_k: 3 })
        out.push({ line, labels })
        setRows([...out])
      }
    })

  const total = rows.length || 1
  const pos = rows.filter((r) => POSITIVE.has(r.labels[0]?.label)).length
  const neg = rows.filter((r) => NEGATIVE.has(r.labels[0]?.label)).length
  const csv = ['text,emotion,score', ...rows.map((r) => `"${r.line.replace(/"/g, '""')}",${r.labels[0]?.label},${r.labels[0]?.score.toFixed(3)}`)].join('\n')

  return (
    <ToolPage slug="mood" model={model} error={task.error} info={{ name: 'SamLowe/roberta-base-go_emotions-onnx', href: 'https://huggingface.co/SamLowe/roberta-base-go_emotions-onnx', size: '~130 MB', task: 'emotion classification · 28 labels' }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel kicker="Input" title="One message, review or comment per line">
          <textarea aria-label="Lines to analyse" rows={12} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'text-sm leading-relaxed')} placeholder="Paste reviews, survey answers, tweets, support chats…" />
          <div className="mt-3 flex gap-2">
            <Button tone="primary" disabled={!text.trim() || task.busy} onClick={() => void run()}><HeartPulse size={16} /> {task.busy ? `Analysing ${rows.length}…` : 'Analyse'}</Button>
            <Chip onClick={() => setText(SAMPLE)}>Load sample</Chip>
          </div>
        </Panel>
        <Panel kicker="Results" title={rows.length ? `${rows.length} lines` : 'Emotions'} actions={<CopyButton text={csv} label="CSV" disabled={!rows.length} />}>
          {rows.length > 0 && (
            <div className="mb-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-paper-2">
                <div className="bg-sea" style={{ width: `${(pos / total) * 100}%` }} />
                <div className="bg-ink-3" style={{ width: `${((total - pos - neg) / total) * 100}%` }} />
                <div className="bg-accent" style={{ width: `${(neg / total) * 100}%` }} />
              </div>
              <p className="mt-1.5 flex justify-between font-mono text-xs text-ink-3"><span>{pos} positive</span><span>{total - pos - neg} neutral/mixed</span><span>{neg} negative</span></p>
            </div>
          )}
          <ul className="max-h-[460px] space-y-2 overflow-auto">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-rule p-3">
                <p className="text-sm">{r.line}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">{r.labels.map((l) => <Tag key={l.label} tone={tone(l.label)}>{l.label} {Math.round(l.score * 100)}%</Tag>)}</p>
              </li>
            ))}
            {!rows.length && <li className="py-10 text-center text-sm text-ink-3">Spot unhappy customers, gauge feedback, or check the tone of your own writing.</li>}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
