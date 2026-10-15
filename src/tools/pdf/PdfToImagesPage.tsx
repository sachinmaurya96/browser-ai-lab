import { useState } from 'react'
import JSZip from 'jszip'
import { Images } from 'lucide-react'
import { parseRanges, pdfStem, renderPage } from '../../lib/pdf'
import { saveBlob } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { Button, Field, Panel, Segmented, inputClass } from '../../ui/kit'

const DPI: Record<string, number> = { '72': 612, '150': 1275, '300': 2550 }

export default function PdfToImagesPage() {
  const pdf = usePdf()
  const task = useTask()
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [dpi, setDpi] = useState('150')
  const [spec, setSpec] = useState('')
  const [progress, setProgress] = useState('')
  const total = pdf.doc?.numPages ?? 0

  const run = () =>
    task.go(async () => {
      const pages = spec.trim() ? parseRanges(spec, total) : Array.from({ length: total }, (_, i) => i + 1)
      const base = pdfStem(pdf.file!.name)
      const ext = format === 'png' ? 'png' : 'jpg'
      const blobs: [string, Blob][] = []
      for (const n of pages) {
        setProgress(`${blobs.length + 1}/${pages.length}`)
        const canvas = await renderPage(pdf.doc!, n, DPI[dpi])
        blobs.push([`${base}-page-${n}.${ext}`, await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), `image/${format}`, 0.9))])
      }
      setProgress('')
      if (blobs.length === 1) return saveBlob(blobs[0][1], blobs[0][0])
      const zip = new JSZip()
      blobs.forEach(([name, b]) => zip.file(name, b))
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${base}-images.zip`)
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
          <div className="space-y-4">
            <FileBadge file={pdf.file} pages={total} onClear={pdf.clear} />
            <Panel kicker="Export" title="Image settings">
              <div className="space-y-4">
                <Field label="Format" htmlFor="fmt"><div id="fmt"><Segmented label="Format" value={format} onChange={setFormat} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }]} /></div></Field>
                <Field label="Quality" htmlFor="dpi"><div id="dpi"><Segmented label="DPI" value={dpi} onChange={setDpi} options={[{ value: '72', label: 'Screen' }, { value: '150', label: 'Good' }, { value: '300', label: 'Print' }]} /></div></Field>
                <Field label="Pages" htmlFor="pages" hint="blank = all"><input id="pages" className={inputClass} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. 1, 3-5" /></Field>
              </div>
              <Button className="mt-5 w-full" tone="primary" disabled={task.busy} onClick={() => void run()}><Images size={16} /> {task.busy ? `Rendering ${progress}…` : 'Convert & download'}</Button>
              <p className="mt-2 text-xs text-ink-3">Several pages download as a ZIP.</p>
            </Panel>
          </div>
        </div>
      )}
    </PlainToolPage>
  )
}
