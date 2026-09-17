import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { breadcrumbSchema, serializeJsonLd } from '@/lib/seo'
import { LIMITS, SITE, canonicalOrigin } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules for using download24: acceptable use, copyright responsibility, rate limits, warranty disclaimers and the platform affiliation notice.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true }
}

export default function TermsPage() {
  return (
    <>
      <script
        id="ld-breadcrumb-terms"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Terms of Service', path: '/terms' }
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
          / Terms
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-white/50">
          Last updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
          · applies to {canonicalOrigin.replace(/^https?:\/\//, '')}
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-white/70">
          <section id="acceptance" aria-labelledby="acceptance-h">
            <h2 id="acceptance-h" className="font-display text-lg font-semibold text-white">
              1. Acceptance of these terms
            </h2>
            <p className="mt-2">
              By loading, querying or otherwise using this website you agree to use it under these terms. If you
              do not agree, stop using the service immediately. This project is a demonstration of a
              browser-based media resolver built with Next.js and yt-dlp; it is offered for evaluation and
              educational purposes.
            </p>
          </section>

          <section id="acceptable-use" aria-labelledby="acceptable-use-h">
            <h2 id="acceptable-use-h" className="font-display text-lg font-semibold text-white">
              2. Acceptable use
            </h2>
            <p className="mt-2">You agree not to use the service to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>download material you do not have the right to copy, or to infringe any copyright or licence;</li>
              <li>strip, obscure or circumvent watermarks, rights-management signals or access controls;</li>
              <li>
                harvest, bulk-download or otherwise overload a source platform, or drive this service at a
                volume that degrades it for other visitors;
              </li>
              <li>
                submit links to private, paywalled or age-gated media you are not entitled to access, or attempt
                to bypass the credentials, cookies or regional restrictions protecting them;
              </li>
              <li>probe, fuzz or attack the API endpoints beyond ordinary use of the page.</li>
            </ul>
            <p className="mt-2">
              Fair-use limits apply per IP address (currently {LIMITS.extractRequestsPerMinute} link extractions and {LIMITS.downloadRequestsPerMinute} downloads per minute,
              with at most {LIMITS.downloadMaxConcurrentPerClient} concurrent downloads). Exceeding them returns HTTP 429 with a{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-white/80">Retry-After</code> header.
            </p>
          </section>

          <section id="copyright" aria-labelledby="copyright-h">
            <h2 id="copyright-h" className="font-display text-lg font-semibold text-white">
              3. Copyright and takedown notices
            </h2>
            <p className="mt-2">
              We do not host, store, cache or redistribute any media file. The resolver reads a public page you
              supply and streams the result to your device; nothing is retained on our servers after the
              transfer ends, and the temporary child process is terminated when the download closes. Consequently
              we cannot remove a file that does not exist on our infrastructure.
            </p>
            <p className="mt-2">
              Rights holders should send takedown requests to the platform where the content is actually hosted
              (YouTube, Instagram, TikTok, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch or TeraBox), each of which
              operates its own notice-and-takedown procedure. Requests that also reach us will be answered by
              pointing at that procedure.
            </p>
          </section>

          <section id="no-warranty" aria-labelledby="no-warranty-h">
            <h2 id="no-warranty-h" className="font-display text-lg font-semibold text-white">
              4. No warranty and limitation of liability
            </h2>
            <p className="mt-2">
              The service is provided “as is” and “as available”, without warranty of any kind, express or
              implied, including fitness for a particular purpose, merchantability and non-infringement. We do
              not guarantee that any given link can be resolved: source platforms change their players, sign
              their media URLs, geo-restrict content and rate-limit servers without notice. To the maximum
              extent permitted by law we are not liable for indirect, incidental or consequential damages,
              including loss of data, loss of revenue, or any claim brought against you by a third party because
              of what you downloaded.
            </p>
          </section>

          <section id="third-parties" aria-labelledby="third-parties-h">
            <h2 id="third-parties-h" className="font-display text-lg font-semibold text-white">
              5. Third-party platforms and trademarks
            </h2>
            <p className="mt-2">
              {SITE.name} is not affiliated with, endorsed by, or sponsored by YouTube, Google, Meta,
              Instagram, Facebook, TikTok, ByteDance, X Corp., Twitter, Vimeo, Dailymotion, Reddit, Twitch or TeraBox (Baidu).
              Names, brand marks and logos belong to their owners and appear here only to identify which links
              the resolver understands. Using this service does not exempt you from each platform’s terms of
              service.
            </p>
          </section>

          <section id="changes" aria-labelledby="changes-h">
            <h2 id="changes-h" className="font-display text-lg font-semibold text-white">
              6. Changes, suspension and governing terms
            </h2>
            <p className="mt-2">
              These terms may be updated at any time; the date at the top of this page reflects the current
              version. Continued use after a change constitutes acceptance of it. We may suspend or terminate
              access — including for a specific IP address — to protect the service, and we may remove support
              for a platform at any moment. If any clause proves unenforceable, the remaining clauses stay in
              force.
            </p>
          </section>

          <p className="rounded-xl border border-line bg-white/[0.02] p-4 text-xs text-white/55">
            This document is a plain-language template for a demonstration project, not legal advice. Replace it
            with counsel-reviewed terms before operating a public service commercially.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
