/**
 * Native TeraBox share engine.
 *
 * `yt-dlp` ships **no** TeraBox extractor (verified against 2026.08), so this
 * module implements the public share flow itself — the same three steps the
 * official web player performs, with no third-party service in the middle:
 *
 *   1. `GET https://<host>/s/<surl>`            → share page HTML + cookies
 *   2. scrape `jsToken` / `dp-logid` / `bdstoken` from that HTML
 *   3. `GET /share/list?shorturl=<surl>&root=1` → JSON file list (with `dlink`)
 *   4. `GET <dlink>`                            → 302 → signed CDN URL
 *
 * Folders are walked recursively (`root=0&dir=/folder`) up to
 * `TERABOX_MAX_DEPTH` levels / `TERABOX_MAX_FILES` files so a share link that
 * wraps a whole folder still resolves into one entry per file.
 *
 * Operator knobs (all optional, see `.env.example`):
 *   - `TERABOX_COOKIE`        `ndus` token, a `k=v; k=v` header or JSON — needed
 *                             when TeraBox asks datacenter IPs for verification;
 *   - `TERABOX_RESOLVE_PROXY` optional resolver proxy (`?mode=resolve&surl=…`
 *                             contract) used first when the host is blocked;
 *   - `TERABOX_USER_AGENT`    override the browser UA sent upstream.
 *
 * Nothing here trusts the extracted page: every URL that we later fetch or
 * redirect a browser to is re-checked against the SSRF guard in
 * `lib/security.ts`.
 */

import { formatBytes, formatDuration } from './formats'
import { getPlatform } from './platforms'
import { isPrivateHost } from './security'
import { LIMITS } from './site'
import {
  QUALITY_ORDER,
  type DownloadOption,
  type DownloadTag,
  type ParsePayload,
  type QualityTier,
  type VideoMeta
} from './types'

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const APP_ID = '250528'

/** Browser UA matters: the share page renders a bot wall for unknown clients. */
const USER_AGENT =
  process.env.TERABOX_USER_AGENT?.trim() ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * API origins tried in order after the share host itself. TeraBox mirrors share
 * one backend cluster, so a mirror link normally resolves on the canonical host.
 */
const API_FALLBACK_HOSTS = [
  'www.terabox.com',
  'www.terabox.app',
  'www.1024terabox.com',
  'www.teraboxshare.com',
  'www.4funbox.com'
]

const VIDEO_EXTS = new Set([
  'mp4',
  'mkv',
  'mov',
  'webm',
  'avi',
  'flv',
  'm4v',
  'wmv',
  'mpg',
  'mpeg',
  'ts',
  'm2ts',
  '3gp',
  'ogv',
  'rmvb'
])

const AUDIO_EXTS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'wma', 'ape'])

/** Containers the browser can play inline; anything else gets a neutral chip. */
const KNOWN_EXTS = new Set<string>([...VIDEO_EXTS, ...AUDIO_EXTS])

const clamp = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min

const MAX_FILES = clamp(Number(process.env.TERABOX_MAX_FILES ?? 60), 1, 300)
const MAX_FOLDER_DEPTH = clamp(Number(process.env.TERABOX_MAX_DEPTH ?? 2), 0, 5)
const PAGE_TIMEOUT_MS = clamp(Number(process.env.TERABOX_TIMEOUT_MS ?? 20_000), 2_000, 60_000)

/* -------------------------------------------------------------------------- */
/*                                   Errors                                   */
/* -------------------------------------------------------------------------- */

export type TeraboxErrorCode =
  | 'INVALID_SHARE_URL'
  | 'PAGE_UNREACHABLE'
  | 'VERIFICATION_REQUIRED'
  | 'PASSWORD_REQUIRED'
  | 'REGION_BLOCKED'
  | 'EMPTY_SHARE'
  | 'NOT_FOUND'
  | 'TIMEOUT'

export class TeraboxError extends Error {
  readonly code: TeraboxErrorCode
  readonly hint?: string

  constructor(code: TeraboxErrorCode, message: string, hint?: string) {
    super(message)
    this.name = 'TeraboxError'
    this.code = code
    this.hint = hint
  }
}

/* -------------------------------------------------------------------------- */
/*                              URL + token parsing                           */
/* -------------------------------------------------------------------------- */

/**
 * TeraBox short share ids are published as `/s/1AbCdEf…` where the leading `1`
 * is a routing marker, *not* part of the id, while legacy links carry the bare
 * id in `?surl=`. Everything downstream (and the TeraBox API itself) wants the
 * bare id.
 */
export function teraboxSurlFrom(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  const fromQuery = url.searchParams.get('surl')
  if (fromQuery) return cleanSurl(fromQuery)

  const match = url.pathname.match(/\/s\/([A-Za-z0-9_-]+)/)
  if (match?.[1]) return cleanSurl(match[1])

  return null
}

