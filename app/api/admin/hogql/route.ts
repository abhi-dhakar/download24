/**
 * POST /api/admin/hogql
 *
 * The power tool of the admin dashboard: runs an arbitrary *read-only* HogQL
 * query against the project (SELECT/WITH only — the runner in
 * lib/posthogApi.ts rejects anything else) and returns plain table results.
 *
 * Protections, in order:
 *   1. signed session cookie (same check as every /admin page)
 *   2. 30 queries/minute per client (the PostHog side is capped at 240/h)
 *   3. body ≤ 16 KB, query ≤ 10 000 chars
 *   4. server-side caps on the response (500 rows / ~1.5 MB JSON)
 *
 * The personal API key never leaves this route.
 */

import { NextResponse } from 'next/server'

import { cookies } from 'next/headers'

import { ADMIN_COOKIE, isAdminConfigured, verifySessionCookie } from '@/lib/adminAuth'
import { PosthogApiError, runHogql } from '@/lib/posthogApi'
import { clientKeyFromRequest, consumeRateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_BODY_BYTES = 16 * 1024
const MAX_QUERY_LENGTH = 10_000
const QUERIES_PER_MINUTE = 30
const MAX_ROWS = 500
const MAX_RESPONSE_BYTES = 1.5 * 1024 * 1024

export async function POST(request: Request): Promise<NextResponse> {
  const json = NextResponse.json

  if (!isAdminConfigured()) return json({ error: 'Admin is not configured.' }, { status: 404 })

  const store = await cookies()
  if (!verifySessionCookie(store.get(ADMIN_COOKIE)?.value)) {
    return json({ error: 'Authentication required.' }, { status: 401 })
  }

  const clientKey = clientKeyFromRequest(request)
  const limited = consumeRateLimit('admin:hogql', clientKey, QUERIES_PER_MINUTE)
  if (!limited.allowed) {
    return json({ error: 'Too many queries — try again in a minute.' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } })
  }

  let sql: unknown
  try {
    if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
      throw new Error('body too large')
    }
    const body: unknown = await request.json()
    sql = typeof body === 'object' && body !== null ? (body as { sql?: unknown }).sql : undefined
  } catch {
    return json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (typeof sql !== 'string' || sql.trim().length === 0) {
    return json({ error: 'Send { "sql": "SELECT …" }.' }, { status: 400 })
  }
  if (sql.length > MAX_QUERY_LENGTH) {
    return json({ error: `Query is too long (max ${MAX_QUERY_LENGTH} characters).` }, { status: 400 })
  }

  try {
    const result = await runHogql(sql, 'admin-dashboard')
    const rows = result.rows.slice(0, MAX_ROWS)

    // Fail closed on non-serialisable cells (there should be none).
    let payload: { columns: string[]; rows: unknown[][]; isCached: boolean; truncated: boolean }
    try {
      payload = {
        columns: result.columns,
        rows,
        isCached: result.isCached,
        truncated: result.rows.length > MAX_ROWS
      }
      if (JSON.stringify(payload).length > MAX_RESPONSE_BYTES) {
        const cut = Math.max(1, Math.floor(MAX_ROWS / 2))
        payload = {
          columns: result.columns,
          rows: result.rows.slice(0, cut),
          isCached: result.isCached,
          truncated: true
        }
      }
    } catch {
      return json({ error: 'Query result could not be serialised.' }, { status: 502 })
    }

    return json(payload)
  } catch (error) {
    if (error instanceof PosthogApiError) {
      const status = error.status && error.status >= 400 && error.status < 500 && error.status !== 429 ? 502 : error.status ?? 502
      return json({ error: error.message }, { status })
    }
    if (process.env.NODE_ENV !== 'production') console.warn('[admin:hogql] query failed', error)
    return json({ error: 'Query failed unexpectedly. Try again.' }, { status: 502 })
  }
}
