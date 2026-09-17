/**
 * /admin/hogql · raw HogQL runner.
 *
 * "Full PostHog data" in its most direct form: any read-only query over the
 * project's tables (events, persons, session_replays, …) with results as a
 * plain table. The query executes on the server in app/api/admin/hogql —
 * the personal API key never reaches the browser, non-SELECT statements are
 * rejected, and the route is rate-limited like every other admin surface.
 */

import type { Metadata } from 'next'

import { posthogApiStatus } from '@/lib/posthogApi'

import { HogqlRunner } from '@/components/admin/HogqlRunner'
import { PosthogSetupNotice } from '@/components/admin/AdminSetupNotice'

export const metadata: Metadata = { title: 'SQL' }

export const dynamic = 'force-dynamic'

export default async function AdminHogqlPage() {
  const status = posthogApiStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-white">HogQL</h1>
        <p className="mt-0.5 text-xs text-white/40">
          PostHog&apos;s SQL dialect against this project&apos;s tables — <code>events</code>, <code>persons</code>,{' '}
          <code>person_distinct_ids</code>, <code>session_replays</code> and more
        </p>
      </div>

      {status.ready ? (
        <HogqlRunner />
      ) : (
        <div className="mx-auto max-w-2xl">
          <PosthogSetupNotice missing={status.missing} />
        </div>
      )}
    </div>
  )
}
