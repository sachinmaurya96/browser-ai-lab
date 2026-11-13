/**
 * Site-wide constants. Everything that depends on the deployment comes from
 * environment variables so previews, staging and production can differ
 * without code changes. See .env.example.
 */

/** Canonical origin, no trailing slash. Used for canonicals, sitemap, JSON-LD and OG URLs. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.browserailab.com').replace(/\/+$/, '')

export const SITE_NAME = 'Browser AI Lab'
export const SITE_TAGLINE = 'Free AI tools that run in your browser'
export const SITE_DESCRIPTION =
  'Free, private AI tools that run in your browser: remove backgrounds, split vocals, transcribe audio, edit PDFs and style screenshots. No upload, no sign-up.'

export const AUTHOR = {
  name: 'Sachin Maurya',
  url: 'https://www.linkedin.com/in/sachin-maurya-826111267/',
  photo: '/sachin.jpg',
}

export const LINKS = {
  linkedin: AUTHOR.url,
  coffee: 'https://buymeacoffee.com/sachin9695',
}

/**
 * Only production deployments may be indexed. Vercel preview and development
 * deployments get `noindex` so their *.vercel.app URLs never compete with the
 * real domain. Local builds (no VERCEL_ENV) behave like production.
 */
export const INDEXABLE = !['preview', 'development'].includes(process.env.VERCEL_ENV ?? '')

/** Optional GA4 measurement ID; empty means no analytics code at all. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''

export const absolute =(path = '/') => `${SITE_URL}${path === '/' ? '' : path}`
