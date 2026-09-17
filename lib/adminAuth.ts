/**
 * Authentication for the /admin dashboard.
 *
 * The rest of this app has no concept of a logged-in user, so the admin area
 * is gated the simplest way that stays hard to brute-force:
 *
 *   - a single shared secret from `ADMIN_SECRET` (never sent to the browser,
 *     never rendered, compared in constant time);
 *   - a short-lived (12 h) HMAC-signed session cookie: `HttpOnly`,
 *     `SameSite=Lax`, `Secure` in production;
 *   - login attempts rate-limited per client (5/min) by the same limiter the
 *     public API uses;
 *   - fail closed: if `ADMIN_SECRET` is unset (or too short) the dashboard
 *     renders a setup notice and every admin API route 404s.
 *
 * The cookie carries no data about *who*: it is `v1.<expiry>.<nonce>.<sig>`
 * where `sig = HMAC-SHA256(ADMIN_SECRET, "v1|expiry|nonce")`. Rotating
 * `ADMIN_SECRET` therefore instantly invalidates every live session.
 */

import 'server-only'

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'd24_admin'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const MIN_SECRET_LENGTH = 12

/** The shared admin secret, or `undefined` when admin is not enabled. */
export function getAdminSecret(): string | undefined {
  const secret = process.env.ADMIN_SECRET?.trim()
  if (!secret) return undefined
  if (secret.length < MIN_SECRET_LENGTH) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[admin] ADMIN_SECRET is set but shorter than ${MIN_SECRET_LENGTH} characters — ` +
          'the admin dashboard stays DISABLED. Use a long random value, e.g. `openssl rand -hex 32`.'
      )
    }
    return undefined
  }
  return secret
}

export function isAdminConfigured(): boolean {
  return getAdminSecret() !== undefined
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/** Constant-time comparison — the secret is never echoed, logged or stored. */
export function verifyAdminToken(candidate: unknown): boolean {
  const secret = getAdminSecret()
  if (!secret || typeof candidate !== 'string') return false
  const a = sha256(secret)
  const b = sha256(candidate)
  return a.length === b.length && timingSafeEqual(a, b)
}

const b64url = {
  encode: (bytes: Buffer): string => bytes.toString('base64url'),
  decode: (value: string): Buffer | null => {
    try {
      return Buffer.from(value, 'base64url')
    } catch {
      return null
    }
  }
}

/** Builds the signed session cookie value. */
export function createSessionCookie(): string {
  const secret = getAdminSecret()
  if (!secret) throw new Error('ADMIN_SECRET is not configured')
  const expiresAt = Date.now() + SESSION_TTL_MS
  const nonce = randomBytes(16)
  const payload = `v1|${expiresAt}|${nonce.toString('base64url')}`
  const sig = createHmac('sha256', secret).update(payload, 'utf8').digest()
  return `v1.${b64url.encode(Buffer.from(String(expiresAt), 'utf8'))}.${nonce.toString('base64url')}.${b64url.encode(sig)}`
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Validates structure, expiry and signature of a session cookie. */
export function verifySessionCookie(value: string | undefined): boolean {
  const secret = getAdminSecret()
  if (!secret || !value) return false

  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return false

  const [expiresPart, noncePart, sigPart] = parts.slice(1)
  const expiresBuf = b64url.decode(expiresPart)
  const nonceBuf = b64url.decode(noncePart)
  const sigBuf = b64url.decode(sigPart)
  if (!expiresBuf || !nonceBuf || !sigBuf) return false

  const expiresAt = Number(expiresBuf.toString('utf8'))
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false

  const expected = createHmac('sha256', secret)
    .update(`v1|${expiresAt}|${nonceBuf.toString('base64url')}`, 'utf8')
    .digest()
  if (!safeEqual(expected, sigBuf)) return false

  return true
}

/** Options shared by every cookie write in this app's admin area. */
export function adminCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // '/' on purpose: the cookie is SET from /api/admin/login, and a browser
    // rejects a Set-Cookie whose path does not cover the request URI. The
    // value is useless without ADMIN_SECRET, so path scoping adds nothing.
    path: '/',
    maxAge: maxAgeSeconds
  }
}
