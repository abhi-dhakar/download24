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
 * The horizontal "works with" strip rendered directly underneath the navbar.
 *
 * It lists every network in `lib/platforms.ts`, so a new platform shows up in
 * this bar, in the grid and in the API allow-list from the same one-line edit.
 *
 * It is deliberately a Server Component: the strip is pure markup, so it ships
 * zero JavaScript, lands inside the static HTML (crawlable, and no hydration
 * flicker) and cannot shift the layout. Below `xl` it scrolls sideways as a
 * snap strip instead of wrapping, which keeps the bar exactly one row tall.
 */
export function PlatformBar({
  activePlatformId,
  allPlatformsHref = '/platforms'
}: Props) {
  return (
    <nav
      aria-label="Supported platforms"
      className="relative z-30 border-b border-line bg-ink-950/65 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 px-3 sm:px-6">
        {/* Section label — only when there is room for it (xl+). */}
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-white/45 uppercase">
            Works with
          </span>
        </div>

        {/* The platform chips. */}
        <ul className="flex flex-1 snap-x snap-mandatory items-center gap-2 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] max-xl:[mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-14px),transparent)] xl:justify-center [&::-webkit-scrollbar]:hidden">
          {PLATFORMS.map((platform) => {
            const slug = getSlugForPlatformId(platform.id)
            const isActive = platform.id === activePlatformId
            /** Brand hue the chip glows with on hover/focus (see `.platform-chip`). */
            const brandStyle = { '--chip-brand': platform.accent } as CSSProperties

            const label = (
              <>
                <span className="grid h-4 w-4 shrink-0 place-items-center transition-transform duration-200 group-hover:scale-110">
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
                    className="platform-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-white"
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
                  className="platform-chip group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-white/70 hover:-translate-y-px hover:text-white focus-visible:-translate-y-px"
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
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:border-accent/50 hover:bg-accent/15 hover:text-white sm:inline-flex"
        >
          <span>1,000+ more</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}
