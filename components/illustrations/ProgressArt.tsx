/**
 * ProgressArt — illustrations for the three-page download flow.
 *
 * • `DownloadingScene` — the ambient "it is running" artwork on step 3. It is
 *   deliberately *indeterminate*: no percentage, no byte counter, nothing that
 *   pretends to know how far along the transfer is. A source disc keeps a
 *   rotating arc, a dashed channel flows downwards, a file chip falls into the
 *   browser's download shelf and the landing point ripples — so a visitor can
 *   tell at a glance that the download is alive and simply has to wait.
 * • `SuccessScene` — the finished-download artwork: a self-drawing check with
 *   radiating rings and confetti.
 * • `LinkMissingArt` — friendly empty state for step 2 when no link was given.
 */

export function DownloadingScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 152"
      className={`h-auto w-full ${className}`}
      fill="none"
      role="img"
      aria-label="Download in progress — the file is on its way to this device"
    >
      <defs>
        <linearGradient id="downloading-art-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
      </defs>

      {/* ------------------------------------------------------------ source */}
      <g transform="translate(120 30)">
        {/* indeterminate arc — "still working", never a percentage */}
        <circle
          r="29"
          stroke="url(#downloading-art-accent)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="30 152"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="1.7s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          r="22"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="1.5"
        />
        {/* cloud glyph: where the bytes come from */}
        <path
          d="M-9 5.5h18a5.5 5.5 0 0 0 .5-11 8 8 0 0 0-15.3 1.4A5 5 0 0 0-9 5.5Z"
          fill="url(#downloading-art-accent)"
          opacity="0.95"
        />
        {/* down arrow inside the cloud */}
        <path
          d="M0 -3.5v9m0 0-3.4-3.4M0 5.5l3.4-3.4"
          stroke="var(--color-ink-950)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* --------------------------------------------- channel + falling file */}
      <path
        d="M120 62v34"
        stroke="var(--color-accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="6 8"
        className="animate-flow-dash"
      />
      <g transform="translate(120 64)" className="animate-file-drop">
        <rect x="-9" y="0" width="18" height="22" rx="3.5" fill="url(#downloading-art-accent)" />
        <path
          d="M-4.5 7h9M-4.5 12h9M-4.5 17h5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>

      {/* landing ripples where the file arrives */}
      <g transform="translate(120 110)">
        <circle r="9" stroke="var(--color-accent-soft)" strokeWidth="1.6" fill="none" opacity="0.5">
          <animate attributeName="r" values="6;20;6" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle r="9" stroke="var(--color-accent-soft)" strokeWidth="1.6" fill="none" opacity="0.3">
          <animate attributeName="r" values="6;20;6" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ------------------------------------------ the browser's download shelf */}
      <g transform="translate(120 118)">
        <rect
          x="-58"
          y="0"
          width="116"
          height="28"
          rx="9"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="1.5"
        />
        <rect x="-46" y="8" width="54" height="4.5" rx="2.25" fill="var(--color-ink-700)" />
        <rect x="-46" y="17" width="34" height="4.5" rx="2.25" fill="var(--color-ink-700)" />
        <circle cx="42" cy="14" r="9" fill="var(--color-accent)" opacity="0.16" />
        <path
          d="M42 9.5v7m0 0-3-3m3 3 3-3"
          stroke="var(--color-accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ambient sparkles so the scene never looks frozen */}
      <circle cx="46" cy="46" r="3" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
      <circle
        cx="196"
        cy="62"
        r="2.6"
        fill="var(--color-cyan-glow)"
        className="animate-pulse-soft"
        style={{ animationDelay: '0.9s' }}
      />
      <circle
        cx="60"
        cy="96"
        r="2.4"
        fill="var(--color-accent)"
        className="animate-pulse-soft"
        style={{ animationDelay: '1.5s' }}
      />
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
