import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, Check, Music, Zap } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PlatformBar } from '@/components/PlatformBar'
import { PlatformGrid } from '@/components/PlatformGrid'
import { PlatformMark } from '@/components/PlatformMark'
import { MAX_RES_LABEL, PLATFORMS } from '@/lib/platforms'
import { breadcrumbSchema, serializeJsonLd } from '@/lib/seo'
import { canonicalOrigin } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Supported platforms — 10+ networks, one downloader',
  description:
    'Every network the download24 downloader supports: YouTube, Shorts, Instagram Reels, TikTok without watermark, Facebook, X/Twitter, Vimeo, Dailymotion, Reddit, Twitch clips and TeraBox share links — plus 1,000+ sites via yt-dlp.',
  keywords: [
    'supported video platforms',
    'youtube downloader',
    'instagram reels downloader',
    'tiktok no watermark',
    'facebook video downloader',
    'twitch clip downloader'
  ],
  alternates: {
    canonical: '/platforms',
    languages: {
      'x-default': `${canonicalOrigin}/platforms`,
      en: `${canonicalOrigin}/platforms`
    }
  },
  openGraph: {
    title: 'Supported platforms — 10+ networks, one downloader',
    description:
      'YouTube, Instagram, TikTok, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch, TeraBox and 1,000+ more sites through one paste-and-download box.',
    url: `${canonicalOrigin}/platforms`,
    type: 'website'
  },
  robots: { index: true, follow: true }
}

export default function PlatformsPage() {
  return (
    <>
      <script
        id="ld-breadcrumb-platforms"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Supported platforms', path: '/platforms' }
            ])
          )
        }}
      />
      <Header />
      <PlatformBar allPlatformsHref="/#supported-platforms-grid" />
      <main id="main" className="flex-1">
        {/* ---------------------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden pt-12 pb-4 sm:pt-16">
          <div aria-hidden="true" className="hero-aurora animate-float opacity-25" />
          <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Supported networks
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              One tool, <span className="text-gradient">{PLATFORMS.length} platforms</span> (and
              1,000+ more)
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              The same extraction engine handles every network below — so quality options, MP3
              conversion and merging behave the same wherever your link came from.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- capability table */}
        <section
          aria-labelledby="platforms-table-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6"
        >
          <h2 id="platforms-table-heading" className="sr-only">
            Platform capabilities at a glance
          </h2>
          <div className="overflow-x-auto rounded-(--radius-card) border border-line">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Supported platforms with maximum quality, watermark-free and MP3 support
              </caption>
              <thead>
                <tr className="bg-white/[0.04] text-[11px] tracking-wide text-white/55 uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">Platform</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Max quality</th>
                  <th scope="col" className="px-4 py-3 font-semibold">No watermark</th>
                  <th scope="col" className="px-4 py-3 font-semibold">MP3</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((platform) => (
                  <tr key={platform.id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-semibold text-white/90">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-900 ring-1 ring-inset ring-line">
                          <PlatformMark id={platform.id} className="h-4 w-4" />
                        </span>
                        {platform.name}
                      </span>
                    </th>
                    <td className="px-4 py-3 text-white/60">{MAX_RES_LABEL[platform.maxResolution]}</td>
                    <td className="px-4 py-3">
                      {platform.noWatermark ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {platform.supportsMp3 ? (
                        <span className="inline-flex items-center gap-1 text-white/70">
                          <Music className="h-3.5 w-3.5" aria-hidden="true" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------ the grid */}
        <section
          id="supported-platforms-grid"
          aria-labelledby="platforms-grid-heading"
          className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Dedicated downloaders
            </p>
            <h2 id="platforms-grid-heading" className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Pick a network for a tuned experience
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Each platform has its own page with tailored steps, quality notes and SEO — but every
              one of them accepts any link the engine understands.
            </p>
          </div>
          <div className="mt-6">
            <PlatformGrid />
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="platforms-cta" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-gradient-to-br from-accent/[0.15] via-transparent to-cyan-glow/[0.10] p-6 text-center sm:p-10">
            <div aria-hidden="true" className="hero-aurora animate-float opacity-30" />
            <div className="relative">
              <h2 id="platforms-cta" className="font-display text-2xl font-bold text-white">
                Your platform is probably supported
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                Paste a link from any network above — or try something exotic from the 1,000+ list.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                Test a link now
              </Link>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
                <Check className="h-3 w-3 text-ok" aria-hidden="true" />
                Free · No signup · Up to 4K
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
