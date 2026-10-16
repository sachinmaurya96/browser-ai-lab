/// <reference lib="webworker" />
/** Chat-style text generation for any ONNX instruct model, with streaming. */
import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
} from '@huggingface/transformers'
import { serve } from './engine'

/** One way to load a model. The worker tries candidates in order. */
export interface LlmCandidate {
  model: string
  dtype: 'q4' | 'q4f16'
  /** 'webgpu' needs a GPU; f16 also needs shader-f16 support. */
  device: 'webgpu' | 'wasm'
}

export interface LlmConfig {
  candidates: LlmCandidate[]
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
let loaded: LlmCandidate | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function producesText(model: any, tokenizer: any): Promise<boolean> {
  try {
    const prompt = tokenizer.apply_chat_template([{ role: 'user', content: 'Reply with one short friendly sentence about the weather.' }], { tokenize: false, add_generation_prompt: true })
    const enc = tokenizer(prompt, { add_special_tokens: false })
    const out = await model.generate({ ...enc, do_sample: false, max_new_tokens: 16 })
    const text: string = tokenizer.batch_decode(out.slice(null, [enc.input_ids.dims.at(-1), null]), { skip_special_tokens: true })[0] ?? ''
    const letters = (text.match(/[\p{L}\s]/gu) ?? []).length
    return text.trim().length > 3 && letters / text.length > 0.7 && /\p{L}{3,}/u.test(text)
  } catch {
    return false
  }
}

serve<Loaded>({
  async boot({ gpu, progress, config }: { gpu: { webgpu: boolean; f16: boolean }; progress: (i: unknown) => void; config: LlmConfig }) {
    const usable = config.candidates.filter((c) => (c.device === 'wasm' || gpu.webgpu) && (c.dtype !== 'q4f16' || gpu.f16))
    let lastError: unknown
    for (const c of usable) {
      try {
        const tokenizer = await AutoTokenizer.from_pretrained(c.model, { progress_callback: progress })
        const model = await AutoModelForCausalLM.from_pretrained(c.model, { device: c.device, dtype: c.dtype, progress_callback: progress })
        // Some model/precision/GPU combinations load fine but overflow and
        // emit symbol soup. Generate a short reply and make sure it's text.
        if (!(await producesText(model, tokenizer))) {
          await model.dispose?.()
          throw new Error(`${c.model} (${c.dtype} on ${c.device}) produced garbled output`)
        }
        loaded = c
        return { model: { model, tokenizer }, device: c.device }
      } catch (e) {
        lastError = e
        console.warn('[llm] candidate failed', c, e)
      }
    }
    const msg = lastError instanceof Error ? lastError.message : String(lastError)
    throw new Error(/alloc|memory/i.test(msg) ? 'Not enough memory to load a chat model on this device. Close other tabs or try a desktop browser with WebGPU.' : `Couldn't load a working chat model: ${msg}`)
  },
  ops: {
    async info() {
      return loaded?.model ?? ''
    },
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
