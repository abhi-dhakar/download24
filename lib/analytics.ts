/**
 * PostHog wiring shared by the browser bundle and the server.
 *
 * One product-analytics project receives *everything*:
 *   - browser: pageviews, autocapture, session replay, heatmaps, web vitals,
 *     exceptions and the custom funnel events below (see
 *     `instrumentation-client.ts`);
 *   - server: extraction/download outcomes from the API routes and uncaught
 *     route errors (see `lib/posthogServer.ts` + `instrumentation.ts`).
 *
 * Every custom event name lives in `EVENTS` so the PostHog dashboards, the
 * client and the server never drift apart. Nothing is captured when
 * `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is unset, so a local checkout stays silent.
 */

/** Project token (`phc_…`), inlined at build time for the browser. */
export const POSTHOG_TOKEN: string | undefined =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || undefined

/**
 * Ingestion origin of the PostHog instance the project lives in. US Cloud is
 * the default; set `https://eu.i.posthog.com` for EU Cloud or your own origin
 * when self-hosting.
 */
export const POSTHOG_HOST: string = (
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'
).replace(/\/+$/, '')

/**
 * First-party path the browser SDK talks to. `proxy.ts` forwards it to
 * `POSTHOG_HOST`, so tracker blocklists (which key on the posthog.com domain)
 * never see the requests. Deliberately *not* named analytics/telemetry/posthog,
 * because path-based filter lists catch those too.
 */
export const POSTHOG_PROXY_PATH = '/_d24'

/** `https://us.i.posthog.com` → `https://us-assets.i.posthog.com` (SDK bundles, remote config). */
export function posthogAssetsHost(host: string = POSTHOG_HOST): string {
  return host.replace(/^https:\/\/(us|eu)\.i\.posthog\.com$/, 'https://$1-assets.i.posthog.com')
}

/** `https://us.i.posthog.com` → `https://us.posthog.com` (toolbar + deep links). */
export function posthogUiHost(host: string = POSTHOG_HOST): string {
  return host.replace(/^https:\/\/(us|eu)\.i\.posthog\.com$/, 'https://$1.posthog.com')
}

export const analyticsEnabled: boolean = Boolean(POSTHOG_TOKEN)

/**
 * Custom event catalogue. Property names follow PostHog's snake_case
 * convention so they read naturally next to the built-in `$pageview` etc.
 */
export const EVENTS = {
  /* ------------------------------------------------ step 1 · paste a link */
  /** A visitor submitted a link on the homepage / a platform page. */
  linkSubmitted: 'link_submitted',
  /** The link failed the client-side check (unsupported host, malformed…). */
  linkRejected: 'link_rejected',
  /** A recent-history entry was reused. */
  recentLinkReused: 'recent_link_reused',
  /** Local history was cleared. */
  recentHistoryCleared: 'recent_history_cleared',

  /* ------------------------------------------ step 2 · read the link (API) */
  /** Server: /api/parse resolved a link into download options. */
  extractionCompleted: 'extraction_completed',
  /** Server: /api/parse could not resolve the link. */
  extractionFailed: 'extraction_failed',
  /** Browser: the step-2 result card rendered (adds client latency + cache). */
  extractionViewed: 'extraction_viewed',
  /** Browser: the step-2 page showed an error state. */
  extractionErrorViewed: 'extraction_error_viewed',
  /** Browser: "Try again" / "Refresh formats" on step 2. */
  extractionRetried: 'extraction_retried',

  /* ---------------------------------------- step 3 · choose + download */
  /** Browser: a quality row was clicked (the conversion event). */
  qualitySelected: 'quality_selected',
  /** Browser: "Copy download link" on a quality row. */
  downloadLinkCopied: 'download_link_copied',
  /** Server: /api/download began delivering bytes (or issued a redirect). */
  downloadStarted: 'download_started',
  /** Server: the transfer to the browser ended cleanly. */
  downloadCompleted: 'download_completed',
  /** Server: /api/download refused or aborted the transfer. */
  downloadFailed: 'download_failed',
  /** Browser: step 3 reached its "saved" state. */
  downloadFinishedViewed: 'download_finished_viewed',
  /** Browser: step 3 rendered an error. */
  downloadErrorViewed: 'download_error_viewed',
  /** Browser: the visitor cancelled from step 3. */
  downloadCancelled: 'download_cancelled',
  /** Browser: "Save again" / "Retry download" on step 3. */
  downloadRetried: 'download_retried',

  /* ------------------------------------------------------------- misc */
  /** Server: a client hit a rate limit (parse or download). */
  rateLimited: 'rate_limited',
  themeToggled: 'theme_toggled',
  /** Browser: a FAQ entry was expanded. */
  faqOpened: 'faq_opened',
  /** Browser: the visitor landed on the 404 page. */
  notFoundViewed: 'not_found_viewed'
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

/** Property bag accepted by `track`; PostHog serialises anything JSON-ish. */
export type EventProperties = Record<string, string | number | boolean | null | undefined | string[]>

/** Hostname without `www.` for grouping links by source site. */
export function hostOf(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) return undefined
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return undefined
  }
}
