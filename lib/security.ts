/**
 * Input validation and abuse protection for the extraction/download endpoints.
 *
 * Two responsibilities:
 *   - make sure we never hand an attacker-controlled target to `yt-dlp`
 *     (SSRF against internal networks, `file://`, data URIs, ...);
 *   - keep a single client from exhausting the process pool of spawned
 *     `yt-dlp` children.
 */

import { LRUCache } from 'lru-cache'

import { ALLOWED_HOSTS, normalizeHost, platformForHostname } from './platforms'
import { extraAllowedHosts, LIMITS } from './site'

export type ValidationError = {
  code: 'INVALID_URL' | 'UNSUPPORTED_URL' | 'SELF_REQUEST'
  message: string
  hint?: string
}

export type UrlValidation =
  | { ok: true; url: URL; href: string; platformId?: string }
  | { ok: false; error: ValidationError }

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const BLOCKED_HOST_SUFFIXES = [
  '.local',
  '.localhost',
  '.internal',
  '.home.arpa',
  '.localdomain',
  '.invalid',
  '.test'
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
  '100.100.100.200'
])

/**
 * Classifies IPv4 literals. Anything we cannot confidently parse is treated as
 * private (fail closed) because it usually means an encoded bypass attempt
 * such as `http://2130706433/` or `http://0x7f.0.0.1/`.
 */
const isPrivateIpv4 = (hostname: string): boolean => {
  const quad = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  let octets: number[]
  if (quad) {
    octets = quad.slice(1).map(Number)
    if (octets.some((part) => part > 255)) return true
  } else if (/^0[xX][0-9a-fA-F]+$/.test(hostname) || /^\d+$/.test(hostname)) {
    const value = Number(hostname)
    if (!Number.isFinite(value) || value < 0 || value > 0xffffffff) return true
    octets = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]
  } else if (/^[\d.]+$/.test(hostname)) {
    return true
  } else {
    return false
  }

  const [a = 0, b = 0] = octets
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true // this-net, private, loopback, multicast
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT (incl. some container nets)
  if (a === 169 && b === 254) return true // link-local + cloud metadata endpoint
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0 && (octets[2] === 0 || octets[2] === 2)) return true // IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true // benchmarking / doc
  if (a === 192 && b === 2) return true
  return false
}

const isPrivateIpv6 = (hostname: string): boolean => {
  const host = hostname.toLowerCase()
  if (host === '::' || host === '::1') return true
  const mapped = host.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (mapped) return isPrivateIpv4(mapped.slice(1).join('.'))
  const firstGroup = host.split(':')[0] ?? ''
  if (/^f[cd][0-9a-f]{2}$/i.test(firstGroup)) return true // fc00::/7 ULA
  if (/^fe[89ab][0-9a-f]{2}$/i.test(firstGroup)) return true // fe80::/10 link-local
  return false
}

/** True for loopback, RFC1918, CGNAT, link-local, metadata and non-IP internal names. */
export function isPrivateHost(hostname: string): boolean {
  const host = normalizeHost(hostname).replace(/^\[|\]$/g, '')
  if (!host) return true
  if (BLOCKED_HOSTNAMES.has(host)) return true
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true
  if (host.includes(':')) return isPrivateIpv6(host)
  if (/^[0-9]/.test(host) && !/^[\w-]+\.[\w.-]+$/.test(host)) return true
  if (/^\d+(\.\d+){1,3}$/.test(host) || /^0[xX][0-9a-fA-F.]+$/.test(host)) return isPrivateIpv4(host)
  return false
}

/**
 * Validates a user-submitted media URL. Only well-formed, public, supported
 * http(s) links make it through.
 */