function cleanSurl(value: string): string | null {
  const trimmed = value.trim().replace(/[/?#]+$/, '')
  if (!trimmed) return null
  // `1AbCdEf` (new short link) and `AbCdEf` (legacy `?surl=`) are the same share.
  return trimmed.length > 8 && trimmed.startsWith('1') ? trimmed.slice(1) : trimmed
}

interface PageTokens {
  jsToken?: string
  dpLogId?: string
  bdToken?: string
  thumbnail?: string
  title?: string
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Pulls the anti-bot tokens out of the share page HTML (several page skins exist). */
export function extractTeraboxTokens(html: string): PageTokens {
  const tokens: PageTokens = {}

  const jsTokenPatterns = [
    /fn%28%22([A-Za-z0-9_%.-]+)%22%29/,
    /jsToken["'\\\s:=]+([A-Za-z0-9_-]{8,})/i,
    /window\.jsToken\s*=\s*["'`]([^"'`]+)/
  ]
  for (const pattern of jsTokenPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      tokens.jsToken = decode(match[1])
      break
    }
  }

  const logId = html.match(/(?:dp-logid=|"dp-logid"\s*:\s*"?)(\d{6,})/)
  if (logId?.[1]) tokens.dpLogId = logId[1]

  const bdToken = html.match(/bdstoken["'\\\s:=]+([A-Za-z0-9_-]{8,})/i)
  if (bdToken?.[1]) tokens.bdToken = bdToken[1]

  const thumb =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/og:image["']\s+content=["']([^"']+)["']/i)
  if (thumb?.[1]) tokens.thumbnail = thumb[1].replace(/&amp;/g, '&')

  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/"title"\s*:\s*"([^"]{1,200})"/)
  if (title?.[1]) tokens.title = decode(title[1]).replace(/&amp;/g, '&')

  return tokens
}

/* -------------------------------------------------------------------------- */
/*                                  Cookies                                   */
/* -------------------------------------------------------------------------- */

type CookieJar = Map<string, string>

/**
 * Accepts the three shapes operators actually paste into `TERABOX_COOKIE`:
 * a bare `ndus` token, a `k=v; k=v` Cookie header, or a JSON object.
 */
export function parseTeraboxCookies(raw: string | undefined): CookieJar {
  const jar: CookieJar = new Map()
  const value = raw?.trim()
  if (!value) return jar

  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry !== null && entry !== undefined) jar.set(key, String(entry))
      }
      return jar
    } catch {
      /* fall through to the header parser */
    }
  }

  if (value.includes('=')) {
    for (const part of value.split(';')) {
      const index = part.indexOf('=')
      if (index > 0) jar.set(part.slice(0, index).trim(), part.slice(index + 1).trim())
    }
    return jar
  }

  jar.set('ndus', value)
  return jar
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
}

/** Persists `Set-Cookie` headers so the token-scraped session stays consistent. */
function absorbCookies(response: Response, jar: CookieJar): void {
  const lines =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  for (const line of lines) {
    const [pair] = line.split(';')
    if (!pair) continue
    const index = pair.indexOf('=')
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (!value || /^(deleted|expired)$/i.test(value)) jar.delete(name)
    else jar.set(name, value)
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Fetching                                 */
/* -------------------------------------------------------------------------- */

function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const present = signals.filter((signal): signal is AbortSignal => Boolean(signal))
  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(present)

  // Node < 20.3 fallback: a shim that mirrors the first signal to abort.
  const controller = new AbortController()
  for (const signal of present) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

function timeoutSignal(ms: number, signal?: AbortSignal): AbortSignal | undefined {
  return anySignal([typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined, signal])
}

function browserHeaders(jar: CookieJar, referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  }
  const cookies = cookieHeader(jar)
  if (cookies) headers.Cookie = cookies
  if (referer) headers.Referer = referer
  return headers
}

async function fetchHtml(
  url: string,
  jar: CookieJar,
  timeoutMs: number,
  signal?: AbortSignal,
  referer?: string
): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: browserHeaders(jar, referer),
      redirect: 'follow',
      cache: 'no-store',
      signal: timeoutSignal(timeoutMs, signal)
    })
  } catch (error) {
    throw new TeraboxError(
      'PAGE_UNREACHABLE',
      'TeraBox did not answer the share page request.',
      describeNetworkError(error)
    )
  }

  absorbCookies(response, jar)

  if (!response.ok) {
    throw new TeraboxError(
      response.status === 404 ? 'NOT_FOUND' : 'PAGE_UNREACHABLE',
      `TeraBox returned HTTP ${response.status} for that share link.`,
      response.status === 404 ? 'Double-check the link — expired shares stop working.' : undefined
    )
  }

  const html = await response.text().catch(() => '')
  if (!html) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'TeraBox returned an empty share page.')
  }
  return html
}

function describeNetworkError(error: unknown): string | undefined {
  const name = (error as { name?: string })?.name
  if (name === 'TimeoutError') {
    return 'The TeraBox request timed out. Retry in a moment.'
  }
  if (name === 'AbortError') return undefined
  const code = (error as { cause?: { code?: string } })?.cause?.code ?? (error as { code?: string })?.code
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'This server could not resolve the TeraBox host.'
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return 'The connection to TeraBox was reset — often a blocked datacenter IP.'
  }
  return undefined
}

/* -------------------------------------------------------------------------- */
/*                              Share resolution                              */
/* -------------------------------------------------------------------------- */

