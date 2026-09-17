/**
 * POST /api/parse  ·  GET /api/parse?url=...
 *
 * Resolves a media URL into downloadable formats by shelling out to the
 * `yt-dlp` binary through `youtube-dl-exec` — no Express, no side-car server,
 * just a Next.js Route Handler.
 *
 * Responsibilities:
 *   1. hard input validation + SSRF/abuse guards (`lib/security.ts`)
 *   2. `yt-dlp -J` extraction with a wall-clock timeout and abort propagation
 *   3. format triage into 4K/1440p/1080p/720p/480p/360p/240p + MP3 (`lib/formats.ts`)
 *   4. a 15-minute LRU cache so repeat visitors never touch the binary
 *   5. a short-lived negative cache so one broken link cannot be hammered
 */

import { NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'

import { cacheKeyFor, cacheStats, formatTtl, parseCache } from '@/lib/cache'
import {
  buildParsePayload,
  cleanUpstreamError,
  mapExtractionError,
  type MappedError,
  type YtDlpVideo
} from '@/lib/formats'
import { EVENTS, hostOf } from '@/lib/analytics'
import { identityFromRequest, trackRateLimited, trackServer } from '@/lib/posthogServer'
import { clientKeyFromRequest, consumeRateLimit, validateMediaUrl } from '@/lib/security'
import { LIMITS } from '@/lib/site'
import { getPlatform } from '@/lib/platforms'
import { TeraboxError, buildTeraboxPayload } from '@/lib/terabox'
import type { ParseErrorResponse, ParsePayload, ParseResponse } from '@/lib/types'
import { ExtractionError, extractInfo, ffmpegAvailable } from '@/lib/ytdlp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
/** Keep this >= LIMITS.extractTimeoutMs when deploying to Vercel/Netlify. */
export const maxDuration = 60

const MAX_BODY_BYTES = 16_384
const MAX_PLAYLIST_ENTRIES = 8

interface NegativeEntry {
  code: ParseErrorResponse['code']
  message: string
  hint?: string
  status: number
}

/** Failures are cached briefly: they are expensive to produce and cheap to reuse. */
const negativeCache = new LRUCache<string, NegativeEntry>({ max: 2000, ttl: 45_000 })

const debugEnabled = process.env.NEXT_PUBLIC_DEBUG_CACHE === '1'

function baseHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    // The API must never be indexed, but the page that embeds it can be.
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    Vary: 'Accept-Encoding',
    ...extra
  }
}

/**
 * Maps a failure to an HTTP status the browser can reason about:
 * 4xx for "your link/source is the problem", 5xx for "our box is the problem".
 */
function statusForExtractionFailure(
  error: ExtractionError['code'],
  mapped: MappedError['code']
): number {
  if (error === 'TIMEOUT') return 504
  if (error === 'SERVER_UNAVAILABLE') return 503
  switch (mapped) {
    case 'UNAVAILABLE':
      return 422
    case 'GEOBLOCKED':
    case 'LOGIN_REQUIRED':
      return 403
    case 'TOO_MANY_REQUESTS':
      return 429
    case 'UNSUPPORTED_URL':
      return 415
    default:
      return 502
  }
}

function errorResponse(
  code: ParseErrorResponse['code'],
  message: string,
  status: number,
  startedAt: number,
  hint?: string,
  retryAfter?: number
): NextResponse {
  const body: ParseErrorResponse = {
    ok: false,
    code,
    message,
    ...(hint ? { hint } : {}),
    ...(retryAfter ? { retryAfter } : {}),
    cached: false,
    tookMs: Math.round(performance.now() - startedAt)
  }
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (retryAfter) headers['Retry-After'] = String(retryAfter)
  headers['X-Request-Duration-Ms'] = String(body.tookMs)
  return NextResponse.json(body, { status, headers: baseHeaders(headers) })
}

function successResponse(
  data: ParsePayload,
  cached: boolean,
  cacheKey: string,
  startedAt: number
): NextResponse {
  const body: ParseResponse = {
    ok: true,
    data,
    cached,
    tookMs: Math.round(performance.now() - startedAt)
  }
  const stats = cacheStats(cacheKey)
  const headers: Record<string, string> = {
    'X-Cache': cached ? 'HIT' : 'MISS',
    'X-Cache-Ttl': formatTtl(stats.remainingMs),
    'X-Entries': String(stats.size),
    'Cache-Control': `public, max-age=0, s-maxage=${data.cacheTtlSeconds}, stale-while-revalidate=120`
  }
  if (debugEnabled) {
    headers['X-Cache-Max'] = String(stats.max)
    headers['X-Qualities'] = data.availableQualities.join('|')
  }
  return NextResponse.json(body, { status: 200, headers: baseHeaders(headers) })
}

