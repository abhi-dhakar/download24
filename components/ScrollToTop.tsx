'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * ScrollToTop ensures that navigating between pages always scrolls the window
 * to the very top, unless navigating explicitly to an in-page anchor hash.
 */
export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname])

  return null
}
