import { useEffect, useState } from 'react'
import { Download, Maximize2 } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { canvasBlob, imageToCanvas, type PlainImage } from '../../lib/rawImage'
import { formatBytes, saveBlob, stem } from '../../lib/images'
import { ImageInput, ToolPage, useImage } from '../../ui/ToolPage'
import { Button, Notice, Panel, Segmented } from '../../ui/kit'
import { Compare } from '../cutout/Compare'

// The model is heavy per pixel; cap input so it finishes in reasonable time.
const MAX_INPUT = 640

export default function UpscalePage() {
  const { model, call } = usePipeline({ task: 'image-to-image', model: 'Xenova/swin2SR-classical-sr-x2-64', dtype: { webgpu: 'fp32', wasm: 'fp32' } })
  const img = useImage(MAX_INPUT)
  const task = useTask()
  const [out, setOut] = useState<{ url: string; blob: Blob; w: number; h: number } | null>(null)
  const [view, setView] = useState<'compare' | 'result'>('compare')

  useEffect(() => () => void (out && URL.revokeObjectURL(out.url)), [out])

  const run = (url: string) =>
    task.go(async () => {
      setOut(null)
      const res = await call<PlainImage>(url)
      const blob = await canvasBlob(imageToCanvas(res))
      setOut({ url: URL.createObjectURL(blob), blob, w: res.width, h: res.height })
    })

  return (
    <ToolPage slug="upscale" model={model} error={task.error ?? img.error} info={{ name: 'Xenova/swin2SR-classical-sr-x2-64', href: 'https://huggingface.co/Xenova/swin2SR-classical-sr-x2-64', size: '~55 MB', task: 'super-resolution 2×' }}>
      <Notice tone="info">Doubles width and height with sharper detail than normal resizing. Inputs are capped at {MAX_INPUT}px per side so they finish in seconds, not minutes.</Notice>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel kicker="Image" title={out ? `${img.image?.width}×${img.image?.height} → ${out.w}×${out.h}` : task.busy ? 'Upscaling… (this can take a while on CPU)' : 'Pick a small or blurry image'} actions={out && <Segmented label="View" value={view} onChange={setView} options={[{ value: 'compare', label: 'Compare' }, { value: 'result', label: 'Result' }]} />}>
          <ImageInput image={img.image} onClear={() => { img.clear(); setOut(null) }} onFile={async (f) => { const i = await img.pick(f); if (i) void run(i.url) }}>
            {img.image && out ? (
              view === 'compare' ? <Compare before={img.image.url} after={out.url} width={out.w} height={out.h} backdrop={<div className="size-full bg-paper-2" />} /> : <img src={out.url} alt="Upscaled" className="mx-auto max-h-[560px] object-contain" />
            ) : img.image ? (
              <img src={img.image.url} alt="Original" className={`mx-auto max-h-[460px] object-contain ${task.busy ? 'animate-pulse' : ''}`} />
            ) : undefined}
          </ImageInput>
        </Panel>
        <div className="space-y-3">
          <Button tone="primary" className="w-full" disabled={!out} onClick={() => out && saveBlob(out.blob, `${stem(img.image?.name ?? 'image')}-2x.png`)}>
            <Download size={16} /> Download 2× PNG
          </Button>
          <Button tone="outline" className="w-full" disabled={!img.image || task.busy} onClick={() => img.image && void run(img.image.url)}>
            <Maximize2 size={16} /> Run again
          </Button>
          {out && <p className="text-center font-mono text-xs text-ink-3">{formatBytes(out.blob.size)}</p>}
        </div>
      </div>
    </ToolPage>
  )
}
