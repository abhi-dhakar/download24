'use client'

/**
 * Reports which FAQ entries visitors open. The accordion itself stays a
 * zero-JS server component; this sibling only listens for native `toggle`
 * events bubbling from its `<details data-faq-question>` elements.
 */

import { useEffect } from 'react'

import { EVENTS } from '@/lib/analytics'
import { track } from '@/lib/analyticsClient'

export function FaqTracker() {
  useEffect(() => {
    const onToggle = (event: Event) => {
      const target = event.target as HTMLDetailsElement | null
      if (!target || target.tagName !== 'DETAILS' || !target.open) return
      const question = target.dataset.faqQuestion
      if (question) track(EVENTS.faqOpened, { question })
    }
    // `toggle` does not bubble, so listen in the capture phase.
    document.addEventListener('toggle', onToggle, true)
    return () => document.removeEventListener('toggle', onToggle, true)
  }, [])
  return null
}