/** Analytics view of a successful payload — never the title or the URL itself. */
function extractionProps(payload: ParsePayload) {
  return {
    platform: payload.meta.platformId,
    source_host: hostOf(payload.meta.sourceUrl),
    extractor: payload.extractor,
    option_count: payload.options.length,
    max_quality: payload.maxQuality,
    available_qualities: payload.availableQualities,
    supports_mp3: payload.supportsMp3,
    muxed_max_height: payload.muxedMaxHeight,
    is_playlist: payload.meta.isPlaylist,
    playlist_count: payload.meta.playlistCount ?? null,
    is_live: payload.meta.isLive,
    age_restricted: payload.meta.isAgeRestricted,
    duration_seconds: payload.meta.durationSeconds ?? null
  }
}

type ReadParams =
  | { ok: true; url: string; playlistLimit?: number; refresh: boolean }
  | { ok: false; message: string }

/** Accepts JSON, form-encoded or query-string bodies so the endpoint is usable from curl. */
async function readParams(request: Request): Promise<ReadParams> {
  const url = new URL(request.url)
  const queryUrl = url.searchParams.get('url') ?? url.searchParams.get('q') ?? undefined
  const refresh =
    url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true'
  const playlistRaw = url.searchParams.get('playlist')
  const playlistLimit = playlistRaw ? Number(playlistRaw) : undefined

  if (request.method === 'GET') {
    if (!queryUrl) {
      return { ok: false, message: 'Add ?url=https://... to the request.' }
    }
    return {
      ok: true,
      url: queryUrl,
      refresh,
      playlistLimit: Number.isFinite(playlistLimit) ? playlistLimit : undefined
    }
  }

  const contentType = request.headers.get('content-type') ?? ''
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) {
    return { ok: false, message: `Request body must stay under ${MAX_BODY_BYTES} bytes.` }
  }

  let candidate: unknown = queryUrl
  try {
    if (contentType.includes('application/json')) {
      const text = await request.text()
      candidate = text.trim().length > 0 ? (JSON.parse(text) as Record<string, unknown>).url : queryUrl
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData()
      candidate = form.get('url') ?? queryUrl
    } else {
      const text = await request.text()
      if (text.trim().length > MAX_BODY_BYTES) {
        return { ok: false, message: `Request body must stay under ${MAX_BODY_BYTES} bytes.` }
      }
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>
        candidate = parsed.url ?? queryUrl
      } catch {
        candidate = text.trim() || queryUrl
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, message: 'Body must be JSON like {"url":"https://..." }.' }
    }
    return { ok: false, message: 'Could not read the request body.' }
  }

  if (typeof candidate !== 'string' || candidate.length === 0) {
    return { ok: false, message: 'Missing "url" field.' }
  }
  return {
    ok: true,
    url: candidate,
    refresh,
    playlistLimit: Number.isFinite(playlistLimit) ? playlistLimit : undefined
  }
}

/** Expands a playlist payload into "first entry + count" so the UI stays simple. */
function collapsePlaylist(raw: YtDlpVideo): { video: YtDlpVideo; entries: number | undefined } {
  const entries = Array.isArray(raw.entries) ? (raw.entries as YtDlpVideo[]) : undefined
  if (raw._type === 'playlist' && entries && entries.length > 0) {
    const [head] = entries
    const first = head ?? {}
    return {
      video: {
        ...first,
        playlist: raw.playlist ?? first.playlist,
        playlist_id: raw.playlist_id ?? first.playlist_id,
        // Keep the real total in `playlist_count` and drop `n_entries` so the
        // slice we actually fetched never masquerades as the full playlist.
        playlist_count: raw.playlist_count ?? raw.n_entries ?? entries.length,
        n_entries: undefined,
        _type: 'url'
      },
      entries: raw.playlist_count ?? raw.n_entries ?? entries.length
    }
  }
  return { video: raw, entries: undefined }
}

/**
 * Maps a native TeraBox failure onto the shared error contract, so the step-2
 * page can render it exactly like a yt-dlp failure.
 */
function statusForTeraboxFailure(error: TeraboxError): {
  code: ParseErrorResponse['code']
  status: number
  hint?: string
} {
  switch (error.code) {
    case 'INVALID_SHARE_URL':
      return { code: 'INVALID_URL', status: 400, hint: error.hint }
    case 'PASSWORD_REQUIRED':
      return { code: 'LOGIN_REQUIRED', status: 403, hint: error.hint }
    case 'REGION_BLOCKED':
      return { code: 'GEOBLOCKED', status: 403, hint: error.hint }
    case 'NOT_FOUND':
    case 'EMPTY_SHARE':
      return { code: 'UNAVAILABLE', status: 404, hint: error.hint }
    case 'VERIFICATION_REQUIRED':
    // TeraBox answered with something unmapped: worth a retry, never a "dead link".
    case 'UPSTREAM_ERROR':
      return { code: 'SERVER_UNAVAILABLE', status: 503, hint: error.hint }
    case 'TIMEOUT':
      return { code: 'TIMEOUT', status: 504, hint: error.hint }
    default:
      return { code: 'EXTRACTION_FAILED', status: 502, hint: error.hint }
  }
}

