import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDownToLine, Check, CheckCircle2, Music, Sparkles, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'

import { Downloader } from '@/components/Downloader'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PlatformMark } from '@/components/PlatformMark'
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

      <main id="main" className="flex-1">
        {/* ================================================================ */}
        {/* PLATFORM THEMED HERO SECTION                                     */}
        {/* ================================================================ */}
        <section
          id="downloader"
          aria-labelledby="downloader-heading"
          className="relative isolate overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-16"
        >
          {/* Custom Platform Ambient Glow */}
          <div
            aria-hidden="true"
            className="platform-hero-glow pointer-events-none absolute inset-0 -top-24 h-[38rem] opacity-35 blur-3xl transition-all"
            style={{
              background: config.theme.heroGradient
            }}
          />
          <div aria-hidden="true" className="grid-lines opacity-30" />

          <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
            {/* Platform Brand Pill */}
            <div
              className="platform-pill inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-md shadow-sm transition-all"
              style={{
                borderColor: `rgba(${config.theme.glowRgb}, 0.35)`,
                backgroundColor: `rgba(${config.theme.glowRgb}, 0.08)`
              }}
            >
              <span className="grid h-4 w-4 place-items-center">
                <PlatformMark id={platform.id} className="h-4 w-4" />
              </span>
              <span>{config.title}</span>
              <span className="text-white/30">•</span>
              <span className="text-white/70">100% Free &amp; Fast</span>
            </div>

            {/* Dynamic H1 Headline */}
            <h1
              id="downloader-heading"
              className="mt-6 font-display text-[clamp(2.1rem,4.5vw,3.6rem)] font-extrabold tracking-tight text-white leading-[1.15]"
            >
              {config.h1}{' '}
              <span
                className="platform-highlight"
                style={
                  {
                    '--platform-primary': config.theme.primary,
                    '--platform-on-light': config.theme.primaryOnLight,
                    '--platform-glow': config.theme.glowRgb
                  } as CSSProperties
                }
              >
                {config.h1Highlight}
              </span>
            </h1>

            {/* Platform Subtitle */}
            <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-white/65 sm:text-base">
              {config.subtitle}
            </p>

            {/* Downloader Input Box */}
            <div className="mt-8">
              <Downloader />
            </div>

            {/* Quick Feature Badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                Max: {MAX_RES_LABEL[platform.maxResolution]}
              </span>
              {platform.noWatermark && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-ok">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  No Watermark
                </span>
              )}
              {platform.supportsMp3 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                  <Music className="h-3.5 w-3.5" />
                  MP3 Audio
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                No Registration
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* PLATFORM HIGHLIGHT FEATURES                                      */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <div className="text-center">
            <p
              className="platform-tint-text text-xs font-semibold tracking-widest uppercase"
              style={
                {
                  '--platform-primary': config.theme.primary,
                  '--platform-on-light': config.theme.primaryOnLight
                } as CSSProperties
              }
            >
              Why use download24
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Engineered specifically for {config.shortTitle}
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {config.features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-(--radius-card) border border-line bg-white/[0.02] p-6 transition-all duration-300 hover:border-line-strong hover:bg-white/[0.04]"
              >
                <div
                  className="platform-tint-text mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1"
                  style={
                    {
                      backgroundColor: `rgba(${config.theme.glowRgb}, 0.15)`,
                      borderColor: `rgba(${config.theme.glowRgb}, 0.3)`,
                      '--platform-primary': config.theme.primary,
                      '--platform-on-light': config.theme.primaryOnLight
                    } as CSSProperties
                  }
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* STEP-BY-STEP GUIDE                                               */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 border-t border-line/60">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              How to download {config.shortTitle} videos in 4 easy steps
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/55">
              Works straight in your mobile or desktop web browser — no software or browser extensions needed.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howToSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-line bg-white/[0.02] p-5"
              >
                <div
                  className="platform-tint-text inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                  style={
                    {
                      backgroundColor: `rgba(${config.theme.glowRgb}, 0.2)`,
                      '--platform-primary': config.theme.primary,
                      '--platform-on-light': config.theme.primaryOnLight
                    } as CSSProperties
                  }
                >
                  0{idx + 1}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* PLATFORM FAQS                                                    */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 border-t border-line/60">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Frequently Asked Questions about {config.shortTitle} Downloads
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Everything you need to know about downloading {config.shortTitle} media safely and quickly.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {config.faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-(--radius-card) border border-line bg-white/[0.02] px-4 transition-colors open:border-line-strong open:bg-white/[0.04] hover:border-line-strong"
                {...(index === 0 ? { open: true } : {})}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left text-sm font-semibold text-white">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="faq-chevron mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-white/60 ring-1 ring-inset ring-line transition-transform duration-200"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8h10M8 3v10" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="faq-panel pb-4">
                  <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-white/60">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* OTHER PLATFORMS EXPLORER                                         */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 border-t border-line/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Download from other networks
              </h2>
              <p className="mt-1 text-xs text-white/55">
                download24 also provides high-speed dedicated engines for all your favorite platforms.
              </p>
            </div>
            <Link
              href="/#downloader"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline self-start sm:self-auto"
            >
              View all 10+ platforms →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Object.values(PLATFORM_PAGES)
              .filter((p) => p.slug !== config.slug)
              .map((other) => {
                const otherPlatform = getPlatform(other.platformId)
                return (
                  <Link
                    key={other.slug}
                    href={`/${other.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3 transition-all hover:border-line-strong hover:bg-white/[0.05]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900 ring-1 ring-line group-hover:ring-line-strong">
                      {otherPlatform && (
                        <PlatformMark id={otherPlatform.id} className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white group-hover:text-accent">
                        {other.shortTitle}
                      </p>
                      <p className="text-[10px] text-white/40">Downloader</p>
                    </div>
                  </Link>
                )
              })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
