import { useEffect, useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import JSZip from 'jszip'
import { saveBlob } from '../../lib/images'
import { Button, Chip, Notice, Panel, Tag } from '../../ui/kit'
import { mixdown, toAudioBuffer, type Pcm } from './audio'
import { ExportPanel, type Exporter } from './ExportPanel'
import { encode, extension, type ExportFormat } from './export'
import { StemTrack, type StemState } from './StemTrack'
import { TransportBar } from './TransportBar'
import { usePlayhead, useTransport } from './transport'

export interface Stem {
  name: string
  pcm: Pcm
}

export const STEM_COLORS: Record<string, string> = {
  vocals: 'var(--accent)',
  drums: 'var(--sun)',
  bass: 'var(--sea)',
  guitar: '#8b6fd6',
  piano: '#4f8fd9',
  other: 'var(--ink-3)',
}

const fresh = (): StemState => ({ volume: 1, muted: false, solo: false })

/** Effective gain after mute and solo (any solo silences every non-solo track). */
const gainOf = (s: StemState, anySolo: boolean) => (anySolo ? (s.solo ? s.volume : 0) : s.muted ? 0 : s.volume)

/** Synchronised multitrack player and mixer for separated stems. */
export function AudioMixer({
  stems,
  baseName,
  modelLabel,
  format,
  onFormat,
  exporter,
}: {
  stems: Stem[]
  baseName: string
  modelLabel: string
  format: ExportFormat
  onFormat(f: ExportFormat): void
  exporter: Exporter
}) {
  const transport = useTransport()
  const time = usePlayhead(transport)
  const [states, setStates] = useState<StemState[]>(() => stems.map(fresh))
  const [zipping, setZipping] = useState(false)
  const [lastReduction, setLastReduction] = useState(0)
  /** Stem being auditioned on its own via its lane's play button (a temporary solo). */
  const [preview, setPreview] = useState<number | null>(null)
  const anySolo = states.some((s) => s.solo)
  const mixGains = useMemo(() => states.map((s) => gainOf(s, anySolo)), [states, anySolo])
  const gains = useMemo(
    () => (preview === null ? mixGains : states.map((s, i) => (i === preview ? s.volume || 1 : 0))),
    [preview, mixGains, states],
  )

  // An audition ends when playback stops.
  const wasPlaying = useRef(false)
  useEffect(() => {
    if (wasPlaying.current && !transport.playing) setPreview(null)
    wasPlaying.current = transport.playing
  })

  const audition = (i: number) => {
    if (preview === i && transport.playing) return transport.pause()
    setPreview(i)
    if (!transport.playing) void transport.play()
  }

  useEffect(() => {
    transport.setTracks(stems.map((s) => toAudioBuffer(s.pcm)), stems.map(() => 1))
    setStates(stems.map(fresh))
  }, [stems, transport])

  useEffect(() => {
    gains.forEach((g, i) => transport.setGain(i, g))
  }, [gains, transport])

  const preset = (fn: (name: string) => number) => {
    setPreview(null)
    setStates(stems.map((s) => ({ volume: fn(s.name), muted: false, solo: false })))
  }
  const hasVocals = stems.some((s) => s.name === 'vocals')

  const mix = () => {
    const { pcm, reducedDb } = mixdown(stems.map((s, i) => ({ left: s.pcm.channels[0], right: s.pcm.channels[1], gain: mixGains[i] })), stems[0].pcm.sampleRate)
    setLastReduction(reducedDb)
    return pcm
  }

  const mixName = () => {
    const on = stems.filter((_, i) => mixGains[i] > 0).map((s) => s.name)
    if (on.length === stems.length) return `${baseName}-mix`
    if (hasVocals && on.length === stems.length - 1 && !on.includes('vocals')) return `${baseName}-instrumental`
    return `${baseName}-${on.join('+') || 'silence'}`
  }

  const zipAll = async () => {
    setZipping(true)
    try {
      const zip = new JSZip()
      for (const s of stems) zip.file(`${baseName}-${s.name}.${extension(format)}`, await encode(s.pcm, format))
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${baseName}-stems.zip`)
    } finally {
      setZipping(false)
    }
  }

  return (
    <Panel
      kicker="Multitrack mixer"
      title={<span className="flex items-center gap-2">{stems.length} stems <Tag tone="sea">{modelLabel}</Tag></span>}
      actions={<Button size="sm" disabled={zipping} onClick={() => void zipAll()}><Download size={14} /> {zipping ? 'Zipping…' : 'All stems (.zip)'}</Button>}
    >
      <div className="space-y-4">
        <TransportBar transport={transport} time={time} onPlay={() => setPreview(null)}>
          {preview !== null && <Tag tone="accent">Auditioning {stems[preview].name}</Tag>}
        </TransportBar>
        <div className="flex flex-wrap gap-1.5">
          <Chip onClick={() => preset(() => 1)}>Full mix</Chip>
          {hasVocals && <Chip onClick={() => preset((n) => (n === 'vocals' ? 0 : 1))}>Instrumental (no vocals)</Chip>}
          {hasVocals && <Chip onClick={() => preset((n) => (n === 'vocals' ? 1 : 0))}>Vocals only (a cappella)</Chip>}
          {stems.some((s) => s.name === 'drums') && <Chip onClick={() => preset((n) => (n === 'drums' ? 0 : 1))}>No drums</Chip>}
          {stems.some((s) => s.name === 'bass') && <Chip onClick={() => preset((n) => (n === 'bass' ? 0 : 1))}>No bass</Chip>}
        </div>
        <div className="space-y-2">
          {stems.map((s, i) => (
            <StemTrack
              key={s.name}
              label={s.name}
              color={STEM_COLORS[s.name] ?? 'var(--ink-3)'}
              pcm={s.pcm}
              state={states[i] ?? fresh()}
              audible={gains[i] > 0}
              previewing={preview === i && transport.playing}
              onPreview={() => audition(i)}
              time={time}
              onChange={(next) => setStates((all) => all.map((x, j) => (j === i ? next : x)))}
              onSeek={(t) => transport.seek(t)}
              downloading={!!exporter.busy}
              onDownload={() => void exporter.save(`stem-${s.name}`, () => s.pcm, `${baseName}-${s.name}`)}
            />
          ))}
        </div>
        {lastReduction < -0.05 && (
          <Notice tone="info">The last mix would have clipped, so it was turned down by {Math.abs(lastReduction).toFixed(1)} dB as a whole (the balance between stems is unchanged).</Notice>
        )}
        <ExportPanel
          format={format}
          onFormat={onFormat}
          exporter={exporter}
          label="Download mix"
          disabled={mixGains.every((g) => g === 0)}
          onExport={() => void exporter.save('mix', mix, mixName())}
          note="Exports exactly what you hear: volumes, mutes and solos applied. 44.1 kHz stereo."
        />
      </div>
    </Panel>
  )
}
