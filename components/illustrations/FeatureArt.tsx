/**
 * FeatureArt — spot illustrations for the feature cards.
 *
 * Variants map 11 to FEATURE_HIGHLIGHTS icons in lib/seo, so the
 * marketing copy and the artwork can never drift apart Same drawing system as
 * HeroIllustration StepArt theme tokens currentColor SMIL CSS motion
 * aria-hidden the card title carries the semantics
 */

import type { JSX } from 'react'

export type FeatureArtVariant = 'sparkles' | 'user-x' | 'zap' | 'layers'

const ART: Record<FeatureArtVariant, JSX.Element> = {
  /* "Up to 4K Ultra HD" — a display with a quality ladder */
  sparkles: (
    <g>
      {/* monitor */}
      <rect x="24" y="22" width="132" height="84" rx="10" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="2" />
      <rect x="34" y="32" width="112" height="52" rx="6" fill="var(--color-ink-800)" />
      <path d="M70 48v19l16-9-16-10Z" fill="url(#feature-art-accent)" />
      <rect x="34" y="90" width="52" height="4" rx="2" fill="var(--color-accent-soft)">
        <animate attributeName="width" values="18;52;18" keyTimes="0;0.6;1" dur="4s" repeatCount="indefinite" />
      </rect>
      <path d="M78 106h24l6 12H72l6-12Z" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="2" />
      <rect x="62" y="118" width="56" height="6" rx="3" fill="var(--color-ink-800)" />
      {/* 4K badge */}
      <g className="animate-bob">
        <rect x="118" y="8" width="46" height="26" rx="13" fill="url(#feature-art-accent)" />
        <text
          x="141"
          y="21"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="800"
          textAnchor="middle"
          fill="#fff"
        >
          4K
        </text>
      </g>
      {/* quality ladder rising out of the screen */}
      <g stroke="var(--color-accent-soft)" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M16 104v-12" />
        <path d="M8 104V86" className="animate-pulse-soft" />
      </g>
    </g>
  ),

  /* "No registration required" — clean user profile card with a instant access checkmark badge */
  'user-x': (
    <g transform="translate(5, 5)">
      {/* Background card container */}
      <rect
        x="40"
        y="20"
        width="90"
        height="85"
        rx="16"
        fill="var(--color-ink-850)"
        stroke="var(--color-line-strong)"
        strokeWidth="2"
      />

      {/* User Avatar Head */}
      <circle
        cx="85"
        cy="48"
        r="14"
        fill="none"
        stroke="var(--color-accent-soft)"
        strokeWidth="3"
      />

      {/* User Avatar Shoulders */}
      <path
        d="M62 84c3-12 11-18 23-18s20 6 23 18"
        fill="none"
        stroke="var(--color-accent-soft)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Floating Checkmark Badge - Highlighting instant access without login */}
      <g className="animate-bob" transform="translate(108, 18)">
        <circle cx="16" cy="16" r="16" fill="var(--color-ok)" />
        <path
          d="M9 16l5 5 9-10"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  ),

  /* "Fast Free" — a central bolt clean speed lines and an MP3 badge */
  zap: (
    <g transform="translate(10, 5)">
      {/* Parallel speed lines on the left */}
      <g
        stroke="var(--color-accent-soft)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      >
        <path d="M5 45h20" className="animate-pulse-soft" />
        <path
          d="M0 60h25"
          className="animate-pulse-soft"
          style={{ animationDelay: '0.4s' }}
        />
        <path
          d="M5 75h20"
          className="animate-pulse-soft"
          style={{ animationDelay: '0.8s' }}
        />
      </g>

      {/* Main bolt */}
      <g>
        <path
          d="M75 10 40 70h25l-8 40 40-55H70l10-45h-5Z"
          fill="url(#feature-art-accent)"
          stroke="var(--color-accent-deep)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>

      {/* MP3 Chip on the right */}
      <g
        transform="translate(105, 75)"
        className="animate-bob"
        style={{ animationDelay: '0.7s' }}
      >
        <rect
          x="0"
          y="0"
          width="50"
          height="30"
          rx="15"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
        />
        <text
          x="25"
          y="15"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="800"
          fill="currentColor"
        >
          MP3
        </text>
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
      <rect x="42" y="42" width="86" height="58" rx="10" fill="var(--color-ink-850)" stroke="var(--color-line-strong)" strokeWidth="2" />
      <rect x="52" y="52" width="66" height="30" rx="6" fill="var(--color-ink-800)" />
      <path d="M79 59v15l13-7-13-8Z" fill="url(#feature-art-accent)" />
      <rect x="52" y="88" width="40" height="4" rx="2" fill="var(--color-ink-700)" />
      {/* orbiting dots */}
      <g>
        <circle cx="146" cy="38" r="6" fill="var(--color-accent)" className="animate-bob" />
        <circle cx="156" cy="82" r="5" fill="var(--color-cyan-glow)" className="animate-bob-slow" style={{ animationDelay: '0.6s' }} />
        <circle cx="30" cy="30" r="4" fill="var(--color-ok)" className="animate-bob-slow" style={{ animationDelay: '1.2s' }} />
        <circle cx="22" cy="98" r="4" fill="var(--color-warn)" className="animate-bob" style={{ animationDelay: '0.9s' }} />
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
      className={className ? `h-auto w-full ${className}` : "h-auto w-full"}
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