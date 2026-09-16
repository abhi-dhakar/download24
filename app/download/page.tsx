import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DownloadDetails } from '@/components/download/DownloadDetails'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LoadingPanel } from '@/components/Spinner'

/**
 * Step 2 of the three-page download flow.
 *
 * The user arrives here from the homepage (or any dedicated platform page)
 * with `?url=…`; `DownloadDetails` runs the extraction and lists the video
 * details + quality options. The page itself is a static shell — the query
 * string is read inside the Suspense boundary so the chrome stays prerendered.
 */
export const metadata: Metadata = {
  title: 'Choose quality & format',
  description:
    'Review the video details and pick a download quality — 4K, 1080p, 720p or MP3 — before the final download step.',
  robots: { index: false, follow: false }
}

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 px-4 py-10 sm:py-14">
        <Suspense fallback={<LoadingPanel />}>
          <DownloadDetails />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
