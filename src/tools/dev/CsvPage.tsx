import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PlainToolPage, FileDrop } from '../../ui/PdfKit'
import { saveBlob } from '../../lib/images'
import { Button, Chip, CopyButton, Notice, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Mode = 'csv2json' | 'json2csv'

/** RFC 4180 CSV parser: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f !== ''))
}

const guessDelim = (t: string) => {
  const line = t.split('\n')[0] ?? ''
  return [',', ';', '\t', '|'].sort((a, b) => line.split(b).length - line.split(a).length)[0]
}

/** "42" → 42, "true" → true, "" → null; everything else stays a string. */
const typed = (v: string): unknown => (v === '' ? null : /^-?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v)

function flatten(obj: Record<string, unknown>, prefix = '', out: Record<string, unknown> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, out)
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v
  }
  return out
}

const cell = (v: unknown, d: string) => {
  const s = v == null ? '' : String(v)
  return /["\n\r]/.test(s) || s.includes(d) ? `"${s.replace(/"/g, '""')}"` : s
}

const SAMPLE_CSV = 'id,name,city,active\n1,Ada Lovelace,London,true\n2,"Grace Hopper","New York, NY",false\n3,Alan Turing,Wilmslow,true'

export default function CsvPage() {
  const [mode, setMode] = useState<Mode>('csv2json')
  const [input, setInput] = useState('')
  const [header, setHeader] = useState(true)
  const [types, setTypes] = useState(true)

  const result = useMemo(() => {
    if (!input.trim()) return { out: '', rows: 0 }
    try {
      if (mode === 'csv2json') {
        const rows = parseCsv(input, guessDelim(input))
        if (!header) return { out: JSON.stringify(rows, null, 2), rows: rows.length }
        const [head, ...body] = rows
        const objs = body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim() || `col${i + 1}`, types ? typed(r[i] ?? '') : (r[i] ?? '')])))
        return { out: JSON.stringify(objs, null, 2), rows: objs.length, table: rows }
      }
      const data = JSON.parse(input)
      const list: Record<string, unknown>[] = (Array.isArray(data) ? data : [data]).map((x: unknown) => (x && typeof x === 'object' ? flatten(x as Record<string, unknown>) : { value: x }))
      const cols = [...new Set(list.flatMap((o) => Object.keys(o)))]
      const out = [cols.map((c) => cell(c, ',')).join(','), ...list.map((o) => cols.map((c) => cell(o[c], ',')).join(','))].join('\n')
      return { out, rows: list.length, table: [cols, ...list.map((o) => cols.map((c) => (o[c] == null ? '' : String(o[c]))))] }
    } catch (e) {
      return { out: '', rows: 0, error: (e as Error).message }
    }
  }, [input, mode, header, types])

  const ext = mode === 'csv2json' ? 'json' : 'csv'

  return (
    <PlainToolPage slug="csv" error={result.error}>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" value={mode} onChange={(m) => { setMode(m); setInput('') }} options={[{ value: 'csv2json', label: 'CSV → JSON' }, { value: 'json2csv', label: 'JSON → CSV' }]} />
        {mode === 'csv2json' && (
          <>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} className="accent-[var(--accent)]" /> First row is header</label>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={types} onChange={(e) => setTypes(e.target.checked)} className="accent-[var(--accent)]" /> Detect numbers &amp; booleans</label>
          </>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title={mode === 'csv2json' ? 'CSV / TSV' : 'JSON array'} actions={<Chip onClick={() => setInput(mode === 'csv2json' ? SAMPLE_CSV : '[{"id":1,"user":{"name":"Ada","city":"London"},"tags":["a","b"]},{"id":2,"user":{"name":"Grace"}}]')}>Sample</Chip>}>
          <FileDrop compact accept=".csv,.tsv,.json,.txt,text/*,application/json" label="Open a file" onFiles={async (f) => f[0] && setInput(await f[0].text())} />
          <textarea aria-label="Input" spellCheck={false} rows={14} value={input} onChange={(e) => setInput(e.target.value)} className={cx(inputClass, 'mt-3 font-mono text-sm')} />
        </Panel>
        <Panel kicker="Output" title={`${result.rows} rows`} actions={<><CopyButton text={result.out} /><Button size="sm" tone="ghost" disabled={!result.out} onClick={() => saveBlob(new Blob([result.out]), `converted.${ext}`)}><Download size={14} /> .{ext}</Button></>}>
          <pre className="max-h-[300px] overflow-auto rounded-lg border border-rule bg-paper p-3 font-mono text-sm">{result.out}</pre>
          {result.table && result.table.length > 1 && (
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-rule">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-paper-2"><tr>{result.table[0].map((h, i) => <th key={i} className="px-2 py-1.5 font-mono">{h}</th>)}</tr></thead>
                <tbody>{result.table.slice(1, 101).map((r, i) => <tr key={i} className="border-t border-rule">{r.map((c, j) => <td key={j} className="px-2 py-1">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {mode === 'json2csv' && <div className="mt-3"><Notice tone="info">Nested objects become dotted columns (user.name); arrays are kept as JSON text.</Notice></div>}
        </Panel>
      </div>
    </PlainToolPage>
  )
}