export interface TeraboxFile {
  /** Path inside the share, e.g. `/folder/clip.mp4` (the API's `path`). */
  path: string
  name: string
  size: number
  isDir: boolean
  fsId?: string
  md5?: string
  thumb?: string
  category?: number
  /** Video dimensions, when the API reports them (the web player relies on them). */
  width?: number
  height?: number
  durationSeconds?: number
  dlink?: string
}

export interface TeraboxShare {
  surl: string
  sourceUrl: string
  /** Share page URL, reused as the `Referer` when fetching the media. */
  pageUrl: string
  apiBase: string
  cookies: string
  title: string
  thumbnail?: string
  files: TeraboxFile[]
  /** True when the listing was produced with an operator-supplied cookie. */
  authenticated: boolean
  /** True when a resolver proxy produced the listing. */
  viaProxy: boolean
  warning?: string
}

export interface TeraboxResolveOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

interface RawListEntry {
  fs_id?: number | string
  isdir?: number | string
  server_filename?: string
  filename?: string
  path?: string
  size?: number | string
  md5?: string
  dlink?: string
  category?: number | string
  width?: number | string
  height?: number | string
  duration?: number | string
  thumbs?: { url3?: string; url2?: string; url1?: string; icon?: string }
}

/** TeraBox reports most numeric fields as strings on some mirrors. */
const positiveNumber = (value: number | string | undefined): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * API origins to try, most likely first: an explicit override, then the share
 * page's own origin (scheme, host **and** port), then the canonical mirrors.
 */
function apiCandidates(pageUrl: string): string[] {
  const configured = process.env.TERABOX_API_BASE?.trim()
  let fromPage: string | undefined
  try {
    fromPage = new URL(pageUrl).origin
  } catch {
    fromPage = undefined
  }
  const candidates = [configured, fromPage, ...API_FALLBACK_HOSTS].filter(
    (entry): entry is string => Boolean(entry)
  )
  return [...new Set(candidates)].map((entry) =>
    entry.startsWith('http') ? entry.replace(/\/+$/, '') : `https://${entry.replace(/^www\./, 'www.')}`
  )
}

function safeHost(rawUrl: string): string | undefined {
  try {
    return new URL(rawUrl).hostname
  } catch {
    return undefined
  }
}

function sharePageUrl(rawUrl: string, surl: string): string {
  try {
    const url = new URL(rawUrl)
    url.hash = ''
    // Legacy links (`/sharing/link?surl=…`) are normalised to the `/s/1<id>`
    // form the share page expects; the `1` is the routing marker cleanSurl
    // strips, so this is its exact inverse.
    if (!/\/s\//.test(url.pathname)) {
      url.pathname = `/s/1${surl}`
      url.searchParams.delete('surl')
      url.searchParams.delete('t')
    }
    return url.toString()
  } catch {
    return `https://www.terabox.com/s/1${surl}`
  }
}

/**
 * Resolves a share link into its file list.
 *
 * Extracted media URLs are *never* replayed from cache: `dlink`s are signed and
 * expire within minutes, so callers re-resolve right before downloading.
 */
export async function resolveTeraboxShare(
  rawUrl: string,
  options: TeraboxResolveOptions = {}
): Promise<TeraboxShare> {
  const surl = teraboxSurlFrom(rawUrl)
  if (!surl) {
    throw new TeraboxError(
      'INVALID_SHARE_URL',
      'That does not look like a TeraBox share link.',
      'Paste a link shaped like https://www.terabox.com/s/1AbCdEf… — the one the TeraBox app shares.'
    )
  }

  const timeoutMs = options.timeoutMs ?? PAGE_TIMEOUT_MS
  const firstJar = parseTeraboxCookies(process.env.TERABOX_COOKIE)
  // TeraBox answers a stale/invalid cookie with a verification wall, so an
  // anonymous retry is attempted whenever operator cookies are configured.
  const jars: CookieJar[] = firstJar.size > 0 ? [firstJar, new Map()] : [firstJar]

  const proxy = process.env.TERABOX_RESOLVE_PROXY?.trim()
  if (proxy) {
    try {
      return await resolveViaProxy(rawUrl, surl, proxy, timeoutMs, options.signal)
    } catch (error) {
      if (error instanceof TeraboxError && (error.code === 'INVALID_SHARE_URL' || error.code === 'TIMEOUT')) {
        throw error
      }
      // A dead proxy must never be worse than no proxy: fall through to direct.
    }
  }

  let lastError: TeraboxError | null = null

  for (const jar of jars) {
    try {
      return await resolveDirect(rawUrl, surl, jar, timeoutMs, options.signal)
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      lastError = error
      // Only a verification wall is worth retrying with a different cookie jar.
      if (error.code !== 'VERIFICATION_REQUIRED') throw error
    }
  }

  throw lastError ?? new TeraboxError('PAGE_UNREACHABLE', 'TeraBox could not be reached.')
}

