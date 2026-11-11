import { useEffect, useMemo, useRef } from 'react'
import { Download, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Button, cx } from '../../ui/kit'
import { peaks, pcmDuration, type Pcm } from './audio'

export interface StemState {
  volume: number
  muted: boolean
  solo: boolean
}

const BUCKETS = 1200

/** One mixer lane: controls on the left, a waveform sharing the transport's playhead on the right. */
export function StemTrack({
  label,
  color,
  pcm,
  state,
  audible,
  previewing,
  onPreview,
  time,
  onChange,
  onSeek,
  onDownload,
  downloading,
}: {
  label: string
  color: string
  pcm: Pcm
  state: StemState
  audible: boolean
  /** This stem is playing on its own right now. */
  previewing: boolean
  /** Play (or pause) just this stem. */
  onPreview(): void
  time: number
  onChange(next: StemState): void
  onSeek(t: number): void
  onDownload(): void
  downloading: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const duration = pcmDuration(pcm)
  // Fold to mono peaks once per stem.
  const pk = useMemo(() => {
    const [l, r] = [pcm.channels[0], pcm.channels[1] ?? pcm.channels[0]]
    const a = peaks(l, BUCKETS)
    const b = peaks(r, BUCKETS)
    for (let i = 0; i < a.length; i += 2) {
      a[i] = Math.min(a[i], b[i])
      a[i + 1] = Math.max(a[i + 1], b[i + 1])
    }
    return a
  }, [pcm])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = c.clientWidth
      const h = c.clientHeight
      c.width = Math.max(1, Math.round(w * dpr))
      c.height = Math.max(1, Math.round(h * dpr))
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      // Canvas can't read CSS custom properties, so resolve var(--x) first.
      const v = /^var\((--[\w-]+)\)$/.exec(color)
      g.fillStyle = v ? getComputedStyle(c).getPropertyValue(v[1]).trim() || '#888' : color
      const mid = h / 2
      const step = w / BUCKETS
      for (let i = 0; i < BUCKETS; i++) {
        const lo = pk[i * 2]
        const hi = pk[i * 2 + 1]
        const y0 = mid - hi * mid * 0.95
        const y1 = mid - lo * mid * 0.95
        g.fillRect(i * step, y0, Math.max(1, step), Math.max(1, y1 - y0))
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [pk, color])

  const db = state.volume > 0 ? 20 * Math.log10(state.volume) : -Infinity

  return (
    <div
      className={cx('grid gap-3 rounded-lg border p-3 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-center', previewing ? 'border-accent' : 'border-rule', !audible && 'opacity-55')}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            aria-pressed={previewing}
            aria-label={previewing ? `Pause ${label}` : `Play ${label} only`}
            title={previewing ? 'Pause' : `Listen to ${label} on its own`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-paper transition-transform hover:scale-105"
            style={{ background: color }}
          >
            {previewing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-px" />}
          </button>
          <span className="flex-1 truncate text-sm font-semibold capitalize">{label}</span>
          <button
            type="button"
            aria-pressed={state.muted}
            aria-label={`Mute ${label}`}
            onClick={() => onChange({ ...state, muted: !state.muted })}
            className={cx('h-7 w-7 rounded border font-mono text-xs font-bold', state.muted ? 'border-accent bg-accent text-accent-ink' : 'border-rule text-ink-2 hover:border-ink')}
          >
            M
          </button>
          <button
            type="button"
            aria-pressed={state.solo}
            aria-label={`Solo ${label}`}
            onClick={() => onChange({ ...state, solo: !state.solo })}
            className={cx('h-7 w-7 rounded border font-mono text-xs font-bold', state.solo ? 'border-sun bg-sun text-paper' : 'border-rule text-ink-2 hover:border-ink')}
          >
            S
          </button>
          <Button size="sm" tone="ghost" className="!h-7 !px-2" aria-label={`Download ${label}`} disabled={downloading} onClick={onDownload}>
            <Download size={14} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {state.volume === 0 || state.muted ? <VolumeX size={14} className="text-ink-3" /> : <Volume2 size={14} className="text-ink-3" />}
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={state.volume}
            aria-label={`${label} volume`}
            onChange={(e) => onChange({ ...state, volume: +e.target.value })}
            onDoubleClick={() => onChange({ ...state, volume: 1 })}
            className="w-full accent-[var(--accent)]"
          />
          <span className="w-14 text-right font-mono text-[11px] tabular-nums text-ink-3">{Number.isFinite(db) ? `${db > 0 ? '+' : ''}${db.toFixed(1)}dB` : '−∞'}</span>
        </div>
      </div>
      <div
        className="relative h-16 cursor-pointer overflow-hidden rounded bg-paper"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onSeek(((e.clientX - r.left) / r.width) * duration)
        }}
      >
        <canvas ref={canvas} className="h-full w-full" aria-hidden />
        <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-accent" style={{ left: `${duration ? (Math.min(time, duration) / duration) * 100 : 0}%` }} />
      </div>
    </div>
  )
}
