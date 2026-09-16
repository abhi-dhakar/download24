import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { breadcrumbSchema, serializeJsonLd } from '@/lib/seo'
import { LIMITS, SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What this video downloader stores: nothing about you, no accounts, no tracking pixels, an in-memory 15-minute cache of extraction results, and hashed IP counters used only for rate limiting.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true }
}

export default function PrivacyPage() {
  return (
    <>
      <script
        id="ld-breadcrumb-privacy"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Privacy Policy', path: '/privacy' }
            ])
          )
        }}
      />
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <p className="text-xs text-white/45">
          <a href="/" className="underline decoration-white/25 underline-offset-2 hover:text-white">
            {SITE.name}
          </a>{' '}
          / Privacy
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/50">
          Short version: there is no user profile, no cookie-based tracking and no media log.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-white/70">
          <section id="what-we-do-not-collect" aria-labelledby="no-collect-h">
            <h2 id="no-collect-h" className="font-display text-lg font-semibold text-white">
              1. What we do not collect
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>no account, e-mail address, name or phone number — there is nothing to register;</li>
              <li>no advertising identifiers, social pixels, heatmaps or third-party analytics scripts;</li>
              <li>no persistent first-party cookie, and no localStorage owned by this site;</li>
              <li>no uploaded files, and no saved copies of any video or audio you request.</li>
            </ul>
          </section>

          <section id="link-data" aria-labelledby="link-data-h">
            <h2 id="link-data-h" className="font-display text-lg font-semibold text-white">
              2. What happens to the link you paste
            </h2>
            <p className="mt-2">
              Your link is sent once to <code className="rounded bg-ink-800 px-1 py-0.5">/api/parse</code>, which
              asks the source platform for its format list. The result — title, thumbnail, duration and available
              resolutions — is held in this process’s memory for up to{' '}
              {Math.round(LIMITS.cacheTtlMs / 60_000)} minutes so that a second visitor asking for the same video
              is served instantly and the platform is not re-queried.
            </p>
            <p className="mt-2">
              That cache is volatile: it lives only in RAM, is capped at{' '}
              {LIMITS.cacheMaxEntries.toLocaleString('en-GB')} entries, and everything in it is gone on the next
              restart, deploy or scale-down. Media itself is never written to disk; downloads are piped from the
              resolver process straight to your browser.
            </p>
          </section>

          <section id="rate-limiting" aria-labelledby="rate-limit-h">
            <h2 id="rate-limit-h" className="font-display text-lg font-semibold text-white">
              3. Rate limiting and IP addresses
            </h2>
            <p className="mt-2">
              To keep the service usable we count requests per client. Your IP address is combined with the first
              characters of your user-agent string and hashed with FNV-1a before it is used as a counter key, so
              the raw address is never stored by this application. The counters live in memory for at most two
              minutes and are used for exactly one purpose: returning HTTP 429 when a client exceeds{' '}
              {LIMITS.extractRequestsPerMinute} extractions or {LIMITS.downloadRequestsPerMinute} downloads per
              minute.
            </p>
          </section>

          <section id="storage" aria-labelledby="storage-h">
            <h2 id="storage-h" className="font-display text-lg font-semibold text-white">
              4. Your browser’s own storage
            </h2>
            <p className="mt-2">
              The “Recent links” strip is stored in your browser’s <em>localStorage</em> under the key{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">savefromclone:recent</code> (up to five entries).
              It never leaves your device, and the “Clear” button next to the list deletes it immediately.
            </p>
          </section>

          <section id="server-logs" aria-labelledby="logs-h">
            <h2 id="logs-h" className="font-display text-lg font-semibold text-white">
              5. Server logs
            </h2>
            <p className="mt-2">
              Failures are logged with the resolved source URL, the mapped error code and a short, sanitised
              excerpt of the resolver output — signed media URLs found in that text are replaced with{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">{'<link>'}</code> before logging. Successful
              requests are not logged with any identifier. Your infrastructure provider (for example a CDN or
              PaaS) may still keep standard access logs under its own policy.
            </p>
          </section>

          <section id="children" aria-labelledby="children-h">
            <h2 id="children-h" className="font-display text-lg font-semibold text-white">
              6. Children, transfers and your rights
            </h2>
            <p className="mt-2">
              The service is not directed at children and collects no personal data, so there is nothing to
              export, rectify or erase on request — deleting your browser storage is sufficient. No data is sold,
              shared or transferred to processors for profiling. Because extraction talks to the source platform
              on your behalf, that platform may see the request (including its IP and user-agent) under its own
              privacy policy.
            </p>
          </section>

          <p className="rounded-xl border border-line bg-white/[0.02] p-4 text-xs text-white/55">
            Template text for a demonstration project. Have a lawyer review it — plus a GDPR/CCPA notice and a
            cookie banner if you add analytics — before running this publicly.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
