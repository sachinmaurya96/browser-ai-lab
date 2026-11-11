import Link from 'next/link'
import { pageMetadata } from '../../seo/metadata'
import { TOOLS } from '../../tools'
import { AboutCard } from '../../ui/AboutCard'
import { Breadcrumbs } from '../../ui/Breadcrumbs'

export const metadata = pageMetadata({
  title: 'About Browser AI Lab',
  description: 'Browser AI Lab is a free collection of AI and utility tools built by Sachin Maurya that run entirely in your browser, so your files never leave your device.',
  path: '/about',
  defaultImage: true,
})

export default function About() {
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]} />
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-5xl leading-none sm:text-6xl">About Browser AI Lab</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">
          {TOOLS.length} free tools for images, audio, PDFs, text and code, built on one idea: useful AI shouldn&apos;t require
          handing your files to someone else&apos;s server.
        </p>
      </header>
      <div className="prose-lab mt-8 max-w-3xl">
        <h2>Why it exists</h2>
        <p>
          Most AI tools on the web upload what you give them: photos, recordings, contracts, source code. Browser AI Lab takes
          the opposite approach. Open models are downloaded to your browser and run on your own GPU or CPU, so the work happens
          on your device and your data stays there.
        </p>
        <h2>How it works</h2>
        <p>
          Tools use open-source models from Hugging Face, run with ONNX Runtime Web and Transformers.js, accelerated by WebGPU
          where available. Read <Link href="/guides/how-browser-ai-works">how Browser AI Lab runs AI on your device</Link> for
          the details and the trade-offs.
        </p>
        <h2>What it costs</h2>
        <p>
          Nothing. There are no accounts, no usage limits and no ads. Some of the models have their own licences (a few are
          non-commercial), which each tool page lists.
        </p>
      </div>
      <AboutCard id="maker" />
    </div>
  )
}
