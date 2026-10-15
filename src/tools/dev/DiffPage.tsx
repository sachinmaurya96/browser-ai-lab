import { useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { CopyButton, Panel, Segmented, Tag, cx, inputClass } from '../../ui/kit'

type Op = { type: 'same' | 'add' | 'del'; text: string; a?: number; b?: number }

/** Myers-style LCS diff over lines (O(n·m) table, fine for a few thousand lines). */
function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length
  const m = b.length
  if (n * m > 25_000_000) throw new Error('Inputs are too large to diff in the browser (max ~5,000 × 5,000 lines).')
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) ops.push({ type: 'same', text: a[i], a: ++i, b: ++j })
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: 'del', text: a[i], a: ++i })
    else ops.push({ type: 'add', text: b[j], b: ++j })
  }
  while (i < n) ops.push({ type: 'del', text: a[i], a: ++i })
  while (j < m) ops.push({ type: 'add', text: b[j], b: ++j })
  return ops
}

export default function DiffPage() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [ignoreWs, setIgnoreWs] = useState(false)
  const [view, setView] = useState<'all' | 'changes'>('all')

  const result = useMemo(() => {
    const norm = (s: string) => s.split('\n').map((l) => (ignoreWs ? l.replace(/\s+/g, ' ').trim() : l))
    try {
      return { ops: diffLines(norm(left), norm(right)) }
    } catch (e) {
      return { ops: [] as Op[], error: (e as Error).message }
    }
  }, [left, right, ignoreWs])

  const added = result.ops.filter((o) => o.type === 'add').length
  const removed = result.ops.filter((o) => o.type === 'del').length
  const patch = result.ops.map((o) => (o.type === 'add' ? '+ ' : o.type === 'del' ? '- ' : '  ') + o.text).join('\n')
  const shown = view === 'all' ? result.ops : result.ops.filter((o, i, all) => o.type !== 'same' || all.slice(Math.max(0, i - 2), i + 3).some((x) => x.type !== 'same'))

  return (
    <PlainToolPage slug="diff" error={result.error}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Original" title="Before"><textarea aria-label="Original text" spellCheck={false} rows={10} value={left} onChange={(e) => setLeft(e.target.value)} className={cx(inputClass, 'font-mono text-sm')} /></Panel>
        <Panel kicker="Changed" title="After"><textarea aria-label="Changed text" spellCheck={false} rows={10} value={right} onChange={(e) => setRight(e.target.value)} className={cx(inputClass, 'font-mono text-sm')} /></Panel>
      </div>
      <Panel
        kicker="Diff"
        title={<span className="flex items-center gap-2"><Tag tone="sea">+{added}</Tag><Tag tone="accent">−{removed}</Tag>{left === right && left && <span className="text-sm font-normal text-ink-3">Identical</span>}</span>}
        actions={
          <>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={ignoreWs} onChange={(e) => setIgnoreWs(e.target.checked)} className="accent-[var(--accent)]" /> Ignore whitespace</label>
            <Segmented label="Show" value={view} onChange={setView} options={[{ value: 'all', label: 'All lines' }, { value: 'changes', label: 'Changes only' }]} />
            <CopyButton text={patch} label="Copy patch" />
          </>
        }
      >
        <div className="max-h-[600px] overflow-auto rounded-lg border border-rule font-mono text-sm">
          {shown.map((o, i) => (
            <div key={i} className={cx('flex', o.type === 'add' && 'bg-sea-soft', o.type === 'del' && 'bg-accent-soft')}>
              <span className="w-10 shrink-0 border-r border-rule px-1 text-right text-xs leading-6 text-ink-3 select-none">{o.a ?? ''}</span>
              <span className="w-10 shrink-0 border-r border-rule px-1 text-right text-xs leading-6 text-ink-3 select-none">{o.b ?? ''}</span>
              <span className={cx('w-5 shrink-0 text-center leading-6 select-none', o.type === 'add' ? 'text-sea' : o.type === 'del' ? 'text-accent' : 'text-ink-3')}>{o.type === 'add' ? '+' : o.type === 'del' ? '−' : ''}</span>
              <span className="px-2 leading-6 whitespace-pre-wrap">{o.text || ' '}</span>
            </div>
          ))}
          {!left && !right && <p className="p-8 text-center font-sans text-ink-3">Paste two versions of code, config or text to compare them.</p>}
        </div>
      </Panel>
    </PlainToolPage>
  )
}
