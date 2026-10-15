/**
 * Devanagari → IPA for Kokoro's Hindi voices.
 *
 * kokoro-js ships an English-only espeak build, so Hindi text is converted
 * here with rules: consonants carry an inherent schwa that is dropped at word
 * ends and in the classic V·C(ə)·CV position (Ohala's schwa-deletion rule).
 * Output uses only symbols present in Kokoro's tokenizer vocabulary.
 */

const CONS: Record<string, string> = {
  क: 'k', ख: 'kʰ', ग: 'ɡ', घ: 'ɡʰ', ङ: 'ŋ',
  च: 'ʧ', छ: 'ʧʰ', ज: 'ʤ', झ: 'ʤʰ', ञ: 'ɲ',
  ट: 'ʈ', ठ: 'ʈʰ', ड: 'ɖ', ढ: 'ɖʰ', ण: 'ɳ',
  त: 't', थ: 'tʰ', द: 'd', ध: 'dʰ', न: 'n',
  प: 'p', फ: 'pʰ', ब: 'b', भ: 'bʰ', म: 'm',
  य: 'j', र: 'ɾ', ल: 'l', ळ: 'l', व: 'ʋ', श: 'ʃ', ष: 'ʂ', स: 's', ह: 'h',
  // Precomposed nukta letters
  क़: 'q', ख़: 'χ', ग़: 'ɣ', ज़: 'z', ड़: 'ɽ', ढ़: 'ɽʰ', फ़: 'f', य़: 'j',
}

// Base letter + combining nukta (U+093C) → borrowed sound.
const NUKTA: Record<string, string> = { क: 'q', ख: 'χ', ग: 'ɣ', ज: 'z', ड: 'ɽ', ढ: 'ɽʰ', फ: 'f', य: 'j' }

const VOWELS: Record<string, string> = {
  अ: 'ə', आ: 'aː', इ: 'ɪ', ई: 'iː', उ: 'ʊ', ऊ: 'uː', ऋ: 'ɾɪ', ए: 'eː', ऐ: 'ɛː', ओ: 'oː', औ: 'ɔː', ऑ: 'ɔ', ऍ: 'æ',
}

const MATRAS: Record<string, string> = {
  'ा': 'aː', 'ि': 'ɪ', 'ी': 'iː', 'ु': 'ʊ', 'ू': 'uː', 'ृ': 'ɾɪ', 'े': 'eː', 'ै': 'ɛː', 'ो': 'oː', 'ौ': 'ɔː', 'ॉ': 'ɔ', 'ॅ': 'æ',
}

const VIRAMA = '्'
const ANUSVARA = 'ं'
const CHANDRABINDU = 'ँ'
const VISARGA = 'ः'
const NUKTA_SIGN = '़'

const DIGITS = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ']

interface Unit {
  /** Consonant cluster before the vowel (IPA pieces). */
  cons: string[]
  /** Vowel IPA, or null for a bare consonant (virama). */
  vowel: string | null
  /** True when `vowel` is the implicit schwa. */
  inherent: boolean
  /** Nasalisation / trailing sound (anusvara, chandrabindu, visarga). */
  coda: 'nasal' | 'anusvara' | 'h' | null
}

/** Homorganic nasal for an anusvara before a stop; otherwise nasalise. */
function anusvaraBefore(next: string | undefined): string | null {
  if (!next) return null
  if (/^[kɡq]/.test(next)) return 'ŋ'
  if (/^[ʧʤ]/.test(next)) return 'n'
  if (/^[ʈɖ]/.test(next)) return 'ɳ'
  if (/^[td]/.test(next)) return 'n'
  if (/^[pbm]/.test(next)) return 'm'
  return null
}

function parseWord(word: string): Unit[] {
  const units: Unit[] = []
  let cluster: string[] = []
  const chars = [...word]
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (CONS[c] !== undefined) {
      const sound = chars[i + 1] === NUKTA_SIGN ? (NUKTA[c] ?? CONS[c]) : CONS[c]
      if (chars[i + 1] === NUKTA_SIGN) i++
      // A consonant directly after another (no virama) closes the previous one with schwa.
      if (cluster.length) {
        units.push({ cons: cluster, vowel: 'ə', inherent: true, coda: null })
        cluster = []
      }
      cluster = [sound]
      // Look ahead: virama joins into a cluster.
      while (chars[i + 1] === VIRAMA && CONS[chars[i + 2]] !== undefined) {
        i += 2
        let s = CONS[chars[i]]
        if (chars[i + 1] === NUKTA_SIGN) {
          s = NUKTA[chars[i]] ?? s
          i++
        }
        cluster.push(s)
      }
      if (chars[i + 1] === VIRAMA) {
        units.push({ cons: cluster, vowel: null, inherent: false, coda: null })
        cluster = []
        i++
      } else if (MATRAS[chars[i + 1]]) {
        units.push({ cons: cluster, vowel: MATRAS[chars[i + 1]], inherent: false, coda: null })
        cluster = []
        i++
      }
    } else if (VOWELS[c]) {
      if (cluster.length) {
        units.push({ cons: cluster, vowel: 'ə', inherent: true, coda: null })
        cluster = []
      }
      units.push({ cons: [], vowel: VOWELS[c], inherent: false, coda: null })
    } else if (c === ANUSVARA || c === CHANDRABINDU || c === VISARGA) {
      if (cluster.length) {
        units.push({ cons: cluster, vowel: 'ə', inherent: false, coda: null })
        cluster = []
      }
      const last = units[units.length - 1]
      if (last) last.coda = c === VISARGA ? 'h' : c === ANUSVARA ? 'anusvara' : 'nasal'
    }
  }
  if (cluster.length) units.push({ cons: cluster, vowel: 'ə', inherent: true, coda: null })
  return units
}

