/**
 * schema.org JSON-LD builders. Only properties we can state truthfully are
 * included: no ratings, reviews or download counts. Note that Google shows
 * software rich results only with ratings/reviews, so the WebApplication
 * markup here describes the tools without making them eligible for stars.
 */
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absolute } from '../site'
import type { Tool } from '../tools'
import type { ToolContent } from '../content/tools'

type Json = Record<string, unknown>

/** Render JSON-LD safely: `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

const ORG_ID = `${SITE_URL}/#organization`
const SITE_ID = `${SITE_URL}/#website`

export const organization = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absolute('/icon.png'),
  founder: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
  sameAs: [AUTHOR.url],
})

export const website = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en',
  publisher: { '@id': ORG_ID },
})

export const breadcrumbs = (items: { name: string; path: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path) })),
})

const APP_CATEGORY: Record<Tool['category'], string> = {
  Social: 'DesignApplication',
  PDF: 'BusinessApplication',
  Image: 'MultimediaApplication',
  Audio: 'MultimediaApplication',
  Text: 'UtilitiesApplication',
  Assistants: 'UtilitiesApplication',
  Developer: 'DeveloperApplication',
  'Dev Utilities': 'DeveloperApplication',
}

export const toolApp = (tool: Tool, c: ToolContent, path: string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: c.h1,
  alternateName: tool.name,
  url: absolute(path),
  description: c.description,
  applicationCategory: APP_CATEGORY[tool.category],
  operatingSystem: 'Any (runs in a modern web browser)',
  browserRequirements: c.model ? 'Requires JavaScript. WebGPU recommended; falls back to WebAssembly.' : 'Requires JavaScript.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: c.features,
  publisher: { '@id': ORG_ID },
})

export const itemList = (name: string, items: { name: string; path: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: absolute(it.path) })),
})

export const article = (a: { title: string; description: string; path: string; published: string; modified: string }): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.description,
  url: absolute(a.path),
  mainEntityOfPage: absolute(a.path),
  datePublished: a.published,
  dateModified: a.modified,
  image: absolute(`${a.path}/opengraph-image`),
  author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
  publisher: { '@id': ORG_ID },
})
