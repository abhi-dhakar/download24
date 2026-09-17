/**
 * POST /api/admin/login
 *
 * Exchanges the shared `ADMIN_SECRET` (sent as `token` in a JSON body) for a
 * signed 12 h session cookie. Rate-limited to 5 attempts/minute per client so
 * a leaked UI cannot be brute-forced; failures return one generic message.
 */

import { NextResponse } from 'next/server'

import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createSessionCookie,
  isAdminConfigured,
  verifyAdminToken
} from '@/lib/adminAuth'
import { clientKeyFromRequest, consumeRateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_BODY_BYTES = 8 * 1024
const LOGIN_ATTEMPTS_PER_MINUTE = 5

export async function POST(request: Request): Promise<NextResponse> {
  const json = NextResponse.json

  if (!isAdminConfigured()) return json({ error: 'Admin is not configured.' }, { status: 404 })

  const clientKey = clientKeyFromRequest(request)
  const limited = consumeRateLimit('admin:login', clientKey, LOGIN_ATTEMPTS_PER_MINUTE)
  if (!limited.allowed) {
    return json({ error: 'Too many attempts — try again in a minute.' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } })
  }

  let candidate: unknown
  try {
    if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
      throw new Error('body too large')
    }
    const body: unknown = await request.json()
    candidate = typeof body === 'object' && body !== null ? (body as { token?: unknown }).token : undefined
  } catch {
    return json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!verifyAdminToken(candidate)) {
    // Deliberately identical to any other failure mode.
    return json({ error: 'Invalid token.' }, { status: 401 })
  }

  const response = json({ ok: true }, { status: 200 })
  response.cookies.set(ADMIN_COOKIE, createSessionCookie(), adminCookieOptions())
  return response
}

export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
