import { useState } from 'react'
import { Sparkles, Square } from 'lucide-react'
import { useLlm } from '../lib/hooks'
import type { LlmCandidate } from '../lib/llm.worker'
import type { ModelInfo } from './ModelCard'
import { Output, ToolPage } from './ToolPage'
import { Button, CopyButton, Notice, Panel, Tag, cx, inputClass } from './kit'

export interface Mode {
  id: string
  label: string
  /** System instruction for this mode. */
  system: string
  /** Optional extra field (e.g. target language) shown for this mode. */
  extra?: { label: string; options: string[] }
}

/** Shared "pick a mode, paste input, stream the result" layout for LLM tools. */
export function LlmTool({
  slug,
  modelId,
  info,
  modes,
  placeholder,
  mono,
  note,
}: {
  slug: string
  /** A model id, or an ordered list of candidates (see ASSISTANT). */
  modelId: string | LlmCandidate[]
  info: ModelInfo
  modes: Mode[]
  placeholder: string
  mono?: boolean
  note?: string
}) {
  const llm = useLlm(modelId)
  const [mode, setMode] = useState(modes[0])
  const [extra, setExtra] = useState(modes[0].extra?.options[0] ?? '')
  const [input, setInput] = useState('')
  const [out, setOut] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null)
    setOut('')
    try {
      const system = mode.system.replace('{extra}', extra)
      const result = await llm.chat({ messages: [{ role: 'system', content: system }, { role: 'user', content: input.trim() }], maxTokens: 1024, temperature: 0 }, setOut)
      setOut(result)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolPage slug={slug} model={llm.model} error={error} info={info}>
      {llm.downgraded && <Notice tone="warn">This device can't run the main model (it needs WebGPU with half-precision support), so a smaller 0.5B model is being used. Results will be simpler; a desktop browser with WebGPU gives the best quality.</Notice>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mode">
        {modes.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode.id === m.id} onClick={() => { setMode(m); setExtra(m.extra?.options[0] ?? '') }} className={cx('rounded-full border px-3.5 py-1.5 text-sm transition-colors', mode.id === m.id ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink')}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title={mode.label}>
          <textarea aria-label="Input" rows={14} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.trim()) void run() }} placeholder={placeholder} className={cx(inputClass, 'leading-relaxed', mono && 'font-mono text-sm')} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {mode.extra && (
              <select aria-label={mode.extra.label} value={extra} onChange={(e) => setExtra(e.target.value)} className={cx(inputClass, 'w-auto py-2 text-sm')}>
                {mode.extra.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
            {llm.streaming ? (
              <Button tone="danger" onClick={llm.stop}><Square size={15} /> Stop</Button>
            ) : (
              <Button tone="primary" disabled={!input.trim()} onClick={() => void run()}><Sparkles size={16} /> Run</Button>
            )}
            <span className="font-mono text-[11px] text-ink-3">⌘/Ctrl + Enter</span>
          </div>
        </Panel>
        <Panel kicker="Output" title="Result" actions={<>{llm.tps && <Tag>{llm.tps.toFixed(1)} tok/s</Tag>}<CopyButton text={out} /></>}>
          <div className={mono ? 'font-mono text-sm' : undefined}>
            <Output text={out} busy={llm.streaming} placeholder="The result streams here as it's written." />
          </div>
          {note && <p className="mt-3 text-xs text-ink-3">{note}</p>}
        </Panel>
      </div>
    </ToolPage>
  )
}
