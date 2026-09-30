import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PageHero } from '@/components/ui/PageBlocks'
import { analyticsEnabled } from '@/lib/analytics'
import { breadcrumbSchema, serializeJsonLd } from '@/lib/seo'
import { LIMITS, SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What this video downloader stores: no accounts, an in-memory 15-minute cache of extraction results, hashed IP counters used only for rate limiting, and privacy-conscious product analytics (PostHog) when enabled by the operator.',
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
      <main id="main" className="flex-1">
        <PageHero
          kicker="Legal"
          tone="bg-lime text-[#101010]"
          title={
            <>
              Privacy <span className="nb-mark nb-mark-punch">Policy</span>
            </>
          }
          lead="Short version: no account, no media log, and only first-party product analytics that never see the link you paste."
        />

        <div className="nb-prose mx-auto mt-12 flex w-full max-w-3xl flex-col gap-9 px-4 pb-4 sm:px-6">
          <section id="what-we-do-not-collect" aria-labelledby="no-collect-h">
            <h2 id="no-collect-h">
              1. What we do not collect
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>no account, e-mail address, name or phone number — there is nothing to register;</li>
              <li>no advertising identifiers, ad networks or social media pixels;</li>
              <li>no cookies or storage beyond the analytics identifier and preferences described below;</li>
              <li>no uploaded files, and no saved copies of any video or audio you request.</li>
            </ul>
          </section>

          <section id="link-data" aria-labelledby="link-data-h">
            <h2 id="link-data-h">
              2. What happens to the link you paste
            </h2>
            <p className="mt-2">
              Your link is sent once to <code>/api/parse</code>, which
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
            <h2 id="rate-limit-h">
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
            <h2 id="storage-h">
              4. Your browser’s own storage
            </h2>
            <p className="mt-2">
              The “Recent links” strip is stored in your browser’s <em>localStorage</em> under the key{' '}
              <code>download24in:recent</code> (up to five entries).
              It never leaves your device, and the “Clear” button next to the list deletes it immediately.
            </p>
          </section>

          <section id="analytics" aria-labelledby="analytics-h">
            <h2 id="analytics-h">
              5. Product analytics (PostHog)
            </h2>
            {analyticsEnabled ? (
              <>
                <p className="mt-2">
                  This deployment uses <strong>PostHog</strong> to understand how the downloader is used and where it
                  breaks. It records page views, clicks, the steps of the download flow (link submitted → formats
                  found → quality chosen → file delivered), performance timings, JavaScript errors, and anonymised
                  session replays in which every input field and the pasted link are masked. Events are sent
                  through this site’s own domain to PostHog’s servers and are stored under a random device
                  identifier kept in a first-party cookie/localStorage; we never ask for your name or e-mail.
                </p>
                <p className="mt-2">
                  For each request the analytics see the <em>source site</em> (for example “youtube.com”), the
                  chosen resolution and whether it succeeded — never the video URL or its title. Use a content
                  blocker, or clear this site’s storage, to reset the identifier at any time.
                </p>
              </>
            ) : (
              <p className="mt-2">
                This deployment has analytics switched off: no analytics script is loaded and no usage events are
                sent anywhere. Operators can enable PostHog via the{' '}
                <code>NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN</code> variable,
                in which case this section describes what is collected.
              </p>
            )}
          </section>

          <section id="server-logs" aria-labelledby="logs-h">
            <h2 id="logs-h">
              6. Server logs
            </h2>
            <p className="mt-2">
              Failures are logged with the resolved source URL, the mapped error code and a short, sanitised
              excerpt of the resolver output — signed media URLs found in that text are replaced with{' '}
              <code>{'<link>'}</code> before logging. Successful
              requests are not logged with any identifier. Your infrastructure provider (for example a CDN or
              PaaS) may still keep standard access logs under its own policy.
            </p>
          </section>

          <section id="children" aria-labelledby="children-h">
            <h2 id="children-h">
              7. Children, transfers and your rights
            </h2>
            <p className="mt-2">
              The service is not directed at children and collects no personal data, so there is nothing to
              export, rectify or erase on request — deleting your browser storage is sufficient. No data is sold,
              shared or transferred to processors for profiling. Because extraction talks to the source platform
              on your behalf, that platform may see the request (including its IP and user-agent) under its own
              privacy policy.
            </p>
          </section>

          <p className="nb-inset p-4 text-xs leading-relaxed text-ink-soft">
            Template text for a demonstration project. Have a lawyer review it — and, depending on where your
            visitors live, add a GDPR/CCPA consent banner for the analytics — before running this publicly.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
