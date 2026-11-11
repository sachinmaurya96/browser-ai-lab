import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { pcmDuration, wavesurferPeaks, type Pcm } from './audio'

export interface Selection {
  start: number
  end: number
}

type Regions = ReturnType<typeof RegionsPlugin.create>

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'

/**
 * wavesurfer.js renders the waveform, the drag-to-select region and split
 * markers from precomputed peaks. Playback is not wavesurfer's: the page's
 * Web Audio transport owns it, and this component just draws its playhead.
 */
export function AudioWaveform({
  pcm,
  time,
  onSeek,
  selection,
  onSelect,
  markers = [],
  height = 128,
}: {
  pcm: Pcm
  time: number
  onSeek(t: number): void
  selection?: Selection | null
  onSelect?(s: Selection | null): void
  markers?: number[]
  height?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const regions = useRef<Regions | null>(null)
  const cb = useRef({ onSeek, onSelect })
  cb.current = { onSeek, onSelect }
  const duration = pcmDuration(pcm)

  useEffect(() => {
    const plugin = RegionsPlugin.create()
    const w = WaveSurfer.create({
      container: box.current!,
      height,
      waveColor: css('--ink-3'),
      progressColor: css('--ink-3'),
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: false,
      interact: true,
      plugins: [plugin],
    })
    w.on('interaction', (t) => cb.current.onSeek(t))
    if (cb.current.onSelect) {
      plugin.enableDragSelection({ color: 'color-mix(in srgb, var(--accent) 22%, transparent)' }, 3)
      plugin.on('region-created', (r: Region) => {
        if (r.id.startsWith('split-')) return
        for (const other of plugin.getRegions()) if (other !== r && !other.id.startsWith('split-')) other.remove()
        cb.current.onSelect?.({ start: r.start, end: r.end })
      })
      plugin.on('region-updated', (r: Region) => {
        if (!r.id.startsWith('split-')) cb.current.onSelect?.({ start: r.start, end: r.end })
      })
    }
    ws.current = w
    regions.current = plugin
    return () => {
      w.destroy()
      ws.current = null
      regions.current = null
    }
  }, [height])

  useEffect(() => {
    const w = ws.current
    if (!w) return
    w.load('', wavesurferPeaks(pcm), pcmDuration(pcm)).catch(() => undefined)
  }, [pcm])

  // Keep the drawn region in sync when the selection changes from outside.
  useEffect(() => {
    const plugin = regions.current
    if (!plugin) return
    const current = plugin.getRegions().find((r) => !r.id.startsWith('split-'))
    if (!selection) {
      current?.remove()
      return
    }
    if (current && Math.abs(current.start - selection.start) < 1e-3 && Math.abs(current.end - selection.end) < 1e-3) return
    current?.remove()
    plugin.addRegion({ id: 'sel', start: selection.start, end: selection.end, color: 'color-mix(in srgb, var(--accent) 22%, transparent)' })
  }, [selection, pcm])

  useEffect(() => {
    const plugin = regions.current
    if (!plugin) return
    plugin.getRegions().filter((r) => r.id.startsWith('split-')).forEach((r) => r.remove())
    markers.forEach((m, i) => plugin.addRegion({ id: `split-${i}`, start: m, color: css('--sea'), drag: false, resize: false }))
  }, [markers, pcm])

  return (
    <div className="relative">
      <div ref={box} className="w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-accent"
        style={{ left: `${duration ? (Math.min(time, duration) / duration) * 100 : 0}%` }}
      />
    </div>
  )
}
