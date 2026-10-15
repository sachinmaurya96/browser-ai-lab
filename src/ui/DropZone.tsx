import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { ACCEPTED_IMAGES, MAX_FILE_MB, validateImage } from '../lib/images'
import { cx } from './kit'

/**
 * Image picker that accepts click, drag-and-drop and clipboard paste.
 * Paste is captured page-wide while the zone is mounted.
 */
export function DropZone({
  onFile,
  disabled,
  compact,
}: {
  onFile: (file: File) => void
  disabled?: boolean
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onFileRef = useRef(onFile)
  onFileRef.current = onFile

  const take = (file: File | undefined | null) => {
    if (!file || disabled) return
    const problem = validateImage(file)
    setError(problem)
    if (!problem) onFileRef.current(file)
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) take(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files[0])
        }}
        className={cx(
          'paper-grid group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors disabled:opacity-50',
          compact ? 'px-4 py-6' : 'px-6 py-14',
          over ? 'border-accent bg-accent-soft' : 'border-rule hover:border-ink',
        )}
      >
        <span className="grid size-12 place-items-center rounded-full border border-ink bg-card transition-transform group-hover:-rotate-6">
          <ImagePlus size={22} />
        </span>
        <span className="text-[15px] font-medium">
          Drop an image, <span className="text-accent underline underline-offset-4">browse</span>, or paste
        </span>
        <span className="font-mono text-[11px] text-ink-3">PNG · JPEG · WebP — up to {MAX_FILE_MB} MB · never uploaded</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
