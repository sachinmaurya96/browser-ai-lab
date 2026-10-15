import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Panel, Tag, cx, inputClass } from '../../ui/kit'

type Kind = 'PERSON' | 'ORG' | 'LOCATION' | 'MISC' | 'EMAIL' | 'PHONE' | 'URL' | 'CARD' | 'IP' | 'ID'

const PATTERNS: [Kind, RegExp][] = [
  ['EMAIL', /[\w.+-]+@[\w-]+\.[\w.-]+/g],
  ['URL', /https?:\/\/[^\s)]+/g],
  ['IP', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ['CARD', /\b(?:\d[ -]?){13,19}\b/g],
  ['PHONE', /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,5}[\s-]?\d{3,4}[\s-]?\d{0,4}\b/g],
  ['ID', /\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{4}\s?\d{4}\s?\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/g],
]

const NER_KIND: Record<string, Kind> = { PER: 'PERSON', ORG: 'ORG', LOC: 'LOCATION', MISC: 'MISC' }

const SAMPLE = `Hi, I'm Priya Sharma from Acme Logistics in Mumbai. Please call me on +91 98765 43210 or email priya.sharma@acme.example.
My card 4111 1111 1111 1111 was charged twice. Our server at 192.168.10.24 logs show it. My PAN is ABCDE1234F.`

interface Token {
  entity: string
  word: string
  score: number
}

/** Merge word-piece tokens (B-/I- tags, "##" pieces) into entity strings. */
function groupEntities(tokens: Token[]): { text: string; kind: Kind }[] {
  const out: { text: string; kind: Kind }[] = []
  for (const t of tokens) {
    const [prefix, tag] = t.entity.split('-')
    const kind = NER_KIND[tag]
    if (!kind || t.score < 0.6) continue
    const last = out[out.length - 1]
    if (t.word.startsWith('##') && last) last.text += t.word.slice(2)
    else if (prefix === 'I' && last?.kind === kind) last.text += ' ' + t.word
    else out.push({ text: t.word, kind })
  }
  return out.filter((e) => e.text.length > 1)
}

export default function RedactPage() {
  const { model, call } = usePipeline({ task: 'token-classification', model: 'Xenova/bert-base-NER', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [text, setText] = useState('')
  const [found, setFound] = useState<{ text: string; kind: Kind }[]>([])
  const [style, setStyle] = useState<'label' | 'block'>('label')
  const [off, setOff] = useState<Set<Kind>>(new Set())

  const run = () =>
    task.go(async () => {
      const ents: { text: string; kind: Kind }[] = []
      // NER reads ~400 words at a time; go paragraph by paragraph.
      for (const para of text.split(/\n+/).filter((p) => p.trim())) ents.push(...groupEntities(await call<Token[]>(para)))
      for (const [kind, re] of PATTERNS) for (const m of text.matchAll(re)) if (m[0].replace(/\D/g, '').length >= 7 || !['PHONE', 'CARD'].includes(kind)) ents.push({ text: m[0].trim(), kind })
      // Longest first so "Priya Sharma" is replaced before "Priya".
      const uniq = new Map(ents.map((e) => [e.text, e]))
      setFound([...uniq.values()].sort((a, b) => b.text.length - a.text.length))
    })

  const redacted = useMemo(() => {
    let out = text
    for (const e of found) {
      if (off.has(e.kind)) continue
      const rep = style === 'label' ? `[${e.kind}]` : '█'.repeat(Math.min(e.text.length, 12))
      out = out.split(e.text).join(rep)
    }
    return out
  }, [text, found, style, off])

  const kinds = [...new Set(found.map((f) => f.kind))]

  return (
    <ToolPage slug="redact" model={model} error={task.error} info={{ name: 'Xenova/bert-base-NER', href: 'https://huggingface.co/Xenova/bert-base-NER', size: '~110 MB', task: 'named-entity recognition + patterns' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title="Text with personal data">
          <textarea aria-label="Text to redact" rows={12} value={text} onChange={(e) => { setText(e.target.value); setFound([]) }} className={cx(inputClass, 'text-sm leading-relaxed')} placeholder="Paste logs, emails, chat transcripts, documents…" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="primary" disabled={!text.trim() || task.busy} onClick={() => void run()}><ShieldCheck size={16} /> {task.busy ? 'Scanning…' : 'Find & redact'}</Button>
            <Chip onClick={() => { setText(SAMPLE); setFound([]) }}>Load sample</Chip>
          </div>
          {kinds.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Redact these types</p>
              <div className="flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={!off.has(k)} onChange={() => setOff((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })} className="accent-[var(--accent)]" />
                    <Tag tone="accent">{k}</Tag><span className="text-ink-3">{found.filter((f) => f.kind === k).length}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Panel>
        <Panel kicker="Output" title="Safe to share" actions={<><select aria-label="Style" value={style} onChange={(e) => setStyle(e.target.value as 'label' | 'block')} className={cx(inputClass, 'w-auto py-1 text-sm')}><option value="label">[LABEL]</option><option value="block">████</option></select><CopyButton text={redacted} disabled={!found.length} /></>}>
          <div className="min-h-[280px] rounded-lg border border-rule bg-paper p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">{found.length ? redacted : <span className="text-ink-3">Redacted text appears here. Paste logs into AI chats or bug trackers without leaking customer data.</span>}</div>
          <p className="mt-3 text-xs text-ink-3">Automated redaction misses things. Always skim the result before sharing anything sensitive.</p>
        </Panel>
      </div>
    </ToolPage>
  )
}
