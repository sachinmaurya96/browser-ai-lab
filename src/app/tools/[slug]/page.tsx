import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Cpu, HardDrive, ShieldCheck } from 'lucide-react'
import { TOOL_CONTENT } from '../../../content/tools'
import { JsonLd, faqPage, toolApp } from '../../../seo/jsonld'
import { pageMetadata } from '../../../seo/metadata'
import { TOOLS, categoryOf, getTool } from '../../../tools'
import { toolPath } from '../../../tools/slugs'
import { Breadcrumbs } from '../../../ui/Breadcrumbs'
import { Kicker } from '../../../ui/kit'
import { FavoriteButton, ToolApp } from '../../../ui/ToolApp'

type Props = { params: Promise<{ slug: string }> }

// Every tool page is prerendered at build time; anything else is a real 404.
export const dynamicParams = false
export const generateStaticParams = () => TOOLS.map((t) => ({ slug: t.slug }))

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const c = TOOL_CONTENT[slug]
  if (!c) return {}
  return pageMetadata({ title: c.title, description: c.description, path: toolPath(slug), keywords: c.keywords })
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  const tool = getTool(slug)
  const c = TOOL_CONTENT[slug]
  if (!tool || !c) notFound()
  const cat = categoryOf(tool)
  const path = toolPath(slug)
  const related = c.related.map(getTool).filter((t) => t !== undefined)
  const siblings = TOOLS.filter((t) => t.category === tool.category && t.slug !== slug && !c.related.includes(t.slug))

  return (
    <article className="space-y-6">
      <JsonLd data={c.faqs.length ? [toolApp(tool, c, path), faqPage(c.faqs)] : toolApp(tool, c, path)} />
      <header className="border-b border-rule pb-6">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: cat.label, path: `/category/${cat.slug}` }, { name: tool.name, path }]} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
              {tool.name} — {tool.tagline}
            </p>
            <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">{c.h1}</h1>
            <p className="mt-3 text-lg text-ink-2">{c.intro}</p>
          </div>
          <FavoriteButton slug={slug} />
        </div>
      </header>

      <ToolApp slug={slug} />

      <div className="grid gap-10 border-t border-rule pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-10">
          <section aria-labelledby="how">
            <h2 id="how" className="font-display text-4xl">How to use {tool.name}</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2 marker:font-mono marker:text-accent">
              {c.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </section>

          <section aria-labelledby="features">
            <h2 id="features" className="font-display text-4xl">Features</h2>
            <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-ink-2">
              {c.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-accent" aria-hidden>●</span>{f}</li>
              ))}
            </ul>
          </section>

          {c.useCases && c.useCases.length > 0 && (
            <section aria-labelledby="uses">
              <h2 id="uses" className="font-display text-4xl">Popular uses</h2>
              <ul className="mt-4 grid gap-2 text-[15px] leading-relaxed text-ink-2 sm:grid-cols-2">
                {c.useCases.map((u) => (
                  <li key={u} className="flex gap-2 rounded-lg border border-rule bg-card px-3 py-2"><span className="text-accent" aria-hidden>→</span>{u}</li>
                ))}
              </ul>
            </section>
          )}

          {c.faqs.length > 0 && (
            <section aria-labelledby="faq">
              <h2 id="faq" className="font-display text-4xl">Frequently asked questions</h2>
              <div className="mt-4 space-y-5">
                {c.faqs.map((f) => (
                  <div key={f.q}>
                    <h3 className="text-[15px] font-semibold">{f.q}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {c.formats && (
            <section aria-labelledby="formats" className="rounded-xl border border-rule bg-card p-5">
              <h2 id="formats" className="text-[15px] font-semibold">Supported formats</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="font-mono text-[11px] uppercase tracking-wide text-ink-3">Input</dt><dd>{c.formats.input}</dd></div>
                <div><dt className="font-mono text-[11px] uppercase tracking-wide text-ink-3">Output</dt><dd>{c.formats.output}</dd></div>
              </dl>
            </section>
          )}

          <section aria-labelledby="privacy" className="rounded-xl border border-rule bg-card p-5">
            <h2 id="privacy" className="flex items-center gap-2 text-[15px] font-semibold"><ShieldCheck size={16} className="text-sea" aria-hidden /> Private by design</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {c.model
                ? 'The AI model downloads to your browser once and then runs on your own device. Your files and text are processed locally and never uploaded.'
                : 'This tool runs entirely in your browser with no download. Nothing you enter is sent to a server.'}
            </p>
          </section>

          {c.model && (
            <section aria-labelledby="model" className="rounded-xl border border-rule bg-card p-5">
              <h2 id="model" className="flex items-center gap-2 text-[15px] font-semibold"><Cpu size={16} className="text-accent" aria-hidden /> AI model</h2>
              <p className="mt-2 text-sm">
                <a href={c.model.href} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-4 hover:decoration-accent">{c.model.name}</a>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><HardDrive size={14} aria-hidden /> One-time download: {c.model.size}</p>
              <p className="mt-2 text-xs text-ink-3">WebGPU is used when available, with a WebAssembly (CPU) fallback.{c.model.note ? ` ${c.model.note}` : ''}</p>
            </section>
          )}
        </aside>
      </div>

      <section aria-labelledby="related" className="border-t border-rule pt-10">
        <h2 id="related" className="font-display text-4xl">Related tools</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {related.map((t) => (
            <li key={t.slug}>
              <Link href={toolPath(t.slug)} className="group flex h-full gap-3 rounded-xl border border-rule bg-card p-4 transition-all hover:border-ink">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-paper group-hover:bg-accent group-hover:text-accent-ink" aria-hidden>
                  <t.icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold">{t.name} <ArrowUpRight size={14} className="text-ink-3" aria-hidden /></span>
                  <span className="block text-sm text-ink-2">{t.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {siblings.length > 0 && (
          <div className="mt-6">
            <Kicker>More {cat.label.toLowerCase()}</Kicker>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {siblings.map((t) => <li key={t.slug}><Link href={toolPath(t.slug)} className="underline decoration-rule underline-offset-4 hover:text-accent">{t.name}</Link></li>)}
              <li><Link href={`/category/${cat.slug}`} className="font-medium text-accent hover:underline">All {cat.label.toLowerCase()} →</Link></li>
            </ul>
          </div>
        )}
      </section>
    </article>
  )
}
