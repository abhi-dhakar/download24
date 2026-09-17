'use client'

import { useEffect } from 'react'

import { EVENTS } from '@/lib/analytics'
import { track } from '@/lib/analyticsClient'

/** Records broken inbound links so they show up in PostHog, not only in server logs. */
export function NotFoundTracker() {
  useEffect(() => {
    track(EVENTS.notFoundViewed, {
      path: window.location.pathname,
      referrer: document.referrer || null
    })
  }, [])
  return null
}
