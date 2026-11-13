import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import '../styles.css'
import { INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, AUTHOR } from '../site'
import { LEGACY_SLUGS } from '../tools/slugs'
import { Shell } from '../ui/Shell'
import { SiteFooter } from '../ui/SiteFooter'
import { Analytics } from '../ui/Analytics'

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument', display: 'swap' })
const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Free Private AI Tools in Your Browser`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  robots: INDEXABLE ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } } : { index: false, follow: false },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1ea' },
    { media: '(prefers-color-scheme: dark)', color: '#151412' },
  ],
}

// Apply the saved theme before first paint to avoid a flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem('lab-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;if(localStorage.getItem('lab-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`

// The old site used hash routes (/#/cutout). Fragments never reach the server,
// so map them here, before paint, to the new permanent URLs.
const HASH_REDIRECT_SCRIPT = `(function(){var h=location.hash;if(h.indexOf('#/')!==0)return;var s=h.slice(2).split(/[?#]/)[0].replace(/\\/$/,'');var m=${JSON.stringify(LEGACY_SLUGS)};if(m[s])location.replace('/tools/'+m[s]);else history.replaceState(null,'',location.pathname+location.search)})()`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: HASH_REDIRECT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <Shell>
          {children}
          <SiteFooter />
        </Shell>
        <Analytics />
      </body>
    </html>
  )
}
