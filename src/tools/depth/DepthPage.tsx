import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { canvasBlob, imageToCanvas, type PlainImage } from '../../lib/rawImage'
import { saveBlob, stem } from '../../lib/images'
import { ImageInput, ToolPage, useImage } from '../../ui/ToolPage'
import { Button, Panel, Segmented } from '../../ui/kit'

type Palette = 'gray' | 'heat' | 'ocean'

// Simple gradient maps from 0 (far) to 255 (near).
const PALETTES: Record<Palette, (v: number) => [number, number, number]> = {
  gray: (v) => [v, v, v],
  heat: (v) => [Math.min(255, v * 2), Math.max(0, v * 2 - 255) * 0.9 + v * 0.2, Math.max(0, 128 - v)],
  ocean: (v) => [v * 0.2, v * 0.75, 90 + v * 0.65],
}

export default function DepthPage() {
  const { model, call } = usePipeline({ task: 'depth-estimation', model: 'onnx-community/depth-anything-v2-small', dtype: { webgpu: 'fp32', wasm: 'q8' } })
  const img = useImage(1024)
  const task = useTask()
  const [depth, setDepth] = useState<PlainImage | null>(null)
  const [palette, setPalette] = useState<Palette>('heat')
  const [out, setOut] = useState<{ url: string; blob: Blob } | null>(null)

  useEffect(() => {
    if (!depth) return setOut(null)
    let live = true
    void canvasBlob(imageToCanvas(depth, PALETTES[palette])).then((blob) => live && setOut({ blob, url: URL.createObjectURL(blob) }))
    return () => {
      live = false
    }
  }, [depth, palette])
  useEffect(() => () => void (out && URL.revokeObjectURL(out.url)), [out])

  const run = (url: string) =>
    task.go(async () => {
      setDepth(null)
      const res = await call<{ depth: PlainImage }>(url)
      setDepth(res.depth)
    })

  return (
    <ToolPage slug="depth" model={model} error={task.error ?? img.error} info={{ name: 'onnx-community/depth-anything-v2-small', href: 'https://huggingface.co/onnx-community/depth-anything-v2-small', size: '~27 MB', task: 'depth estimation' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Photo" title="Any scene">
          <ImageInput image={img.image} onClear={() => { img.clear(); setDepth(null) }} onFile={async (f) => { const i = await img.pick(f); if (i) void run(i.url) }} />
        </Panel>
        <Panel kicker="Depth map" title={task.busy ? 'Estimating depth…' : 'Near is bright, far is dark'} actions={<Segmented label="Palette" value={palette} onChange={setPalette} options={[{ value: 'heat', label: 'Heat' }, { value: 'ocean', label: 'Ocean' }, { value: 'gray', label: 'Gray' }]} />}>
          {out ? <img src={out.url} alt="Depth map" className="mx-auto max-h-[460px] rounded-lg object-contain" /> : <div className="paper-grid grid h-64 place-items-center rounded-lg border border-dashed border-rule text-sm text-ink-3">{task.busy ? 'Working…' : 'Result appears here'}</div>}
          <Button className="mt-4" tone="primary" disabled={!out} onClick={() => out && saveBlob(out.blob, `${stem(img.image?.name ?? 'image')}-depth.png`)}>
            <Download size={16} /> Download
          </Button>
          <p className="mt-3 text-xs text-ink-3">Handy for 3D/parallax effects, portrait blur masks, or game and VFX workflows.</p>
        </Panel>
      </div>
    </ToolPage>
  )
}
