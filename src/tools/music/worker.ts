/// <reference lib="webworker" />
/**
 * Hybrid Transformer Demucs (htdemucs / htdemucs_6s) in the browser.
 *
 *   stereo 44.1 kHz → normalise → 7.8 s segments → STFT → net → iSTFT + wave → overlap-add
 *
 * The graphs come from RabiatS/audio-playground-models (MIT, exported from
 * facebookresearch/demucs). Only the network is in the graph; the DSP lives in
 * ./demucs.ts. One worker hosts one model, so switching models spawns a new
 * worker and the old one's memory is released with it.
 */
import * as ort from 'onnxruntime-web'
import { serve } from '../../lib/engine'
import { cachedFetch } from '../../lib/fetchCache'
import type { Device } from '../../lib/protocol'
import { CancelledError, separate, type DemucsConfig, type RunSegment } from './demucs'

const REPO = 'https://huggingface.co/RabiatS/audio-playground-models/resolve/main'

export type DemucsModelId = 'htdemucs' | 'htdemucs_6s'

export interface SeparatorConfig {
  model: DemucsModelId
}

export interface SeparateInput {
  left: Float32Array
  right: Float32Array
}

export interface SeparateOutput {
  sources: string[]
  stems: { left: Float32Array; right: Float32Array }[]
  rate: number
  device: Device
}

export interface SeparateEvent {
  done: number
  total: number
}

interface Loaded {
  cfg: DemucsConfig
  session: ort.InferenceSession
  device: Device
}

let cancelRequested = false

function runner(cfg: DemucsConfig, session: ort.InferenceSession): RunSegment {
  const L = cfg.segment_samples
  const F = cfg.nfft / 2
  return async (mix, mag) => {
    const out = await session.run({
      mix: new ort.Tensor('float32', mix, [1, 2, L]),
      mag: new ort.Tensor('float32', mag, [1, 4, F, cfg.frames]),
    })
    const spec = (await out.spec.getData()) as Float32Array
    const wave = (await out.wave.getData()) as Float32Array
    out.spec.dispose()
    out.wave.dispose()
    return { spec, wave }
  }
}

/**
 * GPU drivers occasionally run a graph without error but return wrong
 * numbers. Separate one synthetic segment and require the stems to add back
 * up to the input: a healthy run gives 26–40 dB, broken output ≤ 0 dB.
 */
async function selfTest(cfg: DemucsConfig, session: ort.InferenceSession): Promise<boolean> {
  const n = cfg.samplerate * 4
  const l = new Float32Array(n)
  const r = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / cfg.samplerate
    const kick = Math.exp(-((t * 2) % 1) * 30) * Math.sin(2 * Math.PI * 55 * t)
    const tone = 0.2 * (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t))
    l[i] = 0.5 * kick + tone
    r[i] = 0.5 * kick + 0.8 * tone
  }
  const stems = await separate(cfg, l, r, runner(cfg, session))
  let err = 0
  let sig = 0
  for (let i = 0; i < n; i++) {
    let a = 0
    let b = 0
    for (const [sl, sr] of stems) {
      a += sl[i]
      b += sr[i]
    }
    err += (a - l[i]) ** 2 + (b - r[i]) ** 2
    sig += l[i] ** 2 + r[i] ** 2
  }
  const db = 10 * Math.log10(sig / err)
  return Number.isFinite(db) && db > 10
}

/**
 * True only for a real GPU. When the GPU is blocklisted or disabled, Chrome
 * still offers WebGPU through SwiftShader (CPU emulation), which runs this
 * network far slower than ONNX Runtime's own WebAssembly kernels.
 */
async function hardwareGpu(): Promise<boolean> {
  try {
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) return false
    const info = adapter.info as GPUAdapterInfo & { isFallbackAdapter?: boolean }
    const fallback = info.isFallbackAdapter ?? (adapter as GPUAdapter & { isFallbackAdapter?: boolean }).isFallbackAdapter
    return !fallback && !/swiftshader/i.test(`${info.vendor} ${info.architecture} ${info.description}`)
  } catch {
    return false
  }
}

const friendly = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  if (/alloc|memory|out of|OOM/i.test(msg)) return 'Not enough memory to run the separation model. Close other tabs (especially other AI tools), or trim the song shorter, and try again.'
  return msg
}

serve<Loaded>({
  async boot({ gpu, progress, config }) {
    const { model } = config as SeparatorConfig
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1
    const report = (file: string) => (loaded: number, total: number) => progress({ status: 'progress', file, loaded, total })

    try {
      const cfg = JSON.parse(new TextDecoder().decode(await cachedFetch(`${REPO}/${model}.json`, report(`${model}.json`)))) as DemucsConfig
      const bytes = new Uint8Array(await cachedFetch(`${REPO}/${model}.onnx`, report(`${model}.onnx`)))

      if (gpu.webgpu && (await hardwareGpu())) {
        let session: ort.InferenceSession | null = null
        try {
          session = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' })
          if (await selfTest(cfg, session)) return { model: { cfg, session, device: 'webgpu' }, device: 'webgpu' }
          console.warn('[music] WebGPU output failed the self-test, using CPU')
        } catch (e) {
          console.warn('[music] WebGPU session failed, using CPU', e)
        }
        await session?.release()
      }
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
      return { model: { cfg, session, device: 'wasm' }, device: 'wasm' }
    } catch (e) {
      throw new Error(friendly(e))
    }
  },

  stop() {
    cancelRequested = true
  },

  ops: {
    async separate({ cfg, session, device }, input: SeparateInput, ctx): Promise<SeparateOutput> {
      cancelRequested = false
      try {
        const stems = await separate(cfg, input.left, input.right, runner(cfg, session), {
          cancelled: () => cancelRequested,
          onSegment: (done, total) => ctx.emit({ done, total } satisfies SeparateEvent),
        })
        ctx.transfer.push(...stems.flatMap(([l, r]) => [l.buffer, r.buffer]))
        return { sources: cfg.sources, stems: stems.map(([left, right]) => ({ left, right })), rate: cfg.samplerate, device }
      } catch (e) {
        if (e instanceof CancelledError) throw e
        throw new Error(friendly(e))
      }
    },
  },
})
