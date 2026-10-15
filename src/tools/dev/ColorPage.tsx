import { useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { CopyButton, Field, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'

type RGB = [number, number, number]

/** Parse hex, rgb(), hsl() or a CSS colour name via a canvas. */
function parse(input: string): RGB | null {
  const s = input.trim()
  if (!s) return null
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = '#010203'
  ctx.fillStyle = s
  const v = ctx.fillStyle
  if (v === '#010203' && !/^#?010203$/i.test(s)) return null
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB
  const m = v.match(/\d+(\.\d+)?/g)
  return m ? (m.slice(0, 3).map(Number) as RGB) : null
}

const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')

function hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)]
}

function fromHsl(h: number, s: number, l: number): RGB {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance([r, g, b]: RGB) {
  const c = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export default function ColorPage() {
  const [fg, setFg] = useState('#1b1a17')
  const [bg, setBg] = useState('#f5f1ea')
  const f = parse(fg)
  const b = parse(bg)
  const ratio = f && b ? contrast(f, b) : null

  const formats = useMemo(() => {
    if (!f) return []
    const [h, s, l] = hsl(f)
    return [
      ['HEX', hex(f)],
      ['RGB', `rgb(${f.map(Math.round).join(', ')})`],
      ['HSL', `hsl(${h} ${s}% ${l}%)`],
      ['CSS var', `--color: ${hex(f)};`],
      ['Tailwind', `bg-[${hex(f)}]`],
      ['Swift / Kotlin', `rgba(${f.map((x) => (x / 255).toFixed(3)).join(', ')}, 1)`],
    ]
  }, [f])

  const shades = useMemo(() => {
    if (!f) return []
    const [h, s] = hsl(f)
    return [95, 85, 72, 60, 50, 40, 30, 20, 12].map((l) => hex(fromHsl(h, s, l)))
  }, [f])

  const checks = ratio
    ? [
        ['AA normal text', 4.5],
        ['AA large text', 3],
        ['AAA normal text', 7],
        ['AAA large text', 4.5],
        ['UI components', 3],
      ].map(([n, min]) => [n as string, ratio >= (min as number)] as const)
    : []

  return (
    <PlainToolPage slug="color">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Colour" title="Convert">
          <div className="flex items-end gap-3">
            <input aria-label="Pick colour" type="color" value={f ? hex(f) : '#000000'} onChange={(e) => setFg(e.target.value)} className="h-11 w-14 rounded border border-rule" />
            <div className="flex-1"><Field label="Any CSS colour" htmlFor="fg"><input id="fg" className={cx(inputClass, 'font-mono')} value={fg} onChange={(e) => setFg(e.target.value)} placeholder="#e8553a, rgb(…), hsl(…), tomato" /></Field></div>
          </div>
          {!f && fg && <div className="mt-3"><Notice tone="error">Not a colour browsers understand.</Notice></div>}
          <table className="mt-4 w-full text-sm">
            <tbody>
              {formats.map(([k, v]) => (
                <tr key={k} className="border-b border-rule last:border-0"><td className="py-2 pr-3 text-ink-3">{k}</td><td className="py-2 font-mono">{v}</td><td className="py-2 text-right"><CopyButton text={v} label="" /></td></tr>
              ))}
            </tbody>
          </table>
          {shades.length > 0 && (
            <>
              <p className="mt-5 mb-2 font-mono text-xs uppercase tracking-wider text-ink-3">Shades · click to copy</p>
              <div className="flex overflow-hidden rounded-lg border border-rule">
                {shades.map((c) => <button key={c} type="button" title={c} onClick={() => void navigator.clipboard.writeText(c)} className="h-12 flex-1" style={{ background: c }} />)}
              </div>
            </>
          )}
        </Panel>
        <Panel kicker="Accessibility" title="Contrast checker (WCAG)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Text" htmlFor="c1"><input id="c1" className={cx(inputClass, 'font-mono')} value={fg} onChange={(e) => setFg(e.target.value)} /></Field>
            <Field label="Background" htmlFor="c2"><input id="c2" className={cx(inputClass, 'font-mono')} value={bg} onChange={(e) => setBg(e.target.value)} /></Field>
          </div>
          <div className="mt-4 rounded-xl border border-rule p-6" style={{ background: b ? hex(b) : undefined, color: f ? hex(f) : undefined }}>
            <p className="text-2xl font-semibold">Large heading text</p>
            <p className="mt-1 text-[15px]">Normal body text looks like this. The quick brown fox jumps over the lazy dog.</p>
          </div>
          {ratio && (
            <>
              <p className="mt-4 font-display text-5xl">{ratio.toFixed(2)}<span className="text-2xl text-ink-3">:1</span></p>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">{checks.map(([n, ok]) => <li key={n} className="flex items-center justify-between rounded-md border border-rule px-3 py-1.5">{n}<Tag tone={ok ? 'sea' : 'accent'}>{ok ? 'pass' : 'fail'}</Tag></li>)}</ul>
            </>
          )}
        </Panel>
      </div>
    </PlainToolPage>
  )
}
