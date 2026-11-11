import type { NextConfig } from 'next'
import { LEGACY_SLUGS } from './src/tools/slugs'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://browserailab.in').replace(/\/+$/, '')
const CANONICAL_HOST = new URL(SITE_URL).host

/**
 * Hosts that should 308 to the canonical domain. Off until the custom domain
 * is live (ENABLE_DOMAIN_REDIRECTS=true in Vercel), otherwise the existing
 * *.vercel.app site would redirect visitors to a domain that doesn't resolve yet.
 * Fragments (/#/cutout) survive the redirect; the layout script then maps them.
 */
const LEGACY_HOSTS = (process.env.LEGACY_HOSTS || 'browser-ai-lab.vercel.app,www.browserailab.in')
  .split(',')
  .map((h) => h.trim())
  .filter((h) => h && h !== CANONICAL_HOST)

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      // espeak-ng (piper_phonemize) build from an MIT package whose export map
      // only exposes its high-level API; we need the phonemizer itself.
      'piper-phonemize': './node_modules/@mintplex-labs/piper-tts-web/dist/piper-o91UDS6e.js',
      // Emscripten output requires `fs` only inside its Node.js branch.
      fs: { browser: './src/lib/empty.ts' },
    },
  },
  async redirects() {
    const tools = Object.entries(LEGACY_SLUGS).flatMap(([old, slug]) => [
      { source: `/${old}`, destination: `/tools/${slug}`, permanent: true },
      ...(old === slug ? [] : [{ source: `/tools/${old}`, destination: `/tools/${slug}`, permanent: true }]),
    ])
    const hosts =
      process.env.ENABLE_DOMAIN_REDIRECTS === 'true'
        ? LEGACY_HOSTS.map((host) => ({
            source: '/:path*',
            has: [{ type: 'host' as const, value: host }],
            destination: `${SITE_URL}/:path*`,
            permanent: true,
          }))
        : []
    return [...hosts, ...tools, { source: '/index.html', destination: '/', permanent: true }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Camera/microphone are used by Look & Ask and the recorders, on this origin only.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
        ],
      },
    ]
  },
}

export default config
