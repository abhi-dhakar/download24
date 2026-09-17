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

import { cacheKeyFor, parseCache } from '@/lib/cache'
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
  releaseSlot: () => void
): Response {
  return new Response(fileBody(prepared, releaseSlot), {
    status: 200,
    headers: transferHeaders(filename, prepared.ext, {
      'Content-Length': String(prepared.size),
      'Accept-Ranges': 'none',
      'X-Download-Mode': 'prepared',
      'X-Download-Prepare-Ms': String(prepared.elapsedMs),
      'X-Merged-Streams': option.needsMerge ? option.formatIds.join('+') : 'single',
      'X-Temp-File-Bytes': String(prepared.size)
    })
  })
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const source = url.searchParams.get('src')
  const indexRaw = url.searchParams.get('f') ?? url.searchParams.get('option') ?? '0'
  const audioOnly =
    (url.searchParams.get('a') ?? '') === 'mp3' || url.searchParams.get('type') === 'audio'

  const validation = validateMediaUrl(source)
  if (!validation.ok) return jsonError(validation.error.message, 400, validation.error.hint)
  const sourceUrl = validation.href

  const requestedIndex = Number.parseInt(indexRaw, 10)
  if (!Number.isFinite(requestedIndex) || requestedIndex < 0 || requestedIndex > 500) {
    return jsonError('The format index is not valid.', 400, 'Re-run the extraction and use a download button.')
  }

  const clientKey = clientKeyFromRequest(request)
  const rate = consumeRateLimit('download', clientKey, LIMITS.downloadRequestsPerMinute)
  if (!rate.allowed) {
    return jsonError(
      `You reached the limit of ${rate.limit} downloads per minute.`,
      429,
      `Try again in ${rate.retryAfterSeconds}s.`
    )
  }

  const slot = acquireSlot('download', clientKey, LIMITS.downloadMaxConcurrentPerClient)
  if (!slot.acquired) {
    return jsonError(
      'You already have the maximum number of downloads in flight.',
      429,
      'Wait for the current download to finish before starting another one.'
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
      if (!shareOption?.remoteFile) {
        return jsonError(
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

      if (DOWNLOAD_MODE === 'redirect' && isSafePublicMediaUrl(opened.finalUrl)) {
        void opened.response.body?.cancel().catch(() => {})
        return NextResponse.redirect(opened.finalUrl, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store',
            'X-Download-Mode': 'redirect',
            'X-Content-Type-Options': 'nosniff',
            'X-Robots-Tag': 'noindex, nofollow'
          }
        })
      }

      const upstreamBody = opened.response.body
      if (!upstreamBody) {
        void opened.response.body?.cancel().catch(() => {})
        return jsonError('TeraBox returned an empty file.', 502, 'Retry the download once.')
      }

      transferStarted = true
      return new Response(proxyBody(upstreamBody, releaseSlot), {
        status: 200,
        headers: transferHeaders(`${baseName}.${ext}`, ext, {
          'X-Download-Mode': 'terabox-cdn',
          ...(opened.size ? { 'Content-Length': String(opened.size) } : {}),
          ...(isMediaExtension(ext) || !opened.contentType
            ? {}
            : { 'Content-Type': opened.contentType })
        })
      })
    }

    const cached = parseCache.get(key)

    // Redirect mode needs live URLs, so it skips a potentially stale entry.
    const wantsRedirect = DOWNLOAD_MODE === 'redirect'
    let payload: ParsePayload
    try {
      payload = !wantsRedirect && cached ? cached : await buildFreshPayload(sourceUrl, request)
    } catch (error) {
      if (cached) payload = cached
      else throw error
    }

    const option = pickOption(payload, requestedIndex, audioOnly)
    if (!option) {
      return jsonError(
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
        return NextResponse.redirect(direct, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store',
            'X-Download-Mode': 'redirect',
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
            job.dispose()
            releaseSlot()
          })
          job.child.once('close', (code) => {
            stdout.removeListener('data', onData)
            const clean = code === 0
            settleStartup(
              clean ? (bytesSent > 0 ? null : 'The source returned an empty file.') : errorFromChildFailure(job, code)
            )
            if (clean) {
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
          job.dispose()
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
        return jsonError(
          message,
          /did not start|timed out/i.test(message) ? 504 : 502,
          'Try a lower resolution, or re-run the extraction first.'
        )
      }

      transferStarted = true
      return new Response(stream, {
        status: 200,
        headers: transferHeaders(`${baseName}.${option.ext}`, option.ext, {
          'X-Download-Mode': 'pipe',
          'X-Download-Setup-Ms': String(Date.now() - job.startedAt),
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
        firstEntryOnly
      })
    } catch (error) {
      const err = error as { message?: string; code?: string }
      console.warn(`[download] prepare failure for ${sourceUrl}: ${cleanUpstreamError(err?.message, 200)}`)
      return jsonError(
        err?.code === 'TIMEOUT'
          ? 'Preparing that file took too long and was stopped.'
          : 'The server could not finish preparing this file.',
        err?.code === 'TIMEOUT' ? 504 : err?.code === 'SERVER_UNAVAILABLE' ? 503 : 502,
        /ffmpeg/i.test(err?.message ?? '')
          ? 'This host needs ffmpeg installed for merged video and MP3 output.'
          : 'Try a lower resolution, or re-run the extraction first.'
      )
    }

    // If the visitor walked away while we were preparing, drop the file and
    // free the slot *before* marking the transfer as started.
    if (request.signal?.aborted) {
      await removePreparedFile(prepared.path)
      return jsonError('The download was cancelled before it could start.', 408)
    }

    // yt-dlp may legitimately fall back to another container (mixed codecs), so
    // the name follows the file we actually produced.
    const filename = `${baseName}.${prepared.ext}`
    transferStarted = true

    return preparedResponse(prepared, filename, option, releaseSlot)
  } catch (error) {
    if (error instanceof TeraboxError) {
      console.warn(`[download] terabox ${error.code} for ${sourceUrl}: ${cleanUpstreamError(error.message, 200)}`)
      return jsonError(
        error.message,
        error.code === 'VERIFICATION_REQUIRED' ? 503 : error.code === 'TIMEOUT' ? 504 : 502,
        error.hint
      )
    }

    const err = error as { message?: string; stderr?: string }
    const message = err?.stderr || err?.message || 'Download failed.'
    console.error('[download] error', cleanUpstreamError(message, 240))
    return jsonError(
      'The download could not be completed.',
      /ffmpeg/i.test(message) ? 503 : 502,
      cleanUpstreamError(message, 200)
    )
  } finally {
    if (!transferStarted) releaseSlot()
  }
}
