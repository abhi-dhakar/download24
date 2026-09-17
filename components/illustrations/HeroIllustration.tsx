/**
 * HeroIllustration — the signature artwork of the landing page.
 *
 * A hand-built, dependency-free SVG scene that tells the whole product story in
 * one glance: a browser window resolves a pasted link, lists quality options,
 * streams the file (animated progress bar) and drops it into a folder with a
 * success check — surrounded by floating "4K / MP3 / no watermark" chips.
 */

interface HeroIllustrationProps {
  className?: string;
}

export function HeroIllustration({ className = '' }: HeroIllustrationProps) {
  const svgClass = className
    ? 'h-auto w-full ' + className
    : 'h-auto w-full';

  return (
    <svg
      viewBox="0 0 560 500"
      className={svgClass.trim()}
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

        <radialGradient id="hero-ill-glow-a" cx="1/2" cy="1/2" r="1/2">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="hero-ill-glow-b" cx="1/2" cy="1/2" r="1/2">
          <stop offset="0%" stopColor="var(--color-cyan-glow)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-cyan-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Backdrop */}
      <g aria-hidden="true">
        <circle cx="150" cy="118" r="168" fill="url(#hero-ill-glow-a)" />
        <circle cx="436" cy="392" r="176" fill="url(#hero-ill-glow-b)" />

        {/* Rotating orbit ring */}
        <ellipse
          cx="280"
          cy="240"
          rx="252"
          ry="218"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
          strokeDasharray="3 12"
          opacity="1"
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
      </g>

      {/* Browser Window */}
      <g>
        <rect
          x="90"
          y="60"
          width="380"
          height="260"
          rx="20"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
        />

        {/* Title bar controls */}
        <line x1="90" y1="104" x2="470" y2="104" stroke="var(--color-line)" strokeWidth="2" />
        <circle cx="114" cy="82" r="5" fill="var(--color-danger)" opacity="1" />
        <circle cx="132" cy="82" r="5" fill="var(--color-warn)" opacity="1" />
        <circle cx="150" cy="82" r="5" fill="var(--color-ok)" opacity="1" />

        {/* Address Bar */}
        <rect
          x="196"
          y="70"
          width="212"
          height="24"
          rx="12"
          fill="var(--color-ink-800)"
          stroke="var(--color-line)"
        />
        <rect x="206" y="78" width="9" height="7" rx="2" fill="var(--color-ok)" opacity="1" />
        <text
          x="222"
          y="82"
          dominantBaseline="central"
          fontSize="10"
          fill="currentColor"
          className="text-white/60"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          youtube com/watch?v=…
        </text>

        {/* Video Preview Card */}
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
          <circle cx="198" cy="171" r="22" fill="url(#hero-ill-accent)" opacity="1" />
          <path d="M192 160v21l18-11-18-10Z" fill="#fff" />

          {/* Pulsing play button halo */}
          <circle cx="198" cy="171" r="22" stroke="var(--color-accent-soft)" strokeWidth="2">
            <animate attributeName="r" values="22;30;22" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Video Timeline bar */}
          <rect x="128" y="216" width="140" height="5" rx="2" fill="var(--color-ink-700)" />
          <rect x="128" y="216" width="10" height="5" rx="2" fill="var(--color-accent-soft)">
            <animate
              attributeName="width"
              values="26;104;26"
              keyTimes="0;1/2;1"
              dur="4s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        {/* Quality Option Rows */}
        <g className="text-white/45" fontSize="11" fontWeight="600">
          {/* Option: 4K */}
          <rect
            x="298"
            y="126"
            width="150"
            height="32"
            rx="9"
            fill="var(--color-ink-800)"
            stroke="var(--color-accent)"
            strokeOpacity="1"
          />
          <text x="310" y="142" dominantBaseline="central" fill="currentColor">
            2160p - 4K
          </text>
          <rect x="392" y="134" width="44" height="16" rx="8" fill="url(#hero-ill-accent)" />
          <text
            x="414"
            y="142"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fill="#fff"
            letterSpacing="1"
          >
            BEST
          </text>

          {/* Option: 1080p */}
          <rect
            x="298"
            y="166"
            width="150"
            height="32"
            rx="9"
            fill="var(--color-ink-800)"
            stroke="var(--color-line)"
          />
          <text x="310" y="182" dominantBaseline="central" fill="currentColor">
            1080p - HD
          </text>

          {/* Option: MP3 */}
          <rect
            x="298"
            y="206"
            width="150"
            height="32"
            rx="9"
            fill="var(--color-ink-800)"
            stroke="var(--color-line)"
          />
          <text x="310" y="222" dominantBaseline="central" fill="currentColor">
            MP3 - audio
          </text>
          <path
            d="M430 221v-9l7-2v9"
            stroke="var(--color-accent-soft)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="428" cy="222" r="3" fill="var(--color-accent-soft)" />
          <circle cx="435" cy="220" r="3" fill="var(--color-accent-soft)" />
        </g>

        {/* Progress Strip */}
        <rect x="114" y="252" width="332" height="9" rx="5" fill="var(--color-ink-800)" />
        <rect x="114" y="252" width="10" height="9" rx="5" fill="url(#hero-ill-accent)">
          <animate
            attributeName="width"
            values="22;262;22"
            keyTimes="0;1/2;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </rect>
        <text
          x="446"
          y="256"
          dominantBaseline="central"
          fontSize="9"
          textAnchor="end"
          fill="currentColor"
          className="text-white/45"
        >
          62%
        </text>
      </g>

      {/* Dashed Flow Connector */}
      <path
        d="M196 328c-22 26-44 44-56 64"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 8"
        className="animate-flow-dash"
      />

      {/* Destination Folder */}
      <g transform="translate(64, 384)">
        {/* Dropping File Animation */}
        <g className="animate-file-drop">
          <rect x="34" y="-30" width="46" height="56" rx="7" fill="url(#hero-ill-accent)" opacity="1" />
          <path d="M47 -14h20M47 -6h20M47 2h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="1" />
        </g>

        {/* Folder Container */}
        <path
          d="M6 16h40l11 11h57a10 10 0 0 1 10 10v33a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10V16Z"
          fill="var(--color-ink-850)"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
          transform="translate(0, -6)"
        />

        {/* Checkmark Confirmation */}
        <circle cx="104" cy="74" r="15" fill="var(--color-ok)" />
        <path
          d="M97 74l5 5 9-10"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          className="animate-draw-check"
        />
        <circle cx="104" cy="74" r="15" stroke="var(--color-ok)" strokeWidth="2" fill="none">
          <animate attributeName="r" values="15;24;15" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Floating Chips */}
      <g className="animate-bob">
        <rect x="398" y="30" width="98" height="34" rx="17" fill="url(#hero-ill-accent)" />
        <text x="421" y="47" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#fff">
          4K UHD
        </text>
        <rect x="408" y="41" width="8" height="6" rx="2" stroke="#fff" strokeWidth="2" opacity="1" />
      </g>

      {/* Floating MP3 Chip */}
      <g className="animate-bob-slow" style={{ animationDelay: '1s' }}>
        <rect
          x="8"
          y="212"
          width="82"
          height="34"
          rx="17"
          fill="var(--color-ink-800)"
          stroke="var(--color-line-strong)"
        />
        <path
          d="M24 233v-9l6-2v9"
          stroke="var(--color-accent-soft)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="233" r="2" fill="var(--color-accent-soft)" />
        <circle cx="28" cy="231" r="2" fill="var(--color-accent-soft)" />
        <text
          x="40"
          y="229"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="700"
          fill="currentColor"
          className="text-white/70"
        >
          MP3
        </text>
      </g>

      <g className="animate-bob" style={{ animationDelay: '1s' }}>
        <rect
          x="408"
          y="428"
          width="132"
          height="34"
          rx="17"
          fill="var(--color-ink-800)"
          stroke="var(--color-ok)"
          strokeOpacity="1"
        />
        <path
          d="M424 445l4 4 6-7"
          stroke="var(--color-ok)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="440"
          y="445"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="600"
          fill="currentColor"
          className="text-white/70"
        >
          No watermark
        </text>
      </g>

      {/* Ambient Sparkles */}
      <g stroke="var(--color-accent-soft)" strokeWidth="2" strokeLinecap="round">
        <path d="M62 118v10M57 123h10" className="animate-pulse-soft" />
        <path d="M496 190v8M492 194h8" className="animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <path d="M330 468v9M325 472h9" className="animate-pulse-soft" style={{ animationDelay: '2s' }} />
      </g>
      <circle cx="516" cy="120" r="3" fill="var(--color-accent-soft)" className="animate-pulse-soft" />
      <circle
        cx="42"
        cy="330"
        r="3"
        fill="var(--color-cyan-glow)"
        className="animate-pulse-soft"
        style={{ animationDelay: '1s' }}
      />
    </svg>
  );
}