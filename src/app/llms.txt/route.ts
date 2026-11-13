import { GUIDES } from '../../content/guides'
import { TOOL_CONTENT } from '../../content/tools'
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, absolute } from '../../site'
import { CATEGORIES, TOOLS } from '../../tools'
import { toolPath } from '../../tools/slugs'

/**
 * /llms.txt: a plain Markdown index of the site for AI assistants and answer
 * engines (llmstxt.org). Built from the same registries as the sitemap, so it
 * only lists pages that exist.
 */
export const dynamic = 'force-static'

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `${SITE_NAME} is a collection of free tools that run entirely in the web browser. AI models download once from the Hugging Face Hub and run on the device with WebGPU or WebAssembly; files, audio and text are processed locally and never uploaded. There is no sign-up and no watermark. Made by ${AUTHOR.name}.`,
    '',
  ]
  for (const c of CATEGORIES) {
    const tools = TOOLS.filter((t) => t.category === c.id)
    if (!tools.length) continue
    lines.push(`## ${c.label}`, '')
    for (const t of tools) {
      const content = TOOL_CONTENT[t.slug]
      lines.push(`- [${content.h1}](${absolute(toolPath(t.slug))}): ${content.description}`)
    }
    lines.push('')
  }
  lines.push('## Guides', '')
  for (const g of GUIDES) lines.push(`- [${g.title}](${absolute(`/guides/${g.slug}`)}): ${g.description}`)
  lines.push('', '## About', '', `- [About](${absolute('/about')})`, `- [Privacy](${absolute('/privacy')})`, `- [All tools](${absolute('/tools')})`, '')
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
