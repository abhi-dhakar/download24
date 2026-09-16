import Link from 'next/link'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-24 sm:px-6">
        <p className="font-display text-sm font-semibold text-accent-soft">404 — page not found</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
          That link does not lead anywhere
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          The page you asked for does not exist on this host. If you were trying to download a video, paste its
          link into the box instead — the extractor understands YouTube, TikTok, Instagram, Facebook, X, Vimeo,
          Dailymotion, Reddit and Twitch.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/#downloader"
            className="rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            Go to the downloader
          </Link>
          <Link
            href="/#faq"
            className="rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
          >
            Read the FAQ
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
