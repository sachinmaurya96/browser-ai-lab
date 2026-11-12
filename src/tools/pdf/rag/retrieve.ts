/**
 * In-memory hybrid retrieval over one document's chunks: cosine similarity on
 * normalised embeddings plus BM25 for exact names, numbers and dates, fused
 * with reciprocal-rank fusion. Adjacent chunks share their overlap, so when
 * neighbours are both picked they are merged into one passage.
 */
import { dot, terms } from '../../search/rank'
import type { DocumentChunk, Passage } from './types'

export interface DocIndex {
  /** Identifies the PDF the index belongs to (content hash). */
  key: string
  chunks: DocumentChunk[]
  /** Joined document text the chunk offsets point into. */
  text: string
  bm25: Bm25
}

interface Bm25 {
  tf: Map<string, number>[]
  df: Map<string, number>
  lengths: number[]
  avg: number
}

export function buildBm25(chunks: { text: string }[]): Bm25 {
  const df = new Map<string, number>()
  const lengths: number[] = []
  const tf = chunks.map((c) => {
    const counts = new Map<string, number>()
    const toks = keyTerms(c.text)
    lengths.push(toks.length)
    for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1)
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    return counts
  })
  return { tf, df, lengths, avg: lengths.reduce((s, n) => s + n, 0) / Math.max(1, lengths.length) }
}

/** Search terms, keeping numbers such as 4,820.50 or 2025-03-14 whole. */
function keyTerms(text: string): string[] {
  const numbers = text.match(/\d[\d,./:-]*\d|\d/g)?.map((n) => n.replace(/,/g, '')) ?? []
  return [...terms(text.replace(/\d[\d,./:-]*\d|\d/g, ' ')), ...numbers]
}

function bm25Rank(index: Bm25, query: string): number[] {
  const q = [...new Set(keyTerms(query))]
  const n = index.tf.length
  const scores = index.tf.map((counts, i) => {
    let s = 0
    for (const term of q) {
      const f = counts.get(term)
      if (!f) continue
      const d = index.df.get(term) ?? 0
      const idf = Math.log(1 + (n - d + 0.5) / (d + 0.5))
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * index.lengths[i]) / (index.avg || 1))))
    }
    return s
  })
  return order(scores).filter((i) => scores[i] > 0)
}

const order = (scores: number[]) => scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a])

export interface RetrieveOptions {
  /** Passages to return. */
  k?: number
  /** Extra, lower-weight query (e.g. the previous question for a follow-up). */
  context?: { vector: Float32Array; text: string }
}

/** Rank fusion constant: 60 is the standard value from the RRF paper. */
const RRF = 60

export function retrieve(index: DocIndex, vector: Float32Array, query: string, { k = 5, context }: RetrieveOptions = {}): Passage[] {
  const { chunks } = index
  if (!chunks.length) return []
  const cos = chunks.map((c) => dot(vector, c.embedding!))
  const lists: { ranks: number[]; weight: number }[] = [
    { ranks: order(cos), weight: 1 },
    { ranks: bm25Rank(index.bm25, query), weight: 1 },
  ]
  if (context) {
    lists.push({ ranks: order(chunks.map((c) => dot(context.vector, c.embedding!))), weight: 0.5 })
    lists.push({ ranks: bm25Rank(index.bm25, `${context.text} ${query}`), weight: 0.5 })
  }
  const fused = new Float64Array(chunks.length)
  for (const { ranks, weight } of lists) ranks.slice(0, 50).forEach((c, r) => (fused[c] += weight / (RRF + r + 1)))

  // Take the best chunks, then merge neighbours into single passages.
  const picked = order([...fused]).slice(0, k + 3).filter((i) => fused[i] > 0)
  const groups: number[][] = []
  for (const i of [...picked].sort((a, b) => a - b)) {
    const g = groups.at(-1)
    if (g && i - g.at(-1)! === 1 && g.length < 3) g.push(i)
    else groups.push([i])
  }
  const best = (g: number[]) => Math.max(...g.map((i) => fused[i]))
  return groups
    .sort((a, b) => best(b) - best(a))
    .slice(0, k)
    .map((g) => {
      const first = chunks[g[0]]
      const last = chunks[g.at(-1)!]
      const start = first.startOffset ?? 0
      const end = last.endOffset ?? 0
      return {
        chunkIds: g.map((i) => chunks[i].id),
        pageNumbers: [...new Set(g.flatMap((i) => chunks[i].pageNumbers))].sort((a, b) => a - b),
        start,
        end,
        text: g.length === 1 ? first.text : index.text.slice(start, end).replace(/\s*\n+\s*/g, '\n'),
        score: Math.max(...g.map((i) => cos[i])),
      }
    })
}
