/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js'
import { phonemize } from 'phonemizer'
import { hasDevanagari, hindiPhonemes, toKokoroVocab } from './hindi'
import { espeak } from '../../lib/espeak'
import { serve } from '../../lib/engine'
import type { Device } from '../../lib/protocol'

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'

export interface Voice {
  id: string
  name: string
  language: string
  gender: string
  grade: string
}

/**
 * Kokoro v1.0 ships four Hindi voices, but kokoro-js only lists English ones.
 * The voice files load by name, so we add them here with character names.
 */
const HINDI_VOICES: Voice[] = [
  { id: 'hf_alpha', name: 'Aarohi', language: 'hi', gender: 'Female', grade: 'C' },
  { id: 'hf_beta', name: 'Meera', language: 'hi', gender: 'Female', grade: 'C' },
  { id: 'hm_omega', name: 'Vikram', language: 'hi', gender: 'Male', grade: 'C' },
  { id: 'hm_psi', name: 'Arjun', language: 'hi', gender: 'Male', grade: 'C' },
]

const english = async (s: string) => (await phonemize(s, 'en-us')).join(' ')

/**
 * Hindi phonemes in the same style Kokoro was trained on: full espeak-ng
 * (with stress marks). Falls back to the built-in rules if the phonemizer
 * can't load, e.g. offline before its data file was ever cached.
 */
async function hindiForKokoro(text: string): Promise<string> {
  try {
    const { phonemes } = await espeak(text, 'hi')
    const ipa = toKokoroVocab(phonemes.join(''))
    if (ipa) return ipa
  } catch (e) {
    console.warn('[kokoro] espeak unavailable, using rule-based Hindi', e)
  }
  return hindiPhonemes(text, english)
}

export interface SpeakInput {
  text: string
  voice: string
  speed: number
}

export interface SpeakOutput {
  audio: Float32Array
  rate: number
}

/** Split text into sentence-sized pieces Kokoro handles comfortably. */
function pieces(text: string): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    const sentences = para.match(/[^.!?।॥。！？]+[.!?।॥。！？]*["')\]]*\s*/g) ?? [para]
    let buf = ''
    for (const s of sentences) {
      if ((buf + s).length > 300 && buf) {
        out.push(buf.trim())
        buf = ''
      }
      buf += s
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out
}

serve<KokoroTTS>({
  async boot({ gpu, progress }) {
    const device: Device = gpu.webgpu ? 'webgpu' : 'wasm'
    // fp32 on WebGPU (fast, best quality); q8 on CPU keeps the download ~90 MB.
    const tts = await KokoroTTS.from_pretrained(MODEL, { device, dtype: device === 'webgpu' ? 'fp32' : 'q8', progress_callback: progress as never })
    return { model: tts, device }
  },
  ops: {
    async voices(tts): Promise<Voice[]> {
      return [...HINDI_VOICES, ...Object.entries(tts.voices).map(([id, v]) => ({ id, name: v.name, language: v.language, gender: v.gender, grade: v.overallGrade }))]
    },
    async speak(tts, input: SpeakInput, ctx): Promise<SpeakOutput> {
      const parts = pieces(input.text)
      const chunks: Float32Array[] = []
      let rate = 24000
      for (let i = 0; i < parts.length; i++) {
        ctx.emit({ done: i, total: parts.length })
        // Hindi voices (or any Devanagari text) go through our own phonemizer
        // and straight to the model; English uses kokoro-js's normal path.
        const audio =
          input.voice.startsWith('h') || hasDevanagari(parts[i])
            ? await tts.generate_from_ids(tts.tokenizer(await hindiForKokoro(parts[i]), { truncation: true }).input_ids, { voice: input.voice as never, speed: input.speed })
            : await tts.generate(parts[i], { voice: input.voice as never, speed: input.speed })
        rate = audio.sampling_rate
        chunks.push(audio.audio, new Float32Array(Math.round(rate * 0.12)))
      }
      const all = new Float32Array(chunks.reduce((s, c) => s + c.length, 0))
      let o = 0
      for (const c of chunks) {
        all.set(c, o)
        o += c.length
      }
      ctx.transfer.push(all.buffer)
      return { audio: all, rate }
    },
  },
})
