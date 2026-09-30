'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownToLine, ClipboardPaste, Menu, Sparkles, X } from 'lucide-react'

import { PLATFORM_PAGES } from '@/lib/platformPages'
import { Logo, Wordmark } from './Logo'
import { PlatformMark } from './PlatformMark'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { href: '/', label: 'Downloader' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/platforms', label: 'Platforms' },
  { href: '/faq', label: 'FAQ' }
]


export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Prevent body scrolling when the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50">
      {/* ------------------------------------------------------- nav plate */}
      <div className="border-b-[3px] border-line bg-paper/92 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            aria-label="download24.in home"
            className="group flex shrink-0 items-center gap-2.5"
          >
            <Logo className="h-9 w-9 transition-transform duration-150 group-hover:-rotate-6" />
            <span className="inline-flex text-ink">
              <Wordmark />
            </span>
          </Link>

          {/* centre: desktop navigation */}
          <nav aria-label="Main Navigation" className="hidden lg:block">
            <ul className="flex items-center gap-1.5">
              {NAV.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex items-center rounded-pill border-[2.5px] border-line px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-colors ${
                        active
                          ? 'bg-sun text-[#101010] shadow-hard-xs'
                          : 'bg-surface text-ink hover:bg-surface-2'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />

            <a href="/#downloader" onClick={() => setMobileOpen(false)} className="nb-btn nb-btn-brand nb-btn-sm hidden sm:inline-flex">
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Paste link</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="nb-btn nb-btn-sm h-10 w-10 !px-0 lg:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5 text-danger" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-6rem)] overflow-y-auto border-t-[3px] border-line bg-paper px-4 py-5 lg:hidden"
        >
          <div className="flex flex-col gap-6">
            <a
              href="/#downloader"
              onClick={() => setMobileOpen(false)}
              className="nb-btn nb-btn-brand nb-btn-lg nb-btn-block"
            >
              <ClipboardPaste className="h-5 w-5" aria-hidden="true" />
              Paste a link now
            </a>

            <nav aria-label="Mobile navigation">
              <p className="nb-kicker">Browse</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {NAV.map((item, index) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`nb-press nb-press-xs flex items-center gap-3 rounded-btn border-[3px] border-line px-4 py-3 font-display text-base uppercase ${
                        isActive(item.href) ? 'bg-sun text-[#101010]' : 'bg-surface text-ink'
                      }`}
                    >
                      <span className="font-mono text-[11px] font-bold text-ink-mute">
                        0{index + 1}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="nb-kicker">Dedicated downloaders</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {Object.values(PLATFORM_PAGES).map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="nb-press nb-press-xs flex items-center gap-2.5 rounded-xl border-[2.5px] border-line bg-surface px-2.5 py-2.5 font-mono text-[11px] font-bold uppercase"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-line bg-surface-2">
                      <PlatformMark id={page.platformId} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{page.shortTitle}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="nb-band -mx-4 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px]">
              <Link href="/terms" onClick={() => setMobileOpen(false)} className="nb-link">
                Terms
              </Link>
              <Link href="/privacy" onClick={() => setMobileOpen(false)} className="nb-link">
                Privacy
              </Link>
              <span className="flex items-center gap-1 font-mono text-ink-mute">
                <Sparkles className="h-3 w-3 text-sun" aria-hidden="true" />© {new Date().getFullYear()}{' '}
                download24
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
