/**
 * ProgressArt — illustrations for the three-page download flow.
 *
 * • `DownloadingScene` — the ambient "it is running" artwork on step 3. It is
 *   deliberately *indeterminate*: no percentage, no byte counter, nothing that
 *   pretends to know how far along the transfer is. A spinning arc, a dashed
 *   channel and a tumbling file card into a tray say "alive, just wait".
 * • `SuccessScene` — the finished-download artwork: a self-drawing check with
 *   radiating rings, a sticker and confetti.
 * • `LinkMissingArt` — friendly empty state for step 2 when no link was given.
 *
 * All three use the brutalist drawing system: flat candy fills, 3.5–4px ink
 * outlines, hard offset shadows, token colours, CSS-class motion only.
 */

const INK = 'var(--color-line)'

export function DownloadingScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 152"
      className={`h-auto w-full ${className}`}
      fill="none"
      role="img"
      aria-label="Download in progress — the file is on its way to this device"
    >
      {/* ------------------------------------------------------------ source */}
      <g transform="translate(120 34)">
        <circle r="30" fill="var(--color-sun)" stroke={INK} strokeWidth="4" />
        {/* indeterminate arc — "still working", never a percentage */}
        <circle r="18" stroke="#101010" strokeWidth="5" strokeLinecap="round" strokeDasharray="30 84">
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
        <path d="M0 -8v18M-8 4l8 8 8-8" stroke="#101010" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* ----------------------------------------------------------- channel */}
      <path
        d="M120 72v34"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="10 10"
        className="animate-flow-dash"
      />

      {/* tumbling file card */}
      <g transform="translate(120 122)" className="animate-file-drop">
        <rect x="-24" y="-20" width="48" height="40" rx="9" fill="var(--color-aqua)" stroke={INK} strokeWidth="3.5" />
        <path d="M0 -10v14M-7 0l7 7 7-7" stroke="#101010" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* --------------------------------------------------------- the tray */}
      <g>
        <path
          d="M70 120h100v10a16 16 0 0 1-16 16H86a16 16 0 0 1-16-16v-10Z"
          fill="var(--color-grape)"
          stroke={INK}
          strokeWidth="4"
        />
        {/* landing ripples */}
        <circle cx="120" cy="126" r="26" fill="none" stroke="var(--color-brand)" strokeWidth="3">
          <animate attributeName="r" values="10;34;10" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* --------------------------------------------------------- stickers */}
      <g className="animate-bob">
        <rect x="10" y="26" width="62" height="30" rx="10" fill="var(--color-lime)" stroke={INK} strokeWidth="3.5" />
        <text x="41" y="46" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700" fill="#101010">
          MP4
        </text>
      </g>
      <g className="animate-bob-slow">
        <rect x="168" y="20" width="62" height="30" rx="10" fill="var(--color-punch)" stroke={INK} strokeWidth="3.5" />
        <text x="199" y="40" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700" fill="#101010">
          4K
        </text>
      </g>
    </svg>
  )
}

export function SuccessScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={`h-auto w-full ${className}`}
      fill="none"
      role="img"
      aria-label="Download finished — the file is saved"
    >
      {/* radiating rings */}
      <circle cx="100" cy="76" r="40" fill="none" stroke="var(--color-ok)" strokeWidth="3">
        <animate attributeName="r" values="40;64;40" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="76" r="40" fill="none" stroke="var(--color-brand)" strokeWidth="3">
        <animate attributeName="r" values="40;64;40" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
      </circle>

      {/* badge */}
      <g transform="rotate(-6 100 76)">
        <circle cx="106" cy="82" r="40" fill={INK} />
        <circle cx="100" cy="76" r="40" fill="var(--color-lime)" stroke={INK} strokeWidth="4" />
        <path
          d="M80 77l14 14 26-30"
          stroke="#101010"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          className="animate-draw-check"
        />
      </g>

      {/* confetti */}
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
        <path d="M34 26v12M28 32h12" className="animate-bob" />
        <path d="M162 22v10M157 27h10" className="animate-bob-slow" style={{ animationDelay: '0.5s' }} />
        <path d="M172 102v10M167 107h10" className="animate-bob" style={{ animationDelay: '1s' }} />
      </g>
      <circle cx="52" cy="124" r="7" fill="var(--color-punch)" stroke={INK} strokeWidth="3" className="animate-pulse-soft" />
      <circle cx="150" cy="132" r="6" fill="var(--color-aqua)" stroke={INK} strokeWidth="3" className="animate-pulse-soft" style={{ animationDelay: '0.7s' }} />
      <circle cx="100" cy="16" r="6" fill="var(--color-sun)" stroke={INK} strokeWidth="3" className="animate-pulse-soft" style={{ animationDelay: '1.1s' }} />
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
      {/* dashed empty input bar */}
      <rect
        x="18"
        y="52"
        width="164"
        height="48"
        rx="16"
        fill="var(--color-surface-2)"
        stroke={INK}
        strokeWidth="3.5"
        strokeDasharray="10 10"
      />
      <path
        d="M60 76h12m-12-6v12m12-12v12m5-6h5a6 6 0 0 1 0 12h-3"
        stroke="var(--color-brand)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="100" y="68" width="50" height="9" rx="4.5" fill={INK} opacity="0.35" />

      {/* magnifier hovering above */}
      <g className="animate-drift">
        <circle cx="122" cy="24" r="15" fill="var(--color-sun)" stroke={INK} strokeWidth="4" />
        <path d="M133 35l10 10" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* doodles */}
      <path d="M34 22v12M28 28h12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" className="animate-pulse-soft" />
      <circle cx="30" cy="118" r="7" fill="var(--color-punch)" stroke={INK} strokeWidth="3" className="animate-pulse-soft" style={{ animationDelay: '0.8s' }} />
      <circle cx="172" cy="112" r="6" fill="var(--color-aqua)" stroke={INK} strokeWidth="3" className="animate-pulse-soft" style={{ animationDelay: '1.3s' }} />
    </svg>
  )
}
