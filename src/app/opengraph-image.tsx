import { OG_SIZE, ogImage } from '../seo/og'

export const alt = 'Browser AI Lab: free AI tools that run in your browser'
export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return ogImage({ kicker: 'Free · private · on-device', title: 'Useful AI. Zero servers.', subtitle: 'Background remover, vocal remover, speech to text, PDF tools and more.' })
}
