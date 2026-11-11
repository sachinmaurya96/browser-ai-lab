'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Script from 'next/script'
import { GA_ID } from '../site'

/**
 * Optional Google Analytics 4, opt-in only.
 *
 * Without NEXT_PUBLIC_GA_ID nothing renders and no third-party script loads.
 * With it, a consent banner asks first; gtag.js is only requested after the
 * visitor accepts, and declining is remembered. GA4's enhanced measurement
 * records client-side navigations as page views on its own.
 */
const KEY = 'lab-analytics-consent'
type Consent = 'granted' | 'denied' | null

const listeners = new Set<() => void>()
const read = (): Consent => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}
export function setConsent(v: Consent) {
  try {
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: ask again next visit */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function useConsent() {
  // 'pending' on the server and before hydration, so the banner never flashes.
  return useSyncExternalStore<Consent | 'pending'>(subscribe, read, () => 'pending')
}

export function Analytics() {
  const consent = useConsent()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!GA_ID || !mounted || consent === 'pending') return null

  if (consent === 'granted') {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
        </Script>
      </>
    )
  }
  if (consent === 'denied') return null

  return (
    <div role="dialog" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-ink bg-card p-4 text-sm shadow-[4px_4px_0_var(--ink)]">
      <p>
        May we count visits with Google Analytics? It only measures which pages are used. Your files and text are never
        sent anywhere either way.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setConsent('granted')} className="rounded-md bg-ink px-3 py-1.5 font-medium text-paper hover:bg-accent hover:text-accent-ink">
          Allow
        </button>
        <button type="button" onClick={() => setConsent('denied')} className="rounded-md border border-rule px-3 py-1.5 text-ink-2 hover:border-ink">
          Decline
        </button>
      </div>
    </div>
  )
}

/** "Change analytics choice" control for the privacy page. */
export function ConsentSettings() {
  const consent = useConsent()
  if (!GA_ID) return null
  return (
    <p className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-card p-4 text-sm">
      Analytics: <strong>{consent === 'granted' ? 'allowed' : consent === 'denied' ? 'declined' : 'not chosen yet'}</strong>
      <button type="button" onClick={() => setConsent(null)} className="underline underline-offset-4 hover:text-accent">
        Change my choice
      </button>
    </p>
  )
}
