import { UserRound } from 'lucide-react'
import { pageMetadata } from '../../seo/metadata'
import { LINKS } from '../../site'
import { Breadcrumbs } from '../../ui/Breadcrumbs'

export const metadata = pageMetadata({
  title: 'Contact: Suggest a Tool or Report a Bug',
  description: 'Suggest a new tool, report a bug or talk about collaborating on Browser AI Lab. Get in touch with the maker, Sachin Maurya.',
  keywords: ['contact browser ai lab', 'suggest a tool', 'report a bug', 'feedback'],
  path: '/contact',
  defaultImage: true,
})

export default function Contact() {
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]} />
      <h1 className="font-display text-5xl leading-none sm:text-6xl">Contact</h1>
      <div className="prose-lab mt-6">
        <p>
          Have an idea for a tool, found a bug, or want to collaborate? The quickest way to reach me is a message on LinkedIn.
        </p>
        <p>
          When reporting a bug, it helps to include the tool&apos;s name, your browser and device, and what you expected to happen.
          Please don&apos;t send the files you were working on; the tools are designed so nobody else needs to see them.
        </p>
      </div>
      <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-md border border-ink px-4 py-2 font-medium transition-colors hover:bg-ink hover:text-paper">
        <UserRound size={17} aria-hidden /> Message Sachin on LinkedIn
      </a>
    </div>
  )
}
