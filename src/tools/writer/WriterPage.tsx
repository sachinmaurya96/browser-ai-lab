import { LlmTool, type Mode } from '../../ui/LlmTool'

const ONLY = 'Reply with the rewritten text only, with no preamble, quotes or explanation.'

const MODES: Mode[] = [
  { id: 'fix', label: 'Fix grammar', system: `Correct spelling, grammar and punctuation in the user's text. Keep their meaning, wording and tone as much as possible. ${ONLY}` },
  { id: 'tone', label: 'Change tone', system: `Rewrite the user's text in a {extra} tone. Keep all facts. ${ONLY}`, extra: { label: 'Tone', options: ['professional', 'friendly', 'confident', 'polite', 'casual', 'persuasive'] } },
  { id: 'short', label: 'Make shorter', system: `Rewrite the user's text to be about half as long while keeping every key point. ${ONLY}` },
  { id: 'simple', label: 'Simplify', system: `Rewrite the user's text in plain language a 12-year-old could understand. Avoid jargon. ${ONLY}` },
  { id: 'bullets', label: 'To bullet points', system: 'Turn the user\'s text into a concise bulleted list of its key points. Reply with the list only.' },
  { id: 'reply', label: 'Draft a reply', system: 'The user pasted a message they received. Write a {extra} reply they could send. Reply with the message only.', extra: { label: 'Reply style', options: ['polite and helpful', 'short and direct', 'warm and friendly', 'firm but respectful'] } },
  { id: 'title', label: 'Titles & hooks', system: 'Suggest 5 catchy, accurate titles or subject lines for the user\'s text as a numbered list. Reply with the list only.' },
]

export default function WriterPage() {
  return (
    <LlmTool
      slug="writer"
      modelId="onnx-community/Qwen2.5-0.5B-Instruct"
      info={{ name: 'onnx-community/Qwen2.5-0.5B-Instruct', href: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct', size: '~480 MB', task: 'rewriting' }}
      modes={MODES}
      placeholder="Paste an email, post, essay paragraph, message…"
      note="Shares its model with Triage, so if you've used one, the other loads instantly."
    />
  )
}
