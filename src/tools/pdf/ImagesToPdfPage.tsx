import { Suspense, useEffect, useRef, useState } from 'react'
import { PDFDocument, clip, endPath, popGraphicsState, pushGraphicsState, rectangle } from 'pdf-lib'
import { ArrowDown, ArrowUp, FileImage, GripVertical, X } from 'lucide-react'
import { stem } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileDrop, PlainToolPage } from '../../ui/PdfKit'
import { LazyPdfPreview, ResultPanel, focusSettings, useGenerated } from '../../ui/ResultPanel'
import { Button, Field, Notice, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Size = 'a4' | 'letter' | 'original'
type Orientation = 'portrait' | 'landscape' | 'auto'
type Fit = 'fit' | 'fill'
const SIZES: Record<Exclude<Size, 'original'>, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] }

interface Item {
  id: number
  file: File
  url: string
}

/** Re-encode anything that isn't JPEG/PNG (WebP, HEIC-in-Safari, GIF…) as JPEG. */
async function toEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; png: boolean }> {
  if (file.type === 'image/jpeg' || file.type === 'image/png') return { bytes: await file.arrayBuffer(), png: file.type === 'image/png' }
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`"${file.name}" couldn't be read. This browser may not support that image format; try JPG or PNG.`)
  }
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  c.getContext('2d')!.drawImage(bmp, 0, 0)
  bmp.close()
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.92))
  return { bytes: await blob.arrayBuffer(), png: false }
}

const pdfName = (n: string) => (n.trim() ? (/\.pdf$/i.test(n.trim()) ? n.trim() : `${n.trim()}.pdf`) : 'images.pdf')

