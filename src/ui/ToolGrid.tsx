'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { CATEGORIES, FEATURED, TOOLS, type Category, type Tool } from '../tools'
import { toolPath } from '../tools/slugs'

/** Tools that need no model download (pure browser APIs). */
const INSTANT = new Set(['local', 'pdf-lib', 'pdf.js', 'Web Crypto'])

function Card({ t }: { t: Tool }) {
  return (
    <Link href={toolPath(t.slug)} className="group flex h-full gap-4 rounded-xl border border-rule bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[5px_5px_0_var(--ink)]">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink text-paper transition-colors group-hover:bg-accent group-hover:text-accent-ink" aria-hidden>
        <t.icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span>
            <span className="block text-lg font-semibold leading-tight">{t.name}</span>
            <span className="text-sm text-ink-3">{t.tagline}</span>
          </span>
          <ArrowUpRight size={17} className="shrink-0 text-ink-3 group-hover:text-accent" aria-hidden />
        </span>
        <span className="mt-2 block text-sm text-ink-2">{t.blurb}</span>
        <span className="mt-3 inline-block rounded border border-rule px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{INSTANT.has(t.stack[0]) ? 'Instant · no download' : 'AI model · runs locally'}</span>
      </span>
    </Link>
  )
}

const cardGrid = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

/**
 * Searchable tool cards grouped by category. Rendered on the server with the
 * empty query, so every tool link is in the initial HTML; typing filters on
 * the client. On the home page the featured tools come first and the
 * categories list the rest; a search covers every tool.
 */
export function ToolGrid({ only, headingLevel = 'h2' }: { only?: Category; headingLevel?: 'h2' | 'h3' }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const H = headingLevel
  const showFeatured = !only && !needle
  const featured = FEATURED.map((s) => TOOLS.find((t) => t.slug === s)).filter((t): t is Tool => !!t)
  const hits = TOOLS.filter((t) => {
    if (only && t.category !== only) return false
    if (showFeatured && FEATURED.includes(t.slug)) return false
    if (!needle) return true
    const cat = CATEGORIES.find((c) => c.id === t.category)
    return `${t.name} ${t.tagline} ${t.blurb} ${cat?.label ?? ''}`.toLowerCase().includes(needle)
  })

  return (
    <div>
      {!only && (
        <div className="border-b border-rule pb-10">
          <label className="mt-8 flex max-w-lg items-center gap-2 rounded-xl border border-ink bg-card px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
            <Search size={18} className="text-ink-3" aria-hidden />
            <input aria-label="Search tools" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool: merge, subtitles, background, JSON…" className="min-w-0 flex-1 bg-transparent focus:outline-none" />
          </label>
          {needle && <p className="mt-3 text-sm text-ink-3" role="status">{hits.length} {hits.length === 1 ? 'tool matches' : 'tools match'} “{q.trim()}”</p>}
        </div>
      )}

      {showFeatured && (
        <section className="mt-12" aria-labelledby="featured">
          <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <H id="featured" className="font-display text-4xl">Popular tools</H>
            <p className="text-sm text-ink-3">The quickest way to get something done</p>
          </div>
          <ul className={cardGrid}>{featured.map((t) => <li key={t.slug}><Card t={t} /></li>)}</ul>
        </section>
      )}

      {CATEGORIES.map((c) => {
        const list = hits.filter((t) => t.category === c.id)
        // Featured tools aren't repeated as cards, but every category still
        // lists all of its tools.
        const alsoFeatured = showFeatured ? featured.filter((t) => t.category === c.id) : []
        if (!list.length && !alsoFeatured.length) return null
        return (
          <section key={c.id} className="mt-12" aria-labelledby={`cat-${c.slug}`}>
            {!only && (
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <H id={`cat-${c.slug}`} className="font-display text-4xl">
                  <Link href={`/category/${c.slug}`} className="hover:text-accent">{c.label}</Link>
                </H>
                <p className="text-sm text-ink-3">{c.blurb}</p>
              </div>
            )}
            {list.length > 0 && <ul className={cardGrid}>{list.map((t) => <li key={t.slug}><Card t={t} /></li>)}</ul>}
            {alsoFeatured.length > 0 && (
              <p className={list.length ? 'mt-3 text-sm text-ink-3' : 'text-sm text-ink-3'}>
                {list.length ? 'Also here: ' : 'In this category: '}
                {alsoFeatured.map((t, i) => (
                  <span key={t.slug}>
                    {i > 0 && ', '}
                    <Link href={toolPath(t.slug)} className="font-medium text-ink underline decoration-rule underline-offset-4 hover:text-accent">{t.name}</Link>
                  </span>
                ))}
                <span> (featured above)</span>
              </p>
            )}
          </section>
        )
      })}

      {needle && !hits.length && (
        <div className="mt-12 rounded-xl border border-dashed border-rule p-8 text-center">
          <p className="font-semibold">No tool matches “{q.trim()}”.</p>
          <p className="mt-1 text-sm text-ink-3">Try a simpler word like “PDF”, “image”, “audio” or “JSON”, or browse a category.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <button type="button" onClick={() => setQ('')} className="rounded-full border border-ink px-3 py-1.5 font-medium hover:bg-ink hover:text-paper">Clear search</button>
            {CATEGORIES.map((c) => <Link key={c.slug} href={`/category/${c.slug}`} className="rounded-full border border-rule px-3 py-1.5 text-ink-2 hover:border-ink hover:text-ink">{c.label}</Link>)}
          </div>
        </div>
      )}
    </div>
  )
}
