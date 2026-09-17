import type { ReactNode } from 'react'

import { TriangleAlert } from 'lucide-react'

interface SectionCardProps {
  title: string
  hint?: string
  /** Human-readable error for this section; the rest of the page still renders. */
  error?: string | null
  children: ReactNode
  className?: string
}

export function SectionCard({ title, hint, error, children, className }: SectionCardProps) {
  return (
    <section className={`overflow-hidden rounded-xl border border-line bg-ink-900/70 ${className ?? ''}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-white/90">{title}</h2>
        {hint ? <p className="text-xs text-white/40">{hint}</p> : null}
      </header>
      {error ? (
        <div
          role="alert"
          className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}
