import { GUIDES, getGuide } from '../../../content/guides'
import { OG_SIZE, ogImage } from '../../../seo/og'

export const alt = 'Browser AI Lab guide'
export const size = OG_SIZE
export const contentType = 'image/png'
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }))

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug)!
  return ogImage({ kicker: 'Guide', title: g.title })
}
