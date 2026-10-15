import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { Scissors } from 'lucide-react'
import { parseRanges, pdfStem, savePdf } from '../../lib/pdf'
import { saveBlob } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { Button, Field, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Mode = 'extract' | 'each' | 'chunks'

export default function SplitPage() {
  const pdf = usePdf()
  const task = useTask()
  const [mode, setMode] = useState<Mode>('extract')
  const [spec, setSpec] = useState('1-3')
  const [every, setEvery] = useState(5)
  const total = pdf.doc?.numPages ?? 0
  const picked = new Set(parseRanges(spec, total))

  const toggle = (n: number) => {
    const s = new Set(picked)
    if (s.has(n)) s.delete(n); else s.add(n)
    setSpec(compact([...s].sort((a, b) => a - b)))
  }

  const run = () =>
    task.go(async () => {
      const src = await PDFDocument.load(await pdf.file!.arrayBuffer(), { ignoreEncryption: true })
      const build = async (pages: number[]) => {
        const out = await PDFDocument.create()
        ;(await out.copyPages(src, pages.map((p) => p - 1))).forEach((p) => out.addPage(p))
        return out.save()
      }
      const base = pdfStem(pdf.file!.name)
      if (mode === 'extract') {
        const pages = [...picked]
        if (!pages.length) throw new Error('Choose at least one page.')
        return savePdf(await build(pages), `${base}-pages-${spec.replace(/\s/g, '')}.pdf`)
      }
      const zip = new JSZip()
      const size = mode === 'each' ? 1 : Math.max(1, every)
      for (let i = 1; i <= total; i += size) {
        const pages = Array.from({ length: Math.min(size, total - i + 1) }, (_, k) => i + k)
        zip.file(`${base}-${pages.length > 1 ? `${pages[0]}-${pages.at(-1)}` : pages[0]}.pdf`, await build(pages))
      }
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${base}-split.zip`)
    })

  return (
    <PlainToolPage slug="pdf-split" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel kicker="Pages" title={mode === 'extract' ? 'Click pages to select them' : `${total} pages`}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => mode === 'extract' && toggle(n)} className={cx('rounded-lg p-1 text-left', mode === 'extract' && picked.has(n) ? 'bg-accent ring-2 ring-accent' : 'hover:bg-paper-2')}>
                  <Thumb doc={pdf.doc!} page={n} width={120} />
                  <span className={cx('mt-1 block text-center font-mono text-[11px]', mode === 'extract' && picked.has(n) ? 'text-accent-ink' : 'text-ink-3')}>{n}</span>
                </button>
              ))}
            </div>
          </Panel>
          <div className="space-y-4">
            <FileBadge file={pdf.file} pages={total} onClear={pdf.clear} />
            <Panel kicker="Split" title="How?">
              <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'extract', label: 'Pick pages' }, { value: 'each', label: 'Every page' }, { value: 'chunks', label: 'Every N' }]} />
              {mode === 'extract' && <div className="mt-4"><Field label="Pages" htmlFor="spec" hint={`${picked.size} selected`}><input id="spec" className={inputClass} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="1-3, 5, 9-" /></Field></div>}
              {mode === 'chunks' && <div className="mt-4"><Field label="Pages per file" htmlFor="every"><input id="every" type="number" min={1} className={inputClass} value={every} onChange={(e) => setEvery(+e.target.value)} /></Field></div>}
              <Button className="mt-4 w-full" tone="primary" disabled={task.busy} onClick={() => void run()}><Scissors size={16} /> {task.busy ? 'Working…' : mode === 'extract' ? 'Extract to new PDF' : 'Split & download ZIP'}</Button>
            </Panel>
          </div>
        </div>
      )}
    </PlainToolPage>
  )
}

/** [1,2,3,5] → "1-3, 5" */
function compact(pages: number[]): string {
  const out: string[] = []
  for (let i = 0; i < pages.length; i++) {
    let j = i
    while (pages[j + 1] === pages[j] + 1) j++
    out.push(j > i ? `${pages[i]}-${pages[j]}` : `${pages[i]}`)
    i = j
  }
  return out.join(', ')
}
