import type { Ticket } from './schema'

export function toMarkdown(t: Ticket): string {
  const out: string[] = [`# ${t.title || 'Untitled ticket'}`, '', `**Type:** ${t.kind} · **Severity:** ${t.severity}`]
  if (t.labels.length) out.push(`**Labels:** ${t.labels.map((l) => `\`${l}\``).join(' ')}`)
  const section = (h: string, body: string) => body && out.push('', `## ${h}`, '', body)
  section('Summary', t.summary)
  section('Expected', t.expected)
  section('Actual', t.actual)
  section('Steps to reproduce', t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
  section('Environment', t.environment)
  section('Open questions', t.questions.map((q) => `- [ ] ${q}`).join('\n'))
  return out.join('\n') + '\n'
}
