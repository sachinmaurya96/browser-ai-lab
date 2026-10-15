import { useEffect, useMemo, useState } from 'react'
import { Download, Mic2, Play, Sparkles } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { useTask } from '../../lib/hooks'
import { encodeWav } from '../../lib/audio'
import { saveBlob } from '../../lib/images'
import { ToolPage } from '../../ui/ToolPage'
import { Button, Chip, Field, Panel, Segmented, Tag, cx, inputClass } from '../../ui/kit'
import type { SpeakInput, SpeakOutput, Voice } from './worker'
import type { PiperEvent, PiperInput } from './piper.worker'
import { PIPER_VOICES } from './piperVoices'

type Engine = 'kokoro' | 'piper'

interface StudioVoice extends Voice {
  engine: Engine
  /** Short note shown on the card. */
  badge?: string
}

const HINDI_SAMPLES = [
  'नमस्ते! मैं आपकी अपनी आवाज़ हूँ, जो पूरी तरह आपके ब्राउज़र में बनी है। कोई डेटा सर्वर पर नहीं जाता।',
  'एक बार की बात है, एक छोटे से गाँव में एक बूढ़ा किसान रहता था। उसके पास एक सुनहरी मुर्गी थी।',
  'आज का मौसम बहुत सुहाना है। शाम को हल्की बारिश होने की संभावना है, इसलिए छाता साथ रखें।',
]

const SAMPLES = [
  'Welcome to Voice Studio. Every word you hear was generated right here in your browser, without sending anything to a server.',
  'Once upon a time, in a quiet village by the sea, there lived a lighthouse keeper who collected stories from passing ships.',
  'Thanks for calling. Our office hours are Monday to Friday, nine to five. Please leave a message after the tone.',
]

const PIPER: StudioVoice[] = PIPER_VOICES.map((v) => ({ id: v.id, name: v.name, language: 'hi', gender: v.gender, grade: 'native', engine: 'piper', badge: 'Hindi-native' }))

// Kokoro voices shown until the model reports its full list.
const KOKORO_FALLBACK: StudioVoice[] = [
  { id: 'hf_alpha', name: 'Aarohi', language: 'hi', gender: 'Female', grade: 'C', engine: 'kokoro', badge: 'Alpha' },
  { id: 'hf_beta', name: 'Meera', language: 'hi', gender: 'Female', grade: 'C', engine: 'kokoro', badge: 'Beta' },
  { id: 'hm_omega', name: 'Vikram', language: 'hi', gender: 'Male', grade: 'C', engine: 'kokoro', badge: 'Omega' },
  { id: 'hm_psi', name: 'Arjun', language: 'hi', gender: 'Male', grade: 'C', engine: 'kokoro', badge: 'Psi' },
  { id: 'af_heart', name: 'Heart', language: 'en-us', gender: 'Female', grade: 'A', engine: 'kokoro' },
  { id: 'af_bella', name: 'Bella', language: 'en-us', gender: 'Female', grade: 'A-', engine: 'kokoro' },
  { id: 'am_michael', name: 'Michael', language: 'en-us', gender: 'Male', grade: 'C+', engine: 'kokoro' },
  { id: 'bf_emma', name: 'Emma', language: 'en-gb', gender: 'Female', grade: 'B-', engine: 'kokoro' },
  { id: 'bm_george', name: 'George', language: 'en-gb', gender: 'Male', grade: 'C', engine: 'kokoro' },
]

const KOKORO_HINDI_BADGE: Record<string, string> = { hf_alpha: 'Alpha', hf_beta: 'Beta', hm_omega: 'Omega', hm_psi: 'Psi' }

type Accent = 'all' | 'hi' | 'en-us' | 'en-gb'
type Progress = { stage: 'download' | 'speak'; done: number; total: number }

