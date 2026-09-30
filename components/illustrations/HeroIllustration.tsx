/**
 * HeroIllustration — the signature artwork of the landing page.
 *
 * Neo-brutalist rebuild: flat candy fills, 4px ink outlines, hard offset
 * "printed" shadows (drawn as a duplicated shape offset by 6,6), tilted sticky
 * notes and a chunky file-card tumbling into a download tray.
 *
 * Still a dependency-free, hand-built SVG:
 *   · every colour comes from the design tokens, so it re-themes with the page
 *   · motion is CSS-class driven (bob / drift / float / pulse / drop) and is
 *     disabled wholesale by the global prefers-reduced-motion rule
 *   · `role="img"` + aria-label, because the scene is the product story
 */

interface HeroIllustrationProps {
  className?: string
}

export function HeroIllustration({ className = '' }: HeroIllustrationProps) {
  const svgClass = (className ? 'h-auto w-full ' + className : 'h-auto w-full').trim()

  return (
    <svg
      viewBox="0 0 560 500"
      className={svgClass}
      fill="none"
      role="img"
      aria-label="Illustration of the download flow: a link is pasted, quality options appear, and the file drops into your device"
    >
      {/* ------------------------------------------------------- backdrop */}
      <g opacity="0.9">
        {/* sun square, tilted */}
        <g className="animate-bob-slow">
          <rect x="36" y="42" width="96" height="96" rx="16" fill="var(--color-sun)" stroke="var(--color-line)" strokeWidth="4" />
          <path d="M84 70v26M70 84h28" stroke="#101010" strokeWidth="5" strokeLinecap="round" />
        </g>
        {/* punch circle */}
        <g className="animate-drift">
          <circle cx="486" cy="96" r="46" fill="var(--color-punch)" stroke="var(--color-line)" strokeWidth="4" />
          <path d="M466 96h40M486 76v40" stroke="#101010" strokeWidth="5" strokeLinecap="round" />
        </g>
        {/* aqua plate */}
        <g className="animate-float">
          <rect x="452" y="330" width="86" height="86" rx="14" fill="var(--color-aqua)" stroke="var(--color-line)" strokeWidth="4" />
          <path d="M495 352v30l14-15-14-15Z" fill="#101010" />
        </g>
      </g>

      {/* ------------------------------------------- the file card (centre) */}
      {/* hard shadow plate */}
      <rect x="146" y="96" width="300" height="322" rx="24" fill="var(--color-line)" />
      <g className="animate-bob">
        <rect
          x="134"
          y="84"
          width="300"
          height="322"
          rx="24"
          fill="var(--color-surface)"
          stroke="var(--color-line)"
          strokeWidth="4"
        />
        {/* window dots */}
        <g>
          <circle cx="162" cy="112" r="6" fill="var(--color-danger)" stroke="var(--color-line)" strokeWidth="3" />
          <circle cx="184" cy="112" r="6" fill="var(--color-sun)" stroke="var(--color-line)" strokeWidth="3" />
          <circle cx="206" cy="112" r="6" fill="var(--color-ok)" stroke="var(--color-line)" strokeWidth="3" />
        </g>
        <path d="M134 130h300" stroke="var(--color-line)" strokeWidth="4" />

        {/* thumbnail with play glyph */}
        <rect x="160" y="152" width="248" height="120" rx="14" fill="var(--color-surface-2)" stroke="var(--color-line)" strokeWidth="4" />
        <path d="M272 190v44l38-22-38-22Z" fill="var(--color-brand)" stroke="var(--color-line)" strokeWidth="4" strokeLinejoin="round" />
        {/* duration sticker */}
        <rect x="352" y="234" width="44" height="24" rx="7" fill="var(--color-ink)" />
        <text x="374" y="250" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--color-paper)">
          4:12
        </text>

        {/* quality rows */}
        <g>
          <rect x="160" y="292" width="248" height="30" rx="10" fill="var(--color-sun)" stroke="var(--color-line)" strokeWidth="3.5" />
          <rect x="172" y="303" width="70" height="8" rx="4" fill="#101010" />
          <path d="M372 300l8 8 12-14" stroke="#101010" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

          <rect x="160" y="330" width="248" height="30" rx="10" fill="var(--color-surface-2)" stroke="var(--color-line)" strokeWidth="3.5" />
          <rect x="172" y="341" width="94" height="8" rx="4" fill="var(--color-ink)" opacity="0.45" />

          <rect x="160" y="368" width="248" height="30" rx="10" fill="var(--color-surface-2)" stroke="var(--color-line)" strokeWidth="3.5" />
          <rect x="172" y="379" width="54" height="8" rx="4" fill="var(--color-ink)" opacity="0.45" />
        </g>
      </g>

      {/* --------------------------------------------- download arrow + tray */}
      <g className="animate-bob" style={{ animationDelay: '0.8s' }}>
        {/* sticker chips */}
        <g transform="rotate(-8 92 344)">
          <rect x="42" y="318" width="104" height="52" rx="14" fill="var(--color-lime)" stroke="var(--color-line)" strokeWidth="4" />
          <text x="94" y="352" textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fill="#101010">
            4K UHD
          </text>
        </g>
        <g transform="rotate(7 92 404)">
          <rect x="42" y="382" width="96" height="46" rx="14" fill="var(--color-punch)" stroke="var(--color-line)" strokeWidth="4" />
          <text x="90" y="412" textAnchor="middle" fontSize="20" fontFamily="var(--font-display)" fill="#101010">
            MP3
          </text>
        </g>
      </g>

      {/* tray + falling file */}
      <g>
        <path
          d="M180 432h180v18a22 22 0 0 1-22 22H202a22 22 0 0 1-22-22v-18Z"
          fill="var(--color-grape)"
          stroke="var(--color-line)"
          strokeWidth="4"
        />
        <g className="animate-file-drop">
          <rect x="246" y="398" width="48" height="40" rx="8" fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="4" />
          <path d="M270 406v18M262 416l8 8 8-8" stroke="var(--color-brand)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* ------------------------------------------------------- doodles */}
      <g stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round">
        <path d="M64 200v22M53 211h22" className="animate-pulse-soft" />
        <path d="M508 258v20M498 268h20" className="animate-pulse-soft" style={{ animationDelay: '0.6s' }} />
      </g>
      <g fill="var(--color-line)">
        <circle cx="118" cy="462" r="6" className="animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <circle cx="452" cy="188" r="7" className="animate-pulse-soft" style={{ animationDelay: '1.4s' }} />
      </g>
    </svg>
  )
}
