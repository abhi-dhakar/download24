import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpRight, Check, Sparkles, Star, Zap } from 'lucide-react'

import { Downloader } from '@/components/Downloader'
import { FaqAccordion } from '@/components/FaqAccordion'
import { FeatureHighlights } from '@/components/FeatureHighlights'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { HowToDownload } from '@/components/HowToDownload'
import { PlatformBar } from '@/components/PlatformBar'
import { PlatformGrid } from '@/components/PlatformGrid'
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
 *
 * Visual language: playfulness-first neo-brutalism — cream paper and ink
 * borders, candy-highlight headlines, hard offset shadows, tilted stickers and
 * a marquee band in place of a corporate gradient hero.
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
        'Download24.in — free multi-platform video downloader. 4K MP4 & MP3 from YouTube, Instagram, Facebook, X, Reddit, Twitch and TeraBox share links.'
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
  { value: '4K', label: 'Max quality', sub: '2160p 60fps', tone: 'bg-sun text-[#101010]' },
  { value: '<3s', label: 'Avg. parse', sub: 'paste → links', tone: 'bg-punch text-[#101010]' },
  { value: '100%', label: 'Free forever', sub: 'no hidden limits', tone: 'bg-lime text-[#101010]' },
  { value: '0', label: 'Signups', sub: 'ever', tone: 'bg-aqua text-[#101010]' }
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
    title: 'Zero watermarks',
    body:
      'Download24 asks the platform for the clean rendition, so Reels and TikToks save without an overlay burned into the frame.',
    art: 'a' as const
  },
  {
    title: 'True 4K, never upscaled',
    body:
      'We show exactly the qualities the source publishes. If a creator uploaded in 2160p60, that is what you get — bit-for-bit.',
    art: 'b' as const
  },
  {
    title: 'Works on any device',
    body:
      'Chrome, Safari, Firefox, Edge, Android and iPhone. Nothing to install — the whole tool lives inside this page.',
    art: 'c' as const
  },
  {
    title: 'Privacy by design',
    body:
      'Links you paste are used only to fetch the file. We do not store your URLs, downloads or IP after the session ends.',
    art: 'd' as const
  }
]

