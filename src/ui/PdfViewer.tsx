import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { renderPage, type PdfDoc } from '../lib/pdf'
import { Button, cx } from './kit'

/** Per-page layout from text extraction: aspect ratio and character boxes. */
export interface PageLayout {
  aspect: number
  boxes: { start: number; end: number; x: number; y: number; w: number; h: number }[]
}

/** Character ranges on one page to highlight; `strong` marks the best match. */
export interface Highlight {
  page: number
  ranges: { start: number; end: number; strong?: boolean }[]
}

/** One PDF page at a time with page controls; optionally highlights text ranges. */
export function PdfViewer({ doc, pages, page, onPage, highlight = null }: { doc: PdfDoc; pages?: PageLayout[] | null; page: number; onPage: (n: number) => void; highlight?: Highlight | null }) {
  const host = useRef<HTMLDivElement>(null)
  const [rendering, setRendering] = useState(true)
  const info = pages?.[page - 1]

  useEffect(() => {
    let live = true
    const el = host.current
    if (!el) return
    setRendering(true)
    const width = Math.min(1600, Math.round((el.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1)))
    renderPage(doc, page, width)
      .then((canvas) => {
        if (!live) return
        canvas.className = 'block h-auto w-full'
        canvas.setAttribute('aria-label', `Page ${page}`)
        canvas.setAttribute('role', 'img')
        el.replaceChildren(canvas)
        setRendering(false)
      })
      .catch(() => live && setRendering(false))
    return () => void (live = false)
  }, [doc, page])

  const boxes = highlight && highlight.page === page && info
    ? info.boxes.flatMap((b) => {
        const hit = highlight.ranges.filter((r) => b.start < r.end && b.end > r.start)
        return hit.length ? [{ ...b, strong: hit.some((r) => r.strong) }] : []
      })
    : []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button size="sm" tone="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Button>
        <label className="flex items-center gap-2 font-mono text-xs text-ink-3">
          Page
          <input
            type="number"
            min={1}
            max={doc.numPages}
            value={page}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (n >= 1 && n <= doc.numPages) onPage(n)
            }}
            className="w-16 rounded border border-rule bg-paper px-2 py-1 text-center text-ink"
          />
          of {doc.numPages}
        </label>
        <Button size="sm" tone="ghost" disabled={page >= doc.numPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></Button>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-rule bg-white" style={info ? { aspectRatio: String(info.aspect) } : undefined}>
        <div ref={host} />
        {rendering && <div className="absolute inset-0 grid place-items-center font-mono text-xs text-ink-3">Rendering page {page}…</div>}
        {boxes.map((b, i) => (
          <span
            key={i}
            aria-hidden
            className={cx('pointer-events-none absolute rounded-[2px] mix-blend-multiply', b.strong ? 'bg-sun/55' : 'bg-sun/20')}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}
