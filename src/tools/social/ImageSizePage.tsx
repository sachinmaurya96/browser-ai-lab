import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import { Download } from 'lucide-react'
import { PlainToolPage, FileDrop } from '../../ui/PdfKit'
import { loadImageElement, saveBlob, stem } from '../../lib/images'
import { Button, Field, Panel, cx } from '../../ui/kit'

const PRESETS = [
  { id: 'li-post', label: 'LinkedIn post', w: 1200, h: 627 },
  { id: 'li-square', label: 'LinkedIn square', w: 1200, h: 1200 },
  { id: 'li-banner', label: 'LinkedIn banner', w: 1584, h: 396 },
  { id: 'ig-square', label: 'Instagram square', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'Instagram portrait', w: 1080, h: 1350 },
  { id: 'story', label: 'Story / Reel', w: 1080, h: 1920 },
  { id: 'x-post', label: 'X post', w: 1600, h: 900 },
  { id: 'x-header', label: 'X header', w: 1500, h: 500 },
  { id: 'yt-thumb', label: 'YouTube thumbnail', w: 1280, h: 720 },
  { id: 'og', label: 'Link preview (OG)', w: 1200, h: 630 },
] as const
type Preset = (typeof PRESETS)[number]

/** Render the image into the preset size: cover-crop with a focal point, or contain with a fill. */
function render(img: HTMLImageElement, p: Preset, focus: { x: number; y: number }, fit: 'cover' | 'contain', fill: string) {
  const c = document.createElement('canvas')
  c.width = p.w
  c.height = p.h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, p.w, p.h)
  const scale = fit === 'cover' ? Math.max(p.w / img.width, p.h / img.height) : Math.min(p.w / img.width, p.h / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const x = fit === 'cover' ? (p.w - w) * focus.x : (p.w - w) / 2
  const y = fit === 'cover' ? (p.h - h) * focus.y : (p.h - h) / 2
  ctx.drawImage(img, x, y, w, h)
  return c
}

export default function ImageSizePage() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [preset, setPreset] = useState<Preset>(PRESETS[0])
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 })
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')
  const [fill, setFill] = useState('#ffffff')
  const [preview, setPreview] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set(['li-post']))
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    void loadImageElement(url).then(setImg)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (img) setPreview(render(img, preset, focus, fit, fill).toDataURL('image/jpeg', 0.85))
  }, [img, preset, focus, fit, fill])

  const drag = (e: React.PointerEvent) => {
    if (!e.buttons && e.type !== 'pointerdown') return
    const r = box.current!.getBoundingClientRect()
    setFocus({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) })
  }

  const blobOf = (p: Preset) => new Promise<Blob>((res) => render(img!, p, focus, fit, fill).toBlob((b) => res(b!), 'image/jpeg', 0.92))

  const downloadAll = async () => {
    const list = PRESETS.filter((p) => picked.has(p.id))
    if (list.length === 1) return saveBlob(await blobOf(list[0]), `${stem(file!.name)}-${list[0].id}.jpg`)
    const zip = new JSZip()
    for (const p of list) zip.file(`${stem(file!.name)}-${p.id}-${p.w}x${p.h}.jpg`, await blobOf(p))
    saveBlob(await zip.generateAsync({ type: 'blob' }), `${stem(file!.name)}-social.zip`)
  }

  return (
    <PlainToolPage slug="social-image">
      {!img || !file ? (
        <FileDrop accept="image/*" label="Drop a photo or graphic" onFiles={(f) => f[0] && setFile(f[0])} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Panel kicker={`${preset.w} × ${preset.h}`} title={preset.label} actions={<Button size="sm" tone="ghost" onClick={() => { setFile(null); setImg(null) }}>Change image</Button>}>
            {preview && <img src={preview} alt="Resized preview" className="mx-auto max-h-[460px] rounded-lg border border-rule" />}
            {fit === 'cover' && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">Drag to choose what stays in frame</p>
                <div ref={box} onPointerDown={drag} onPointerMove={drag} className="relative mx-auto w-fit cursor-crosshair touch-none select-none">
                  <img src={img.src} alt="Original" className="max-h-48 rounded" draggable={false} />
                  <span className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} />
                </div>
              </div>
            )}
          </Panel>
          <Panel kicker="Sizes" title="Pick one to preview · tick to export">
            <ul className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <li key={p.id} className={cx('flex items-center gap-2 rounded-lg border p-2 text-sm', preset.id === p.id ? 'border-ink' : 'border-rule')}>
                  <input type="checkbox" aria-label={`Export ${p.label}`} checked={picked.has(p.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })} className="accent-[var(--accent)]" />
                  <button type="button" onClick={() => setPreset(p)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-medium">{p.label}</span>
                    <span className="font-mono text-[10px] text-ink-3">{p.w}×{p.h}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <Field label="Fit" htmlFor="fit">
                <select id="fit" value={fit} onChange={(e) => setFit(e.target.value as 'cover' | 'contain')} className="rounded-lg border border-rule bg-paper px-3 py-2 text-sm">
                  <option value="cover">Fill frame (crop)</option>
                  <option value="contain">Fit whole image</option>
                </select>
              </Field>
              {fit === 'contain' && <label className="text-sm">Background <input type="color" value={fill} onChange={(e) => setFill(e.target.value)} className="ml-1 h-8 w-10 rounded border border-rule align-middle" /></label>}
            </div>
            <Button className="mt-5 w-full" tone="primary" disabled={!picked.size} onClick={() => void downloadAll()}>
              <Download size={16} /> Download {picked.size > 1 ? `${picked.size} sizes (ZIP)` : 'JPG'}
            </Button>
          </Panel>
        </div>
      )}
    </PlainToolPage>
  )
}