export function validateMediaUrl(input: unknown): UrlValidation {
  if (typeof input !== 'string') {
    return {
      ok: false,
      error: { code: 'INVALID_URL', message: 'A video link is required.' }
    }
  }

  const raw = input.trim()
  if (raw.length === 0) {
    return { ok: false, error: { code: 'INVALID_URL', message: 'Paste a link to get started.' } }
  }
  if (raw.length > LIMITS.maxUrlLength) {
    return {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: `That link is longer than ${LIMITS.maxUrlLength} characters and was rejected.`,
        hint: 'Use the short share link (for example vm.tiktok.com or youtu.be) instead.'
      }
    }
  }
  if (/\s/.test(raw)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: 'The link contains spaces or line breaks.',
        hint: 'Copy only the URL, starting with https://'
      }
    }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: 'That does not look like a valid link.',
        hint: 'A supported link looks like https://www.youtube.com/watch?v=...'
      }
    }
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: `Only http:// and https:// links are supported (got "${url.protocol}").`,
        hint: 'Remove app:// or file:// prefixes and paste the web address.'
      }
    }
  }

  if (url.username || url.password) {
    return {
      ok: false,
      error: {
        code: 'SELF_REQUEST',
        message: 'Credentials embedded in the URL are not allowed.',
        hint: 'Remove the user:password@ part from the link.'
      }
    }
  }

  if (isPrivateHost(url.hostname)) {
    return {
      ok: false,
      error: {
        code: 'SELF_REQUEST',
        message: 'Links to private or internal network addresses cannot be resolved.',
        hint: 'Paste the public share link from the mobile app.'
      }
    }
  }

  const host = normalizeHost(url.hostname)
  const allowed =
    ALLOWED_HOSTS.has(host) ||
    extraAllowedHosts.includes(host) ||
    extraAllowedHosts.some((entry) => host.endsWith(`.${entry}`))
  const platform = platformForHostname(url.hostname)

  if (!allowed && !platform) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_URL',
        message: `${url.hostname} is not on the supported network list yet.`,
        hint: 'YouTube, TikTok, Instagram, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch and TeraBox shares are supported.'
      }
    }
  }

  return { ok: true, url, href: url.toString(), platformId: platform?.id }
}

/** Guard applied to upstream media URLs we are willing to redirect a browser to. */
export function isSafePublicMediaUrl(candidate: string | null | undefined): boolean {
  if (!candidate) return false
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  return !isPrivateHost(url.hostname)
}

/**
 * Content-disposition safe filename. Keeps Unicode (encoded via RFC 5987) but
 * strips path separators, control characters and Windows reserved names.
 */
export function sanitizeFilename(value: string | null | undefined, fallback = 'video'): string {
  const cleaned = (value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u200e\u200f]/g, ' ')
    .replace(/[\\/<>:"|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim()
  const truncated = cleaned.length > 140 ? `${cleaned.slice(0, 137).trimEnd()}...` : cleaned
  const base = (truncated.replace(/\.(mp4|webm|mkv|m4a|mp3|mov|flv|avi)$/i, '') || fallback).trim()
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)
  return reserved ? `${fallback}-${base}` : base
}

/** ASCII-only fallback used for the `filename=` content-disposition parameter. */
export function asciiFilename(value: string): string {
  const folded = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
  return folded || 'video'
}

/* -------------------------------------------------------------------------- */
/*                                 Rate limiting                              */
/* -------------------------------------------------------------------------- */

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Fixed-window limiter kept in an LRU so it can never grow without bound.
 * Clients are hashed (never stored as raw IPs) so this stays privacy-friendly.
 */
const buckets = new LRUCache<string, Bucket>({ max: 20_000, ttl: 120_000 })
const inflight = new LRUCache<string, number>({ max: 20_000, ttl: 600_000 })

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** Anonymous but stable client identifier derived from the proxy headers. */
export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  const ip = first || request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for')
  const userAgent = request.headers.get('user-agent') ?? ''
  return ip ? fnv1a(`${ip}|${userAgent.slice(0, 64)}`) : `anon:${fnv1a(userAgent)}`
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  retryAfterSeconds: number
}

export function consumeRateLimit(scope: string, clientKey: string, limit: number): RateLimitResult {
  const now = Date.now()
  const key = `${scope}:${clientKey}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 }, { ttl: 60_000 })
    return { allowed: true, remaining: Math.max(0, limit - 1), limit, retryAfterSeconds: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return { allowed: false, remaining: 0, limit, retryAfterSeconds }
  }
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), limit, retryAfterSeconds: 0 }
}

/**
 * Counts concurrent downloads per client and returns a release closure that
 * must run exactly once (it also runs when the visitor cancels the download).
 */
export function acquireSlot(scope: string, clientKey: string, max: number) {
  const key = `${scope}:${clientKey}`
  const current = inflight.get(key) ?? 0
  if (current >= max) return { acquired: false as const, release: () => {} }
  inflight.set(key, current + 1)
  let released = false
  return {
    acquired: true as const,
    release: () => {
      if (released) return
      released = true
      const next = (inflight.get(key) ?? 1) - 1
      if (next <= 0) inflight.delete(key)
      else inflight.set(key, next)
    }
  }
}
