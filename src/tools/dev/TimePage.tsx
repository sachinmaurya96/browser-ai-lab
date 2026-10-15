import { useEffect, useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Button, Chip, CopyButton, Field, Notice, Panel, cx, inputClass } from '../../ui/kit'

// ---------------------------------------------------------------------------
// Cron: parse 5-field expressions, describe them, and list upcoming runs.
// ---------------------------------------------------------------------------

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] },
  { name: 'day of week', min: 0, max: 6, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
]
const MACROS: Record<string, string> = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' }
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseField(src: string, f: (typeof FIELDS)[number]): Set<number> {
  const out = new Set<number>()
  let s = src.toUpperCase()
  f.names?.forEach((n, i) => (s = s.replaceAll(n, String(i + f.min))))
  for (const part of s.split(',')) {
    const [range, stepStr] = part.split('/')
    const step = stepStr ? +stepStr : 1
    let [a, b] = range === '*' ? [f.min, f.max] : range.split('-').map(Number)
    if (b === undefined) b = stepStr ? f.max : a
    if (f.name === 'day of week') {
      if (a === 7) a = 0
      if (b === 7) b = 6
    }
    if ([a, b, step].some((x) => Number.isNaN(x)) || a < f.min || b > f.max || a > b || step < 1) throw new Error(`Invalid ${f.name}: "${part}"`)
    for (let v = a; v <= b; v += step) out.add(v)
  }
  return out
}

function parseCron(expr: string) {
  const parts = (MACROS[expr.trim().toLowerCase()] ?? expr).trim().split(/\s+/)
  if (parts.length !== 5) throw new Error('Expected 5 fields: minute hour day-of-month month day-of-week')
  return { raw: parts, sets: parts.map((p, i) => parseField(p, FIELDS[i])) }
}

function describe(raw: string[]): string {
  const [mi, h, dom, mon, dow] = raw
  const list = (s: string, names?: string[], off = 0) => s.split(',').map((x) => (names && /^\d+$/.test(x) ? names[+x - off] : x)).join(', ')
  let time: string
  if (mi === '*' && h === '*') time = 'Every minute'
  else if (mi.startsWith('*/') && h === '*') time = `Every ${mi.slice(2)} minutes`
  else if (/^\d+$/.test(mi) && h === '*') time = `At minute ${mi} of every hour`
  else if (/^\d+$/.test(mi) && h.startsWith('*/')) time = `At minute ${mi}, every ${h.slice(2)} hours`
  else if (/^\d+$/.test(mi) && /^[\d,]+$/.test(h)) time = `At ${h.split(',').map((x) => `${x.padStart(2, '0')}:${mi.padStart(2, '0')}`).join(', ')}`
  else time = `At minute ${mi}, hour ${h}`
  const parts = [time]
  if (dom !== '*') parts.push(`on day ${dom} of the month`)
  if (mon !== '*') parts.push(`in ${list(mon, MON, 1)}`)
  if (dow !== '*') parts.push(`${dom !== '*' ? 'or ' : ''}on ${list(dow.replace(/^1-5$/, '1,2,3,4,5'), DAY)}`)
  return parts.join(' ')
}

function nextRuns(sets: Set<number>[], raw: string[], count = 8): Date[] {
  const [mi, h, dom, mon, dow] = sets
  const out: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  // Standard cron: if both day fields are restricted, either may match.
  const domStar = raw[2] === '*'
  const dowStar = raw[4] === '*'
  for (let guard = 0; out.length < count && guard < 600_000; guard++) {
    const dayOk = domStar && dowStar ? true : domStar ? dow.has(d.getDay()) : dowStar ? dom.has(d.getDate()) : dom.has(d.getDate()) || dow.has(d.getDay())
    if (!mon.has(d.getMonth() + 1) || !dayOk) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0)
      continue
    }
    if (!h.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0)
      continue
    }
    if (mi.has(d.getMinutes())) out.push(new Date(d))
    d.setMinutes(d.getMinutes() + 1)
  }
  return out
}

