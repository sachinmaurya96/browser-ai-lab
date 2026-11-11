import { TOOL_CONTENT } from '../../../content/tools'
import { OG_SIZE, ogImage } from '../../../seo/og'
import { TOOLS, getTool } from '../../../tools'

export const alt = 'Browser AI Lab tool'
export const size = OG_SIZE
export const contentType = 'image/png'
export const generateStaticParams = () => TOOLS.map((t) => ({ slug: t.slug }))

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = getTool(slug)!
  return ogImage({ kicker: `${tool.category} tool`, title: TOOL_CONTENT[slug].h1, subtitle: tool.blurb })
}