/** Drop schwas that Hindi speakers don't pronounce. */
function deleteSchwas(units: Unit[]): void {
  const n = units.length
  if (n > 1 && units[n - 1].inherent && units[n - 1].coda === null) units[n - 1].vowel = null
  // Right to left through the middle of the word.
  for (let i = n - 2; i >= 1; i--) {
    const u = units[i]
    if (!u.inherent || u.coda || u.cons.length !== 1) continue
    const prev = units[i - 1]
    const next = units[i + 1]
    // Keep the schwa before a cluster (नमस्ते) or after a closed syllable
    // (ज़िंदगी): deleting it there would stack three consonants.
    if (prev.vowel && !prev.coda && next.cons.length === 1 && next.vowel) u.vowel = null
  }
}

function wordToIpa(word: string): string {
  const units = parseWord(word)
  deleteSchwas(units)
  let out = ''
  units.forEach((u, i) => {
    out += u.cons.join('')
    // The nasal tilde sits on the vowel itself, before any length mark.
    const nasalise = (v: string) => (v.endsWith('ː') ? `${v.slice(0, -1)}̃ː` : `${v}̃`)
    const vowel = u.vowel ?? ''
    if (u.coda === 'h') out += vowel + 'h'
    else if (u.coda === 'nasal') out += vowel ? nasalise(vowel) : ''
    else if (u.coda === 'anusvara') {
      const nasal = anusvaraBefore(units[i + 1]?.cons[0])
      out += nasal ? vowel + nasal : vowel ? nasalise(vowel) : ''
    } else out += vowel
  })
  return out
}

const DEVANAGARI_WORD = /[ऀ-ॿ]+/g
export const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s)

/** Characters Kokoro's tokenizer understands; anything else is dropped. */
const VOCAB = new Set([...' !"$(),.:;?AIOQSTWYabcdefhijklmnopqrstuvwxyzæçðøŋœɐɑɒɔɕɖəɚɛɜɟɡɣɤɥɨɪɯɰɲɳɴɸɹɻɽɾʁʂʃʈʊʋʌʎʒʔʝʣʤʥʦʧʨʰʲˈˌː̃βθχᵊᵝᵻ—“”…'])

/** Drop symbols Kokoro's tokenizer doesn't know (e.g. espeak's ɦ → h). */
export function toKokoroVocab(ipa: string): string {
  return [...ipa.replace(/ɦ/g, 'h').replace(/ʱ/g, 'ʰ').replace(/r/g, 'ɾ')].filter((c) => VOCAB.has(c)).join('').replace(/ {2,}/g, ' ').trim()
}

/**
 * Convert mixed Hindi/English text to Kokoro phonemes. Latin runs are handed
 * to `english` (the bundled espeak, English only).
 */
export async function hindiPhonemes(text: string, english: (s: string) => Promise<string>): Promise<string> {
  const clean = text
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/\d/g, (d) => ` ${DIGITS[+d]} `)
    .replace(/[।॥]/g, '.')
    .replace(/\s+/g, ' ')
    .trim()

  // Keep the spaces around English runs so words don't run together.
  const latin = async (s: string) => {
    if (!/[A-Za-z]/.test(s)) return s
    const [, lead, body, trail] = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!
    return lead + (await english(body)) + trail
  }

  let out = ''
  let last = 0
  for (const m of clean.matchAll(DEVANAGARI_WORD)) {
    const between = clean.slice(last, m.index)
    out += await latin(between)
    out += wordToIpa(m[0])
    last = m.index! + m[0].length
  }
  out += await latin(clean.slice(last))
  return [...out].filter((c) => VOCAB.has(c)).join('').replace(/ {2,}/g, ' ').trim()
}

/** Exposed for tests. */
export const _wordToIpa = wordToIpa
