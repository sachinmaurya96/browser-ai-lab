import { useEffect, useRef, useState } from 'react'

/**
 * Sample-accurate multitrack playback on one AudioContext. Every track gets its
 * own AudioBufferSourceNode, all started at the same context time, so stems
 * cannot drift apart. Gains change live without restarting playback.
 */
export class Transport {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers: AudioBuffer[] = []
  private gains: number[] = []
  private gainNodes: GainNode[] = []
  private sources: AudioBufferSourceNode[] = []
  private startedAt = 0
  private offset = 0
  private until: number | null = null
  private listeners = new Set<() => void>()
  playing = false
  /** Loop back to `loopStart` instead of stopping at `until`. */
  loop = false
  private loopStart = 0

  get duration() {
    return this.buffers[0]?.duration ?? 0
  }

  get time() {
    if (!this.playing || !this.ctx) return this.offset
    // Sources start a few ms in the future, so elapsed time can briefly be negative.
    return Math.min(this.duration, this.offset + Math.max(0, this.ctx.currentTime - this.startedAt))
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach((f) => f())
  }

  private context() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'playback' })
      // A transparent brick-wall limiter: inaudible on a normal mix, but stops
      // boosted stems from clipping the speakers during playback.
      const limiter = this.ctx.createDynamicsCompressor()
      limiter.threshold.value = -1
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.002
      limiter.release.value = 0.1
      this.master = this.ctx.createGain()
      this.master.connect(limiter).connect(this.ctx.destination)
    }
    return this.ctx
  }

  /** Replace the tracks. Playback stops and the position is kept where possible. */
  setTracks(buffers: AudioBuffer[], gains = buffers.map(() => 1)) {
    this.stopSources()
    this.playing = false
    this.buffers = buffers
    this.gains = gains.slice()
    this.gainNodes.forEach((g) => g.disconnect())
    this.gainNodes = []
    this.offset = Math.min(this.offset, this.duration)
    this.notify()
  }

  setGain(i: number, value: number) {
    this.gains[i] = value
    const node = this.gainNodes[i]
    if (node && this.ctx) node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.015)
  }

  async play(from = this.time, until: number | null = null) {
    if (!this.buffers.length) return
    const ctx = this.context()
    await ctx.resume()
    this.stopSources()
    if (from >= this.duration - 0.01) from = 0
    this.offset = Math.max(0, from)
    this.loopStart = this.offset
    this.until = until
    if (this.gainNodes.length !== this.buffers.length) {
      this.gainNodes.forEach((g) => g.disconnect())
      this.gainNodes = this.buffers.map((_, i) => {
        const g = ctx.createGain()
        g.gain.value = this.gains[i] ?? 1
        g.connect(this.master!)
        return g
      })
    }
    const at = ctx.currentTime + 0.03
    const length = until === null ? undefined : Math.max(0, until - this.offset)
    this.sources = this.buffers.map((b, i) => {
      const s = ctx.createBufferSource()
      s.buffer = b
      s.connect(this.gainNodes[i])
      s.start(at, this.offset, length)
      return s
    })
    const lead = this.sources[0]
    lead.onended = () => {
      if (this.sources[0] !== lead) return // replaced by a newer play()
      if (this.loop && this.until !== null) {
        void this.play(this.loopStart, this.until)
        return
      }
      this.offset = this.until ?? this.duration
      if (this.offset >= this.duration) this.offset = 0
      this.playing = false
      this.sources = []
      this.notify()
    }
    this.startedAt = at
    this.playing = true
    this.notify()
  }

  pause() {
    if (!this.playing) return
    this.offset = this.time
    this.stopSources()
    this.playing = false
    this.notify()
  }

  seek(t: number) {
    const target = Math.max(0, Math.min(this.duration, t))
    if (this.playing) void this.play(target, this.until !== null && this.until > target ? this.until : null)
    else {
      this.offset = target
      this.notify()
    }
  }

  private stopSources() {
    for (const s of this.sources) {
      s.onended = null
      try {
        s.stop()
      } catch {
        /* never started */
      }
      s.disconnect()
    }
    this.sources = []
  }

  dispose() {
    this.stopSources()
    this.listeners.clear()
    this.buffers = []
    void this.ctx?.close()
    this.ctx = null
  }
}

/** One Transport per component, disposed on unmount. */
export function useTransport() {
  const ref = useRef<Transport | null>(null)
  if (!ref.current) ref.current = new Transport()
  const t = ref.current
  const [, force] = useState(0)
  useEffect(() => t.subscribe(() => force((n) => n + 1)), [t])
  useEffect(() => () => t.dispose(), [t])
  return t
}

/** Current playback position, refreshed every animation frame while playing. */
export function usePlayhead(t: Transport) {
  const [time, setTime] = useState(t.time)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setTime(t.time)
      if (t.playing) raf = requestAnimationFrame(tick)
    }
    const unsub = t.subscribe(() => {
      cancelAnimationFrame(raf)
      tick()
    })
    tick()
    return () => {
      unsub()
      cancelAnimationFrame(raf)
    }
  }, [t])
  return time
}
