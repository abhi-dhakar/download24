/**
 * POST /api/admin/logout
 *
 * Clears the signed session cookie. Accepts any POST (the cookie value is
 * irrelevant — deleting it is idempotent); the login page re-authenticates.
 */

import { NextResponse } from 'next/server'

import { ADMIN_COOKIE } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true })
  // maxAge 0 + past expiry covers browsers that ignore one of the two.
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  })
  return response
}
