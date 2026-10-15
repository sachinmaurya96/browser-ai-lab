import { useEffect, useRef, useState } from 'react'
import { Download, Layers, RefreshCw, Sparkles, X } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { formatBytes, prepareImage, saveBlob, stem, type PreparedImage } from '../../lib/images'
import { ModelCard } from '../../ui/ModelCard'
import { DropZone } from '../../ui/DropZone'
import { ToolIntro } from '../../ui/Shell'
import { Button, Field, Kicker, Notice, Panel, Segmented, cx } from '../../ui/kit'
import { Compare } from './Compare'
import { renderCutout, renderMask } from './matte'
import type { MatteInput } from './worker'

const SWATCHES = [
  { id: 'none', label: 'Transparent', fill: null },
  { id: 'white', label: 'White', fill: '#ffffff' },
  { id: 'black', label: 'Black', fill: '#111111' },
  { id: 'sand', label: 'Sand', fill: '#efe3cf' },
  { id: 'sky', label: 'Sky', fill: '#cfe6f5' },
] as const

type View = 'compare' | 'result' | 'mask'

export default function CutoutPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const [source, setSource] = useState<PreparedImage | null>(null)
  const [alpha, setAlpha] = useState<Uint8ClampedArray | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  const [fill, setFill] = useState<string | null>(null)
  const [custom, setCustom] = useState('#e8553a')
  const [floor, setFloor] = useState(0)
  const [view, setView] = useState<View>('compare')
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [maskUrl, setMaskUrl] = useState<string | null>(null)
  const runToken = useRef(0)

  // Revoke object URLs when they are replaced or the page unmounts.
  useEffect(() => () => void (source && URL.revokeObjectURL(source.url)), [source])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])
  useEffect(() => () => void (maskUrl && URL.revokeObjectURL(maskUrl)), [maskUrl])

  const process = async (img: PreparedImage) => {
    const token = ++runToken.current
    setBusy(true)
    setError(null)
    setAlpha(null)
    setResult(null)
    const t0 = performance.now()
    try {
      const input: MatteInput = { url: img.url, width: img.width, height: img.height }
      const a = await model.run<Uint8ClampedArray>('matte', input)
      if (token !== runToken.current) return
      setAlpha(a)
      setElapsed(performance.now() - t0)
      const m = await renderMask(a, img.width, img.height)
      setMaskUrl(URL.createObjectURL(m))
    } catch (e) {
      if (token === runToken.current) setError((e as Error).message)
    } finally {
      if (token === runToken.current) setBusy(false)
    }
  }

  // Re-render the composite whenever the matte or the export options change.
  useEffect(() => {
    if (!source || !alpha) return
    let live = true
    void renderCutout(source.url, alpha, source.width, source.height, { floor, fill }).then((blob) => {
      if (live) setResult({ blob, url: URL.createObjectURL(blob) })
    })
    return () => {
      live = false
    }
  }, [source, alpha, floor, fill])

  const onFile = async (file: File) => {
    try {
      const img = await prepareImage(file)
      setSource(img)
      setView('compare')
      void process(img)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const reset = () => {
    runToken.current++
    setSource(null)
    setAlpha(null)
    setResult(null)
    setMaskUrl(null)
    setBusy(false)
    setError(null)
  }

  const backdrop = (
    <div className={cx('size-full', !fill && 'checker')} style={fill ? { background: fill } : undefined} />
  )

  return (
    <div className="space-y-6">
      <ToolIntro slug="cutout" />
      <ModelCard
        model={model}
        info={{
          name: 'briaai/RMBG-1.4',
          href: 'https://huggingface.co/briaai/RMBG-1.4',
          size: '~170 MB',
          task: 'foreground matting',
          license: 'RMBG-1.4 is licensed for non-commercial use only.',
        }}
        autoNote="Loads automatically with your first image. "
      />

      {!source ? (
        <DropZone onFile={onFile} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Panel
            kicker={source.name}
            title={`${source.width} × ${source.height}px · ${formatBytes(source.bytes)}`}
            actions={
              <>
                <Segmented<View>
                  label="Preview"
                  value={view}
                  onChange={setView}
                  disabled={!result}
                  options={[
                    { value: 'compare', label: 'Compare' },
                    { value: 'result', label: 'Result' },
                    { value: 'mask', label: 'Mask' },
                  ]}
                />
                <Button size="sm" tone="ghost" onClick={reset} aria-label="Remove image">
                  <X size={16} />
                </Button>
              </>
            }
          >
            {busy || !result ? (
              <div className="relative mx-auto overflow-hidden rounded-lg" style={{ aspectRatio: `${source.width} / ${source.height}`, maxHeight: '70vh' }}>
                <img src={source.url} alt="Uploaded image" className="size-full object-contain opacity-60" />
                {busy && (
                  <>
                    <div className="scanline pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
                    <p className="absolute inset-x-0 bottom-3 text-center font-mono text-xs">
                      <span className="rounded bg-ink px-2 py-1 text-paper">
                        {model.phase === 'downloading' ? 'Fetching model…' : 'Segmenting subject…'}
                      </span>
                    </p>
                  </>
                )}
              </div>
            ) : view === 'compare' ? (
              <Compare before={source.url} after={result.url} width={source.width} height={source.height} backdrop={backdrop} />
            ) : (
              <div className="relative mx-auto overflow-hidden rounded-lg border border-rule" style={{ aspectRatio: `${source.width} / ${source.height}`, maxHeight: '70vh' }}>
                {view === 'result' && <div className="absolute inset-0">{backdrop}</div>}
                <img
                  src={view === 'mask' ? (maskUrl ?? '') : result.url}
                  alt={view === 'mask' ? 'Predicted foreground mask' : 'Result with background removed'}
                  className="relative size-full object-contain"
                />
              </div>
            )}
            {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
          </Panel>

          <div className="space-y-4">
            <Panel kicker="Export" title="Background">
              <div className="grid grid-cols-3 gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFill(s.fill)}
                    aria-pressed={fill === s.fill}
                    className={cx('flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px]', fill === s.fill ? 'border-ink' : 'border-rule hover:border-ink-3')}
                  >
                    <span className={cx('size-8 rounded border border-rule', !s.fill && 'checker')} style={s.fill ? { background: s.fill } : undefined} />
                    {s.label}
                  </button>
                ))}
                <label className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-[11px]', fill === custom ? 'border-ink' : 'border-rule hover:border-ink-3')}>
                  <input
                    type="color"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value)
                      setFill(e.target.value)
                    }}
                    className="size-8 cursor-pointer rounded border border-rule bg-transparent"
                  />
                  Custom
                </label>
              </div>

              <div className="mt-5">
                <Field label="Edge cleanup" htmlFor="floor" hint={floor === 0 ? 'soft' : `cut < ${floor}`}>
                  <input id="floor" type="range" min={0} max={160} step={8} value={floor} onChange={(e) => setFloor(+e.target.value)} className="w-full accent-[var(--accent)]" />
                </Field>
                <p className="mt-1 text-xs text-ink-3">Raise to drop faint halo pixels around the subject.</p>
              </div>
            </Panel>

            <Button tone="primary" className="w-full" disabled={!result} onClick={() => result && saveBlob(result.blob, `${stem(source.name)}-cutout.png`)}>
              <Download size={17} /> Download PNG
            </Button>
            <div className="flex gap-2">
              <Button size="sm" tone="outline" className="flex-1" disabled={busy} onClick={() => void process(source)}>
                <RefreshCw size={15} /> Re-run
              </Button>
              <Button size="sm" tone="outline" className="flex-1" onClick={reset}>
                <Layers size={15} /> New image
              </Button>
            </div>

            {elapsed !== null && alpha && (
              <div className="rounded-lg border border-dashed border-rule p-3">
                <Kicker>Run stats</Kicker>
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  <Sparkles size={14} className="text-accent" />
                  {(elapsed / 1000).toFixed(1)}s on {model.device === 'webgpu' ? 'WebGPU' : 'CPU'}
                  {result && <span className="text-ink-3">· {formatBytes(result.blob.size)} PNG</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
