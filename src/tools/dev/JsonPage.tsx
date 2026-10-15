import { useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Button, Chip, CopyButton, Notice, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type View = 'pretty' | 'minified' | 'types'

const SAMPLE = '{"id":42,"name":"Ada","tags":["admin","beta"],"profile":{"age":36,"verified":true,"site":null},"orders":[{"sku":"A1","qty":2,"price":9.5}]}'

/** Line/column of a JSON.parse error position, for a friendlier message. */
function locate(text: string, message: string): string {
  const m = message.match(/position (\d+)/)
  if (!m) return message
  const pos = +m[1]
  const before = text.slice(0, pos).split('\n')
  return `${message.replace(/ in JSON at position \d+.*/, '')} (line ${before.length}, column ${before.at(-1)!.length + 1})`
}

const pascal = (s: string) => s.replace(/(^|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (_, __, c: string) => c.toUpperCase()).replace(/^\d/, '_$&') || 'Item'
const safeKey = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k))

/** Infer TypeScript interfaces from a sample value. */
function toTypes(value: unknown, root = 'Root'): string {
  const out: string[] = []
  const seen = new Set<string>()
  const typeOf = (v: unknown, name: string): string => {
    if (v === null) return 'null'
    if (Array.isArray(v)) {
      if (!v.length) return 'unknown[]'
      const kinds = [...new Set(v.map((x) => typeOf(x, name.replace(/s$/, '') || name)))]
      return kinds.length === 1 ? `${kinds[0]}[]` : `(${kinds.join(' | ')})[]`
    }
    if (typeof v === 'object') {
      const iface = pascal(name)
      if (!seen.has(iface)) {
        seen.add(iface)
        // Merge keys across array items: a key missing from some is optional.
        const fields = Object.entries(v as Record<string, unknown>).map(([k, x]) => `  ${safeKey(k)}: ${typeOf(x, k)}`)
        out.push(`export interface ${iface} {\n${fields.join('\n')}\n}`)
      }
      return iface
    }
    return typeof v
  }
  const top = typeOf(value, root)
  if (!/^[A-Z]/.test(top)) out.push(`export type ${root} = ${top}`)
  return out.reverse().join('\n\n')
}

export default function JsonPage() {
  const [text, setText] = useState('')
  const [view, setView] = useState<View>('pretty')
  const [indent, setIndent] = useState<number | '\t'>(2)

  const result = useMemo(() => {
    if (!text.trim()) return { ok: true as const, out: '', stats: '' }
    try {
      const value = JSON.parse(text)
      const out = view === 'pretty' ? JSON.stringify(value, null, indent) : view === 'minified' ? JSON.stringify(value) : toTypes(value)
      const keys = (JSON.stringify(value).match(/"[^"]*":/g) ?? []).length
      return { ok: true as const, out, stats: `${keys} keys · ${new Blob([JSON.stringify(value)]).size} bytes minified` }
    } catch (e) {
      return { ok: false as const, error: locate(text, (e as Error).message) }
    }
  }, [text, view, indent])

  return (
    <PlainToolPage slug="json">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title="Paste JSON" actions={<Chip onClick={() => setText(SAMPLE)}>Sample</Chip>}>
          <textarea aria-label="JSON input" spellCheck={false} rows={20} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"hello": "world"}' className={cx(inputClass, 'font-mono text-sm')} />
          {!result.ok && <div className="mt-3"><Notice tone="error">{result.error}</Notice></div>}
          {result.ok && text.trim() && <p className="mt-2 font-mono text-xs text-sea">✓ Valid JSON · {result.stats}</p>}
        </Panel>
        <Panel
          kicker="Output"
          title={view === 'types' ? 'TypeScript interfaces' : view === 'minified' ? 'Minified' : 'Formatted'}
          actions={
            <>
              <Segmented label="View" value={view} onChange={setView} options={[{ value: 'pretty', label: 'Pretty' }, { value: 'minified', label: 'Minify' }, { value: 'types', label: 'TS types' }]} />
              <CopyButton text={result.ok ? result.out : ''} />
            </>
          }
        >
          {view === 'pretty' && (
            <div className="mb-3 flex gap-2">
              {[2, 4].map((n) => <Button key={n} size="sm" tone={indent === n ? 'primary' : 'ghost'} onClick={() => setIndent(n)}>{n} spaces</Button>)}
              <Button size="sm" tone={indent === '\t' ? 'primary' : 'ghost'} onClick={() => setIndent('\t')}>Tabs</Button>
            </div>
          )}
          <pre className="max-h-[560px] min-h-[420px] overflow-auto rounded-lg border border-rule bg-paper p-3 font-mono text-sm">{result.ok ? result.out : ''}</pre>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
