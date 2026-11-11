import { useEffect, useRef, useState } from 'react'
import { Dice5, Download, Lock, Play, Sparkles, Trash2, Unlock } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { useTask } from '../../lib/hooks'
import { encodeWavStereo } from '../../lib/audio'
import { saveBlob } from '../../lib/images'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, Field, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'
import type { SfxEvent, SfxInput, SfxOutput } from './worker'

const MAX_SECONDS = 11.89

/** Cartoon-style starting points. Short, concrete prompts work best. */
const PRESETS: [string, string][] = [
  ['Boing', 'cartoon boing spring bounce sound effect'],
  ['Slide whistle', 'slide whistle going up, cartoon'],
  ['Bubble pop', 'bubbles popping, playful cartoon'],
  ['Bonk', 'comedic bonk on the head, cartoon hit'],
  ['Zip away', 'cartoon character zooming away, whoosh'],
  ['Magic sparkle', 'magic wand sparkle chime, twinkle'],
  ['Squeak', 'rubber toy squeak, cartoon'],
  ['Poof', 'cartoon puff of smoke poof'],
  ['Footsteps', 'fast cartoon running footsteps'],
  ['Laser', 'retro sci-fi laser zap'],
  ['Door creak', 'spooky wooden door creaking'],
  ['Rain', 'gentle rain on a window, ambience'],
]

interface Clip {
  id: number
  prompt: string
  seconds: number
  seed: number
  url: string
  blob: Blob
  peaks: number[]
  ms: number
}

