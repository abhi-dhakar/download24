/**
 * /admin · shared shell for the dashboard pages only.
 *
 * This lives in the `(dashboard)` route group on purpose: /admin/login must
 * NOT sit behind the auth redirect, or an unauthenticated visitor would loop
 * login → redirect → login forever.
 *
 * Auth flow (all server-side):
 *   1. no ADMIN_SECRET            → setup notice, nothing else is reachable
 *   2. ADMIN_SECRET set, no cookie → redirect to /admin/login
 *   3. signed, unexpired cookie   → dashboard + signed session
 *
 * The layout also resolves the PostHog project (name + deep links) once per
 * hour and shows it as a "connected to" badge — the first thing an operator
 * should verify is *which* project they are looking at.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ExternalLink, ShieldCheck } from 'lucide-react'

import { AdminNav } from '@/components/admin/AdminNav'
import { AdminDisabledNotice } from '@/components/admin/AdminSetupNotice'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { ADMIN_COOKIE, isAdminConfigured, verifySessionCookie } from '@/lib/adminAuth'
import { getProjectInfo } from '@/lib/posthogApi'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · download24' },
  description: 'Operator dashboard for download24 telemetry.',
  robots: { index: false, follow: false }
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isAdminConfigured()) {
    return <AdminDisabledNotice />
  }

  const store = await cookies()
  if (!verifySessionCookie(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login')
  }

  const project = await getProjectInfo()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-line bg-ink-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/65">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="flex shrink-0 items-center gap-2" aria-label="Admin overview">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
                <ShieldCheck className="h-4 w-4 text-accent-soft" aria-hidden />
              </span>
              <span className="hidden font-display text-sm font-bold tracking-tight text-white sm:inline">
                download24 <span className="text-white/40">admin</span>
              </span>
            </Link>
            <AdminNav />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={project.uiOverviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group hidden items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-white/55 transition-colors hover:border-accent/40 hover:text-white md:inline-flex"
              title={`Open ${project.name} in the PostHog web UI`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
              <span className="max-w-40 truncate">{project.name}</span>
              <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" aria-hidden />
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-white/30 sm:px-6">
          <p>
            Session signed with <code>ADMIN_SECRET</code>, valid 12 h · queries run server-side against{' '}
            <code className="text-white/45">{project.apiHost}</code>
          </p>
          <p>
            <Link href="/" className="underline-offset-2 hover:text-white/60 hover:underline">
              ← Back to the site
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
