import type { MetadataRoute } from 'next'
import { GUIDES } from '../content/guides'
import { absolute } from '../site'
import { CATEGORIES, TOOLS } from '../tools'
import { toolPath } from '../tools/slugs'

/**
 * Generated from the same registries that create the routes, so it can only
 * list pages that exist. `lastModified` is omitted for tools and categories:
 * Google ignores it unless it is consistently accurate, and a build timestamp
 * would claim every page changed on every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/tools', '/guides', '/about', '/contact', '/privacy', '/terms']
  return [
    ...pages.map((p) => ({ url: absolute(p) })),
    ...TOOLS.map((t) => ({ url: absolute(toolPath(t.slug)) })),
    ...CATEGORIES.map((c) => ({ url: absolute(`/category/${c.slug}`) })),
    ...GUIDES.map((g) => ({ url: absolute(`/guides/${g.slug}`), lastModified: g.modified })),
  ]
}
