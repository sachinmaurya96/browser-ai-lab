import { Suspense, useEffect, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { Download, Eye, Scissors } from 'lucide-react'
import { parseRanges, pdfStem } from '../../lib/pdf'
import { formatBytes, saveBlob } from '../../lib/images'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { LazyPdfPreview, ResultPanel, focusSettings, useGenerated } from '../../ui/ResultPanel'
import { Button, Field, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Mode = 'extract' | 'each' | 'chunks'

interface Part {
  name: string
  pages: number[]
  blob: Blob
}

const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' })
const rangeLabel = (pages: number[]) => (pages.length > 1 ? `${pages[0]}–${pages.at(-1)}` : `${pages[0]}`)

export default function SplitPage() {
  const pdf = usePdf()
  const task = useTask()
  const [mode, setMode] = useState<Mode>('extract')
  const [spec, setSpec] = useState('1-3')
  const [every, setEvery] = useState(5)
  const total = pdf.doc?.numPages ?? 0
  const picked = new Set(parseRanges(spec, total))
  const result = useGenerated()
  const [parts, setParts] = useState<Part[]>([])
  const [viewing, setViewing] = useState(0)
  // New file or settings: the previous output no longer matches.
  const { clear } = result
  useEffect(() => { clear(); setParts([]) }, [pdf.doc, mode, spec, every, clear])

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
        const pages = [...picked].sort((a, b) => a - b)
        if (!pages.length) throw new Error('Choose at least one page.')
        const blob = pdfBlob(await build(pages))
        setParts([{ name: `${base}-pages-${spec.replace(/\s/g, '')}.pdf`, pages, blob }])
        return result.set(blob, `${base}-pages-${spec.replace(/\s/g, '')}.pdf`)
      }
      const zip = new JSZip()
      const size = mode === 'each' ? 1 : Math.max(1, every)
      const out: Part[] = []
      for (let i = 1; i <= total; i += size) {
        const pages = Array.from({ length: Math.min(size, total - i + 1) }, (_, k) => i + k)
        const blob = pdfBlob(await build(pages))
        const name = `${base}-${pages.length > 1 ? `${pages[0]}-${pages.at(-1)}` : pages[0]}.pdf`
        zip.file(name, blob)
        out.push({ name, pages, blob })
      }
      setParts(out)
      setViewing(0)
      result.set(await zip.generateAsync({ type: 'blob' }), `${base}-split.zip`)
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
          <div className="space-y-4" id="split-settings">
            <FileBadge file={pdf.file} pages={total} onClear={pdf.clear} />
            <Panel kicker="Split" title="How?">
              <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'extract', label: 'Pick pages' }, { value: 'each', label: 'Every page' }, { value: 'chunks', label: 'Every N' }]} />
              {mode === 'extract' && <div className="mt-4"><Field label="Pages" htmlFor="spec" hint={`${picked.size} selected`}><input id="spec" className={inputClass} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="1-3, 5, 9-" /></Field></div>}
              {mode === 'chunks' && <div className="mt-4"><Field label="Pages per file" htmlFor="every"><input id="every" type="number" min={1} className={inputClass} value={every} onChange={(e) => setEvery(+e.target.value)} /></Field></div>}
              <Button className="mt-4 w-full" tone="primary" disabled={task.busy} onClick={() => void run()}><Scissors size={16} /> {task.busy ? 'Working…' : mode === 'extract' ? 'Extract pages' : 'Split PDF'}</Button>
              <p className="mt-2 text-xs text-ink-3">{mode === 'extract' ? 'You\'ll preview the new PDF before downloading.' : 'Each part becomes its own PDF in a ZIP. You can check every part first.'}</p>
            </Panel>
          </div>
        </div>
      )}
      {result.file && parts.length > 0 && (mode === 'extract' ? (
        <ResultPanel file={result.file} format="PDF" downloadLabel="Download PDF" facts={[{ label: 'Pages', value: `${parts[0].pages.length} (${spec})` }]} onEdit={() => focusSettings('split-settings')}>
          <Suspense fallback={<p className="font-mono text-xs text-ink-3">Loading preview…</p>}><LazyPdfPreview blob={result.file.blob} /></Suspense>
        </ResultPanel>
      ) : (
        <ResultPanel file={result.file} format={`ZIP of ${parts.length} PDFs`} downloadLabel="Download ZIP" facts={[{ label: 'Parts', value: parts.length }]} onEdit={() => focusSettings('split-settings')}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
            <ul className="max-h-[560px] space-y-1.5 overflow-auto" aria-label="Files in the ZIP">
              {parts.map((p, i) => (
                <li key={p.name} className={cx('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', i === viewing ? 'border-accent bg-accent-soft' : 'border-rule')}>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewing(i)} aria-current={i === viewing ? 'true' : undefined}>
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">{p.pages.length === 1 ? 'page' : 'pages'} {rangeLabel(p.pages)} · {formatBytes(p.blob.size)}</span>
                  </button>
                  <Button size="sm" tone="ghost" aria-label={`Preview ${p.name}`} onClick={() => setViewing(i)}><Eye size={14} /></Button>
                  <Button size="sm" tone="ghost" aria-label={`Download ${p.name}`} onClick={() => saveBlob(p.blob, p.name)}><Download size={14} /></Button>
                </li>
              ))}
            </ul>
            <div>
              <p className="mb-2 font-mono text-xs text-ink-3">Previewing {parts[viewing]?.name}</p>
              {parts[viewing] && <Suspense fallback={<p className="font-mono text-xs text-ink-3">Loading preview…</p>}><LazyPdfPreview blob={parts[viewing].blob} /></Suspense>}
            </div>
          </div>
        </ResultPanel>
      ))}
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
