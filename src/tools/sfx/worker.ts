/// <reference lib="webworker" />
/**
 * Stable Audio Open Small (distilled) in the browser.
 *
 *   prompt → T5 tokenizer → cond.onnx → dit.onnx ×8 (ping-pong) → dec.onnx → 44.1 kHz stereo
 *
 * Graph names, shapes and the sampling schedule follow the export script in
 * atauser001/stable-audio-open-small-onnx. The conditioning graph runs on CPU
 * (the model card measured it far faster there); DiT and decoder use WebGPU
 * when available.
 */
import * as ort from 'onnxruntime-web'
import { T5Tokenizer } from '@huggingface/transformers'
import { serve } from '../../lib/engine'
import { cachedFetch } from '../../lib/fetchCache'
import type { Device } from '../../lib/protocol'

const REPO = 'https://huggingface.co/atauser001/stable-audio-open-small-onnx/resolve/main'
const LATENTS = 256 // DiT is exported at the full 11.89 s length
const CHANNELS = 64
const TOKENS = 64
const RATE = 44100
const HOP = 2048 // audio samples per latent frame
export const MAX_SECONDS = (LATENTS * HOP) / RATE // ≈ 11.89
const STEPS = 8

export interface SfxInput {
  prompt: string
  seconds: number
  seed: number
}

export interface SfxOutput {
  left: Float32Array
  right: Float32Array
  rate: number
}

export interface SfxEvent {
  stage: 'step' | 'decode'
  done: number
  total: number
}

interface Loaded {
  tok: T5Tokenizer
  cond: ort.InferenceSession
  dit: ort.InferenceSession
  dec: ort.InferenceSession
}

/** Seeded PRNG (mulberry32) + Box-Muller, so a seed reproduces a sound. */
function gaussian(seed: number) {
  let a = seed >>> 0
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return (n: number) => {
    const out = new Float32Array(n)
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(uniform(), 1e-12)
      const r = Math.sqrt(-2 * Math.log(u))
      const th = 2 * Math.PI * uniform()
      out[i] = r * Math.cos(th)
      if (i + 1 < n) out[i + 1] = r * Math.sin(th)
    }
    return out
  }
}

/** linspace(1→0, 9) mapped through sigmoid(8.2t − 2), endpoints pinned. */
function schedule(): number[] {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = 1 - i / STEPS
    if (t >= 1) return 1
    if (t <= 0) return 0
    return 1 / (1 + Math.exp(-(8.2 * t - 2)))
  })
}

async function session(bytes: ArrayBuffer, prefer: Device): Promise<{ s: ort.InferenceSession; device: Device }> {
  if (prefer === 'webgpu') {
    try {
      return { s: await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['webgpu'] }), device: 'webgpu' }
    } catch (e) {
      console.warn('[sfx] WebGPU session failed, using CPU', e)
    }
  }
  return { s: await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] }), device: 'wasm' }
}

serve<Loaded>({
  async boot({ gpu, progress }) {
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2)
    const report = (file: string) => (loaded: number, total: number) => progress({ status: 'progress', file, loaded, total })

    try {
      const tokJson = JSON.parse(new TextDecoder().decode(await cachedFetch(`${REPO}/tokenizer.json`, report('tokenizer.json'))))
      const tok = new T5Tokenizer(tokJson, { model_max_length: 512, eos_token: '</s>', pad_token: '<pad>', unk_token: '<unk>' })

      // Load one graph at a time and drop the raw bytes before the next, to
      // keep peak memory as low as possible.
      const cond = (await session(await cachedFetch(`${REPO}/cond.onnx`, report('cond.onnx')), 'wasm')).s
      const ditR = await session(await cachedFetch(`${REPO}/dit.onnx`, report('dit.onnx')), gpu.webgpu ? 'webgpu' : 'wasm')
      const dec = (await session(await cachedFetch(`${REPO}/dec.onnx`, report('dec.onnx')), ditR.device)).s
      return { model: { tok, cond, dit: ditR.s, dec }, device: ditR.device }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(/alloc|memory|out of/i.test(msg) ? 'Not enough memory to load the 2 GB sound model. Close other tabs (especially other AI tools) and try again in Chrome or Edge on a desktop.' : msg)
    }
  },

  ops: {
    async generate({ tok, cond, dit, dec }, input: SfxInput, ctx): Promise<SfxOutput> {
      const seconds = Math.min(MAX_SECONDS, Math.max(0.5, input.seconds))

      // 1. Text + duration conditioning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enc: any = tok(input.prompt, { padding: 'max_length', truncation: true, max_length: TOKENS })
      const ids = BigInt64Array.from(Array.from(enc.input_ids.data as ArrayLike<bigint | number>, (v) => BigInt(v)))
      const mask = BigInt64Array.from(Array.from(enc.attention_mask.data as ArrayLike<bigint | number>, (v) => BigInt(v)))
      const c = await cond.run({
        input_ids: new ort.Tensor('int64', ids, [1, TOKENS]),
        attention_mask: new ort.Tensor('int64', mask, [1, TOKENS]),
        seconds_total: new ort.Tensor('float32', Float32Array.from([seconds]), [1]),
      })

      // 2. Eight ping-pong denoising steps
      const tt = schedule()
      const randn = gaussian(input.seed)
      const n = CHANNELS * LATENTS
      let x = randn(n)
      for (let i = 0; i < STEPS; i++) {
        ctx.emit({ stage: 'step', done: i, total: STEPS } satisfies SfxEvent)
        const out = await dit.run({
          x: new ort.Tensor('float32', x, [1, CHANNELS, LATENTS]),
          t: new ort.Tensor('float32', Float32Array.from([tt[i]]), [1]),
          cross: c.cross,
          global: c.global,
        })
        const v = out.v.data as Float32Array
        const noise = randn(n)
        const next = new Float32Array(n)
        for (let k = 0; k < n; k++) {
          const den = x[k] - tt[i] * v[k]
          next[k] = (1 - tt[i + 1]) * den + tt[i + 1] * noise[k]
        }
        x = next
      }

      // 3. Decode only the frames needed for the requested length
      ctx.emit({ stage: 'decode', done: 0, total: 1 } satisfies SfxEvent)
      const frames = Math.min(LATENTS, Math.ceil((seconds * RATE) / HOP))
      const z = new Float32Array(CHANNELS * frames)
      for (let ch = 0; ch < CHANNELS; ch++) z.set(x.subarray(ch * LATENTS, ch * LATENTS + frames), ch * frames)
      const { audio } = await dec.run({ z: new ort.Tensor('float32', z, [1, CHANNELS, frames]) })
      const total = audio.dims[2]
      const data = audio.data as Float32Array
      const len = Math.min(total, Math.round(seconds * RATE))

      // Peak-normalise to -1 dBFS and add 10 ms fades so clips start/end cleanly.
      let peak = 1e-6
      for (let k = 0; k < len; k++) peak = Math.max(peak, Math.abs(data[k]), Math.abs(data[total + k]))
      const gain = 0.89 / peak
      const fade = Math.round(RATE * 0.01)
      const left = new Float32Array(len)
      const right = new Float32Array(len)
      for (let k = 0; k < len; k++) {
        const env = Math.min(1, k / fade, (len - 1 - k) / fade)
        left[k] = data[k] * gain * env
        right[k] = data[total + k] * gain * env
      }
      ctx.transfer.push(left.buffer, right.buffer)
      return { left, right, rate: RATE }
    },
  },
})
