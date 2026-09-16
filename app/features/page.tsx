import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownToLine,
  Check,
  Cpu,
  Database,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

import { FeatureArt } from '@/components/illustrations/FeatureArt'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { breadcrumbSchema, serializeJsonLd } from '@/lib/seo'
import { canonicalOrigin } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Features — 4K downloads, MP3 extraction, no signup',
  description:
    'Everything the download24 downloader can do: true 4K Ultra HD video, MP3 audio with ID3 tags, watermark-free Reels and TikToks, a 15-minute result cache, and zero registration — on 10+ platforms.',
  keywords: [
    'video downloader features',
    '4k video downloader',
    'mp3 downloader',
    'no watermark downloader',
    'free video downloader'
  ],
  alternates: {
    canonical: '/features',
    languages: {
      'x-default': `${canonicalOrigin}/features`,
      en: `${canonicalOrigin}/features`
    }
  },
  openGraph: {
    title: 'Features — 4K downloads, MP3 extraction, no signup',
    description:
      'True 4K video, MP3 audio, watermark-free shorts and zero registration — the full feature list of the download24 downloader.',
    url: `${canonicalOrigin}/features`,
    type: 'website'
  },
  robots: { index: true, follow: true }
}

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    variant: 'sparkles' as const,
    title: 'Up to 4K Ultra HD',
    lead: 'Every resolution the source publishes, never upscaled.',
    points: [
      '2160p, 1440p, 1080p, 720p, 480p and 360p presets',
      'Real pixel dimensions shown — vertical Reels read 1080×1920',
      'Container, codec, fps and estimated size next to every option'
    ]
  },
  {
    variant: 'user-x' as const,
    title: 'No registration, ever',
    lead: 'No account, no email, no app store, no watermark of our own.',
    points: [
      'Open the page and paste — that is the whole onboarding',
      'Works signed-out on every network we support',
      'Your recent links stay in your browser’s localStorage, not our servers'
    ]
  },
  {
    variant: 'zap' as const,
    title: 'Fast & free',
    lead: 'Extractions finish in one to three seconds.',
    points: [
      '15-minute in-memory LRU cache for repeat lookups',
      'No queues, captchas or artificial speed caps',
      'Fair-use rate limits keep the service snappy for everyone'
    ]
  },
  {
    variant: 'layers' as const,
    title: 'Multi-platform by design',
    lead: 'One engine, every network you actually use.',
    points: [
      'YouTube, Shorts, Instagram, TikTok, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch',
      'Clean renditions for Reels & TikTok — no burned-in watermark',
      '1,000+ additional sites through the yt-dlp extractor library'
    ]
  }
]

const TRUST_POINTS = [
  {
    title: 'Zero watermarks on Reels & TikTok',
    body:
      'We ask the platform for the clean rendition, so short-form videos save without an overlay burned into the frame.'
  },
  {
    title: 'True 4K, never upscaled',
    body:
      'We show exactly the qualities the source publishes. If a creator uploaded 2160p60, that is what you get — bit-for-bit.'
  },
  {
    title: 'Works on any device',
    body:
      'Chrome, Safari, Firefox, Edge, Android and iPhone. Nothing to install — the whole tool lives in the page.'
  },
  {
    title: 'Privacy by design',
    body:
      'Links you paste are used only to fetch the file. We do not store your URLs, downloads or IP after the session ends.'
  }
]

const UNDER_THE_HOOD = [
  {
    icon: Database,
    title: '15-minute result cache',
    body:
      'A 2,000-entry LRU cache holds extraction results in RAM, so a popular video resolves instantly for everyone after the first lookup.'
  },
  {
    icon: Cpu,
    title: 'Server-side ffmpeg merging',
    body:
      'Modern platforms serve video and audio as separate DASH streams. Anything above 720p is muxed with -c copy — never re-encoded.'
  },
  {
    icon: ShieldCheck,
    title: 'Hardened by default',
    body:
      'URL allow-listing, SSRF guards, body size caps, per-IP rate limiting and sanitised upstream errors — security is not an add-on.'
  },
  {
    icon: MonitorSmartphone,
    title: 'Built like a product',
    body:
      'CLS-safe layout, keyboard shortcuts, reduced-motion support and screen-reader labels. Fast for users, friendly to crawlers.'
  }
]

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function FeaturesPage() {
  return (
    <>
      <script
        id="ld-breadcrumb-features"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Features', path: '/features' }
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
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">Features</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              A downloader built like a{' '}
              <span className="text-gradient">proper product</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              No installers, no extensions, no &ldquo;premium&rdquo; speed tiers. Here is everything
              download24 does for you — and a peek at how it does it.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
            >
              <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              Try it with a link
            </Link>
          </div>
        </section>

        {/* ----------------------------------------------- feature cards */}
        <section
          aria-label="Main features"
          className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-(--radius-card) border border-line bg-white/[0.02] p-5 transition-colors hover:border-line-strong hover:bg-white/[0.04] sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
                />
                <div className="mx-auto w-full max-w-[220px]">
                  <FeatureArt variant={feature.variant} />
                </div>
                <h2 className="mt-3 text-base font-semibold text-white sm:text-lg">{feature.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{feature.lead}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-xs leading-relaxed text-white/55">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={3} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- trust points */}
        <section aria-label="Promises" className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">Promises</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              What you get on every single download
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => (
              <article
                key={point.title}
                className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5 transition-colors hover:border-line-strong hover:bg-white/[0.04]"
              >
                <h3 className="text-sm font-semibold text-white">{point.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{point.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ under the hood */}
        <section aria-label="Under the hood" className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Under the hood
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Engineering you can feel
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              The boring parts are done properly so the exciting part — your file arriving — just
              works.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {UNDER_THE_HOOD.map((item) => (
              <article
                key={item.title}
                className="flex gap-4 rounded-(--radius-card) border border-line bg-white/[0.02] p-5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/25">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/60">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="features-cta" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-gradient-to-br from-accent/[0.15] via-transparent to-cyan-glow/[0.10] p-6 text-center sm:p-10">
            <div aria-hidden="true" className="hero-aurora animate-float opacity-30" />
            <div className="relative">
              <Sparkles className="mx-auto h-5 w-5 text-accent" aria-hidden="true" />
              <h2 id="features-cta" className="mt-2 font-display text-2xl font-bold text-white">
                Convinced? Your first link is free
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                So is your hundredth. Paste any video link and pick your quality.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                Start downloading
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
