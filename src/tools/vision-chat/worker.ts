/// <reference lib="webworker" />
import {
  AutoModelForImageTextToText,
  AutoProcessor,
  InterruptableStoppingCriteria,
  TextStreamer,
  load_image,
} from '@huggingface/transformers'
import { serve } from '../../lib/engine'

const MODEL = 'onnx-community/LFM2.5-VL-450M-ONNX'

export interface AskInput {
  /** data: URL of a JPEG frame. */
  image: string
  question: string
  maxTokens: number
}

export interface StreamEvent {
  text: string
  tps: number | null
}

const SYSTEM =
  'You look at one image and answer questions about it. Only describe what is actually visible. ' +
  'If the image does not show enough to answer, say so plainly instead of guessing. Keep answers brief.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; processor: any }

let stopper: InterruptableStoppingCriteria | null = null

serve<Loaded>({
  async boot({ gpu, progress }) {
    const device = gpu.webgpu ? 'webgpu' : 'wasm'
    const half = device === 'webgpu' && gpu.f16
    const processor = await AutoProcessor.from_pretrained(MODEL, { progress_callback: progress })
    const model = await AutoModelForImageTextToText.from_pretrained(MODEL, {
      device,
      dtype: half
        ? { embed_tokens: 'fp16', vision_encoder: 'fp16', decoder_model_merged: 'q4f16' }
        : { embed_tokens: 'q4', vision_encoder: 'q4', decoder_model_merged: 'q4' },
      progress_callback: progress,
    })
    // A single tile per frame keeps latency predictable for webcam-sized input.
    const imageProcessor = processor.image_processor as { do_image_splitting?: boolean } | undefined
    if (imageProcessor) imageProcessor.do_image_splitting = false
    return { model: { model, processor }, device }
  },

  ops: {
    async ask({ model, processor }, input: AskInput, ctx) {
      const image = await load_image(input.image)
      const chat = [
        { role: 'system', content: [{ type: 'text', text: SYSTEM }] },
        { role: 'user', content: [{ type: 'image' }, { type: 'text', text: input.question }] },
      ]
      const prompt = processor.apply_chat_template(chat, { add_generation_prompt: true })
      const inputs = await processor(image, prompt, { add_special_tokens: false })

      let first: number | null = null
      let count = 0
      const streamer = new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        token_callback_function: () => {
          first ??= performance.now()
          count++
        },
        callback_function: (text: string) => {
          const secs = first === null ? 0 : (performance.now() - first) / 1000
          ctx.emit({ text, tps: secs > 0.2 ? count / secs : null } satisfies StreamEvent)
        },
      })

      stopper = new InterruptableStoppingCriteria()
      try {
        const out = await model.generate({
          ...inputs,
          do_sample: true,
          temperature: 0.1,
          min_p: 0.15,
          repetition_penalty: 1.05,
          max_new_tokens: input.maxTokens,
          streamer,
          stopping_criteria: stopper,
          return_dict_in_generate: true,
        })
        const promptLen = inputs.input_ids.dims.at(-1)
        const answer: string = processor.batch_decode(out.sequences.slice(null, [promptLen, null]), { skip_special_tokens: true })[0] ?? ''
        return answer.trim()
      } finally {
        stopper = null
      }
    },
  },

  stop() {
    stopper?.interrupt()
  },
})