async function resolveDirect(
  rawUrl: string,
  surl: string,
  jar: CookieJar,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<TeraboxShare> {
  const pageUrl = sharePageUrl(rawUrl, surl)

  let html = await fetchHtml(pageUrl, jar, timeoutMs, signal)
  let tokens = extractTeraboxTokens(html)

  // Some mirrors only inject `jsToken` into the mobile listing page.
  if (!tokens.jsToken) {
    const wapUrl = `https://${safeHost(pageUrl) ?? 'www.terabox.com'}/wap/share/filelist?surl=${encodeURIComponent(surl)}`
    const wapHtml = await fetchHtml(wapUrl, jar, timeoutMs, signal, pageUrl).catch(() => null)
    if (wapHtml) {
      const wapTokens = extractTeraboxTokens(wapHtml)
      tokens = { ...wapTokens, ...tokens }
      if (Object.keys(tokens).length > 0) html = wapHtml
    }
  }

  const context = { timeoutMs, signal, pageUrl }
  const bases = apiCandidates(pageUrl)
  const errors: TeraboxError[] = []
  const tokenless = !tokens.jsToken && !tokens.bdToken

  const finish = async (result: ListResult): Promise<TeraboxShare> => {
    const files = await collectFiles(result.apiBase, surl, tokens, jar, result.entries, context)
    const media = files.filter((file) => !file.isDir)
    if (files.length === 0) {
      throw new TeraboxError(
        'EMPTY_SHARE',
        'That share link resolved to an empty folder.',
        'Open the link in a browser to confirm the sender did not move or delete the files.'
      )
    }
    if (media.length === 0) {
      throw new TeraboxError(
        'EMPTY_SHARE',
        'That share only contains folders this server could not open.',
        'Nested folders need a TeraBox session — set TERABOX_COOKIE (an `ndus` value from a logged-in account) and retry.'
      )
    }
    const single = media[0]
    return {
      surl,
      sourceUrl: rawUrl,
      pageUrl,
      apiBase: result.apiBase,
      cookies: cookieHeader(jar),
      title: truncateTitle(result.title ?? single?.name ?? `TeraBox share ${surl}`),
      thumbnail: tokens.thumbnail ?? single?.thumb,
      files,
      authenticated: jar.size > 0,
      viaProxy: false,
      warning:
        media.length >= MAX_FILES
          ? `Showing the first ${MAX_FILES} files of this share. Open it in TeraBox to see the rest.`
          : undefined
    }
  }

  const run = async (attempt: () => Promise<ListResult>): Promise<TeraboxShare | null> => {
    try {
      return await finish(await attempt())
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      errors.push(error)
      // These mean "ask the sender for a new link" — retrying other mirrors or
      // endpoints cannot help, so they stop the sweep immediately.
      const fatal = ['NOT_FOUND', 'PASSWORD_REQUIRED', 'REGION_BLOCKED']
      if (fatal.includes(error.code)) throw error
      return null
    }
  }

  // The endpoint the TeraBox web player itself calls; it wants `jsToken`.
  if (!tokenless) {
    for (const base of bases) {
      const share = await run(() => fetchShareList(base, surl, tokens, jar, context))
      if (share) return share
    }
  }

  // `/api/shorturlinfo` is the older JSON endpoint and still answers on several
  // mirrors without any token, so it backs up both the token-less page case and
  // a verification wall on `/share/list`.
  const retryTokenless = tokenless || errors.some((error) => error.code !== 'EMPTY_SHARE')
  if (retryTokenless) {
    for (const base of bases) {
      const share = await run(() => fetchShortUrlInfo(base, surl, jar, context))
      if (share) return share
    }
  }

  throw (
    errors.find((error) => error.code === 'EMPTY_SHARE') ??
    errors[0] ??
    new TeraboxError(
      'VERIFICATION_REQUIRED',
      'TeraBox served a verification page instead of the share.',
      'Set TERABOX_COOKIE (an `ndus` value from a logged-in browser) on the server, or retry in a few minutes.'
    )
  )
}

interface ListResult {
  entries: RawListEntry[]
  apiBase: string
  title?: string
}

async function fetchShareList(
  base: string,
  surl: string,
  tokens: PageTokens,
  jar: CookieJar,
  context: { timeoutMs: number; signal?: AbortSignal; pageUrl: string; dir?: string }
): Promise<ListResult> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    web: '1',
    channel: '0',
    page: '1',
    num: '100',
    by: 'name',
    order: 'asc',
    shorturl: surl,
    root: context.dir ? '0' : '1'
  })
  if (context.dir) params.set('dir', context.dir)
  if (tokens.jsToken) params.set('jsToken', tokens.jsToken)
  if (tokens.dpLogId) params.set('dp-logid', tokens.dpLogId)

  const endpoint = `${base}/share/list?${params.toString()}`
  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: {
        ...browserHeaders(jar, context.pageUrl),
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: timeoutSignal(context.timeoutMs, context.signal)
    })
  } catch (error) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'The TeraBox file list request failed.', describeNetworkError(error))
  }

  absorbCookies(response, jar)

  if (!response.ok) {
    throw new TeraboxError('PAGE_UNREACHABLE', `TeraBox returned HTTP ${response.status} for the file list.`)
  }

  const raw = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { list?: RawListEntry[] })
    | null
  if (!raw) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'TeraBox returned an unreadable file list.')
  }

  const errno = Number(raw.errno ?? 0)
  if (errno !== 0) {
    throw mapErrno(errno, typeof raw.errmsg === 'string' ? raw.errmsg : undefined)
  }

  return {
    entries: Array.isArray(raw.list) ? raw.list : [],
    apiBase: base,
    title: typeof raw.title === 'string' ? raw.title.replace(/^\//, '') : undefined
  }
}

