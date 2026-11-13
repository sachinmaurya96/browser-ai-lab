import Link from 'next/link'
import { pageMetadata } from '../../seo/metadata'
import { Breadcrumbs } from '../../ui/Breadcrumbs'
import { GA_ID } from '../../site'
import { ConsentSettings } from '../../ui/Analytics'

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How Browser AI Lab handles your data: files are processed on your device and never uploaded, what is stored in your browser and which services it contacts.',
  keywords: ['browser ai lab privacy policy', 'no upload privacy', 'on-device processing'],
  path: '/privacy',
  defaultImage: true,
})

const UPDATED = '2026-11-11'

export default function Privacy() {
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Privacy policy', path: '/privacy' }]} />
      <h1 className="font-display text-5xl leading-none sm:text-6xl">Privacy policy</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Last updated <time dateTime={UPDATED}>{UPDATED}</time></p>
      <div className="prose-lab mt-8">
        <h2>The short version</h2>
        <p>
          The files, text, recordings and camera frames you use with Browser AI Lab are processed inside your browser, on your
          device. They are not uploaded to us or to anyone else. We do not have accounts, and we do not sell data.
        </p>

        <h2>What stays on your device</h2>
        <ul>
          <li><strong>Your content.</strong> Everything you open or type into a tool is processed in memory in your browser tab.</li>
          <li><strong>Downloaded AI models.</strong> Model files are kept in your browser&apos;s storage (Cache Storage and similar) so they don&apos;t download again. Clearing site data removes them.</li>
          <li><strong>Preferences.</strong> Your theme, favourite tools and any documents you add to the semantic search demo are saved in your browser&apos;s local storage. They never leave your device.</li>
        </ul>

        <h2>Services the site contacts</h2>
        <ul>
          <li><strong>Vercel</strong> hosts the website. Like any web host, it receives standard request information (such as IP address and browser type) when pages load.</li>
          <li><strong>Hugging Face</strong> (huggingface.co) serves the AI model files that tools download.</li>
          <li><strong>jsDelivr</strong> (cdn.jsdelivr.net) serves some runtime files, such as WebAssembly modules and speech data.</li>
          {GA_ID ? (
            <li><strong>Google Analytics</strong> is used only if you allow it in the consent banner, to count page visits. It never receives your files or text.</li>
          ) : null}
        </ul>
        <p>
          These providers see that your browser requested a file, as with any website. They do not receive the content you
          work on.
        </p>

        {GA_ID ? (
          <>
            <h2>Analytics choice</h2>
            <p>You can change your analytics choice at any time. A change takes full effect the next time you load a page.</p>
          </>
        ) : (
          <>
            <h2>Analytics and cookies</h2>
            <p>The site does not use analytics or advertising cookies.</p>
          </>
        )}
      </div>
      <div className="mt-4"><ConsentSettings /></div>
      <div className="prose-lab mt-8">
        <h2>External links</h2>
        <p>Links to other sites, such as LinkedIn or Buy Me a Coffee, are covered by those sites&apos; own privacy policies.</p>
        <h2>Contact</h2>
        <p>Questions about privacy? <Link href="/contact">Get in touch</Link>.</p>
      </div>
    </div>
  )
}
