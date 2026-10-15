import { LlmTool, type Mode } from '../../ui/LlmTool'

const MODES: Mode[] = [
  { id: 'explain', label: 'Explain code', system: 'You are a senior engineer. Explain what the user\'s code does, step by step, in plain English. Mention anything surprising. Be concise.' },
  { id: 'comment', label: 'Add comments', system: 'Return the user\'s code unchanged except for clear, helpful comments and docstrings. Return only the code.' },
  { id: 'bugs', label: 'Find bugs', system: 'Review the user\'s code for bugs, edge cases and security issues. List each issue with the line or snippet, why it is a problem, and a fix. If it looks correct, say so.' },
  { id: 'convert', label: 'Convert language', system: 'Translate the user\'s code to idiomatic {extra}. Return only the code.', extra: { label: 'Target', options: ['TypeScript', 'Python', 'JavaScript', 'Go', 'Rust', 'Java', 'C#', 'Kotlin', 'PHP'] } },
  { id: 'regex', label: 'Write a regex', system: 'The user describes text they want to match. Reply with a JavaScript regular expression on the first line, then a one-line explanation, then 3 example matches.' },
  { id: 'sql', label: 'Write SQL', system: 'The user describes a database query, possibly with a schema. Write a correct, readable {extra} query. Reply with the SQL, then one sentence explaining it.', extra: { label: 'Dialect', options: ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server'] } },
  { id: 'tests', label: 'Write tests', system: 'Write focused unit tests for the user\'s code using the most common test framework for its language. Cover normal cases and edge cases. Return only the test code.' },
  { id: 'commit', label: 'Commit message', system: 'The user pasted a diff or a description of a change. Write a conventional commit message: a short imperative subject (max 72 chars), a blank line, then a brief body. Reply with the message only.' },
]

export default function CodePage() {
  return (
    <LlmTool
      slug="code"
      modelId="onnx-community/Qwen2.5-Coder-0.5B-Instruct"
      info={{ name: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct', href: 'https://huggingface.co/onnx-community/Qwen2.5-Coder-0.5B-Instruct', size: '~480 MB', task: 'code assistant' }}
      modes={MODES}
      mono
      placeholder="Paste code, a diff, or describe what you need…"
      note="Your proprietary code never leaves the browser. Small models make mistakes, so review and test what it produces."
    />
  )
}
