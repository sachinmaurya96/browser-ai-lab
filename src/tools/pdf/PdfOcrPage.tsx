import { useState } from 'react'
import { Download, ScanLine } from 'lucide-react'
import { parseRanges, pdfStem, renderPage } from '../../lib/pdf'
import { saveBlob } from '../../lib/images'
import { useModel } from '../../lib/useModel'
import { useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { FileBadge, FileDrop, usePdf } from '../../ui/PdfKit'
import { Button, CopyButton, Field, Panel, inputClass } from '../../ui/kit'
import type { CaptionInput } from '../alt-text/worker'

export default function PdfOcrPage() {
  // Shares Florence-2 with Describe and Text Scanner.
  const model = useModel(() => new Worker(new URL('../alt-text/worker.ts', import.meta.url), { type: 'module' }))
  const pdf = usePdf()
  const task = useTask()
  const [spec, setSpec] = useState('')
  const [pages, setPages] = useState<{ n: number; text: string }[]>([])
  const [progress, setProgress] = useState('')

  const run = () =>
    task.go(async () => {
      setPages([])
      const total = pdf.doc!.numPages
      const list = spec.trim() ? parseRanges(spec, total) : Array.from({ length: total }, (_, i) => i + 1)
      const out: { n: number; text: string }[] = []
      for (const n of list) {
        setProgress(`${out.length + 1}/${list.length}`)
        const canvas = await renderPage(pdf.doc!, n, 1400)
        const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'))
        const url = URL.createObjectURL(blob)
        try {
          const text = await model.run<string>('caption', { url, detail: 'ocr' } satisfies CaptionInput)
          out.push({ n, text: text.replace(/<\/?s>|<pad>/g, '').trim() })
          setPages([...out])
        } finally {
          URL.revokeObjectURL(url)
        }
      }
      setProgress('')
    })

  const all = pages.map((p) => `--- Page ${p.n} ---\n${p.text}`).join('\n\n')

  return (
    <ToolPage slug="pdf-ocr" model={model} error={task.error ?? pdf.error} info={{ name: 'onnx-community/Florence-2-base-ft', href: 'https://huggingface.co/onnx-community/Florence-2-base-ft', size: '~350 MB', task: 'OCR for scanned PDFs' }}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} label="Drop a scanned PDF" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={() => { pdf.clear(); setPages([]) }} />
            <Field label="Pages" htmlFor="pg" hint="blank = all"><input id="pg" className={inputClass} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. 1-5" /></Field>
            <Button className="w-full" tone="primary" disabled={task.busy} onClick={() => void run()}><ScanLine size={16} /> {task.busy ? `Reading ${progress}…` : 'Run OCR'}</Button>
            <p className="text-xs text-ink-3">Takes a few seconds per page with WebGPU, longer on CPU. Works best on clear printed scans.</p>
          </div>
          <Panel kicker="Text" title={`${pages.length} pages read`} actions={<><CopyButton text={pages.map((p) => p.text).join('\n\n')} /><Button size="sm" tone="ghost" disabled={!pages.length} onClick={() => saveBlob(new Blob([all]), `${pdfStem(pdf.file!.name)}-ocr.txt`)}><Download size={14} /> .txt</Button></>}>
            <pre className="max-h-[65vh] min-h-60 overflow-auto rounded-lg border border-rule bg-paper p-4 font-mono text-sm whitespace-pre-wrap">{all || 'Recognised text appears here, page by page.'}</pre>
          </Panel>
        </div>
      )}
    </ToolPage>
  )
}
