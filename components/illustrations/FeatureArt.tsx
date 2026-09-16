/**
 * FeatureArt — spot illustrations for the feature cards.
 *
 * Variants map 1:1 to `FEATURE_HIGHLIGHTS[].icon` in `lib/seo.ts`, so the
 * marketing copy and the artwork can never drift apart. Same drawing system as
 * `HeroIllustration` / `StepArt`: theme tokens + currentColor, SMIL/CSS motion,
 * `aria-hidden` (the card title carries the semantics).
 */

import type { JSX } from 'react'

export type FeatureArtVariant = 'sparkles' | 'user-x' | 'zap' | 'layers'

const ART: Record<FeatureArtVariant, JSX.Element> = {
  /* "Up to 4K Ultra HD" — a display with a quality ladder */
  sparkles: (
    <g>
      {/* monitor */}
      <rect x="24" y="22" width="132" height="84" rx="10" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <rect x="34" y="32" width="112" height="52" rx="6" fill="var(--color-ink-800)" />
      <path d="M70 48.5v19l16-9.5-16-9.5Z" fill="url(#feature-art-accent)" />
      <rect x="34" y="90" width="52" height="4" rx="2" fill="var(--color-accent-soft)">
        <animate attributeName="width" values="18;52;18" keyTimes="0;0.6;1" dur="3.8s" repeatCount="indefinite" />
      </rect>
      <path d="M78 106h24l6 12H72l6-12Z" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <rect x="62" y="118" width="56" height="6" rx="3" fill="var(--color-ink-800)" />
      {/* 4K badge */}
      <g className="animate-bob">
        <rect x="118" y="8" width="46" height="26" rx="13" fill="url(#feature-art-accent)" />
        <text x="141" y="26" fontSize="13" fontWeight="800" textAnchor="middle" fill="#fff">4K</text>
      </g>
      {/* quality ladder rising out of the screen */}
      <g stroke="var(--color-accent-soft)" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M16 104v-12" />
        <path d="M8 104V86" className="animate-pulse-soft" />
      </g>
    </g>
  ),

  /* "No registration required" — a shielded profile, key crossed out */
  'user-x': (
    <g>
      {/* shield */}
      <path
        d="M90 16l52 18v34c0 30-22 48-52 60-30-12-52-30-52-60V34l52-18Z"
        fill="var(--color-ink-850)"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
      />
      {/* profile */}
      <circle cx="78" cy="72" r="13" fill="none" stroke="var(--color-accent-soft)" strokeWidth="3" />
      <path d="M54 108c4-13 13-20 24-20s20 7 24 20" stroke="var(--color-accent-soft)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* crossed-out key */}
      <g>
        <circle cx="122" cy="62" r="8" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-white/45" />
        <path d="M128 68l14 14m0-14-14 14" stroke="var(--color-danger)" strokeWidth="2.8" strokeLinecap="round" />
      </g>
      {/* check badge */}
      <circle cx="54" cy="44" r="12" fill="var(--color-ok)" className="animate-bob" />
      <path d="M48.5 44.5l3.5 3.5 6.5-7.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" className="animate-draw-check" />
    </g>
  ),

  /* "Fast & free" — a lightning bolt with speed lines and a timer */
  zap: (
    <g>
      {/* speed lines */}
      <g stroke="var(--color-accent-soft)" strokeWidth="3" strokeLinecap="round" opacity="0.6">
        <path d="M16 52h20" className="animate-pulse-soft" />
        <path d="M10 72h26" className="animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
        <path d="M16 92h20" className="animate-pulse-soft" style={{ animationDelay: '0.8s' }} />
      </g>
      {/* bolt */}
      <g className="animate-drift">
        <path d="M96 12 60 78h26l-8 48 42-66H94l10-48h-8Z" fill="url(#feature-art-accent)" stroke="var(--color-accent-deep)" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* timer chip */}
      <g className="animate-bob" style={{ animationDelay: '0.7s' }}>
        <rect x="112" y="96" width="52" height="28" rx="14" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" />
        <circle cx="126" cy="110" r="8" fill="none" stroke="var(--color-ok)" strokeWidth="2.4" />
        <path d="M126 106v4.5l3 2" stroke="var(--color-ok)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <text x="146" y="114.5" fontSize="12" fontWeight="700" textAnchor="middle" fill="currentColor" className="text-white/70">3s</text>
      </g>
    </g>
  ),

  /* "Multi-platform support" — layered platform cards */
  layers: (
    <g>
      {/* back cards */}
      <g opacity="0.55">
        <rect x="58" y="14" width="76" height="52" rx="9" fill="var(--color-ink-800)" stroke="var(--color-line)" transform="rotate(-8 96 40)" />
        <rect x="66" y="24" width="76" height="52" rx="9" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" transform="rotate(4 104 50)" />
      </g>
      {/* front card with a play mark */}
      <rect x="42" y="42" width="86" height="58" rx="10" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      <rect x="52" y="52" width="66" height="30" rx="6" fill="var(--color-ink-800)" />
      <path d="M79 59.5v15l13-7.5-13-7.5Z" fill="url(#feature-art-accent)" />
      <rect x="52" y="88" width="40" height="4" rx="2" fill="var(--color-ink-700)" />
      {/* orbiting dots */}
      <g>
        <circle cx="146" cy="38" r="6" fill="var(--color-accent)" className="animate-bob" />
        <circle cx="156" cy="82" r="4.5" fill="var(--color-cyan-glow)" className="animate-bob-slow" style={{ animationDelay: '0.6s' }} />
        <circle cx="30" cy="30" r="4" fill="var(--color-ok)" className="animate-bob-slow" style={{ animationDelay: '1.2s' }} />
        <circle cx="22" cy="98" r="3.5" fill="var(--color-warn)" className="animate-bob" style={{ animationDelay: '0.9s' }} />
      </g>
    </g>
  )
}

export function FeatureArt({
  variant,
  className = ''
}: {
  variant: FeatureArtVariant
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 180 130"
      className={`h-auto w-full ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="feature-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>
      {ART[variant]}
    </svg>
  )
}
