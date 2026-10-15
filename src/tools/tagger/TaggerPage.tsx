import { useState } from 'react'
import { Tags } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ImageInput, ToolPage, useImage } from '../../ui/ToolPage'
import { Button, Chip, CopyButton, Field, Panel, inputClass } from '../../ui/kit'

const PRESETS: Record<string, string> = {
  'Photo type': 'portrait, landscape, food, pet, document, screenshot, product, selfie, group photo, night scene',
  Mood: 'happy, calm, dramatic, gloomy, romantic, energetic, cozy',
  'Is it safe?': 'safe for work, violent, explicit, disturbing',
  Season: 'spring, summer, autumn, winter',
}

export default function TaggerPage() {
  const { model, callWith } = usePipeline({ task: 'zero-shot-image-classification', model: 'Xenova/clip-vit-base-patch32', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const img = useImage(768)
  const task = useTask()
  const [labels, setLabels] = useState(PRESETS['Photo type'])
  const [scores, setScores] = useState<{ label: string; score: number }[]>([])

  const list = labels.split(',').map((s) => s.trim()).filter(Boolean)
  const run = (url: string) =>
    task.go(async () => {
      if (list.length < 2) throw new Error('Enter at least two labels, separated by commas.')
      setScores(await callWith<{ label: string; score: number }[]>([url, list], { hypothesis_template: 'a photo of {}' }))
    })

  return (
    <ToolPage slug="tagger" model={model} error={task.error ?? img.error} info={{ name: 'Xenova/clip-vit-base-patch32', href: 'https://huggingface.co/Xenova/clip-vit-base-patch32', size: '~90 MB', task: 'zero-shot image classification' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Image" title="Photo to tag">
          <ImageInput image={img.image} onClear={() => { img.clear(); setScores([]) }} onFile={async (f) => { const i = await img.pick(f); if (i) void run(i.url) }} />
        </Panel>
        <Panel kicker="Labels" title="Your categories, any words you like" actions={<CopyButton text={scores.slice(0, 3).map((s) => s.label).join(', ')} label="Top 3" />}>
          <Field label="Candidate labels" htmlFor="labels" hint="comma separated">
            <textarea id="labels" rows={3} className={inputClass} value={labels} onChange={(e) => setLabels(e.target.value)} />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([k, v]) => <Chip key={k} onClick={() => setLabels(v)}>{k}</Chip>)}
          </div>
          <Button className="mt-4" tone="primary" disabled={!img.image || task.busy} onClick={() => img.image && void run(img.image.url)}>
            <Tags size={16} /> {task.busy ? 'Tagging…' : 'Tag image'}
          </Button>
          <ul className="mt-5 space-y-2">
            {scores.map((s) => (
              <li key={s.label}>
                <div className="flex justify-between text-sm"><span>{s.label}</span><span className="font-mono">{(s.score * 100).toFixed(1)}%</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-paper-2"><div className="h-full rounded-full bg-accent" style={{ width: `${s.score * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
