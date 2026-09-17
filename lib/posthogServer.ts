/**
 * Server-side PostHog client for the API routes and `instrumentation.ts`.
 *
 * Why a server client at all: the interesting outcomes — did the extraction
 * succeed, which platform, how long did yt-dlp take, did the transfer finish —
 * are only known inside `/api/parse` and `/api/download`. Capturing them here
 * means the dashboard shows the *real* success rate, not what the browser
 * managed to report before the tab closed.
 *
 * Attribution: the browser SDK adds `X-POSTHOG-DISTINCT-ID` /
 * `X-POSTHOG-SESSION-ID` headers to same-origin fetches (`tracing_headers`),
 * and step 3 passes them as query params on the iframe download URL. Both are
 * read by `identityFromRequest`, so server events sit on the same person and
 * session replay as the clicks that caused them. Without them (curl, direct
 * links) the event is filed under a hashed client key instead.
 *
 * The client is a lazily created process singleton; the Node runtime of a
 * self-hosted `next start` / `node server.js` lives long enough that batching
 * (`flushAt: 20`, `flushInterval: 10s`) is fine, and `shutdown` is hooked on
 * SIGTERM so the last batch still leaves the box.
 */

import 'server-only'

import { PostHog } from 'posthog-node'

import { EVENTS, POSTHOG_HOST, POSTHOG_TOKEN, type EventName, type EventProperties } from './analytics'

const isProduction = process.env.NODE_ENV === 'production'

declare global {
  // Survives dev-server module re-evaluation without leaking clients.
  var __download24Posthog: PostHog | undefined
}

/** Returns the shared client, or `null` when PostHog is not configured. */
export function posthogServer(): PostHog | null {
  if (!POSTHOG_TOKEN) return null
  if (globalThis.__download24Posthog) return globalThis.__download24Posthog

  const client = new PostHog(POSTHOG_TOKEN, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10_000,
    // Server errors are reported explicitly from instrumentation.ts.
    enableExceptionAutocapture: false,
    disableGeoip: false
  })
  client.on('error', (error: unknown) => {
    if (!isProduction) console.warn('[posthog] server capture failed', error)
  })

  const drain = () => {
    void client.shutdown(2_000).catch(() => {})
  }
  process.once('SIGTERM', drain)
  process.once('SIGINT', drain)
  process.once('beforeExit', drain)

  globalThis.__download24Posthog = client
  return client
}

/** Who the event belongs to, derived from what the browser sent along. */
export interface RequestIdentity {
  distinctId: string
  sessionId?: string
  /** True when the browser SDK supplied its own ids (vs. a hashed fallback). */
  linked: boolean
}

const ID_PATTERN = /^[A-Za-z0-9_.:-]{6,128}$/

function readId(request: Request, header: string, query: string): string | undefined {
  const fromHeader = request.headers.get(header)?.trim()
  if (fromHeader && ID_PATTERN.test(fromHeader)) return fromHeader
  try {
    const fromQuery = new URL(request.url).searchParams.get(query)?.trim()
    if (fromQuery && ID_PATTERN.test(fromQuery)) return fromQuery
  } catch {
    /* unparsable URL */
  }
  return undefined
}

/**
 * Resolves the PostHog identity for an incoming API request. `fallbackKey` is
 * the hashed client key the rate limiter already computes, so anonymous API
 * callers still aggregate per device rather than per request.
 */
export function identityFromRequest(request: Request, fallbackKey: string): RequestIdentity {
  const distinctId = readId(request, 'x-posthog-distinct-id', 'phd')
  const sessionId = readId(request, 'x-posthog-session-id', 'phs')
  if (distinctId) return { distinctId, sessionId, linked: true }
  return { distinctId: `server:${fallbackKey}`, sessionId, linked: false }
}

/** Request metadata every server event carries. */
function requestContext(request: Request): EventProperties {
  const referer = request.headers.get('referer') ?? undefined
  const userAgent = request.headers.get('user-agent') ?? undefined
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  return {
    $current_url: referer,
    $referrer: referer,
    $lib: 'download24-server',
    $useragent: userAgent,
    ...(ip ? { $ip: ip } : {}),
    // Cloudflare / Vercel style geo headers when a proxy adds them.
    $geoip_country_code: request.headers.get('cf-ipcountry') ?? request.headers.get('x-vercel-ip-country') ?? undefined
  }
}

/**
 * Capture a server-side event. Never throws and never awaits the network —
 * the route handler must not get slower because analytics is on.
 */
export function trackServer(
  request: Request,
  identity: RequestIdentity,
  event: EventName,
  properties: EventProperties = {}
): void {
  const client = posthogServer()
  if (!client) return
  try {
    client.capture({
      distinctId: identity.distinctId,
      event,
      properties: {
        ...requestContext(request),
        ...(identity.sessionId ? { $session_id: identity.sessionId } : {}),
        identity_linked: identity.linked,
        ...properties
      }
    })
  } catch (error) {
    if (!isProduction) console.warn('[posthog] capture threw', error)
  }
}

/** Server-side exception with request context (used by instrumentation.ts). */
export function captureServerException(
  error: unknown,
  distinctId: string,
  properties: EventProperties = {}
): void {
  const client = posthogServer()
  if (!client) return
  try {
    client.captureException(error, distinctId, properties)
  } catch {
    /* ignore */
  }
}

/** Shortcut for the two rate-limit sites so their property names stay aligned. */
export function trackRateLimited(
  request: Request,
  identity: RequestIdentity,
  scope: 'parse' | 'download',
  limit: number,
  retryAfterSeconds: number
): void {
  trackServer(request, identity, EVENTS.rateLimited, { scope, limit, retry_after_seconds: retryAfterSeconds })
}
