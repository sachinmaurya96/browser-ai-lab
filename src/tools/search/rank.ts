import { docText, type Doc } from './corpus'

export interface Hit {
  doc: Doc
  score: number
  /** Query terms found in the doc (keyword mode only). */
  matched?: string[]
}

// ---------------------------------------------------------------------------
// Semantic: dot product of L2-normalised vectors == cosine similarity.
// ---------------------------------------------------------------------------

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function semanticRank(query: Float32Array, docs: Doc[], vectors: Map<string, Float32Array>, k: number): Hit[] {
  return docs
    .map((doc) => {
      const v = vectors.get(docText(doc))
      return v ? { doc, score: dot(query, v) } : null
    })
    .filter((h): h is Hit => h !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

// ---------------------------------------------------------------------------
// Keyword: Okapi BM25 over lightly stemmed tokens — a fair "classic search"
// baseline, not a straw man.
// ---------------------------------------------------------------------------

const STOP = new Set(
  'a an the and or but if of to in on at by for from with is are was were be been am i me my we our you your it its this that these those not no do does did so too very can cant won wont just get got when after before'.split(
    ' ',
  ),
)

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(ing|ed|es|s)$/, '') || t)
}

export function keywordRank(query: string, docs: Doc[], k: number): Hit[] {
  const q = [...new Set(terms(query))]
  if (!q.length || !docs.length) return []

  const tokenised = docs.map((d) => terms(docText(d)))
  const avgLen = tokenised.reduce((s, t) => s + t.length, 0) / docs.length
  const df = new Map<string, number>()
  for (const toks of tokenised) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1)

  const K1 = 1.2
  const B = 0.75
  const hits: Hit[] = []
  tokenised.forEach((toks, i) => {
    let score = 0
    const matched: string[] = []
    for (const term of q) {
      const tf = toks.filter((t) => t === term).length
      if (!tf) continue
      matched.push(term)
      const n = df.get(term) ?? 0
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * toks.length) / avgLen)))
    }
    if (score > 0) hits.push({ doc: docs[i], score, matched })
  })

  // Scale to 0–1 against the best hit so the bars are comparable at a glance.
  const top = Math.max(...hits.map((h) => h.score), 1e-9)
  return hits
    .map((h) => ({ ...h, score: h.score / top }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
