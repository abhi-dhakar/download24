/**
 * In-memory LRU cache for extraction results (zero database overhead).
 *
 * Keying deliberately drops tracking junk (`?si=`, `?utm_*`, `?t=`) so that the
 * same video pasted from a mobile share sheet, a desktop browser tab or a
 * "short link" redirect lands on one cache entry.
 */

import { LRUCache } from 'lru-cache'

import { LIMITS } from './site'
import type { ParsePayload } from './types'

const VOLATILE_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'feature',
  'si',
  'igsh',
  'igshid',
  'share',
  'share_url',
  'from',
  'ref',
  'ref_src',
  'ref_url',
  'source',
  'rcount',
  '_r',
  't',
  'start',
  'end',
  'time_continue',
  'pp',
  'sec_params',
  'sec_result',
  'cache',
  '_t',
  'nonce',
  'timestamp',
  'rel',
  'controls',
  'disablekb',
  'modestbranding',
  'autoplay',
  'loop',
  'muted',
  'enablejsapi',
  'origin',
  'embed',
  'player_referrer',
  'iv',
  'sns',
  'app',
  'version',
  'hl',
  'lang'
])

/** Canonical form of a media URL used for cache keying (not for extraction). */
export function normalizeSourceUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl.trim().slice(0, 512)
  }
  url.hash = ''
  url.hostname = url.hostname.replace(/^www\./, '').toLowerCase()
  url.protocol = url.protocol.toLowerCase()
  const kept = new URLSearchParams()
  for (const [key, value] of url.searchParams) {
    if (VOLATILE_PARAMS.has(key.toLowerCase())) continue
    kept.append(key, value)
  }
  const search = [...kept.entries()].sort(([a], [b]) => a.localeCompare(b))
  url.search = search.length > 0 ? `?${new URLSearchParams(search).toString()}` : ''
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().slice(0, 512)
}

export interface CacheKeyInput {
  url: string
  playlistLimit?: number
}

export function cacheKeyFor({ url, playlistLimit }: CacheKeyInput): string {
  const normalized = normalizeSourceUrl(url)
  return playlistLimit ? `${normalized}#pl=${playlistLimit}` : normalized
}

export const parseCache = new LRUCache<string, ParsePayload>({
  max: LIMITS.cacheMaxEntries,
  ttl: LIMITS.cacheTtlMs,
  ttlAutopurge: true,
  updateAgeOnGet: false,
  dispose: (_value, _key, reason) => {
    if (process.env.NEXT_PUBLIC_DEBUG_CACHE === '1' && reason !== 'set') {
      console.debug(`[cache] evicted (${reason})`)
    }
  }
})

export interface CacheStats {
  size: number
  max: number
  ttlMs: number
  remainingMs: number | null
}

export function cacheStats(key: string): CacheStats {
  const ttl = parseCache.getRemainingTTL(key)
  return {
    size: parseCache.size,
    max: LIMITS.cacheMaxEntries,
    ttlMs: LIMITS.cacheTtlMs,
    remainingMs: Number.isFinite(ttl) ? Math.max(0, Math.round(ttl)) : null
  }
}

/** Short, human-readable remaining TTL used in the `X-Cache-Ttl` header. */
export function formatTtl(remainingMs: number | null): string {
  if (remainingMs === null) return '0'
  return `${Math.round(remainingMs / 1000)}s`
}
