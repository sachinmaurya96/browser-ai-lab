import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { Download, Images } from 'lucide-react'
import { parseRanges, pdfStem, renderPage } from '../../lib/pdf'
import { formatBytes, saveBlob } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { ResultPanel, focusSettings, useGenerated } from '../../ui/ResultPanel'
import { Button, Field, Panel, Segmented, inputClass } from '../../ui/kit'

interface Output {
  name: string
  page: number
  blob: Blob
  url: string
  width: number
  height: number
}

const DPI: Record<string, number> = { '72': 612, '150': 1275, '300': 2550 }

export default function PdfToImagesPage() {
  const pdf = usePdf()
  const task = useTask()
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [dpi, setDpi] = useState('150')
  const [spec, setSpec] = useState('')
  const [progress, setProgress] = useState('')
  const total = pdf.doc?.numPages ?? 0
  const result = useGenerated()
  const [images, setImages] = useState<Output[]>([])
  // Revoke thumbnails when they're replaced or the tool closes.
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images])
  const { clear } = result
  useEffect(() => { clear(); setImages([]) }, [pdf.doc, format, dpi, spec, clear])

  const run = () =>
    task.go(async () => {
      const pages = spec.trim() ? parseRanges(spec, total) : Array.from({ length: total }, (_, i) => i + 1)
      const base = pdfStem(pdf.file!.name)
      const ext = format === 'png' ? 'png' : 'jpg'
      if (!pages.length) throw new Error('No valid pages in that range.')
      const out: Output[] = []
      try {
        for (const n of pages) {
          setProgress(`${out.length + 1}/${pages.length}`)
          const canvas = await renderPage(pdf.doc!, n, DPI[dpi])
          const blob = await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error('Image encoding failed — try a lower quality setting.'))), `image/${format}`, 0.9))
          out.push({ name: `${base}-page-${n}.${ext}`, page: n, blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height })
          canvas.width = canvas.height = 0
        }
      } finally {
        setProgress('')
      }
      setImages(out)
      if (out.length === 1) return result.set(out[0].blob, out[0].name)
      const zip = new JSZip()
      out.forEach((o) => zip.file(o.name, o.blob))
      result.set(await zip.generateAsync({ type: 'blob' }), `${base}-images.zip`)
    })

  return (
    <PlainToolPage slug="pdf-to-images" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel kicker="Preview" title={`${total} pages`}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">{Array.from({ length: total }, (_, i) => <Thumb key={i} doc={pdf.doc!} page={i + 1} width={120} />)}</div>
          </Panel>
          <div className="space-y-4" id="img-settings">
            <FileBadge file={pdf.file} pages={total} onClear={pdf.clear} />
            <Panel kicker="Export" title="Image settings">
              <div className="space-y-4">
                <Field label="Format" htmlFor="fmt"><div id="fmt"><Segmented label="Format" value={format} onChange={setFormat} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }]} /></div></Field>
                <Field label="Quality" htmlFor="dpi"><div id="dpi"><Segmented label="DPI" value={dpi} onChange={setDpi} options={[{ value: '72', label: 'Screen' }, { value: '150', label: 'Good' }, { value: '300', label: 'Print' }]} /></div></Field>
                <Field label="Pages" htmlFor="pages" hint="blank = all"><input id="pages" className={inputClass} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. 1, 3-5" /></Field>
              </div>
              <Button className="mt-5 w-full" tone="primary" disabled={task.busy} onClick={() => void run()}><Images size={16} /> {task.busy ? `Rendering ${progress}…` : 'Convert pages'}</Button>
              <p className="mt-2 text-xs text-ink-3">You'll see the converted images first. Several pages download as a ZIP.</p>
            </Panel>
          </div>
        </div>
      )}
      {result.file && images.length > 0 && (
        <ResultPanel
          file={result.file}
          format={images.length === 1 ? (format === 'png' ? 'PNG' : 'JPG') : `ZIP of ${images.length} ${format === 'png' ? 'PNG' : 'JPG'} images`}
          downloadLabel={images.length === 1 ? 'Download image' : 'Download ZIP'}
          facts={[{ label: images.length === 1 ? 'Dimensions' : 'Images', value: images.length === 1 ? `${images[0].width}×${images[0].height} px` : images.length }]}
          onEdit={() => focusSettings('img-settings')}
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((o) => (
              <li key={o.name} className="rounded-lg border border-rule bg-paper p-2">
                <a href={o.url} target="_blank" rel="noreferrer" title="Open full size">
                  <img src={o.url} alt={`Page ${o.page}`} className="checker aspect-[3/4] w-full rounded object-contain" />
                </a>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="min-w-0 font-mono text-[11px] text-ink-3">p{o.page} · {o.width}×{o.height} · {formatBytes(o.blob.size)}</span>
                  {images.length > 1 && <button type="button" aria-label={`Download ${o.name}`} onClick={() => saveBlob(o.blob, o.name)} className="text-ink-3 hover:text-ink"><Download size={14} /></button>}
                </div>
              </li>
            ))}
          </ul>
        </ResultPanel>
      )}
    </PlainToolPage>
  )
}
