/// <reference lib="webworker" />
import { pipeline } from '@huggingface/transformers'
import { serve } from '../../lib/engine'
import type { Device } from '../../lib/protocol'

const MODEL = 'Xenova/all-MiniLM-L6-v2'
const BATCH = 16

export interface EmbedInput {
  texts: string[]
}

export interface EmbedOutput {
  /** Row-major, L2-normalised vectors: texts.length × dim. */
  data: Float32Array
  dim: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Extractor = any

serve<Extractor>({
  async boot({ gpu, progress }) {
    if (gpu.webgpu) {
      try {
        const extractor = await pipeline('feature-extraction', MODEL, { device: 'webgpu', dtype: 'fp32', progress_callback: progress })
        return { model: extractor, device: 'webgpu' as Device }
      } catch {
        // Some adapters advertise WebGPU but fail to build the session.
      }
    }
    // The model is tiny; quantised CPU inference is quick and has no GPU
    // start-up cost, so WASM is a perfectly good home for it.
    const extractor = await pipeline('feature-extraction', MODEL, { device: 'wasm', dtype: 'q8', progress_callback: progress })
    return { model: extractor, device: 'wasm' as Device }
  },

  ops: {
    async embed(extractor, input: EmbedInput, ctx): Promise<EmbedOutput> {
      const rows: Float32Array[] = []
      let dim = 0
      for (let i = 0; i < input.texts.length; i += BATCH) {
        const chunk = input.texts.slice(i, i + BATCH)
        const out = await extractor(chunk, { pooling: 'mean', normalize: true })
        dim = out.dims[1]
        const flat = out.data as Float32Array
        for (let r = 0; r < chunk.length; r++) rows.push(flat.slice(r * dim, (r + 1) * dim))
        if (input.texts.length > BATCH) ctx.emit({ done: Math.min(i + BATCH, input.texts.length), total: input.texts.length })
      }
      const data = new Float32Array(rows.length * dim)
      rows.forEach((row, r) => data.set(row, r * dim))
      ctx.transfer.push(data.buffer)
      return { data, dim }
    },
  },
})
