import { OG_SIZE, ogImage } from '../../../seo/og'
import { CATEGORIES, TOOLS, getCategory } from '../../../tools'

export const alt = 'Browser AI Lab tool category'
export const size = OG_SIZE
export const contentType = 'image/png'
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }))

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug)!
  return ogImage({ kicker: `${TOOLS.filter((t) => t.category === c.id).length} tools`, title: c.heading, subtitle: c.blurb })
}
