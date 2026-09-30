'use client'

/**
 * Last-resort error boundary (replaces the root layout when it crashes).
 * Reports the failure to PostHog error tracking, then offers a reload.
 *
 * Styled with the same neo-brutalist language as the rest of the site, but
 * written with inline styles on purpose: this boundary renders when the root
 * layout is gone, so no Tailwind class or webfont can be relied on.
 */

import { useEffect } from 'react'

import { trackException } from '@/lib/analyticsClient'

const INK = '#101010'
const PAPER = '#fff9ec'
const SUN = '#ffd23f'
const BRAND = '#2f5bff'

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
          background: PAPER,
          backgroundImage: `radial-gradient(rgba(16,16,16,0.14) 1.15px, transparent 1.15px)`,
          backgroundSize: '22px 22px',
          color: INK,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: 20
        }}
      >
        <main
          style={{
            maxWidth: 520,
            width: '100%',
            padding: 32,
            textAlign: 'center',
            background: '#ffffff',
            border: `3px solid ${INK}`,
            borderRadius: 22,
            boxShadow: `11px 11px 0 0 ${INK}`
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              border: `3px solid ${INK}`,
              borderRadius: 999,
              background: SUN,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              fontWeight: 800
            }}
          >
            download24
          </span>

          <h1 style={{ fontSize: 28, lineHeight: 1.05, margin: '18px 0 0', textTransform: 'uppercase' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: '12px 0 0' }}>
            The page hit an unexpected error. It has been reported automatically — reloading usually fixes
            it.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '12px 22px',
              borderRadius: 12,
              border: `3px solid ${INK}`,
              background: BRAND,
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `5px 5px 0 0 ${INK}`
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
