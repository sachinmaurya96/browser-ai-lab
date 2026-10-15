import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { clock, decodeAudio } from '../../lib/audio'
import { saveBlob, stem } from '../../lib/images'
import { ToolPage } from '../../ui/ToolPage'
import { AudioInput } from '../../ui/AudioInput'
import { Button, CopyButton, Field, Panel, Segmented, inputClass } from '../../ui/kit'

interface Chunk {
  timestamp: [number, number | null]
  text: string
}

const LANGS = ['auto', 'english', 'hindi', 'spanish', 'french', 'german', 'portuguese', 'italian', 'russian', 'japanese', 'korean', 'chinese', 'arabic', 'turkish', 'dutch', 'polish', 'ukrainian', 'urdu', 'bengali', 'tamil', 'marathi', 'indonesian', 'vietnamese']

function stamp(s: number, sep: ',' | '.') {
  const ms = Math.round((s % 1) * 1000)
  const t = Math.floor(s)
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`
}

function subtitles(chunks: Chunk[], kind: 'srt' | 'vtt') {
  const body = chunks.map((c, i) => {
    const end = c.timestamp[1] ?? c.timestamp[0] + 3
    const line = `${stamp(c.timestamp[0], kind === 'srt' ? ',' : '.')} --> ${stamp(end, kind === 'srt' ? ',' : '.')}\n${c.text.trim()}\n`
    return kind === 'srt' ? `${i + 1}\n${line}` : line
  })
  return (kind === 'vtt' ? 'WEBVTT\n\n' : '') + body.join('\n')
}

export default function TranscribePage() {
  const { model, callWith } = usePipeline({
    task: 'automatic-speech-recognition',
    model: 'onnx-community/whisper-base',
    dtype: { webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, wasm: 'q8' },
  })
  const task = useTask()
  const [lang, setLang] = useState('auto')
  const [mode, setMode] = useState<'transcribe' | 'translate'>('transcribe')
  const [result, setResult] = useState<{ text: string; chunks: Chunk[]; name: string } | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl])

  const run = (blob: Blob, name: string) =>
    task.go(async () => {
      setResult(null)
      setAudioUrl(URL.createObjectURL(blob))
      const t0 = performance.now()
      const pcm = await decodeAudio(blob)
      const out = await callWith<{ text: string; chunks?: Chunk[] }>([pcm], {
        language: lang === 'auto' ? null : lang,
        task: mode,
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      })
      setElapsed((performance.now() - t0) / 1000)
      setResult({ text: out.text.trim(), chunks: out.chunks ?? [], name })
    })

  const base = stem(result?.name ?? 'transcript')
  return (
    <ToolPage slug="transcribe" model={model} error={task.error} info={{ name: 'onnx-community/whisper-base', href: 'https://huggingface.co/onnx-community/whisper-base', size: '~200 MB', task: 'speech recognition' }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel kicker="Audio" title="Record or upload">
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <Field label="Spoken language" htmlFor="lang">
              <select id="lang" className={inputClass} value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGS.map((l) => <option key={l} value={l}>{l === 'auto' ? 'Detect automatically' : l[0].toUpperCase() + l.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Output" htmlFor="mode">
              <div id="mode"><Segmented label="Output" value={mode} onChange={setMode} options={[{ value: 'transcribe', label: 'Same language' }, { value: 'translate', label: 'English' }]} /></div>
            </Field>
          </div>
          <AudioInput disabled={task.busy} onAudio={(b, n) => void run(b, n)} />
          {audioUrl && <audio controls src={audioUrl} className="mt-4 w-full" />}
        </Panel>
        <Panel
          kicker="Transcript"
          title={task.busy ? 'Transcribing…' : result ? `Done in ${elapsed.toFixed(1)}s` : 'Text appears here'}
          actions={result && (
            <>
              <CopyButton text={result.text} />
              <Button size="sm" tone="ghost" onClick={() => saveBlob(new Blob([result.text]), `${base}.txt`)}><Download size={14} />TXT</Button>
              <Button size="sm" tone="ghost" onClick={() => saveBlob(new Blob([subtitles(result.chunks, 'srt')]), `${base}.srt`)}>SRT</Button>
              <Button size="sm" tone="ghost" onClick={() => saveBlob(new Blob([subtitles(result.chunks, 'vtt')]), `${base}.vtt`)}>VTT</Button>
            </>
          )}
        >
          {!result ? (
            <p className="py-16 text-center text-sm text-ink-3">{task.busy ? 'Listening through the audio. Long files take a while.' : 'Meeting notes, lectures, voice memos, interviews and video subtitles. Export as plain text or SRT/VTT subtitle files.'}</p>
          ) : (
            <ol className="max-h-[520px] space-y-1 overflow-auto">
              {result.chunks.map((c, i) => (
                <li key={i} className="flex gap-3 rounded px-2 py-1 hover:bg-paper-2">
                  <span className="shrink-0 pt-0.5 font-mono text-xs text-accent">{clock(c.timestamp[0])}</span>
                  <span>{c.text.trim()}</span>
                </li>
              ))}
              {!result.chunks.length && <li className="whitespace-pre-wrap">{result.text}</li>}
            </ol>
          )}
        </Panel>
      </div>
    </ToolPage>
  )
}
