import { useEffect, useRef, useState } from 'react'
import { Send, Square, Trash2 } from 'lucide-react'
import { ASSISTANT, useLlm } from '../../lib/hooks'
import type { ChatMessage } from '../../lib/llm.worker'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'

const SYSTEM = 'You are a friendly, concise assistant running privately on the user\'s device. Give clear, accurate answers. If you are unsure, say so.'
const STARTERS = ['Explain compound interest simply', 'Give me 5 dinner ideas with rice and eggs', 'Write a polite leave request email', 'What are good habits for better sleep?']

export default function ChatPage() {
  const llm = useLlm(ASSISTANT)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [live, setLive] = useState('')
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [history, live])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || llm.streaming) return
    const next: ChatMessage[] = [...history, { role: 'user', content: q }]
    setHistory(next)
    setDraft('')
    setLive('')
    setError(null)
    try {
      // Keep the last few turns so the context stays small and fast.
      const answer = await llm.chat({ messages: [{ role: 'system', content: SYSTEM }, ...next.slice(-8)], maxTokens: 768, temperature: 0.7 }, setLive)
      setHistory([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLive('')
    }
  }

  return (
    <ToolPage slug="chat" model={llm.model} error={error} info={{ name: 'onnx-community/Llama-3.2-1B-Instruct-q4f16', href: 'https://huggingface.co/onnx-community/Llama-3.2-1B-Instruct-q4f16', size: '~1.2 GB', task: 'chat assistant' }}>
      {llm.downgraded && <Notice tone="warn">This device can't run the main model (it needs WebGPU with half-precision support), so a smaller 0.5B model is being used. Results will be simpler; a desktop browser with WebGPU gives the best quality.</Notice>}
      <Panel kicker="Private chat" title="Nothing you type leaves this device" actions={<>{llm.tps && <Tag>{llm.tps.toFixed(1)} tok/s</Tag>}<Button size="sm" tone="ghost" disabled={llm.streaming || !history.length} onClick={() => setHistory([])}><Trash2 size={15} /> New chat</Button></>}>
        <div className="flex h-[60vh] min-h-[420px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {!history.length && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="font-display text-4xl">Ask me anything.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">{STARTERS.map((s) => <Chip key={s} onClick={() => void send(s)}>{s}</Chip>)}</div>
                </div>
              </div>
            )}
            {history.map((m, i) => <Bubble key={i} m={m} />)}
            {llm.streaming && <Bubble m={{ role: 'assistant', content: live }} streaming />}
            <div ref={end} />
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
            <textarea aria-label="Message" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft) } }} placeholder="Message… (Enter to send, Shift+Enter for a new line)" className={cx(inputClass, 'resize-none')} />
            {llm.streaming ? <Button tone="danger" onClick={llm.stop} aria-label="Stop"><Square size={15} /></Button> : <Button tone="primary" type="submit" disabled={!draft.trim()} aria-label="Send"><Send size={15} /></Button>}
          </form>
        </div>
      </Panel>
      <p className="text-xs text-ink-3">A small local model: great for drafting, brainstorming and explanations. It can be wrong about facts, so verify anything important.</p>
    </ToolPage>
  )
}

function Bubble({ m, streaming }: { m: ChatMessage; streaming?: boolean }) {
  const mine = m.role === 'user'
  return (
    <div className={cx('group flex', mine && 'justify-end')}>
      <div className={cx('max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap', mine ? 'rounded-br-sm bg-ink text-paper' : 'rounded-bl-sm border border-rule bg-paper')}>
        {m.content ? <span className={streaming ? 'caret' : undefined}>{m.content}</span> : <span className="font-mono text-xs text-ink-3">thinking…</span>}
        {!mine && !streaming && <div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"><CopyButton text={m.content} /></div>}
      </div>
    </div>
  )
}
