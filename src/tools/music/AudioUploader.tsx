import { useRef, useState } from 'react'
import { FileAudio } from 'lucide-react'
import { cx } from '../../ui/kit'
import { MAX_FILE_MB } from './audio'

const looksLikeAudio = (f: File) => f.type.startsWith('audio/') || f.type.startsWith('video/') || /\.(mp3|wav|flac|ogg|oga|opus|m4a|aac|webm|mp4|aif|aiff)$/i.test(f.name)

/** Drag-and-drop or browse for an audio (or video) file. */
export function AudioUploader({ onFile, disabled }: { onFile(file: File): void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const take = (file: File | undefined | null) => {
    if (!file || disabled) return
    if (!looksLikeAudio(file)) return setError(`"${file.name}" doesn't look like an audio file.`)
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`That file is over ${MAX_FILE_MB} MB.`)
    setError(null)
    onFile(file)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
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
          'paper-grid group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors disabled:opacity-50',
          over ? 'border-accent bg-accent-soft' : 'border-rule hover:border-ink',
        )}
      >
        <span className="grid size-12 place-items-center rounded-full border border-ink bg-card transition-transform group-hover:-rotate-6">
          <FileAudio size={22} />
        </span>
        <span className="text-[15px] font-medium">
          Drop a song or <span className="text-accent underline underline-offset-4">browse</span>
        </span>
        <span className="font-mono text-[11px] text-ink-3">MP3 · WAV · FLAC · OGG · M4A · video soundtracks — up to {MAX_FILE_MB} MB · never uploaded</span>
      </button>
      <input
        ref={input}
        type="file"
        aria-label="Choose an audio file"
        accept="audio/*,video/*,.flac,.m4a,.opus"
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
