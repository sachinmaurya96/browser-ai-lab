/// <reference lib="webworker" />
/** Chat-style text generation for any ONNX instruct model, with streaming. */
import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
} from '@huggingface/transformers'
import { serve } from './engine'
import type { Device } from './protocol'

export interface LlmConfig {
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatInput {
  messages: ChatMessage[]
  maxTokens: number
  /** 0 = greedy (deterministic). */
  temperature?: number
}

export interface LlmToken {
  text: string
  tps: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; tokenizer: any }

let stopper: InterruptableStoppingCriteria | null = null

serve<Loaded>({
  async boot({ gpu, progress, config }: { gpu: { webgpu: boolean }; progress: (i: unknown) => void; config: LlmConfig }) {
    const device: Device = gpu.webgpu ? 'webgpu' : 'wasm'
    const tokenizer = await AutoTokenizer.from_pretrained(config.model, { progress_callback: progress })
    const model = await AutoModelForCausalLM.from_pretrained(config.model, { device, dtype: 'q4', progress_callback: progress })
    return { model: { model, tokenizer }, device }
  },
  ops: {
    async chat({ model, tokenizer }, input: ChatInput, ctx) {
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
          ctx.emit({ text, tps: secs > 0.2 ? count / secs : null } satisfies LlmToken)
        },
      })
      stopper = new InterruptableStoppingCriteria()
      const t = input.temperature ?? 0
      try {
        const out = await model.generate({
          ...encoded,
          ...(t > 0 ? { do_sample: true, temperature: t, top_p: 0.9 } : { do_sample: false }),
          max_new_tokens: input.maxTokens,
          streamer,
          stopping_criteria: stopper,
        })
        const len = encoded.input_ids.dims.at(-1)
        return (tokenizer.batch_decode(out.slice(null, [len, null]), { skip_special_tokens: true })[0] as string).trim()
      } finally {
        stopper = null
      }
    },
  },
  stop() {
    stopper?.interrupt()
  },
})
