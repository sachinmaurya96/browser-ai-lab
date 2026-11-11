import Image from 'next/image'
import { Coffee, Heart, UserRound } from 'lucide-react'
import { AUTHOR, LINKS } from '../site'
import { Kicker } from './kit'

export function AboutCard({ id = 'about' }: { id?: string }) {
  return (
    <section id={id} className="mt-16 grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="rounded-xl border border-rule bg-card p-6 sm:p-8">
        <Kicker className="text-accent">About</Kicker>
        <div className="mt-4 flex items-center gap-4">
          <Image src={AUTHOR.photo} alt="Portrait of Sachin Maurya" width={80} height={80} className="size-20 shrink-0 rounded-full border-2 border-accent object-cover" />
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
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Have an idea for a tool, found a bug, or want to collaborate? Let&apos;s connect.</p>
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-md border border-ink px-4 py-2 font-medium transition-colors hover:bg-ink hover:text-paper">
          <UserRound size={17} aria-hidden /> Connect on LinkedIn
        </a>
      </div>

      <div className="flex flex-col rounded-xl border-2 border-accent bg-accent-soft p-6 sm:p-8">
        <Kicker className="text-accent">Support the project</Kicker>
        <Heart size={30} className="mt-4 text-accent" aria-hidden />
        <h2 className="mt-3 font-display text-4xl leading-tight">Keep it free for everyone</h2>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-2">
          Browser AI Lab has no ads and no paywall. If it saved you time or money, a small donation helps cover
          development and keeps new tools coming.
        </p>
        <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-paper shadow-[3px_3px_0_var(--accent)] transition-all hover:bg-accent hover:text-accent-ink hover:shadow-[3px_3px_0_var(--ink)]">
          <Coffee size={18} aria-hidden /> Buy me a coffee
        </a>
        <p className="mt-3 text-center text-xs text-ink-3">Any amount helps. Thank you! 💛</p>
      </div>
    </section>
  )
}
