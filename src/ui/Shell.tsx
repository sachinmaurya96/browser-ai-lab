import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Coffee, Moon, Sun, WifiOff } from 'lucide-react'
import { LINKS } from './Home'
import { CATEGORIES, TOOLS } from '../tools'
import { cx } from './kit'

type Theme = 'light' | 'dark'

function useTheme() {
  const initial = (): Theme => {
    const set = document.documentElement.dataset.theme
    if (set === 'light' || set === 'dark') return set
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [theme, setTheme] = useState<Theme>(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('lab-theme', theme)
    } catch {
      /* storage unavailable */
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--ink)" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="var(--accent)" strokeWidth="3" />
        <circle cx="16" cy="16" r="2.5" fill="var(--paper)" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[22px] italic">Browser AI Lab</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">on-device · no server</span>
      </span>
    </NavLink>
  )
}

export function Shell() {
  const [theme, toggleTheme] = useTheme()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="grid size-9 place-items-center rounded-md border border-rule text-ink-2 hover:border-ink hover:text-ink"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-paper-2/60 px-5 py-6 lg:flex">
        <Logo />
        <nav aria-label="Tools" className="-mx-2 mt-8 flex-1 space-y-5 overflow-y-auto px-2 pb-4">
          {CATEGORIES.map((c) => (
            <div key={c.id}>
              <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{c.id}</p>
              {TOOLS.filter((t) => t.category === c.id).map((t) => (
                <NavLink
                  key={t.slug}
                  to={`/${t.slug}`}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-card hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <t.icon size={15} className={isActive ? 'text-accent' : undefined} />
                      <span className="truncate font-medium">{t.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
            <WifiOff size={14} className="mt-0.5 shrink-0" />
            Free forever. Models download once, then run offline in this tab.
          </p>
          <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
            <Coffee size={15} /> Buy me a coffee
          </a>
          <div className="flex items-center justify-between">
            {themeButton}
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="text-xs text-ink-3 hover:text-accent">by Sachin Maurya</a>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          {themeButton}
        </div>
        <nav aria-label="Tools" className="flex gap-1.5 overflow-x-auto px-4 pb-3">
          {TOOLS.map((t) => (
            <NavLink
              key={t.slug}
              to={`/${t.slug}`}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
                  isActive ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2',
                )
              }
            >
              <t.icon size={14} />
              {t.name}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<p className="font-mono text-sm text-ink-3">Loading instrument…</p>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export function ToolIntro({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const index = TOOLS.findIndex((t) => t.slug === slug)
  const tool = TOOLS[index]
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
          {tool.category} · No. {String(index + 1).padStart(2, '0')} — {tool.tagline}
        </p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">{tool.name}</h1>
        <p className="mt-3 text-lg text-ink-2">{tool.blurb}</p>
      </div>
      {children}
    </header>
  )
}
