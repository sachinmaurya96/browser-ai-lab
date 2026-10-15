/**
 * espeak-ng phonemizer (piper_phonemize compiled to WASM) with every language,
 * including Hindi. Its ~18 MB data file comes from a CDN once and is then
 * served from the browser's HTTP cache.
 */
import { createPiperPhonemize } from 'piper-phonemize'

const BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/'

export interface Phonemized {
  /** IPA symbols, one per entry (combining marks are separate entries). */
  phonemes: string[]
  /** Piper phoneme ids for the same text. */
  phoneme_ids: number[]
}

/** Phonemize `text` with espeak voice `voice` (e.g. "hi", "en-us"). */
export function espeak(text: string, voice: string): Promise<Phonemized> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Phonemizer timed out.')), 60_000)
    createPiperPhonemize({
      print: (line) => {
        clearTimeout(timer)
        try {
          resolve(JSON.parse(line))
        } catch (e) {
          reject(e)
        }
      },
      // espeak prints harmless warnings on stderr; real failures surface as
      // a missing result (timeout) or a thrown error below.
      printErr: (line) => console.debug('[espeak]', line),
      locateFile: (path) => BASE + (path.endsWith('.wasm') ? 'piper_phonemize.wasm' : path.endsWith('.data') ? 'piper_phonemize.data' : path),
    })
      .then((m) => m.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']))
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}
