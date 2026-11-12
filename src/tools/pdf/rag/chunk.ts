/**
 * Split document text into overlapping, sentence-aligned passages.
 *
 * Sentences are packed greedily up to a token budget, preferring to close a
 * chunk at a paragraph end once it is long enough. The next chunk restarts a
 * few sentences back so facts near a boundary appear in both. Offsets refer to
 * the joined document text, so a chunk can span pages.
 */
import { pageStarts, joinPages } from './extract'
import type { DocumentChunk } from './types'

export interface ChunkOptions {
  /** Close a chunk at a paragraph end once it reaches this size. */
  min: number
  /** Close a chunk once it reaches this size. */
  target: number
  /** Never exceed this (except for the very rare unsplittable word run). */
  max: number
  /** Tokens of trailing sentences repeated at the start of the next chunk. */
  overlap: number
}

export const CHUNK_OPTIONS: ChunkOptions = { min: 300, target: 400, max: 500, overlap: 80 }

/** Bump when chunking changes, so saved indexes are rebuilt. */
export const CHUNKER_VERSION = 1

interface Unit {
  start: number
  end: number
  tokens: number
  /** Last unit of a paragraph. */
  paraEnd: boolean
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null

/** Sentence spans [start, end) within `text`, whitespace trimmed. */
function sentences(text: string, base: number): [number, number][] {
  const out: [number, number][] = []
  const push = (s: number, e: number) => {
    while (s < e && /\s/.test(text[s])) s++
    while (e > s && /\s/.test(text[e - 1])) e--
    if (e > s) out.push([base + s, base + e])
  }
  if (segmenter) {
    for (const seg of segmenter.segment(text)) push(seg.index, seg.index + seg.segment.length)
  } else {
    const re = /[.!?…]+["'”’)\]]*\s+(?=["'“‘(\[]?[\p{Lu}\p{N}])/gu
    let s = 0
    for (let m = re.exec(text); m; m = re.exec(text)) {
      push(s, m.index + m[0].length)
      s = m.index + m[0].length
    }
    push(s, text.length)
  }
  return out
}

/** Break an over-long sentence into word runs of roughly `max` tokens. */
function splitLong(doc: string, start: number, end: number, tokens: number, max: number): [number, number][] {
  const pieces = Math.ceil(tokens / (max * 0.8))
  const span = (end - start) / pieces
  const out: [number, number][] = []
  let s = start
  for (let i = 1; i <= pieces; i++) {
    let e = i === pieces ? end : Math.round(start + span * i)
    // Move the cut to the next space so words stay whole.
    while (e < end && !/\s/.test(doc[e])) e++
    if (e > s) out.push([s, e])
    s = e
    while (s < end && /\s/.test(doc[s])) s++
  }
  return out
}

export function chunkDocument(
  pages: { text: string }[],
  countTokens: (text: string) => number,
  opts: ChunkOptions = CHUNK_OPTIONS,
): DocumentChunk[] {
  const doc = joinPages(pages)
  const starts = pageStarts(pages)
  const pageAt = (offset: number) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }

  // 1. Paragraphs → sentences → units with token counts.
  const units: Unit[] = []
  const paraRe = /\n{2,}/g
  let p = 0
  const paras: [number, number][] = []
  for (let m = paraRe.exec(doc); m; m = paraRe.exec(doc)) {
    paras.push([p, m.index])
    p = m.index + m[0].length
  }
  paras.push([p, doc.length])
  for (const [ps, pe] of paras) {
    const sents = sentences(doc.slice(ps, pe), ps)
    sents.forEach(([s, e], i) => {
      const tokens = countTokens(doc.slice(s, e))
      const last = i === sents.length - 1
      if (tokens <= opts.max) units.push({ start: s, end: e, tokens, paraEnd: last })
      else {
        const parts = splitLong(doc, s, e, tokens, opts.max)
        parts.forEach(([a, b], j) => units.push({ start: a, end: b, tokens: countTokens(doc.slice(a, b)), paraEnd: last && j === parts.length - 1 }))
      }
    })
  }
  if (!units.length) return []

  // 2. Greedy packing with sentence-level overlap.
  const chunks: DocumentChunk[] = []
  let i = 0
  while (i < units.length) {
    let j = i
    let total = 0
    while (j < units.length) {
      const u = units[j]
      if (j > i && total + u.tokens > opts.max) break
      total += u.tokens
      j++
      if (total >= opts.target || (total >= opts.min && u.paraEnd)) break
    }
    const start = units[i].start
    const end = units[j - 1].end
    const first = pageAt(start)
    const last = pageAt(end - 1)
    chunks.push({
      id: `c${chunks.length}`,
      text: doc.slice(start, end).replace(/\s*\n+\s*/g, '\n'),
      pageNumbers: Array.from({ length: last - first + 1 }, (_, k) => first + k),
      startOffset: start,
      endOffset: end,
    })
    if (j >= units.length) break
    // Step back over trailing sentences that fit the overlap budget, but
    // always advance at least one unit.
    let back = j
    let carried = 0
    while (back - 1 > i && carried + units[back - 1].tokens <= opts.overlap) {
      back--
      carried += units[back].tokens
    }
    i = back
  }
  return chunks
}
