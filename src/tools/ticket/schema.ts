import { z } from 'zod'

export const KINDS = ['Bug', 'Feature request', 'Improvement', 'Question', 'Other'] as const
export const SEVERITIES = ['Low', 'Medium', 'High', 'Unknown'] as const

export type Kind = (typeof KINDS)[number]
export type Severity = (typeof SEVERITIES)[number]

/** Case-insensitive enum match, so "bug" or "HIGH" still land correctly. */
function looseEnum<T extends readonly string[]>(values: T, fallback: T[number]) {
  return z
    .unknown()
    .transform((v): T[number] => {
      const s = String(v ?? '').trim().toLowerCase()
      return values.find((x) => x.toLowerCase() === s) ?? fallback
    })
}

const text = z.unknown().transform((v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v)))

/** Accepts an array or a newline/bullet separated string; drops blanks and "N/A". */
const list = z.unknown().transform((v): string[] => {
  const items = Array.isArray(v) ? v.map((x) => String(x ?? '')) : typeof v === 'string' ? v.split(/\n|;\s*/) : []
  return items
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((s) => s && !/^(n\/?a|none|unknown)$/i.test(s))
})

export const ticketSchema = z.object({
  title: text,
  summary: text,
  kind: looseEnum(KINDS, 'Other'),
  severity: looseEnum(SEVERITIES, 'Unknown'),
  expected: text,
  actual: text,
  steps: list,
  environment: text,
  questions: list,
  labels: list,
})

export type Ticket = z.output<typeof ticketSchema>

const FIELDS = Object.keys(ticketSchema.shape) as (keyof Ticket)[]

/** Parse model output leniently: every field is filled, whatever came back. */
export function toTicket(data: Record<string, unknown>): Ticket {
  // Zod v4 rejects absent keys even for `unknown`, so present every key.
  return ticketSchema.parse(Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? null])))
}

export const blankTicket = (): Ticket => toTicket({})
