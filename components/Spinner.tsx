/**
 * Animated SVG loading state (no icon font, no extra dependency).
 *
 * Uses SMIL so it keeps moving even where the reduced-motion media query strips
 * CSS animations — the parent also swaps in `SpinnerStatic` for those users.
 * Strokes are fat (3px) to match the neo-brutalist line weight.
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
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
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
      <path d="M3 12a9 9 0 0 0 4.5 7.8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5">
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
      className="nb-panel nb-press nb-press-lg flex flex-col items-start gap-5 p-5 sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-btn border-[3px] border-line bg-sun text-[#101010]">
          <Spinner className="h-5 w-5" label="Extracting media links" />
        </span>
        <p className="font-display text-sm uppercase sm:text-base">{STAGES[safeStage]}…</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="nb-sheen relative h-24 w-full overflow-hidden rounded-2xl border-[3px] border-line bg-surface-2 sm:h-32" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="nb-skeleton h-12" />
          <div className="nb-skeleton h-12 [animation-delay:120ms]" />
          <div className="nb-skeleton h-12 [animation-delay:240ms]" />
          <div className="nb-skeleton h-12 [animation-delay:360ms]" />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-mute">
        Large catalogues and playlist pages can take a few seconds on the first request — afterwards the
        result is served from cache.
      </p>
    </div>
  )
}
