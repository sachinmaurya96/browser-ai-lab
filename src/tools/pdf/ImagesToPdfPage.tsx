import { useEffect, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ArrowDown, ArrowUp, FileImage, X } from 'lucide-react'
import { savePdf } from '../../lib/pdf'
import { useTask } from '../../lib/hooks'
import { FileDrop, PlainToolPage } from '../../ui/PdfKit'
import { Button, Field, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Size = 'fit' | 'a4' | 'letter'
const SIZES: Record<Exclude<Size, 'fit'>, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] }

interface Item {
  file: File
  url: string
}

/** Re-encode anything that isn't JPEG/PNG (WebP, HEIC-in-Safari, GIF…) as JPEG. */
async function toEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; png: boolean }> {
  if (file.type === 'image/jpeg' || file.type === 'image/png') return { bytes: await file.arrayBuffer(), png: file.type === 'image/png' }
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  c.getContext('2d')!.drawImage(bmp, 0, 0)
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.92))
  return { bytes: await blob.arrayBuffer(), png: false }
}

export default function ImagesToPdfPage() {
  const [items, setItems] = useState<Item[]>([])
  const [size, setSize] = useState<Size>('a4')
  const [margin, setMargin] = useState(24)
  const [landscape, setLandscape] = useState(false)
  const task = useTask()

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), [items])

  const add = (files: File[]) => setItems((x) => [...x, ...files.filter((f) => f.type.startsWith('image/')).map((file) => ({ file, url: URL.createObjectURL(file) }))])
  const move = (i: number, d: number) => setItems((f) => { const n = [...f]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n })

  const build = () =>
    task.go(async () => {
      const doc = await PDFDocument.create()
      for (const { file } of items) {
        const { bytes, png } = await toEmbeddable(file)
        const img = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
        let [pw, ph] = size === 'fit' ? [img.width + margin * 2, img.height + margin * 2] : SIZES[size]
        if (size !== 'fit' && landscape) [pw, ph] = [ph, pw]
        const page = doc.addPage([pw, ph])
        const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height, size === 'fit' ? 1 : Infinity)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
      }
      savePdf(await doc.save(), 'images.pdf')
    })

  return (
    <PlainToolPage slug="pdf-images" error={task.error}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel kicker="Images" title={`${items.length} images, one per page`}>
          <FileDrop multiple accept="image/*" label={items.length ? 'Add more images' : 'Drop photos, scans or screenshots'} compact={items.length > 0} onFiles={add} />
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {items.map((it, i) => (
              <li key={it.url} className="rounded-lg border border-rule bg-paper p-2">
                <img src={it.url} alt={it.file.name} className="aspect-[3/4] w-full rounded bg-white object-contain" />
                <div className="mt-1.5 flex items-center justify-between text-ink-3">
                  <span className="font-mono text-[11px]">{i + 1}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button type="button" aria-label="Remove" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="hover:text-danger"><X size={14} /></button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel kicker="Layout" title="Page setup">
          <Field label="Page size" htmlFor="size"><div id="size"><Segmented label="Page size" value={size} onChange={setSize} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'fit', label: 'Fit image' }]} /></div></Field>
          <label className={cx('mt-4 flex items-center gap-2 text-sm', size === 'fit' && 'opacity-40')}><input type="checkbox" disabled={size === 'fit'} checked={landscape} onChange={(e) => setLandscape(e.target.checked)} className="accent-[var(--accent)]" /> Landscape</label>
          <div className="mt-4"><Field label="Margin" htmlFor="m" hint={`${margin} pt`}><input id="m" type="range" min={0} max={72} step={6} value={margin} onChange={(e) => setMargin(+e.target.value)} className={cx(inputClass, 'accent-[var(--accent)] p-0')} /></Field></div>
          <Button className="mt-5 w-full" tone="primary" disabled={!items.length || task.busy} onClick={() => void build()}><FileImage size={16} /> {task.busy ? 'Building…' : 'Create PDF'}</Button>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
