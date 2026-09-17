/**
 * StepArt — the four illustrations of the "How it works" guide.
 *
 * One compact SVG per step (copy the link → paste it → pick a quality → save
 * the file), drawn in the same token-based style as `HeroIllustration` so the
 * set reads as one family. Purely presentational: every scene is `aria-hidden`
 * because the step title + description next to it carry the meaning.
 */

import type { JSX } from 'react'

export type StepArtVariant = 'copy' | 'paste' | 'quality' | 'save'

const ART: Record<StepArtVariant, JSX.Element> = {
  /* 1 — copy the share link from the app */
  copy: (
    <g>
      {/* phone with a video on screen */}
      <rect x="18" y="14" width="72" height="112" rx="14" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <rect x="28" y="26" width="52" height="40" rx="7" fill="var(--color-ink-800)" stroke="var(--color-line)" />
      <path d="M50 38.5v15l13-7.5-13-7.5Z" fill="var(--color-accent)" />
      <rect x="28" y="74" width="52" height="5" rx="2.5" fill="var(--color-ink-700)" />
      <rect x="28" y="86" width="34" height="5" rx="2.5" fill="var(--color-ink-700)" />
      {/* share arrow leaving the phone */}
      <path d="M94 66h18a8 8 0 0 1 8 8v14" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 8" className="animate-flow-dash" fill="none" />
      {/* the copied link pill */}
      <g className="animate-drift">
        <rect x="86" y="84" width="82" height="34" rx="17" fill="var(--color-ink-850)" stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M101 96h9m-9-4v8m9-8v8m6-4h4a4.5 4.5 0 0 1 0 9h-1.5" stroke="var(--color-accent-soft)" strokeWidth="2" strokeLinecap="round" />
        <path d="M132 104l6 6 11-13" stroke="var(--color-ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx="16" cy="140" r="3" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
    </g>
  ),

  /* 2 — paste it into the download box */
  paste: (
    <g>
      {/* clipboard with an arrow pointing down into the input */}
      <g className="animate-bob">
        <rect x="52" y="12" width="56" height="68" rx="10" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
        <rect x="68" y="6" width="24" height="12" rx="6" fill="var(--color-accent)" />
        <rect x="62" y="30" width="36" height="5" rx="2.5" fill="var(--color-ink-700)" />
        <rect x="62" y="42" width="36" height="5" rx="2.5" fill="var(--color-ink-700)" />
        <rect x="62" y="54" width="22" height="5" rx="2.5" fill="var(--color-ink-700)" />
      </g>
      <path d="M80 84v20m0 0-8-8m8 8 8-8" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* the input bar */}
      <rect x="14" y="112" width="152" height="34" rx="17" fill="var(--color-ink-850)" stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="33" cy="129" r="7" fill="var(--color-accent)" opacity="0.2" />
      <circle cx="33" cy="129" r="2.6" fill="var(--color-accent-soft)" />
      <rect x="47" y="126.5" width="52" height="5" rx="2.5" fill="var(--color-ink-700)" />
      <rect x="103" y="126.5" width="2.6" height="5" rx="1.3" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
      <rect x="122" y="121" width="36" height="16" rx="8" fill="url(#step-art-accent)" />
      <path d="M134 125.5v7m0 0-2.6-2.6m2.6 2.6 2.6-2.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M142 125.5v7m0 0-2.6-2.6m2.6 2.6 2.6-2.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
    </g>
  ),

  /* 3 — pick a quality / format */
  quality: (
    <g>
      {/* option rows, top one active */}
      <rect x="16" y="16" width="148" height="32" rx="9" fill="var(--color-ink-800)" stroke="var(--color-accent)" strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="26" y="24" width="34" height="16" rx="5" fill="url(#step-art-accent)" />
      <text x="31" y="36" fontSize="9" fontWeight="700" fill="#fff">4K</text>
      <rect x="68" y="27.5" width="46" height="5" rx="2.5" fill="var(--color-ink-700)" />
      <rect x="120" y="24" width="34" height="16" rx="8" fill="var(--color-ok)" opacity="0.16" />
      <path d="M128.5 32l3 3 5.5-6.5" stroke="var(--color-ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="16" y="56" width="148" height="32" rx="9" fill="var(--color-ink-850)" stroke="var(--color-line)" />
      <rect x="26" y="64" width="34" height="16" rx="5" fill="var(--color-ink-700)" />
      <text x="30" y="76" fontSize="9" fontWeight="600" fill="currentColor" className="text-white/50">HD</text>
      <rect x="68" y="67.5" width="46" height="5" rx="2.5" fill="var(--color-ink-700)" />
      <rect x="120" y="64" width="34" height="16" rx="8" fill="var(--color-ink-800)" />

      <rect x="16" y="96" width="148" height="32" rx="9" fill="var(--color-ink-850)" stroke="var(--color-line)" />
      <rect x="26" y="104" width="34" height="16" rx="5" fill="var(--color-ink-700)" />
      <path d="M42 115.5v-8l6-1.8v8" stroke="var(--color-accent-soft)" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="40" cy="115.8" r="2.2" fill="var(--color-accent-soft)" />
      <circle cx="46" cy="114" r="2.2" fill="var(--color-accent-soft)" />
      <rect x="68" y="107.5" width="46" height="5" rx="2.5" fill="var(--color-ink-700)" />
      <rect x="120" y="104" width="34" height="16" rx="8" fill="var(--color-ink-800)" />

      {/* pointer cursor hovering the active row */}
      <g className="animate-bob" style={{ animationDelay: '0.5s' }}>
        <path d="M136 78l14 12-6.5 1.5 3.5 6.5-4.5 2.5-3.5-6.5-4.5 4.5Z" fill="var(--color-accent)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" transform="translate(0 -42)" />
      </g>
      <circle cx="10" cy="24" r="3" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
    </g>
  ),

  /* 4 — the file lands in the folder */
  save: (
    <g>
      <path d="M80 20v38m0 0-11-11m11 11 11-11" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* falling file */}
      <g className="animate-file-drop">
        <rect x="62" y="26" width="36" height="44" rx="6" fill="url(#step-art-accent)" opacity="0.95" />
        <path d="M72 40h16M72 48h16M72 56h9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      </g>
      {/* folder */}
      <path d="M26 92h32l9 9h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V92Z" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <path d="M26 112h92" stroke="var(--color-line)" strokeWidth="1.5" />
      {/* success check */}
      <circle cx="132" cy="126" r="14" fill="var(--color-ok)" />
      <path d="M126 126.5l4 4 8-9" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" className="animate-draw-check" />
      <circle cx="132" cy="126" r="14" stroke="var(--color-ok)" strokeWidth="2" fill="none">
        <animate attributeName="r" values="14;22;14" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
      </circle>
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
      viewBox="0 0 180 148"
      className={`h-auto w-full ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="step-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>
      {ART[variant]}
    </svg>
  )
}
