import Link from 'next/link'
import { GUIDES } from '../../content/guides'
import { pageMetadata } from '../../seo/metadata'
import { Breadcrumbs } from '../../ui/Breadcrumbs'

export const metadata = pageMetadata({
  title: 'Guides: Free Private AI Tools, Step by Step',
  description: 'Step-by-step guides to removing vocals, making subtitles and understanding how on-device browser AI works, using the free Browser AI Lab tools.',
  path: '/guides',
  defaultImage: true,
})

export default function GuidesIndex() {
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }]} />
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-5xl leading-none sm:text-6xl">Guides</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">Practical walkthroughs for getting real work done with the tools, privately.</p>
      </header>
      <ul className="mt-8 space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group block rounded-xl border border-rule bg-card p-5 transition-all hover:border-ink hover:shadow-[5px_5px_0_var(--ink)]">
              <h2 className="text-xl font-semibold group-hover:text-accent">{g.title}</h2>
              <p className="mt-1 text-[15px] text-ink-2">{g.description}</p>
              <p className="mt-2 font-mono text-[11px] text-ink-3"><time dateTime={g.modified}>Updated {g.modified}</time></p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
