'use client'

import { Star } from 'lucide-react'
import { useFavorites } from '../lib/favorites'
import { TOOL_PAGES } from '../tools/loaders'
import { cx } from './kit'

/** The interactive part of a tool page, loaded on the client only. */
export function ToolApp({ slug }: { slug: string }) {
  const Page = TOOL_PAGES[slug]
  return <Page />
}

export function FavoriteButton({ slug }: { slug: string }) {
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(slug)
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={fav}
      className={cx('inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors', fav ? 'border-sun bg-sun-soft text-sun' : 'border-rule text-ink-2 hover:border-ink hover:text-ink')}
    >
      <Star size={15} fill={fav ? 'currentColor' : 'none'} aria-hidden /> {fav ? 'Favorited' : 'Favorite'}
    </button>
  )
}
