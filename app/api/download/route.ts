/**
 * GET /api/download?src=<media-url>&f=<optionId>[&a=mp3]
 *
 * Three delivery strategies, picked per preset so the browser always gets a
 * playable file:
 *
 *   1. `redirect` (opt-in, `DOWNLOAD_MODE=redirect`) — 302 straight to the
 *      upstream CDN URL for already-muxed sources. Zero server egress.
 *   2. **piped** — already-muxed single-stream sources: `yt-dlp` stdout is
 *      forwarded directly to the response. No disk, first byte fast.
 *   3. **prepared** — anything needing an ffmpeg merge (all modern YouTube
 *      360p+) or an MP3 transcode: written to a temp file first, because
 *      `yt-dlp` cannot post-process into a pipe, then streamed with a real
 *      `Content-Length` and deleted as soon as the transfer ends.
 *
 * Presets are always re-resolved by stream id (`-f f137+ba`) instead of
 * replaying a stored media URL, because signed CDN links expire in minutes.
 */

import { NextResponse } from 'next/server'

import { EVENTS, hostOf, type EventProperties } from '@/lib/analytics'
import { cacheKeyFor, parseCache } from '@/lib/cache'
import { failLiveJob, finishLiveJob, registerLiveJob, updateLiveJob } from '@/lib/liveJobs'
import { identityFromRequest, trackRateLimited, trackServer } from '@/lib/posthogServer'
import { parseYtDlpProgressLine } from '@/lib/progress'
import {
  buildParsePayload,
  cleanUpstreamError,
  type YtDlpFormat,
  type YtDlpVideo
} from '@/lib/formats'
import {
  acquireSlot,
  asciiFilename,
  clientKeyFromRequest,
  consumeRateLimit,
  isSafePublicMediaUrl,
  sanitizeFilename,
  validateMediaUrl
} from '@/lib/security'
import { DOWNLOAD_MODE, LIMITS } from '@/lib/site'
import {
  buildTeraboxPayload,
  forwardBody,
  isMediaExtension,
  openTeraboxFile,
  proxyBody,
  TeraboxError
} from '@/lib/terabox'
import type { DownloadOption, ParsePayload } from '@/lib/types'
import {
  canPipeDirectly,
  errorFromChildFailure,
  extractInfo,
  ffmpegAvailable,
  fileBody,
  prepareFile,
  removePreparedFile,
  startStreamJob,
  type PreparedFile
} from '@/lib/ytdlp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
/** Prepared 4K files can outlive 60s; raise this (or self-host) for big jobs. */
export const maxDuration = 300

/** Time we are willing to wait for the first byte before giving up. */
const STARTUP_BUDGET_MS = Number(process.env.YTDL_STARTUP_TIMEOUT_MS ?? 45_000)

const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  opus: 'audio/ogg',
  oga: 'audio/ogg'
}

function jsonError(message: string, status: number, hint?: string, code = 'DOWNLOAD_FAILED'): NextResponse {
  return NextResponse.json(
    { ok: false, code, message, ...(hint ? { hint } : {}) },
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    }
  )
}