const QUICKIES = [
  {
    tone: 'bg-sun text-[#101010]',
    icon: Zap,
    title: 'Instagram Reels & TikTok — no watermark',
    body:
      'Paste a Reel or a vm.tiktok.com link and Download24 requests the clean master, so the saved MP4 has no logo burned in. The same link also exports the audio as MP3.'
  },
  {
    tone: 'bg-aqua text-[#101010]',
    icon: Sparkles,
    title: 'Why 1080p+ videos are “merged”',
    body:
      'Modern platforms serve video and audio as two DASH streams. Anything above 720p on YouTube is split like that, so our server downloads both and muxes them with ffmpeg — no re-encode, same quality.'
  },
  {
    tone: 'bg-punch text-[#101010]',
    icon: Star,
    title: 'MP3 that actually sounds good',
    body:
      'Audio extraction works on every supported network. We pull the highest-bitrate stream, transcode once with LAME at VBR 0, write ID3 tags and stream the finished file to you.'
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
        {/* HERO                                                             */}
        {/* ================================================================ */}
        <section
          id="downloader"
          aria-labelledby="downloader-heading"
          className="relative isolate overflow-hidden border-b-[3px] border-line bg-paper-2 pt-12 pb-16 sm:pt-16 sm:pb-20"
        >
          {/* Subtle clean background textures */}
          <div aria-hidden="true" className="nb-grid-lines pointer-events-none absolute inset-0 opacity-40" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-radial-[circle_at_center,transparent_20%,var(--color-paper-2)_90%] opacity-80"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            {/* 2-column layout: text on left, downloader box on right (equal 50/50 columns) */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
              {/* Left column: Text & Information */}
              <div className="text-center lg:text-left">
                <p className="nb-sticker">
                
                Free · No signup · No app
              </p>
                {/* Main heading */}
                <h1 id="downloader-heading" className="nb-h1 mt-2 text-ink">
                  Download Videos in{' '}
                  <span className="relative inline-block">
                    <span className="nb-mark nb-mark-punch">4K</span>
                  </span>{' '}
                  &amp; <span className="nb-mark nb-mark-aqua">MP3</span>
                  <span className="mt-6 block font-sans text-[clamp(1.05rem,2.1vw,1.35rem)] font-medium tracking-normal text-ink-mute normal-case">
                    Fast, watermark-free downloads from YouTube, Instagram, Facebook, TikTok, X, &amp; 1,000+ sites
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="nb-lead mx-auto mt-6 max-w-xl text-ink-soft lg:mx-0">
                  Paste any video link to extract high-bitrate MP4 or MP3 in seconds. No ads, no popups, and no registration required.
                </p>

                {/* Feature highlight chips */}
                <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {[
                    '100% Free Forever',
                    'Up to 4K 60fps',
                    'Clean MP3 Audio',
                    'No Watermark',
                    'No Software Required'
                  ].map((item) => (
                    <li key={item} className="nb-chip nb-chip-sm nb-chip-soft">
                      <Check className="h-3 w-3 text-ok-ink" strokeWidth={3.5} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>

                <noscript>
                  <p className="nb-card-flat mx-auto mt-6 max-w-xl bg-surface p-3 text-xs text-ink-soft lg:mx-0">
                    JavaScript is required for the live extractor. You can use the direct API:{' '}
                    <code>/api/parse?url=YOUR-LINK</code>
                  </p>
                </noscript>
              </div>

              {/* Right column: Downloader input box */}
              <div className="w-full">
                <Downloader />
              </div>
            </div>

            {/* Stats band */}
            <div className="mt-14 w-full">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {HERO_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="nb-card p-4 text-center transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span
                        className={`inline-block rounded-lg border-[2.5px] border-line px-3 py-0.5 font-display text-lg sm:text-xl ${stat.tone}`}
                      >
                        {stat.value}
                      </span>
                      <span className="mt-2.5 block font-display text-[11px] tracking-wider text-ink uppercase">
                        {stat.label}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-ink-mute">{stat.sub}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* TRUST / WHY                                                      */}
        {/* ================================================================ */}
        <section aria-labelledby="why-heading" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="nb-kicker">Why Download24</p>
            <h2 id="why-heading" className="nb-h2 mt-3">
              Built to be <span className="nb-mark nb-mark-lime">fast</span>, and to stay honest
            </h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point, index) => (
              <article
                key={point.title}
                className={`nb-card nb-press-card flex h-full flex-col p-5 ${
                  index % 2 === 0 ? 'nb-tilt-l' : 'nb-tilt-r'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-11 place-items-center rounded-btn border-[3px] border-line font-display text-base ${
                    ['bg-sun', 'bg-lime', 'bg-aqua', 'bg-punch'][index % 4]
                  } text-[#101010]`}
                >
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-display text-sm uppercase">{point.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{point.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* HOW TO                                                           */}
        {/* ================================================================ */}
        <section
          id="how-to-download"
          aria-labelledby="howto-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="nb-kicker">Four steps</p>
              <h2 id="howto-heading" className="nb-h2 mt-3">
                Link to file in <span className="nb-mark nb-mark-aqua">seconds</span>
              </h2>
              <p className="nb-lead mt-3">
                No account, no queue, no software — the whole flow runs in the browser you already have.
              </p>
            </div>
            <Link href="/how-it-works" className="nb-btn nb-btn-sun">
              Full walkthrough
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8">
            <HowToDownload />
          </div>
        </section>

        {/* ================================================================ */}
        {/* FEATURES                                                         */}
        {/* ================================================================ */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="max-w-2xl">
            <p className="nb-kicker">Feature sheet</p>
            <h2 id="features-heading" className="nb-h2 mt-3">
              Everything, <span className="nb-mark nb-mark-punch">included</span>
            </h2>
            <p className="nb-lead mt-3">
              No tiers, no credits, no “pro” upsell. Every capability below is on by default for every
              visitor.
            </p>
          </div>

          <div className="mt-8">
            <FeatureHighlights />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/features" className="nb-btn nb-btn-brand">
              All features
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ================================================================ */}
        {/* QUALITY GUIDE                                                    */}
        {/* ================================================================ */}
        <section
          id="qualities"
          aria-labelledby="qualities-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6"
        >
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="nb-kicker">Quality guide</p>
              <h2 id="qualities-heading" className="nb-h2 mt-3">
                Which quality is <span className="nb-mark">right</span> for you?
              </h2>
              <p className="nb-lead mt-3">
                We only offer what the source publishes — nothing is upscaled. The sizes below are
                indicative for a 1-hour video; the result panel shows the exact size for your clip.
              </p>

              <div className="nb-card mt-6 overflow-hidden">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Video download quality comparison: 4K, 1440p, 1080p, 720p, 480p, 360p and MP3
                  </caption>
                  <thead>
                    <tr className="border-b-[3px] border-line bg-surface-2 font-mono text-[10px] tracking-[0.12em] uppercase">
                      <th scope="col" className="px-4 py-3 font-bold">
                        Quality
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        Resolution
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        Typical size
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">
                        Best for
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITY_TABLE.map((row) => (
                      <tr key={row.tier} className="border-t-[2.5px] border-line align-top last:border-b-0">
                        <th scope="row" className="px-4 py-3 text-left font-bold text-ink">
                          {row.tier}
                        </th>
                        <td className="px-4 py-3 font-mono text-xs text-ink-soft tabular-nums">
                          {row.height}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-soft tabular-nums">
                          {row.size}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-ink-mute sm:table-cell">
                          {row.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {QUICKIES.map((quickie) => (
                <article key={quickie.title} className="nb-card nb-press-card overflow-hidden">
                  <span
                    aria-hidden="true"
                    className={`flex items-center gap-2 border-b-[3px] border-line px-4 py-2 font-mono text-[10px] font-bold tracking-[0.16em] uppercase ${quickie.tone}`}
                  >
                    <quickie.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    Good to know
                  </span>
                  <div className="p-5">
                    <h3 className="font-display text-sm uppercase">{quickie.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{quickie.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* PLATFORMS                                                        */}
        {/* ================================================================ */}
        <section
          id="supported-platforms"
          aria-labelledby="platforms-heading"
          className="mt-16 border-y-[3px] border-line bg-paper-2 py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="nb-kicker">Supported networks</p>
                <h2 id="platforms-heading" className="nb-h2 mt-3">
                  One tool, <span className="nb-mark nb-mark-lime">{PLATFORMS.length}+ platforms</span>
                </h2>
                <p className="nb-lead mt-3">
                  The same extraction engine handles every network below — so quality options, MP3
                  conversion and merging behave the same wherever your link came from.
                </p>
              </div>
              <Link href="/platforms" className="nb-btn nb-btn-ink">
                All platforms
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8">
              <PlatformGrid />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQ                                                              */}
        {/* ================================================================ */}
        <section id="faq" aria-labelledby="faq-heading" className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-6">
          <div className="text-center">
            <p className="nb-kicker">Straight answers</p>
            <h2 id="faq-heading" className="nb-h2 mt-3">
              Questions people ask
            </h2>
            <p className="nb-lead mx-auto mt-3 max-w-xl">
              These answers are also published as <code>FAQPage</code> structured data on the{' '}
              <Link href="/faq" className="nb-link">
                dedicated FAQ page
              </Link>
              , so Google can surface them directly.
            </p>
          </div>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </section>

        {/* ================================================================ */}
        {/* FINAL CTA                                                        */}
        {/* ================================================================ */}
        <section aria-labelledby="cta-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="nb-panel nb-press nb-press-xl relative overflow-hidden bg-sun p-6 text-center text-[#101010] sm:p-12">
            <div aria-hidden="true" className="nb-halftone absolute inset-0 text-[#101010] opacity-25" />
            <div className="relative">
              <span className="nb-chip nb-chip-sm bg-[#101010] text-sun">Ready when you are</span>
              <h2 id="cta-heading" className="nb-h2 mt-5 !text-[#101010]">
                One box · {PLATFORMS.length}+ platforms · up to 4K
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed font-medium text-[#101010]/80 sm:text-base">
                No installer to trust. No queues. No account to hand your email to. Just paste a link and
                Download24 does the rest.
              </p>
              <a href="#downloader" className="nb-btn nb-btn-lg nb-btn-brand mt-7">
                <ArrowDownToLine className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                Download a video now
              </a>
              <p className="mt-5 font-mono text-[11px] font-bold tracking-wide text-[#101010]/70 uppercase">
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
