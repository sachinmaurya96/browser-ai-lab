/// <reference lib="webworker" />
/** MP3 encoding off the main thread (LAME via @breezystack/lamejs, LGPL-3.0). */
import { Mp3Encoder } from '@breezystack/lamejs'

export interface Mp3Request {
  channels: Float32Array[]
  sampleRate: number
  kbps: number
}

export type Mp3Reply = { kind: 'progress'; ratio: number } | { kind: 'done'; blob: Blob } | { kind: 'fail'; message: string }

const toInt16 = (d: Float32Array, from: number, to: number) => {
  const out = new Int16Array(to - from)
  for (let i = from; i < to; i++) {
    const s = Math.max(-1, Math.min(1, d[i]))
    out[i - from] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

self.onmessage = (e: MessageEvent<Mp3Request>) => {
  const post = (m: Mp3Reply) => self.postMessage(m)
  try {
    const { channels, sampleRate, kbps } = e.data
    const stereo = channels.length > 1
    const enc = new Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps)
    const n = channels[0].length
    const block = 1152 * 64
    const parts: BlobPart[] = []
    for (let o = 0; o < n; o += block) {
      const end = Math.min(n, o + block)
      const l = toInt16(channels[0], o, end)
      const out = stereo ? enc.encodeBuffer(l, toInt16(channels[1], o, end)) : enc.encodeBuffer(l)
      if (out.length) parts.push(out.slice())
      post({ kind: 'progress', ratio: end / n })
    }
    const tail = enc.flush()
    if (tail.length) parts.push(tail.slice())
    post({ kind: 'done', blob: new Blob(parts, { type: 'audio/mpeg' }) })
  } catch (err) {
    post({ kind: 'fail', message: err instanceof Error ? err.message : String(err) })
  }
}
