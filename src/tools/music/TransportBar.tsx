import type { ReactNode } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { Button } from '../../ui/kit'
import { timecode } from './audio'
import type { Transport } from './transport'

export function TransportBar({ transport, time, onPlay, children }: { transport: Transport; time: number; onPlay?(): void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        tone="primary"
        size="sm"
        aria-label={transport.playing ? 'Pause' : 'Play'}
        onClick={() => {
          if (transport.playing) return transport.pause()
          onPlay?.()
          void transport.play()
        }}
      >
        {transport.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        {transport.playing ? 'Pause' : 'Play'}
      </Button>
      <Button size="sm" tone="ghost" aria-label="Stop" onClick={() => { transport.pause(); transport.seek(0) }}>
        <Square size={14} fill="currentColor" />
      </Button>
      <span className="font-mono text-sm tabular-nums">
        {timecode(time)} <span className="text-ink-3">/ {timecode(transport.duration)}</span>
      </span>
      {children}
    </div>
  )
}
