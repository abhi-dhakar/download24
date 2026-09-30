import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDownToLine, Check, CheckCircle2, Music, Sparkles, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'

import { Downloader } from '@/components/Downloader'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PlatformBar } from '@/components/PlatformBar'
import { PlatformMark } from '@/components/PlatformMark'
import { CtaPlate } from '@/components/ui/PageBlocks'
import {
  PLATFORM_PAGES,
  getPlatformPageBySlug,
  type PlatformPageConfig
} from '@/lib/platformPages'
import { getPlatform, MAX_RES_LABEL, PLATFORMS } from '@/lib/platforms'
import {
  breadcrumbSchema,
  faqPageSchema,
  howToSchema,
  serializeJsonLd,
  webApplicationSchema
} from '@/lib/seo'
import { SITE, canonicalOrigin } from '@/lib/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return Object.keys(PLATFORM_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const config = getPlatformPageBySlug(slug)
  if (!config) return {}

  const canonicalUrl = `${canonicalOrigin}/${config.slug}`

  return {
    title: {
      absolute: config.metaTitle
    },
    description: config.metaDescription,
    keywords: [
      config.title.toLowerCase(),
      `${config.shortTitle.toLowerCase()} downloader`,
      `${config.shortTitle.toLowerCase()} video download`,
      'download24',
      '4k video downloader',
      'mp3 downloader'
    ],
    alternates: {
      canonical: `/${config.slug}`,
      languages: {
        'x-default': canonicalUrl,
        en: canonicalUrl
      }
    },
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      url: canonicalUrl,
      siteName: SITE.name,
      type: 'website',
      locale: SITE.locale
    },
    twitter: {
      card: 'summary_large_image',
      title: config.metaTitle,
      description: config.metaDescription
    }
  }
}

export const revalidate = 3600
export const dynamic = 'force-static'

