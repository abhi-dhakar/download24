import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpRight } from 'lucide-react'

import { Downloader } from '@/components/Downloader'
import { FaqAccordion } from '@/components/FaqAccordion'
import { FeatureHighlights } from '@/components/FeatureHighlights'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { HeroIllustration } from '@/components/illustrations/HeroIllustration'
import { HowToDownload } from '@/components/HowToDownload'
import { PlatformBar } from '@/components/PlatformBar'
import { PlatformGrid } from '@/components/PlatformGrid'
import { PlatformMark } from '@/components/PlatformMark'
import { PLATFORMS } from '@/lib/platforms'
import {
  breadcrumbSchema,
  serializeJsonLd,
  webApplicationSchema
} from '@/lib/seo'
import { canonicalOrigin } from '@/lib/site'

/*
 * Download24.in — India's fast, free, no-signup video downloader.
 * Metadata is tuned for Indian search intent (Hindi/English mix, JioFiber-friendly
 * quality choices) plus the global 4K / MP3 keywords that drive most traffic.
 *
 * The homepage is step 1 of the three-page download flow: the hero box hands
 * the pasted link to `/download` (details + options), which hands the chosen
 * format to `/download/progress` (animated transfer). The FAQ / HowTo JSON-LD
 * live on their dedicated `/faq` and `/how-it-works` pages.
 */
export async function generateMetadata(): Promise<Metadata> {
  const title =
    'Download24.in — Free 4K Video Downloader for YouTube, Instagram, TikTok & Facebook'

  const description =
    'Download24.in is India\'s fastest free online video downloader. Save videos in 4K, 1080p, 720p or MP3 from YouTube, Instagram Reels, Facebook, X, Moj, TikTok and more — no app, no signup, no watermark.'

  return {
    title,
    description,
    keywords: [
      'download24',
      'download24.in',
      'video downloader india',
      '4k video downloader',
      'youtube video download',
      'instagram reels download',
      'facebook video download',
      'tiktok no watermark',
      'mp3 downloader',
      'reels downloader india',
      'free online video downloader'
    ],
    alternates: {
      canonical: '/',
      languages: {
        'x-default': `${canonicalOrigin}/`,
        'en-IN': `${canonicalOrigin}/`,
        en: `${canonicalOrigin}/`
      }
    },
    openGraph: {
      title,
      description,
      url: `${canonicalOrigin}/`,
      siteName: 'Download24.in',
      type: 'website',
      locale: 'en_IN'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description:
        'Download24.in — free multi-platform video downloader. 4K MP4 & MP3 from YouTube, Instagram, Facebook, X, Reddit, Twitch and more.'
    }
  }
}

/** Landing page is static + ISR: extraction runs on-demand in the client. */
export const revalidate = 3600
export const dynamic = 'force-static'

