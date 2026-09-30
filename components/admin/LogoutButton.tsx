'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Loader2, LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onLogout() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      // The session is dead either way; always land on the login page.
      router.push('/admin/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="nb-btn nb-btn-sm"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <LogOut className="h-3.5 w-3.5" aria-hidden />}
      Sign out
    </button>
  )
}
