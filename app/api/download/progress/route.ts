/**
 * GET /api/download/progress?id=<jobId>
 *
 * Live readout for an in-flight download. The download handler stamps the same
 * `id` onto its job registry entry (`lib/liveJobs.ts`) and updates it as
 * yt-dlp reports progress on stderr, so the step-3 page can animate a real
 * 0→100% while the bytes flow. Returns the latest snapshot without blocking;
 * the client polls it on an interval.
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
      percent: state.percent,
      totalBytes: state.totalBytes,
      speedBytesPerSec: state.speedBytesPerSec,
      receivedBytes: state.receivedBytes,
      fileName: state.fileName,
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
