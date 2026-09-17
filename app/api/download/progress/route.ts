/**
 * GET /api/download/progress?id=<jobId>
 *
 * Phase readout for an in-flight download. The download handler stamps the same
 * `id` onto its job registry entry (`lib/liveJobs.ts`) and updates the phase as
 * the transfer moves along, so the step-3 page knows when the file has finished
 * (or failed) — the browser gives a hidden iframe no completion event.
 *
 * Deliberately telemetry-free: no percentage, no byte counters, no speed, no
 * ETA. Step 3 renders the selected file, an indeterminate animation and plain
 * instructions, so this endpoint answers one question — "what phase is it in?".
 * Returns the latest snapshot without blocking; the client polls on an interval.
 */

import { NextResponse } from 'next/server'

import { readLiveJob } from '@/lib/liveJobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export function GET(request: Request): Response {
  const id = new URL(request.url).searchParams.get('id') ?? ''

  const state = id ? readLiveJob(id) : null
  if (!state) {
    // Unknown or already-expired job: the caller's own stream is the source of
    // truth, so this just tells it there is nothing more to read.
    return NextResponse.json(
      { ok: true, gone: true, phase: 'finished' },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow'
        }
      }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      jobId: state.jobId,
      phase: state.phase,
      ...(state.fileName ? { fileName: state.fileName } : {}),
      ...(state.errorMessage
        ? { errorMessage: state.errorMessage, errorHint: state.errorHint }
        : {})
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    }
  )
}
