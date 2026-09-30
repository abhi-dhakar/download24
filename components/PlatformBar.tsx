import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { CSSProperties } from 'react'

import { getSlugForPlatformId } from '@/lib/platformPages'
import { MAX_RES_LABEL, PLATFORMS, type PlatformId } from '@/lib/platforms'
import { PlatformMark } from './PlatformMark'

interface Props {
  /**
   * Platform of the page currently being viewed. Its chip is rendered as the
   * active item (`aria-current="page"`) instead of linking to itself.
   */
  activePlatformId?: PlatformId
  /** Where the "1,000+ more" link points; a plain anchor on the landing page. */
  allPlatformsHref?: string
}

/**
 * The horizontal "works with" strip of platform chips.
 *
 * Neo-brutalist treatment: every chip is a bordered sticker whose hover state
 * is painted with the network's own brand hue (`--chip-brand`), so the strip
 * stays monochrome-ink at rest and lights up in brand colours under the
 * cursor. Still a Server Component — pure markup, zero JavaScript, one row
 * tall at any width (it scrolls sideways below `xl`).
 */
export function PlatformBar({
  activePlatformId,
  allPlatformsHref = '/platforms'
}: Props) {
  return (
    <nav
      aria-label="Supported platforms"
      className="relative z-30 border-b-[3px] border-line bg-paper-2"
    >
      <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center gap-3 px-3 sm:px-6">
        {/* Section label — only when there is room for it (xl+). */}
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-line bg-ok" />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-ink-mute uppercase">
            Works with
          </span>
        </div>

        {/* The platform chips. */}
        <ul className="flex flex-1 snap-x snap-mandatory items-center gap-2 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] max-xl:[mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-14px),transparent)] xl:justify-center [&::-webkit-scrollbar]:hidden">
          {PLATFORMS.map((platform) => {
            const slug = getSlugForPlatformId(platform.id)
            const isActive = platform.id === activePlatformId
            /** Brand hue the chip lights up with on hover/focus (see `.platform-chip`). */
            const brandStyle = { '--chip-brand': platform.accent } as CSSProperties

            const label = (
              <>
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  <PlatformMark id={platform.id} className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap">{platform.displayName}</span>
              </>
            )

            if (isActive) {
              return (
                <li key={platform.id} className="shrink-0 snap-start">
                  <span
                    aria-current="page"
                    data-active="true"
                    style={brandStyle}
                    className="platform-chip platform-chip-active inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-mono text-[11px] font-bold uppercase"
                  >
                    {label}
                  </span>
                </li>
              )
            }

            return (
              <li key={platform.id} className="shrink-0 snap-start">
                <Link
                  href={slug ? `/${slug}` : '#downloader'}
                  style={brandStyle}
                  title={`${platform.name} downloader · up to ${MAX_RES_LABEL[platform.maxResolution]}`}
                  className="platform-chip inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-mono text-[11px] font-bold uppercase"
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Escape hatch for the ~1,000 other sites the engine can resolve. */}
        <Link
          href={allPlatformsHref}
          className="nb-chip nb-chip-sm nb-chip-brand hidden shrink-0 items-center gap-1.5 sm:inline-flex"
        >
          <span>1,000+ more</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}
