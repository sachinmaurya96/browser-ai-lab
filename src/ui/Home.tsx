import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Coffee, Gift, Heart, Lock, UserRound, Search, ServerOff, Zap } from 'lucide-react'
import { CATEGORIES, TOOLS } from '../tools'
import { Kicker } from './kit'

// Relative path works under any deploy base (GitHub Pages sub-path, etc.).
export const PHOTO = './sachin.jpg'

export const LINKS = {
  linkedin: 'https://www.linkedin.com/in/sachin-maurya-826111267/',
  coffee: 'https://buymeacoffee.com/sachin9695',
}

function About() {
  return (
    <section id="about" className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="rounded-xl border border-rule bg-card p-6 sm:p-8">
        <Kicker className="text-accent">About</Kicker>
        <div className="mt-4 flex items-center gap-4">
          <img src={PHOTO} alt="Sachin Maurya" width={80} height={80} className="size-20 shrink-0 rounded-full border-2 border-accent object-cover" />
          <div>
            <h2 className="font-display text-4xl leading-none">Sachin Maurya</h2>
            <p className="mt-1 text-sm text-ink-3">Builder of Browser AI Lab</p>
          </div>
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
          Hi! I built Browser AI Lab so anyone can use powerful AI tools for free, without sign-ups, subscriptions or
          handing their files to a server. Every tool runs right here in your browser, so your photos, documents, voice
          and code stay private.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Have an idea for a tool, found a bug, or want to collaborate? Let's connect.</p>
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-md border border-ink px-4 py-2 font-medium transition-colors hover:bg-ink hover:text-paper">
          <UserRound size={17} /> Connect on LinkedIn
        </a>
      </div>

      <div className="flex flex-col rounded-xl border-2 border-accent bg-accent-soft p-6 sm:p-8">
        <Kicker className="text-accent">Support the project</Kicker>
        <Heart size={30} className="mt-4 text-accent" />
        <h2 className="mt-3 font-display text-4xl leading-tight">Keep it free for everyone</h2>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-2">
          Browser AI Lab has no ads, no tracking and no paywall. If it saved you time or money, a small donation helps
          cover development and keeps new tools coming.
        </p>
        <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-paper shadow-[3px_3px_0_var(--accent)] transition-all hover:bg-accent hover:text-accent-ink hover:shadow-[3px_3px_0_var(--ink)]">
          <Coffee size={18} /> Buy me a coffee
        </a>
        <p className="mt-3 text-center text-xs text-ink-3">Any amount helps. Thank you! 💛</p>
      </div>
    </section>
  )
}

export function Home() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const match = (t: (typeof TOOLS)[number]) => !needle || `${t.name} ${t.tagline} ${t.blurb} ${t.stack.join(' ')}`.toLowerCase().includes(needle)
  const hits = TOOLS.filter(match)

  return (
    <div>
      <div className="mb-8 flex w-fit items-center rounded-full border border-rule bg-card py-1.5 pr-1.5 pl-1.5 transition-colors hover:border-ink">
        <a
          href="#about"
          onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }}
          className="group flex items-center gap-3 pr-3"
        >
          <img src={PHOTO} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
          <span className="text-sm">
            <span className="text-ink-3">Made by </span>
            <span className="font-semibold group-hover:text-accent">Sachin Maurya</span>
            <span className="hidden text-ink-3 sm:inline"> · free & open for everyone</span>
          </span>
        </a>
        <a
          href={LINKS.coffee}
          target="_blank"
          rel="noreferrer"
          title="Buy me a coffee"
          aria-label="Buy me a coffee"
          className="flex items-center gap-1.5 rounded-full bg-[#ffdd00] px-3 py-1.5 text-sm font-semibold text-[#1b1a17] transition-transform hover:-rotate-3 hover:scale-105"
        >
          <Coffee size={16} strokeWidth={2.4} />
          <span className="hidden sm:inline">Coffee</span>
        </a>
      </div>

      <section className="border-b border-rule pb-10">
        <Kicker className="text-accent">{TOOLS.length} free tools · runs on your device</Kicker>
        <h1 className="mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-7xl">
          Useful AI. <em className="text-accent">Zero</em> servers.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">
          Every model downloads to your browser and runs on your own GPU or CPU. Your photos, voice, documents and code
          never leave this tab. No sign-up, no limits, no cost.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <li className="flex items-center gap-2"><Gift size={16} className="text-accent" /> Free for everyone</li>
          <li className="flex items-center gap-2"><ServerOff size={16} className="text-accent" /> No backend or API keys</li>
          <li className="flex items-center gap-2"><Lock size={16} className="text-accent" /> Data stays on device</li>
          <li className="flex items-center gap-2"><Zap size={16} className="text-accent" /> WebGPU with CPU fallback</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }} className="underline decoration-rule underline-offset-4 hover:text-accent">About the maker</a>
          <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"><Coffee size={15} /> Support this project</a>
        </div>
        <label className="mt-8 flex max-w-lg items-center gap-2 rounded-xl border border-ink bg-card px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
          <Search size={18} className="text-ink-3" />
          <input aria-label="Search tools" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool: translate, subtitles, background…" className="min-w-0 flex-1 bg-transparent focus:outline-none" />
        </label>
      </section>

      {CATEGORIES.map((c) => {
        const list = hits.filter((t) => t.category === c.id)
        if (!list.length) return null
        return (
          <section key={c.id} className="mt-12">
            <div className="mb-5 flex items-baseline gap-3">
              <h2 className="font-display text-4xl">{c.id}</h2>
              <p className="text-sm text-ink-3">{c.blurb}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => (
                <li key={t.slug}>
                  <Link to={`/${t.slug}`} className="group flex h-full gap-4 rounded-xl border border-rule bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[5px_5px_0_var(--ink)]">
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink text-paper transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                      <t.icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block text-lg font-semibold leading-tight">{t.name}</span>
                          <span className="text-sm text-ink-3">{t.tagline}</span>
                        </span>
                        <ArrowUpRight size={17} className="shrink-0 text-ink-3 group-hover:text-accent" />
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

      <About />

      <p className="mt-10 rounded-xl border border-dashed border-rule p-5 text-sm text-ink-3">
        First use of each tool downloads its model once (from ~25 MB up to ~1 GB), then it's cached. Chrome or Edge with
        WebGPU is fastest; other browsers use the CPU and are slower.
      </p>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 font-display text-6xl">Nothing on this page.</h1>
      <Link to="/" className="mt-6 inline-block underline underline-offset-4 hover:text-accent">
        Back to the lab
      </Link>
    </div>
  )
}
