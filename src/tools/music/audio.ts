/**
 * Plain-PCM helpers for the music studio. Audio is held as one Float32Array per
 * channel plus a sample rate, so edits, mixing and export never depend on a
 * live AudioContext.
 */

export interface Pcm {
  channels: Float32Array[]
  sampleRate: number
}

export const MAX_FILE_MB = 300

export const pcmLength = (p: Pcm) => p.channels[0]?.length ?? 0
export const pcmDuration = (p: Pcm) => pcmLength(p) / p.sampleRate

/**
 * Read the stored sample rate from WAV, FLAC or MP3 headers. decodeAudioData
 * always resamples to its context's rate, so decoding at the file's own rate
 * keeps trims and exports bit-faithful to the original where possible.
 */
export function sniffSampleRate(bytes: ArrayBuffer): number | null {
  const u8 = new Uint8Array(bytes)
  const v = new DataView(bytes)
  const tag = (o: number, s: string) => [...s].every((c, i) => u8[o + i] === c.charCodeAt(0))
  if (u8.length < 64) return null
  if (tag(0, 'RIFF') && tag(8, 'WAVE')) {
    for (let o = 12; o + 8 <= u8.length; ) {
      const size = v.getUint32(o + 4, true)
      if (tag(o, 'fmt ')) return v.getUint32(o + 12, true)
      o += 8 + size + (size & 1)
    }
    return null
  }
  if (tag(0, 'fLaC')) {
    // STREAMINFO is always the first metadata block; the rate is 20 bits at byte 18.
    return (u8[18] << 12) | (u8[19] << 4) | (u8[20] >> 4)
  }
  let o = 0
  if (tag(0, 'ID3')) o = 10 + ((u8[6] & 0x7f) << 21 | (u8[7] & 0x7f) << 14 | (u8[8] & 0x7f) << 7 | (u8[9] & 0x7f))
  for (const end = Math.min(u8.length - 4, o + 65536); o < end; o++) {
    if (u8[o] !== 0xff || (u8[o + 1] & 0xe0) !== 0xe0) continue
    const version = (u8[o + 1] >> 3) & 3 // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (u8[o + 1] >> 1) & 3
    const idx = (u8[o + 2] >> 2) & 3
    if (version === 1 || layer === 0 || idx === 3) continue
    const base = [44100, 48000, 32000][idx]
    return version === 3 ? base : version === 2 ? base / 2 : base / 4
  }
  return null
}

/** Decode any browser-playable audio (or video soundtrack) at its native rate where known. */
export async function decodeFile(file: Blob): Promise<Pcm> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`That file is over ${MAX_FILE_MB} MB. Please pick a shorter or more compressed file.`)
  const bytes = await file.arrayBuffer()
  const rate = sniffSampleRate(bytes) ?? 44100
  let ctx: OfflineAudioContext
  try {
    ctx = new OfflineAudioContext(2, 1, Math.min(192000, Math.max(8000, rate)))
  } catch {
    ctx = new OfflineAudioContext(2, 1, 44100)
  }
  let buf: AudioBuffer
  try {
    buf = await ctx.decodeAudioData(bytes)
  } catch {
    throw new Error("This browser can't decode that file. Try MP3, WAV, FLAC, OGG or M4A.")
  }
  if (!buf.length) throw new Error('That file contains no audio.')
  if (buf.numberOfChannels <= 2) return fromAudioBuffer(buf)
  // Fold surround down to stereo rather than dropping channels.
  const channels = [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()]
  for (let c = 2; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    const target = channels[c % 2]
    for (let i = 0; i < d.length; i++) target[i] += d[i] * 0.5
  }
  return pcmFromChannels(channels, buf.sampleRate)
}

/** Band-limited resampling through the browser's own resampler. */
export async function resample(p: Pcm, rate: number): Promise<Pcm> {
  if (p.sampleRate === rate) return p
  const length = Math.ceil(pcmLength(p) * (rate / p.sampleRate))
  const ctx = new OfflineAudioContext(p.channels.length, length, rate)
  const src = ctx.createBufferSource()
  src.buffer = toAudioBuffer(p)
  src.connect(ctx.destination)
  src.start()
  return fromAudioBuffer(await ctx.startRendering())
}

/** Stereo view of any PCM (mono is duplicated, as Demucs does). */
export const asStereo = (p: Pcm): [Float32Array, Float32Array] => [p.channels[0], p.channels[1] ?? p.channels[0]]

// A Pcm made from an AudioBuffer shares its memory, so playback never needs a
// second copy of a long song or a set of stems.
const buffers = new WeakMap<Pcm, AudioBuffer>()

export function fromAudioBuffer(buf: AudioBuffer): Pcm {
  const p = { channels: Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), sampleRate: buf.sampleRate }
  buffers.set(p, buf)
  return p
}

