import Link from 'next/link'
import { ArrowDownToLine, Sparkles } from 'lucide-react'

import { SITE } from '@/lib/site'

const NAV = [
  { href: '/#downloader', label: 'Downloader' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-to-download', label: 'How it works' },
  { href: '/#supported-platforms', label: 'Platforms' },
  { href: '/#faq', label: 'FAQ' }
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-95"
          aria-label="Download24.in home"
        >
          {/* Logo Icon */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft via-accent to-accent-deep text-ink-950 shadow-glow transition-transform duration-200 group-hover:scale-105">
            <ArrowDownToLine className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
          </div>

          {/* Logo Typography */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Download<span className="text-accent">24</span>
                <span className="text-xs font-semibold text-white/40">.in</span>
              </span>
              <span className="hidden rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:inline-block">
                4K · MP3
              </span>
            </div>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-[13px] font-medium text-white/65">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Action Header Button */}
        <div className="flex items-center gap-2.5">
          <a
            href="/#downloader"
            className="group relative inline-flex items-center gap-2 rounded-xl border border-line-strong bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.08] hover:text-white active:scale-95 sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent transition-transform group-hover:rotate-12" aria-hidden="true" />
            <span>Paste Link</span>
          </a>
        </div>

      </div>
    </header>
  )
}