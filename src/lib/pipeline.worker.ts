/// <reference lib="webworker" />
/**
 * General-purpose worker that hosts any Transformers.js `pipeline()`.
 * The task and model come from the `configure` message, so most tools can
 * share this one file instead of each shipping their own worker.
 */
import { pipeline } from '@huggingface/transformers'
import { serve } from './engine'
import type { Device } from './protocol'

export interface PipelineConfig {
  task: string
  model: string
  /** Per-backend precision, e.g. { webgpu: 'fp32', wasm: 'q8' }. */
  dtype?: Partial<Record<Device, string | Record<string, string>>>
  /** Set false for models that misbehave on WebGPU. */
  webgpu?: boolean
}

export interface PipelineCall {
  args: unknown[]
  options?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipe = any

/** Convert library objects (RawImage, RawAudio, Tensor) into cloneable data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function plain(x: any, transfer: Transferable[]): unknown {
  if (x == null || typeof x !== 'object') return x
  if (ArrayBuffer.isView(x)) return x
  if (Array.isArray(x)) return x.map((v) => plain(v, transfer))
  if ('width' in x && 'height' in x && 'channels' in x && 'data' in x) {
    return { width: x.width, height: x.height, channels: x.channels, data: x.data }
  }
  if ('sampling_rate' in x && ('audio' in x || 'data' in x)) {
    return { audio: x.audio ?? x.data, sampling_rate: x.sampling_rate }
  }
  if ('dims' in x && 'data' in x) return { dims: x.dims, data: x.data }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(x)) out[k] = plain(v, transfer)
  return out
}

serve<Pipe>({
  async boot({ gpu, progress, config }: { gpu: { webgpu: boolean }; progress: (i: unknown) => void; config: PipelineConfig }) {
    const tryDevice = async (device: Device) =>
      pipeline(config.task as never, config.model, {
        device,
        dtype: config.dtype?.[device] as never,
        progress_callback: progress,
      })
    if (config.webgpu !== false && gpu.webgpu) {
      try {
        return { model: await tryDevice('webgpu'), device: 'webgpu' as Device }
      } catch {
        // Fall through to CPU when the GPU session can't be created.
      }
    }
    return { model: await tryDevice('wasm'), device: 'wasm' as Device }
  },
  ops: {
    async run(pipe, input: PipelineCall, ctx) {
      const out = await pipe(...input.args, input.options ?? {})
      return plain(out, ctx.transfer)
    },
  },
})
