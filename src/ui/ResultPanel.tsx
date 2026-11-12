import { lazy, useCallback, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, Download, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { formatBytes, saveBlob } from '../lib/images'
import { Button, Panel } from './kit'

/** Lazy so pdf.js only loads once there is something to preview. */
export const LazyPdfPreview = lazy(() => import('./PdfPreview'))

export interface Generated {
  blob: Blob
  name: string
  /** Object URL for previews; revoked when the result is replaced or cleared. */
  url: string
}

/**
 * Holds one generated file. The same Blob feeds the preview and the download,
 * so what the user checked is exactly what they save.
 */
export function useGenerated() {
  const [file, setFile] = useState<Generated | null>(null)
  const url = file?.url
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  const set = useCallback((blob: Blob, name: string) => setFile({ blob, name, url: URL.createObjectURL(blob) }), [])
  const clear = useCallback(() => setFile(null), [])
  /** Change the download name without regenerating. */
  const rename = useCallback((name: string) => setFile((f) => (f ? { ...f, name } : f)), [])
  return { file, set, clear, rename }
}

export interface Fact {
  label: string
  value: ReactNode
}

/**
 * Result area for tools that produce a file: what was made, a preview, and a
 * deliberate Download. Only the actions a tool passes are shown.
 */
export function ResultPanel({
  file,
  format,
  facts = [],
  children,
  downloadLabel = 'Download',
  onEdit,
  onReset,
  resetLabel = 'Start over',
}: {
  file: Generated
  format: string
  facts?: Fact[]
  children?: ReactNode
  downloadLabel?: string
  onEdit?: () => void
  onReset?: () => void
  resetLabel?: string
}) {
  return (
    <Panel
      kicker="Result"
      title={<span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sea" aria-hidden /> Ready — check it, then download</span>}
      actions={
        <>
          {onEdit && <Button size="sm" tone="ghost" onClick={onEdit}><SlidersHorizontal size={14} /> Edit settings</Button>}
          {onReset && <Button size="sm" tone="ghost" onClick={onReset}><RotateCcw size={14} /> {resetLabel}</Button>}
          <Button size="sm" tone="primary" onClick={() => saveBlob(file.blob, file.name)}><Download size={14} /> {downloadLabel}</Button>
        </>
      }
    >
      <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {[{ label: 'File', value: <span className="break-all">{file.name}</span> }, { label: 'Format', value: format }, { label: 'Size', value: formatBytes(file.blob.size) }, ...facts].map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-3">{f.label}</dt>
            <dd className="font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </Panel>
  )
}

/** Scroll a settings panel into view and focus its first control. */
export function focusSettings(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el?.querySelector<HTMLElement>('input, button, select')?.focus({ preventScroll: true })
}
