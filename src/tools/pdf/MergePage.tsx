import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ArrowDown, ArrowUp, Combine, X } from 'lucide-react'
import { savePdf } from '../../lib/pdf'
import { formatBytes } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileDrop, PlainToolPage } from '../../ui/PdfKit'
import { Button, Field, Panel, inputClass } from '../../ui/kit'

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState('merged.pdf')
  const task = useTask()

  const add = (list: File[]) => setFiles((f) => [...f, ...list.filter((x) => /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name))])
  const move = (i: number, d: number) => setFiles((f) => { const n = [...f]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n })

  const merge = () =>
    task.go(async () => {
      const out = await PDFDocument.create()
      for (const f of files) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      }
      savePdf(await out.save(), name.endsWith('.pdf') ? name : `${name}.pdf`)
    })

  return (
    <PlainToolPage slug="pdf-merge" error={task.error}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel kicker="Files" title={`${files.length} PDFs · drag order matters`}>
          <FileDrop multiple onFiles={add} compact={files.length > 0} label={files.length ? 'Add more PDFs' : 'Drop PDF files here or browse'} />
          <ol className="mt-4 space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-rule bg-paper px-3 py-2">
                <span className="w-6 font-mono text-xs text-ink-3">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                <span className="font-mono text-xs text-ink-3">{formatBytes(f.size)}</span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-ink-3 hover:text-ink disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" aria-label="Move down" disabled={i === files.length - 1} onClick={() => move(i, 1)} className="text-ink-3 hover:text-ink disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" aria-label="Remove" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><X size={15} /></button>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel kicker="Output" title="Combine">
          <Field label="File name" htmlFor="name"><input id="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button className="mt-4 w-full" tone="primary" disabled={files.length < 2 || task.busy} onClick={() => void merge()}><Combine size={16} /> {task.busy ? 'Merging…' : 'Merge & download'}</Button>
          <p className="mt-3 text-xs text-ink-3">Combine invoices, chapters, scans or forms into one file. Total {formatBytes(files.reduce((s, f) => s + f.size, 0))}.</p>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
