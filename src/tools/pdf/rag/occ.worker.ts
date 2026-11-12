/// <reference lib="webworker" />
/**
 * Grounded answer generation with OCC-RAG-0.6B. The question and retrieved
 * passages go through the model's own chat template (`documents=`), which adds
 * its structural tokens. Output is decoded with special tokens kept so the
 * sections can be parsed; only the answer section ever leaves this worker.
 */
import { AutoModelForCausalLM, AutoTokenizer, InterruptableStoppingCriteria, TextStreamer } from '@huggingface/transformers'
import { serve } from '../../../lib/engine'
import { parseOcc, type OccParsed, type OccStage } from './occ'

export const OCC_MODEL = 'occ-ai/OCC-RAG-0.6B-ONNX'

export interface OccConfig {
  /** Allow the slow CPU build when there is no usable WebGPU. Off by default. */
  allowCpu: boolean
}

interface Candidate {
  dtype: 'q4f16' | 'q4'
  device: 'webgpu' | 'wasm'
}

export interface AnswerInput {
  question: string
  /** Passage texts, best first. Source ids in the output are 1-based indexes. */
  sources: string[]
  /** Earlier turns, oldest first; only the latest is used, to resolve follow-ups. */
  history: { question: string; answer: string }[]
}

export interface AnswerProgress {
  stage: OccStage
  answer: string
  tokens: number
}

export interface AnswerOutput extends Omit<OccParsed, 'stage'> {
  /** How many of the given sources fitted in the context budget. */
  used: number
  /** Generation ended before the answer closed. */
  truncated: boolean
  /** The user pressed stop (as opposed to the token limit or a repetition loop). */
  stoppedByUser: boolean
  /** Output started repeating itself and was cut off. */
  looped: boolean
}

/**
 * Prompt budget in tokens. The model handles far more, but every token costs
 * KV-cache memory (~115 KB each at fp16), so this keeps a five-passage prompt
 * plus its reasoning trace comfortably inside a laptop GPU's memory.
 */
const PROMPT_BUDGET = 2600
/** The trace before the answer is long; leave room for it and the answer. */
const MAX_NEW_TOKENS = 1024
/** Characters compared when checking whether the output has started repeating. */
const LOOP_WINDOW = 160

/** eos, im_end and answer_end, from generation_config.json. */
const EOS = [151643, 151645, 151683]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; tokenizer: any }

let stopper: InterruptableStoppingCriteria | null = null
let loaded: Candidate | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function selfTest(model: any, tokenizer: any): Promise<boolean> {
  // Some precision/GPU combinations load but emit symbol soup. The first
  // section is plain-English query analysis, so a short run should be words.
  try {
    const prompt = tokenizer.apply_chat_template([{ role: 'user', content: 'When was the bridge opened?' }], {
      documents: [{ text: 'The bridge opened to traffic in May 1937.' }],
      add_generation_prompt: true,
      tokenize: false,
    })
    const enc = tokenizer(prompt, { add_special_tokens: false })
    const out = await model.generate({ ...enc, do_sample: false, max_new_tokens: 16 })
    const text: string = tokenizer.batch_decode(out.slice(null, [enc.input_ids.dims.at(-1), null]), { skip_special_tokens: true })[0] ?? ''
    const letters = (text.match(/[\p{L}\s]/gu) ?? []).length
    return text.trim().length > 3 && letters / text.length > 0.7
  } catch {
    return false
  }
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/alloc|memory|OOM|device (was )?lost/i.test(msg)) return 'Not enough GPU memory for the answer model. Close other tabs or heavy apps and retry.'
  if (/fetch|network|Failed to load|404|ERR_/i.test(msg)) return `The answer model couldn't be downloaded (${msg}). Check your connection and retry; finished files are cached.`
  return msg
}

/**
 * The model is trained on single-turn prompts: given earlier turns as chat
 * messages it tends to re-answer the old question. A short inline note about
 * the previous turn resolves "it"/"they" while keeping the focus on the new one.
 */
