'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Coffee, House, Menu, Moon, Star, Sun, WifiOff, X } from 'lucide-react'
import { useFavorites } from '../lib/favorites'
import { LINKS } from '../site'
import { CATEGORIES, TOOLS, type Category, type Tool } from '../tools'
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
        <tool.icon size={15} className={cx('shrink-0', active && 'text-accent')} aria-hidden />
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

/** ↑/↓/Home/End move focus between category headers, like a native accordion. */
function onHeaderKey(e: KeyboardEvent<HTMLButtonElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const nav = e.currentTarget.closest('nav')
  const headers = [...(nav?.querySelectorAll<HTMLButtonElement>('button[data-category]') ?? [])]
  const i = headers.indexOf(e.currentTarget)
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? headers.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + headers.length) % headers.length
  e.preventDefault()
  headers[next]?.focus()
}

/**
 * Home, favourites and the tool categories as an accordion. One category is
 * open at a time; the one holding the current tool opens automatically.
 */
function ToolNav({ label, idPrefix }: { label: string; idPrefix: string }) {
  const pathname = usePathname()
  const { favorites, toggle, isFavorite } = useFavorites()
  const favTools = favorites.map((s) => TOOLS.find((t) => t.slug === s)).filter((t): t is Tool => !!t)
  const isActive = (t: Tool) => pathname === toolPath(t.slug)
  const current = TOOLS.find(isActive)?.category ?? CATEGORIES.find((c) => pathname === `/category/${c.slug}`)?.id ?? null
  const [open, setOpen] = useState<Category | null>(current)
  // Follow navigation: opening a tool from anywhere reveals its category.
  useEffect(() => {
    if (current) setOpen(current)
  }, [current])

  return (
    <nav aria-label={label} className="space-y-4">
      <Link
        href="/"
        aria-current={pathname === '/' ? 'page' : undefined}
        className={cx('flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors', pathname === '/' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-card hover:text-ink')}
      >
        <House size={16} aria-hidden /> Home
      </Link>

      {favTools.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-sun">
            <Star size={11} fill="currentColor" aria-hidden /> Favorites
          </p>
          {favTools.map((t) => <NavItem key={t.slug} tool={t} fav active={isActive(t)} onToggle={() => toggle(t.slug)} />)}
        </div>
      )}

      <ul className="space-y-0.5">
        {CATEGORIES.map((c) => {
          const tools = TOOLS.filter((t) => t.category === c.id)
          const expanded = open === c.id
          const panel = `${idPrefix}-${c.slug}`
          const holdsActive = c.id === current
          return (
            <li key={c.id}>
              <button
                type="button"
                data-category
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => setOpen(expanded ? null : c.id)}
                onKeyDown={onHeaderKey}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-card',
                  holdsActive ? 'text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                <c.icon size={16} className={cx('shrink-0', holdsActive && 'text-accent')} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span className="font-mono text-[11px] font-normal text-ink-3">{tools.length}</span>
                <ChevronDown size={15} className={cx('shrink-0 text-ink-3 transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden />
              </button>
              {/* 0fr → 1fr animates height without measuring; inert keeps hidden links out of the tab order. */}
              <div
                id={panel}
                role="region"
                aria-label={c.label}
                inert={!expanded}
                className={cx('grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="ml-[19px] space-y-0.5 border-l border-rule py-1 pl-2">
                    {tools.map((t) => <NavItem key={t.slug} tool={t} fav={isFavorite(t.slug)} active={isActive(t)} onToggle={() => toggle(t.slug)} />)}
                    <Link href={`/category/${c.slug}`} className="block px-3 py-1 font-mono text-[11px] text-ink-3 hover:text-accent">
                      All {c.label.toLowerCase()} →
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Mobile navigation: a menu button opening the same accordion in a drawer. */
function MobileNav() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const show = () => {
    dialog.current?.showModal()
    setIsOpen(true)
  }
  // Close after navigating.
  useEffect(() => dialog.current?.close(), [pathname])
  useEffect(() => {
    document.documentElement.style.overflow = isOpen ? 'hidden' : ''
    return () => void (document.documentElement.style.overflow = '')
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Open tools menu"
        aria-expanded={isOpen}
        aria-controls="mobile-tools"
        className="grid size-9 place-items-center rounded-md border border-rule text-ink-2 hover:border-ink hover:text-ink"
      >
        <Menu size={17} />
      </button>
      <dialog
        id="mobile-tools"
        ref={dialog}
        aria-label="Tools"
        onClose={() => setIsOpen(false)}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(320px,86vw)] max-w-none overflow-x-hidden overflow-y-auto border-r border-rule bg-paper p-0 text-ink transition-[translate] duration-200 backdrop:bg-ink/40 starting:open:-translate-x-full motion-reduce:transition-none"
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <Logo />
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close tools menu" className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-card hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="px-3 py-4">{isOpen && <ToolNav label="Tools (mobile)" idPrefix="m" />}</div>
      </dialog>
    </>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const [theme, toggleTheme] = useTheme()

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
        <div className="-mx-2 mt-6 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-4">
          <ToolNav label="Tools" idPrefix="d" />
        </div>
        <div className="space-y-4 border-t border-rule pt-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
            <WifiOff size={14} className="mt-0.5 shrink-0" aria-hidden />
            Free forever. Hover a tool and click ☆ to pin it to the top.
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
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            {themeButton}
            <MobileNav />
          </div>
        </div>
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
