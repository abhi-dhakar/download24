import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine } from 'lucide-react'

import { FaqAccordion } from '@/components/FaqAccordion'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
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
        {/* ---------------------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden pt-12 pb-4 sm:pt-16">
          <div aria-hidden="true" className="hero-aurora animate-float opacity-25" />
          <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">FAQ</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Questions people ask about <span className="text-gradient">download24</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              {FAQ_ITEMS.length} honest answers — also published as{' '}
              <span className="font-mono text-white/70">FAQPage</span> structured data so search
              engines can surface them directly.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------ accordion */}
        <section aria-label="Frequently asked questions" className="mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6">
          <FaqAccordion />
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="faq-cta" className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-gradient-to-br from-accent/[0.15] via-transparent to-cyan-glow/[0.10] p-6 text-center sm:p-10">
            <div aria-hidden="true" className="hero-aurora animate-float opacity-30" />
            <div className="relative">
              <h2 id="faq-cta" className="font-display text-2xl font-bold text-white">
                Still have a link to save?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                The downloader is one click away — no account, no limits.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                Open the downloader
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
