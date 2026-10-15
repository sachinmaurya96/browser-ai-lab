import { useCallback, useEffect, useRef, useState } from 'react'

/** Decode any browser-playable audio/video file to mono Float32 PCM. */
export async function decodeAudio(blob: Blob, sampleRate = 16000): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate })
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    if (buf.numberOfChannels === 1) return buf.getChannelData(0)
    const out = new Float32Array(buf.length)
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c)
      for (let i = 0; i < ch.length; i++) out[i] += ch[i] / buf.numberOfChannels
    }
    return out
  } finally {
    void ctx.close()
  }
}

/** 16-bit PCM WAV encoder, so generated speech can be downloaded. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true))
  return new Blob([view], { type: 'audio/wav' })
}

/** Microphone recorder built on MediaRecorder. */
export function useRecorder() {
  const rec = useRef<MediaRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!recording) return
    const t0 = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 250)
    return () => clearInterval(id)
  }, [recording])

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), [])

  const start = useCallback(async (onDone: (blob: Blob) => void) => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const r = new MediaRecorder(stream)
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        onDone(new Blob(chunks, { type: r.mimeType }))
      }
      rec.current = r
      r.start()
      setSeconds(0)
      setRecording(true)
    } catch (e) {
      setError((e as DOMException).name === 'NotAllowedError' ? 'Microphone permission was blocked.' : (e as Error).message)
    }
  }, [])

  const stop = useCallback(() => {
    rec.current?.stop()
    rec.current = null
    setRecording(false)
  }, [])

  return { recording, seconds, error, start, stop }
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
