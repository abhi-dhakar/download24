'use client'

/**
 * Last-resort error boundary (replaces the root layout when it crashes).
 * Reports the failure to PostHog error tracking, then offers a reload.
 */

import { useEffect } from 'react'

import { trackException } from '@/lib/analyticsClient'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    trackException(error, { boundary: 'global', digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#05070f',
          color: '#fff',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        }}
      >
        <main style={{ maxWidth: 480, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6 }}>download24</p>
          <h1 style={{ fontSize: 24, margin: '12px 0' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.7 }}>
            The page hit an unexpected error. It has been reported automatically — reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: '10px 18px',
              borderRadius: 12,
              border: 0,
              background: '#0ea5e9',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