function StructuredData({ id, data }: { id: string; data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

/** Candy plate colour per step, matching the shared HowTo cards. */
const STEP_TONE = ['bg-sun', 'bg-punch', 'bg-lime', 'bg-aqua']

export default async function PlatformPage({ params }: PageProps) {
  const { slug } = await params
  const config = getPlatformPageBySlug(slug)
  if (!config) notFound()

  const platform = getPlatform(config.platformId)
  if (!platform) notFound()

  const howToSteps = [
    {
      title: `Copy the ${config.shortTitle} link`,
      description: `Open ${config.shortTitle}, tap the Share button on the video or clip, and choose "Copy Link".`
    },
    {
      title: 'Paste the link into download24',
      description: `Paste the URL into the search box above. Our engine instantly analyzes and resolves the format.`
    },
    {
      title: 'Choose quality or MP3',
      description: `Select from available resolutions up to ${MAX_RES_LABEL[platform.maxResolution]}, or pick MP3 audio extraction.`
    },
    {
      title: 'Download file instantly',
      description: `Click Download to save the file straight to your phone, tablet, or PC without watermarks.`
    }
  ]

  /** Brand-hue variables consumed by the `.platform-*` helpers in globals.css. */
  const brandVars = {
    '--platform-primary': config.theme.primary,
    '--platform-on-light': config.theme.primaryOnLight,
    '--platform-glow': config.theme.glowRgb
  } as CSSProperties

  return (
    <>
      <StructuredData id="ld-web-application" data={webApplicationSchema()} />
      <StructuredData
        id="ld-faq"
        data={faqPageSchema(
          config.faqs.map((f) => ({ question: f.question, answer: f.answer }))
        )}
      />
      <StructuredData id="ld-howto" data={howToSchema(howToSteps)} />
      <StructuredData
        id="ld-breadcrumb"
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: config.title, path: `/${config.slug}` }
        ])}
      />

      <Header />

      {/* Platform strip under the navbar; the current network's chip is active. */}
      <PlatformBar activePlatformId={platform.id} />

      <main id="main" className="flex-1">
        {/* ================================================================ */}
        {/* PLATFORM HERO                                                    */}
        {/* ================================================================ */}
        <section
          id="downloader"
          aria-labelledby="downloader-heading"
          className="relative isolate overflow-hidden border-b-[3px] border-line bg-paper-2 pt-10 pb-14 sm:pt-14 sm:pb-16"
        >
          <div aria-hidden="true" className="nb-grid-lines pointer-events-none absolute inset-0 opacity-60" />
          {/* The network's own colour, as a solid brutalist slab. */}
          <div
            aria-hidden="true"
            className="platform-hero-glow pointer-events-none absolute -top-24 -right-24 h-72 w-72 rotate-12 rounded-[2.5rem] border-[3px] border-line"
            style={{ background: config.theme.heroGradient, backgroundColor: config.theme.primary }}
          />

          <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
            <div
              className="platform-pill inline-flex items-center gap-2 rounded-pill border-[3px] border-line px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase shadow-hard-xs"
              style={brandVars}
            >
              <span className="grid h-4 w-4 place-items-center">
                <PlatformMark id={platform.id} className="h-4 w-4" />
              </span>
              <span>{config.title}</span>
              <span aria-hidden="true">•</span>
              <span>Free &amp; fast</span>
            </div>

            <h1 id="downloader-heading" className="nb-h1 mt-6">
              {config.h1}{' '}
              <span className="platform-highlight" style={brandVars}>
                {config.h1Highlight}
              </span>
            </h1>

            <p className="nb-lead mx-auto mt-4 max-w-xl">{config.subtitle}</p>

            <div className="mt-8 text-left">
              <Downloader />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <span className="nb-chip nb-chip-sm nb-chip-soft">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok-ink" aria-hidden="true" />
                Max: {MAX_RES_LABEL[platform.maxResolution]}
              </span>
              {platform.noWatermark && (
                <span className="nb-chip nb-chip-sm nb-chip-lime">
                  <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  No watermark
                </span>
              )}
              {platform.supportsMp3 && (
                <span className="nb-chip nb-chip-sm nb-chip-punch">
                  <Music className="h-3.5 w-3.5" aria-hidden="true" />
                  MP3 audio
                </span>
              )}
              <span className="nb-chip nb-chip-sm nb-chip-soft">No registration</span>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* WHY THIS ENGINE                                                  */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
          <div className="text-center">
            <p className="nb-kicker">Why use download24</p>
            <h2 className="nb-h2 mt-3">
              Engineered for{' '}
              <span className="nb-mark" style={{ backgroundColor: config.theme.primary, color: '#101010' }}>
                {config.shortTitle}
              </span>
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {config.features.map((feature, idx) => (
              <article
                key={idx}
                className="nb-card nb-press-card flex h-full flex-col overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className="block h-2.5 w-full border-b-[3px] border-line"
                  style={{ backgroundColor: config.theme.primary }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-btn border-[3px] border-line"
                    style={{ backgroundColor: config.theme.primary }}
                  >
                    <Sparkles className="h-5 w-5 text-[#101010]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-sm uppercase">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* STEP-BY-STEP                                                     */}
        {/* ================================================================ */}
        <section className="border-y-[3px] border-line bg-paper-2 py-14">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="nb-kicker">Four steps</p>
              <h2 className="nb-h2 mt-3">
                How to download {config.shortTitle} videos
              </h2>
              <p className="nb-lead mx-auto mt-3 max-w-xl">
                Works straight in your mobile or desktop browser — no software, no browser extensions.
              </p>
            </div>

            <ol className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {howToSteps.map((step, idx) => (
                <li
                  key={idx}
                  className={`nb-card nb-press-card flex h-full flex-col p-5 ${
                    idx % 2 === 0 ? 'nb-tilt-l' : 'nb-tilt-r'
                  }`}
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-btn border-[3px] border-line font-display text-sm text-[#101010] ${
                      STEP_TONE[idx % STEP_TONE.length]
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <h3 className="mt-3.5 font-display text-sm uppercase">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQS                                                             */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
          <div className="text-center">
            <p className="nb-kicker">FAQ</p>
            <h2 className="nb-h2 mt-3">
              {config.shortTitle} downloads, answered
            </h2>
            <p className="nb-lead mx-auto mt-3 max-w-md">
              Everything you need to know about saving {config.shortTitle} media safely and quickly.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3.5">
            {config.faqs.map((faq, index) => (
              <details
                key={index}
                name={`${config.slug}-faq`}
                className="nb-card-flat group overflow-hidden open:shadow-hard"
                {...(index === 0 ? { open: true } : {})}
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-btn border-[2.5px] border-line bg-sun font-mono text-[11px] font-bold text-[#101010] group-open:bg-punch"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] leading-snug font-bold text-ink">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-btn border-[2.5px] border-line bg-surface text-ink transition-transform duration-200 group-open:bg-sun"
                  >
                    <svg viewBox="0 0 16 16" className="faq-chevron h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <path d="M3 8h10M8 3v10" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="faq-panel border-t-[3px] border-line bg-surface-2 px-4 pt-3.5 pb-4 sm:px-5">
                  <p className="max-w-3xl text-sm leading-relaxed text-ink-soft sm:pl-12">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* OTHER PLATFORMS                                                  */}
        {/* ================================================================ */}
        <section className="border-t-[3px] border-line bg-paper-2 py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="nb-kicker">Keep going</p>
                <h2 className="nb-h3 mt-3">Download from other networks</h2>
                <p className="mt-2 text-xs text-ink-soft">
                  download24 provides dedicated engines for every platform it supports.
                </p>
              </div>
              <Link href="/platforms" className="nb-btn nb-btn-sun self-start sm:self-auto">
                All {PLATFORMS.length}+ platforms
              </Link>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Object.values(PLATFORM_PAGES)
                .filter((other) => other.slug !== config.slug)
                .map((other) => {
                  const otherPlatform = getPlatform(other.platformId)
                  return (
                    <li key={other.slug}>
                      <Link
                        href={`/${other.slug}`}
                        className="nb-press nb-press-xs flex h-full items-center gap-2.5 rounded-xl border-[2.5px] border-line bg-surface px-3 py-2.5"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[2.5px] border-line bg-surface-2">
                          {otherPlatform && <PlatformMark id={otherPlatform.id} className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[11px] font-bold text-ink uppercase">
                            {other.shortTitle}
                          </span>
                          <span className="block font-mono text-[10px] text-ink-mute">Downloader</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CTA                                                              */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <CtaPlate
            heading={`Save a ${config.shortTitle} video now`}
            body="Paste the link, pick a quality, and the file lands in your downloads folder."
            cta="Back to the box"
            tone="bg-sun"
            icon={<ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />}
          />
          <p className="mt-5 flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold tracking-wide text-ink-mute uppercase">
            <Check className="h-3.5 w-3.5 text-ok-ink" aria-hidden="true" />
            Free · No signup · Up to {MAX_RES_LABEL[platform.maxResolution]}
          </p>
        </section>
      </main>

      <Footer />
    </>
  )
}
