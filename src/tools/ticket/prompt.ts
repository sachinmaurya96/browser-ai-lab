import { KINDS, SEVERITIES } from './schema'
import type { CompleteInput } from './worker'

type Messages = CompleteInput['messages']

const SHAPE = `{
  "title": "short imperative summary, under 80 characters",
  "summary": "two or three neutral sentences describing the problem",
  "kind": one of ${KINDS.map((k) => `"${k}"`).join(' | ')},
  "severity": one of ${SEVERITIES.map((k) => `"${k}"`).join(' | ')},
  "expected": "what the reporter expected to happen, or empty string",
  "actual": "what actually happened, or empty string",
  "steps": ["each step the reporter described, in order"],
  "environment": "device, browser, OS or app version ONLY if the reporter said it, else empty string",
  "questions": ["what a developer still needs to ask the reporter"],
  "labels": ["1-3 lowercase area tags such as checkout, login, export"]
}`

const SYSTEM = `You are a support engineer who files tidy issue tickets from customer messages.

Reply with exactly one JSON object in this shape and nothing else — no prose, no markdown fences:
${SHAPE}

Guidelines:
1. Translate frustrated or rambling wording into calm, factual language. Drop insults and repetition, keep every concrete detail (counts, times, button names, error text).
2. Never make things up. Unstated browser, device, account or URL details belong in "questions", not in "environment".
3. Describe symptoms, not guesses about causes. "The page went blank" stays that way.
4. Choose severity from impact alone: lost data or fully blocked work is "High"; a workaround exists is "Medium" or "Low". Words like "urgent" or "ASAP" are not evidence. When unsure use "Unknown".
5. If the message is too vague to classify, use kind "Other".
6. Use "" and [] for anything not provided.`

const SAMPLE_IN = `the export button on reports gives me a csv with no rows in it?? did it 3x, the table on screen clearly has like 40 entries. need this for my monthly review`

const SAMPLE_OUT = JSON.stringify({
  title: 'Report CSV export downloads an empty file',
  summary: 'Exporting a report to CSV produces a file with no data rows, although the on-screen table shows about 40 entries. The reporter reproduced this three times.',
  kind: 'Bug',
  severity: 'Medium',
  expected: 'The CSV contains the same rows shown in the report table.',
  actual: 'The downloaded CSV has no data rows.',
  steps: ['Open a report that shows rows in the table', 'Click the export button', 'Open the downloaded CSV'],
  environment: '',
  questions: ['Which report and filters were used?', 'Does the file contain a header row?', 'Which browser and operating system?'],
  labels: ['reports', 'export'],
})

const wrap = (s: string) => `Customer message:\n<<<\n${s.trim()}\n>>>`

export function firstPass(message: string): Messages {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: wrap(SAMPLE_IN) },
    { role: 'assistant', content: SAMPLE_OUT },
    { role: 'user', content: wrap(message) },
  ]
}

/** Shorter, stricter prompt used once if the first answer wasn't usable JSON. */
export function secondPass(message: string): Messages {
  return [
    {
      role: 'system',
      content: `Return only a JSON object with keys title, summary, kind, severity, expected, actual, steps, environment, questions, labels.
kind is one of ${KINDS.join(', ')}. severity is one of ${SEVERITIES.join(', ')}. steps, questions and labels are arrays of strings. Use "" or [] when unknown. Do not invent facts.`,
    },
    { role: 'user', content: wrap(message) },
  ]
}

export const SAMPLES = [
  {
    label: 'Lost draft',
    text: `I spent an hour writing a long product description, hit Publish and got a spinning wheel for ages. Eventually I clicked back and the whole draft was GONE. This is the second time this week. I'm on my work laptop if that matters.`,
  },
  {
    label: 'Feature wish',
    text: `would be really nice if I could get a weekly email summary of my team's activity instead of logging in every day to check the dashboard`,
  },
  {
    label: 'Vague rant',
    text: `app is broken again!!! nothing works. fix it NOW`,
  },
  {
    label: 'Payment glitch',
    text: `Tried to pay my invoice with a card and it said "Payment failed, code 402" but my bank shows the charge went through. Tried again and got charged twice. Now I have three pending charges and the invoice still says unpaid.`,
  },
]
