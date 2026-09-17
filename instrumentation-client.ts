/**
 * Browser-side PostHog bootstrap.
 *
 * Next.js runs this file once per page load, after the HTML is parsed and
 * *before* React hydrates — so the SDK is ready before the first click and
 * the first `$pageview` is never lost. Everything the operator wants to see
 * in the PostHog dashboard is switched on here:
 *
 *   - `$pageview` / `$pageleave` for every App Router navigation
 *   - autocapture of clicks, form submits and inputs (values masked)
 *   - rage clicks, dead clicks, heatmaps, scroll depth
 *   - session replay (inputs masked, network timings + console logs kept)
 *   - web vitals (LCP, CLS, INP, FCP) and network performance
 *   - uncaught exceptions + unhandled rejections (error tracking)
 *   - the custom funnel events in `lib/analytics.ts` (`EVENTS`)
 *
 * Requests go to the first-party `/_d24/*` path that `next.config.ts` rewrites
 * to PostHog, so browser tracker blocklists do not drop the events.
 *
 * Nothing runs when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is unset.
 */

import posthog from 'posthog-js'

import { POSTHOG_HOST, POSTHOG_PROXY_PATH, POSTHOG_TOKEN, posthogUiHost } from '@/lib/analytics'

const isDev = process.env.NODE_ENV !== 'production'

if (POSTHOG_TOKEN) {
  try {
    posthog.init(POSTHOG_TOKEN, {
      // First-party ingestion path; `ui_host` keeps toolbar/deep links on posthog.com.
      api_host: POSTHOG_PROXY_PATH,
      ui_host: posthogUiHost(POSTHOG_HOST),
      // Opt into the current SDK default set (history_change pageviews, etc.).
      defaults: '2026-05-30',

      /* ------------------------------------------------ what to capture */
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: {
        // Never ship the pasted URL / any typed text; clicks + submits only.
        capture_copied_text: false,
        element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea', 'label']
      },
      rageclick: true,
      capture_dead_clicks: true,
      capture_heatmaps: true,
      // Web vitals + network timings show up in the performance tab of every session.
      capture_performance: { web_vitals: true, network_timing: true },
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: true
      },

      /* ------------------------------------------------ session replay */
      session_recording: {
        maskAllInputs: true,
        // Elements tagged `data-ph-mask` (e.g. the pasted link chip) render as blocks.
        maskTextSelector: '[data-ph-mask]',
        recordCrossOriginIframes: false
      },
      enable_recording_console_log: true,

      /* ------------------------------------------------ people & privacy */
      // Anonymous visitors get a device-level profile so funnels/retention work
      // without any login. There is no auth in this app, so nobody is identified.
      person_profiles: 'always',
      persistence: 'localStorage+cookie',
      // Adds X-POSTHOG-DISTINCT-ID / X-POSTHOG-SESSION-ID to our own API calls so
      // the server-side extraction/download events land on the same person and
      // session as the browser events (see lib/posthogServer.ts).
      tracing_headers: [window.location.hostname],

      /* ------------------------------------------------ housekeeping */
      debug: isDev,
      loaded: (client) => {
        client.register({
          app: 'download24',
          app_env: process.env.NODE_ENV ?? 'development',
          app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'
        })
      }
    })
  } catch (error) {
    if (isDev) console.warn('[posthog] init failed', error)
  }
}

/**
 * App Router navigation start. Complements the automatic `$pageview` (which is
 * emitted on completion) with the navigation *kind*, so back/forward traversals
 * and programmatic `router.replace` calls can be told apart in the dashboard.
 */
export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse'): void {
  if (!POSTHOG_TOKEN) return
  try {
    posthog.capture('$navigation_start', { url, navigation_type: navigationType })
  } catch {
    /* ignore */
  }
}
