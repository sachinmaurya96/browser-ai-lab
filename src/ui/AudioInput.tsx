import { useRef } from 'react'
import { FileAudio, Mic, Square } from 'lucide-react'
import { clock, useRecorder } from '../lib/audio'
import { Button, Notice } from './kit'

/** Record from the microphone or pick an audio/video file. */
export function AudioInput({ onAudio, disabled }: { onAudio: (blob: Blob, name: string) => void; disabled?: boolean }) {
  const rec = useRecorder()
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-3">
      <div className="paper-grid flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-rule px-6 py-10 text-center">
        {rec.recording ? (
          <>
            <span className="flex items-center gap-2 font-mono text-2xl"><span className="size-3 animate-pulse rounded-full bg-accent" />{clock(rec.seconds)}</span>
            <Button tone="danger" onClick={rec.stop}><Square size={15} /> Stop recording</Button>
          </>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            <Button tone="primary" disabled={disabled} onClick={() => void rec.start((b) => onAudio(b, 'recording'))}><Mic size={16} /> Record</Button>
            <Button tone="outline" disabled={disabled} onClick={() => fileRef.current?.click()}><FileAudio size={16} /> Choose file</Button>
          </div>
        )}
        <p className="font-mono text-[11px] text-ink-3">MP3 · WAV · M4A · OGG · MP4/WebM video — processed locally</p>
      </div>
      <input ref={fileRef} type="file" accept="audio/*,video/*" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; if (f) onAudio(f, f.name); e.target.value = '' }} />
      {rec.error && <Notice tone="error">{rec.error}</Notice>}
    </div>
  )
}
