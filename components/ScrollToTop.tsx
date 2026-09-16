'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Reset the scroll position on client-side route pushes.
 *
 * The App Router keeps the shared root layout mounted between pages, so a
 * navigation from one platform page to another (e.g.
 * `/youtube-video-download` → `/instagram-video-download`, or a footer /
 * PlatformGrid link clicked halfway down the page) can leave the new page
 * scrolled at the old offset. This guarantees every freshly pushed page
 * starts at the top, while deliberately NOT interfering with:
 *  - back/forward buttons (the browser restores the previous scroll offset),
 *  - the initial page load / full reloads,
 *  - hash navigations (`/#faq`, `/terms#copyright`), where the browser /
 *    Next.js anchor handling should win instead.
 */
export function ScrollToTop() {
  const pathname = usePathname()
  const pushRef = useRef(false)
  const firstRef = useRef(true)

  // `next/link` navigations go through `history.pushState`; back/forward go
  // through `popstate` — so this flag tells the two apart.
  useEffect(() => {
    const originalPush = window.history.pushState.bind(window.history)
    window.history.pushState = (...args) => {
      pushRef.current = true
      return originalPush(...args)
    }
    return () => {
      window.history.pushState = originalPush
    }
  }, [])

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    const wasPush = pushRef.current
    pushRef.current = false
    if (!wasPush) return
    // Let anchor links scroll naturally.
    if (window.location.hash) return
    // `instant` overrides the `scroll-behavior: smooth` on <html> so a long
    // page doesn't visibly animate all the way back up.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return null
}
