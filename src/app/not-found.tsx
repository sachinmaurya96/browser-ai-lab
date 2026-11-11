import Link from 'next/link'
import type { Metadata } from 'next'
import { TOOLS } from '../tools'
import { toolPath } from '../tools/slugs'

// Next also adds its own `noindex` tag; this overrides the layout's `index, follow` so the two agree.
export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } }

/** Served with a real 404 status for any unknown URL. */
export default function NotFound() {
  const popular = ['vocal-remover', 'background-remover', 'speech-to-text', 'merge-pdf', 'ai-translator', 'private-ai-chat']
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 font-display text-6xl">Nothing on this page.</h1>
      <p className="mt-4 text-ink-2">The link may be old or mistyped. Try one of these, or browse all tools.</p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
        {popular.map((s) => {
          const t = TOOLS.find((x) => x.slug === s)!
          return <li key={s}><Link href={toolPath(s)} className="rounded-full border border-rule px-3 py-1.5 hover:border-ink">{t.name}</Link></li>
        })}
      </ul>
      <p className="mt-8 flex justify-center gap-6">
        <Link href="/" className="underline underline-offset-4 hover:text-accent">Back to the lab</Link>
        <Link href="/tools" className="underline underline-offset-4 hover:text-accent">All tools</Link>
      </p>
    </div>
  )
}
