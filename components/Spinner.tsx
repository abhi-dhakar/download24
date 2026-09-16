/**
 * Animated SVG loading state (no icon-font, no extra dependency).
 *
 * Uses SMIL so it works even if the reduced-motion media query strips CSS
 * animations — the parent also swaps in `SpinnerStatic` for those users.
 */

export function Spinner({ className = 'h-5 w-5', label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={label ?? 'Working'}
      focusable="false"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" opacity="0.22" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </path>
      <path d="M3 12a9 9 0 0 0 4.5 7.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.5">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="1.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}

/** Three-step status line shown while the extractor walks the source page. */
const STAGES = ['Reading the link', 'Collecting every stream', 'Sorting by quality']

export function LoadingPanel({ stage = 0 }: { stage?: number }) {
  const safeStage = Math.max(0, Math.min(STAGES.length - 1, stage))
  return (
    <div
      className="glass-card flex flex-col items-start gap-4 rounded-(--radius-card) p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <Spinner className="h-6 w-6 text-accent" label="Extracting media links" />
        <p className="text-sm font-medium text-white/90">{STAGES[safeStage]}…</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <div className="relative h-24 w-full overflow-hidden rounded-xl bg-ink-800 sheen" />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="h-11 animate-pulse-soft rounded-lg bg-ink-800" />
          <div className="h-11 animate-pulse-soft rounded-lg bg-ink-800 [animation-delay:120ms]" />
          <div className="h-11 animate-pulse-soft rounded-lg bg-ink-800 [animation-delay:240ms]" />
          <div className="h-11 animate-pulse-soft rounded-lg bg-ink-800 [animation-delay:360ms]" />
        </div>
      </div>
      <p className="text-xs text-white/45">
        Large catalogues and playlist pages can take a few seconds on the first request — afterwards the
        result is served from cache.
      </p>
    </div>
  )
}
