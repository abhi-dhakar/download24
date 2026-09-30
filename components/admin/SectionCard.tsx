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
    <section className={`nb-card overflow-hidden ${className ?? ''}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-[3px] border-line bg-surface-2 px-5 py-3">
        <h2 className="font-display text-sm uppercase">{title}</h2>
        {hint ? <p className="font-mono text-[11px] text-ink-mute">{hint}</p> : null}
      </header>
      {error ? (
        <div
          role="alert"
          className="nb-inset mx-5 mt-4 flex items-start gap-2 border-danger bg-danger/15 px-3 py-2 text-xs leading-relaxed text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}
