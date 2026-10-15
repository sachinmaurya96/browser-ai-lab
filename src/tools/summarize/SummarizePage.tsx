import { useState } from 'react'
import { AlignLeft } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { Output, ToolPage } from '../../ui/ToolPage'
import { Button, CopyButton, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Size = 'short' | 'medium' | 'long'
const TOKENS: Record<Size, [number, number]> = { short: [20, 60], medium: [50, 130], long: [100, 250] }

/** Split long text into ~700-word windows the model can read in one pass. */
function windows(text: string, words = 700): string[] {
  const w = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < w.length; i += words) out.push(w.slice(i, i + words).join(' '))
  return out
}

export default function SummarizePage() {
  const { model, callWith } = usePipeline({ task: 'summarization', model: 'Xenova/distilbart-cnn-6-6', dtype: { wasm: 'q8' }, webgpu: false })
  const task = useTask()
  const [text, setText] = useState('')
  const [size, setSize] = useState<Size>('medium')
  const [out, setOut] = useState('')
  const words = text.split(/\s+/).filter(Boolean).length

  const run = () =>
    task.go(async () => {
      setOut('')
      const [min, max] = TOKENS[size]
      const parts = windows(text)
      const sums: string[] = []
      for (const p of parts) {
        const [r] = await callWith<{ summary_text: string }[]>([p], { min_length: Math.min(min, 30), max_new_tokens: parts.length > 1 ? Math.round(max / 1.5) : max })
        sums.push(r.summary_text.trim())
        setOut(sums.join('\n\n'))
      }
    })

  return (
    <ToolPage slug="summarize" model={model} error={task.error} info={{ name: 'Xenova/distilbart-cnn-6-6', href: 'https://huggingface.co/Xenova/distilbart-cnn-6-6', size: '~300 MB', task: 'summarization (English)' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title="Article, report, email thread…" actions={<span className="font-mono text-xs text-ink-3">{words} words</span>}>
          <textarea aria-label="Text to summarize" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste at least a paragraph of English text." className={cx(inputClass, 'leading-relaxed')} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Segmented label="Length" value={size} onChange={setSize} options={[{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }]} />
            <Button tone="primary" disabled={words < 30 || task.busy} onClick={() => void run()}><AlignLeft size={16} /> {task.busy ? 'Summarizing…' : 'Summarize'}</Button>
          </div>
        </Panel>
        <Panel kicker="Summary" title={out ? `${out.split(/\s+/).length} words · ${Math.round((1 - out.split(/\s+/).length / Math.max(words, 1)) * 100)}% shorter` : 'Summary'} actions={<CopyButton text={out} />}>
          <Output text={out} busy={task.busy} placeholder="A condensed version appears here. Best on news-style and factual writing." />
        </Panel>
      </div>
    </ToolPage>
  )
}
