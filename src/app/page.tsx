import Image from 'next/image'
import Link from 'next/link'
import { Coffee, Gift, Lock, ServerOff, Zap } from 'lucide-react'
import { AUTHOR, LINKS, SITE_DESCRIPTION, SITE_NAME } from '../site'
import { TOOLS } from '../tools'
import { pageMetadata } from '../seo/metadata'
import { JsonLd, organization, website } from '../seo/jsonld'
import { AboutCard } from '../ui/AboutCard'
import { ToolGrid } from '../ui/ToolGrid'
import { Kicker } from '../ui/kit'

export const metadata = pageMetadata({
  title: `${SITE_NAME}: Free Private AI Tools in Your Browser`,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: '/',
  keywords: ['free ai tools', 'free online tools no sign up', 'private ai tools', 'browser ai tools', 'ai tools no upload', 'pdf tools', 'background remover', 'vocal remover', 'speech to text', 'screenshot beautifier'],
})

export default function Home() {
  return (
    <div>
      <JsonLd data={[organization(), website()]} />
      <div className="mb-8 flex w-fit items-center rounded-full border border-rule bg-card py-1.5 pr-1.5 pl-1.5 transition-colors hover:border-ink">
        <a href="#about" className="group flex items-center gap-3 pr-3">
          <Image src={AUTHOR.photo} alt="" width={36} height={36} className="size-9 rounded-full object-cover" priority />
          <span className="text-sm">
            <span className="text-ink-3">Made by </span>
            <span className="font-semibold group-hover:text-accent">Sachin Maurya</span>
            <span className="hidden text-ink-3 sm:inline"> · free &amp; open for everyone</span>
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
          <Coffee size={16} strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">Coffee</span>
        </a>
      </div>

      <section>
        <Kicker className="text-accent">{TOOLS.length} free tools · runs on your device</Kicker>
        <h1 className="mt-3 max-w-3xl font-display text-6xl leading-[0.95] sm:text-7xl">
          Useful AI. <em className="text-accent">Zero</em> servers.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">
          Free AI tools that run in your browser. Every model downloads to your device and runs on your own GPU or CPU,
          so your photos, voice, documents and code never leave this tab. No sign-up, no limits, no cost.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <li className="flex items-center gap-2"><Gift size={16} className="text-accent" aria-hidden /> Free for everyone</li>
          <li className="flex items-center gap-2"><ServerOff size={16} className="text-accent" aria-hidden /> No backend or API keys</li>
          <li className="flex items-center gap-2"><Lock size={16} className="text-accent" aria-hidden /> Data stays on device</li>
          <li className="flex items-center gap-2"><Zap size={16} className="text-accent" aria-hidden /> WebGPU with CPU fallback</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-sm [&>a]:py-1">
          <Link href="/about" className="underline decoration-rule underline-offset-4 hover:text-accent">About the maker</Link>
          <Link href="/guides" className="underline decoration-rule underline-offset-4 hover:text-accent">Guides</Link>
          <a href={LINKS.coffee} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"><Coffee size={15} aria-hidden /> Support this project</a>
        </div>
        <ToolGrid />
      </section>

      <AboutCard />

      <p className="mt-10 rounded-xl border border-dashed border-rule p-5 text-sm text-ink-3">
        First use of each AI tool downloads its model once (from about 55 MB up to about 650 MB), then it&apos;s cached. Chrome or
        Edge with WebGPU is fastest; other browsers use the CPU and are slower. Most PDF tools, the social tools and the
        developer tools need no download at all.
      </p>
    </div>
  )
}
