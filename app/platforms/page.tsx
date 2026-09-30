import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownToLine, Check, Music, Zap } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PlatformBar } from '@/components/PlatformBar'
import { PlatformGrid } from '@/components/PlatformGrid'
import { PlatformMark } from '@/components/PlatformMark'
import { CtaPlate, PageHero } from '@/components/ui/PageBlocks'
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
      <PlatformBar allPlatformsHref="/#supported-platforms" />

      <main id="main" className="flex-1">
        <PageHero
          kicker="Supported networks"
          title={
            <>
              One tool, <span className="nb-mark nb-mark-lime">{PLATFORMS.length} platforms</span> and
              1,000+ more
            </>
          }
          lead="The same extraction engine handles every network below — so quality options, MP3 conversion and merging behave the same wherever your link came from."
          tone="bg-lime text-[#101010]"
        >
          <Link href="/#downloader" className="nb-btn nb-btn-brand nb-btn-lg">
            <ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />
            Test a link now
          </Link>
        </PageHero>

        {/* --------------------------------------------------- capability table */}
        <section aria-labelledby="platforms-table-heading" className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
          <h2 id="platforms-table-heading" className="nb-h3 mb-4">
            Capabilities at a glance
          </h2>
          <div className="nb-card overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Supported platforms with maximum quality, watermark-free and MP3 support
              </caption>
              <thead>
                <tr className="border-b-[3px] border-line bg-surface-2 font-mono text-[10px] tracking-[0.12em] uppercase">
                  <th scope="col" className="px-4 py-3 font-bold">
                    Platform
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Max quality
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    No watermark
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    MP3
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((platform) => (
                  <tr key={platform.id} className="border-t-[2.5px] border-line">
                    <th scope="row" className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-bold text-ink">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[2.5px] border-line bg-surface-2"
                          style={{ borderColor: platform.accent }}
                        >
                          <PlatformMark id={platform.id} className="h-4 w-4" />
                        </span>
                        {platform.name}
                      </span>
                    </th>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {MAX_RES_LABEL[platform.maxResolution]}
                    </td>
                    <td className="px-4 py-3">
                      {platform.noWatermark ? (
                        <span className="nb-chip nb-chip-sm nb-chip-lime">
                          <Zap className="h-3 w-3 fill-current" aria-hidden="true" />
                          Yes
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-mute">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {platform.supportsMp3 ? (
                        <span className="nb-chip nb-chip-sm nb-chip-punch">
                          <Music className="h-3 w-3" aria-hidden="true" />
                          Yes
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-mute">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------------- the grid */}
        <section
          id="supported-platforms-grid"
          aria-labelledby="platforms-grid-heading"
          className="mt-16 border-y-[3px] border-line bg-paper-2 py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="nb-kicker">Dedicated downloaders</p>
              <h2 id="platforms-grid-heading" className="nb-h2 mt-3">
                Pick a network for a <span className="nb-mark nb-mark-punch">tuned</span> experience
              </h2>
              <p className="nb-lead mt-3">
                Each platform has its own page with tailored steps, quality notes and SEO — but every one
                of them accepts any link the engine understands.
              </p>
            </div>
            <div className="mt-8">
              <PlatformGrid />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section aria-labelledby="platforms-cta" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <CtaPlate
            headingId="platforms-cta"
            heading="Your platform is probably supported"
            body="Paste a link from any network above — or try something exotic from the 1,000+ list."
            cta="Test a link now"
            tone="bg-aqua"
            icon={<ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />}
          />
          <p className="mt-5 flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold tracking-wide text-ink-mute uppercase">
            <Check className="h-3.5 w-3.5 text-ok-ink" aria-hidden="true" />
            Free · No signup · Up to 4K
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
