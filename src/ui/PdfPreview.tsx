import { useEffect, useState } from 'react'
import { openPdf, type PdfDoc } from '../lib/pdf'
import { Thumb } from './PdfKit'
import { PdfViewer } from './PdfViewer'
import { cx } from './kit'

/**
 * Preview of a generated PDF, rendered from the exact bytes that will be
 * downloaded. Loaded lazily so tools only pay for pdf.js once there is a
 * result to show.
 */
export default function PdfPreview({ blob, onPages }: { blob: Blob; onPages?: (n: number) => void }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let live = true
    let opened: PdfDoc | null = null
    setDoc(null)
    setPage(1)
    setError(null)
    openPdf(blob)
      .then((d) => {
        opened = d
        if (!live) return void d.loadingTask.destroy()
        setDoc(d)
        onPages?.(d.numPages)
      })
      .catch((e) => live && setError((e as Error).message))
    return () => {
      live = false
      void opened?.loadingTask.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  if (error) return <p className="text-sm text-danger">Couldn't render a preview: {error}</p>
  if (!doc) return <div className="grid aspect-[3/4] max-h-[480px] place-items-center rounded-lg border border-rule bg-paper font-mono text-xs text-ink-3">Rendering preview…</div>

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_120px]">
      <div className="mx-auto w-full max-w-xl">
        <PdfViewer doc={doc} page={page} onPage={setPage} />
      </div>
      {doc.numPages > 1 && (
        <ol className="flex gap-2 overflow-x-auto pb-1 md:max-h-[640px] md:flex-col md:overflow-y-auto md:overflow-x-visible" aria-label="Pages">
          {Array.from({ length: doc.numPages }, (_, i) => i + 1).map((n) => (
            <li key={n} className="w-20 shrink-0 md:w-full">
              <button type="button" onClick={() => setPage(n)} aria-label={`Show page ${n}`} aria-current={n === page ? 'page' : undefined} className={cx('w-full rounded-md p-1 text-center', n === page ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-paper-2')}>
                <Thumb doc={doc} page={n} width={100} />
                <span className="mt-0.5 block font-mono text-[10px] text-ink-3">{n}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
