import type { Metadata } from 'next'
import { SITE_NAME } from '../site'

/**
 * Metadata for one indexable page: self-referencing canonical plus matching
 * Open Graph and Twitter cards. `path` is site-relative ("/tools/merge-pdf");
 * the root layout's metadataBase turns it into an absolute URL.
 * OG/Twitter images come from the nearest opengraph-image file convention.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
  keywords,
  absoluteTitle,
  defaultImage,
}: {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  keywords?: string[]
  /** Use `title` as-is instead of appending the site name. */
  absoluteTitle?: boolean
  /**
   * For segments without their own opengraph-image file: a child `openGraph`
   * object replaces the parent's, so the root card must be named explicitly.
   */
  defaultImage?: boolean
}): Metadata {
  const full = absoluteTitle ? title : `${title} | ${SITE_NAME}`
  const images = defaultImage ? [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME}: free AI tools that run in your browser` }] : undefined
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: path },
    // Only set `images` when given: even an undefined key would hide the segment's opengraph-image file.
    openGraph: { type, url: path, title: full, description, siteName: SITE_NAME, locale: 'en_IN', ...(images && { images }) },
    twitter: { card: 'summary_large_image', title: full, description, ...(images && { images: images.map((i) => i.url) }) },
  }
}
