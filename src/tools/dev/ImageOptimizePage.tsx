import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { Download, Trash2 } from 'lucide-react'
import { PlainToolPage, FileDrop } from '../../ui/PdfKit'
import { formatBytes, saveBlob, stem } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { Button, Field, Panel, Segmented, Tag, inputClass } from '../../ui/kit'

type Format = 'image/webp' | 'image/jpeg' | 'image/png'
const EXT: Record<Format, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

interface Item {
  file: File
  out?: { blob: Blob; url: string; w: number; h: number }
}

async function convert(file: File, format: Format, quality: number, maxSide: number) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = maxSide ? Math.min(1, maxSide / Math.max(bmp.width, bmp.height)) : 1
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#fff' // JPEG has no transparency
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob = await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error('Encoding failed'))), format, quality))
  return { blob, url: URL.createObjectURL(blob), w, h }
}

export default function ImageOptimizePage() {
  const [items, setItems] = useState<Item[]>([])
  const [format, setFormat] = useState<Format>('image/webp')
  const [quality, setQuality] = useState(0.8)
  const [maxSide, setMaxSide] = useState(1920)
  const task = useTask()

  useEffect(() => () => items.forEach((i) => i.out && URL.revokeObjectURL(i.out.url)), [items])

  const run = (list = items) =>
    task.go(async () => {
      const done: Item[] = []
      for (const it of list) done.push({ file: it.file, out: await convert(it.file, format, quality, maxSide) })
      setItems(done)
    })

  const before = items.reduce((s, i) => s + i.file.size, 0)
  const after = items.reduce((s, i) => s + (i.out?.blob.size ?? 0), 0)
  const name = (i: Item) => `${stem(i.file.name)}.${EXT[format]}`

  const downloadAll = async () => {
    if (items.length === 1 && items[0].out) return saveBlob(items[0].out.blob, name(items[0]))
    const zip = new JSZip()
    items.forEach((i) => i.out && zip.file(name(i), i.out.blob))
    saveBlob(await zip.generateAsync({ type: 'blob' }), 'optimized-images.zip')
  }

  return (
    <PlainToolPage slug="img-optimize" error={task.error}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel kicker="Settings" title="Output">
          <div className="space-y-4">
            <Field label="Format" htmlFor="fmt"><div id="fmt"><Segmented label="Format" value={format} onChange={setFormat} options={[{ value: 'image/webp', label: 'WebP' }, { value: 'image/jpeg', label: 'JPG' }, { value: 'image/png', label: 'PNG' }]} /></div></Field>
            {format !== 'image/png' && <Field label="Quality" htmlFor="q" hint={`${Math.round(quality * 100)}%`}><input id="q" type="range" min={0.3} max={1} step={0.05} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field>}
            <Field label="Max width/height" htmlFor="max" hint="0 = keep size">
              <input id="max" type="number" min={0} step={160} className={inputClass} value={maxSide} onChange={(e) => setMaxSide(+e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-1.5">{[0, 3840, 1920, 1280, 800, 512].map((n) => <Button key={n} size="sm" tone={maxSide === n ? 'primary' : 'ghost'} onClick={() => setMaxSide(n)}>{n || 'Original'}</Button>)}</div>
            <Button className="w-full" tone="primary" disabled={!items.length || task.busy} onClick={() => void run()}>{task.busy ? 'Optimizing…' : 'Optimize'}</Button>
          </div>
        </Panel>
        <Panel
          kicker="Images"
          title={after ? <span className="flex items-center gap-2">{formatBytes(before)} → {formatBytes(after)} <Tag tone={after < before ? 'sea' : 'accent'}>{after < before ? `−${Math.round((1 - after / before) * 100)}%` : `+${Math.round((after / before - 1) * 100)}%`}</Tag></span> : `${items.length} images`}
          actions={<><Button size="sm" tone="ghost" disabled={!items.length} onClick={() => setItems([])}><Trash2 size={14} /> Clear</Button><Button size="sm" tone="outline" disabled={!items.some((i) => i.out)} onClick={() => void downloadAll()}><Download size={14} /> {items.length > 1 ? 'ZIP' : 'Download'}</Button></>}
        >
          <FileDrop multiple accept="image/*" label="Drop images (JPG, PNG, WebP, GIF, AVIF…)" compact={items.length > 0} onFiles={(f) => { const list = [...items, ...f.filter((x) => x.type.startsWith('image/')).map((file) => ({ file }))]; setItems(list); void run(list) }} />
          <ul className="mt-4 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-rule p-2">
                {it.out ? <img src={it.out.url} alt="" className="checker size-14 rounded object-contain" /> : <span className="size-14 animate-pulse rounded bg-paper-2" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.file.name}</p>
                  <p className="font-mono text-xs text-ink-3">{formatBytes(it.file.size)}{it.out && <> → <span className={it.out.blob.size < it.file.size ? 'text-sea' : 'text-accent'}>{formatBytes(it.out.blob.size)}</span> · {it.out.w}×{it.out.h}</>}</p>
                </div>
                {it.out && <Button size="sm" tone="ghost" onClick={() => saveBlob(it.out!.blob, name(it))}><Download size={14} /></Button>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Converting also strips EXIF metadata such as GPS location, which makes photos safer to share.</p>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
