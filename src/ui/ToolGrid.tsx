'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { CATEGORIES, TOOLS, type Category } from '../tools'
import { toolPath } from '../tools/slugs'

/**
 * Searchable tool cards grouped by category. Rendered on the server with the
 * empty query, so every tool link is in the initial HTML; typing filters on
 * the client.
 */
export function ToolGrid({ only, headingLevel = 'h2' }: { only?: Category; headingLevel?: 'h2' | 'h3' }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const hits = TOOLS.filter((t) => (!only || t.category === only) && (!needle || `${t.name} ${t.tagline} ${t.blurb} ${t.stack.join(' ')}`.toLowerCase().includes(needle)))
  const H = headingLevel

  return (
    <div>
      {!only && (
        <div className="border-b border-rule pb-10">
          <label className="mt-8 flex max-w-lg items-center gap-2 rounded-xl border border-ink bg-card px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
            <Search size={18} className="text-ink-3" aria-hidden />
            <input aria-label="Search tools" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool: translate, subtitles, background…" className="min-w-0 flex-1 bg-transparent focus:outline-none" />
          </label>
        </div>
      )}

      {CATEGORIES.map((c) => {
        const list = hits.filter((t) => t.category === c.id)
        if (!list.length) return null
        return (
          <section key={c.id} className="mt-12" aria-labelledby={`cat-${c.slug}`}>
            {!only && (
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <H id={`cat-${c.slug}`} className="font-display text-4xl">
                  <Link href={`/category/${c.slug}`} className="hover:text-accent">{c.id}</Link>
                </H>
                <p className="text-sm text-ink-3">{c.blurb}</p>
              </div>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => (
                <li key={t.slug}>
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
                      <span className="mt-3 inline-block rounded border border-rule px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{t.stack[0]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {!hits.length && <p className="mt-12 text-center text-ink-3">No tool matches “{q}”.</p>}
    </div>
  )
}
