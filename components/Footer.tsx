import Image from 'next/image'
import Link from 'next/link'

import { PLATFORMS } from '@/lib/platforms'
import { SITE, isProductionSite } from '@/lib/site'

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-ink-950" role="contentinfo">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white/0">
                <Image
                  src="/logo.png"
                  alt="Download24 logo"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="font-display text-base font-semibold text-white">{SITE.name}</p>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
              A free, browser-based video downloader for up to 4K MP4 and MP3 audio across{' '}
              {PLATFORMS.length} networks. No installers, no extensions, no account — and nothing is kept on
              the server after your file finishes.
            </p>
            <p className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/45">
              <span className="rounded-full bg-ok/10 px-2.5 py-1 text-ok ring-1 ring-inset ring-ok/25">
                No registration
              </span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-inset ring-line">
                Server-side ffmpeg merges
              </span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-inset ring-line">
                15-minute LRU result cache
              </span>
            </p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
              Explore
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li>
                <Link href="/downloader" className="transition-colors hover:text-white">
                  Downloader
                </Link>
              </li>
              <li>
                <Link href="/features" className="transition-colors hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/platforms" className="transition-colors hover:text-white">
                  Supported platforms
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
              Legal
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
              <li>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms#copyright" className="transition-colors hover:text-white">
                  Copyright &amp; DMCA notice
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  Frequently asked questions
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-platforms">
            <h2
              id="footer-platforms"
              className="text-[11px] font-semibold text-white/45 uppercase tracking-wider"
            >
              Dedicated Downloaders
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/60">
              <li>
                <Link href="/youtube-video-download" className="transition-colors hover:text-white">
                  YouTube Downloader
                </Link>
              </li>
              <li>
                <Link href="/instagram-video-download" className="transition-colors hover:text-white">
                  Instagram Downloader
                </Link>
              </li>
              <li>
                <Link href="/tiktok-video-download" className="transition-colors hover:text-white">
                  TikTok Downloader
                </Link>
              </li>
              <li>
                <Link href="/facebook-video-download" className="transition-colors hover:text-white">
                  Facebook Downloader
                </Link>
              </li>
              <li>
                <Link href="/twitter-video-download" className="transition-colors hover:text-white">
                  Twitter / X Downloader
                </Link>
              </li>
              <li>
                <Link href="/youtube-shorts-download" className="transition-colors hover:text-white">
                  Shorts Downloader
                </Link>
              </li>
              <li>
                <Link href="/reddit-video-download" className="transition-colors hover:text-white">
                  Reddit Downloader
                </Link>
              </li>
              <li>
                <Link href="/twitch-clip-download" className="transition-colors hover:text-white">
                  Twitch Clip Downloader
                </Link>
              </li>
              <li>
                <Link href="/terabox-video-download" className="transition-colors hover:text-white">
                  TeraBox Downloader
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 rounded-xl border border-line bg-white/[0.02] p-4">
          <p className="text-xs leading-relaxed text-white/50">
            <strong className="font-semibold text-white/70">Disclaimer.</strong> {SITE.name} is an
            independent demonstration project and is not affiliated with, endorsed by, or sponsored by
            YouTube, Google, Meta, Instagram, Facebook, TikTok, ByteDance, X Corp., Twitter, Vimeo,
            Dailymotion, Reddit, Twitch or TeraBox (Baidu). All trademarks, brand names and logos belong
            to their respective owners and are used here for identification only.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            We do not host, store or upload any media. Downloads are retrieved from the public source you
            supply, on your responsibility. Please review the terms of service of the platform you use and
            only download content you own or that is licensed for redistribution. Removing or ignoring a
            watermark may also breach local law.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {YEAR} {SITE.name}. Provided “as is”, without warranty of any kind.
          </p>
          <p className="flex items-center gap-3">
            <span>Built with Next.js App Router</span>
            <span aria-hidden="true">·</span>
            <span>Powered by yt-dlp</span>
            {!isProductionSite ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-warn">development host: {SITE.domainHost}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </footer>
  )
}
