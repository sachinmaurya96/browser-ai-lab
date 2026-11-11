import { useCallback, useState } from 'react'
import { Download } from 'lucide-react'
import { saveBlob } from '../../lib/images'
import { Button, Segmented } from '../../ui/kit'
import type { Pcm } from './audio'
import { FORMATS, encode, extension, type ExportFormat } from './export'

/** Encode + download with busy/progress/error state. One export at a time. */
export function useExporter(format: ExportFormat) {
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (label: string, make: () => Pcm | Promise<Pcm>, baseName: string) => {
      if (busy) return
      setBusy(label)
      setError(null)
      setProgress(null)
      try {
        // Let React paint the busy state before the (synchronous) WAV encode.
        await new Promise((r) => setTimeout(r, 0))
        const blob = await encode(await make(), format, setProgress)
        saveBlob(blob, `${baseName}.${extension(format)}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
        setProgress(null)
      }
    },
    [busy, format],
  )
  return { busy, progress, error, save }
}

export type Exporter = ReturnType<typeof useExporter>

/** Format picker plus the main download action for a panel. */
export function ExportPanel({
  format,
  onFormat,
  exporter,
  label,
  onExport,
  disabled,
  note,
}: {
  format: ExportFormat
  onFormat(f: ExportFormat): void
  exporter: Exporter
  label: string
  onExport(): void
  disabled?: boolean
  note?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-rule bg-paper px-4 py-3">
      <Segmented label="Export format" value={format} onChange={onFormat} options={FORMATS} disabled={!!exporter.busy} />
      <Button tone="primary" size="sm" disabled={disabled || !!exporter.busy} onClick={onExport}>
        <Download size={15} />
        {exporter.busy ? `Encoding${exporter.progress !== null ? ` ${Math.round(exporter.progress * 100)}%` : '…'}` : label}
      </Button>
      {note && <span className="text-xs text-ink-3">{note}</span>}
      {exporter.error && (
        <span role="alert" className="text-sm text-danger">
          {exporter.error}
        </span>
      )}
    </div>
  )
}
