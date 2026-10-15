/// <reference lib="webworker" />
/**
 * Piper (VITS) voices trained natively on Hindi. Text → espeak-ng phoneme ids
 * → one ONNX call → 22 kHz audio. Voices download on first use and are kept
 * in Cache Storage.
 */
import * as ort from 'onnxruntime-web'
import { serve } from '../../lib/engine'
import { espeak } from '../../lib/espeak'
import type { Device } from '../../lib/protocol'
import { PIPER_VOICES } from './piperVoices'

const REPO = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'


export interface PiperInput {
  text: string
  voice: string
  speed: number
  /** 0–1: lower = steadier, crisper delivery; higher = more expressive. */
  expressiveness: number
}

export interface PiperEvent {
  stage: 'download' | 'speak'
  done: number
  total: number
}

interface Loaded {
  session: ort.InferenceSession
  config: { audio: { sample_rate: number }; espeak: { voice: string }; inference: { noise_scale: number; length_scale: number; noise_w: number }; speaker_id_map: Record<string, number> }
}

type Engine = { voices: Map<string, Promise<Loaded>> }

/** Fetch with Cache Storage persistence and byte progress. */
async function cachedFetch(url: string, onBytes: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try {
    cache = await caches.open('piper-voices')
    const hit = await cache.match(url)
    if (hit) return hit.arrayBuffer()
  } catch {
    /* Cache Storage unavailable (private mode); just download */
  }
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url.split('/').pop()}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    loaded += value.length
    onBytes(loaded, total)
  }
  const buf = new Uint8Array(loaded)
  let o = 0
  for (const p of parts) {
    buf.set(p, o)
    o += p.length
  }
  try {
    await cache?.put(url, new Response(buf))
  } catch {
    /* quota exceeded: fine, it just won't be cached */
  }
  return buf.buffer
}

function sentences(text: string): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    const parts = para.match(/[^.!?।॥]+[.!?।॥]*\s*/g) ?? [para]
    let buf = ''
    for (const s of parts) {
      if ((buf + s).length > 250 && buf) {
        out.push(buf.trim())
        buf = ''
      }
      buf += s
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out
}

serve<Engine>({
  async boot() {
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2)
    // Piper models are small VITS nets; CPU/WASM is fast and reliable for them.
    return { model: { voices: new Map() }, device: 'wasm' as Device }
  },
  ops: {
    async speak(engine, input: PiperInput, ctx) {
      const voice = PIPER_VOICES.find((v) => v.id === input.voice)
      if (!voice) throw new Error(`Unknown voice ${input.voice}`)

      if (!engine.voices.has(voice.id)) {
        const load = (async (): Promise<Loaded> => {
          const config = JSON.parse(new TextDecoder().decode(await cachedFetch(`${REPO}/${voice.path}.onnx.json`, () => undefined)))
          const bytes = await cachedFetch(`${REPO}/${voice.path}.onnx`, (done, total) => ctx.emit({ stage: 'download', done, total } satisfies PiperEvent))
          const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] })
          return { session, config }
        })()
        engine.voices.set(voice.id, load)
        load.catch(() => engine.voices.delete(voice.id))
      }
      const { session, config } = await engine.voices.get(voice.id)!

      const parts = sentences(input.text)
      const pcm: Float32Array[] = []
      const rate = config.audio.sample_rate
      const e = Math.max(0, Math.min(1, input.expressiveness))
      for (let i = 0; i < parts.length; i++) {
        ctx.emit({ stage: 'speak', done: i, total: parts.length } satisfies PiperEvent)
        const { phoneme_ids } = await espeak(parts[i], config.espeak.voice)
        const feeds: Record<string, ort.Tensor> = {
          input: new ort.Tensor('int64', BigInt64Array.from(phoneme_ids.map(BigInt)), [1, phoneme_ids.length]),
          input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(phoneme_ids.length)]), [1]),
          // [noise_scale, length_scale, noise_w]: noise controls variation;
          // length_scale > 1 is slower. Scale the voice's tuned defaults.
          scales: new ort.Tensor('float32', Float32Array.from([config.inference.noise_scale * (0.4 + e), config.inference.length_scale / input.speed, config.inference.noise_w * (0.4 + e)]), [3]),
        }
        if (Object.keys(config.speaker_id_map ?? {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1])
        const { output } = await session.run(feeds)
        pcm.push(output.data as Float32Array, new Float32Array(Math.round(rate * 0.15)))
      }
      const all = new Float32Array(pcm.reduce((s, p) => s + p.length, 0))
      let o = 0
      for (const p of pcm) {
        all.set(p, o)
        o += p.length
      }
      ctx.transfer.push(all.buffer)
      return { audio: all, rate }
    },
  },
})
