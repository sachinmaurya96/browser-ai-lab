import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { JsonLd, breadcrumbs } from '../seo/jsonld'

/** Visible breadcrumb trail plus matching BreadcrumbList JSON-LD. The last item is the current page. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {items.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} aria-hidden />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-ink-2">{it.name}</span>
              ) : (
                <Link href={it.path} className="hover:text-accent">{it.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbs(items)} />
    </>
  )
}
