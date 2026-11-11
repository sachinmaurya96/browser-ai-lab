import type { MetadataRoute } from 'next'
import { INDEXABLE, absolute } from '../site'

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must never be indexed (they'd duplicate the real site).
  if (!INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absolute('/sitemap.xml'),
  }
}
