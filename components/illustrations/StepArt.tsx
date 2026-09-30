/**
 * StepArt — illustrations for the four "how to download" steps.
 *
 * Variants map 1:1 to HOW_TO_STEPS in lib/seo (copy → paste → quality → save).
 * Same brutalist drawing system as FeatureArt / HeroIllustration: flat candy
 * fills, thick ink outlines, hard offset shadows, token colours, CSS-class
 * motion, `aria-hidden` (the step heading carries the meaning).
 */

import type { JSX } from 'react'

export type StepArtVariant = 'copy' | 'paste' | 'quality' | 'save'

const INK = 'var(--color-line)'
const SHADOW = 'var(--color-line)'

const ART: Record<StepArtVariant, JSX.Element> = {
  /* Step 1 — copy the share link. */
  copy: (
    <g>
      {/* back sheet */}
      <rect x="46" y="24" width="76" height="86" rx="12" fill={SHADOW} />
      <rect x="40" y="18" width="76" height="86" rx="12" fill="var(--color-aqua)" stroke={INK} strokeWidth="3.5" />
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
        <path d="M56 40h34" />
        <path d="M56 56h44" />
        <path d="M56 72h24" />
      </g>

      {/* link chain badge */}
      <g className="animate-bob">
        <rect x="96" y="76" width="64" height="42" rx="12" fill="var(--color-sun)" stroke={INK} strokeWidth="3.5" />
        <path
          d="M114 97h9m-9-5v10m9-10v10m5-5h4a6 6 0 0 1 0 12h-3"
          stroke="#101010"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* sparkle */}
      <path d="M150 26v14M143 33h14" stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft" />
    </g>
  ),

  /* Step 2 — paste it into the box and press go. */
  paste: (
    <g>
      {/* input bar */}
      <rect x="20" y="30" width="140" height="44" rx="14" fill={SHADOW} />
      <rect x="14" y="24" width="140" height="44" rx="14" fill="var(--color-surface)" stroke={INK} strokeWidth="3.5" />
      <circle cx="36" cy="46" r="6" fill="var(--color-brand)" />
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft">
        <path d="M52 46h56" />
      </g>
      <rect x="116" y="38" width="26" height="16" rx="6" fill="var(--color-ink)" />

      {/* clipboard dropping in */}
      <g className="animate-bob">
        <rect x="74" y="66" width="60" height="60" rx="12" fill="var(--color-lime)" stroke={INK} strokeWidth="3.5" />
        <rect x="92" y="60" width="24" height="12" rx="5" fill="var(--color-ink)" />
        <path d="M104 84v26M94 100l10 10 10-10" stroke="#101010" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <path d="M32 104v12M26 110h12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft" />
    </g>
  ),

  /* Step 3 — pick a quality (4K / 1080p / MP3). */
  quality: (
    <g>
      {/* sliders plate */}
      <rect x="46" y="20" width="88" height="102" rx="14" fill={SHADOW} />
      <rect x="40" y="14" width="88" height="102" rx="14" fill="var(--color-surface)" stroke={INK} strokeWidth="3.5" />

      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
        <path d="M56 40h56" />
        <path d="M56 64h56" />
        <path d="M56 88h56" />
      </g>
      <circle cx="96" cy="40" r="9" fill="var(--color-sun)" stroke={INK} strokeWidth="3.5" />
      <circle cx="70" cy="64" r="9" fill="var(--color-punch)" stroke={INK} strokeWidth="3.5" />
      <circle cx="106" cy="88" r="9" fill="var(--color-aqua)" stroke={INK} strokeWidth="3.5" />

      {/* quality stickers */}
      <g className="animate-bob">
        <rect x="126" y="30" width="50" height="26" rx="9" fill="var(--color-lime)" stroke={INK} strokeWidth="3.5" />
        <text x="151" y="48" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700" fill="#101010">
          4K
        </text>
      </g>
      <g className="animate-bob-slow">
        <rect x="132" y="86" width="46" height="26" rx="9" fill="var(--color-grape)" stroke={INK} strokeWidth="3.5" />
        <text x="155" y="104" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill="#ffffff">
          MP3
        </text>
      </g>
    </g>
  ),

  /* Step 4 — the file lands in your tray. */
  save: (
    <g>
      {/* tray */}
      <path
        d="M42 96h96v16a18 18 0 0 1-18 18H60a18 18 0 0 1-18-18V96Z"
        fill="var(--color-grape)"
        stroke={INK}
        strokeWidth="3.5"
      />
      {/* file card falling */}
      <g className="animate-file-drop">
        <rect x="78" y="44" width="46" height="42" rx="9" fill="var(--color-sun)" stroke={INK} strokeWidth="3.5" />
        <path d="M101 54v20M93 66l8 8 8-8" stroke="#101010" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* success tick */}
      <g className="animate-bob">
        <circle cx="138" cy="40" r="18" fill="var(--color-ok)" stroke={INK} strokeWidth="3.5" />
        <path d="M130 41l6 6 11-13" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <path d="M34 46v14M27 53h14" stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft" />
    </g>
  )
}

export function StepArt({
  variant,
  className = ''
}: {
  variant: StepArtVariant
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={`h-auto w-full ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {ART[variant]}
    </svg>
  )
}