/** Downsample a channel to ~120 peak values for the waveform drawing. */
function peaksOf(data: Float32Array, buckets = 120) {
  const size = Math.max(1, Math.floor(data.length / buckets))
  return Array.from({ length: buckets }, (_, b) => {
    let m = 0
    for (let i = b * size; i < Math.min(data.length, (b + 1) * size); i++) m = Math.max(m, Math.abs(data[i]))
    return m
  })
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export default function SfxPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const task = useTask()
  const [prompt, setPrompt] = useState(PRESETS[0][1])
  const [seconds, setSeconds] = useState(3)
  const [seed, setSeed] = useState(newSeed)
  const [locked, setLocked] = useState(false)
  const [progress, setProgress] = useState<SfxEvent | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [playing, setPlaying] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const nextId = useRef(1)

  useEffect(() => () => clips.forEach((c) => URL.revokeObjectURL(c.url)), [clips])

  const generate = () =>
    task.go(async () => {
      const useSeed = locked ? seed : newSeed()
      setSeed(useSeed)
      setProgress(null)
      const t0 = performance.now()
      const out = await model.run<SfxOutput>('generate', { prompt: prompt.trim(), seconds, seed: useSeed } satisfies SfxInput, (p) => setProgress(p as SfxEvent))
      setProgress(null)
      const blob = encodeWavStereo(out.left, out.right, out.rate)
      const clip: Clip = { id: nextId.current++, prompt: prompt.trim(), seconds, seed: useSeed, url: URL.createObjectURL(blob), blob, peaks: peaksOf(out.left), ms: performance.now() - t0 }
      setClips((c) => [clip, ...c].slice(0, 20))
      play(clip)
    })

  const play = (c: Clip) => {
    const a = audioRef.current
    if (!a) return
    a.src = c.url
    void a.play()
    setPlaying(c.id)
  }

  const status = () => {
    if (!task.busy) return 'Generate sound'
    if (model.phase === 'downloading') return 'Loading model…'
    if (progress?.stage === 'step') return `Shaping sound ${progress.done + 1}/${progress.total}…`
    if (progress?.stage === 'decode') return 'Rendering audio…'
    return 'Preparing…'
  }

  const fileName = (c: Clip) => `${c.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sound'}-${c.seed}.wav`

  return (
    <ToolPage
      slug="sfx"
      model={model}
      error={task.error}
      info={{ name: 'Stable Audio Open Small (ONNX)', href: 'https://huggingface.co/atauser001/stable-audio-open-small-onnx', size: '~2.0 GB', task: 'text to sound effects · experimental' }}
    >
      <Notice tone="warn">
        <strong>Experimental &amp; heavy.</strong> The first load downloads about 2 GB (cached afterwards) and needs a desktop
        browser with plenty of free memory. Chrome or Edge with WebGPU is strongly recommended; on CPU each sound can take
        minutes.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <Panel kicker="Prompt" title="Describe the sound">
          <textarea aria-label="Sound description" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={cx(inputClass, 'text-[15px]')} placeholder="e.g. cartoon spring boing, short and bouncy" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map(([label, p]) => <Chip key={label} onClick={() => setPrompt(p)}>{label}</Chip>)}
          </div>
          <p className="mt-3 text-xs text-ink-3">Short, concrete prompts work best: what makes the sound, what it's doing, and a style word like "cartoon" or "retro". It's trained on sound effects and ambience, not speech or full songs.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Length" htmlFor="len" hint={`${seconds.toFixed(1)} s`}>
              <input id="len" type="range" min={0.5} max={MAX_SECONDS} step={0.5} value={seconds} onChange={(e) => setSeconds(+e.target.value)} className="w-full accent-[var(--accent)]" />
            </Field>
            <Field label="Seed" htmlFor="seed" hint={locked ? 'locked: same sound again' : 'new each time'}>
              <div className="flex gap-1.5">
                <input id="seed" inputMode="numeric" className={cx(inputClass, 'font-mono text-sm')} value={seed} onChange={(e) => { setSeed(Number(e.target.value.replace(/\D/g, '')) || 0); setLocked(true) }} />
                <Button size="sm" tone="ghost" aria-label={locked ? 'Unlock seed' : 'Lock seed'} onClick={() => setLocked((l) => !l)}>{locked ? <Lock size={15} /> : <Unlock size={15} />}</Button>
                <Button size="sm" tone="ghost" aria-label="Random seed" onClick={() => setSeed(newSeed())}><Dice5 size={15} /></Button>
              </div>
            </Field>
          </div>

          <Button className="mt-5" tone="primary" disabled={!prompt.trim() || task.busy} onClick={() => void generate()}>
            <Sparkles size={16} /> {status()}
          </Button>
          {task.busy && progress && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress.stage === 'decode' ? 95 : ((progress.done + 1) / (progress.total + 1)) * 90}%` }} />
            </div>
          )}
        </Panel>

        <Panel kicker="Library" title={clips.length ? `${clips.length} sound${clips.length > 1 ? 's' : ''}` : 'Your sounds'} actions={clips.length > 0 && <Button size="sm" tone="ghost" onClick={() => setClips([])}><Trash2 size={14} /> Clear</Button>}>
          <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
          <ul className="max-h-[540px] space-y-2 overflow-auto">
            {clips.map((c) => (
              <li key={c.id} className={cx('rounded-lg border p-3', playing === c.id ? 'border-accent' : 'border-rule')}>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => play(c)} aria-label={`Play ${c.prompt}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper hover:bg-accent hover:text-accent-ink">
                    <Play size={15} fill="currentColor" />
                  </button>
                  <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="h-8 min-w-0 flex-1" aria-hidden>
                    {c.peaks.map((p, i) => <rect key={i} x={i} y={16 - p * 15} width={0.7} height={Math.max(0.5, p * 30)} fill={playing === c.id ? 'var(--accent)' : 'var(--ink-3)'} />)}
                  </svg>
                  <Button size="sm" tone="ghost" aria-label="Download WAV" onClick={() => saveBlob(c.blob, fileName(c))}><Download size={15} /></Button>
                </div>
                <p className="mt-2 truncate text-sm">{c.prompt}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Tag>{c.seconds.toFixed(1)}s</Tag>
                  <Tag>seed {c.seed}</Tag>
                  <Tag tone="sea">{(c.ms / 1000).toFixed(1)}s to make</Tag>
                  <button type="button" onClick={() => { setPrompt(c.prompt); setSeed(c.seed); setSeconds(c.seconds); setLocked(true) }} className="font-mono text-[11px] text-ink-3 underline hover:text-accent">reuse</button>
                </p>
              </li>
            ))}
            {!clips.length && <li className="py-16 text-center text-sm text-ink-3">Generated sounds appear here. Lock a seed to tweak the prompt while keeping a sound's character.</li>}
          </ul>
        </Panel>
      </div>

      <p className="text-xs text-ink-3">
        Powered by Stability AI. Stable Audio Open Small is released under the Stability AI Community License: free for research,
        non-commercial use, and commercial use by individuals or organisations under US$1M annual revenue (registration
        requested). Output is 44.1 kHz stereo WAV.
      </p>
    </ToolPage>
  )
}