// ---------------------------------------------------------------------------

function parseTime(input: string): Date | null {
  const s = input.trim()
  if (!s) return null
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = +s
    // 10 digits ≈ seconds, 13 ≈ milliseconds, 16 ≈ microseconds.
    const ms = Math.abs(n) < 1e11 ? n * 1000 : Math.abs(n) < 1e14 ? n : n / 1000
    return new Date(ms)
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function relative(d: Date) {
  const s = (d.getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]]
  const [u, size] = units.find(([, n]) => Math.abs(s) >= n) ?? ['second', 1]
  return rtf.format(Math.round(s / size), u)
}

export default function TimePage() {
  const [now, setNow] = useState(Date.now())
  const [input, setInput] = useState(String(Math.floor(Date.now() / 1000)))
  const [cron, setCron] = useState('*/15 9-17 * * 1-5')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const date = parseTime(input)
  const cronResult = useMemo(() => {
    try {
      const { raw, sets } = parseCron(cron)
      return { text: describe(raw), runs: nextRuns(sets, raw) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [cron])

  const rows: [string, string][] = date
    ? [
        ['Unix seconds', String(Math.floor(date.getTime() / 1000))],
        ['Unix milliseconds', String(date.getTime())],
        ['ISO 8601 (UTC)', date.toISOString()],
        ['Local', date.toString()],
        ['UTC', date.toUTCString()],
        ['RFC 2822-ish', date.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })],
        ['Relative', relative(date)],
      ]
    : []

  return (
    <PlainToolPage slug="time">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Timestamp" title="Convert any time" actions={<span className="font-mono text-sm text-accent">now {Math.floor(now / 1000)}</span>}>
          <Field label="Unix (s / ms / µs) or any date string" htmlFor="ts">
            <input id="ts" className={cx(inputClass, 'font-mono')} value={input} onChange={(e) => setInput(e.target.value)} placeholder="1760000000 or 2026-10-15T10:00:00Z" />
          </Field>
          <div className="mt-2 flex gap-2">
            <Button size="sm" tone="ghost" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>Now</Button>
            <Button size="sm" tone="ghost" onClick={() => setInput(new Date().toISOString())}>Now (ISO)</Button>
          </div>
          {input && !date && <div className="mt-3"><Notice tone="error">Couldn't understand that date.</Notice></div>}
          <table className="mt-4 w-full text-sm">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-b border-rule last:border-0">
                  <td className="py-2 pr-3 text-ink-3">{k}</td>
                  <td className="py-2 font-mono break-all">{v}</td>
                  <td className="py-2 text-right"><CopyButton text={v} label="" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel kicker="Cron" title="Explain a cron expression">
          <input aria-label="Cron expression" spellCheck={false} className={cx(inputClass, 'font-mono text-lg')} value={cron} onChange={(e) => setCron(e.target.value)} />
          <div className="mt-1 grid grid-cols-5 gap-1 text-center font-mono text-[10px] text-ink-3">{['minute', 'hour', 'day', 'month', 'weekday'].map((f) => <span key={f}>{f}</span>)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['*/5 * * * *', '0 9 * * 1-5', '30 2 * * 0', '0 0 1 * *', '@hourly'].map((c) => <Chip key={c} onClick={() => setCron(c)}>{c}</Chip>)}
          </div>
          {'error' in cronResult ? (
            <div className="mt-4"><Notice tone="error">{cronResult.error}</Notice></div>
          ) : (
            <>
              <p className="mt-5 font-display text-2xl">“{cronResult.text}.”</p>
              <p className="mt-4 mb-2 font-mono text-xs uppercase tracking-wider text-ink-3">Next runs (your time zone)</p>
              <ol className="space-y-1 font-mono text-sm">
                {cronResult.runs.map((d, i) => <li key={i} className="flex justify-between border-b border-dashed border-rule py-1"><span>{d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span className="text-ink-3">{relative(d)}</span></li>)}
              </ol>
            </>
          )}
        </Panel>
      </div>
    </PlainToolPage>
  )
}
