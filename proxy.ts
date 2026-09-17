/**
 * Request proxy. Two jobs:
 *
 * 1. First-party reverse proxy for PostHog. The browser SDK is configured with
 *    `api_host: '/_d24'`, so every capture, replay chunk, flag poll and SDK
 *    asset request hits *this* origin and is forwarded to the PostHog
 *    ingestion host here — out of reach of domain-based tracker blocklists.
 *
 *      /_d24/static/*  → <region>-assets.i.posthog.com/static/*   (SDK bundles)
 *      /_d24/array/*   → <region>-assets.i.posthog.com/array/*    (remote config)
 *      /_d24/*         → <region>.i.posthog.com/*                 (events, replay, flags)
 *
 * 2. Trailing-slash canonicalisation. PostHog's endpoints end in a slash
 *    (`/e/`, `/s/`), so `next.config.ts` sets `skipTrailingSlashRedirect`.
 *    That would leave every page reachable at both `/faq` and `/faq/`; the
 *    308 below restores the single canonical form for everything else.
 *
 * The `matcher` must stay a literal so Next.js can analyse it at build time;
 * keep the prefix in sync with `POSTHOG_PROXY_PATH` in `lib/analytics.ts`.
 */

import { NextResponse, type NextRequest } from 'next/server'

import { POSTHOG_HOST, POSTHOG_PROXY_PATH, posthogAssetsHost } from '@/lib/analytics'

function forwardToPosthog(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  const relative = url.pathname.slice(POSTHOG_PROXY_PATH.length) || '/'
  const isAsset = relative.startsWith('/static/') || relative.startsWith('/array/')
  const target = new URL(isAsset ? posthogAssetsHost(POSTHOG_HOST) : POSTHOG_HOST)

  url.protocol = target.protocol
  url.hostname = target.hostname
  url.port = target.port
  url.pathname = relative

  const headers = new Headers(request.headers)
  headers.set('host', target.hostname)
  // PostHog needs none of our first-party state; keep it on this origin.
  headers.delete('cookie')
  headers.delete('authorization')

  return NextResponse.rewrite(url, { request: { headers } })
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (pathname === POSTHOG_PROXY_PATH || pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)) {
    return forwardToPosthog(request)
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    // Plain URL on purpose: NextURL re-normalises the pathname and would
    // hand the trailing slash straight back (an infinite 308 loop).
    const url = new URL(request.url)
    url.pathname = pathname.replace(/\/+$/, '')
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/_d24/:path*',
    // Pages only: skip Next internals, API routes and anything with a file extension.
    '/((?!_next/|api/|_d24/|.*\\..*).*)'
  ]
}
