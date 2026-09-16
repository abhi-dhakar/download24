'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

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
    localStorage.setItem('download24_theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-line bg-white/[0.04]" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="group flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-white/70 transition-all duration-200 hover:border-line-strong hover:bg-white/[0.08] hover:text-white active:scale-95"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-accent transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-accent transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  )
}
