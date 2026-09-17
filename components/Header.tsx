'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardPaste, Menu, X } from 'lucide-react'

import { PLATFORM_PAGES } from '@/lib/platformPages'
import { PlatformMark } from './PlatformMark'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { href: '/downloader', label: 'Downloader' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/platforms', label: 'Platforms' },
  { href: '/faq', label: 'FAQ' }
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/65">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-3 transition-opacity hover:opacity-95"
          aria-label="Download24.in home"
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Download24 logo"
              width={32}
              height={32}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Download<span className="text-accent">24</span>
                <span className="text-xs font-semibold text-white/40">.in</span>
              </span>
              {/* <span className="hidden rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:inline-block">
                4K · MP3
              </span> */}
            </div>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-[13px] font-medium text-white/65">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />

          <a
            href="/#downloader"
            onClick={() => setMobileOpen(false)}
            className="hidden sm:inline-flex group relative items-center gap-2 rounded-xl border border-line-strong bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.08] hover:text-white active:scale-95 sm:px-4 sm:text-sm"
          >
            <ClipboardPaste
              className="h-3.5 w-3.5 text-accent transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
            <span>Paste Link</span>
          </a>

          {/* Hamburger Mobile Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-white/80 transition-all hover:border-line-strong hover:bg-white/[0.08] hover:text-white active:scale-95 lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-accent" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer / Dropdown Navigation */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-ink-950/98 p-5 backdrop-blur-2xl lg:hidden"
        >
          <div className="flex flex-col gap-6">
            
            {/* Quick Action Button for Mobile */}
            <a
              href="/#downloader"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep py-3 text-sm font-bold text-white shadow-glow"
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              <span>Paste Video Link Now</span>
            </a>

            {/* Main Links */}
            <div>
              <p className="px-1 text-[11px] font-semibold text-accent uppercase tracking-wider">
                Quick Navigation
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/[0.06] hover:text-white"
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-white/30">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dedicated Platform Downloaders */}
            <div className="border-t border-line/60 pt-4">
              <p className="px-1 text-[11px] font-semibold text-accent uppercase tracking-wider">
                Dedicated Platform Engines
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.values(PLATFORM_PAGES).map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-2.5 text-xs font-medium text-white/80 hover:border-line-strong hover:bg-white/[0.05] hover:text-white"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-ink-900 ring-1 ring-line">
                      <PlatformMark id={page.platformId} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{page.shortTitle}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal Links Footer */}
            <div className="flex items-center justify-between border-t border-line/60 pt-4 text-xs text-white/45">
              <Link href="/terms" onClick={() => setMobileOpen(false)} className="hover:text-white">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" onClick={() => setMobileOpen(false)} className="hover:text-white">
                Privacy Policy
              </Link>
              <span>•</span>
              <span>© {new Date().getFullYear()} download24</span>
            </div>

          </div>
        </div>
      )}
    </header>
  )
}
