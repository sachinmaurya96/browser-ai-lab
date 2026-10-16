import { useCallback, useSyncExternalStore } from 'react'

/**
 * Favourite tools, saved in localStorage and shared by every component that
 * uses the hook (sidebar, mobile nav, tool header) without a context provider.
 */
const KEY = 'lab-favorites'
const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: string[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: favourites last for this session only */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep tabs in sync when favourites change in another window.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => [])
  const toggle = useCallback((slug: string) => {
    const cur = read()
    write(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug])
  }, [])
  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites])
  return { favorites, toggle, isFavorite }
}