export default function KokoroPage() {
  const kokoro = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const piper = useModel(() => new Worker(new URL('./piper.worker.ts', import.meta.url), { type: 'module' }))
  const task = useTask()
  const [kokoroVoices, setKokoroVoices] = useState<StudioVoice[]>(KOKORO_FALLBACK)
  const [voice, setVoice] = useState('piper:priyamvada')
  const [accent, setAccent] = useState<Accent>('hi')
  const [speed, setSpeed] = useState(0.95)
  const [expressive, setExpressive] = useState(0.5)
  const [text, setText] = useState(HINDI_SAMPLES[0])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [audio, setAudio] = useState<{ url: string; blob: Blob; secs: number; voice: string } | null>(null)

  useEffect(() => () => void (audio && URL.revokeObjectURL(audio.url)), [audio])

  // Swap in Kokoro's full voice list once it has loaded.
  useEffect(() => {
    if (kokoro.phase !== 'ready') return
    void kokoro
      .run<Voice[]>('voices', null)
      .then((v) => v.length && setKokoroVoices(v.map((x) => ({ ...x, engine: 'kokoro' as const, badge: KOKORO_HINDI_BADGE[x.id] }))))
      .catch(() => undefined)
  }, [kokoro.phase, kokoro.run])

  const all = useMemo(() => [...PIPER, ...kokoroVoices], [kokoroVoices])
  const shown = all.filter((v) => accent === 'all' || v.language === accent)
  const current = all.find((v) => v.id === voice)
  const engine: Engine = current?.engine ?? 'kokoro'
  const model = engine === 'piper' ? piper : kokoro

  const speak = () =>
    task.go(async () => {
      setAudio(null)
      setProgress(null)
      const onEmit = (p: unknown) => setProgress(engine === 'piper' ? (p as PiperEvent) : { stage: 'speak', ...(p as { done: number; total: number }) })
      const out =
        engine === 'piper'
          ? await piper.run<SpeakOutput>('speak', { text: text.trim(), voice, speed, expressiveness: expressive } satisfies PiperInput, onEmit)
          : await kokoro.run<SpeakOutput>('speak', { text: text.trim(), voice, speed } satisfies SpeakInput, onEmit)
      setProgress(null)
      const blob = encodeWav(out.audio, out.rate)
      setAudio({ blob, url: URL.createObjectURL(blob), secs: out.audio.length / out.rate, voice })
    })

  const status = () => {
    if (!task.busy) return `Generate with ${current?.name ?? voice}`
    if (progress?.stage === 'download') return progress.total ? `Downloading voice ${Math.round((progress.done / progress.total) * 100)}%…` : 'Downloading voice…'
    if (progress) return `Speaking ${progress.done + 1}/${progress.total}…`
    return model.phase === 'downloading' ? 'Loading model…' : 'Starting…'
  }

  return (
    <ToolPage
      slug="voice-studio"
      model={model}
      error={task.error}
      info={
        engine === 'piper'
          ? { name: 'rhasspy/piper-voices · hi_IN', href: 'https://huggingface.co/rhasspy/piper-voices/tree/main/hi/hi_IN', size: '~63 MB per voice', task: 'Hindi-native text to speech' }
          : { name: 'onnx-community/Kokoro-82M-v1.0-ONNX', href: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX', size: '~90–330 MB', task: 'natural text to speech · Apache-2.0' }
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel kicker="Script" title="What should the voice say?" actions={<span className="font-mono text-xs text-ink-3">{text.length} chars · ~{Math.max(1, Math.round(text.split(/\s+/).length / 2.6 / speed))}s</span>}>
          <textarea aria-label="Script" rows={10} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'leading-relaxed')} />
          <div className="mt-3 flex flex-wrap gap-2">
            {HINDI_SAMPLES.map((s, i) => <Chip key={`hi${i}`} onClick={() => { setText(s); if (current?.language !== 'hi') setVoice('piper:priyamvada') }}>{['परिचय', 'कहानी', 'मौसम'][i]}</Chip>)}
            {SAMPLES.map((s, i) => <Chip key={i} onClick={() => { setText(s); if (current?.language === 'hi') setVoice('af_heart') }}>{['Intro', 'Story', 'Voicemail'][i]}</Chip>)}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Speed" htmlFor="spd" hint={`${speed.toFixed(2)}×`}>
              <input id="spd" type="range" min={0.6} max={1.5} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-full accent-[var(--accent)]" />
            </Field>
            {engine === 'piper' && (
              <Field label="Delivery" htmlFor="expr" hint={expressive < 0.35 ? 'crisp & steady' : expressive > 0.65 ? 'expressive' : 'balanced'}>
                <input id="expr" type="range" min={0} max={1} step={0.05} value={expressive} onChange={(e) => setExpressive(+e.target.value)} className="w-full accent-[var(--accent)]" />
              </Field>
            )}
          </div>
          <Button className="mt-5" tone="primary" disabled={!text.trim() || task.busy} onClick={() => void speak()}>
            <Mic2 size={16} /> {status()}
          </Button>
          {audio && (
            <div className="mt-6 rounded-xl border border-ink bg-paper p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{all.find((v) => v.id === audio.voice)?.name} · {audio.secs.toFixed(1)}s</span>
                <Button size="sm" tone="ghost" onClick={() => saveBlob(audio.blob, `voice-${audio.voice.replace(':', '-')}.wav`)}><Download size={14} /> WAV</Button>
              </div>
              <audio controls autoPlay src={audio.url} className="w-full" />
            </div>
          )}
        </Panel>

        <Panel kicker="Voices" title={`${shown.length} voices`} actions={<Segmented label="Language" value={accent} onChange={setAccent} options={[{ value: 'hi', label: 'हिंदी' }, { value: 'en-us', label: 'US' }, { value: 'en-gb', label: 'UK' }, { value: 'all', label: 'All' }]} />}>
          {accent !== 'en-us' && accent !== 'en-gb' && (
            <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-sea-soft p-2 text-xs text-ink">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-sea" />
              <span><strong>Hindi-native</strong> voices were trained only on Hindi and are the clearest (non-commercial licence). Kokoro's Hindi voices (Alpha, Beta, Omega, Psi) are now driven by full espeak-ng Hindi pronunciation.</span>
            </p>
          )}
          <ul className="grid max-h-[520px] grid-cols-2 gap-2 overflow-auto pr-1">
            {shown.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setVoice(v.id)} aria-pressed={voice === v.id} className={cx('flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors', voice === v.id ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink-3')}>
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold', voice === v.id ? 'bg-accent text-accent-ink' : v.engine === 'piper' ? 'bg-sea-soft text-sea' : 'bg-paper-2')}>{v.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{v.name}</span>
                    <span className={cx('block truncate font-mono text-[10px]', voice === v.id ? 'text-paper/60' : 'text-ink-3')}>
                      {v.language === 'en-gb' ? 'UK' : v.language === 'en-us' ? 'US' : 'हिंदी'} · {v.gender}{v.badge ? ` · ${v.badge}` : ''}
                    </span>
                  </span>
                  {voice === v.id ? <Play size={13} /> : v.engine === 'piper' ? <Tag tone="sea">clear</Tag> : v.grade.startsWith('A') || v.grade.startsWith('B') ? <Tag tone="sea">{v.grade}</Tag> : null}
                </button>
              </li>
            ))}
          </ul>
          {current?.language === 'hi' && <p className="mt-3 rounded-lg bg-sun-soft p-2 text-xs text-ink">Write in Devanagari (हिंदी). English words mixed in are fine. Numbers read best as words (पाँच सौ).</p>}
        </Panel>
      </div>
      <p className="text-xs text-ink-3">
        Licences: Kokoro voices (including Alpha, Beta, Omega, Psi) are Apache-2.0, so they're fine for commercial work. The Hindi-native voices (Priyamvada, Pratham, Rohan) come from
        non-commercial datasets (CC BY-NC-SA 4.0 / IIT Madras IndicTTS), so use them for personal, learning or non-commercial projects only. Voices download once, then work offline.
      </p>
    </ToolPage>
  )
}
