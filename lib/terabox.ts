/**
 * Native TeraBox share engine.
 *
 * `yt-dlp` ships **no** TeraBox extractor (verified against 2026.08), so this
 * module implements the public share flow itself — the same calls the official
 * web player performs, with no third-party service in the middle:
 *
 *   1. `GET <mirror>/main`               → session cookies + `templateData.jsToken`
 *   2. `GET <mirror>/sharing/link?surl=` → share page: title, thumbnail, tokens
 *   3. `GET /api/shorturlinfo?shorturl=1<surl>&root=1&jsToken=…`
 *                                        → share record: file list + the
 *                                          `sign`/`timestamp`/`shareid`/`uk`
 *                                          values a download link is signed with
 *   4. `GET /share/list?…&sign=…&timestamp=…&shareid=…&uk=…`
 *                                        → one entry per file, with signed `dlink`s
 *   5. `GET /share/download?…fid_list=[fsId]` (or the `data.<mirror>` REST twin)
 *                                        → a fresh signed URL when the listing
 *                                          did not carry one
 *   6. `GET <dlink>`                     → 302 → CDN bytes
 *
 * Every step is best-effort and mirrors are swept in turn, because TeraBox
 * rotates its API and rate-limits *signed* calls hard:
 *   - an anonymous `/share/list` (no token at all) is kept as the last resort —
 *     it still returns the file list, so a share stays browsable even when
 *     TeraBox walls the signed endpoints, and the UI can explain what is
 *     missing instead of claiming the link is dead;
 *   - an errno the module does not recognise is reported as `UPSTREAM_ERROR`
 *     and never stops the sweep (that mistake used to cut resolution short and
 *     answer with "TeraBox rejected the share list" for perfectly good links);
 *   - `4000020` / `400141` / `460020` / `-6` mean "stale token" → refresh
 *     `jsToken` from `/main` and retry once.
 *
 * Folders are walked recursively (`dir=/folder`) up to `TERABOX_MAX_DEPTH`
 * levels / `TERABOX_MAX_FILES` files so a share link that wraps a whole folder
 * still resolves into one entry per file.
 *
 * Operator knobs (all optional, see `.env.example`):
 *   - `TERABOX_COOKIE`        `ndus` token, a `k=v; k=v` header or JSON — makes
 *                             TeraBox treat the session as logged in, which is
 *                             what unlocks `dlink`s for adult/flagged shares and
 *                             for hosts whose IP reputation is poor;
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
  /** TeraBox answered, but with something this server does not understand. */
  | 'UPSTREAM_ERROR'
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