function StructuredData({ id, data }: { id: string; data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // Payload is fully static and escaped via `serializeJsonLd` — safe from XSS.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Content constants                                                          */
/* -------------------------------------------------------------------------- */

const HERO_STATS = [
  { value: `${PLATFORMS.length}+`, label: 'Platforms', sub: 'YouTube, IG, FB…' },
  { value: '4K', label: 'Max quality', sub: '2160p 60fps' },
  { value: '<3s', label: 'Avg. parse', sub: 'from paste to link' },
  { value: '100%', label: 'Free forever', sub: 'no hidden limits' }
]

const QUALITY_TABLE = [
  {
    tier: '4K Ultra HD',
    height: '2160p',
    size: '≈ 350–900 MB / hr',
    note: 'TV & big-screen viewing. Needs stable Wi-Fi or 5G.'
  },
  {
    tier: '1440p QHD',
    height: '1440p',
    size: '≈ 220–450 MB / hr',
    note: 'Sharper than 1080p with ~40% less data.'
  },
  {
    tier: '1080p Full HD',
    height: '1080p',
    size: '≈ 150–300 MB / hr',
    note: 'Best all-rounder for laptops and editing.'
  },
  {
    tier: '720p HD',
    height: '720p',
    size: '≈ 80–160 MB / hr',
    note: 'Great balance for phones on daily data packs.'
  },
  {
    tier: '480p / 360p',
    height: '480p · 360p',
    size: '≈ 25–80 MB / hr',
    note: 'Ideal on 2G/3G or when data is capped.'
  },
  {
    tier: 'MP3 Audio',
    height: '~245 kbps VBR',
    size: '≈ 90–120 MB / hr',
    note: 'Songs, podcasts, lectures — tagged with title & artist.'
  }
]

const TRUST_POINTS = [
  {
    title: 'Zero watermarks on Reels & TikTok',
    body:
      'Download24 asks the platform for the clean rendition, so short-form videos save without an overlay burned into the frame.'
  },
  {
    title: 'True 4K, never upscaled',
    body:
      'We show exactly the qualities the source publishes. If a creator uploaded in 2160p60, that is what you get — bit-for-bit.'
  },
  {
    title: 'Works on any device',
    body:
      'Chrome, Safari, Firefox, Edge, Android and iPhone. Nothing to install — the whole tool lives inside this page.'
  },
  {
    title: 'Privacy by design',
    body:
      'Links you paste are used only to fetch the file. We do not store your URLs, downloads or IP after the session ends.'
  }
]

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <>
      <StructuredData id="ld-web-application" data={webApplicationSchema()} />
      <StructuredData
        id="ld-breadcrumb"
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Video Downloader', path: '/' }
        ])}
      />

      <Header />

      {/* "Works with" strip under the navbar — every supported network, with icons. */}
      <PlatformBar />

      <main id="main" className="flex-1">
        {/* ================================================================ */}
        {/* HERO SECTION                                                     */}
        {/* ================================================================ */}
        <section
          id="downloader"
          aria-labelledby="downloader-heading"
          className="relative isolate overflow-hidden pt-8 pb-8 sm:pt-10 sm:pb-12"
        >
          {/* Subtle Ambient Background */}
          <div aria-hidden="true" className="hero-aurora animate-float opacity-30" />
          <div aria-hidden="true" className="grid-lines opacity-40" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
            {/* ------------------------------------------------- left: copy + input */}
            <div className="text-center lg:text-left">
              
              {/* Clean, High-Impact Headline */}
              <h1
                id="downloader-heading"
                className="mt-4 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold tracking-tight text-white leading-[1.1]"
              >
                Download Online Videos in{' '}
                <span className="text-gradient">4K &amp; MP3</span>
              </h1>

              {/* Concise Subtitle */}
              <p className="mx-auto mt-2 max-w-xl text-balance text-sm leading-relaxed text-white/60 sm:text-base lg:mx-0">
                Paste any link from YouTube, Instagram Reels, Facebook, TikTok, or X.{' '}
                High speed, no watermarks, and no registration required.
              </p>

              {/* Downloader Input Box */}
              <div className="mt-8">
                <Downloader />
              </div>

          
              <noscript>
                <p className="mx-auto mt-6 max-w-xl rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn lg:mx-0">
                  JavaScript is required for the live extractor. You can use the direct API:{' '}
                  <code className="font-mono ml-1">/api/parse?url=YOUR-LINK</code>
                </p>
              </noscript>
            </div>

            {/* --------------------------------------------- right: illustration */}
            <div aria-hidden="true" className="mx-auto w-full max-w-[440px] lg:max-w-none">
              <HeroIllustration />
            </div>
          </div>

          {/* Minimalist Stats Bar */}
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6">
            <dl className="grid grid-cols-2 divide-x divide-line rounded-2xl border border-line bg-ink-900/40 backdrop-blur-sm sm:grid-cols-4">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="p-4 text-center">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-xl sm:text-2xl font-bold text-white tabular-nums">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-white/60">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================================================================ */}
        {/* TRUST STRIP                                                      */}
        {/* ================================================================ */}
        <section
          aria-label="Why Download24.in"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => (
              <article
                key={point.title}
                className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5 transition-colors hover:border-line-strong hover:bg-white/[0.04]"
              >
                <h3 className="text-sm font-semibold text-white">{point.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* FEATURE HIGHLIGHTS                                               */}
        {/* ================================================================ */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Features
              </p>
              <h2
                id="features-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                Built for the way Indians actually download
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Data packs matter. Storage matters. So Download24.in shows real
                file sizes, remembers your preferred quality and never wastes a
                second on ads or captchas.
              </p>
            </div>
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
            >
              All features
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6">
            <FeatureHighlights />
          </div>
        </section>

        {/* ================================================================ */}
        {/* HOW-TO                                                           */}
        {/* ================================================================ */}
        <section
          id="how-to-download"
          aria-labelledby="how-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                How it works
              </p>
              <h2
                id="how-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                Download any video in 4 easy steps
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Works the same on Android, iPhone, Windows, macOS and Linux —
                whether you copied the link from an app share-sheet or a
                desktop URL bar.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
            >
              Detailed guide
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6">
            <HowToDownload />
          </div>
        </section>

        {/* ================================================================ */}
        {/* PLATFORMS                                                        */}
        {/* ================================================================ */}
        <section
          id="supported-platforms"
          aria-labelledby="platforms-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Supported networks
              </p>
              <h2
                id="platforms-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                One tool, {PLATFORMS.length}+ platforms
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                The same extraction engine handles every network below — so
                quality options, MP3 conversion and merging behave the same
                wherever your link came from.
              </p>
            </div>
            <Link
              href="/platforms"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
            >
              All platforms
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6">
            <PlatformGrid />
          </div>
        </section>

        {/* ================================================================ */}
        {/* QUALITY REFERENCE                                                */}
        {/* ================================================================ */}
        <section
          id="qualities"
          aria-labelledby="qualities-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Quality guide
              </p>
              <h2
                id="qualities-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                Which quality is right for you?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                We only offer what the source publishes — nothing is upscaled.
                The sizes below are indicative for a 1-hour video; the result
                panel shows the exact size for your specific clip.
              </p>
              <div className="mt-5 overflow-hidden rounded-(--radius-card) border border-line">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Video download quality comparison: 4K, 1440p, 1080p, 720p, 480p, 360p and MP3
                  </caption>
                  <thead>
                    <tr className="bg-white/[0.04] text-[11px] tracking-wide text-white/55 uppercase">
                      <th scope="col" className="px-3 py-2.5 font-semibold">Quality</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Resolution</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Typical size</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                        Best for
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITY_TABLE.map((row) => (
                      <tr key={row.tier} className="border-t border-line align-top">
                        <th scope="row" className="px-3 py-2.5 text-left font-semibold text-white/90">
                          {row.tier}
                        </th>
                        <td className="px-3 py-2.5 text-white/60 tabular-nums">{row.height}</td>
                        <td className="px-3 py-2.5 text-white/60 tabular-nums">{row.size}</td>
                        <td className="hidden px-3 py-2.5 text-white/50 sm:table-cell">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <article className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white">
                  Instagram Reels &amp; TikTok — no watermark
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Paste a Reel or a{' '}
                  <span className="font-mono text-white/75">vm.tiktok.com</span>{' '}
                  link and Download24 requests the clean master, so the saved MP4
                  has no logo burned in. The same link also exports the audio as MP3.
                </p>
              </article>
              <article className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white">
                  Why 1080p+ videos are &ldquo;merged&rdquo;
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Modern platforms serve video and audio as two DASH streams.
                  Anything above 720p on YouTube is split like that, so our
                  server downloads both and muxes them with ffmpeg — no
                  re-encode, same quality.
                </p>
              </article>
              <article className="rounded-(--radius-card) border border-line bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white">
                  MP3 that actually sounds good
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Audio extraction works on every supported network. We pull the
                  highest-bitrate stream, transcode once with LAME at VBR 0,
                  write ID3 tags and stream the finished file to you.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQ                                                              */}
        {/* ================================================================ */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              FAQ
            </p>
            <h2
              id="faq-heading"
              className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
            >
              Questions people ask about Download24.in
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
              These answers are also published as{' '}
              <span className="font-mono text-white/70">FAQPage</span>{' '}
              structured data on the{' '}
              <Link href="/faq" className="text-accent hover:underline">
                dedicated FAQ page
              </Link>
              , so Google can surface them directly.
            </p>
          </div>
          <div className="mt-6">
            <FaqAccordion />
          </div>
        </section>

        {/* ================================================================ */}
        {/* FINAL CTA                                                        */}
        {/* ================================================================ */}
        <section
          aria-labelledby="cta-heading"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6"
        >
          <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-gradient-to-br from-accent/[0.15] via-transparent to-cyan-glow/[0.10] p-6 text-center sm:p-12">
            <div aria-hidden="true" className="hero-aurora animate-float opacity-40" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Ready when you are
              </p>
              <h2
                id="cta-heading"
                className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                One box · {PLATFORMS.length}+ platforms · every quality up to 4K
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                No installer to trust. No queues. No account to hand your email
                to. Just paste a link and Download24 does the rest.
              </p>
              <a
                href="#downloader"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                <span>Download a video now</span>
              </a>
              <p className="mt-4 text-[11px] text-white/40">
                Free • No ads on the download page • Made in India 🇮🇳
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
