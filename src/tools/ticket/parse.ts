import { toTicket, type Ticket } from './schema'

/**
 * Pull the first balanced {...} block out of model text, tracking string
 * literals so braces inside values don't confuse the scan.
 */
export function findJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1)
  }
  // Truncated output: close what we can and hope the prefix is useful.
  return inString ? text.slice(start) + '"' + '}'.repeat(depth) : text.slice(start) + '}'.repeat(depth)
}

/** Escape raw newlines/tabs that appear inside string literals. */
function escapeInStrings(json: string): string {
  let out = ''
  let inString = false
  for (let i = 0; i < json.length; i++) {
    const c = json[i]
    if (inString && c === '\\') {
      out += c + (json[++i] ?? '')
      continue
    }
    if (c === '"') inString = !inString
    if (inString && c === '\n') out += '\\n'
    else if (inString && c === '\r') continue
    else if (inString && c === '\t') out += '\\t'
    else out += c
  }
  return out
}

/** Fix the small syntax slips small models make most often. */
function repair(json: string): string {
  return escapeInStrings(json)
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/"\s*\n\s*"/g, '", "')
}

export type ParseResult = { ok: true; ticket: Ticket } | { ok: false; reason: string }

export function parseTicket(raw: string): ParseResult {
  const block = findJsonObject(raw.replace(/```(?:json)?/gi, ''))
  if (!block) return { ok: false, reason: 'No JSON object in the model output.' }

  let data: unknown
  try {
    data = JSON.parse(block)
  } catch {
    try {
      data = JSON.parse(repair(block))
    } catch {
      return { ok: false, reason: 'The model produced malformed JSON.' }
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'Output was not an object.' }

  const ticket = toTicket(data as Record<string, unknown>)
  if (!ticket.title && !ticket.summary) return { ok: false, reason: 'The ticket came back empty.' }
  return { ok: true, ticket }
}
