import { useEffect, useState } from 'react'
import { usePipeline, useTask } from '../../lib/hooks'
import { decodeAudio } from '../../lib/audio'
import { ToolPage } from '../../ui/ToolPage'
import { AudioInput } from '../../ui/AudioInput'
import { Panel } from '../../ui/kit'

export default function SoundsPage() {
  const { model, callWith } = usePipeline({ task: 'audio-classification', model: 'Xenova/ast-finetuned-audioset-10-10-0.4593', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const task = useTask()
  const [labels, setLabels] = useState<{ label: string; score: number }[]>([])
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const run = (blob: Blob) =>
    task.go(async () => {
      setLabels([])
      setUrl(URL.createObjectURL(blob))
      // The model looks at ~10 s windows; the first 10 s is enough for a label.
      const pcm = (await decodeAudio(blob)).slice(0, 16000 * 10)
      setLabels(await callWith<{ label: string; score: number }[]>([pcm], { top_k: 8 }))
    })

  return (
    <ToolPage slug="sounds" model={model} error={task.error} info={{ name: 'Xenova/ast-finetuned-audioset', href: 'https://huggingface.co/Xenova/ast-finetuned-audioset-10-10-0.4593', size: '~90 MB', task: 'audio classification' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Audio" title="What's that sound?">
          <AudioInput disabled={task.busy} onAudio={(b) => void run(b)} />
          {url && <audio controls src={url} className="mt-4 w-full" />}
        </Panel>
        <Panel kicker="Result" title={task.busy ? 'Listening…' : 'Top matches from 527 sound types'}>
          {labels.length ? (
            <ul className="space-y-3">
              {labels.map((l, i) => (
                <li key={l.label}>
                  <div className="flex justify-between text-sm"><span className={i === 0 ? 'font-semibold' : ''}>{l.label}</span><span className="font-mono">{(l.score * 100).toFixed(1)}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-paper-2"><div className="h-full rounded-full bg-sea" style={{ width: `${Math.min(100, l.score * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-12 text-center text-sm text-ink-3">Animals, instruments, vehicles, alarms, speech, music genres… Uses the first 10 seconds of audio.</p>
          )}
        </Panel>
      </div>
    </ToolPage>
  )
}
