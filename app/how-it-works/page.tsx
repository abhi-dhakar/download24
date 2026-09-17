import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, MonitorSmartphone, Smartphone, Tv } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { StepArt } from '@/components/illustrations/StepArt'
import { HOW_TO_STEPS, breadcrumbSchema, howToSchema, serializeJsonLd } from '@/lib/seo'
import { canonicalOrigin } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How it works — download any video in 4 steps',
  description:
    'Copy the video link, paste it into download24, pick a quality from 4K to MP3 and save the file. The same three-page flow works on Android, iPhone, Windows, macOS and Linux.',
  keywords: [
    'how to download online video',
    'how to save youtube video',
    'download video steps',
    'online video downloader guide'
  ],
  alternates: {
    canonical: '/how-it-works',
    languages: {
      'x-default': `${canonicalOrigin}/how-it-works`,
      en: `${canonicalOrigin}/how-it-works`
    }
  },
  openGraph: {
    title: 'How it works — download any video in 4 steps',
    description:
      'Copy the link, paste it, pick a quality, save the file. A guide to the download24 three-page download flow.',
    url: `${canonicalOrigin}/how-it-works`,
    type: 'website'
  },
  robots: { index: true, follow: true }
}

/** The three pages a visitor walks through, shown as a mini-map. */
const FLOW_PAGES = [
  {
    step: 1,
    title: 'Paste the link',
    body: 'The homepage is one big input box. Drop your link in and press Download.',
    hint: 'download24.in'
  },
  {
    step: 2,
    title: 'Review & choose quality',
    body: 'We show the video’s details and every quality it publishes — pick MP4 or MP3.',
    hint: '/download'
  },
  {
    step: 3,
    title: 'Watch it download',
    body: 'A live progress page animates the transfer and confirms when the file is saved.',
    hint: '/download/progress'
  }
]

const DEVICE_TIPS = [
  {
    icon: Smartphone,
    title: 'Android',
    body: 'In the YouTube or Instagram app, tap Share → Copy link, then paste it here in Chrome. The file lands in your Downloads folder.'
  },
  {
    icon: MonitorSmartphone,
    title: 'iPhone & iPad',
    body: 'Copy the link from the share sheet and open download24 in Safari. Saved videos appear in the Files app → Downloads (or tap the download icon in Safari’s address bar).'
  },
  {
    icon: Tv,
    title: 'Desktop',
    body: 'Copy the URL from the address bar (or right-click a video → Copy video URL), paste it, and choose your quality. Works in Chrome, Edge, Firefox and Safari.'
  }
]

export default function HowItWorksPage() {
  return (
    <>
      <script
        id="ld-howto"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(howToSchema()) }}
      />
      <script
        id="ld-breadcrumb-how-to"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'How it works', path: '/how-it-works' }
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
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              How it works
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              From link to file in <span className="text-gradient">four steps</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              Works the same on Android, iPhone, Windows, macOS and Linux — whether you copied the
              link from an app share-sheet or a desktop URL bar.
            </p>
          </div>
        </section>

        {/* --------------------------------------------- the three pages */}
        <section aria-label="The three-page flow" className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {FLOW_PAGES.map((page) => (
              <article
                key={page.step}
                className="relative overflow-hidden rounded-(--radius-card) border border-line bg-white/[0.02] p-5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-soft via-accent to-accent-deep font-display text-sm font-bold text-white shadow-glow">
                  {page.step}
                </span>
                <h2 className="mt-3 text-sm font-semibold text-white sm:text-base">{page.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{page.body}</p>
                <p className="mt-3 inline-flex rounded-md bg-ink-800 px-2 py-1 font-mono text-[10px] text-white/50 ring-1 ring-inset ring-line">
                  {page.hint}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ the steps */}
        <section aria-label="Detailed steps" className="mx-auto w-full max-w-5xl px-4 pt-14 sm:px-6">
          <ol className="relative flex flex-col gap-6">
            {HOW_TO_STEPS.map((step, index) => {
              const number = index + 1
              const variant = (['copy', 'paste', 'quality', 'save'] as const)[index]
              const artFirst = index % 2 === 1
              return (
                <li
                  key={step.title}
                  id={`step-${number}`}
                  className="grid items-center gap-6 rounded-(--radius-card) border border-line bg-white/[0.02] p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr]"
                >
                  <div className={artFirst ? 'lg:order-2' : ''}>
                    <div className="mx-auto w-full max-w-[300px]">
                      <StepArt variant={variant} />
                    </div>
                  </div>
                  <div className={artFirst ? 'lg:order-1' : ''}>
                    <span
                      aria-hidden="true"
                      className="inline-grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-soft via-accent to-accent-deep font-display text-sm font-bold text-white"
                    >
                      {number}
                    </span>
                    <h2 className="mt-3 font-display text-lg font-bold text-white sm:text-xl">
                      <span className="sr-only">Step {number}: </span>
                      {step.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* --------------------------------------------------- device tips */}
        <section aria-labelledby="device-tips-heading" className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Per-device tips
            </p>
            <h2 id="device-tips-heading" className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Where the file ends up
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {DEVICE_TIPS.map((tip) => (
              <article
                key={tip.title}
                className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/25">
                  <tip.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-white">{tip.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{tip.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="howto-cta" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-gradient-to-br from-accent/[0.15] via-transparent to-cyan-glow/[0.10] p-6 text-center sm:p-10">
            <div aria-hidden="true" className="hero-aurora animate-float opacity-30" />
            <div className="relative">
              <h2 id="howto-cta" className="font-display text-2xl font-bold text-white">
                Ready to try step one?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                It really is just a copy-paste. Your file is about thirty seconds away.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                Paste a link
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
