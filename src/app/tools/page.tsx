import Link from 'next/link'
import { TOOL_CONTENT } from '../../content/tools'
import { JsonLd, itemList } from '../../seo/jsonld'
import { pageMetadata } from '../../seo/metadata'
import { CATEGORIES, TOOLS } from '../../tools'
import { toolPath } from '../../tools/slugs'
import { Breadcrumbs } from '../../ui/Breadcrumbs'

export const metadata = pageMetadata({
  title: `All ${TOOLS.length} Free AI and Utility Tools`,
  description: `A directory of all ${TOOLS.length} Browser AI Lab tools: PDF, image, audio, text, social media and developer tools that run privately in your browser.`,
  path: '/tools',
  defaultImage: true,
})

/** A compact A–Z-by-category directory, distinct from the home page's card grid. */
export default function ToolsIndex() {
  return (
    <div>
      <JsonLd data={itemList('Browser AI Lab tools', TOOLS.map((t) => ({ name: TOOL_CONTENT[t.slug].h1, path: toolPath(t.slug) })))} />
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'All tools', path: '/tools' }]} />
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-5xl leading-none sm:text-6xl">All tools</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">
          Every tool in the lab, grouped by what it works on. AI tools download their model once and run on your device;
          utilities work instantly. Nothing you open is uploaded.
        </p>
      </header>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        {CATEGORIES.map((c) => (
          <section key={c.id} aria-labelledby={`dir-${c.slug}`}>
            <h2 id={`dir-${c.slug}`} className="font-display text-3xl">
              <Link href={`/category/${c.slug}`} className="hover:text-accent">{c.label}</Link>
            </h2>
            <p className="text-sm text-ink-3">{c.blurb}</p>
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {TOOLS.filter((t) => t.category === c.id).map((t) => (
                <li key={t.slug}>
                  <Link href={toolPath(t.slug)} className="group flex items-baseline gap-3 py-2.5">
                    <span className="font-semibold group-hover:text-accent">{TOOL_CONTENT[t.slug].h1}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-3">{t.stack[0] === 'local' ? 'instant' : t.stack[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
