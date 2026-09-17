import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DownloadFlow } from '@/components/download/DownloadFlow'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LoadingPanel } from '@/components/Spinner'

/**
 * Step 3 of the three-page download flow — the animated progress page.
 *
 * Streams the chosen format from `/api/download` while showing the selected
 * file's thumbnail/metadata, an ambient "it is running" animation, plain
 * instructions on how long to expect, and (on completion) the success scene.
 * No transfer telemetry: no percentage, byte counter, speed or ETA. `noindex`
 * because the URL carries a per-user selection and means nothing out of context.
 */
export const metadata: Metadata = {
  title: 'Downloading…',
  description: 'Your file is streaming to this device — keep the tab open and it lands in your Downloads folder.',
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
