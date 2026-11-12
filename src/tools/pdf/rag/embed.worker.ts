/// <reference lib="webworker" />
/**
 * Ask PDF's indexer: chunks page text with the embedding model's own
 * tokenizer (so chunk sizes are real token counts) and embeds the chunks and
 * questions with mxbai-embed-xsmall-v1.
 */
import { pipeline } from '@huggingface/transformers'
import { serve } from '../../../lib/engine'
import type { Device, ToWorker } from '../../../lib/protocol'
import { chunkDocument } from './chunk'
import type { DocumentChunk } from './types'

export const EMBED_MODEL = 'mixedbread-ai/mxbai-embed-xsmall-v1'
const BATCH = 16

export interface IndexInput {
  pages: { text: string }[]
}

export interface IndexProgress {
  done: number
  total: number
}

export interface IndexOutput {
  chunks: DocumentChunk[]
  /** Row-major, L2-normalised: chunks.length × dim. */
  vectors: Float32Array
  dim: number
  /** device/dtype the vectors came from; saved indexes must match it. */
  variant: string
}

export interface EmbedInput {
  texts: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Extractor = any

let variant = ''

// Messages arrive in order, so numbering runs as they come in tells us which
// jobs were requested before a `stop` (those get cancelled) and which after.
let seq = 0
let stopSeq = 0
self.addEventListener('message', (e: MessageEvent<ToWorker>) => {
  if (e.data.kind === 'run' && e.data.input && typeof e.data.input === 'object') (e.data.input as { seq?: number }).seq = ++seq
  if (e.data.kind === 'stop') stopSeq = seq
})

async function embedBatch(extractor: Extractor, texts: string[]) {
  const out = await extractor(texts, { pooling: 'mean', normalize: true })
  return { data: out.data as Float32Array, dim: out.dims[1] as number }
}

serve<Extractor>({
  async boot({ gpu, progress }) {
    // Half precision on WebGPU when the adapter supports it; the 8-bit CPU
    // build is only 24 MB and fast enough for a 6-layer model otherwise.
    if (gpu.webgpu && gpu.f16) {
      try {
        const extractor = await pipeline('feature-extraction', EMBED_MODEL, { device: 'webgpu', dtype: 'fp16', progress_callback: progress })
        const probe = await embedBatch(extractor, ['hello world'])
        if (probe.data.every(Number.isFinite)) {
          variant = 'webgpu-fp16'
          return { model: extractor, device: 'webgpu' as Device }
        }
        await extractor.dispose?.()
      } catch {
        // Fall back to WASM below.
      }
    }
    const extractor = await pipeline('feature-extraction', EMBED_MODEL, { device: 'wasm', dtype: 'q8', progress_callback: progress })
    variant = 'wasm-q8'
    return { model: extractor, device: 'wasm' as Device }
  },

  ops: {
    async info() {
      return variant
    },

    async index(extractor, input: IndexInput, ctx): Promise<IndexOutput> {
      const job = (input as IndexInput & { seq?: number }).seq ?? 0
      const cancelled = () => job <= stopSeq
      const tokenizer = extractor.tokenizer
      const count = (t: string) => tokenizer.encode(t, { add_special_tokens: false }).length as number
      const chunks = chunkDocument(input.pages, count)
      if (cancelled()) throw new Error('Cancelled')
      let dim = 0
      let vectors = new Float32Array(0)
      for (let i = 0; i < chunks.length; i += BATCH) {
        if (cancelled()) throw new Error('Cancelled')
        const batch = chunks.slice(i, i + BATCH)
        const out = await embedBatch(extractor, batch.map((c) => c.text))
        if (!dim) {
          dim = out.dim
          vectors = new Float32Array(chunks.length * dim)
        }
        vectors.set(out.data, i * dim)
        ctx.emit({ done: Math.min(i + BATCH, chunks.length), total: chunks.length } satisfies IndexProgress)
      }
      ctx.transfer.push(vectors.buffer)
      return { chunks, vectors, dim, variant }
    },

    async embed(extractor, input: EmbedInput, ctx) {
      const out = await embedBatch(extractor, input.texts)
      const data = new Float32Array(out.data)
      ctx.transfer.push(data.buffer)
      return { data, dim: out.dim }
    },
  },
})