/**
 * Older/share-agnostic listing endpoint (`/api/shorturlinfo`). It returns the
 * root of the share as `file_list` and, unlike `/share/list`, usually accepts an
 * anonymous request — the fallback when the page carries no `jsToken`.
 */
async function fetchShortUrlInfo(
  base: string,
  surl: string,
  jar: CookieJar,
  context: { timeoutMs: number; signal?: AbortSignal; pageUrl: string }
): Promise<ListResult> {
  const params = new URLSearchParams({ shorturl: surl, root: '1', app_id: APP_ID })
  const endpoint = `${base}/api/shorturlinfo?${params.toString()}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: {
        ...browserHeaders(jar, context.pageUrl),
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: timeoutSignal(context.timeoutMs, context.signal)
    })
  } catch (error) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'The TeraBox share info request failed.', describeNetworkError(error))
  }

  absorbCookies(response, jar)
  if (!response.ok) {
    throw new TeraboxError('PAGE_UNREACHABLE', `TeraBox returned HTTP ${response.status} for the share info.`)
  }

  const raw = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { file_list?: RawListEntry[]; list?: RawListEntry[] })
    | null
  if (!raw) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'TeraBox returned unreadable share info.')
  }

  const errno = Number(raw.errno ?? 0)
  if (errno !== 0) {
    throw mapErrno(errno, typeof raw.errmsg === 'string' ? raw.errmsg : undefined)
  }

  const entries = Array.isArray(raw.file_list) ? raw.file_list : Array.isArray(raw.list) ? raw.list : []
  const shareId = raw.share_id ?? raw.shareid
  return {
    entries,
    apiBase: base,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.replace(/^\//, '')
        : shareId !== undefined
          ? `TeraBox share ${String(shareId)}`
          : undefined
  }
}

function mapErrno(errno: number, errmsg?: string): TeraboxError {
  switch (errno) {
    case -6:
    case 4000020:
    case 400141:
      return new TeraboxError(
        'VERIFICATION_REQUIRED',
        'TeraBox asked this server for a verification step before releasing the file list.',
        'Add TERABOX_COOKIE (`ndus` from a logged-in TeraBox browser session) to the server environment, then retry.'
      )
    case 9000:
      return new TeraboxError(
        'REGION_BLOCKED',
        'TeraBox is not available from this server’s region.',
        'TeraBox blocks a number of datacenter regions — deploy the app in another region or route through a resolver proxy.'
      )
    case -9:
    case -62:
    case 115:
    case 130:
      return new TeraboxError(
        'NOT_FOUND',
        'That share link is expired, deleted or private.',
        'Ask the sender for a fresh TeraBox link.'
      )
    default: {
      const suffix = errmsg ? ` (${errmsg.replace(/[<>]/g, '')})` : ''
      return new TeraboxError(
        'NOT_FOUND',
        `TeraBox rejected the share list${suffix}.`,
        'Confirm the link still opens in a browser.'
      )
    }
  }
}

async function collectFiles(
  apiBase: string,
  surl: string,
  tokens: PageTokens,
  jar: CookieJar,
  rootEntries: RawListEntry[],
  context: { timeoutMs: number; signal?: AbortSignal; pageUrl: string }
): Promise<TeraboxFile[]> {
  const files: TeraboxFile[] = []
  const queue: Array<{ entries: RawListEntry[]; depth: number }> = [
    { entries: rootEntries, depth: 0 }
  ]

  while (queue.length > 0 && files.length < MAX_FILES) {
    const current = queue.shift()
    if (!current) break

    for (const entry of current.entries) {
      if (files.length >= MAX_FILES) break
      const file = toFile(entry, apiBase)
      if (!file) continue
      files.push(file)

      if (file.isDir && current.depth < MAX_FOLDER_DEPTH) {
        const nested = await fetchShareList(apiBase, surl, tokens, jar, {
          timeoutMs: context.timeoutMs,
          signal: context.signal,
          pageUrl: context.pageUrl,
          dir: file.path
        }).catch(() => null)
        if (nested && nested.entries.length > 0) {
          queue.push({ entries: nested.entries, depth: current.depth + 1 })
        }
      }
    }
  }

  return files
}

function toFile(entry: RawListEntry, apiBase: string): TeraboxFile | null {
  const name = String(entry.server_filename ?? entry.filename ?? '').trim()
  if (!name) return null
  const path = String(entry.path ?? `/${name}`).trim() || `/${name}`
  const size = Number(entry.size ?? 0)
  const rawDlink = typeof entry.dlink === 'string' ? entry.dlink.replace(/&amp;/g, '&').trim() : ''
  let dlink: string | undefined
  if (rawDlink) {
    try {
      dlink = new URL(rawDlink, apiBase).toString()
    } catch {
      dlink = undefined
    }
  }

  return {
    path,
    name,
    size: Number.isFinite(size) && size > 0 ? size : 0,
    isDir: Number(entry.isdir ?? 0) === 1,
    fsId: entry.fs_id !== undefined ? String(entry.fs_id) : undefined,
    md5: typeof entry.md5 === 'string' ? entry.md5 : undefined,
    thumb: entry.thumbs?.url3 ?? entry.thumbs?.url2 ?? entry.thumbs?.url1,
    category: Number.isFinite(Number(entry.category)) ? Number(entry.category) : undefined,
    width: positiveNumber(entry.width),
    height: positiveNumber(entry.height),
    durationSeconds: positiveNumber(entry.duration),
    dlink
  }
}

/* -------------------------------------------------------------------------- */
/*                        Optional resolver-proxy escape hatch                 */
/* -------------------------------------------------------------------------- */

/**
 * Some hosting regions are hard-blocked by TeraBox regardless of cookies. When
 * `TERABOX_RESOLVE_PROXY` is set we ask that service first; it must answer the
 * documented `mode=resolve` contract and any URL it returns is still handed to
 * the same SSRF/public-host guard.
 */
async function resolveViaProxy(
  rawUrl: string,
  surl: string,
  proxy: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<TeraboxShare> {
  const endpoint = new URL(proxy)
  endpoint.searchParams.set('mode', 'resolve')
  endpoint.searchParams.set('surl', surl)
  endpoint.searchParams.set('raw', '1')

  let response: Response
  try {
    response = await fetch(endpoint.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: timeoutSignal(timeoutMs, signal)
    })
  } catch (error) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'The configured TeraBox resolver proxy did not answer.', describeNetworkError(error))
  }

  if (!response.ok) {
    throw new TeraboxError('PAGE_UNREACHABLE', `The TeraBox resolver proxy returned HTTP ${response.status}.`)
  }

  const data = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & {
        upstream?: Record<string, unknown>
        files?: Array<Record<string, unknown>>
        list?: RawListEntry[]
      })
    | null
  if (!data) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'The TeraBox resolver proxy returned an unreadable payload.')
  }

  const upstream = (data.upstream ?? data) as Record<string, unknown> & { list?: RawListEntry[] }
  const errno = Number(upstream.errno ?? 0)
  if (errno !== 0) throw mapErrno(errno, typeof upstream.errmsg === 'string' ? upstream.errmsg : undefined)

  const pageUrl = sharePageUrl(rawUrl, surl)
  const apiBase = `https://${safeHost(pageUrl) ?? 'www.terabox.com'}`

  let files: TeraboxFile[] = []
  if (Array.isArray(upstream.list)) {
    files = upstream.list.map((entry) => toFile(entry, apiBase)).filter((file): file is TeraboxFile => Boolean(file))
  } else if (Array.isArray(data.files)) {
    files = data.files
      .map((entry): TeraboxFile | null => {
        const name = String(entry.filename ?? entry.name ?? '').trim()
        if (!name) return null
        return {
          path: String(entry.path ?? `/${name}`),
          name,
          size: Number(entry.size ?? 0) || 0,
          isDir: false,
          dlink: typeof entry.download_url === 'string' ? entry.download_url : undefined,
          thumb: typeof entry.thumbnail === 'string' ? entry.thumbnail : undefined
        }
      })
      .filter((file): file is TeraboxFile => file !== null)
  }

  if (files.length === 0) {
    throw new TeraboxError('EMPTY_SHARE', 'The resolver proxy returned no files for that share.')
  }

  const media = files.filter((file) => !file.isDir)
  return {
    surl,
    sourceUrl: rawUrl,
    pageUrl,
    apiBase,
    cookies: cookieHeader(parseTeraboxCookies(process.env.TERABOX_COOKIE)),
    title: truncateTitle(String(upstream.title ?? media[0]?.name ?? `TeraBox share ${surl}`).replace(/^\//, '')),
    thumbnail: media[0]?.thumb,
    files,
    authenticated: false,
    viaProxy: true
  }
}

/* -------------------------------------------------------------------------- */
/*                             Payload construction                           */
/* -------------------------------------------------------------------------- */

/**
 * `1080p`, `4k`, `720P`… inside the file name are the only resolution hints a
 * TeraBox share gives us, and a wrong chip is worse than a neutral one, so each
 * pattern is anchored on non-digits to avoid matching `10800` or `7201`.
 */
const HEIGHT_HINTS: Array<[RegExp, QualityTier]> = [
  [/(?:^|[^0-9])(?:2160p?|4k|uhd)(?![0-9])/i, '2160'],
  [/(?:^|[^0-9])(?:1440p?|2k|qhd)(?![0-9])/i, '1440'],
  [/(?:^|[^0-9])(?:1080p?|fhd|full[\s._-]?hd)(?![0-9])/i, '1080'],
  [/(?:^|[^0-9])720p?(?![0-9])/i, '720'],
  [/(?:^|[^0-9])540p?(?![0-9])/i, '540'],
  [/(?:^|[^0-9])480p?(?![0-9])/i, '480'],
  [/(?:^|[^0-9])360p?(?![0-9])/i, '360'],
  [/(?:^|[^0-9])240p?(?![0-9])/i, '240']
]

export function extensionOf(name: string): string {
  const match = name.match(/\.([A-Za-z0-9]{1,5})$/)
  return match?.[1] ? match[1].toLowerCase() : ''
}

/** True for entries TeraBox itself classifies (or names) as video/audio. */
function isPlayable(file: TeraboxFile): boolean {
  const ext = extensionOf(file.name)
  if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) return true
  // TeraBox's `category`: 1 = video, 2 = audio.
  return file.category === 1 || file.category === 2
}

/** Resolution is normally absent from the API, so file names are the hint. */
function tierForFile(file: TeraboxFile): QualityTier {
  // `height` is the vertical resolution TeraBox reports for videos; the short
  // edge keeps portrait media from being advertised as 4K.
  const shortEdge = [file.width, file.height].filter(
    (value): value is number => typeof value === 'number' && value > 0
  )
  if (shortEdge.length > 0) {
    const edge = Math.min(...shortEdge)
    if (edge >= 2160) return '2160'
    if (edge >= 1440) return '1440'
    if (edge >= 1080) return '1080'
    if (edge >= 720) return '720'
    if (edge >= 540) return '540'
    if (edge >= 420) return '480'
    if (edge >= 320) return '360'
    return '240'
  }
  for (const [pattern, tier] of HEIGHT_HINTS) {
    if (pattern.test(file.name)) return tier
  }
  // Neither the API nor the name said anything: the file is what it is, and a
  // made-up resolution would be worse than none.
  return 'original'
}

/** Nominal resolution of a file, for sorting only (0 = unknown). */
function nominalHeight(file: TeraboxFile): number {
  const tier = tierForFile(file)
  const numeric = Number(tier)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  return 0
}

function sortKeyFor(file: TeraboxFile): number {
  const ext = extensionOf(file.name)
  if (VIDEO_EXTS.has(ext)) return 0
  if (AUDIO_EXTS.has(ext)) return 1
  return 2
}

function compareFiles(a: TeraboxFile, b: TeraboxFile): number {
  const groupA = a.isDir ? 3 : sortKeyFor(a)
  const groupB = b.isDir ? 3 : sortKeyFor(b)
  if (groupA !== groupB) return groupA - groupB
  const heightA = nominalHeight(a)
  const heightB = nominalHeight(b)
  if (heightA !== heightB) return heightB - heightA
  if (groupA === 3) return a.path.localeCompare(b.path)
  if (a.size !== b.size) return b.size - a.size
  return a.name.localeCompare(b.name)
}

function truncateTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxTitleLength) || 'TeraBox share'
}