/** Everything a mirror hands us inside its HTML: anti-bot tokens + share metadata. */
interface PageTokens {
  jsToken?: string
  dpLogId?: string
  bdToken?: string
  thumbnail?: string
  title?: string
  /** Share secrets `/share/download` is signed with (same names TeraBox uses). */
  shareid?: string
  uk?: string
  sign?: string
  timestamp?: string
  randsk?: string
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * `jsToken` is handed out wrapped in TeraBox's anti-bot trampoline, e.g.
 * `fn("%28%22<TOKEN>%22%29")` or the JSON-escaped
 * `"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22<TOKEN>%22%29"`.
 * The token is the innermost quoted value, so unwrap it whichever way it
 * arrives and always hand callers the bare token.
 */
function normaliseJsToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  if (!value) return undefined
  // Match the percent-encoded wrapper *before* decoding, otherwise the
  // trampoline's own escapes are gone by the time we look for the token.
  const inner = value.match(/%22([A-Za-z0-9_%+/-]{16,})%22/)
  const candidate = inner?.[1] ? decode(inner[1]) : decode(value)
  const token = candidate.replace(/^["']|["']$/g, '').trim()
  return token.length >= 8 ? token.slice(0, 200) : undefined
}

/**
 * The page-state blob. Skins differ: `var templateData = {…}`, `locals.templateData = {…}`,
 * `window.templateData = {…}` — and the JSON can contain `}`/`;` inside strings, so the
 * braces are balanced instead of regex-terminated.
 */
function templateDataFrom(html: string): Record<string, unknown> | undefined {
  const marker = html.search(/(?:locals|window|var|const|let)[.\s]+templateData\s*=\s*\{/)
  if (marker === -1) return undefined
  const start = html.indexOf('{', marker)
  if (start === -1) return undefined

  let depth = 0
  let quote: string | null = null
  const limit = Math.min(html.length, start + 2_000_000)
  for (let index = start; index < limit; index += 1) {
    const char = html[index]
    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, index + 1)) as Record<string, unknown>
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

/** Reads `key:"value"`, `key='value'` or `key = "value"` — the pages are inconsistent. */
function metaValue(html: string, key: string, allow: string): string | undefined {
  const pattern = new RegExp(`(?:["']?${key}["']?)\\s*[:=]\\s*["']([${allow}]{4,})["']`, 'i')
  return html.match(pattern)?.[1]
}

const JS_TOKEN_PATTERNS: RegExp[] = [
  // JSON-escaped anti-bot trampoline (sharing/embed pages, 2025+).
  /"jsToken"\s*:\s*"function%20fn%28a%29%7Bwindow\.jsToken%20%3D%20a%7D%3Bfn%28%22([^"\\]+)%22%29/,
  // Same trampoline, already unescaped.
  /fn\("%28%22([A-Za-z0-9_%+/-]{16,})%22%29"\)/,
  // Bare `…%3Bfn%28%22<TOKEN>%22%29` tail.
  /fn%28%22([A-Za-z0-9_%+/-]{16,})%22%29/,
  // `window.jsToken = "…"` / `jsToken: "…"`.
  /window\.jsToken\s*[:=]\s*["'`]([^"'`]{8,})/,
  /jsToken["'\s:=]+([A-Za-z0-9_+-]{8,})/i
]

/** Pulls the anti-bot tokens + share metadata out of a TeraBox page. */
export function extractTeraboxTokens(html: string): PageTokens {
  const tokens: PageTokens = {}
  const template = templateDataFrom(html)
  const templateString = (key: string): string | undefined => {
    const value = template?.[key]
    if (typeof value === 'string' && value) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    return undefined
  }

  tokens.jsToken = normaliseJsToken(templateString('jsToken'))
  if (!tokens.jsToken) {
    for (const pattern of JS_TOKEN_PATTERNS) {
      const candidate = normaliseJsToken(html.match(pattern)?.[1])
      if (candidate) {
        tokens.jsToken = candidate
        break
      }
    }
  }

  const logId =
    templateString('logid') ??
    html.match(/(?:dp-logid=|"dp-logid"\s*:\s*"?)(\d{6,})/)?.[1] ??
    html.match(/logid["'\s:=]+(\d{6,})/i)?.[1]
  if (logId) tokens.dpLogId = logId

  const bdToken = templateString('bdstoken') ?? html.match(/bdstoken["'\s:=]+([A-Za-z0-9_-]{8,})/i)?.[1]
  if (bdToken) tokens.bdToken = bdToken

  // Share secrets: inside `templateData` on logged-in pages, inline in the JS on
  // anonymous ones. `/share/download` cannot be signed without them.
  tokens.shareid =
    templateString('shareid') ??
    templateString('shareId') ??
    metaValue(html, 'shareid', '0-9') ??
    metaValue(html, 'share_id', '0-9')
  tokens.uk = templateString('uk') ?? metaValue(html, 'uk', '0-9')
  tokens.sign = templateString('sign') ?? metaValue(html, 'sign', 'A-Za-z0-9+/=_-')
  tokens.timestamp = templateString('timestamp') ?? metaValue(html, 'timestamp', '0-9')
  tokens.randsk = templateString('randsk') ?? metaValue(html, 'randsk', 'A-Za-z0-9%+/=_-')

  const thumb =
    templateString('thumb') ??
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/og:image["']\s+content=["']([^"']+)["']/i)?.[1]
  if (thumb) tokens.thumbnail = thumb.replace(/&amp;/g, '&')

  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    templateString('filename') ??
    html.match(/"title"\s*:\s*"([^"]{1,200})"/)?.[1]
  if (title) tokens.title = decode(title).replace(/&amp;/g, '&')

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
): Promise<{ html: string; finalUrl: string }> {
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
  // Mirror links redirect (`teraboxlink.com/s/…` → `www.terabox.app/sharing/link`),
  // and the origin we ended up on is the one that owns the share session.
  return { html, finalUrl: response.url || url }
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

/**
 * Signing material for `/share/download`. TeraBox mints it per share (and per
 * session) and refuses to hand out a `dlink` without it — that is why the file
 * list alone is not enough to download a share.
 */
export interface ShareMeta {
  shareid?: string
  uk?: string
  sign?: string
  timestamp?: string
  /** `randsk` cookie of a password-protected share, already URL-decoded. */
  sekey?: string
}

export interface TeraboxShare {
  surl: string
  sourceUrl: string
  /** Share page URL, reused as the `Referer` when fetching the media. */
  pageUrl: string
  apiBase: string
  cookies: string
  /** Anti-bot token of the session that produced this share (never sent to clients). */
  jsToken?: string
  title: string
  thumbnail?: string
  files: TeraboxFile[]
  /** True when the listing was produced with an operator-supplied cookie. */
  authenticated: boolean
  /** True when a resolver proxy produced the listing. */
  viaProxy: boolean
  /** True when TeraBox also signed the listing, i.e. `dlink`s can be minted. */
  signed: boolean
  meta: ShareMeta
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
/**
 * API origins to try, most likely first: an explicit override, then the origin
 * the share page *ended up* on (mirrors redirect to the backend cluster), then
 * the share page's own origin, then the canonical mirrors.
 */
function apiCandidates(pageUrl: string, finalPageUrl?: string): string[] {
  const configured = process.env.TERABOX_API_BASE?.trim()
  const origins = [finalPageUrl, pageUrl].map((candidate) => {
    try {
      return candidate ? new URL(candidate).origin : undefined
    } catch {
      return undefined
    }
  })
  const candidates = [configured, ...origins, ...API_FALLBACK_HOSTS].filter(
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

function safeOrigin(rawUrl: string | undefined): string | undefined {
  try {
    return rawUrl ? new URL(rawUrl).origin : undefined
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

/** The share page as this mirror serves it — the `Referer` for every API call. */
function mirrorSharePage(base: string, surl: string): string {
  return `${base}/sharing/link?surl=${encodeURIComponent(surl)}`
}

/* -------------------------------------------------------------------------- */
/*                         Session + API plumbing                             */
/* -------------------------------------------------------------------------- */

interface ApiBody {
  [key: string]: unknown
  errno?: unknown
  code?: unknown
  errmsg?: string
}

interface ApiResult {
  body: ApiBody
  status: number
  /** TeraBox answers with `errno` on most endpoints and `code` on newer ones. */
  errno: number
  errmsg?: string
}

/** Which call produced an errno — some codes mean different things per step. */
type ErrnoContext = 'init' | 'list' | 'download'

interface ApiContext {
  timeoutMs: number
  signal?: AbortSignal
  referer?: string
}

/** One mirror origin plus everything we scraped for it. */
interface MirrorSession {
  base: string
  jar: CookieJar
  surl: string
  /** Share page on this mirror, reused as `Referer`. */
  pageUrl: string
  tokens: PageTokens
  meta: ShareMeta
  title?: string
  thumbnail?: string
}

/** Codes that mean "the link itself is dead" — retrying another mirror cannot help. */
const FATAL_ERROR_CODES = new Set<TeraboxErrorCode>(['NOT_FOUND', 'PASSWORD_REQUIRED', 'REGION_BLOCKED'])

/** Codes that mean "the anti-bot token went stale" — refresh it and retry once. */
const TOKEN_REFRESH_ERRNOS = new Set([-6, 4000020, 400141, 460020])

function sanitiseText(value: string | undefined): string | undefined {
  return value?.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) || undefined
}

function cloneJar(jar: CookieJar): CookieJar {
  return new Map(jar)
}

function mergeTokens(target: PageTokens, extra: PageTokens): PageTokens {
  const merged: PageTokens = { ...target }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') {
      merged[key as keyof PageTokens] = value as string
    }
  }
  return merged
}

async function requestJson(url: string, jar: CookieJar, context: ApiContext): Promise<ApiResult> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        ...browserHeaders(jar, context.referer),
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(safeOrigin(url) ? { Origin: safeOrigin(url) as string } : {})
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: timeoutSignal(context.timeoutMs, context.signal)
    })
  } catch (error) {
    throw new TeraboxError(
      'PAGE_UNREACHABLE',
      'The TeraBox file list request failed.',
      describeNetworkError(error)
    )
  }

  absorbCookies(response, jar)
  const text = await response.text().catch(() => '')
  let body: ApiBody | null = null
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown
      if (parsed && typeof parsed === 'object') body = parsed as ApiBody
    } catch {
      body = null
    }
  }

  if (!body) {
    throw response.ok
      ? new TeraboxError(
          'UPSTREAM_ERROR',
          'TeraBox returned a response this server could not read.',
          'Retry in a moment.'
        )
      : new TeraboxError('PAGE_UNREACHABLE', `TeraBox returned HTTP ${response.status} for an API call.`)
  }

  const errnoRaw = Number(body.errno ?? body.code ?? 0)
  return {
    body,
    status: response.status,
    errno: Number.isFinite(errnoRaw) ? errnoRaw : 0,
    errmsg: typeof body.errmsg === 'string' ? body.errmsg : undefined
  }
}

/** Non-null when the response carries an error we should act on. */
function apiFailure(result: ApiResult, context: ErrnoContext): TeraboxError | null {
  if (result.errno !== 0) return mapErrno(result.errno, result.errmsg, context)
  if (result.status >= 400) {
    return new TeraboxError('PAGE_UNREACHABLE', `TeraBox returned HTTP ${result.status} for the file list.`)
  }
  return null
}

function entriesFrom(body: ApiBody): RawListEntry[] {
  if (Array.isArray(body.list)) return body.list as RawListEntry[]
  if (Array.isArray(body.file_list)) return body.file_list as RawListEntry[]
  return []
}

function metaFromBody(body: ApiBody, tokens: PageTokens, current: ShareMeta): ShareMeta {
  const pick = (key: keyof ShareMeta): string | undefined => {
    const raw = body[key] ?? tokens[key === 'sekey' ? 'randsk' : key]
    if (raw === undefined || raw === null || raw === '') return current[key]
    return String(raw)
  }
  const rawSekey = body.randsk ?? tokens.randsk
  return {
    shareid: pick('shareid'),
    uk: pick('uk'),
    sign: pick('sign'),
    timestamp: pick('timestamp'),
    sekey: rawSekey ? decode(String(rawSekey)) : current.sekey
  }
}

function signedWith(meta: ShareMeta): boolean {
  return Boolean(meta.sign && meta.timestamp && meta.shareid && meta.uk)
}

/* -------------------------------------------------------------------------- */
/*                             Mirror orchestration                           */
/* -------------------------------------------------------------------------- */

/**
 * Opens a session on one mirror: `/main` mints the session cookies and carries
 * the `jsToken`, the share page carries the title, thumbnail and (on anonymous
 * pages) the same anti-bot tokens.
 */
async function primeMirror(
  base: string,
  surl: string,
  jar: CookieJar,
  context: ApiContext,
  rawPageUrl: string
): Promise<MirrorSession> {
  const session: MirrorSession = {
    base,
    jar,
    surl,
    pageUrl: mirrorSharePage(base, surl),
    tokens: {},
    meta: {}
  }

  // `/main` is where the modern page state (`templateData`) lives. Mirrors that
  // do not serve it simply fail and we carry on.
  const main = await fetchHtml(`${base}/main`, jar, context.timeoutMs, context.signal, `${base}/`).catch(
    () => null
  )
  if (main) {
    session.tokens = mergeTokens(session.tokens, extractTeraboxTokens(main.html))
    const origin = safeOrigin(main.finalUrl)
    if (origin) session.base = origin
  }

  // The share page: the exact page a browser opens, so it also gives us the
  // final (possibly redirected) origin and richer metadata.
  const page = await fetchHtml(session.pageUrl, jar, context.timeoutMs, context.signal, rawPageUrl)
  session.tokens = mergeTokens(session.tokens, extractTeraboxTokens(page.html))
  session.title = session.tokens.title
  session.thumbnail = session.tokens.thumbnail
  if (page.finalUrl) {
    session.pageUrl = page.finalUrl
    const origin = safeOrigin(page.finalUrl)
    if (origin) session.base = origin
  }

  // Some mirrors only inject the token into the embed shell.
  if (!session.tokens.jsToken) {
    const embed = await fetchHtml(
      `${session.base}/sharing/embed?surl=${encodeURIComponent(surl)}`,
      jar,
      context.timeoutMs,
      context.signal,
      session.pageUrl
    ).catch(() => null)
    if (embed) session.tokens = mergeTokens(session.tokens, extractTeraboxTokens(embed.html))
  }

  session.meta = metaFromBody({}, session.tokens, {})
  return session
}

/** Re-scrapes `/main` so a stale `jsToken` is replaced before a retry. */
async function refreshTokens(session: MirrorSession, context: ApiContext): Promise<boolean> {
  const before = session.tokens.jsToken
  const main = await fetchHtml(
    `${session.base}/main`,
    session.jar,
    context.timeoutMs,
    context.signal,
    session.pageUrl
  ).catch(() => null)
  if (!main) return false
  session.tokens = mergeTokens(session.tokens, extractTeraboxTokens(main.html))
  return session.tokens.jsToken !== before || Boolean(session.tokens.jsToken)
}

/**
 * `/api/shorturlinfo` — the share's own record: root listing **and** the
 * `sign`/`timestamp`/`shareid`/`uk` triple that `/share/list` needs before it
 * will include signed `dlink`s.
 */
async function initShare(session: MirrorSession, context: ApiContext): Promise<RawListEntry[]> {
  const call = async (shorturl: string, token: string | undefined): Promise<ApiResult> => {
    const params = new URLSearchParams({
      app_id: APP_ID,
      web: '1',
      channel: 'dubox',
      clienttype: '0',
      root: '1',
      scene: ''
    })
    params.set('shorturl', shorturl)
    if (token) params.set('jsToken', token)
    if (session.tokens.dpLogId) params.set('dp-logid', session.tokens.dpLogId)
    return requestJson(`${session.base}/api/shorturlinfo?${params.toString()}`, session.jar, context)
  }

  // The routing marker (`1`) is part of the short url these endpoints expect.
  let result = await call(`1${session.surl}`, session.tokens.jsToken)
  if (TOKEN_REFRESH_ERRNOS.has(result.errno)) {
    if (await refreshTokens(session, context)) {
      result = await call(`1${session.surl}`, session.tokens.jsToken)
    }
  }
  // Legacy callers pass the bare id; mirrors disagree, so try it before giving
  // up — except for verification walls, where the id shape is clearly not the
  // problem and the extra round trip only slows the sweep.
  const walled = result.errno === 400210 || result.errno === 460020
  if (result.errno !== 0 && !TOKEN_REFRESH_ERRNOS.has(result.errno) && !walled) {
    const bare = await call(session.surl, session.tokens.jsToken)
    if (bare.errno === 0) result = bare
  }

  const failure = apiFailure(result, 'init')
  if (failure) throw failure

  session.meta = metaFromBody(result.body, session.tokens, session.meta)
  const title = typeof result.body.title === 'string' ? result.body.title.replace(/^\//, '') : undefined
  if (title) session.title = title
  return entriesFrom(result.body)
}

/**
 * `/share/list` — the file listing. With the share metadata attached it also
 * returns signed `dlink`s; without any token it still lists the files, which is
 * what keeps a share browsable when TeraBox walls the signed calls.
 */
async function listDirectory(
  session: MirrorSession,
  dir: string | null,
  context: ApiContext,
  options: { anonymous?: boolean } = {}
): Promise<RawListEntry[]> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    web: '1',
    channel: 'dubox',
    clienttype: '0',
    page: '1',
    num: '100',
    by: 'name',
    order: 'asc',
    shorturl: session.surl
  })
  if (dir) params.set('dir', dir)
  else params.set('root', '1')

  // The web player sets `TSID = decodeURIComponent(randsk)` and sends the same
  // value as `sekey`; the server checks the pair, so replay both.
  if (session.meta.sekey) session.jar.set('TSID', session.meta.sekey)

  if (!options.anonymous) {
    const { shareid, uk, sign, timestamp, sekey } = session.meta
    if (sign) params.set('sign', sign)
    if (timestamp) params.set('timestamp', timestamp)
    if (shareid) params.set('shareid', shareid)
    if (uk) params.set('uk', uk)
    if (sekey) params.set('sekey', sekey)
    if (session.tokens.jsToken) params.set('jsToken', session.tokens.jsToken)
    if (session.tokens.dpLogId) params.set('dp-logid', session.tokens.dpLogId)
  }

  const url = `${session.base}/share/list?${params.toString()}`
  let result = await requestJson(url, session.jar, context)

  if (!options.anonymous && TOKEN_REFRESH_ERRNOS.has(result.errno)) {
    if (await refreshTokens(session, context)) {
      if (session.tokens.jsToken) params.set('jsToken', session.tokens.jsToken)
      result = await requestJson(`${session.base}/share/list?${params.toString()}`, session.jar, context)
    }
  }

  const failure = apiFailure(result, 'list')
  if (failure) throw failure
  return entriesFrom(result.body)
}

/** Turns a mirror into a resolved share, or throws the mirror's best error. */
async function loadFromMirror(
  session: MirrorSession,
  rawUrl: string,
  context: ApiContext
): Promise<TeraboxShare> {
  const errors: TeraboxError[] = []
  let entries: RawListEntry[] = []
  let signed = false

  // 1. The share record — best path: listing *and* signing material. It is
  //    also the only call that can say "this share needs a password", so it is
  //    attempted even when no token could be scraped.
  try {
    entries = await initShare(session, context)
    signed = signedWith(session.meta)
  } catch (error) {
    if (!(error instanceof TeraboxError)) throw error
    errors.push(error)
    if (FATAL_ERROR_CODES.has(error.code)) throw error
  }

  // 2. Signed listing on its own (no `/api/shorturlinfo`).
  if (entries.length === 0) {
    try {
      entries = await listDirectory(session, null, context)
      if (signedWith(session.meta) || entries.some((entry) => entry.dlink)) signed = true
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      errors.push(error)
      if (FATAL_ERROR_CODES.has(error.code)) throw error
    }
  }

  // 3. Anonymous listing. TeraBox serves this without a `jsToken`, so a share
  //    stays usable even when every signed call is walled.
  if (entries.length === 0) {
    try {
      entries = await listDirectory(session, null, context, { anonymous: true })
      if (entries.some((entry) => entry.dlink)) signed = true
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      errors.push(error)
      if (FATAL_ERROR_CODES.has(error.code)) throw error
    }
  }

  if (entries.length === 0) {
    throw (
      errors.find((error) => error.code === 'VERIFICATION_REQUIRED') ??
      errors[0] ??
      new TeraboxError(
        'UPSTREAM_ERROR',
        'TeraBox returned no file list for that share.',
        'Retry in a moment.'
      )
    )
  }

  const files = await collectFiles(session, entries, context)
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
  const titled = session.title ?? files.find((file) => !file.isDir)?.name
  return {
    surl: session.surl,
    sourceUrl: rawUrl,
    pageUrl: session.pageUrl,
    apiBase: session.base,
    cookies: cookieHeader(session.jar),
    title: truncateTitle(titled ?? `TeraBox share ${session.surl}`),
    thumbnail: session.thumbnail ?? single?.thumb,
    files,
    jsToken: session.tokens.jsToken,
    authenticated: session.jar.size > 0,
    viaProxy: false,
    signed,
    meta: session.meta,
    warning:
      media.length >= MAX_FILES
        ? `Showing the first ${MAX_FILES} files of this share. Open it in TeraBox to see the rest.`
        : undefined
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
      // Only a blocked/jumbled session is worth retrying with a different jar.
      if (error.code !== 'VERIFICATION_REQUIRED' && error.code !== 'UPSTREAM_ERROR') throw error
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
  const errors: TeraboxError[] = []
  const startedAt = Date.now()
  // Never let a slow sweep outlive the caller's patience: two mirrored rounds
  // are plenty, and a mirror that answers fast wins.
  const budgetMs = Math.max(timeoutMs, 6_000) * 2
  // With an operator session configured, a signed listing (one that comes with
  // `dlink`s) is achievable somewhere, so an unsigned answer is kept aside and
  // the sweep continues. Without a session there is nothing to gain from it.
  const keepSweepingForSigned = jar.size > 0
  let unsigned: TeraboxShare | null = null
  let attempts = 0

  for (const base of apiCandidates(pageUrl)) {
    if (attempts > 0 && Date.now() - startedAt > budgetMs) break
    attempts += 1

    const context: ApiContext = { timeoutMs, signal }
    const sessionJar = cloneJar(jar)

    try {
      const session = await primeMirror(base, surl, sessionJar, context, pageUrl)
      const workspace: ApiContext = { timeoutMs, signal, referer: session.pageUrl }
      const share = await loadFromMirror(session, rawUrl, workspace)
      if (share.signed) return share
      unsigned ??= share
      if (!keepSweepingForSigned) return share
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      // Definitive answers ("link is gone", "password protected") stop the sweep.
      if (FATAL_ERROR_CODES.has(error.code)) throw error
      errors.push(error)
    }
  }

  if (unsigned) return unsigned
  throw errors[0] ?? new TeraboxError('PAGE_UNREACHABLE', 'TeraBox could not be reached.')
}

function mapErrno(errno: number, errmsg?: string, context: ErrnoContext = 'list'): TeraboxError {
  const detail = sanitiseText(errmsg) ? ` (${sanitiseText(errmsg)})` : ''
  switch (errno) {
    // 4000020: token expired. 400141: risk control. 460020: "need verify" from
    // `/share/list`. All three clear up with a fresh `jsToken`.
    case -6:
    case 4000020:
    case 400141:
      return new TeraboxError(
        'VERIFICATION_REQUIRED',
        `TeraBox asked for a fresh verification token before releasing the share${detail}.`,
        'Retry in a moment — the app fetches a new token automatically.'
      )
    // 400210 "need verify_v2": TeraBox blocks this server's IP for anonymous
    // API calls. A logged-in cookie is the documented way through.
    case 400210:
    case 460020:
      return new TeraboxError(
        'VERIFICATION_REQUIRED',
        `TeraBox served a verification wall instead of the share${detail}.`,
        'Anonymous datacenter IPs are often challenged — set TERABOX_COOKIE (`ndus` from a logged-in browser session) on the server, or retry in a few minutes.'
      )
    case 9000:
      return new TeraboxError(
        'REGION_BLOCKED',
        'TeraBox is not available from this server’s region.',
        'TeraBox blocks a number of datacenter regions — deploy the app in another region or route through a resolver proxy.'
      )
    case -9:
      // On the share record this means "password required"; on a listing it is
      // TeraBox's generic "gone".
      return context === 'init'
        ? new TeraboxError(
            'PASSWORD_REQUIRED',
            'That share link is password protected.',
            'Ask the sender for the password — TeraBox will not list a protected share without it.'
          )
        : new TeraboxError(
            'NOT_FOUND',
            'That share link is expired, deleted or private.',
            'Ask the sender for a fresh TeraBox link.'
          )
    case -10:
    case -62:
    case 115:
    case 130:
      return new TeraboxError(
        'NOT_FOUND',
        'That share link is expired, deleted or private.',
        'Ask the sender for a fresh TeraBox link.'
      )
    default:
      // Anything else is TeraBox changing shape under us. Say so honestly, keep
      // the errno for the logs, and let the other mirrors have a turn.
      return new TeraboxError(
        'UPSTREAM_ERROR',
        `TeraBox answered with an unexpected error (errno ${Number.isFinite(errno) ? errno : 0})${detail}.`,
        'Retry in a moment — TeraBox rotates its API without notice, and the same link often resolves on the next attempt.'
      )
  }
}

async function collectFiles(
  session: MirrorSession,
  rootEntries: RawListEntry[],
  context: ApiContext
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
      const file = toFile(entry, session.base)
      if (!file) continue
      files.push(file)

      if (file.isDir && current.depth < MAX_FOLDER_DEPTH) {
        // Signed listing first (it carries `dlink`s), anonymous as a fallback.
        const signed = await listDirectory(session, file.path, context).catch(() => null)
        const entries =
          signed && signed.length > 0
            ? signed
            : await listDirectory(session, file.path, context, { anonymous: true }).catch(() => null)
        if (entries && entries.length > 0) {
          queue.push({ entries, depth: current.depth + 1 })
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
    viaProxy: true,
    signed: files.some((file) => Boolean(file.dlink)),
    meta: {}
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
      (share.viaProxy || (share.authenticated && share.signed)
        ? undefined
        : share.signed
          ? 'TeraBox listed this share anonymously — if a download stalls at 0%, retry once.'
          : 'TeraBox withheld the signed download link for this share. If the download fails, set TERABOX_COOKIE on the server (see .env.example).')
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

/** Pulls the signed URL out of either response shape TeraBox uses. */
function dlinkFrom(body: ApiBody): string | undefined {
  if (typeof body.dlink === 'string' && body.dlink) return body.dlink
  const list = Array.isArray(body.list) ? (body.list as Array<Record<string, unknown>>) : []
  const entry = list.find((candidate) => typeof candidate?.dlink === 'string')
  return typeof entry?.dlink === 'string' ? entry.dlink : undefined
}

/**
 * Mints a fresh download URL for one file.
 *
 * A share listing only carries `dlink`s when TeraBox trusts the session. For the
 * anonymous case the same two calls the official player makes are replayed with
 * the share's `sign`/`timestamp`/`shareid`/`uk` — that is what "other sites"
 * do, and their failure mode is identical to ours: without those values TeraBox
 * simply refuses to sign a link.
 */
async function acquireDlink(
  share: TeraboxShare,
  file: TeraboxFile,
  signal?: AbortSignal
): Promise<string> {
  if (file.dlink) return file.dlink

  const jar = parseTeraboxCookies(share.cookies || process.env.TERABOX_COOKIE)
  const context: ApiContext = { timeoutMs: PAGE_TIMEOUT_MS, signal, referer: share.pageUrl }
  const failures: TeraboxError[] = []
  const { shareid, uk, sign, timestamp, sekey } = share.meta

  const attempt = async (url: string, label: string): Promise<string | null> => {
    try {
      const result = await requestJson(url, jar, context)
      const failure = apiFailure(result, 'download')
      if (failure) throw failure
      const dlink = dlinkFrom(result.body)
      if (dlink) {
        assertPublicUrl(dlink)
        return dlink
      }
      failures.push(
        new TeraboxError('UPSTREAM_ERROR', `TeraBox's ${label} endpoint answered without a download link.`)
      )
      return null
    } catch (error) {
      if (!(error instanceof TeraboxError)) throw error
      failures.push(error)
      return null
    }
  }

  if (shareid && uk && sign && timestamp && file.fsId) {
    const shared: Record<string, string> = {
      app_id: APP_ID,
      web: '1',
      channel: 'dubox',
      clienttype: '0',
      uk,
      sign,
      timestamp,
      shareid,
      primaryid: shareid,
      product: 'share',
      nozip: '0',
      fid_list: `[${file.fsId}]`
    }
    if (share.jsToken) shared.jsToken = share.jsToken
    if (sekey) shared.sekey = sekey

    const player = `${share.apiBase}/share/download?${new URLSearchParams(shared).toString()}`
    const fromPlayer = await attempt(player, 'share/download')
    if (fromPlayer) return fromPlayer

    const mirrorHost = safeHost(share.apiBase)?.replace(/^www\./, '')
    const restHosts = ['data.terabox.com', mirrorHost ? `data.${mirrorHost}` : undefined].filter(
      (host): host is string => Boolean(host)
    )
    for (const host of [...new Set(restHosts)]) {
      const rest = `https://${host}/rest/2.0/share/download?${new URLSearchParams({
        ...shared,
        method: 'locatedownload'
      }).toString()}`
      const fromCdn = await attempt(rest, 'locatedownload')
      if (fromCdn) return fromCdn
    }
  }

  throw (
    failures.find((error) => error.code === 'VERIFICATION_REQUIRED') ??
    failures[0] ??
    new TeraboxError(
      'VERIFICATION_REQUIRED',
      'TeraBox returned the file list but withheld the download link.',
      'Anonymous requests are often held back — set TERABOX_COOKIE (an `ndus` value from a logged-in session) on the server and retry.'
    )
  )
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

  const dlink = await acquireDlink(share, file, options.signal)
  const jar = parseTeraboxCookies(share.cookies || process.env.TERABOX_COOKIE)
  const controller = new AbortController()
  const headerTimer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(dlink, {
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

  assertPublicUrl(response.url || dlink)

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
    finalUrl: response.url || dlink,
    filename: remote.name ?? file.name,
    ext: extensionOf(file.name),
    size: Number.isFinite(size) && (size ?? 0) > 0 ? size : file.size || undefined,
    contentType: response.headers.get('content-type') ?? ''
  }
}

/**
 * Wraps an upstream body so the per-client download slot is released exactly
 * once — on completion, on error and on client cancel — and so the live job
 * registry can be flipped to `finished` the moment the transfer ends.
 *
 * No byte counting: the download page shows no transfer telemetry, so the only
 * event worth reporting is completion.
 */
export function proxyBody(
  body: ReadableStream<Uint8Array>,
  callbacks: {
    onSettled?: () => void
    /** Fired exactly once when the upstream body ends successfully. */
    onDone?: () => void
  } = {}
): ReadableStream<Uint8Array> {
  const { onSettled, onDone } = callbacks
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
          onDone?.()
          settle()
          controller.close()
          return
        }
        if (value) {
          controller.enqueue(value)
        }
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

/* -------------------------------------------------------------------------- */
/*                              Transfer plumbing                             */
/* -------------------------------------------------------------------------- */

/**
 * Forwards a prepared (merged/transcoded) file body to the client and fires
 * `onDone` exactly once when the last chunk has been handed over, so the route
 * can flip its live job to `finished`.
 *
 * This used to compute a streaming percentage from an `expectedBytes` total;
 * that is gone along with every other transfer readout — step 3 shows an
 * indeterminate animation, so completion is the only event that matters here.
 * A null/undefined body resolves to an empty stream that completes at once.
 */
export function forwardBody(
  body: ReadableStream<Uint8Array> | null | undefined,
  callbacks: { onDone?: () => void } = {}
): ReadableStream<Uint8Array> {
  const { onDone } = callbacks
  if (!body) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        onDone?.()
        controller.close()
      }
    })
  }

  const reader = body.getReader()

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          onDone?.()
          controller.close()
          return
        }
        if (value) controller.enqueue(value)
      } catch (error) {
        controller.error(error)
      }
    },
    cancel(reason) {
      void reader.cancel(reason).catch(() => {})
    }
  })
}
