import Link from 'next/link'
import { pageMetadata } from '../../seo/metadata'
import { Breadcrumbs } from '../../ui/Breadcrumbs'

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'The terms for using Browser AI Lab: free tools provided as-is, your responsibility for the content you process, and the licences of the AI models used.',
  keywords: ['browser ai lab terms of service', 'ai model licences'],
  path: '/terms',
  defaultImage: true,
})

const UPDATED = '2026-11-11'

export default function Terms() {
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Terms of service', path: '/terms' }]} />
      <h1 className="font-display text-5xl leading-none sm:text-6xl">Terms of service</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Last updated <time dateTime={UPDATED}>{UPDATED}</time></p>
      <div className="prose-lab mt-8">
        <p>By using Browser AI Lab you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

        <h2>The service</h2>
        <p>
          Browser AI Lab provides free tools that run in your web browser. Tools, features and models may change or be
          removed at any time without notice.
        </p>

        <h2>Your content</h2>
        <p>
          You keep all rights to the files and text you use with the tools, and you are responsible for having the right to
          process them, for example for copyrighted music or other people&apos;s personal data. Don&apos;t use the tools for anything
          unlawful or harmful.
        </p>

        <h2>AI output</h2>
        <p>
          AI models make mistakes. Transcripts, translations, OCR, summaries, redactions, classifications, generated text and
          other output can be inaccurate or incomplete. Review results before relying on them, especially for legal, medical,
          financial or safety decisions.
        </p>

        <h2>Model licences</h2>
        <p>
          Tools use third-party open models, each with its own licence. Some, such as RMBG-1.4 (background remover), NLLB-200
          (translator) and the Hindi-native Piper voices, are licensed for non-commercial use only. Each tool page names its
          model; check the licence before using output commercially.
        </p>

        <h2>No warranty</h2>
        <p>
          The site is provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent permitted by law, we are not
          liable for any loss arising from your use of the site or its output.
        </p>

        <h2>Changes</h2>
        <p>We may update these terms. The date above shows when they last changed.</p>

        <h2>Contact</h2>
        <p>Questions? <Link href="/contact">Get in touch</Link>.</p>
      </div>
    </div>
  )
}
