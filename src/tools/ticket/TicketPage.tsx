import { useRef, useState } from 'react'
import { ArrowRight, Download, Eraser, Plus, Square, Terminal, Trash2 } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { saveBlob } from '../../lib/images'
import { ModelCard } from '../../ui/ModelCard'
import { ToolIntro } from '../../ui/Shell'
import { Button, Chip, CopyButton, Field, Kicker, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'
import { KINDS, SEVERITIES, type Ticket } from './schema'
import { SAMPLES, firstPass, secondPass } from './prompt'
import { parseTicket } from './parse'
import { toMarkdown } from './markdown'
import type { CompleteInput, TokenEvent } from './worker'

type Stage = 'idle' | 'writing' | 'retrying' | 'done' | 'failed' | 'stopped'

const MAX_INPUT = 2000

export default function TicketPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const [message, setMessage] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [stream, setStream] = useState('')
  const [tps, setTps] = useState<number | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopped = useRef(false)

  const working = stage === 'writing' || stage === 'retrying'

  const complete = (input: CompleteInput) => {
    setStream('')
    return model.run<string>('complete', input, (d) => {
      const e = d as TokenEvent
      setStream((s) => s + e.text)
      if (e.tps) setTps(e.tps)
    })
  }

  const draft = async () => {
    const text = message.trim()
    if (!text) return
    stopped.current = false
    setError(null)
    setTicket(null)
    setTps(null)
    setStage('writing')
    try {
      let result = parseTicket(await complete({ messages: firstPass(text), maxTokens: 600 }))
      if (!result.ok && !stopped.current) {
        setStage('retrying')
        result = parseTicket(await complete({ messages: secondPass(text), maxTokens: 700 }))
      }
      if (stopped.current) {
        setStage('stopped')
        if (result.ok) setTicket(result.ticket)
        return
      }
      if (result.ok) {
        setTicket(result.ticket)
        setStage('done')
      } else {
        setError(`${result.reason} Try rephrasing or adding a bit more detail.`)
        setStage('failed')
      }
    } catch (e) {
      setError((e as Error).message)
      setStage('failed')
    }
  }

  const stop = () => {
    stopped.current = true
    model.stop()
  }

  const patch = (p: Partial<Ticket>) => setTicket((t) => (t ? { ...t, ...p } : t))
  const md = ticket ? toMarkdown(ticket) : ''

  return (
    <div className="space-y-6">
      <ToolIntro slug="ticket" />
      <ModelCard
        model={model}
        info={{ name: 'onnx-community/Qwen2.5-0.5B-Instruct', href: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct', size: '~480 MB', task: 'text generation' }}
        autoNote="Loads automatically on your first draft. "
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6">
          <Panel kicker="Input" title="What the customer said">
            <textarea
              aria-label="Customer message"
              rows={9}
              maxLength={MAX_INPUT}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void draft()
              }}
              placeholder="Paste a complaint, chat transcript or email…"
              className={cx(inputClass, 'resize-y leading-relaxed')}
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-3">
              <span>⌘/Ctrl + Enter to draft</span>
              <span>{message.length} / {MAX_INPUT}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <Chip key={s.label} disabled={working} onClick={() => setMessage(s.text)}>
                  {s.label}
                </Chip>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              {working ? (
                <Button tone="danger" onClick={stop}>
                  <Square size={15} /> Stop
                </Button>
              ) : (
                <Button tone="primary" disabled={!message.trim()} onClick={() => void draft()}>
                  Draft ticket <ArrowRight size={16} />
                </Button>
              )}
              <Button tone="ghost" disabled={working || !message} onClick={() => setMessage('')}>
                <Eraser size={15} /> Clear
              </Button>
            </div>
          </Panel>

          <div className="overflow-hidden rounded-xl border border-ink bg-ink text-paper">
            <div className="flex items-center justify-between border-b border-paper/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-paper/60">
              <span className="flex items-center gap-1.5"><Terminal size={13} /> model output</span>
              <span>
                {stage === 'retrying' && <span className="text-accent">retry pass · </span>}
                {tps ? `${tps.toFixed(1)} tok/s` : working ? (model.phase === 'downloading' ? 'loading…' : 'thinking…') : stage}
              </span>
            </div>
            <pre className={cx('max-h-72 min-h-28 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap', working && 'caret')}>
              {stream || (working ? '' : 'Raw tokens stream here as the model writes.')}
            </pre>
          </div>
        </div>

        <Panel
          kicker="Output"
          title={ticket ? 'Ticket draft — edit freely' : 'Ticket'}
          actions={
            ticket && (
              <>
                <CopyButton text={md} label="Markdown" />
                <CopyButton text={JSON.stringify(ticket, null, 2)} label="JSON" />
                <Button size="sm" tone="ghost" onClick={() => saveBlob(new Blob([md], { type: 'text/markdown' }), 'ticket.md')}>
                  <Download size={15} /> .md
                </Button>
              </>
            )
          }
        >
          {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
          {stage === 'stopped' && !ticket && <Notice tone="warn">Stopped before a usable ticket was produced.</Notice>}
          {!ticket ? (
            <EmptyTicket working={working} />
          ) : (
            <TicketEditor ticket={ticket} patch={patch} />
          )}
        </Panel>
      </div>
    </div>
  )
}

function EmptyTicket({ working }: { working: boolean }) {
  return (
    <div className="paper-grid grid min-h-80 place-items-center rounded-lg border border-dashed border-rule p-8 text-center">
      <div>
        <p className="font-display text-3xl">{working ? 'Drafting…' : 'No ticket yet'}</p>
        <p className="mt-2 max-w-sm text-sm text-ink-3">
          {working
            ? 'The structured ticket appears once the model finishes and its JSON checks out.'
            : 'Pick a sample or paste a message, then draft. The model never invents details you did not give it.'}
        </p>
      </div>
    </div>
  )
}

function TicketEditor({ ticket, patch }: { ticket: Ticket; patch: (p: Partial<Ticket>) => void }) {
  const tone = { High: 'accent', Medium: 'sun', Low: 'sea', Unknown: 'plain' } as const
  return (
    <div className="space-y-5">
      <input aria-label="Title" value={ticket.title} onChange={(e) => patch({ title: e.target.value })} className="w-full border-b border-rule bg-transparent pb-2 font-display text-3xl focus:border-ink focus:outline-none" />

      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Type" value={ticket.kind} onChange={(e) => patch({ kind: e.target.value as Ticket['kind'] })} className={cx(inputClass, 'w-auto py-1.5 text-sm')}>
          {KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select aria-label="Severity" value={ticket.severity} onChange={(e) => patch({ severity: e.target.value as Ticket['severity'] })} className={cx(inputClass, 'w-auto py-1.5 text-sm')}>
          {SEVERITIES.map((k) => <option key={k}>{k}</option>)}
        </select>
        <Tag tone={tone[ticket.severity]}>{ticket.severity} severity</Tag>
        {ticket.labels.map((l) => <Tag key={l}>#{l}</Tag>)}
      </div>

      <TextBlock label="Summary" id="summary" value={ticket.summary} onChange={(v) => patch({ summary: v })} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextBlock label="Expected" id="expected" value={ticket.expected} onChange={(v) => patch({ expected: v })} />
        <TextBlock label="Actual" id="actual" value={ticket.actual} onChange={(v) => patch({ actual: v })} />
      </div>
      <ListBlock label="Steps to reproduce" items={ticket.steps} numbered onChange={(steps) => patch({ steps })} />
      <TextBlock label="Environment" id="env" value={ticket.environment} onChange={(v) => patch({ environment: v })} rows={1} placeholder="Not stated by the reporter" />
      <ListBlock label="Ask the reporter" items={ticket.questions} onChange={(questions) => patch({ questions })} />
    </div>
  )
}

function TextBlock({ label, id, value, onChange, rows = 2, placeholder }: { label: string; id: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder ?? 'Not provided'} onChange={(e) => onChange(e.target.value)} className={cx(inputClass, 'resize-y text-sm leading-relaxed')} />
    </Field>
  )
}

function ListBlock({ label, items, onChange, numbered }: { label: string; items: string[]; onChange: (v: string[]) => void; numbered?: boolean }) {
  return (
    <div>
      <Kicker className="mb-2">{label}</Kicker>
      {items.length === 0 && <p className="mb-2 text-sm text-ink-3">None.</p>}
      <ol className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right font-mono text-xs text-ink-3">{numbered ? `${i + 1}.` : '?'}</span>
            <input aria-label={`${label} ${i + 1}`} value={item} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={cx(inputClass, 'py-1.5 text-sm')} />
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger">
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...items, ''])} className="mt-2 flex items-center gap-1 text-sm text-ink-3 hover:text-accent">
        <Plus size={14} /> Add
      </button>
    </div>
  )
}
