import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Minimize2 } from 'lucide-react'
import { pdfStem, renderPage, savePdf } from '../../lib/pdf'
import { formatBytes } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, usePdf } from '../../ui/PdfKit'
import { Button, Notice, Panel, Segmented } from '../../ui/kit'

type Level = 'light' | 'medium' | 'strong'
// Render width (≈ DPI on Letter/A4) and JPEG quality per level.
const LEVELS: Record<Level, [number, number]> = { light: [1600, 0.8], medium: [1200, 0.65], strong: [850, 0.5] }

export default function CompressPage() {
  const pdf = usePdf()
  const task = useTask()
  const [level, setLevel] = useState<Level>('medium')
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number } | null>(null)
  const [progress, setProgress] = useState('')

  const run = () =>
    task.go(async () => {
      setResult(null)
      const [width, quality] = LEVELS[level]
      const out = await PDFDocument.create()
      for (let n = 1; n <= pdf.doc!.numPages; n++) {
        setProgress(`${n}/${pdf.doc!.numPages}`)
        const page = await pdf.doc!.getPage(n)
        const vp = page.getViewport({ scale: 1 })
        const canvas = await renderPage(pdf.doc!, n, width)
        const jpg = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', quality))
        const img = await out.embedJpg(await jpg.arrayBuffer())
        out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height })
      }
      setProgress('')
      const bytes = await out.save()
      setResult({ bytes, size: bytes.length })
    })

  const saved = result && pdf.file ? 1 - result.size / pdf.file.size : 0

  return (
    <PlainToolPage slug="pdf-compress" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => { setResult(null); void pdf.load(f[0]) }} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel kicker="Input" title="Shrink for email or upload limits">
            <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={() => { pdf.clear(); setResult(null) }} />
            <div className="mt-5"><Segmented label="Level" value={level} onChange={(l) => { setLevel(l); setResult(null) }} options={[{ value: 'light', label: 'Light' }, { value: 'medium', label: 'Balanced' }, { value: 'strong', label: 'Smallest' }]} /></div>
            <Button className="mt-5" tone="primary" disabled={task.busy} onClick={() => void run()}><Minimize2 size={16} /> {task.busy ? `Compressing ${progress}…` : 'Compress'}</Button>
            <div className="mt-5"><Notice tone="warn">Pages are flattened to images, so text won't be selectable afterwards. Best for scans and photo-heavy PDFs.</Notice></div>
          </Panel>
          <Panel kicker="Result" title={result ? (saved > 0 ? `${Math.round(saved * 100)}% smaller` : 'Already well compressed') : 'Result'}>
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg border border-rule p-4"><p className="font-mono text-xs text-ink-3">Before</p><p className="text-2xl font-semibold">{formatBytes(pdf.file.size)}</p></div>
                  <div className="rounded-lg border border-ink p-4"><p className="font-mono text-xs text-ink-3">After</p><p className="text-2xl font-semibold text-accent">{formatBytes(result.size)}</p></div>
                </div>
                <Button className="mt-5 w-full" tone="primary" disabled={saved <= 0} onClick={() => savePdf(result.bytes, `${pdfStem(pdf.file!.name)}-compressed.pdf`)}>Download compressed PDF</Button>
                {saved <= 0 && <p className="mt-2 text-sm text-ink-3">The original is smaller. Keep it, or try "Smallest".</p>}
              </>
            ) : (
              <p className="py-12 text-center text-sm text-ink-3">Pick a level and compress.</p>
            )}
          </Panel>
        </div>
      )}
    </PlainToolPage>
  )
}
