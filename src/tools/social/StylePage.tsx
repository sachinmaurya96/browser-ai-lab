import { useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { CopyButton, Notice, Panel, cx, inputClass } from '../../ui/kit'

/**
 * Unicode "fonts" for platforms without formatting (LinkedIn, X, Instagram).
 * Each style maps A–Z, a–z (and digits where available) to a code point base.
 */
const STYLES: { id: string; label: string; upper: number; lower: number; digit?: number; exceptions?: Record<string, string> }[] = [
  { id: 'bold', label: 'Bold (sans)', upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  { id: 'italic', label: 'Italic (sans)', upper: 0x1d608, lower: 0x1d622 },
  { id: 'bolditalic', label: 'Bold italic', upper: 0x1d63c, lower: 0x1d656 },
  { id: 'serifbold', label: 'Bold (serif)', upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  { id: 'mono', label: 'Monospace', upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
  { id: 'script', label: 'Script', upper: 0x1d4d0, lower: 0x1d4ea },
  { id: 'double', label: 'Double-struck', upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8, exceptions: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
]

function convert(text: string, s: (typeof STYLES)[number]): string {
  return [...text]
    .map((ch) => {
      if (s.exceptions?.[ch]) return s.exceptions[ch]
      const c = ch.charCodeAt(0)
      if (c >= 65 && c <= 90) return String.fromCodePoint(s.upper + c - 65)
      if (c >= 97 && c <= 122) return String.fromCodePoint(s.lower + c - 97)
      if (s.digit && c >= 48 && c <= 57) return String.fromCodePoint(s.digit + c - 48)
      return ch
    })
    .join('')
}

const extras: { id: string; label: string; fn: (t: string) => string }[] = [
  { id: 'under', label: 'Underline', fn: (t) => [...t].map((c) => (c === ' ' ? c : c + '̲')).join('') },
  { id: 'strike', label: 'Strikethrough', fn: (t) => [...t].map((c) => (c === ' ' ? c : c + '̶')).join('') },
  { id: 'bullets', label: 'Bullet list', fn: (t) => t.split('\n').filter(Boolean).map((l) => `• ${l.replace(/^[-*•]\s*/, '')}`).join('\n') },
  { id: 'arrows', label: 'Arrow list', fn: (t) => t.split('\n').filter(Boolean).map((l) => `→ ${l.replace(/^[-*•→]\s*/, '')}`).join('\n') },
]

export default function StylePage() {
  const [text, setText] = useState('Ship small, learn fast')
  return (
    <PlainToolPage slug="text-style">
      <Notice tone="warn">
        Screen readers often read styled Unicode letter by letter (or skip it), and it isn't searchable. Use it for a
        word or short heading, never whole posts.
      </Notice>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel kicker="Text" title="Type a word or headline">
          <textarea aria-label="Text to style" rows={6} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'text-lg')} />
        </Panel>
        <Panel kicker="Styles" title="Click copy, paste anywhere">
          <ul className="space-y-2">
            {STYLES.map((s) => {
              const out = convert(text, s)
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-rule px-3 py-2">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-ink-3">{s.label}</span>
                  <span className="min-w-0 flex-1 truncate text-lg">{out}</span>
                  <CopyButton text={out} label="" />
                </li>
              )
            })}
            {extras.map((x) => {
              const out = x.fn(text)
              return (
                <li key={x.id} className="flex items-center gap-3 rounded-lg border border-rule px-3 py-2">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-ink-3">{x.label}</span>
                  <span className="min-w-0 flex-1 truncate text-lg whitespace-pre">{out}</span>
                  <CopyButton text={out} label="" />
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
