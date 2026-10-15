import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { pdfStem, pdfText } from '../../lib/pdf'
import { saveBlob } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, usePdf } from '../../ui/PdfKit'
import { Button, CopyButton, Notice, Panel } from '../../ui/kit'
import { Link } from 'react-router-dom'

export default function PdfTextPage() {
  const pdf = usePdf()
  const task = useTask()
  const [pages, setPages] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setPages([])
    if (!pdf.doc) return
    void task.go(async () => setPages(await pdfText(pdf.doc!, setProgress)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.doc])

  const all = pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n')
  const words = pages.join(' ').split(/\s+/).filter(Boolean).length
  const scanned = pages.length > 0 && words < pages.length * 5

  return (
    <PlainToolPage slug="pdf-text" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} />
      ) : (
        <>
          <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={pdf.clear} />
          {scanned && <Notice tone="warn">Almost no text found. This looks like a scanned PDF. Use <Link to="/pdf-ocr" className="underline">Scan OCR</Link> to read it with AI.</Notice>}
          <Panel
            kicker="Text"
            title={task.busy ? `Reading page ${progress}…` : `${words.toLocaleString()} words`}
            actions={<><CopyButton text={pages.join('\n\n')} /><Button size="sm" tone="ghost" disabled={!pages.length} onClick={() => saveBlob(new Blob([all]), `${pdfStem(pdf.file!.name)}.txt`)}><Download size={14} /> .txt</Button></>}
          >
            <pre className="max-h-[65vh] overflow-auto rounded-lg border border-rule bg-paper p-4 font-mono text-sm whitespace-pre-wrap">{all || 'Extracting…'}</pre>
          </Panel>
        </>
      )}
    </PlainToolPage>
  )
}
