'use client'

/**
 * Browser-side capture helper. `posthog-js` is initialised once, before
 * hydration, by `instrumentation-client.ts`; components only ever import
 * `track` from here so a missing token (local dev, forks) costs nothing.
 */

import posthog from 'posthog-js'

import { analyticsEnabled, type EventName, type EventProperties } from './analytics'

/** Fire-and-forget custom event. Silently drops when PostHog is not configured. */
export function track(event: EventName, properties?: EventProperties): void {
  if (!analyticsEnabled || typeof window === 'undefined') return
  try {
    posthog.capture(event, properties)
  } catch {
    /* analytics must never break the product */
  }
}

/**
 * `&phd=<distinct_id>&phs=<session_id>` for navigations that cannot carry
 * headers (the hidden download iframe). The API reads them via
 * `identityFromRequest` so server events join the browser session.
 */
export function posthogIdentityParams(): string {
  if (!analyticsEnabled || typeof window === 'undefined') return ''
  try {
    const params = new URLSearchParams()
    const distinctId = posthog.get_distinct_id()
    const sessionId = posthog.get_session_id()
    if (distinctId) params.set('phd', distinctId)
    if (sessionId) params.set('phs', sessionId)
    const query = params.toString()
    return query ? `&${query}` : ''
  } catch {
    return ''
  }
}

/** Report a handled failure to PostHog error tracking with extra context. */
export function trackException(error: unknown, properties?: EventProperties): void {
  if (!analyticsEnabled || typeof window === 'undefined') return
  try {
    posthog.captureException(error, properties)
  } catch {
    /* ignore */
  }
}
