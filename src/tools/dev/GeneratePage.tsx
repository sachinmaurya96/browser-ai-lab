import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Button, CopyButton, Field, Panel, Segmented, Tag, cx, inputClass } from '../../ui/kit'

/** Unbiased random integer in [0, max) from the CSPRNG. */
function randInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % max
}

/** UUID v7: 48-bit Unix ms timestamp + randomness, sortable by creation time. */
function uuidv7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  const ms = BigInt(Date.now())
  for (let i = 0; i < 6; i++) b[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn)
  b[6] = (b[6] & 0x0f) | 0x70
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const SETS = { lower: 'abcdefghijkmnopqrstuvwxyz', upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', digits: '23456789', symbols: '!@#$%^&*()-_=+[]{};:,.?' }
const SIMILAR = { lower: 'l', upper: 'IO', digits: '01' }
type SetKey = keyof typeof SETS

function password(len: number, use: Record<SetKey, boolean>, similar: boolean): string {
  const pools = (Object.keys(SETS) as SetKey[]).filter((k) => use[k]).map((k) => SETS[k] + (similar && k in SIMILAR ? SIMILAR[k as keyof typeof SIMILAR] : ''))
  if (!pools.length) return ''
  // Guarantee one char from each chosen set, then shuffle.
  const chars = pools.map((p) => p[randInt(p.length)])
  const all = pools.join('')
  while (chars.length < len) chars.push(all[randInt(all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.slice(0, len).join('')
}

function entropyBits(len: number, use: Record<SetKey, boolean>) {
  const size = (Object.keys(SETS) as SetKey[]).filter((k) => use[k]).reduce((s, k) => s + SETS[k].length, 0)
  return size ? Math.round(len * Math.log2(size)) : 0
}

type Kind = 'uuid4' | 'uuid7' | 'password' | 'hex' | 'base64'

export default function GeneratePage() {
  const [kind, setKind] = useState<Kind>('password')
  const [count, setCount] = useState(5)
  const [len, setLen] = useState(20)
  const [use, setUse] = useState<Record<SetKey, boolean>>({ lower: true, upper: true, digits: true, symbols: true })
  const [similar, setSimilar] = useState(false)
  const [items, setItems] = useState<string[]>([])

  const one = useCallback((): string => {
    if (kind === 'uuid4') return crypto.randomUUID()
    if (kind === 'uuid7') return uuidv7()
    if (kind === 'password') return password(len, use, similar)
    const bytes = crypto.getRandomValues(new Uint8Array(len))
    return kind === 'hex' ? Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }, [kind, len, use, similar])

  const regen = useCallback(() => setItems(Array.from({ length: Math.max(1, Math.min(500, count)) }, one)), [count, one])
  useEffect(regen, [regen])

  const bits = kind === 'password' ? entropyBits(len, use) : kind === 'hex' || kind === 'base64' ? len * 8 : 122
  const strength = bits >= 100 ? ['excellent', 'sea'] : bits >= 70 ? ['strong', 'sea'] : bits >= 50 ? ['ok', 'sun'] : ['weak', 'accent']

  return (
    <PlainToolPage slug="generate">
      <Segmented label="Type" value={kind} onChange={setKind} options={[{ value: 'password', label: 'Password' }, { value: 'uuid4', label: 'UUID v4' }, { value: 'uuid7', label: 'UUID v7' }, { value: 'hex', label: 'Hex token' }, { value: 'base64', label: 'API key' }]} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel kicker="Options" title="Settings">
          <div className="space-y-4">
            <Field label="How many" htmlFor="cnt"><input id="cnt" type="number" min={1} max={500} className={inputClass} value={count} onChange={(e) => setCount(+e.target.value)} /></Field>
            {(kind === 'password' || kind === 'hex' || kind === 'base64') && (
              <Field label={kind === 'password' ? 'Length' : 'Bytes'} htmlFor="len" hint={String(len)}><input id="len" type="range" min={kind === 'password' ? 8 : 8} max={kind === 'password' ? 64 : 64} value={len} onChange={(e) => setLen(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
            )}
            {kind === 'password' && (
              <div className="space-y-2 text-sm">
                {(Object.keys(SETS) as SetKey[]).map((k) => (
                  <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={use[k]} onChange={(e) => setUse({ ...use, [k]: e.target.checked })} className="accent-[var(--accent)]" />{{ lower: 'Lowercase a–z', upper: 'Uppercase A–Z', digits: 'Numbers 0–9', symbols: 'Symbols !@#…' }[k]}</label>
                ))}
                <label className="flex items-center gap-2"><input type="checkbox" checked={similar} onChange={(e) => setSimilar(e.target.checked)} className="accent-[var(--accent)]" />Include look-alikes (l, I, O, 0, 1)</label>
              </div>
            )}
            <p className="flex items-center gap-2 text-sm">~{bits} bits of entropy <Tag tone={strength[1] as 'sea'}>{strength[0]}</Tag></p>
          </div>
        </Panel>
        <Panel kicker="Output" title={`${items.length} generated`} actions={<><Button size="sm" tone="ghost" onClick={regen}><RefreshCw size={14} /> Regenerate</Button><CopyButton text={items.join('\n')} label="Copy all" /></>}>
          <ul className="max-h-[520px] space-y-1.5 overflow-auto">
            {items.map((x, i) => (
              <li key={i} className="group flex items-center gap-2 rounded-md border border-rule px-3 py-1.5">
                <code className={cx('flex-1 font-mono text-sm break-all')}>{x}</code>
                <span className="opacity-60 group-hover:opacity-100"><CopyButton text={x} label="" /></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Generated with crypto.getRandomValues, the same secure randomness browsers use for TLS keys.</p>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
