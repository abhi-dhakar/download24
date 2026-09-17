/**
 * /admin/login
 *
 * A plain token form — no accounts, no sessions database. If a valid session
 * cookie already exists there is nothing to sign in to, so the page bounces
 * straight to the dashboard.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ShieldCheck } from 'lucide-react'

import { LoginForm } from '@/components/admin/LoginForm'
import { AdminDisabledNotice } from '@/components/admin/AdminSetupNotice'
import { ADMIN_COOKIE, isAdminConfigured, verifySessionCookie } from '@/lib/adminAuth'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false }
}

export default async function AdminLoginPage() {
  if (!isAdminConfigured()) {
    return <AdminDisabledNotice />
  }

  const store = await cookies()
  if (verifySessionCookie(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-900/70 p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <ShieldCheck className="h-5 w-5 text-accent-soft" aria-hidden />
          </span>
          <h1 className="font-display text-lg font-bold tracking-tight text-white">download24 admin</h1>
          <p className="mt-1 text-xs text-white/45">Sign in with the shared admin token.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center">
          <Link href="/" className="text-[11px] text-white/30 underline-offset-2 hover:text-white/60 hover:underline">
            ← Back to the site
          </Link>
        </p>
      </div>
    </div>
  )
}