function optionForFile(file: TeraboxFile, id: number, isFirst: boolean): DownloadOption {
  const ext = extensionOf(file.name)
  const audio = AUDIO_EXTS.has(ext)
  const tier: QualityTier = audio ? 'audio' : tierForFile(file)

  const tags: DownloadTag[] = []
  if (isFirst) tags.push('best')
  if (audio) tags.push('audio')
  else if (tier === '2160' || tier === '1440' || tier === '1080' || tier === '720') tags.push('hd')

  return {
    id,
    label: file.name.slice(0, 90),
    tier,
    height: null,
    ext: ext || (audio ? 'mp3' : 'mp4'),
    kind: audio ? 'audio' : 'video',
    muxed: true,
    needsMerge: false,
    bytes: file.size > 0 ? file.size : undefined,
    sizeLabel: formatBytes(file.size),
    estimated: false,
    formatIds: [file.fsId ?? file.path],
    tags,
    remoteFile: {
      path: file.path,
      name: file.name,
      dlink: file.dlink
    }
  }
}

/** Maps a resolved share onto the same `ParsePayload` the yt-dlp path returns. */
export function payloadFromShare(share: TeraboxShare): ParsePayload {
  const platform = getPlatform('terabox')
  const files = share.files.filter((file) => !file.isDir).sort(compareFiles)
  // A downloader should not offer a PDF as "480p", so non-media files are only
  // listed when the share holds nothing playable at all.
  const playable = files.filter(isPlayable)
  const options = (playable.length > 0 ? playable : files).map((file, index) =>
    optionForFile(file, index, index === 0)
  )

  const tiers = new Set(options.map((option) => option.tier))
  const availableQualities = QUALITY_ORDER.filter((tier) => tiers.has(tier))
  const firstVideo = options.find((option) => option.kind === 'video')
  const single = options.length === 1 ? files[0] : undefined
  const duration = single?.durationSeconds

  const meta: VideoMeta = {
    sourceUrl: share.sourceUrl,
    canonicalUrl: share.pageUrl,
    externalId: share.surl,
    title: truncateTitle(share.title),
    thumbnail: share.thumbnail,
    durationSeconds: duration && duration > 0 ? duration : undefined,
    durationLabel: duration && duration > 0 ? formatDuration(duration) : undefined,
    channel: 'TeraBox share',
    platformId: 'terabox',
    platformName: platform?.name ?? 'TeraBox',
    accent: platform?.accent ?? '#2f6bff',
    availability: 'public',
    isLive: false,
    isLiveNow: false,
    isAgeRestricted: false,
    isPlaylist: options.length > 1,
    playlistCount: options.length,
    warning:
      share.warning ??
      (share.authenticated || share.viaProxy
        ? undefined
        : 'TeraBox sometimes asks for a verification step on large shares — if a download stops at 0%, retry once.')
  }

  return {
    meta,
    options,
    availableQualities,
    maxQuality: firstVideo?.tier ?? (options.length > 0 ? 'audio' : null),
    supportsMp3: options.some((option) => option.kind === 'audio'),
    muxedMaxHeight: null,
    extractor: share.viaProxy ? 'terabox-proxy' : 'terabox-share',
    fetchedAt: Date.now(),
    cacheTtlSeconds: Math.round(LIMITS.cacheTtlMs / 1000)
  }
}

