import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DownloadFlow } from '@/components/download/DownloadFlow'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LoadingPanel } from '@/components/Spinner'

/**
 * Step 3 of the three-page download flow — the animated progress page.
 *
 * Streams the chosen format from `/api/download` while showing a live gauge,
 * transfer stats and (on completion) the success scene. `noindex` because the
 * URL carries a per-user selection and means nothing out of context.
 */
export const metadata: Metadata = {
  title: 'Downloading…',
  description: 'Your file is streaming — watch the download progress and grab the saved file.',
  robots: { index: false, follow: false }
}

export default function DownloadProgressPage() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 px-4 py-10 sm:py-14">
        <Suspense fallback={<LoadingPanel />}>
          <DownloadFlow />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
