'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { KeyRound, Loader2 } from 'lucide-react'

/**
 * Token form for /admin/login. The shared secret is sent once over the same
 * origin and never stored in localStorage; the server answers with the
 * signed session cookie.
 */
export function LoginForm() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || token.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? `Login failed (HTTP ${res.status})`)
      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed — try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="admin-token" className="nb-label mb-2">
          Admin token
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
          <input
            id="admin-token"
            type="password"
            required
            minLength={8}
            maxLength={512}
            autoFocus
            autoComplete="current-password"
            spellCheck={false}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ADMIN_SECRET value"
            className="nb-input py-2.5 pr-3 pl-10 text-sm"
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          Value of <code className="text-[11px]">ADMIN_SECRET</code> from your deployment&apos;s
          environment. It is compared in constant time and never stored or logged.
        </p>
      </div>

      {error ? (
        <p role="alert" className="nb-inset border-danger bg-danger/15 px-3 py-2 text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || token.length === 0}
        className="nb-btn nb-btn-brand nb-btn-block"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {busy ? 'Verifying…' : 'Sign in'}
      </button>
      <p className="text-center text-[11px] text-ink-mute">5 attempts per minute, then a one-minute lockout.</p>
    </form>
  )
}
