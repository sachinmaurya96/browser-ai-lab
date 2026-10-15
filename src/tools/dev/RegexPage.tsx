import { useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Chip, CopyButton, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'

const FLAGS = [
  ['g', 'global'],
  ['i', 'ignore case'],
  ['m', 'multiline'],
  ['s', 'dot matches newline'],
  ['u', 'unicode'],
] as const

const PRESETS: [string, string][] = [
  ['Email', '[\\w.+-]+@[\\w-]+\\.[\\w.-]+'],
  ['URL', 'https?:\\/\\/[^\\s/$.?#].[^\\s]*'],
  ['IPv4', '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b'],
  ['Date YYYY-MM-DD', '(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])'],
  ['Hex color', '#(?:[0-9a-fA-F]{3}){1,2}\\b'],
  ['Indian mobile', '(?:\\+91[\\s-]?)?[6-9]\\d{9}\\b'],
]

const SAMPLE = `Contact ada@example.com or bob.smith+dev@mail.co.uk
Visit https://example.org/docs?page=2 before 2026-03-14.
Server 192.168.1.20 responded; colour #e8553a; call +91 98765 43210.`

export default function RegexPage() {
  const [pattern, setPattern] = useState(PRESETS[0][1])
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState(SAMPLE)
  const [replace, setReplace] = useState('')

  const result = useMemo(() => {
    if (!pattern) return { matches: [] as RegExpMatchArray[] }
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const matches = [...text.matchAll(re)].slice(0, 1000)
      const replaced = replace ? text.replace(new RegExp(pattern, flags), replace) : null
      return { matches, replaced }
    } catch (e) {
      return { matches: [] as RegExpMatchArray[], error: (e as Error).message }
    }
  }, [pattern, flags, text, replace])

  // Build highlighted segments from match indices.
  const segments: { text: string; hit: boolean }[] = []
  let last = 0
  for (const m of result.matches) {
    if (m.index === undefined || !m[0]) continue
    segments.push({ text: text.slice(last, m.index), hit: false }, { text: m[0], hit: true })
    last = m.index + m[0].length
  }
  segments.push({ text: text.slice(last), hit: false })

  return (
    <PlainToolPage slug="regex">
      <div className="rounded-xl border border-ink bg-card p-3 font-mono">
        <div className="flex items-center gap-1">
          <span className="text-ink-3">/</span>
          <input aria-label="Pattern" spellCheck={false} value={pattern} onChange={(e) => setPattern(e.target.value)} className="min-w-0 flex-1 bg-transparent py-1 text-lg focus:outline-none" />
          <span className="text-ink-3">/</span>
          <span className="text-accent">{flags}</span>
          <CopyButton text={`/${pattern}/${flags}`} label="" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FLAGS.map(([f, label]) => (
          <button key={f} type="button" title={label} onClick={() => setFlags(flags.includes(f) ? flags.replace(f, '') : flags + f)} className={cx('rounded border px-2 py-0.5 font-mono text-sm', flags.includes(f) ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-3')}>
            {f} <span className="font-sans text-xs opacity-70">{label}</span>
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-rule" />
        {PRESETS.map(([n, p]) => <Chip key={n} onClick={() => setPattern(p)}>{n}</Chip>)}
      </div>
      {result.error && <Notice tone="error">{result.error}</Notice>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Test string" title={`${result.matches.length} match${result.matches.length === 1 ? '' : 'es'}`}>
          <textarea aria-label="Test string" spellCheck={false} rows={8} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'font-mono text-sm')} />
          <pre className="mt-3 max-h-60 overflow-auto rounded-lg border border-rule bg-paper p-3 font-mono text-sm whitespace-pre-wrap">
            {segments.map((s, i) => (s.hit ? <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-accent">{s.text}</mark> : <span key={i}>{s.text}</span>))}
          </pre>
          <div className="mt-4">
            <input aria-label="Replace with" className={cx(inputClass, 'font-mono text-sm')} value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with… ($1, $<name> supported)" />
            {result.replaced != null && <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-rule bg-paper p-3 font-mono text-sm whitespace-pre-wrap">{result.replaced}</pre>}
          </div>
        </Panel>
        <Panel kicker="Matches" title="Groups">
          <ol className="max-h-[560px] space-y-2 overflow-auto">
            {result.matches.map((m, i) => (
              <li key={i} className="rounded-lg border border-rule p-2.5 font-mono text-sm">
                <div className="flex items-center justify-between"><span className="break-all text-accent">{m[0]}</span><Tag>@{m.index}</Tag></div>
                {m.length > 1 && <ul className="mt-1.5 space-y-0.5 text-xs">{m.slice(1).map((g, j) => <li key={j}><span className="text-ink-3">${j + 1}</span> {g ?? <em className="text-ink-3">undefined</em>}</li>)}</ul>}
                {m.groups && <ul className="mt-1 text-xs">{Object.entries(m.groups).map(([k, v]) => <li key={k}><span className="text-sea">{k}</span> {v}</li>)}</ul>}
              </li>
            ))}
            {!result.matches.length && !result.error && <li className="py-10 text-center text-sm text-ink-3">No matches.</li>}
          </ol>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
