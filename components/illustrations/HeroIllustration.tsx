/**
 * HeroIllustration — the signature artwork of the landing page.
 *
 * A hand-built, dependency-free SVG scene that tells the whole product story in
 * one glance: a browser window resolves a pasted link, lists quality options,
 * streams the file (animated progress bar) and drops it into a folder with a
 * success check — surrounded by floating "4K / MP3 / no watermark" chips.
 *
 * Design notes:
 *  • Every colour comes from the `@theme` tokens (`var(--color-accent)`,
 *    `var(--color-ink-850)`, …) so the artwork re-skins itself in light mode
 *    exactly like the rest of the UI — no duplicated palette.
 *  • Neutral strokes/text use `currentColor` + `text-white/xx` utilities, which
 *    the `html.light` overrides already remap to slate.
 *  • Motion uses translate/opacity CSS keyframes (transform-origin free) plus
 *    SMIL `<animate>`/`<animateTransform>` for rotation and the progress fill,
 *    matching the approach already used by `components/Spinner.tsx`.
 */

export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 500"
      className={`h-auto w-full ${className}`}
      fill="none"
      role="img"
      aria-label="Illustration of the download flow: a browser window turns a pasted video link into quality options and streams an MP4 file into a folder"
    >
      <defs>
        <linearGradient id="hero-ill-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="55%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>
        <linearGradient id="hero-ill-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-ink-800)" />
          <stop offset="100%" stopColor="var(--color-ink-900)" />
        </linearGradient>
        <radialGradient id="hero-ill-glow-a" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-ill-glow-b" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-cyan-glow)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--color-cyan-glow)" stopOpacity="0" />
        </radialGradient>
        <clipPath id="hero-ill-window">
          <rect x="90" y="104" width="380" height="216" rx="14" />
        </clipPath>
      </defs>

      {/* ------------------------------------------------ ambient backdrop */}
      <circle cx="150" cy="118" r="168" fill="url(#hero-ill-glow-a)" />
      <circle cx="436" cy="392" r="176" fill="url(#hero-ill-glow-b)" />

      {/* Slowly rotating dashed orbit ring */}
      <ellipse
        cx="280"
        cy="240"
        rx="252"
        ry="218"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
        strokeDasharray="3 12"
        opacity="0.65"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 280 240"
          to="360 280 240"
          dur="90s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* -------------------------------------------------- browser window */}
      <g>
        <rect
          x="90"
          y="60"
          width="380"
          height="260"
          rx="20"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="1.5"
        />
        {/* title bar */}
        <line x1="90" y1="104" x2="470" y2="104" stroke="var(--color-line)" strokeWidth="1.5" />
        <circle cx="114" cy="82" r="5" fill="var(--color-danger)" opacity="0.65" />
        <circle cx="132" cy="82" r="5" fill="var(--color-warn)" opacity="0.65" />
        <circle cx="150" cy="82" r="5" fill="var(--color-ok)" opacity="0.65" />

        {/* address bar */}
        <rect
          x="196"
          y="70"
          width="212"
          height="24"
          rx="12"
          fill="var(--color-ink-800)"
          stroke="var(--color-line)"
        />
        <rect x="206" y="80" width="9" height="7" rx="1.5" fill="var(--color-ok)" opacity="0.85" />
        <text
          x="222"
          y="86"
          fontSize="10.5"
          fill="currentColor"
          className="text-white/60"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          youtube.com/watch?v=…
        </text>

        {/* video preview card */}
        <g>
          <rect
            x="114"
            y="124"
            width="168"
            height="110"
            rx="12"
            fill="url(#hero-ill-screen)"
            stroke="var(--color-line)"
          />
          <circle cx="198" cy="171" r="22" fill="url(#hero-ill-accent)" opacity="0.95" />
          <path d="M192 160.5v21l18-10.5-18-10.5Z" fill="#fff" />
          {/* pulsing halo around the play button */}
          <circle cx="198" cy="171" r="22" stroke="var(--color-accent-soft)" strokeWidth="2">
            <animate attributeName="r" values="22;30;22" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="2.6s" repeatCount="indefinite" />
          </circle>
          {/* timeline */}
          <rect x="128" y="216" width="140" height="4.5" rx="2.25" fill="var(--color-ink-700)" />
          <rect x="128" y="216" width="10" height="4.5" rx="2.25" fill="var(--color-accent-soft)">
            <animate attributeName="width" values="26;104;26" keyTimes="0;0.55;1" dur="4.2s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* quality option rows */}
        <g className="text-white/45" fontSize="11" fontWeight="600">
          <rect
            x="298"
            y="126"
            width="150"
            height="32"
            rx="9"
            fill="var(--color-ink-800)"
            stroke="var(--color-accent)"
            strokeOpacity="0.55"
          />
          <text x="310" y="146" fill="currentColor">
            2160p · 4K
          </text>
          <rect x="392" y="134" width="44" height="16" rx="8" fill="url(#hero-ill-accent)" />
          <text x="399" y="145.5" fontSize="8.5" fill="#fff" letterSpacing="0.5">
            BEST
          </text>

          <rect x="298" y="166" width="150" height="32" rx="9" fill="var(--color-ink-800)" stroke="var(--color-line)" />
          <text x="310" y="186" fill="currentColor">
            1080p · HD
          </text>

          <rect x="298" y="206" width="150" height="32" rx="9" fill="var(--color-ink-800)" stroke="var(--color-line)" />
          <text x="310" y="226" fill="currentColor">
            MP3 · audio
          </text>
          {/* music note */}
          <path
            d="M430 221.5v-9.5l7-2v9.5"
            stroke="var(--color-accent-soft)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="427.6" cy="221.8" r="2.6" fill="var(--color-accent-soft)" />
          <circle cx="434.6" cy="219.8" r="2.6" fill="var(--color-accent-soft)" />
        </g>

        {/* in-window progress strip */}
        <rect x="114" y="252" width="332" height="9" rx="4.5" fill="var(--color-ink-800)" />
        <rect x="114" y="252" width="10" height="9" rx="4.5" fill="url(#hero-ill-accent)">
          <animate attributeName="width" values="22;262;22" keyTimes="0;0.62;1" dur="4.6s" repeatCount="indefinite" />
        </rect>
        <text x="446" y="260.5" fontSize="9" textAnchor="end" fill="currentColor" className="text-white/45">
          62%
        </text>
      </g>

      {/* --------------------------- dashed flow: window → folder */}
      <path
        d="M196 328c-22 26-44 44-56 64"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 8"
        className="animate-flow-dash"
      />

      {/* ------------------------------------------------ destination folder */}
      <g transform="translate(64 384)">
        {/* dropping file */}
        <g className="animate-file-drop">
          <rect x="34" y="-30" width="46" height="56" rx="7" fill="url(#hero-ill-accent)" opacity="0.92" />
          <path d="M47 -14h20M47 -6h20M47 2h12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* folder body */}
        <path
          d="M6 16h40l11 11h57a10 10 0 0 1 10 10v33a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10V16Z"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="1.5"
          transform="translate(0 -6)"
        />

        {/* success check */}
        <circle cx="104" cy="74" r="15" fill="var(--color-ok)" />
        <path
          d="M97.5 74.5l4.5 4.5 8.5-10"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          className="animate-draw-check"
        />
        <circle cx="104" cy="74" r="15" stroke="var(--color-ok)" strokeWidth="2" fill="none">
          <animate attributeName="r" values="15;24;15" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ------------------------------------------------ floating chips */}
      <g className="animate-bob">
        <rect x="398" y="30" width="98" height="34" rx="17" fill="url(#hero-ill-accent)" />
        <text x="421" y="52" fontSize="13" fontWeight="700" fill="#fff">
          4K UHD
        </text>
        {/* tiny monitor glyph */}
        <rect x="408" y="41" width="8" height="6" rx="1.5" stroke="#fff" strokeWidth="1.6" opacity="0.9" />
      </g>

      <g className="animate-bob-slow" style={{ animationDelay: '1.1s' }}>
        <rect x="8" y="212" width="76" height="34" rx="17" fill="var(--color-ink-800)" stroke="var(--color-line-strong)" />
        <path d="M25 229h13m-13-4.5v9m13-9v9m6-4.5h5a4.5 4.5 0 0 1 0 9h-2" stroke="var(--color-accent-soft)" strokeWidth="2" strokeLinecap="round" />
        <text x="46" y="234" fontSize="13" fontWeight="700" fill="currentColor" className="text-white/70">
          MP3
        </text>
      </g>

      <g className="animate-bob" style={{ animationDelay: '0.55s' }}>
        <rect x="408" y="428" width="132" height="34" rx="17" fill="var(--color-ink-800)" stroke="var(--color-ok)" strokeOpacity="0.45" />
        <path d="M424 445.5l3.5 3.5 6.5-7.5" stroke="var(--color-ok)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="440" y="450" fontSize="11.5" fontWeight="600" fill="currentColor" className="text-white/70">
          No watermark
        </text>
      </g>

      {/* ------------------------------------------------------ sparkles */}
      <g stroke="var(--color-accent-soft)" strokeWidth="2" strokeLinecap="round">
        <path d="M62 118v10M57 123h10" className="animate-pulse-soft" />
        <path d="M496 190v8M492 194h8" className="animate-pulse-soft" style={{ animationDelay: '0.8s' }} />
        <path d="M330 468v9M325.5 472.5h9" className="animate-pulse-soft" style={{ animationDelay: '1.6s' }} />
      </g>
      <circle cx="516" cy="120" r="3.5" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
      <circle cx="42" cy="330" r="3" fill="var(--color-cyan-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.2s' }} />
    </svg>
  )
}
