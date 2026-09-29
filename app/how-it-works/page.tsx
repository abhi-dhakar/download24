import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, MonitorSmartphone, Smartphone, Tv } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { StepArt } from '@/components/illustrations/StepArt'
import { CtaPlate, PageHero, SectionHeading } from '@/components/ui/PageBlocks'
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
        <PageHero
          kicker="How it works"
          title={
            <>
              From link to file in <span className="nb-mark nb-mark-lime">four steps</span>
            </>
          }
          lead="Works the same on Android, iPhone, Windows, macOS and Linux — whether you copied the link from an app share-sheet or a desktop URL bar."
          tone="bg-aqua text-[#101010]"
        >
          <Link href="/#downloader" className="nb-btn nb-btn-brand nb-btn-lg">
            <ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />
            Paste a link
          </Link>
        </PageHero>

        {/* --------------------------------------------- the three pages */}
        <section aria-label="The three-page flow" className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
          <ul className="grid gap-5 sm:grid-cols-3">
            {FLOW_PAGES.map((page, index) => (
              <li
                key={page.step}
                className={`nb-card nb-press-card flex h-full flex-col overflow-hidden ${
                  index % 2 === 0 ? 'nb-tilt-l' : 'nb-tilt-r'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`${['bg-sun', 'bg-punch', 'bg-lime'][index % 3]} flex items-center justify-between border-b-[3px] border-line px-4 py-2 font-mono text-[10px] font-bold tracking-[0.16em] text-[#101010] uppercase`}
                >
                  <span>Page {page.step} of 3</span>
                  <span>★</span>
                </span>
                <div className="flex flex-1 flex-col p-5">
                  <span
                    aria-hidden="true"
                    className={`grid h-11 w-11 place-items-center rounded-btn border-[3px] border-line font-display text-base text-[#101010] ${
                      ['bg-sun', 'bg-punch', 'bg-lime'][index % 3]
                    }`}
                  >
                    {page.step}
                  </span>
                  <h2 className="mt-4 font-display text-sm uppercase">{page.title}</h2>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-soft">{page.body}</p>
                  <p className="mt-3">
                    <span className="nb-chip nb-chip-sm nb-chip-soft">{page.hint}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ the steps */}
        <section aria-label="Detailed steps" className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-6">
          <ol className="flex flex-col gap-7">
            {HOW_TO_STEPS.map((step, index) => {
              const number = index + 1
              const variant = (['copy', 'paste', 'quality', 'save'] as const)[index]
              const artFirst = index % 2 === 1
              return (
                <li
                  key={step.title}
                  id={`step-${number}`}
                  className="nb-card nb-press-card grid items-center gap-7 overflow-hidden p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr]"
                >
                  <div className={`${artFirst ? 'lg:order-2' : ''} mx-auto w-full max-w-[300px]`}>
                    <span
                      className={`block rounded-2xl border-[3px] border-line p-3 ${
                        ['bg-sun', 'bg-punch', 'bg-lime', 'bg-aqua'][index % 4]
                      }`}
                    >
                      <StepArt variant={variant} />
                    </span>
                  </div>
                  <div className={artFirst ? 'lg:order-1' : ''}>
                    <span
                      aria-hidden="true"
                      className={`inline-grid h-10 w-10 place-items-center rounded-btn border-[3px] border-line font-display text-base text-[#101010] ${
                        ['bg-sun', 'bg-punch', 'bg-lime', 'bg-aqua'][index % 4]
                      }`}
                    >
                      {number}
                    </span>
                    <h2 className="nb-h3 mt-3">
                      <span className="sr-only">Step {number}: </span>
                      {step.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* --------------------------------------------------- device tips */}
        <section aria-labelledby="device-tips-heading" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <SectionHeading
            headingId="device-tips-heading"
            kicker="Per-device tips"
            title={
              <>
                Where the <span className="nb-mark">file</span> ends up
              </>
            }
            lead="The flow never changes — only the folder it lands in does."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {DEVICE_TIPS.map((tip, index) => (
              <article key={tip.title} className="nb-card nb-press-card flex h-full flex-col p-5">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-btn border-[3px] border-line ${
                    ['bg-sun', 'bg-aqua', 'bg-punch'][index % 3]
                  }`}
                >
                  <tip.icon className="h-5 w-5 text-[#101010]" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-sm uppercase">{tip.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{tip.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="howto-cta" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <CtaPlate
            headingId="howto-cta"
            heading="Ready to try step one?"
            body="It really is just a copy-paste. Your file is about thirty seconds away."
            cta="Paste a link"
            tone="bg-lime"
            icon={<ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