function query(input: AnswerInput) {
  const prev = input.history.at(-1)
  if (!prev) return input.question
  const answer = prev.answer.length > 200 ? `${prev.answer.slice(0, 200)}…` : prev.answer
  return `${input.question} (This follows up on the earlier question "${prev.question}", answered: "${answer}".)`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(tokenizer: any, input: AnswerInput, sources: string[]): { text: string; length: number } {
  const text: string = tokenizer.apply_chat_template([{ role: 'user', content: query(input) }], {
    documents: sources.map((s) => ({ text: s })),
    add_generation_prompt: true,
    tokenize: false,
  })
  return { text, length: tokenizer.encode(text, { add_special_tokens: false }).length }
}

serve<Loaded>({
  async boot({ gpu, progress, config }: { gpu: { webgpu: boolean; f16: boolean }; progress: (i: unknown) => void; config: OccConfig }) {
    const candidates: Candidate[] = []
    if (gpu.webgpu && gpu.f16) candidates.push({ dtype: 'q4f16', device: 'webgpu' })
    if (gpu.webgpu) candidates.push({ dtype: 'q4', device: 'webgpu' })
    if (config?.allowCpu) candidates.push({ dtype: 'q4', device: 'wasm' })
    if (!candidates.length) throw new Error('Generative answers need WebGPU. Using the lightweight extractive mode instead.')

    let lastError: unknown
    const tokenizer = await AutoTokenizer.from_pretrained(OCC_MODEL, { progress_callback: progress })
    for (const c of candidates) {
      try {
        const model = await AutoModelForCausalLM.from_pretrained(OCC_MODEL, { device: c.device, dtype: c.dtype, progress_callback: progress })
        if (!(await selfTest(model, tokenizer))) {
          await model.dispose?.()
          throw new Error(`OCC-RAG (${c.dtype} on ${c.device}) produced garbled output`)
        }
        loaded = c
        return { model: { model, tokenizer }, device: c.device }
      } catch (e) {
        lastError = e
        console.warn('[ask-pdf] candidate failed', c, e)
      }
    }
    throw new Error(friendly(lastError))
  },

  ops: {
    async info() {
      return loaded ? `${loaded.dtype}-${loaded.device}` : ''
    },

    async answer({ model, tokenizer }, input: AnswerInput, ctx): Promise<AnswerOutput> {
      // Drop the lowest-ranked passages (then history) until the prompt fits.
      let sources = [...input.sources]
      let history = input.history
      let prompt = buildPrompt(tokenizer, { ...input, history }, sources)
      while (prompt.length > PROMPT_BUDGET && (sources.length > 1 || history.length)) {
        if (history.length) history = history.slice(1)
        else sources = sources.slice(0, -1)
        prompt = buildPrompt(tokenizer, { ...input, history }, sources)
      }
      if (prompt.length > PROMPT_BUDGET) {
        // One very long passage: keep its beginning.
        const keep = Math.floor(sources[0].length * (PROMPT_BUDGET / prompt.length) * 0.95)
        sources = [sources[0].slice(0, keep)]
        prompt = buildPrompt(tokenizer, { ...input, history }, sources)
      }

      const encoded = tokenizer(prompt.text, { add_special_tokens: false })
      let raw = ''
      let tokens = 0
      let last = ''
      let looped = false
      const stop = new InterruptableStoppingCriteria()
      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: false,
        token_callback_function: () => void tokens++,
        callback_function: (text: string) => {
          raw += text
          // Greedy decoding in a small model occasionally repeats itself
          // forever; stop as soon as the latest stretch has appeared before.
          if (!looped && raw.length > LOOP_WINDOW * 4 && raw.slice(0, -LOOP_WINDOW).includes(raw.slice(-LOOP_WINDOW))) {
            looped = true
            stop.interrupt()
          }
          const p = parseOcc(raw, sources.length)
          const key = `${p.stage}|${p.answer}|${tokens >> 4}`
          if (key !== last) {
            last = key
            ctx.emit({ stage: p.stage, answer: p.answer, tokens } satisfies AnswerProgress)
          }
        },
      })
      stopper = stop
      try {
        const out = await model.generate({
          ...encoded,
          do_sample: false,
          max_new_tokens: MAX_NEW_TOKENS,
          eos_token_id: EOS,
          streamer,
          stopping_criteria: stop,
        })
        const len = encoded.input_ids.dims.at(-1)
        const full: string = tokenizer.batch_decode(out.slice(null, [len, null]), { skip_special_tokens: false })[0]
        const { answer, status, cited, complete } = parseOcc(full, sources.length)
        // The model stops on <|answer_end|> itself, so a missing close tag
        // means we hit the token limit or the user pressed stop.
        const closed = complete || (answer.length > 0 && EOS.includes(Number(out.data.at(-1))))
        if (!answer && status === null && (looped || !stop.interrupted)) console.warn('[ask-pdf] generation ended without an answer', { looped, tokens, tail: full.slice(-300) })
        return { answer, status, cited, complete, used: sources.length, truncated: !closed, stoppedByUser: stop.interrupted && !looped, looped }
      } catch (e) {
        throw new Error(friendly(e))
      } finally {
        stopper = null
      }
    },
  },

  stop() {
    stopper?.interrupt()
  },
})
