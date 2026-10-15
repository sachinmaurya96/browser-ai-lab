/// <reference lib="webworker" />
import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
} from '@huggingface/transformers'
import { serve } from '../../lib/engine'

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct'

export interface CompleteInput {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  maxTokens: number
}

export interface TokenEvent {
  text: string
  tps: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; tokenizer: any }

let stopper: InterruptableStoppingCriteria | null = null

serve<Loaded>({
  async boot({ gpu, progress }) {
    const device = gpu.webgpu ? 'webgpu' : 'wasm'
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL, { progress_callback: progress })
    // q4 (fp32 activations) everywhere: the f16 variant is numerically unstable
    // for this model on the WebGPU backend and degenerates into repeated "!".
    const model = await AutoModelForCausalLM.from_pretrained(MODEL, { device, dtype: 'q4', progress_callback: progress })
    try {
      await model.generate({ ...tokenizer('hi'), max_new_tokens: 1 })
    } catch {
      /* warm-up is optional */
    }
    return { model: { model, tokenizer }, device }
  },

  ops: {
    async complete({ model, tokenizer }, input: CompleteInput, ctx) {
      const prompt = tokenizer.apply_chat_template(input.messages, { tokenize: false, add_generation_prompt: true })
      const encoded = tokenizer(prompt, { add_special_tokens: false })

      let first: number | null = null
      let count = 0
      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        token_callback_function: () => {
          first ??= performance.now()
          count++
        },
        callback_function: (text: string) => {
          const secs = first === null ? 0 : (performance.now() - first) / 1000
          ctx.emit({ text, tps: secs > 0.2 ? count / secs : null } satisfies TokenEvent)
        },
      })

      stopper = new InterruptableStoppingCriteria()
      try {
        const out = await model.generate({
          ...encoded,
          // Greedy decoding keeps JSON stable. Repetition penalties are left
          // off on purpose: JSON legitimately repeats quotes, keys and commas.
          do_sample: false,
          max_new_tokens: input.maxTokens,
          streamer,
          stopping_criteria: stopper,
        })
        const promptLen = encoded.input_ids.dims.at(-1)
        return tokenizer.batch_decode(out.slice(null, [promptLen, null]), { skip_special_tokens: true })[0] as string
      } finally {
        stopper = null
      }
    },
  },

  stop() {
    stopper?.interrupt()
  },
})
