import Link from 'next/link'
import { ArrowDownToLine, Compass, MoveLeft } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { NotFoundTracker } from '@/components/NotFoundTracker'
import { PlatformBar } from '@/components/PlatformBar'

const EXITS = [
  { href: '/', label: 'Home' },
  { href: '/platforms', label: 'Platforms' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' }
]

export default function NotFound() {
  return (
    <>
      <NotFoundTracker />
      <Header />
      <PlatformBar />

      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <div className="nb-panel nb-press nb-press-lg overflow-hidden p-6 text-center sm:p-10">
          <span
            aria-hidden="true"
            className="mx-auto block w-fit rounded-pill border-[3px] border-line bg-sun px-4 py-1.5 font-display text-sm tracking-wide text-[#101010] uppercase"
          >
            404
          </span>

          <h1 className="nb-h1 mt-6">
            That link does <span className="nb-mark nb-mark-punch">not lead</span> anywhere
          </h1>

          <p className="nb-lead mx-auto mt-4 max-w-xl">
            The page you asked for does not exist on this host. If you were trying to download a video,
            paste its link into the box instead — the extractor understands YouTube, TikTok, Instagram,
            Facebook, X, Vimeo, Dailymotion, Reddit, Twitch and TeraBox share links.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="nb-btn nb-btn-brand nb-btn-lg">
              <ArrowDownToLine className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />
              Go to the downloader
            </Link>
            <Link href="/faq" className="nb-btn nb-btn-lg">
              <Compass className="h-4.5 w-4.5" aria-hidden="true" />
              Read the FAQ
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {EXITS.map((exit) => (
              <Link key={exit.href} href={exit.href} className="nb-chip nb-chip-sm nb-chip-soft">
                <MoveLeft className="h-3 w-3" aria-hidden="true" />
                {exit.label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
