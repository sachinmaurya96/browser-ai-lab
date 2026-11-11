import { useState } from 'react'
import { FilePlus2, Loader2 } from 'lucide-react'
import { useTask } from '../../lib/hooks'
import { ToolIntro } from '../../ui/Shell'
import { Button, Notice } from '../../ui/kit'
import { decodeFile, pcmDuration, timecode, type Pcm } from './audio'
import { AudioCutter } from './AudioCutter'
import { AudioMixer } from './AudioMixer'
import { AudioUploader } from './AudioUploader'
import { useExporter } from './ExportPanel'
import type { ExportFormat } from './export'
import { StemSeparator, type SeparationResult } from './StemSeparator'

/** Undo depth. Each step holds a full copy of the audio, so keep it modest. */
const HISTORY = 8

interface Track {
  name: string
  versions: Pcm[]
  index: number
}

export default function MusicStudioPage() {
  const load = useTask()
  const [track, setTrack] = useState<Track | null>(null)
  const [result, setResult] = useState<(SeparationResult & { from: string }) | null>(null)
  const [separating, setSeparating] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('wav16')
  const exporter = useExporter(format)

  const audio = track ? track.versions[track.index] : null
  const baseName = (track?.name ?? 'audio').replace(/\.[^.]+$/, '') || 'audio'

  const open = (file: File) =>
    load.go(async () => {
      const pcm = await decodeFile(file)
      setTrack({ name: file.name, versions: [pcm], index: 0 })
      setResult(null)
    })

  const edit = (next: Pcm) => {
    if (pcmDuration(next) < 0.01) return load.setError('That edit would leave no audio.')
    setTrack((t) => {
      if (!t) return t
      // Keep the original (for "Original") plus the most recent edits; drop any redo branch.
      const versions = [t.versions[0], ...t.versions.slice(1, t.index + 1).slice(-(HISTORY - 1)), next]
      return { ...t, versions, index: versions.length - 1 }
    })
  }

  return (
    <div className="space-y-6">
      <ToolIntro slug="music-studio">
        {track && (
          <Button size="sm" disabled={separating} onClick={() => { setTrack(null); setResult(null) }}>
            <FilePlus2 size={15} /> New song
          </Button>
        )}
      </ToolIntro>

      {load.error && <Notice tone="error">{load.error}</Notice>}

      {!audio && (
        <>
          <AudioUploader onFile={(f) => void open(f)} disabled={load.busy} />
          {load.busy && (
            <p className="flex items-center gap-2 text-sm text-ink-2"><Loader2 size={15} className="animate-spin" /> Decoding audio…</p>
          )}
          <p className="text-sm text-ink-2">
            Trim, cut and split songs right here with no download. To pull a song apart into vocals, drums, bass and more, the
            studio downloads Meta's Demucs model once (57–86 MB) and runs it on your GPU, or on your CPU if WebGPU isn't available.
          </p>
        </>
      )}

      {track && audio && (
        <>
          <AudioCutter
            audio={audio}
            name={track.name}
            canUndo={track.index > 0}
            edited={track.index > 0}
            onEdit={edit}
            onUndo={() => setTrack((t) => t && { ...t, index: Math.max(0, t.index - 1) })}
            onReset={() => setTrack((t) => t && { ...t, versions: [t.versions[0]], index: 0 })}
            format={format}
            onFormat={setFormat}
            exporter={exporter}
          />

          <StemSeparator
            audio={audio}
            onBusy={setSeparating}
            onResult={(r) => setResult({ ...r, from: track.index > 0 ? `edit (${timecode(r.seconds)})` : `original (${timecode(r.seconds)})` })}
          />

          {result && (
            <>
              <p className="text-xs text-ink-3">
                Stems made from the {result.from} with {result.model.id} on {result.device === 'webgpu' ? 'WebGPU' : 'CPU'}. Editing the audio above
                doesn't change them; separate again to update.
              </p>
              <AudioMixer stems={result.stems} baseName={baseName} modelLabel={result.model.label} format={format} onFormat={setFormat} exporter={exporter} />
            </>
          )}
        </>
      )}

      <p className="text-xs text-ink-3">
        Separation uses Hybrid Transformer Demucs v4 by Meta AI (MIT licence) via ONNX Runtime Web. MP3 export uses LAME
        (LGPL). Everything runs locally: your audio is never uploaded.
      </p>
    </div>
  )
}
