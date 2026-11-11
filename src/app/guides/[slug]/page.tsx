import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDES, getGuide } from '../../../content/guides'
import { TOOL_CONTENT } from '../../../content/tools'
import { JsonLd, article } from '../../../seo/jsonld'
import { pageMetadata } from '../../../seo/metadata'
import { AUTHOR } from '../../../site'
import { getTool } from '../../../tools'
import { toolPath } from '../../../tools/slugs'
import { Breadcrumbs } from '../../../ui/Breadcrumbs'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }))

export async function generateMetadata({ params }: Props) {
  const g = getGuide((await params).slug)
  if (!g) return {}
  // Long headlines skip the site-name suffix so the title isn't truncated in results.
  const meta = pageMetadata({ title: g.title, description: g.description, path: `/guides/${g.slug}`, type: 'article', absoluteTitle: g.title.length > 48 })
  return { ...meta, openGraph: { ...meta.openGraph, type: 'article', publishedTime: g.published, modifiedTime: g.modified, authors: [AUTHOR.name] } }
}

export default async function GuidePage({ params }: Props) {
  const g = getGuide((await params).slug)
  if (!g) notFound()
  const path = `/guides/${g.slug}`

  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd data={article({ title: g.title, description: g.description, path, published: g.published, modified: g.modified })} />
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.title, path }]} />
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl">{g.title}</h1>
        <p className="mt-4 text-lg text-ink-2">{g.description}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          By <Link href="/about" className="hover:text-accent">{AUTHOR.name}</Link> · <time dateTime={g.modified}>Updated {g.modified}</time>
        </p>
      </header>
      <div className="prose-lab mt-8">{g.body}</div>
      <aside className="mt-12 rounded-xl border border-rule bg-card p-5">
        <h2 className="text-[15px] font-semibold">Tools used in this guide</h2>
        <ul className="mt-2 space-y-1.5 text-[15px]">
          {g.tools.map((s) => getTool(s) && (
            <li key={s}><Link href={toolPath(s)} className="text-accent underline underline-offset-4">{TOOL_CONTENT[s].h1}</Link> <span className="text-ink-3">— {getTool(s)!.blurb}</span></li>
          ))}
        </ul>
      </aside>
    </article>
  )
}
