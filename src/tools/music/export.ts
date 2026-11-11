import { resample, type Pcm } from './audio'
import type { Mp3Reply, Mp3Request } from './mp3.worker'

export type ExportFormat = 'wav16' | 'wav24' | 'mp3'

export const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'wav16', label: 'WAV 16-bit', hint: 'Lossless, CD quality' },
  { value: 'wav24', label: 'WAV 24-bit', hint: 'Lossless, studio quality' },
  { value: 'mp3', label: 'MP3 320k', hint: 'Small file, lossy' },
]

export const extension = (f: ExportFormat) => (f === 'mp3' ? 'mp3' : 'wav')

/** Interleaved PCM WAV with any number of channels, 16- or 24-bit, TPDF-dithered. */
export function encodeWav(p: Pcm, bits: 16 | 24 = 16): Blob {
  const ch = p.channels.length
  const n = p.channels[0]?.length ?? 0
  const bytes = bits / 8
  const view = new DataView(new ArrayBuffer(44 + n * ch * bytes))
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + n * ch * bytes, true)
  str(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, ch, true)
  view.setUint32(24, p.sampleRate, true)
  view.setUint32(28, p.sampleRate * ch * bytes, true)
  view.setUint16(32, ch * bytes, true)
  view.setUint16(34, bits, true)
  str(36, 'data')
  view.setUint32(40, n * ch * bytes, true)
  const max = bits === 16 ? 0x7fff : 0x7fffff
  let o = 44
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const dither = (Math.random() - Math.random()) / max
      const s = Math.round(Math.max(-1, Math.min(1, p.channels[c][i] + dither)) * max)
      if (bits === 16) view.setInt16(o, s, true)
      else {
        view.setUint8(o, s & 0xff)
        view.setUint8(o + 1, (s >> 8) & 0xff)
        view.setUint8(o + 2, (s >> 16) & 0xff)
      }
      o += bytes
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}

const MP3_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000]

export async function encodeMp3(p: Pcm, onProgress?: (ratio: number) => void): Promise<Blob> {
  const src = MP3_RATES.includes(p.sampleRate) ? p : await resample(p, 44100)
  const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' })
  try {
    return await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<Mp3Reply>) => {
        const m = e.data
        if (m.kind === 'progress') onProgress?.(m.ratio)
        else if (m.kind === 'done') resolve(m.blob)
        else reject(new Error(`MP3 encoding failed: ${m.message}`))
      }
      worker.onerror = (e) => reject(new Error(`MP3 encoder crashed: ${e.message}`))
      worker.postMessage({ channels: src.channels, sampleRate: src.sampleRate, kbps: 320 } satisfies Mp3Request)
    })
  } finally {
    worker.terminate()
  }
}

export async function encode(p: Pcm, format: ExportFormat, onProgress?: (ratio: number) => void): Promise<Blob> {
  if (format === 'mp3') return encodeMp3(p, onProgress)
  return encodeWav(p, format === 'wav24' ? 24 : 16)
}