/** Copy planar channels into a playable AudioBuffer and use it as the backing store. */
export function pcmFromChannels(channels: Float32Array[], sampleRate: number): Pcm {
  const buf = new AudioBuffer({ length: Math.max(1, channels[0].length), numberOfChannels: channels.length, sampleRate })
  channels.forEach((d, c) => buf.copyToChannel(d as Float32Array<ArrayBuffer>, c))
  return fromAudioBuffer(buf)
}

export function toAudioBuffer(p: Pcm): AudioBuffer {
  const cached = buffers.get(p)
  if (cached) return cached
  const buf = new AudioBuffer({ length: Math.max(1, pcmLength(p)), numberOfChannels: p.channels.length, sampleRate: p.sampleRate })
  p.channels.forEach((d, c) => buf.copyToChannel(d as Float32Array<ArrayBuffer>, c))
  buffers.set(p, buf)
  return buf
}

// ---------- Edits (all return new PCM; inputs are never mutated) ----------

const clampRange = (p: Pcm, start: number, end: number) => {
  const n = pcmLength(p)
  const a = Math.max(0, Math.min(n, Math.round(start * p.sampleRate)))
  const b = Math.max(a, Math.min(n, Math.round(end * p.sampleRate)))
  return [a, b] as const
}

/** Keep only [start, end) seconds. */
export function slice(p: Pcm, start: number, end: number): Pcm {
  const [a, b] = clampRange(p, start, end)
  return { channels: p.channels.map((d) => d.slice(a, b)), sampleRate: p.sampleRate }
}

/** Remove [start, end) seconds, with a short crossfade so the join doesn't click. */
export function cut(p: Pcm, start: number, end: number): Pcm {
  const [a, b] = clampRange(p, start, end)
  const n = pcmLength(p)
  const fade = Math.min(Math.round(p.sampleRate * 0.005), a, n - b)
  const channels = p.channels.map((d) => {
    const out = new Float32Array(n - (b - a))
    out.set(d.subarray(0, a - fade), 0)
    for (let i = 0; i < fade; i++) {
      const t = (i + 0.5) / fade
      out[a - fade + i] = d[a - fade + i] * (1 - t) + d[b - fade + i] * t
    }
    out.set(d.subarray(b), a)
    return out
  })
  return { channels, sampleRate: p.sampleRate }
}

/** Short linear fades at both ends, so exported clips start and stop cleanly. */
export function declick(p: Pcm, ms = 5): Pcm {
  const n = pcmLength(p)
  const f = Math.min(Math.round((p.sampleRate * ms) / 1000), n >> 1)
  return {
    sampleRate: p.sampleRate,
    channels: p.channels.map((d) => {
      const out = d.slice()
      for (let i = 0; i < f; i++) {
        out[i] *= i / f
        out[n - 1 - i] *= i / f
      }
      return out
    }),
  }
}

// ---------- Mixing ----------

export interface MixInput {
  left: Float32Array
  right: Float32Array
  gain: number
}

/**
 * Sum stems with their gains. If the sum would clip, the whole mix is scaled
 * down to −0.3 dBFS (a single gain, so the balance between stems is kept).
 */
export function mixdown(tracks: MixInput[], sampleRate: number): { pcm: Pcm; reducedDb: number } {
  const n = tracks[0]?.left.length ?? 0
  const left = new Float32Array(n)
  const right = new Float32Array(n)
  for (const t of tracks) {
    if (t.gain === 0) continue
    for (let i = 0; i < n; i++) {
      left[i] += t.left[i] * t.gain
      right[i] += t.right[i] * t.gain
    }
  }
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
  const ceiling = 0.966 // −0.3 dBFS
  let reducedDb = 0
  if (peak > ceiling) {
    const g = ceiling / peak
    for (let i = 0; i < n; i++) {
      left[i] *= g
      right[i] *= g
    }
    reducedDb = 20 * Math.log10(g)
  }
  return { pcm: { channels: [left, right], sampleRate }, reducedDb }
}

// ---------- Display ----------

/** Min/max peaks per bucket for one channel, for waveform drawing. */
export function peaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets * 2)
  const size = data.length / buckets
  for (let b = 0; b < buckets; b++) {
    let lo = 0
    let hi = 0
    const end = Math.min(data.length, Math.floor((b + 1) * size))
    for (let i = Math.floor(b * size); i < end; i++) {
      const v = data[i]
      if (v < lo) lo = v
      else if (v > hi) hi = v
    }
    out[b * 2] = lo
    out[b * 2 + 1] = hi
  }
  return out
}

/** Max-abs peaks of the (mono-folded) signal, in the shape wavesurfer expects. */
export function wavesurferPeaks(p: Pcm, buckets = 4000): number[][] {
  return p.channels.map((d) => {
    const size = d.length / buckets
    return Array.from({ length: buckets }, (_, b) => {
      let m = 0
      const end = Math.min(d.length, Math.floor((b + 1) * size))
      for (let i = Math.floor(b * size); i < end; i++) m = Math.max(m, Math.abs(d[i]))
      return m
    })
  })
}

export const timecode = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`
}