async function handleParse(request: Request): Promise<NextResponse> {
  const startedAt = performance.now()

  const params = await readParams(request)
  if (!params.ok) {
    return errorResponse('INVALID_URL', params.message, 400, startedAt, 'Send a POST body like {"url":"https://..."}.')
  }

  const clientKey = clientKeyFromRequest(request)
  const identity = identityFromRequest(request, clientKey)

  const validation = validateMediaUrl(params.url)
  if (!validation.ok) {
    const status = validation.error.code === 'UNSUPPORTED_URL' ? 415 : 400
    trackServer(request, identity, EVENTS.extractionFailed, {
      platform: 'unknown',
      source_host: hostOf(params.url),
      error_code: validation.error.code,
      error_message: validation.error.message,
      http_status: status,
      cached: false,
      took_ms: Math.round(performance.now() - startedAt)
    })
    return errorResponse(
      validation.error.code,
      validation.error.message,
      status,
      startedAt,
      validation.error.hint
    )
  }

  /** Tracked extraction failure; the outward-facing error is built separately. */
  const failed = (
    code: ParseErrorResponse['code'],
    message: string,
    status: number,
    extra: Record<string, string | number | boolean | null | undefined> = {}
  ) =>
    trackServer(request, identity, EVENTS.extractionFailed, {
      platform: validation.platformId ?? 'unknown',
      source_host: hostOf(validation.href),
      error_code: code,
      error_message: message,
      http_status: status,
      cached: false,
      took_ms: Math.round(performance.now() - startedAt),
      ...extra
    })

  const rate = consumeRateLimit('parse', clientKey, LIMITS.extractRequestsPerMinute)
  if (!rate.allowed) {
    trackRateLimited(request, identity, 'parse', rate.limit, rate.retryAfterSeconds)
    failed('RATE_LIMITED', 'rate limited', 429, { retry_after_seconds: rate.retryAfterSeconds })
    return errorResponse(
      'RATE_LIMITED',
      `You reached the limit of ${rate.limit} extractions per minute.`,
      429,
      startedAt,
      'Wait for the counter to reset — cached results are always instant.',
      rate.retryAfterSeconds
    )
  }

  const playlistLimit = params.playlistLimit
    ? Math.max(2, Math.min(MAX_PLAYLIST_ENTRIES, Math.trunc(params.playlistLimit)))
    : undefined
  const cacheKey = cacheKeyFor({ url: validation.href, playlistLimit })

  if (!params.refresh) {
    const cachedPayload = parseCache.get(cacheKey)
    if (cachedPayload) {
      if (debugEnabled) console.debug('[parse] cache hit', cacheKey)
      trackServer(request, identity, EVENTS.extractionCompleted, {
        ...extractionProps(cachedPayload),
        cached: true,
        took_ms: Math.round(performance.now() - startedAt)
      })
      return successResponse(cachedPayload, true, cacheKey, startedAt)
    }
    const cachedError = negativeCache.get(cacheKey)
    if (cachedError) {
      trackServer(request, identity, EVENTS.extractionFailed, {
        platform: validation.platformId ?? 'unknown',
        source_host: hostOf(validation.href),
        error_code: cachedError.code,
        error_message: cachedError.message,
        http_status: cachedError.status,
        cached: true,
        took_ms: Math.round(performance.now() - startedAt)
      })
      return errorResponse(cachedError.code, cachedError.message, cachedError.status, startedAt, cachedError.hint)
    }
  }

  const sourceUrl = validation.href

  try {
    let payload: ParsePayload

    if (validation.platformId === 'terabox') {
      // TeraBox links are *file shares*, not stream pages, and yt-dlp ships no
      // extractor for them — lib/terabox.ts resolves the share itself.
      payload = await buildTeraboxPayload(sourceUrl, {
        timeoutMs: Math.min(LIMITS.extractTimeoutMs, 30_000),
        signal: request.signal
      })
    } else {
      const raw = (await extractInfo(sourceUrl, {
        playlistLimit,
        timeoutMs: LIMITS.extractTimeoutMs,
        signal: request.signal
      })) as YtDlpVideo

      const hasFfmpeg = await ffmpegAvailable()
      const { video, entries } = collapsePlaylist(raw)
      payload = buildParsePayload(video, sourceUrl, {
        ffmpegAvailable: hasFfmpeg,
        playlistCount: entries
      })
    }

    if (payload.options.length === 0) {
      const negative: NegativeEntry = {
        code: 'UNAVAILABLE',
        message: 'That link resolved, but the platform exposed no downloadable stream.',
        hint: 'It is probably a live broadcast, a text post, or a story that already expired.',
        status: 422
      }
      negativeCache.set(cacheKey, negative)
      failed(negative.code, negative.message, negative.status)
      return errorResponse(
        negative.code,
        negative.message,
        negative.status,
        startedAt,
        negative.hint
      )
    }

    parseCache.set(cacheKey, payload, { ttl: LIMITS.cacheTtlMs })
    negativeCache.delete(cacheKey)

    trackServer(request, identity, EVENTS.extractionCompleted, {
      ...extractionProps(payload),
      cached: false,
      took_ms: Math.round(performance.now() - startedAt)
    })

    if (debugEnabled) {
      const platform = getPlatform(payload.meta.platformId)
      console.debug('[parse] ok', {
        platform: platform?.id ?? payload.meta.platformId,
        qualities: payload.availableQualities.join(','),
        options: payload.options.length
      })
    }

    return successResponse(payload, false, cacheKey, startedAt)
  } catch (error) {
    if (request.signal?.aborted) {
      // The visitor navigated away mid-extraction; nothing to report anywhere.
      failed('TIMEOUT', 'cancelled by client', 408, { aborted: true })
      return errorResponse('TIMEOUT', 'The request was cancelled before extraction finished.', 408, startedAt)
    }

    if (error instanceof TeraboxError) {
      const mapped = statusForTeraboxFailure(error)
      const transient =
        mapped.code === 'TIMEOUT' ||
        mapped.code === 'SERVER_UNAVAILABLE' ||
        mapped.code === 'RATE_LIMITED' ||
        mapped.code === 'TOO_MANY_REQUESTS'
      if (!transient) {
        const negative: NegativeEntry = {
          code: mapped.code,
          message: error.message,
          status: mapped.status,
          ...(mapped.hint ? { hint: mapped.hint } : {})
        }
        negativeCache.set(cacheKey, negative)
      }
      console.warn(
        `[parse] terabox ${error.code} for ${sourceUrl}: ${cleanUpstreamError(error.message, 220)}`
      )
      failed(mapped.code, error.message, mapped.status, { upstream_code: error.code })
      return errorResponse(
        mapped.code,
        error.message,
        mapped.status,
        startedAt,
        mapped.hint,
        mapped.code === 'SERVER_UNAVAILABLE' ? 30 : undefined
      )
    }

    if (error instanceof ExtractionError) {
      const timedOut = error.code === 'TIMEOUT'
      const mapped = mapExtractionError(error.stderr ?? error.message)
      const code: ParseErrorResponse['code'] = timedOut ? 'TIMEOUT' : mapped.code
      const status = statusForExtractionFailure(error.code, mapped.code)

      const negative: NegativeEntry = {
        code,
        message: timedOut ? error.message : mapped.message,
        ...(timedOut
          ? { hint: 'The source platform was too slow to answer. Try again in a few seconds.' }
          : mapped.hint
            ? { hint: mapped.hint }
            : {}),
        status
      }
      // Only cache *stable* failures. Caching a timeout or a "server busy"
      // response would keep answering 5xx for a link that may work seconds later.
      const transient =
        code === 'TIMEOUT' ||
        code === 'SERVER_UNAVAILABLE' ||
        (code as string) === 'RATE_LIMITED' ||
        code === 'TOO_MANY_REQUESTS'
      if (!transient) negativeCache.set(cacheKey, negative)

      // Keep the raw upstream text in the server log, never in the response.
      console.warn(
        `[parse] ${code} for ${sourceUrl}: ${cleanUpstreamError(error.stderr ?? error.message, 220)}`
      )
      failed(code, negative.message, status, {
        upstream_code: error.code,
        upstream_error: cleanUpstreamError(error.stderr ?? error.message, 220)
      })

      return errorResponse(
        code,
        negative.message,
        status,
        startedAt,
        negative.hint,
        status === 429 ? 60 : status === 503 ? 3 : undefined
      )
    }

    console.error('[parse] unexpected failure', error)
    failed('SERVER_UNAVAILABLE', (error as Error)?.message ?? 'unexpected failure', 500, { unexpected: true })
    return errorResponse(
      'SERVER_UNAVAILABLE',
      'The extraction worker hit an unexpected error.',
      500,
      startedAt,
      'Retry in a moment; if it persists, check the server logs.'
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleParse(request)
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleParse(request)
}