export default function ImagesToPdfPage() {
  const [items, setItems] = useState<Item[]>([])
  const [size, setSize] = useState<Size>('a4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [fit, setFit] = useState<Fit>('fit')
  const [margin, setMargin] = useState(24)
  const [name, setName] = useState('images.pdf')
  const [skipped, setSkipped] = useState(0)
  const [dragging, setDragging] = useState<number | null>(null)
  const task = useTask()
  const result = useGenerated()
  const nextId = useRef(1)
  const urls = useRef(new Set<string>())

  // Revoke each thumbnail URL once, when its image is removed or on unmount.
  useEffect(() => {
    const live = new Set(items.map((i) => i.url))
    for (const u of urls.current) if (!live.has(u)) URL.revokeObjectURL(u)
    urls.current = live
  }, [items])
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  // Any change to the inputs makes the previous PDF out of date.
  const { clear } = result
  useEffect(clear, [items, size, orientation, fit, margin, clear])

  const add = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    setSkipped(files.length - images.length)
    setItems((x) => [...x, ...images.map((file) => ({ id: nextId.current++, file, url: URL.createObjectURL(file) }))])
    if (!items.length && images[0]) setName(`${stem(images[0].name)}.pdf`)
  }
  const moveTo = (from: number, to: number) =>
    setItems((list) => {
      if (to < 0 || to >= list.length || from === to) return list
      const n = [...list]
      const [it] = n.splice(from, 1)
      n.splice(to, 0, it)
      return n
    })

  const build = () =>
    task.go(async () => {
      const doc = await PDFDocument.create()
      for (const { file } of items) {
        const { bytes, png } = await toEmbeddable(file)
        const img = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
        let pw: number
        let ph: number
        if (size === 'original') [pw, ph] = [img.width + margin * 2, img.height + margin * 2]
        else {
          ;[pw, ph] = SIZES[size]
          const wide = orientation === 'landscape' || (orientation === 'auto' && img.width > img.height)
          if (wide) [pw, ph] = [ph, pw]
        }
        const page = doc.addPage([pw, ph])
        const bw = pw - margin * 2
        const bh = ph - margin * 2
        const scale = size === 'original' ? 1 : fit === 'fill' ? Math.max(bw / img.width, bh / img.height) : Math.min(bw / img.width, bh / img.height)
        const w = img.width * scale
        const h = img.height * scale
        // Fill crops to the margin box: clip, draw, restore.
        if (fit === 'fill' && size !== 'original') page.pushOperators(pushGraphicsState(), rectangle(margin, margin, bw, bh), clip(), endPath())
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
        if (fit === 'fill' && size !== 'original') page.pushOperators(popGraphicsState())
      }
      const bytes = await doc.save()
      result.set(new Blob([bytes as BlobPart], { type: 'application/pdf' }), pdfName(name))
    })

  const reset = () => {
    setItems([])
    setName('images.pdf')
    setSkipped(0)
  }

  const pageLabel = size === 'original' ? 'Original image size' : `${size === 'a4' ? 'A4' : 'Letter'} · ${orientation === 'auto' ? 'auto orientation' : orientation} · ${fit === 'fill' ? 'fill page' : 'fit image'}`

  return (
    <PlainToolPage slug="pdf-images" error={task.error}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel kicker="Images" title={`${items.length} ${items.length === 1 ? 'image' : 'images'}, one per page`}>
          <FileDrop multiple accept="image/*" label={items.length ? 'Add more images' : 'Drop photos, scans or screenshots'} compact={items.length > 0} onFiles={add} />
          {skipped > 0 && <div className="mt-3"><Notice tone="warn">Skipped {skipped} {skipped === 1 ? 'file that isn\'t an image' : 'files that aren\'t images'}.</Notice></div>}
          {items.length > 1 && <p className="mt-3 text-xs text-ink-3">Drag thumbnails to reorder, or use the arrows.</p>}
          <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {items.map((it, i) => (
              <li
                key={it.id}
                draggable
                onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={(e) => { e.preventDefault(); if (dragging !== null) moveTo(dragging, i); setDragging(null) }}
                onDragEnd={() => setDragging(null)}
                className={cx('cursor-grab rounded-lg border bg-paper p-2 transition-opacity active:cursor-grabbing', dragging === i ? 'border-accent opacity-50' : 'border-rule')}
              >
                <img src={it.url} alt={it.file.name} draggable={false} className="aspect-[3/4] w-full rounded bg-white object-contain" />
                <p className="mt-1 truncate text-[11px] text-ink-3" title={it.file.name}>{it.file.name}</p>
                <div className="mt-1 flex items-center justify-between text-ink-3">
                  <span className="flex items-center gap-0.5 font-mono text-[11px]"><GripVertical size={12} aria-hidden /> p{i + 1}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label={`Move ${it.file.name} earlier`} disabled={i === 0} onClick={() => moveTo(i, i - 1)} className="p-0.5 hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" aria-label={`Move ${it.file.name} later`} disabled={i === items.length - 1} onClick={() => moveTo(i, i + 1)} className="p-0.5 hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button type="button" aria-label={`Remove ${it.file.name}`} onClick={() => setItems((x) => x.filter((y) => y.id !== it.id))} className="p-0.5 hover:text-danger"><X size={14} /></button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <div id="pdf-settings">
          <Panel kicker="Layout" title="Page setup">
            <div className="space-y-4">
              <Field label="Page size" htmlFor="size"><div id="size"><Segmented label="Page size" value={size} onChange={setSize} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'original', label: 'Original', hint: 'Each page matches its image size' }]} /></div></Field>
              <Field label="Orientation" htmlFor="orient"><div id="orient"><Segmented label="Orientation" value={orientation} disabled={size === 'original'} onChange={setOrientation} options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }, { value: 'auto', label: 'Auto', hint: 'Landscape pages for wide images' }]} /></div></Field>
              <Field label="Image fit" htmlFor="fit"><div id="fit"><Segmented label="Image fit" value={fit} disabled={size === 'original'} onChange={setFit} options={[{ value: 'fit', label: 'Fit', hint: 'Whole image visible' }, { value: 'fill', label: 'Fill', hint: 'Fill the page, cropping edges' }]} /></div></Field>
              <Field label="Margin" htmlFor="m" hint={margin ? `${margin} pt (${(margin / 72 * 25.4).toFixed(0)} mm)` : 'none'}><input id="m" type="range" min={0} max={72} step={6} value={margin} onChange={(e) => setMargin(+e.target.value)} className={cx(inputClass, 'accent-[var(--accent)] p-0')} /></Field>
              <Field label="File name" htmlFor="name"><input id="name" className={inputClass} value={name} onChange={(e) => { setName(e.target.value); result.rename(pdfName(e.target.value)) }} /></Field>
              <Button className="w-full" tone="primary" disabled={!items.length || task.busy} onClick={() => void build()}><FileImage size={16} /> {task.busy ? 'Creating…' : result.file ? 'Create again' : 'Create PDF'}</Button>
              <p className="text-xs text-ink-3">Nothing downloads until you choose to. You'll see the finished PDF first.</p>
            </div>
          </Panel>
        </div>
      </div>

      {result.file && (
        <ResultPanel
          file={result.file}
          format="PDF"
          downloadLabel="Download PDF"
          facts={[{ label: 'Pages', value: items.length }, { label: 'Layout', value: pageLabel }]}
          onEdit={() => focusSettings('pdf-settings')}
          onReset={reset}
        >
          <Suspense fallback={<p className="font-mono text-xs text-ink-3">Loading preview…</p>}>
            <LazyPdfPreview blob={result.file.blob} />
          </Suspense>
        </ResultPanel>
      )}
    </PlainToolPage>
  )
}
