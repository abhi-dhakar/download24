import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownToLine,
  Check,
  Cpu,
  Database,
  Gauge,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

import { FeatureArt } from '@/components/illustrations/FeatureArt'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { CtaPlate, NoteCard, PageHero, SectionHeading } from '@/components/ui/PageBlocks'
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
    tone: 'bg-sun text-[#101010]',
    plate: 'bg-sun text-[#101010]',
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
    tone: 'bg-punch text-[#101010]',
    plate: 'bg-punch text-[#101010]',
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
    tone: 'bg-lime text-[#101010]',
    plate: 'bg-lime text-[#101010]',
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
    tone: 'bg-aqua text-[#101010]',
    plate: 'bg-aqua text-[#101010]',
    title: 'Multi-platform by design',
    lead: 'One engine, every network you actually use.',
    points: [
      'YouTube, Shorts, Instagram, TikTok, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch, TeraBox',
      'Clean renditions for Reels & TikTok — no burned-in watermark',
      '1,000+ additional sites through the yt-dlp extractor library'
    ]
  }
]

const TRUST_POINTS = [
  {
    title: 'Zero watermarks',
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
      'Extraction results are held in memory for fifteen minutes, so a second visitor asking for the same video is answered instantly — and the source platform is queried once, not twice.'
  },
  {
    icon: Cpu,
    title: 'yt-dlp under the hood',
    body:
      'The resolver wraps yt-dlp with a hard timeout, a sanitised error mapping and per-IP fair-use limits, so one bad link can never wedge the process.'
  },
  {
    icon: Gauge,
    title: 'Split streams, muxed server-side',
    body:
      'For anything above 720p the video and audio arrive as two DASH streams. We download both and mux them with ffmpeg — no re-encode, no quality loss.'
  },
  {
    icon: ShieldCheck,
    title: 'Nothing stored on disk',
    body:
      'Downloads are piped straight from the resolver to your browser. The temporary child process exits the moment your transfer ends.'
  }
]

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
        <PageHero
          kicker="Feature sheet"
          title={
            <>
              A downloader built like a{' '}
              <span className="nb-mark nb-mark-punch">proper product</span>
            </>
          }
          lead="No installers, no extensions, no “premium” speed tiers. Here is everything download24 does for you — and a peek at how it does it."
        >
          <Link href="/#downloader" className="nb-btn nb-btn-brand nb-btn-lg">
            <ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />
            Try it with a link
          </Link>
          <Link href="/platforms" className="nb-btn nb-btn-sun nb-btn-lg">
            See all platforms
          </Link>
        </PageHero>

        {/* ----------------------------------------------- feature cards */}
        <section aria-label="Main features" className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
          <ul className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="nb-card nb-press-card flex h-full flex-col overflow-hidden">
                <span
                  aria-hidden="true"
                  className={`${feature.plate} nb-halftone flex items-center justify-between border-b-[3px] border-line px-4 py-2 font-mono text-[10px] font-bold tracking-[0.16em] uppercase`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {feature.title}
                  </span>
                  <span aria-hidden="true" className="font-mono">
                    ★
                  </span>
                </span>

                <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
                  <span className="mx-auto w-full max-w-[190px] shrink-0 sm:mx-0">
                    <FeatureArt variant={feature.variant} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base uppercase sm:text-lg">{feature.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed font-medium text-ink">{feature.lead}</p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-ink" strokeWidth={3.5} aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------- trust points */}
        <section aria-label="Promises" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <SectionHeading
            kicker="Promises"
            title={
              <>
                What you get on <span className="nb-mark nb-mark-lime">every</span> download
              </>
            }
          />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point, index) => (
              <li key={point.title} className="nb-card nb-press-card flex h-full flex-col p-5">
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 place-items-center rounded-btn border-[3px] border-line font-display text-sm ${
                    ['bg-sun', 'bg-punch', 'bg-lime', 'bg-aqua'][index % 4]
                  } text-[#101010]`}
                >
                  0{index + 1}
                </span>
                <h3 className="mt-3.5 font-display text-sm uppercase">{point.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{point.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------ under the hood */}
        <section aria-label="Under the hood" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <SectionHeading
            kicker="Under the hood"
            title={
              <>
                Engineering you can <span className="nb-mark nb-mark-aqua">feel</span>
              </>
            }
            lead="The boring parts are done properly so the exciting part — your file arriving — just works."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {UNDER_THE_HOOD.map((item) => (
              <article key={item.title} className="nb-card nb-press-card flex gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-btn border-[3px] border-line bg-surface-2">
                  <item.icon className="h-5 w-5 text-brand-ink" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-sm uppercase">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ device support */}
        <section aria-label="Device support" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            <NoteCard tone="bg-grape text-white" tab="Browser" title="Nothing to install" icon={<MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" />}>
              The tool is a single web page. No extension, no executable, no app-store review — which also
              means no toast asking you to update it.
            </NoteCard>
            <NoteCard tone="bg-sun text-[#101010]" tab="Mobile" title="Home-screen ready" icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}>
              Add download24 to your home screen and it behaves like an app: full-screen, offline-capable
              shell, and the paste box one tap away.
            </NoteCard>
            <NoteCard tone="bg-punch text-[#101010]" tab="Sharing" title="Works mid-thread" icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}>
              Sharing a link to download24? The URL parameter carries the video straight into step 2, so
              the recipient skips the paste.
            </NoteCard>
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section aria-labelledby="features-cta" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <CtaPlate
            headingId="features-cta"
            heading="Convinced? Your first link is free"
            body="So is your hundredth. Paste any video link and pick your quality."
            cta="Start downloading"
            tone="bg-sun"
            icon={<ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
