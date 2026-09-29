'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/hogql', label: 'SQL' }
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin">
      <ul className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`rounded-pill border-[2.5px] border-line px-3 py-1 font-mono text-[11px] font-bold tracking-wide uppercase transition-colors ${
                  active ? 'bg-sun text-[#101010] shadow-hard-xs' : 'bg-surface text-ink hover:bg-surface-2'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
