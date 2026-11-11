'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, Moon, Star, Sun, WifiOff } from 'lucide-react'
import { useFavorites } from '../lib/favorites'
import { LINKS } from '../site'
import { CATEGORIES, TOOLS, type Tool } from '../tools'
import { toolPath } from '../tools/slugs'
import { cx } from './kit'

type Theme = 'light' | 'dark'

/**
 * The inline script in the root layout applies the saved theme before first
 * paint; this hook only reads it after hydration, so server and client markup
 * always match.
 */
function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null)
  useEffect(() => {
    const set = document.documentElement.dataset.theme
    setTheme(set === 'light' || set === 'dark' ? set : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('lab-theme', next)
    } catch {
      /* storage unavailable */
    }
    setTheme(next)
  }
  return [theme, toggle] as const
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--ink)" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="var(--accent)" strokeWidth="3" />
        <circle cx="16" cy="16" r="2.5" fill="var(--paper)" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[22px] italic">Browser AI Lab</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">on-device · no server</span>
      </span>
    </Link>
  )
}

/** Sidebar link with a hover star to add/remove the tool from favourites. */
function NavItem({ tool, fav, active, onToggle }: { tool: Tool; fav: boolean; active: boolean; onToggle: () => void }) {
  return (
    <div className="group relative">
      <Link
        href={toolPath(tool.slug)}
        aria-current={active ? 'page' : undefined}
        className={cx('flex items-center gap-2.5 rounded-md py-1.5 pr-8 pl-3 text-sm transition-colors', active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-card hover:text-ink')}
      >
        <tool.icon size={15} className={active ? 'text-accent' : undefined} aria-hidden />
        <span className="truncate font-medium">{tool.name}</span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-label={fav ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        aria-pressed={fav}
        title={fav ? 'Remove from favorites' : 'Add to favorites'}
        className={cx(
          'absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded transition-opacity',
          fav ? 'text-sun opacity-100' : 'text-ink-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-sun',
        )}
      >
        <Star size={13} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const [theme, toggleTheme] = useTheme()
  const pathname = usePathname()
  const { favorites, toggle, isFavorite } = useFavorites()
  const favTools = favorites.map((s) => TOOLS.find((t) => t.slug === s)).filter((t): t is Tool => !!t)
  const isActive = (t: Tool) => pathname === toolPath(t.slug)

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
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
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-sun">
              <Star size={11} fill="currentColor" /> Favorites
            </p>
            {favTools.length ? (
              favTools.map((t) => <NavItem key={t.slug} tool={t} fav active={isActive(t)} onToggle={() => toggle(t.slug)} />)
            ) : (
              <p className="px-3 text-xs leading-relaxed text-ink-3">Hover any tool and click ☆ to pin it here.</p>
            )}
          </div>
          {CATEGORIES.map((c) => (
            <div key={c.id}>
              <Link href={`/category/${c.slug}`} className="mb-1.5 block px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 hover:text-accent">
                {c.id}
              </Link>
              {TOOLS.filter((t) => t.category === c.id).map((t) => (
                <NavItem key={t.slug} tool={t} fav={isFavorite(t.slug)} active={isActive(t)} onToggle={() => toggle(t.slug)} />
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
            <WifiOff size={14} className="mt-0.5 shrink-0" aria-hidden />
            Free forever. Models download once, then run offline in this tab.
          </p>
          <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
            <Coffee size={15} aria-hidden /> Buy me a coffee
          </a>
          <div className="flex items-center justify-between">
            {themeButton}
            <Link href="/about" className="text-xs text-ink-3 hover:text-accent">by Sachin Maurya</Link>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          {themeButton}
        </div>
        <nav aria-label="Tools (mobile)" className="flex gap-1.5 overflow-x-auto px-4 pb-3">
          {[...favTools, ...TOOLS.filter((t) => !isFavorite(t.slug))].map((t) => (
            <Link
              key={t.slug}
              href={toolPath(t.slug)}
              aria-current={isActive(t) ? 'page' : undefined}
              className={cx('flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', isActive(t) ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2')}
            >
              {isFavorite(t.slug) ? <Star size={13} className="text-sun" fill="currentColor" aria-hidden /> : <t.icon size={14} aria-hidden />}
              {t.name}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}

/**
 * Tool pages used to render their own title block here. The server-rendered
 * page header (app/tools/[slug]) now owns the H1, so this only shows any
 * extra actions a tool passes in (e.g. "New song").
 */
export function ToolIntro({ children }: { slug: string; children?: ReactNode }) {
  if (!children) return null
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>
}
