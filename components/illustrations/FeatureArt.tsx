/**
 * FeatureArt — spot illustrations for the feature cards.
 *
 * Variants map 1:1 to the FEATURE_HIGHLIGHTS icons in lib/seo, so the
 * marketing copy and the artwork can never drift apart.
 *
 * Drawing system: flat candy fills, 3.5px ink outlines, hard offset shadows,
 * tokens for every colour (so they re-theme with the page), CSS-class motion
 * only, and `aria-hidden` — the card title carries the semantics.
 */

import type { JSX } from 'react'

export type FeatureArtVariant = 'sparkles' | 'user-x' | 'zap' | 'layers'

const INK = 'var(--color-line)'
const SHADOW = 'var(--color-line)'

/** Offset "printed" shadow behind a shape. */
function Plate({
  x,
  y,
  w,
  h,
  r = 12,
  fill
}: {
  x: number
  y: number
  w: number
  h: number
  r?: number
  fill: string
}) {
  return (
    <>
      <rect x={x + 6} y={y + 6} width={w} height={h} rx={r} fill={SHADOW} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={INK} strokeWidth="3.5" />
    </>
  )
}

const ART: Record<FeatureArtVariant, JSX.Element> = {
  /* "Up to 4K Ultra HD" — a display with a resolution ladder climbing out. */
  sparkles: (
    <g>
      <Plate x={44} y={30} w={128} h={76} r={14} fill="var(--color-sun)" />
      <path d="M74 66v18l30-9-30-9Z" fill="#101010" />
      <rect x="118" y="60" width="40" height="8" rx="4" fill="#101010" opacity="0.5" />
      <rect x="118" y="76" width="26" height="8" rx="4" fill="#101010" opacity="0.3" />
      <path d="M96 106h34l8 16H88l8-16Z" fill="var(--color-surface-2)" stroke={INK} strokeWidth="3.5" />
      <rect x="82" y="122" width="62" height="9" rx="4.5" fill="var(--color-ink)" />

      {/* quality ladder */}
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
        <rect x="14" y="96" width="12" height="26" rx="4" fill="var(--color-punch)" />
        <rect x="32" y="80" width="12" height="42" rx="4" fill="var(--color-aqua)" className="animate-pulse-soft" />
      </g>

      {/* 4K sticker */}
      <g className="animate-bob">
        <rect x="132" y="8" width="56" height="32" rx="10" fill="var(--color-punch)" stroke={INK} strokeWidth="3.5" />
        <text x="160" y="31" textAnchor="middle" fontSize="16" fontFamily="var(--font-display)" fill="#101010">
          4K
        </text>
      </g>
    </g>
  ),

  /* "No registration" — an access card waved through, no account needed. */
  'user-x': (
    <g>
      <Plate x={42} y={24} w={104} h={92} r={16} fill="var(--color-lime)" />
      <circle cx="94" cy="60" r="17" fill="#101010" />
      <path d="M68 100a26 26 0 0 1 52 0Z" fill="#101010" />
      <path
        d="M118 96l34 34"
        stroke="var(--color-danger)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* "no signup" badge */}
      <g className="animate-bob">
        <circle cx="152" cy="38" r="21" fill="var(--color-punch)" stroke={INK} strokeWidth="3.5" />
        <path d="M152 26v24" stroke="#101010" strokeWidth="5" strokeLinecap="round" />
        <circle cx="152" cy="38" r="15" stroke="#101010" strokeWidth="3.5" fill="none" />
      </g>

      {/* ink squiggle "skip" arrow */}
      <path
        d="M22 108c-8-10-2-24 10-24"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        className="animate-pulse-soft"
      />
    </g>
  ),

  /* "Fast & free" — a lightning bolt on a striped plate. */
  zap: (
    <g>
      <Plate x={54} y={20} w={84} h={100} r={14} fill="var(--color-punch)" />
      <path
        d="M104 34 78 78h18l-8 34 30-48H98l6-30Z"
        fill="var(--color-sun)"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* speed lines */}
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft">
        <path d="M26 46h20" />
        <path d="M18 62h16" />
        <path d="M26 78h18" />
      </g>
      <g stroke="var(--color-brand)" strokeWidth="5" strokeLinecap="round">
        <path d="M150 62h14" />
        <path d="M150 78h22" className="animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
      </g>
    </g>
  ),

  /* "Multi-platform" — stacked slabs (one engine, many networks). */
  layers: (
    <g>
      <g transform="rotate(-4 90 62)">
        <rect x="58" y="30" width="90" height="26" rx="9" fill="var(--color-aqua)" stroke={INK} strokeWidth="3.5" />
      </g>
      <g transform="rotate(2 90 76)">
        <rect x="50" y="54" width="106" height="26" rx="9" fill="var(--color-sun)" stroke={INK} strokeWidth="3.5" />
      </g>
      <g transform="rotate(-2 90 92)">
        <rect x="58" y="78" width="90" height="26" rx="9" fill="var(--color-grape)" stroke={INK} strokeWidth="3.5" />
      </g>
      <rect x="34" y="104" width="140" height="16" rx="8" fill="var(--color-line)" />

      {/* floating network dots */}
      <g className="animate-bob">
        <circle cx="26" cy="34" r="8" fill="var(--color-lime)" stroke={INK} strokeWidth="3" />
      </g>
      <g className="animate-bob-slow">
        <circle cx="160" cy="20" r="7" fill="var(--color-punch)" stroke={INK} strokeWidth="3" />
        <circle cx="172" cy="120" r="6" fill="var(--color-brand)" stroke={INK} strokeWidth="3" />
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
      viewBox="0 0 200 140"
      className={className ? `h-auto w-full ${className}` : 'h-auto w-full'}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {ART[variant]}
    </svg>
  )
}
