import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME } from '../site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'AI Lab',
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f1ea',
    theme_color: '#1b1a17',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
  }
}
