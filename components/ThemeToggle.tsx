'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { EVENTS } from '@/lib/analytics'
import { track } from '@/lib/analyticsClient'

/**
 * Theme switch: a chunky square key that flips between the midnight ink theme
 * (default) and the cream paper theme (`html.light`). The class is applied
 * straight to `<html>` so the whole token set swaps without a re-render.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('download24_theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      document.documentElement.classList.toggle('light', stored === 'light')
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = prefersDark ? 'dark' : 'light'
      setTheme(initial)
      document.documentElement.classList.toggle('light', initial === 'light')
      document.documentElement.classList.toggle('dark', initial === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    track(EVENTS.themeToggled, { theme: next })
    localStorage.setItem('download24_theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  if (!mounted) {
    return <div className="h-10 w-10 rounded-btn border-[3px] border-line bg-surface" aria-hidden="true" />
  }

  const nextLabel = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      className="nb-btn nb-btn-sm h-10 w-10 !px-0"
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 text-sun" aria-hidden="true" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-brand" aria-hidden="true" />
      )}
    </button>
  )
}
