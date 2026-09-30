import Link from 'next/link'

import { PLATFORMS } from '@/lib/platforms'
import { SITE, isProductionSite } from '@/lib/site'
import { Logo, Wordmark } from './Logo'

const YEAR = new Date().getFullYear()

const EXPLORE = [
  { href: '/', label: 'Downloader' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/platforms', label: 'Supported platforms' },
  { href: '/faq', label: 'FAQ' }
]

const LEGAL = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms#copyright', label: 'Copyright & DMCA' },
  { href: '/faq', label: 'Frequently asked' }
]

const DEDICATED = [
  { href: '/youtube-video-download', label: 'YouTube' },
  { href: '/instagram-video-download', label: 'Instagram' },
  { href: '/tiktok-video-download', label: 'TikTok' },
  { href: '/facebook-video-download', label: 'Facebook' },
  { href: '/twitter-video-download', label: 'Twitter / X' },
  { href: '/youtube-shorts-download', label: 'Shorts' },
  { href: '/reddit-video-download', label: 'Reddit' },
  { href: '/twitch-clip-download', label: 'Twitch' },
  { href: '/terabox-video-download', label: 'TeraBox' }
]

const PROMISES = ['No registration', 'Server-side ffmpeg merges', '15-minute LRU cache']

/** Repeating diagonal candy strip that "tapes" the footer to the page. */
function StripeRule() {
  return (
    <div
      aria-hidden="true"
      className="nb-stripes h-3.5 w-full border-y-[3px] border-line bg-sun text-[#101010]"
    />
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t-[3px] border-line bg-surface" role="contentinfo">
      <StripeRule />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
          {/* ------------------------------------------------- brand plate */}
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-10 w-10" />
              <span className="text-ink">
                <Wordmark />
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              A free, browser-based video downloader for up to 4K MP4 and MP3 audio across{' '}
              {PLATFORMS.length} networks. No installers, no extensions, no account — and nothing is
              kept on the server after your file finishes.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PROMISES.map((promise) => (
                <li key={promise} className="nb-chip nb-chip-sm nb-chip-soft">
                  {promise}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------- link lists */}
          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="nb-kicker">
              Explore
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline hover:decoration-[3px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="nb-kicker">
              Legal
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline hover:decoration-[3px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-platforms">
            <h2 id="footer-platforms" className="nb-kicker">
              Dedicated downloaders
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {DEDICATED.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline hover:decoration-[3px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ------------------------------------------------------- disclaimer */}
        <div className="nb-inset mt-10 p-4 sm:p-5">
          <p className="text-xs leading-relaxed text-ink-soft">
            <strong className="font-bold text-ink">Disclaimer.</strong> {SITE.name} is an independent
            demonstration project and is not affiliated with, endorsed by, or sponsored by YouTube,
            Google, Meta, Instagram, Facebook, TikTok, ByteDance, X Corp., Twitter, Vimeo, Dailymotion,
            Reddit, Twitch or TeraBox (Baidu). All trademarks, brand names and logos belong to their
            respective owners and are used here for identification only.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            We do not host, store or upload any media. Downloads are retrieved from the public source
            you supply, on your responsibility. Please review the terms of service of the platform you
            use and only download content you own or that is licensed for redistribution. Removing or
            ignoring a watermark may also breach local law.
          </p>
        </div>

        {/* -------------------------------------------------------- bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t-[3px] border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] tracking-wide text-ink-mute uppercase">
            © {YEAR} {SITE.name}. Provided “as is”, without warranty of any kind.
          </p>
          <p className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] tracking-wide text-ink-mute uppercase">
            <span className="nb-chip nb-chip-sm nb-chip-soft">Next.js App Router</span>
            <span className="nb-chip nb-chip-sm nb-chip-soft">yt-dlp engine</span>
            {!isProductionSite ? (
              <span className="nb-chip nb-chip-sm nb-chip-tang">dev host: {SITE.domainHost}</span>
            ) : null}
          </p>
        </div>
      </div>
    </footer>
  )
}
