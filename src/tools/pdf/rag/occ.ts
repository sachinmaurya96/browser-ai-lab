/**
 * OCC-RAG response parsing. The model writes five sections delimited by
 * special tokens: query analysis → source analysis → reasoning → status →
 * answer. Only the answer is ever shown; the analysis sections are read just
 * to report progress and to collect which sources the model cited.
 * Mirrors `parse_response` in the model authors' quickstart.
 */

export type OccStage = 'analysing' | 'reasoning' | 'answering'

export interface OccParsed {
  stage: OccStage
  /** Final answer text so far, structural tokens removed. */
  answer: string
  status: 'answerable' | 'unanswerable' | null
  /** 1-based source ids cited in the analysis/reasoning. */
  cited: number[]
  /** The answer section has been closed. */
  complete: boolean
}

const T = {
  srcEnd: '<|source_analysis_end|>',
  reasonStart: '<|reasoning_start|>',
  reasonEnd: '<|reasoning_end|>',
  statusStart: '<|status_start|>',
  statusEnd: '<|status_end|>',
  answerStart: '<|answer_start|>',
  answerEnd: '<|answer_end|>',
}

/** The refusal phrase the model was trained to emit. */
const REFUSAL = /^\s*not enough information\b/i

const lastBetween = (s: string, start: string, end: string) => {
  const i = s.lastIndexOf(start)
  if (i < 0) return null
  const from = i + start.length
  const j = s.indexOf(end, from)
  return s.slice(from, j < 0 ? undefined : j)
}

/** Remove every `<|…|>` / `<think>` style token and tidy whitespace. */
export const stripTokens = (s: string) =>
  s
    .replace(/<\|[a-z_]+\|>/gi, ' ')
    .replace(/<\/?think>/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()

export function parseOcc(raw: string, sourceCount: number): OccParsed {
  const answerRaw = lastBetween(raw, T.answerStart, T.answerEnd)
  const statusRaw = lastBetween(raw, T.statusStart, T.statusEnd)
  const status = statusRaw === null ? null : /UNANSWERABLE/i.test(statusRaw) ? 'unanswerable' : /ANSWERABLE/i.test(statusRaw) ? 'answerable' : null
  const stage: OccStage = answerRaw !== null ? 'answering' : raw.includes(T.reasonStart) || raw.includes(T.srcEnd) ? 'reasoning' : 'analysing'

  // Citations appear as "<|source_id|>3" (or occasionally "source 3"). Only
  // the reasoning counts: source analysis mentions every source, relevant or not.
  const reasoning = lastBetween(raw, T.reasonStart, T.reasonEnd) ?? ''
  const cited = new Set<number>()
  for (const m of reasoning.matchAll(/<\|source_id\|>\s*(\d+)|\bsources?\s*#?\s*(\d+)/gi)) {
    const id = Number(m[1] ?? m[2])
    if (id >= 1 && id <= sourceCount) cited.add(id)
  }

  const answer = answerRaw === null ? '' : stripTokens(answerRaw)
  return {
    stage,
    answer,
    status: status ?? (answer && REFUSAL.test(answer) ? 'unanswerable' : null),
    cited: [...cited].sort((a, b) => a - b),
    complete: answerRaw !== null && raw.includes(T.answerEnd, raw.lastIndexOf(T.answerStart)),
  }
}

/** True when the model declined: UNANSWERABLE status or the refusal phrase. */
export const isRefusal = (p: Pick<OccParsed, 'status' | 'answer'>) => p.status === 'unanswerable' || REFUSAL.test(p.answer)
