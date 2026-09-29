import type { ReactNode } from 'react'

/**
 * Interior-page hero: mono kicker on a candy tab, chunky display headline with
 * an optional highlighted word, a lead paragraph and a slot for CTAs/badges.
 *
 * Server component — used by /features, /how-it-works, /platforms, /faq and the
 * legal pages so every page opens with the same brutalist rhythm.
 */
export function PageHero({
  kicker,
  title,
  lead,
  children,
  tone = 'bg-sun text-[#101010]'
}: {
  kicker: string
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  tone?: string
}) {
  return (
    <section className="relative isolate overflow-hidden border-b-[3px] border-line bg-paper-2 pt-10 pb-12 sm:pt-14">
      <div aria-hidden="true" className="nb-grid-lines pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rotate-12 rounded-[2rem] border-[3px] border-line bg-punch opacity-20"
      />

      <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
        <p className={`nb-sticker ${tone}`}>{kicker}</p>
        <h1 className="nb-h1 mt-5">{title}</h1>
        {lead ? <p className="nb-lead mx-auto mt-4 max-w-2xl">{lead}</p> : null}
        {children ? (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  )
}

/**
 * In-page section heading: eyebrow, display title and optional lead, with a
 * right-aligned action slot. `align="center"` gives the centred variant used
 * for FAQ-style blocks.
 */
export function SectionHeading({
  kicker,
  title,
  lead,
  action,
  align = 'left',
  className = '',
  headingId
}: {
  kicker?: string
  title: ReactNode
  lead?: ReactNode
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
  /** Optional id so a wrapping `<section aria-labelledby>` can point at it. */
  headingId?: string
}) {
  return (
    <div
      className={`flex flex-wrap gap-4 ${
        align === 'center'
          ? 'flex-col items-center text-center'
          : 'items-end justify-between'
      } ${className}`}
    >
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {kicker ? <p className="nb-kicker">{kicker}</p> : null}
        <h2 id={headingId} className="nb-h2 mt-3">
          {title}
        </h2>
        {lead ? <p className="nb-lead mt-3">{lead}</p> : null}
      </div>
      {action}
    </div>
  )
}

/**
 * Coloured callout plate — the "good to know" card used on the landing page and
 * the features/FAQ pages. `tone` paints the header strip.
 */
export function NoteCard({
  tone = 'bg-sun text-[#101010]',
  tab = 'Good to know',
  title,
  icon,
  children
}: {
  tone?: string
  tab?: string
  title: ReactNode
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <article className="nb-card nb-press-card flex h-full flex-col overflow-hidden">
      <span
        aria-hidden="true"
        className={`flex items-center gap-2 border-b-[3px] border-line px-4 py-2 font-mono text-[10px] font-bold tracking-[0.16em] uppercase ${tone}`}
      >
        {icon}
        {tab}
      </span>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-sm uppercase">{title}</h3>
        <div className="mt-2 text-[13px] leading-relaxed text-ink-soft">{children}</div>
      </div>
    </article>
  )
}

/** Candy terminal CTA plate, reused at the bottom of every marketing page. */
export function CtaPlate({
  heading,
  body,
  href = '/#downloader',
  cta,
  icon,
  tone = 'bg-sun',
  headingId
}: {
  heading: string
  body?: string
  href?: string
  cta: string
  icon?: ReactNode
  tone?: string
  /** Optional id so the wrapping `<section aria-labelledby>` can point at it. */
  headingId?: string
}) {
  return (
    <div className={`nb-panel nb-press nb-press-xl relative overflow-hidden p-6 text-center text-[#101010] sm:p-10 ${tone}`}>
      <div aria-hidden="true" className="nb-halftone absolute inset-0 text-[#101010] opacity-25" />
      <div className="relative">
        <h2 id={headingId} className="nb-h2 !text-[#101010]">
          {heading}
        </h2>
        {body ? (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed font-medium text-[#101010]/80 sm:text-base">
            {body}
          </p>
        ) : null}
        <a href={href} className="nb-btn nb-btn-brand mt-6">
          {icon}
          {cta}
        </a>
      </div>
    </div>
  )
}
