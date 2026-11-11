import { useEffect, useMemo, useState } from 'react'
import { Crop, Download, Eraser, Play, Repeat, RotateCcw, Scissors, SplitSquareHorizontal, Undo2, X } from 'lucide-react'
import JSZip from 'jszip'
import { saveBlob } from '../../lib/images'
import { Button, Panel, Tag, cx, inputClass } from '../../ui/kit'
import { cut, declick, pcmDuration, slice, timecode, toAudioBuffer, type Pcm } from './audio'
import { AudioWaveform, type Selection } from './AudioWaveform'
import { ExportPanel, type Exporter } from './ExportPanel'
import { encode, extension, type ExportFormat } from './export'
import { TransportBar } from './TransportBar'
import { usePlayhead, useTransport } from './transport'

const MIN_SEL = 0.05

/** Waveform editor: select, trim, delete, split into clips, preview and export. Needs no model. */
export function AudioCutter({
  audio,
  name,
  canUndo,
  edited,
  onEdit,
  onUndo,
  onReset,
  format,
  onFormat,
  exporter,
}: {
  audio: Pcm
  name: string
  canUndo: boolean
  edited: boolean
  onEdit(next: Pcm, label: string): void
  onUndo(): void
  onReset(): void
  format: ExportFormat
  onFormat(f: ExportFormat): void
  exporter: Exporter
}) {
  const transport = useTransport()
  const time = usePlayhead(transport)
  const [sel, setSel] = useState<Selection | null>(null)
  const [splits, setSplits] = useState<number[]>([])
  const [zipping, setZipping] = useState(false)
  const duration = pcmDuration(audio)

  useEffect(() => {
    transport.setTracks([toAudioBuffer(audio)])
    transport.seek(0)
    setSel(null)
    setSplits([])
  }, [audio, transport])

  const valid = sel && sel.end - sel.start >= MIN_SEL ? sel : null
  const clips = useMemo(() => {
    const edges = [0, ...splits, duration]
    return edges.slice(1).map((end, i) => ({ start: edges[i], end }))
  }, [splits, duration])

  const setEdge = (key: 'start' | 'end', value: string) => {
    const v = Number(value)
    if (!Number.isFinite(v)) return
    const base = sel ?? { start: 0, end: duration }
    const next = { ...base, [key]: Math.max(0, Math.min(duration, v)) }
    if (next.end > next.start) setSel(next)
  }

  const addSplit = () => {
    const t = Math.round(time * 1000) / 1000
    if (t <= MIN_SEL || t >= duration - MIN_SEL) return
    setSplits((s) => [...new Set([...s, t])].sort((a, b) => a - b))
  }

  const base = name.replace(/\.[^.]+$/, '') || 'audio'

  const zipClips = async () => {
    setZipping(true)
    try {
      const zip = new JSZip()
      for (const [i, c] of clips.entries()) {
        zip.file(`${base}-clip-${String(i + 1).padStart(2, '0')}.${extension(format)}`, await encode(declick(slice(audio, c.start, c.end)), format))
      }
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${base}-clips.zip`)
    } finally {
      setZipping(false)
    }
  }

  return (
    <Panel
      kicker="Music cutter"
      title={
        <span className="flex items-center gap-2">
          {name} {edited && <Tag tone="sun">edited</Tag>}
        </span>
      }
      actions={
        <>
          <Button size="sm" tone="ghost" disabled={!canUndo} onClick={onUndo}><Undo2 size={14} /> Undo</Button>
          <Button size="sm" tone="ghost" disabled={!edited} onClick={onReset}><RotateCcw size={14} /> Original</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-rule bg-paper p-2">
          <AudioWaveform pcm={audio} time={time} onSeek={(t) => transport.seek(t)} selection={valid} onSelect={setSel} markers={splits} />
        </div>
        <p className="text-xs text-ink-3">Click to move the playhead · drag across the waveform to select a region · drag its edges to adjust.</p>

        <TransportBar transport={transport} time={time}>
          <span className="mx-1 h-6 w-px bg-rule" />
          <Button size="sm" disabled={!valid} onClick={() => valid && void transport.play(valid.start, valid.end)}><Play size={14} /> Play selection</Button>
          <Button
            size="sm"
            tone={transport.loop ? 'primary' : 'ghost'}
            aria-pressed={transport.loop}
            title="Loop selection playback"
            onClick={() => { transport.loop = !transport.loop; transport.seek(transport.time) }}
          >
            <Repeat size={14} />
          </Button>
        </TransportBar>

        <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ink-3">Start (s)</span>
            <input type="number" step={0.01} min={0} max={duration} value={valid ? valid.start.toFixed(2) : ''} placeholder="0.00" onChange={(e) => setEdge('start', e.target.value)} className={cx(inputClass, 'w-32 font-mono text-sm')} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ink-3">End (s)</span>
            <input type="number" step={0.01} min={0} max={duration} value={valid ? valid.end.toFixed(2) : ''} placeholder={duration.toFixed(2)} onChange={(e) => setEdge('end', e.target.value)} className={cx(inputClass, 'w-32 font-mono text-sm')} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!valid} onClick={() => valid && onEdit(slice(audio, valid.start, valid.end), 'Trim')}><Crop size={14} /> Trim to selection</Button>
            <Button size="sm" disabled={!valid || (valid.start <= 0 && valid.end >= duration)} onClick={() => valid && onEdit(cut(audio, valid.start, valid.end), 'Delete')}><Eraser size={14} /> Delete selection</Button>
            <Button size="sm" onClick={addSplit} title="Split into clips at the playhead"><SplitSquareHorizontal size={14} /> Split at playhead</Button>
            {valid && <Button size="sm" tone="ghost" onClick={() => setSel(null)}><X size={14} /> Clear selection</Button>}
          </div>
        </div>

        {splits.length > 0 && (
          <div className="rounded-lg border border-rule">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-medium"><Scissors size={14} /> {clips.length} clips</span>
              <div className="flex gap-2">
                <Button size="sm" tone="ghost" onClick={() => setSplits([])}>Remove splits</Button>
                <Button size="sm" disabled={zipping} onClick={() => void zipClips()}><Download size={14} /> {zipping ? 'Zipping…' : 'All clips (.zip)'}</Button>
              </div>
            </div>
            <ul className="divide-y divide-rule">
              {clips.map((c, i) => (
                <li key={`${c.start}-${c.end}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-14 font-mono text-ink-3">#{i + 1}</span>
                  <span className="flex-1 font-mono tabular-nums">{timecode(c.start)} → {timecode(c.end)} <span className="text-ink-3">({(c.end - c.start).toFixed(2)}s)</span></span>
                  <Button size="sm" tone="ghost" aria-label={`Play clip ${i + 1}`} onClick={() => void transport.play(c.start, c.end)}><Play size={14} /></Button>
                  <Button size="sm" tone="ghost" onClick={() => setSel(c)}>Select</Button>
                  <Button size="sm" tone="ghost" aria-label={`Download clip ${i + 1}`} disabled={!!exporter.busy} onClick={() => void exporter.save(`clip-${i}`, () => declick(slice(audio, c.start, c.end)), `${base}-clip-${String(i + 1).padStart(2, '0')}`)}><Download size={14} /></Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ExportPanel
          format={format}
          onFormat={onFormat}
          exporter={exporter}
          label={valid ? 'Download selection' : edited ? 'Download edited audio' : 'Download audio'}
          onExport={() => void exporter.save('cutter', () => (valid ? declick(slice(audio, valid.start, valid.end)) : audio), valid ? `${base}-selection` : edited ? `${base}-edit` : base)}
          note={`${audio.channels.length === 1 ? 'Mono' : 'Stereo'} · ${(audio.sampleRate / 1000).toFixed(1)} kHz · ${timecode(duration)}`}
        />
      </div>
    </Panel>
  )
}
