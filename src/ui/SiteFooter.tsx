import Link from 'next/link'
import { CATEGORIES } from '../tools'
import { LINKS } from '../site'

/** Crawlable site-wide links: categories, guides and the standard pages. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-rule pt-8 pb-4 text-sm">
      <div className="grid gap-8 sm:grid-cols-3">
        <nav aria-label="Tool categories">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Tools</p>
          <ul className="space-y-1.5">
            <li><Link href="/tools" className="inline-block py-0.5 hover:text-accent">All tools</Link></li>
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={`/category/${c.slug}`} className="inline-block py-0.5 hover:text-accent">{c.id}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Learn">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Learn</p>
          <ul className="space-y-1.5">
            <li><Link href="/guides" className="inline-block py-0.5 hover:text-accent">Guides</Link></li>
            <li><Link href="/about" className="inline-block py-0.5 hover:text-accent">About</Link></li>
            <li><Link href="/contact" className="inline-block py-0.5 hover:text-accent">Contact</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Legal</p>
          <ul className="space-y-1.5">
            <li><Link href="/privacy" className="inline-block py-0.5 hover:text-accent">Privacy policy</Link></li>
            <li><Link href="/terms" className="inline-block py-0.5 hover:text-accent">Terms of service</Link></li>
            <li><a href={LINKS.coffee} target="_blank" rel="noreferrer" className="inline-block py-0.5 hover:text-accent">Support the project</a></li>
          </ul>
        </nav>
      </div>
      <p className="mt-8 text-xs text-ink-3">© {new Date().getFullYear()} Browser AI Lab · AI models run on your device; your files are not uploaded.</p>
    </footer>
  )
}
