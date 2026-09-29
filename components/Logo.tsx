/**
 * Flat, chunky download24 mark.
 *
 * Replaces the old glossy 3D bitmap (`public/logo.png`) so the brand matches
 * the neo-brutalist language: a sun-yellow plate, 3px ink outline, fat glyph.
 * Inline SVG (no image request, no CLS, crisp at any size) — the glyph colours
 * are hard-coded on purpose, the plate is always candy-yellow in both themes.
 */
export function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="download24 logo"
      focusable="false"
    >
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#ffd23f" stroke="#101010" strokeWidth="3.5" />
      <path
        d="M24 12.5v15.5"
        stroke="#101010"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M15.5 22.5 24 31l8.5-8.5"
        fill="none"
        stroke="#101010"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 36.5h20" stroke="#101010" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

/** Wordmark: Archivo Black "download24" with a mono `.in` tag. */
export function Wordmark({ suffix = '.in' }: { suffix?: string }) {
  return (
    <span className="flex items-baseline gap-0.5 font-display text-[1.05rem] tracking-tight uppercase">
      download24
      <span className="font-mono text-[0.7rem] font-bold text-ink-mute">{suffix}</span>
    </span>
  )
}
