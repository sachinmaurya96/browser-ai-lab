'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/** Catches runtime errors in a page (e.g. a tool crashing) without taking down the shell. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error])
  return (
    <div role="alert" className="py-16 text-center">
      <p className="font-mono text-sm text-accent">Something broke</p>
      <h1 className="mt-2 font-display text-5xl">This page hit an error.</h1>
      <p className="mx-auto mt-4 max-w-lg text-ink-2">
        {error.message || 'An unexpected error occurred.'} Reloading usually helps. If it keeps happening, try Chrome or Edge,
        or close other tabs to free memory.
      </p>
      <p className="mt-6 flex justify-center gap-4">
        <button type="button" onClick={reset} className="rounded-md bg-ink px-4 py-2 font-medium text-paper hover:bg-accent hover:text-accent-ink">Try again</button>
        <Link href="/" className="rounded-md border border-rule px-4 py-2 hover:border-ink">Back to the lab</Link>
      </p>
    </div>
  )
}
