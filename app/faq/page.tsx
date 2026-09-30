import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, MessageCircleQuestion } from 'lucide-react'

import { FaqAccordion } from '@/components/FaqAccordion'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { CtaPlate, NoteCard, PageHero } from '@/components/ui/PageBlocks'
import { FAQ_ITEMS, breadcrumbSchema, faqPageSchema, serializeJsonLd } from '@/lib/seo'
import { canonicalOrigin } from '@/lib/site'

export const metadata: Metadata = {
  title: 'FAQ — questions about the downloader, answered',
  description:
    'How to download videos for free, which qualities are supported (4K? MP3?), TikTok without watermark, legality, and whether registration is ever required — answered.',
  keywords: [
    'video downloader faq',
    'is video downloading legal',
    '4k video download questions',
    'tiktok no watermark faq'
  ],
  alternates: {
    canonical: '/faq',
    languages: {
      'x-default': `${canonicalOrigin}/faq`,
      en: `${canonicalOrigin}/faq`
    }
  },
  openGraph: {
    title: 'FAQ — questions about the downloader, answered',
    description:
      'How the downloader works, which qualities and platforms are supported, and the legality question — answered honestly.',
    url: `${canonicalOrigin}/faq`,
    type: 'website'
  },
  robots: { index: true, follow: true }
}

const SHORTCUTS = [
  { label: 'Supported platforms', href: '/platforms', tone: 'bg-lime text-[#101010]' },
  { label: 'Quality guide', href: '/#qualities', tone: 'bg-sun text-[#101010]' },
  { label: 'How it works', href: '/how-it-works', tone: 'bg-aqua text-[#101010]' },
  { label: 'Privacy policy', href: '/privacy', tone: 'bg-punch text-[#101010]' }
]

export default function FaqPage() {
  return (
    <>
      {/* The FAQPage markup lives here — the same array renders the visible
          accordion, so the rich result can never drift from the page. */}
      <script
        id="ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqPageSchema()) }}
      />
      <script
        id="ld-breadcrumb-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'FAQ', path: '/faq' }
            ])
          )
        }}
      />
      <Header />
      <main id="main" className="flex-1">
        <PageHero
          kicker="FAQ"
          title={
            <>
              Questions people ask about <span className="nb-mark nb-mark-punch">download24</span>
            </>
          }
          lead={
            <>
              {FAQ_ITEMS.length} honest answers — also published as <code>FAQPage</code> structured data
              so search engines can surface them directly.
            </>
          }
          tone="bg-punch text-[#101010]"
        >
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className={`nb-chip nb-chip-sm ${shortcut.tone} hover:underline hover:decoration-[2.5px] hover:underline-offset-4`}
            >
              {shortcut.label}
            </Link>
          ))}
        </PageHero>

        <section aria-label="Frequently asked questions" className="mx-auto w-full max-w-4xl px-4 pt-14 sm:px-6">
          <FaqAccordion />
        </section>

        <section aria-label="Still stuck" className="mx-auto w-full max-w-4xl px-4 pt-14 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <NoteCard
              tone="bg-aqua text-[#101010]"
              tab="Still stuck?"
              title="Try the link swap"
              icon={<MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              If an extraction fails, open the quality page and use <strong>“Try a different link”</strong>
              . It re-runs the resolver without reloading the page — usually enough when a source is
              briefly rate-limiting us.
            </NoteCard>
            <NoteCard tone="bg-sun text-[#101010]" tab="Privacy" title="Nothing is kept">
              We do not log the link you paste. Extraction results live in memory for 15 minutes and the
              file itself is streamed straight to your browser — see the{' '}
              <Link href="/privacy" className="nb-link">
                privacy policy
              </Link>
              .
            </NoteCard>
          </div>
        </section>

        <section aria-labelledby="faq-cta" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <CtaPlate
            headingId="faq-cta"
            heading="Still have a link to save?"
            body="The downloader is one click away — no account, no limits."
            cta="Open the downloader"
            tone="bg-sun"
            icon={<ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
