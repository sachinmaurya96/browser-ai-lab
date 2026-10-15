import { useMemo, useState } from 'react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ImageInput, ToolPage, useImage } from '../../ui/ToolPage'
import { CopyButton, Field, Panel, Tag } from '../../ui/kit'

interface Detection {
  label: string
  score: number
  box: { xmin: number; ymin: number; xmax: number; ymax: number }
}

const COLORS = ['#e8553a', '#1f7a6d', '#c98a12', '#5b5bd6', '#d6336c', '#0c8599']

export default function ObjectsPage() {
  const { model, callWith } = usePipeline({ task: 'object-detection', model: 'Xenova/detr-resnet-50', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const img = useImage(1280)
  const task = useTask()
  const [found, setFound] = useState<Detection[]>([])
  const [threshold, setThreshold] = useState(0.8)

  const detect = (url: string) =>
    task.go(async () => {
      setFound([])
      // Ask for everything above 0.5 once; the slider then filters locally.
      setFound(await callWith<Detection[]>([url], { threshold: 0.5, percentage: true }))
    })

  const shown = found.filter((d) => d.score >= threshold)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    shown.forEach((d) => m.set(d.label, (m.get(d.label) ?? 0) + 1))
    return [...m].sort((a, b) => b[1] - a[1])
  }, [shown])
  const color = (label: string) => COLORS[[...label].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length]

  return (
    <ToolPage slug="objects" model={model} error={task.error ?? img.error} info={{ name: 'Xenova/detr-resnet-50', href: 'https://huggingface.co/Xenova/detr-resnet-50', size: '~45 MB', task: 'object detection' }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel kicker="Image" title={task.busy ? 'Detecting…' : img.image ? `${shown.length} objects` : 'Pick a photo'}>
          <ImageInput image={img.image} onClear={() => { img.clear(); setFound([]) }} onFile={async (f) => { const i = await img.pick(f); if (i) void detect(i.url) }}>
            {img.image && (
              <div className="relative mx-auto w-fit">
                <img src={img.image.url} alt="Analysed photo" className="max-h-[520px] object-contain" />
                {shown.map((d, i) => (
                  <div key={i} className="absolute border-2" style={{ borderColor: color(d.label), left: `${d.box.xmin * 100}%`, top: `${d.box.ymin * 100}%`, width: `${(d.box.xmax - d.box.xmin) * 100}%`, height: `${(d.box.ymax - d.box.ymin) * 100}%` }}>
                    <span className="absolute -top-5 left-0 px-1 font-mono text-[10px] whitespace-nowrap text-white" style={{ background: color(d.label) }}>
                      {d.label} {Math.round(d.score * 100)}%
                    </span>
                  </div>
                ))}
                {task.busy && <div className="scanline absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />}
              </div>
            )}
          </ImageInput>
        </Panel>
        <Panel kicker="Results" title="Inventory" actions={<CopyButton text={counts.map(([l, n]) => `${l}: ${n}`).join('\n')} />}>
          <Field label="Confidence" htmlFor="th" hint={`≥ ${Math.round(threshold * 100)}%`}>
            <input id="th" type="range" min={0.5} max={0.99} step={0.01} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full accent-[var(--accent)]" />
          </Field>
          <ul className="mt-4 space-y-2">
            {counts.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between rounded-lg border border-rule px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: color(label) }} />{label}</span>
                <Tag>{n}</Tag>
              </li>
            ))}
            {!counts.length && <li className="text-sm text-ink-3">Detects 90 everyday object types: people, vehicles, animals, furniture, food…</li>}
          </ul>
        </Panel>
      </div>
    </ToolPage>
  )
}
