import { useEffect, useRef, useState } from 'react'
import { Ban, Sparkles } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { ModelCard } from '../../ui/ModelCard'
import { Button, Notice, Panel, Segmented, Tag } from '../../ui/kit'
import { asStereo, pcmDuration, pcmFromChannels, resample, timecode, type Pcm } from './audio'
import type { Stem } from './AudioMixer'
import type { DemucsModelId, SeparateEvent, SeparateInput, SeparateOutput, SeparatorConfig } from './worker'

export interface SeparatorModel {
  id: DemucsModelId
  label: string
  stems: string
  size: string
  /** Longest input we allow; output memory grows with stems × length. */
  maxMinutes: number
}

export const MODELS: SeparatorModel[] = [
  { id: 'htdemucs', label: '4 stems', stems: 'vocals, drums, bass, other', size: '86 MB', maxMinutes: 8 },
  { id: 'htdemucs_6s', label: '6 stems', stems: 'vocals, drums, bass, guitar, piano, other', size: '57 MB', maxMinutes: 6 },
]

/** Display order requested for the mixer, whatever order the model emits. */
const ORDER = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']

export interface SeparationResult {
  model: SeparatorModel
  stems: Stem[]
  seconds: number
  device: string
  ms: number
}

type Status = { kind: 'idle' } | { kind: 'preparing' } | { kind: 'running'; done: number; total: number; t0: number } | { kind: 'cancelled' } | { kind: 'failed'; message: string } | { kind: 'done'; ms: number }

/** Picks a model and runs it. Each model gets its own worker (keyed below). */
export function StemSeparator({ audio, onResult, onBusy }: { audio: Pcm; onResult(r: SeparationResult): void; onBusy(b: boolean): void }) {
  const [modelId, setModelId] = useState<DemucsModelId>('htdemucs')
  const [busy, setBusy] = useState(false)
  const model = MODELS.find((m) => m.id === modelId)!
  return (
    <Panel
      kicker="AI stem separation"
      title="Split the song into stems"
      actions={
        <Segmented
          label="Separation model"
          value={modelId}
          onChange={setModelId}
          disabled={busy}
          options={MODELS.map((m) => ({ value: m.id, label: m.label, hint: m.stems }))}
        />
      }
    >
      <SeparatorEngine
        key={modelId}
        model={model}
        audio={audio}
        onResult={onResult}
        onBusy={(b) => {
          setBusy(b)
          onBusy(b)
        }}
      />
    </Panel>
  )
}

function SeparatorEngine({ model, audio, onResult, onBusy }: { model: SeparatorModel; audio: Pcm; onResult(r: SeparationResult): void; onBusy(b: boolean): void }) {
  const engine = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }), { model: model.id } satisfies SeparatorConfig)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [now, setNow] = useState(() => performance.now())
  const onBusyRef = useRef(onBusy)
  onBusyRef.current = onBusy
  const seconds = pcmDuration(audio)
  const tooLong = seconds > model.maxMinutes * 60
  const busy = status.kind === 'preparing' || status.kind === 'running'

  useEffect(() => onBusyRef.current(busy), [busy])
  useEffect(() => () => onBusyRef.current(false), [])
  useEffect(() => {
    if (status.kind !== 'running') return
    const id = setInterval(() => setNow(performance.now()), 500)
    return () => clearInterval(id)
  }, [status.kind])

  const run = async () => {
    setStatus({ kind: 'preparing' })
    const t0 = performance.now()
    try {
      // Demucs runs on 44.1 kHz stereo; mono is duplicated, other rates resampled.
      const at = await resample(audio, 44100)
      const [l, r] = asStereo(at)
      const input: SeparateInput = { left: l, right: r }
      const out = await engine.run<SeparateOutput>('separate', input, (e) => {
        const p = e as SeparateEvent
        setStatus((s) => ({ kind: 'running', done: p.done, total: p.total, t0: s.kind === 'running' ? s.t0 : performance.now() }))
      })
      const stems = out.sources
        .map((name, i) => ({ name, pcm: pcmFromChannels([out.stems[i].left, out.stems[i].right], out.rate) }))
        .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
      const ms = performance.now() - t0
      setStatus({ kind: 'done', ms })
      onResult({ model, stems, seconds, device: out.device, ms })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setStatus(/cancelled/i.test(message) ? { kind: 'cancelled' } : { kind: 'failed', message })
    }
  }

  const label = () => {
    if (status.kind === 'preparing') return engine.phase === 'ready' ? 'Preparing audio…' : 'Loading model…'
    if (status.kind === 'running') return `Separating ${status.done}/${status.total}…`
    return `Separate into ${model.label}`
  }

  const eta = (() => {
    if (status.kind !== 'running' || status.done === 0) return null
    const per = (now - status.t0) / status.done
    return Math.max(0, (status.total - status.done) * per) / 1000
  })()

  return (
    <div className="space-y-4">
      <ModelCard
        model={engine}
        info={{
          name: `Hybrid Transformer Demucs · ${model.id} (ONNX)`,
          href: 'https://huggingface.co/RabiatS/audio-playground-models',
          size: model.size,
          task: `music source separation · ${model.stems}`,
          license: 'MIT licence · Meta Platforms (Demucs), ONNX export by RabiatS.',
        }}
        autoNote="Downloads once when you first separate, then stays cached in your browser. "
      />

      {engine.gpu && !engine.gpu.webgpu && (
        <Notice tone="warn">WebGPU isn't available in this browser, so separation runs on the CPU (WebAssembly). It works, but expect roughly real-time or slower. Chrome or Edge on a desktop is much faster.</Notice>
      )}
      {model.id === 'htdemucs_6s' && (
        <Notice tone="info">The 6-stem model adds guitar and piano. Demucs' authors note its piano stem is weaker than the others, with some bleed and artefacts. For the cleanest vocals and drums, use 4 stems.</Notice>
      )}
      {tooLong && (
        <Notice tone="warn">
          This audio is {timecode(seconds)} long. To stay within browser memory, the {model.label} model handles up to {model.maxMinutes} minutes. Trim it in the cutter above first (separation uses the current edit).
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button tone="primary" disabled={busy || tooLong} onClick={() => void run()}>
          <Sparkles size={16} /> {label()}
        </Button>
        {busy && (
          <Button tone="danger" size="sm" onClick={engine.stop} disabled={status.kind !== 'running'} title="Stops after the current segment">
            <Ban size={14} /> Cancel
          </Button>
        )}
        <span className="text-xs text-ink-3">Separates the current edit ({timecode(seconds)}). Audio never leaves this device.</span>
      </div>

      {status.kind === 'running' && (
        <div>
          <div className="mb-1.5 flex justify-between font-mono text-[11px] text-ink-3">
            <span>Segment {status.done} of {status.total} · {engine.device === 'webgpu' ? 'WebGPU' : 'CPU'}</span>
            <span>{eta === null ? 'estimating…' : `~${Math.ceil(eta)}s left`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={status.done} aria-valuemin={0} aria-valuemax={status.total}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(status.done / status.total) * 100}%` }} />
          </div>
        </div>
      )}
      {status.kind === 'cancelled' && <Notice tone="warn">Separation cancelled. No stems were produced.</Notice>}
      {status.kind === 'failed' && <Notice tone="error">Separation failed: {status.message}</Notice>}
      {status.kind === 'done' && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <Tag tone="sea">done</Tag> {model.label} in {(status.ms / 1000).toFixed(1)}s on {engine.device === 'webgpu' ? 'WebGPU' : 'CPU'}. Stems are in the mixer below.
        </p>
      )}
    </div>
  )
}