/** Convenience wrapper used by `/api/parse`. */
export async function buildTeraboxPayload(
  rawUrl: string,
  options: TeraboxResolveOptions = {}
): Promise<ParsePayload> {
  const share = await resolveTeraboxShare(rawUrl, options)
  return payloadFromShare(share)
}

/* -------------------------------------------------------------------------- */
/*                              Media delivery                                */
/* -------------------------------------------------------------------------- */

export interface TeraboxOpenResult {
  response: Response
  /** Final (signed) CDN URL — used by `DOWNLOAD_MODE=redirect`. */
  finalUrl: string
  filename: string
  ext: string
  size?: number
  contentType: string
}

function assertPublicUrl(candidate: string): void {
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new TeraboxError('PAGE_UNREACHABLE', 'TeraBox returned an invalid download URL.')
  }
  if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'TeraBox returned a download URL pointing at a private host.')
  }
}

/**
 * Re-resolves the share and opens the *fresh* `dlink` for one file. Called on
 * every download click because signed TeraBox links expire within minutes.
 */
export async function openTeraboxFile(
  rawUrl: string,
  remote: { path: string; name?: string },
  options: TeraboxResolveOptions = {}
): Promise<TeraboxOpenResult> {
  const share = await resolveTeraboxShare(rawUrl, options)
  const file =
    share.files.find((entry) => !entry.isDir && entry.path === remote.path) ??
    share.files.find((entry) => !entry.isDir && entry.name === (remote.name ?? '')) ??
    (share.files.length === 1 ? share.files[0] : undefined)

  if (!file || file.isDir) {
    throw new TeraboxError(
      'NOT_FOUND',
      'That file is no longer inside the share.',
      'Open the share again — the sender may have replaced the contents.'
    )
  }

  if (!file.dlink) {
    throw new TeraboxError(
      'VERIFICATION_REQUIRED',
      'TeraBox returned the file list but withheld the download link.',
      'Add TERABOX_COOKIE to the server environment (see .env.example) and retry.'
    )
  }

  assertPublicUrl(file.dlink)

  const jar = parseTeraboxCookies(process.env.TERABOX_COOKIE)
  const controller = new AbortController()
  const headerTimer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(file.dlink, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        Referer: share.pageUrl,
        ...(share.cookies ? { Cookie: share.cookies } : jar.size > 0 ? { Cookie: cookieHeader(jar) } : {})
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: anySignal([options.signal, controller.signal])
    })
  } catch (error) {
    throw new TeraboxError('PAGE_UNREACHABLE', 'The TeraBox download link could not be opened.', describeNetworkError(error))
  } finally {
    clearTimeout(headerTimer)
  }

  assertPublicUrl(response.url || file.dlink)

  if (!response.ok || !response.body) {
    throw new TeraboxError(
      response.status === 403 || response.status === 401 ? 'VERIFICATION_REQUIRED' : 'NOT_FOUND',
      `TeraBox refused the download (HTTP ${response.status}).`,
      'Retry — the signed link may have expired between the click and the request.'
    )
  }

  const lengthHeader = response.headers.get('content-length')
  const size = lengthHeader ? Number(lengthHeader) : undefined

  return {
    response,
    finalUrl: response.url || file.dlink,
    filename: remote.name ?? file.name,
    ext: extensionOf(file.name),
    size: Number.isFinite(size) && (size ?? 0) > 0 ? size : file.size || undefined,
    contentType: response.headers.get('content-type') ?? ''
  }
}

/**
 * Wraps an upstream body so the per-client download slot is released exactly
 * once — on completion, on error and on client cancel.
 */
export function proxyBody(
  body: ReadableStream<Uint8Array>,
  onSettled?: () => void
): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    onSettled?.()
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          settle()
          controller.close()
          return
        }
        if (value) controller.enqueue(value)
      } catch (error) {
        settle()
        controller.error(error)
      }
    },
    cancel(reason) {
      settle()
      void reader.cancel(reason).catch(() => {})
    }
  })
}

/** True when the share file is a media container the MIME table knows. */
export function isMediaExtension(ext: string): boolean {
  return KNOWN_EXTS.has(ext)
}
