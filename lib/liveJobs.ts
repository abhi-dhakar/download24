/**
 * In-memory registry of in-flight download jobs, so the progress page can poll
 * `/api/download/progress?id=…` and learn **what phase** a transfer is in —
 * starting, downloading, merging, streaming, finished or failed.
 *
 * It holds no transfer telemetry on purpose: no percentage, no byte counter, no
 * speed, no ETA. Step 3 shows an indeterminate animation and instructions, so
 * the only thing it needs from here is the phase (and the final file name),
 * which is also the sole completion signal a hidden-iframe download offers.
 *
 * The download route registers an entry keyed by a **client-supplied** job id
 * (a query param on `/api/download`), then updates the phase as yt-dlp reports
 * progress on stderr (`lib/progress.ts` turns those lines into a percentage
 * the route thresholds into a phase). Only the two route handlers import this
 * module; media bytes are never copied here.
 *
 * Works on a single self-hosted Node process (the Dockerfile runs
 * `node server.js`). On multi-instance hosts the download request and its polls
 * should be pinned to the same instance (sticky sessions) for the phase feed —
 * the download itself is unaffected either way.
 */

import { randomUUID } from 'node:crypto'

/**
 * Lifecycle the UI renders from. `downloading` covers the source→server hop,
 * `processing` the merge/transcode, `streaming` the server→browser hop,
 * `redirect` a `DOWNLOAD_MODE=redirect` hand-off whose transfer we cannot
 * observe, and `finished` a completed transfer.
 */
export type LiveJobPhase =
  | 'starting'
  | 'downloading'
  | 'processing'
  | 'streaming'
  | 'redirect'
  | 'finished'
  | 'failed'

export interface LiveJobState {
  jobId: string
  phase: LiveJobPhase
  /** Final download name (from Content-Disposition); known once delivery starts. */
  fileName?: string
  /** Present when the job ended in an error the UI should render. */
  errorMessage?: string
  errorHint?: string
  updatedAt: number
}

const jobs = new Map<string, LiveJobState>()
/** Entries older than this are stale leftovers from crashed/aborted requests. */
const MAX_AGE_MS = 10 * 60_000
/** Acceptable client-supplied job ids: random-looking tokens only. */
const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

function prune(): void {
  const cutoff = Date.now() - MAX_AGE_MS
  for (const [id, entry] of jobs) {
    if (entry.updatedAt < cutoff) jobs.delete(id)
  }
}

/**
 * Registers a new job and returns the key to poll it with. When the client
 * supplies its own token (the progress page generates one so it can poll
 * *before* the download response arrives), it is validated and used verbatim;
 * otherwise a fresh id is minted.
 */
export function registerLiveJob(preferredId?: string | null): string {
  prune()
  const jobId = preferredId && JOB_ID_PATTERN.test(preferredId) ? preferredId : randomUUID()
  jobs.set(jobId, { jobId, phase: 'starting', updatedAt: Date.now() })
  return jobId
}

export function updateLiveJob(
  jobId: string,
  patch: Partial<Pick<LiveJobState, 'phase' | 'fileName' | 'errorMessage' | 'errorHint'>>
): void {
  const entry = jobs.get(jobId)
  if (!entry) return
  // Skip undefined values so a partial update can never erase a field a
  // previous call already filled in.
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    ;(entry as unknown as Record<string, unknown>)[key] = value
  }
  entry.updatedAt = Date.now()
}

/** Records a failure so the progress poller can show the message. */
export function failLiveJob(
  jobId: string,
  errorMessage: string,
  errorHint?: string,
  fileName?: string
): void {
  updateLiveJob(jobId, {
    phase: 'failed',
    errorMessage,
    ...(errorHint ? { errorHint } : {}),
    ...(fileName ? { fileName } : {})
  })
}

/** Marks a job done and drops it shortly after so late polls read a clean state. */
export function finishLiveJob(jobId: string, fileName?: string): void {
  updateLiveJob(jobId, { phase: 'finished', ...(fileName ? { fileName } : {}) })
  const timer = setTimeout(() => jobs.delete(jobId), 20_000)
  timer.unref?.()
}

export function readLiveJob(jobId: string): LiveJobState | null {
  const entry = jobs.get(jobId)
  if (!entry) return null
  if (Date.now() - entry.updatedAt > MAX_AGE_MS) {
    jobs.delete(jobId)
    return null
  }
  return entry
}
