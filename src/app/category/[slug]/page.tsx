import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TOOL_CONTENT } from '../../../content/tools'
import { JsonLd, itemList } from '../../../seo/jsonld'
import { pageMetadata } from '../../../seo/metadata'
import { CATEGORIES, TOOLS, getCategory } from '../../../tools'
import { toolPath } from '../../../tools/slugs'
import { Breadcrumbs } from '../../../ui/Breadcrumbs'
import { ToolGrid } from '../../../ui/ToolGrid'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }))

export async function generateMetadata({ params }: Props) {
  const c = getCategory((await params).slug)
  if (!c) return {}
  return pageMetadata({ title: c.heading, description: c.description, path: `/category/${c.slug}`, keywords: c.keywords })
}

export default async function CategoryPage({ params }: Props) {
  const c = getCategory((await params).slug)
  if (!c) notFound()
  const tools = TOOLS.filter((t) => t.category === c.id)
  const path = `/category/${c.slug}`

  return (
    <div>
      <JsonLd data={itemList(c.heading, tools.map((t) => ({ name: TOOL_CONTENT[t.slug].h1, path: toolPath(t.slug) })))} />
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Tools', path: '/tools' }, { name: c.label, path }]} />
      <header className="border-b border-rule pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">{tools.length} tools · {c.blurb}</p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">{c.heading}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">{c.description}</p>
      </header>

      <ToolGrid only={c.id} />

      <section className="mt-14 border-t border-rule pt-8" aria-labelledby="why">
        <h2 id="why" className="font-display text-3xl">Why use these {c.label.toLowerCase()}</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">{c.about}</p>
      </section>

      <section className="mt-10 border-t border-rule pt-8" aria-labelledby="what">
        <h2 id="what" className="font-display text-3xl">What each tool does</h2>
        <dl className="mt-4 space-y-4">
          {tools.map((t) => (
            <div key={t.slug}>
              <dt className="font-semibold"><Link href={toolPath(t.slug)} className="inline-block py-0.5 hover:text-accent">{TOOL_CONTENT[t.slug].h1}</Link></dt>
              <dd className="text-[15px] text-ink-2">{TOOL_CONTENT[t.slug].description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="Other categories" className="mt-12 flex flex-wrap gap-2 text-sm">
        {CATEGORIES.filter((o) => o.slug !== c.slug).map((o) => (
          <Link key={o.slug} href={`/category/${o.slug}`} className="rounded-full border border-rule px-3 py-1.5 text-ink-2 hover:border-ink hover:text-ink">{o.label}</Link>
        ))}
      </nav>
    </div>
  )
}
