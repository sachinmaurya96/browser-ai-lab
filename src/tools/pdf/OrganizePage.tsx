import { useEffect, useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { ChevronLeft, ChevronRight, Download, RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { pdfStem, savePdf } from '../../lib/pdf'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { Button, Panel } from '../../ui/kit'

interface Slot {
  page: number
  rotate: number
}

export default function OrganizePage() {
  const pdf = usePdf()
  const task = useTask()
  const [slots, setSlots] = useState<Slot[]>([])

  const reset = () => setSlots(Array.from({ length: pdf.doc?.numPages ?? 0 }, (_, i) => ({ page: i + 1, rotate: 0 })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reset, [pdf.doc])

  const edit = (fn: (s: Slot[]) => Slot[]) => setSlots((s) => fn([...s]))
  const rotateAll = (d: number) => edit((s) => s.map((x) => ({ ...x, rotate: (x.rotate + d + 360) % 360 })))

  const save = () =>
    task.go(async () => {
      const src = await PDFDocument.load(await pdf.file!.arrayBuffer(), { ignoreEncryption: true })
      const out = await PDFDocument.create()
      const pages = await out.copyPages(src, slots.map((s) => s.page - 1))
      pages.forEach((p, i) => {
        p.setRotation(degrees((p.getRotation().angle + slots[i].rotate) % 360))
        out.addPage(p)
      })
      savePdf(await out.save(), `${pdfStem(pdf.file!.name)}-organized.pdf`)
    })

  return (
    <PlainToolPage slug="pdf-organize" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-60 flex-1"><FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={pdf.clear} /></div>
            <Button tone="outline" size="sm" onClick={() => rotateAll(-90)}><RotateCcw size={15} /> All</Button>
            <Button tone="outline" size="sm" onClick={() => rotateAll(90)}><RotateCw size={15} /> All</Button>
            <Button tone="ghost" size="sm" onClick={reset}><Undo2 size={15} /> Reset</Button>
            <Button tone="primary" disabled={!slots.length || task.busy} onClick={() => void save()}><Download size={16} /> {task.busy ? 'Saving…' : `Save ${slots.length} pages`}</Button>
          </div>
          <Panel kicker="Pages" title="Reorder, rotate or delete pages">
            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {slots.map((s, i) => (
                <li key={`${s.page}-${i}`} className="group rounded-lg border border-rule bg-paper p-2">
                  <Thumb doc={pdf.doc!} page={s.page} rotate={s.rotate} width={140} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-3">#{i + 1} <span className="opacity-60">(p{s.page})</span></span>
                    <div className="flex gap-1 text-ink-3">
                      <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => edit((x) => { [x[i - 1], x[i]] = [x[i], x[i - 1]]; return x })} className="hover:text-ink disabled:opacity-30"><ChevronLeft size={15} /></button>
                      <button type="button" aria-label="Move right" disabled={i === slots.length - 1} onClick={() => edit((x) => { [x[i + 1], x[i]] = [x[i], x[i + 1]]; return x })} className="hover:text-ink disabled:opacity-30"><ChevronRight size={15} /></button>
                      <button type="button" aria-label="Rotate" onClick={() => edit((x) => { x[i] = { ...x[i], rotate: (x[i].rotate + 90) % 360 }; return x })} className="hover:text-ink"><RotateCw size={14} /></button>
                      <button type="button" aria-label="Delete page" onClick={() => edit((x) => x.filter((_, j) => j !== i))} className="hover:text-danger"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </>
      )}
    </PlainToolPage>
  )
}
