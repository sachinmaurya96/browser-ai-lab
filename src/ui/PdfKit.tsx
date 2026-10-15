import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FileUp } from 'lucide-react'
import { openPdf, renderPage, type PdfDoc } from '../lib/pdf'
import { formatBytes } from '../lib/images'
import { ToolIntro } from './Shell'
import { Notice, cx } from './kit'

/** Layout for tools that need no AI model. */
export function PlainToolPage({ slug, error, children }: { slug: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <ToolIntro slug={slug} />
      <p className="flex items-center gap-2 font-mono text-xs text-ink-3">
        <span className="size-2 rounded-full bg-sea" /> No model download · runs instantly · files never leave your device
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {children}
    </div>
  )
}

/** Drop/browse zone for PDFs (or images, via `accept`). */
export function FileDrop({
  onFiles,
  multiple,
  accept = 'application/pdf,.pdf',
  label = 'Drop PDF files here or browse',
  compact,
}: {
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: string
  label?: string
  compact?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]) }}
        className={cx('paper-grid flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors', compact ? 'px-4 py-5' : 'px-6 py-14', over ? 'border-accent bg-accent-soft' : 'border-rule hover:border-ink')}
      >
        <span className="grid size-12 place-items-center rounded-full border border-ink bg-card"><FileUp size={22} /></span>
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[11px] text-ink-3">processed in your browser · never uploaded</span>
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = '' }} />
    </>
  )
}

/** Load a single PDF with pdf.js and keep the File around. */
export function usePdf() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => void doc?.cleanup(), [doc])
  const load = async (f: File | undefined) => {
    if (!f) return
    setError(null)
    try {
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) throw new Error('That is not a PDF file.')
      setDoc(await openPdf(f))
      setFile(f)
    } catch (e) {
      const msg = (e as Error).message
      setError(/password/i.test(msg) ? 'This PDF is password-protected. Remove the password first.' : msg)
    }
  }
  return { file, doc, error, load, clear: () => { setFile(null); setDoc(null) } }
}

export function FileBadge({ file, pages, onClear }: { file: File; pages?: number; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-paper px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{file.name}</p>
        <p className="font-mono text-xs text-ink-3">{formatBytes(file.size)}{pages ? ` · ${pages} pages` : ''}</p>
      </div>
      {onClear && <button type="button" onClick={onClear} className="text-sm text-ink-3 hover:text-danger">Change</button>}
    </div>
  )
}

/** Lazily rendered page thumbnail. */
export function Thumb({ doc, page, rotate = 0, width = 160, className }: { doc: PdfDoc; page: number; rotate?: number; width?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      void renderPage(doc, page, width * 1.5).then((c) => live && setSrc(c.toDataURL('image/jpeg', 0.7)))
    })
    io.observe(el)
    return () => { live = false; io.disconnect() }
  }, [doc, page, width])
  return (
    <div ref={box} className={cx('grid aspect-[3/4] place-items-center overflow-hidden rounded border border-rule bg-white', className)}>
      {src ? <img src={src} alt={`Page ${page}`} className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${rotate}deg)` }} /> : <span className="font-mono text-xs text-ink-3">{page}</span>}
    </div>
  )
}
