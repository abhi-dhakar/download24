import Link from 'next/link'

import { KeyRound, ShieldCheck } from 'lucide-react'

function EnvChip({ name }: { name: string }) {
  return <code className="rounded-md border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-accent-soft">{name}</code>
}

/** Shown on /admin + /admin/login when ADMIN_SECRET is not configured. */
export function AdminDisabledNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-ink-900/70 p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink-950">
            <ShieldCheck className="h-5 w-5 text-warn" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Admin dashboard is disabled</h1>
            <p className="text-xs text-white/45">No authentication is possible until a shared secret is configured.</p>
          </div>
        </div>

        <ol className="mt-6 space-y-3 text-sm leading-relaxed text-white/70">
          <li>
            <span className="font-semibold text-white">1.</span> Generate a long random secret:
            <pre className="mt-1.5 overflow-auto rounded-lg border border-line bg-ink-950 p-2.5 font-mono text-xs text-white/80">
              openssl rand -hex 32
            </pre>
          </li>
          <li>
            <span className="font-semibold text-white">2.</span> Export it as <EnvChip name="ADMIN_SECRET" /> on the deployment that runs
            this app.
          </li>
          <li>
            <span className="font-semibold text-white">3.</span> Restart the app and open <Link className="text-accent-soft underline-offset-2 hover:underline" href="/admin/login">/admin/login</Link>.
            The secret signs a 12-hour session cookie; rotate it at any time to kill every live session.
          </li>
        </ol>

        <p className="mt-6 rounded-lg border border-line bg-ink-950/70 p-3 text-[11px] leading-relaxed text-white/40">
          With the secret unset there is no login endpoint and no brute-force surface — every <code className="text-white/60">/admin</code>{' '}
          and <code className="text-white/60">/api/admin/*</code> route stays inert.
        </p>
      </div>
    </div>
  )
}

interface PosthogSetupNoticeProps {
  missing: string[]
}

/** Shown inside /admin when the PostHog read API is not fully configured. */
export function PosthogSetupNotice({ missing }: PosthogSetupNoticeProps) {
  return (
    <div className="rounded-2xl border border-line bg-ink-900/70 p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink-950">
          <KeyRound className="h-5 w-5 text-warn" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-lg font-bold text-white">Connect PostHog data</h1>
          <p className="text-xs text-white/45">The dashboard is signed in, but it cannot query the project yet.</p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-white/70">
        Set these environment variables on the app and restart:
      </p>
      <ul className="mt-3 space-y-2">
        {missing.map((name) => (
          <li key={name} className="flex flex-wrap items-center gap-2 text-sm">
            <EnvChip name={name} />
          </li>
        ))}
      </ul>

      <ol className="mt-5 space-y-3 text-sm leading-relaxed text-white/70">
        <li>
          <span className="font-semibold text-white">1.</span> In PostHog: <span className="text-white/90">Settings → Your account → API keys</span>, create a{' '}
          <span className="text-white/90">personal API key</span> with the <span className="text-white/90">Query Read</span> permission.
          Project tokens (<code className="text-white/60">phc_…</code>) only ingest — they cannot run queries.
        </li>
        <li>
          <span className="font-semibold text-white">2.</span>{' '}
          <span className="text-white/90">POSTHOG_PROJECT_ID</span> is optional — when unset, the dashboard resolves it automatically by matching{' '}
          <span className="text-white/90">NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN</span>.
        </li>
      </ol>

      <p className="mt-6 rounded-lg border border-line bg-ink-950/70 p-3 text-[11px] leading-relaxed text-white/40">
        The key stays on the server. The dashboard issues HogQL queries through the PostHog API on your behalf — the same 240-queries/hour
        budget PostHog gives every project, with a 60-second result cache to be a good neighbour.
      </p>
    </div>
  )
}
