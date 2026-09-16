/**
 * ProgressArt — illustrations for the three-page download flow.
 *
 * • `ProgressGauge` — the live progress ring on step 3. `percent === null`
 *   switches it to an indeterminate spinning arc (used when the server streams
 *   without a Content-Length). The arc geometry is driven inline by React state
 *   and eased with a short CSS transition, so it animates smoothly between
 *   chunk updates instead of jumping.
 * • `SuccessScene` — the finished-download artwork: a self-drawing check with
 *   radiating rings and confetti.
 * • `LinkMissingArt` — friendly empty state for step 2 when no link was given.
 */

const RING_RADIUS = 66
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function ProgressGauge({
  percent,
  caption,
  className = ''
}: {
  /** 0–100, or `null` for indeterminate (no Content-Length) mode. */
  percent: number | null
  caption: string
  className?: string
}) {
  const clamped = typeof percent === 'number' ? Math.max(0, Math.min(100, percent)) : null

  return (
    <svg
      viewBox="0 0 160 160"
      className={`h-auto w-full ${className}`}
      fill="none"
      role="img"
      aria-label={
        clamped === null ? `Downloading — ${caption}` : `${Math.round(clamped)}% downloaded — ${caption}`
      }
    >
      <defs>
        <linearGradient id="gauge-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="55%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>

      {/* track */}
      <circle cx="80" cy="80" r={RING_RADIUS} stroke="var(--color-ink-800)" strokeWidth="11" />

      {/* value arc */}
      <g transform="rotate(-90 80 80)">
        {clamped === null ? (
          <circle
            cx="80"
            cy="80"
            r={RING_RADIUS}
            stroke="url(#gauge-art-accent)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE * 0.26} ${RING_CIRCUMFERENCE * 0.74}`}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 80 80"
              to="360 80 80"
              dur="1.15s"
              repeatCount="indefinite"
            />
          </circle>
        ) : (
          <circle
            cx="80"
            cy="80"
            r={RING_RADIUS}
            stroke="url(#gauge-art-accent)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            style={{
              strokeDashoffset: RING_CIRCUMFERENCE * (1 - clamped / 100),
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        )}
      </g>

      {/* centre readout */}
      <text
        x="80"
        y="82"
        textAnchor="middle"
        fontSize="34"
        fontWeight="800"
        fill="currentColor"
        className="text-white tabular-nums"
        fontFamily="var(--font-display)"
      >
        {clamped === null ? '···' : `${Math.round(clamped)}%`}
      </text>
      <text x="80" y="103" textAnchor="middle" fontSize="10.5" fill="currentColor" className="text-white/50">
        {caption}
      </text>
    </svg>
  )
}

/** Big celebratory check used on the success state of step 3. */
export function SuccessScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={`h-auto w-full ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="success-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>

      {/* radiating pulse rings */}
      <circle cx="100" cy="76" r="40" stroke="var(--color-ok)" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="r" values="40;70;40" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="76" r="40" stroke="var(--color-ok)" strokeWidth="2" fill="none" opacity="0.3">
        <animate attributeName="r" values="40;70;40" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
      </circle>

      {/* disc + check */}
      <circle cx="100" cy="76" r="40" fill="var(--color-ok)" opacity="0.14" />
      <circle cx="100" cy="76" r="40" stroke="var(--color-ok)" strokeWidth="3.5" fill="none" />
      <path
        d="M84 78.5l11 11 21-24"
        stroke="var(--color-ok)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        className="animate-draw-check"
      />

      {/* confetti */}
      <g strokeLinecap="round" strokeWidth="2.6">
        <path d="M40 34v10M35 39h10" stroke="var(--color-accent-soft)" className="animate-bob" />
        <path d="M158 30v9M153.5 34.5h9" stroke="var(--color-cyan-glow)" className="animate-bob-slow" style={{ animationDelay: '0.5s' }} />
        <path d="M168 92v8M164 96h8" stroke="var(--color-accent-soft)" className="animate-bob" style={{ animationDelay: '1s' }} />
        <path d="M32 96v8M28 100h8" stroke="var(--color-warn)" className="animate-bob-slow" style={{ animationDelay: '1.4s' }} />
      </g>
      <circle cx="58" cy="118" r="3.5" fill="var(--color-ok)" className="animate-pulse-soft" />
      <circle cx="144" cy="120" r="3" fill="var(--color-accent-soft)" className="animate-pulse-soft" style={{ animationDelay: '0.7s' }} />
      <circle cx="100" cy="22" r="3" fill="var(--color-cyan-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.1s' }} />

      {/* little file with the accent gradient flying out of the disc */}
      <g className="animate-bob" style={{ animationDelay: '0.3s' }}>
        <rect x="126" y="106" width="30" height="36" rx="5" fill="url(#success-art-accent)" opacity="0.92" />
        <path d="M133 116h16M133 123h16M133 130h9" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  )
}

/** Empty-state art for step 2 when the visitor arrived without a link. */
export function LinkMissingArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={`h-auto w-full ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="missing-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>

      {/* dashed input bar */}
      <rect
        x="22"
        y="52"
        width="156"
        height="40"
        rx="20"
        fill="var(--color-ink-850)"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
        strokeDasharray="7 7"
      />
      {/* link chain inside the bar */}
      <path
        d="M64 72h14m-14-6.5v13m14-13v13m7-6.5h6a6.5 6.5 0 0 1 0 13h-3"
        stroke="var(--color-accent-soft)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="106" y="63" width="52" height="7" rx="3.5" fill="var(--color-ink-700)" />

      {/* magnifier hovering above */}
      <g className="animate-drift">
        <circle cx="122" cy="24" r="14" fill="var(--color-ink-850)" stroke="var(--color-accent)" strokeWidth="2.6" />
        <path d="M132 34l9 9" stroke="var(--color-accent)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M117 24a5 5 0 0 1 5-5" stroke="var(--color-accent-soft)" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* sparkles */}
      <path d="M36 20v10M31 25h10" stroke="var(--color-accent-soft)" strokeWidth="2.4" strokeLinecap="round" className="animate-pulse-soft" />
      <path d="M172 96v8M168 100h8" stroke="var(--color-cyan-glow)" strokeWidth="2.4" strokeLinecap="round" className="animate-pulse-soft" style={{ animationDelay: '0.8s' }} />
      <circle cx="30" cy="110" r="3" fill="var(--color-accent)" className="animate-pulse-soft" style={{ animationDelay: '1.3s' }} />
    </svg>
  )
}