function contentDisposition(filename: string): string {
  const ascii = asciiFilename(filename).replace(/[\r\n"]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function transferHeaders(
  filename: string,
  ext: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Disposition': contentDisposition(filename),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra
  }
}

function findRawFormat(raw: YtDlpVideo, formatId: string): YtDlpFormat | undefined {
  const wanted = String(formatId)
  return (raw.formats ?? []).find((format) => String(format.format_id) === wanted)
}

async function buildFreshPayload(sourceUrl: string, request: Request): Promise<ParsePayload> {
  const raw = (await extractInfo(sourceUrl, {
    timeoutMs: Math.min(LIMITS.extractTimeoutMs, STARTUP_BUDGET_MS),
    signal: request.signal
  })) as YtDlpVideo
  const hasFfmpeg = await ffmpegAvailable()
  return buildParsePayload(raw, sourceUrl, { ffmpegAvailable: hasFfmpeg })
}

/** Resolves the requested preset, with a tolerant fallback to the audio entry. */
function pickOption(
  payload: ParsePayload,
  requestedIndex: number,
  audioOnly: boolean
): DownloadOption | undefined {
  const exact = payload.options.find((option) => option.id === requestedIndex)
  if (exact && (!audioOnly || exact.kind === 'audio')) return exact
  if (audioOnly) return payload.options.find((option) => option.kind === 'audio')
  return undefined
}

/**
 * Best-effort lookup of a single-file upstream URL for `DOWNLOAD_MODE=redirect`.
 * Refuses anything that is not a public https URL, so a cached payload can
 * never be turned into an SSRF primitive.
 */
async function upstreamUrlFor(sourceUrl: string, option: DownloadOption): Promise<string | null> {
  try {
    const raw = (await extractInfo(sourceUrl, {
      timeoutMs: Math.min(LIMITS.extractTimeoutMs, 25_000)
    })) as YtDlpVideo
    const candidate = findRawFormat(raw, option.formatIds[0] ?? '')?.url
    if (!candidate || !isSafePublicMediaUrl(candidate)) return null
    return candidate
  } catch {
    return null
  }
}

/** Streams a finished temp file, deletes it, and frees the client's slot. */
function preparedResponse(
  prepared: PreparedFile,
  filename: string,
  option: DownloadOption,
  releaseSlot: () => void,
  jobId: string,
  finishJob: (fileName?: string) => void
): Response {
  return new Response(
    forwardBody(fileBody(prepared, releaseSlot), {
      onDone: () => finishJob(filename)
    }),
    {
      status: 200,
      headers: transferHeaders(filename, prepared.ext, {
        'Content-Length': String(prepared.size),
        'Accept-Ranges': 'none',
        'X-Download-Mode': 'prepared',
        'X-Job-Id': jobId,
        'X-Download-Prepare-Ms': String(prepared.elapsedMs),
        'X-Merged-Streams': option.needsMerge ? option.formatIds.join('+') : 'single',
        'X-Temp-File-Bytes': String(prepared.size)
      })
    }
  )
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const source = url.searchParams.get('src')
  const indexRaw = url.searchParams.get('f') ?? url.searchParams.get('option') ?? '0'
  const audioOnly =
    (url.searchParams.get('a') ?? '') === 'mp3' || url.searchParams.get('type') === 'audio'
  // The progress page generates its own id so it can poll before the response
  // arrives; `/api/download` echoes it back via `X-Job-Id` and registers the
  // live progress entry under it.
  const preferredJobId = url.searchParams.get('job') ?? url.searchParams.get('id')
  // The animated step-3 page needs a server stream: it both reports live
  // progress and forces `Content-Disposition: attachment`, which makes Chrome
  // run the download in its own download manager (visible while transferring).
  // `DOWNLOAD_MODE=redirect` stays in charge for direct links / curl, whose
  // callers get a plain 302 to the CDN.
  const forceStream = url.searchParams.get('mode') === 'stream'

  /* ------------------------------------------------------------ analytics */
  const requestStartedAt = Date.now()
  const clientKey = clientKeyFromRequest(request)
  const identity = identityFromRequest(request, clientKey)
  // Filled in as the request learns more (platform → option → delivery mode).
  const ctx: EventProperties = {
    source_host: hostOf(source),
    requested_index: indexRaw,
    mp3: audioOnly,
    force_stream: forceStream,
    from_progress_page: Boolean(preferredJobId)
  }
  let startedTracked = false
  const started = (mode: 'redirect' | 'terabox-cdn' | 'pipe' | 'prepared', extra: EventProperties = {}) => {
    startedTracked = true
    trackServer(request, identity, EVENTS.downloadStarted, {
      ...ctx,
      mode,
      setup_ms: Date.now() - requestStartedAt,
      ...extra
    })
  }
  /** Tracked failure + the JSON error body the browser renders. */
  const deny = (message: string, status: number, hint?: string, code = 'DOWNLOAD_FAILED'): NextResponse => {
    trackServer(request, identity, EVENTS.downloadFailed, {
      ...ctx,
      error_code: code,
      error_message: message,
      error_hint: hint,
      http_status: status,
      after_first_byte: startedTracked,
      elapsed_ms: Date.now() - requestStartedAt
    })
    return jsonError(message, status, hint, code)
  }

  const validation = validateMediaUrl(source)
  if (!validation.ok) return deny(validation.error.message, 400, validation.error.hint, validation.error.code)
  const sourceUrl = validation.href
  ctx.platform = validation.platformId ?? 'unknown'

  const requestedIndex = Number.parseInt(indexRaw, 10)
  if (!Number.isFinite(requestedIndex) || requestedIndex < 0 || requestedIndex > 500) {
    return deny('The format index is not valid.', 400, 'Re-run the extraction and use a download button.', 'INVALID_FORMAT')
  }

  const rate = consumeRateLimit('download', clientKey, LIMITS.downloadRequestsPerMinute)
  if (!rate.allowed) {
    trackRateLimited(request, identity, 'download', rate.limit, rate.retryAfterSeconds)
    return deny(
      `You reached the limit of ${rate.limit} downloads per minute.`,
      429,
      `Try again in ${rate.retryAfterSeconds}s.`,
      'RATE_LIMITED'
    )
  }

  const slot = acquireSlot('download', clientKey, LIMITS.downloadMaxConcurrentPerClient)
  if (!slot.acquired) {
    return deny(
      'You already have the maximum number of downloads in flight.',
      429,
      'Wait for the current download to finish before starting another one.',
      'CONCURRENCY_LIMIT'
    )
  }

  // The slot has to cover the whole transfer, not just this handler, so it is
  // released from the stream callbacks; `finally` only guards the early exits.
  let transferStarted = false
  let slotReleased = false
  const releaseSlot = () => {
    if (slotReleased) return
    slotReleased = true
    slot.release()
  }

  // Live progress entry for the whole job. Created before any extraction work
  // so the poller has something to read during the (long) prepare phase.
  const jobId = registerLiveJob(preferredJobId)
  let bytesDelivered: number | null = null
  const finishJob = (fileName?: string, outcome: 'completed' | 'client_cancelled' = 'completed') => {
    finishLiveJob(jobId, fileName)
    trackServer(request, identity, outcome === 'completed' ? EVENTS.downloadCompleted : EVENTS.downloadFailed, {
      ...ctx,
      ...(outcome === 'completed' ? {} : { error_code: 'CLIENT_CANCELLED', error_message: 'Transfer cancelled by the browser.' }),
      ext: fileName?.split('.').pop(),
      bytes_delivered: bytesDelivered,
      elapsed_ms: Date.now() - requestStartedAt
    })
  }
  /** Analytics view of the chosen preset — no title, no URL. */
  const describeOption = (option: DownloadOption) => {
    ctx.quality = option.tier
    ctx.quality_label = option.label
    ctx.kind = option.kind
    ctx.ext = option.ext
    ctx.needs_merge = option.needsMerge
    ctx.muxed = option.muxed
    ctx.size_bytes = option.bytes ?? null
  }

  try {
    const key = cacheKeyFor({ url: sourceUrl })

    /* ---------------------------------------------------------------------- */
    /* TeraBox — file shares, delivered by the native engine.                  */
    /* ---------------------------------------------------------------------- */
    if (validation.platformId === 'terabox') {
      let sharePayload = parseCache.get(key)
      if (!sharePayload) {
        sharePayload = await buildTeraboxPayload(sourceUrl, {
          timeoutMs: Math.min(LIMITS.extractTimeoutMs, 30_000),
          signal: request.signal
        })
        parseCache.set(key, sharePayload, { ttl: LIMITS.cacheTtlMs })
      }

      const shareOption = pickOption(sharePayload, requestedIndex, audioOnly)
      if (shareOption) describeOption(shareOption)
      if (!shareOption?.remoteFile) {
        failLiveJob(
          jobId,
          'That file is no longer part of the share.',
          'Run the extraction again to refresh the share contents.'
        )
        return deny(
          'That file is no longer part of the share.',
          410,
          'Run the extraction again to refresh the share contents.'
        )
      }

      // TeraBox hands out signed links that expire within minutes, so the file
      // is opened fresh on every click instead of replaying a cached URL.
      const opened = await openTeraboxFile(sourceUrl, shareOption.remoteFile, {
        signal: request.signal
      })
      const ext = opened.ext || shareOption.ext
      // TeraBox file names keep their own extension, so strip it before the
      // generic sanitiser runs (it only knows media containers and would let
      // `notes.pdf` through as `notes.pdf.pdf`).
      const rawName = shareOption.remoteFile.name || sharePayload.meta.title
      const stem = ext && rawName.toLowerCase().endsWith(`.${ext}`)
        ? rawName.slice(0, -(ext.length + 1))
        : rawName
      const baseName = sanitizeFilename(stem || sharePayload.meta.title, 'terabox-file')
      const finalName = `${baseName}.${ext}`

      if (!forceStream && DOWNLOAD_MODE === 'redirect' && isSafePublicMediaUrl(opened.finalUrl)) {
        void opened.response.body?.cancel().catch(() => {})
        updateLiveJob(jobId, { phase: 'redirect' })
        started('redirect', { size_bytes: opened.size ?? ctx.size_bytes })
        return NextResponse.redirect(opened.finalUrl, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store',
            'X-Download-Mode': 'redirect',
            'X-Job-Id': jobId,
            'X-Content-Type-Options': 'nosniff',
            'X-Robots-Tag': 'noindex, nofollow'
          }
        })
      }

      const upstreamBody = opened.response.body
      if (!upstreamBody) {
        void opened.response.body?.cancel().catch(() => {})
        failLiveJob(jobId, 'TeraBox returned an empty file.', 'Retry the download once.')
        return deny('TeraBox returned an empty file.', 502, 'Retry the download once.')
      }

      const knownSize = opened.size ?? undefined
      updateLiveJob(jobId, { phase: 'streaming' })

      transferStarted = true
      if (knownSize) bytesDelivered = knownSize
      started('terabox-cdn', { size_bytes: knownSize ?? null })
      return new Response(
        proxyBody(upstreamBody, {
          onSettled: releaseSlot,
          onDone: () => finishJob(finalName)
        }),
        {
          status: 200,
          headers: transferHeaders(finalName, ext, {
            'X-Download-Mode': 'terabox-cdn',
            'X-Job-Id': jobId,
            ...(knownSize ? { 'Content-Length': String(knownSize) } : {}),
            ...(isMediaExtension(ext) || !opened.contentType
              ? {}
              : { 'Content-Type': opened.contentType })
          })
        }
      )
    }

    const cached = parseCache.get(key)

    // Redirect mode needs live URLs, so it skips a potentially stale entry.
    // `forceStream` keeps the animated page on the proxied stream path.
    const wantsRedirect = DOWNLOAD_MODE === 'redirect' && !forceStream
    let payload: ParsePayload
    try {
      payload = !wantsRedirect && cached ? cached : await buildFreshPayload(sourceUrl, request)
    } catch (error) {
      if (cached) payload = cached
      else throw error
    }

    const option = pickOption(payload, requestedIndex, audioOnly)
    if (option) describeOption(option)
    ctx.platform = payload.meta.platformId
    ctx.is_playlist = payload.meta.isPlaylist
    ctx.duration_seconds = payload.meta.durationSeconds ?? null
    ctx.payload_cached = Boolean(cached) && payload === cached
    if (!option) {
      failLiveJob(
        jobId,
        'That quality is no longer offered for this link.',
        'Run the extraction again to refresh the available formats.'
      )
      return deny(
        'That quality is no longer offered for this link.',
        410,
        'Run the extraction again to refresh the available formats.'
      )
    }

    const baseName = sanitizeFilename(payload.meta.title, payload.meta.externalId || 'video')
    const firstEntryOnly = payload.meta.isPlaylist

    if (wantsRedirect && option.kind === 'video' && option.muxed) {
      const direct = await upstreamUrlFor(sourceUrl, option)
      if (direct) {
        updateLiveJob(jobId, { phase: 'redirect' })
        started('redirect')
        return NextResponse.redirect(direct, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store',
            'X-Download-Mode': 'redirect',
            'X-Job-Id': jobId,
            'X-Content-Type-Options': 'nosniff',
            'X-Robots-Tag': 'noindex, nofollow'
          }
        })
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Path A — genuinely muxed source: pipe stdout, no temp file.            */
    /* ---------------------------------------------------------------------- */
    if (canPipeDirectly(option)) {
      const job = startStreamJob(sourceUrl, option, {
        signal: request.signal,
        timeoutMs: LIMITS.downloadTimeoutMs,
        firstEntryOnly
      })

      const stdout = job.child.stdout
      let bytesSent = 0
      let startupSettled = false
      let startupError: string | null = null
      let resolveStartup!: () => void
      const startup = new Promise<void>((resolve) => {
        resolveStartup = resolve
      })
      const settleStartup = (error?: string | null) => {
        if (startupSettled) return
        startupSettled = true
        if (error) startupError = error
        resolveStartup()
      }

      /**
       * Polled live view for `/download/progress`, fed by yt-dlp's stderr.
       * Only the phase is recorded: while the source→server fetch is climbing
       * the job reads `downloading`, and the short tail after 100% (the flush
       * to the browser) reads `streaming`. No percentages or byte counts are
       * stored — step 3 renders no transfer telemetry.
       */
      const absorbProgressLine = (line: string) => {
        const update = parseYtDlpProgressLine(line)
        if (!update) return
        updateLiveJob(jobId, {
          phase: update.percent !== null && update.percent >= 99.5 ? 'streaming' : 'downloading'
        })
      }
      job.onProgress(absorbProgressLine)

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const onData = (chunk: Buffer) => {
            bytesSent += chunk.length
            controller.enqueue(new Uint8Array(chunk))
            settleStartup()
          }
          stdout.on('data', onData)
          stdout.once('error', (error: Error) => {
            settleStartup(error.message)
            controller.error(error)
            job.onProgress(null)
            job.dispose()
            releaseSlot()
          })
          job.child.once('close', (code) => {
            stdout.removeListener('data', onData)
            const clean = code === 0
            settleStartup(
              clean ? (bytesSent > 0 ? null : 'The source returned an empty file.') : errorFromChildFailure(job, code)
            )
            job.onProgress(null)
            if (clean) {
              bytesDelivered = bytesSent
              finishJob(`${baseName}.${option.ext}`)
              try {
                controller.close()
              } catch {
                /* already closed or errored */
              }
            } else {
              // Fail loudly: closing cleanly here would let the browser save a
              // truncated, unplayable file.
              controller.error(new Error(startupError ?? 'yt-dlp stopped before the file was complete.'))
            }
            job.dispose()
            releaseSlot()
          })
        },
        cancel() {
          // The visitor hit "Cancel" or closed the tab: stop paying for bytes.
          job.onProgress(null)
          job.dispose()
          bytesDelivered = bytesSent
          finishJob(`${baseName}.${option.ext}`, 'client_cancelled')
          releaseSlot()
        }
      })

      const timeout = setTimeout(() => {
        settleStartup('The source platform did not start sending data in time.')
      }, STARTUP_BUDGET_MS)

      await startup
      clearTimeout(timeout)

      if (bytesSent === 0) {
        job.dispose()
        const message = startupError ?? 'The download could not be started.'
        console.warn(`[download] pipe failure for ${sourceUrl}: ${cleanUpstreamError(message, 200)}`)
        failLiveJob(jobId, message, 'Try a lower resolution, or re-run the extraction first.')
        return deny(
          message,
          /did not start|timed out/i.test(message) ? 504 : 502,
          'Try a lower resolution, or re-run the extraction first.',
          /did not start|timed out/i.test(message) ? 'PIPE_TIMEOUT' : 'PIPE_FAILED'
        )
      }

      transferStarted = true
      started('pipe', { ytdlp_setup_ms: Date.now() - job.startedAt })
      return new Response(stream, {
        status: 200,
        headers: transferHeaders(`${baseName}.${option.ext}`, option.ext, {
          'X-Download-Mode': 'pipe',
          'X-Download-Setup-Ms': String(Date.now() - job.startedAt),
          'X-Job-Id': jobId,
          ...(option.sizeLabel ? { 'X-Size-Estimate': option.sizeLabel } : {})
        })
      })
    }

    /* ---------------------------------------------------------------------- */
    /* Path B — merge or transcode to a temp file, then stream it.            */
    /* ---------------------------------------------------------------------- */
    let prepared: PreparedFile
    try {
      prepared = await prepareFile(sourceUrl, option, {
        signal: request.signal,
        timeoutMs: LIMITS.downloadTimeoutMs,
        mergeOutputFormat:
          option.needsMerge && (option.ext === 'mp4' || option.ext === 'webm')
            ? option.ext
            : undefined,
        firstEntryOnly,
        onProgress: (line) => {
          const update = parseYtDlpProgressLine(line)
          if (!update) return
          // yt-dlp downloads first; a follow-up `[Merger]` state is not a
          // `[download]` line, so once the download hits 100% the job reads
          // `processing` for the merge/transcode that follows.
          updateLiveJob(jobId, {
            phase: update.percent !== null && update.percent >= 99.5 ? 'processing' : 'downloading'
          })
        }
      })
    } catch (error) {
      const err = error as { message?: string; code?: string }
      const message =
        err?.code === 'TIMEOUT'
          ? 'Preparing that file took too long and was stopped.'
          : 'The server could not finish preparing this file.'
      const hint = /ffmpeg/i.test(err?.message ?? '')
        ? 'This host needs ffmpeg installed for merged video and MP3 output.'
        : 'Try a lower resolution, or re-run the extraction first.'
      console.warn(`[download] prepare failure for ${sourceUrl}: ${cleanUpstreamError(err?.message, 200)}`)
      failLiveJob(jobId, message, hint)
      return deny(
        message,
        err?.code === 'TIMEOUT' ? 504 : err?.code === 'SERVER_UNAVAILABLE' ? 503 : 502,
        hint,
        err?.code === 'TIMEOUT' ? 'PREPARE_TIMEOUT' : 'PREPARE_FAILED'
      )
    }

    // If the visitor walked away while we were preparing, drop the file and
    // free the slot *before* marking the transfer as started.
    if (request.signal?.aborted) {
      await removePreparedFile(prepared.path)
      failLiveJob(jobId, 'The download was cancelled before it could start.')
      return deny('The download was cancelled before it could start.', 408, undefined, 'CLIENT_CANCELLED')
    }

    // yt-dlp may legitimately fall back to another container (mixed codecs), so
    // the name follows the file we actually produced.
    const filename = `${baseName}.${prepared.ext}`
    transferStarted = true
    bytesDelivered = prepared.size
    started('prepared', {
      prepare_ms: prepared.elapsedMs,
      size_bytes: prepared.size,
      merged_streams: option.needsMerge ? option.formatIds.join('+') : 'single'
    })

    return preparedResponse(prepared, filename, option, releaseSlot, jobId, finishJob)
  } catch (error) {
    if (error instanceof TeraboxError) {
      console.warn(`[download] terabox ${error.code} for ${sourceUrl}: ${cleanUpstreamError(error.message, 200)}`)
      failLiveJob(jobId, error.message, error.hint)
      return deny(
        error.message,
        error.code === 'VERIFICATION_REQUIRED' || error.code === 'UPSTREAM_ERROR'
          ? 503
          : error.code === 'TIMEOUT'
            ? 504
            : 502,
        error.hint,
        `TERABOX_${error.code}`
      )
    }

    const err = error as { message?: string; stderr?: string }
    const message = err?.stderr || err?.message || 'Download failed.'
    const hint = cleanUpstreamError(message, 200)
    console.error('[download] error', cleanUpstreamError(message, 240))
    failLiveJob(jobId, 'The download could not be completed.', hint)
    return deny(
      'The download could not be completed.',
      /ffmpeg/i.test(message) ? 503 : 502,
      hint
    )
  } finally {
    if (!transferStarted) releaseSlot()
  }
}
