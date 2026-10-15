/// <reference lib="webworker" />
import {
  AutoProcessor,
  AutoTokenizer,
  Florence2ForConditionalGeneration,
  RawImage,
  full,
} from '@huggingface/transformers'
import { serve } from '../../lib/engine'

const MODEL = 'onnx-community/Florence-2-base-ft'

export type Detail = 'short' | 'medium' | 'long' | 'ocr'

// Florence-2 is steered by fixed task tokens rather than free-form prompts.
const TASK: Record<Detail, string> = {
  short: '<CAPTION>',
  medium: '<DETAILED_CAPTION>',
  long: '<MORE_DETAILED_CAPTION>',
  ocr: '<OCR>',
}

export interface CaptionInput {
  url: string
  detail: Detail
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; processor: any; tokenizer: any }

// Encoding the image is the expensive half; keep the last one around so
// switching detail level on the same picture is quick.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let visionCache: { url: string; inputs: any; size: [number, number] } | null = null

serve<Loaded>({
  async boot({ gpu, progress }) {
    const device = gpu.webgpu ? 'webgpu' : 'wasm'
    const half = device === 'webgpu' && gpu.f16
    const processor = await AutoProcessor.from_pretrained(MODEL, { progress_callback: progress })
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL, { progress_callback: progress })
    const model = await Florence2ForConditionalGeneration.from_pretrained(MODEL, {
      device,
      dtype: {
        embed_tokens: half ? 'fp16' : 'fp32',
        vision_encoder: half ? 'fp16' : 'fp32',
        encoder_model: 'q4',
        decoder_model_merged: 'q4',
      },
      progress_callback: progress,
    })

    // One throwaway token compiles the GPU shaders up front, so the first real
    // caption isn't mysteriously slow.
    try {
      await model.generate({ ...tokenizer('warm-up'), pixel_values: full([1, 3, 768, 768], 0), max_new_tokens: 1 })
    } catch {
      /* warm-up is optional */
    }
    return { model: { model, processor, tokenizer }, device }
  },

  ops: {
    async caption({ model, processor, tokenizer }, input: CaptionInput) {
      if (visionCache?.url !== input.url) {
        const image = await RawImage.fromURL(input.url)
        visionCache = { url: input.url, inputs: await processor(image), size: image.size as [number, number] }
      }
      const task = TASK[input.detail]
      const ids = await model.generate({
        ...tokenizer(processor.construct_prompts(task)),
        ...visionCache.inputs,
        max_new_tokens: 256,
        num_beams: 1,
        do_sample: false,
      })
      const raw: string = tokenizer.batch_decode(ids, { skip_special_tokens: false })[0]
      const parsed = processor.post_process_generation(raw, task, visionCache.size)
      const text = typeof parsed?.[task] === 'string' ? parsed[task] : String(parsed ?? '')
      return text.trim()
    },
  },
})
