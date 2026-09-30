import Link from 'next/link'
import { ArrowUpRight, Check, Music, Sparkles, Zap } from 'lucide-react'

import { getSlugForPlatformId } from '@/lib/platformPages'
import { MAX_RES_LABEL, PLATFORMS } from '@/lib/platforms'
import { PlatformMark } from './PlatformMark'

/**
 * Supported platforms grid for download24.in.
 *
 * Fully semantic, indexable content — and the loudest grid on the site: every
 * card carries the network's own colour as a solid top plate, thick ink
 * borders, a hard shadow and a lift-on-hover. The last cell is the universal
 * "1,000+ other sites" card.
 */
export function PlatformGrid() {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((platform) => {
        const slug = getSlugForPlatformId(platform.id)
        const targetHref = slug ? `/${slug}` : '#downloader'
        const brand = platform.accent || '#2f5bff'

        return (
          <li key={platform.id}>
            <article
              aria-labelledby={`platform-${platform.id}-title`}
              className="nb-card nb-press-card group relative flex h-full flex-col justify-between overflow-hidden"
            >
              {/* Solid brand plate across the top of the card. */}
              <span
                aria-hidden="true"
                className="block h-2.5 w-full border-b-[3px] border-line"
                style={{ backgroundColor: brand }}
              />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-btn border-[3px] border-line bg-surface-2 transition-transform duration-200 group-hover:-rotate-6">
                      <PlatformMark id={platform.id} className="h-7 w-7" title={platform.displayName} />
                    </span>
                    <div className="min-w-0">
                      <h3
                        id={`platform-${platform.id}-title`}
                        className="truncate font-display text-base uppercase"
                      >
                        <Link href={targetHref} className="hover:underline hover:decoration-[3px] hover:underline-offset-4">
                          {platform.name}
                        </Link>
                      </h3>
                      <p className="font-mono text-[10px] font-bold tracking-wide text-ink-mute uppercase">
                        Up to {MAX_RES_LABEL[platform.maxResolution]}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={targetHref}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border-[2.5px] border-line bg-surface text-ink transition-colors hover:bg-sun"
                    title={`Dedicated ${platform.name} Downloader`}
                    aria-label={`Dedicated downloader for ${platform.name}`}
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {platform.noWatermark && (
                    <span className="nb-chip nb-chip-sm nb-chip-lime">
                      <Zap className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                      No watermark
                    </span>
                  )}
                  {platform.supportsMp3 && (
                    <span className="nb-chip nb-chip-sm nb-chip-punch">
                      <Music className="h-2.5 w-2.5" aria-hidden="true" />
                      MP3
                    </span>
                  )}
                  <span className="nb-chip nb-chip-sm nb-chip-soft">
                    {MAX_RES_LABEL[platform.maxResolution]}
                  </span>
                </div>

                <p className="mt-3.5 text-xs leading-relaxed text-ink-soft">{platform.blurb}</p>
              </div>

              <div className="mx-5 mb-5 flex items-center justify-between gap-2 border-t-[2.5px] border-line pt-3">
                <ul className="flex flex-wrap gap-1.5" aria-label={`${platform.name} quality tiers`}>
                  {platform.qualities.slice(0, 3).map((quality) => (
                    <li
                      key={quality}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-line-soft bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-soft"
                    >
                      <Check className="h-2.5 w-2.5 text-ok-ink" aria-hidden="true" strokeWidth={3.5} />
                      {quality}
                    </li>
                  ))}
                </ul>
                {slug && (
                  <Link
                    href={`/${slug}`}
                    className="shrink-0 font-mono text-[10px] font-bold tracking-wide text-brand-ink uppercase underline decoration-[2.5px] underline-offset-4"
                  >
                    Open →
                  </Link>
                )}
              </div>
            </article>
          </li>
        )
      })}

      {/* Generic / all-platform extractor card */}
      <li>
        <article className="nb-card nb-press-card group relative flex h-full flex-col justify-between overflow-hidden border-dashed bg-surface-2">
          <span aria-hidden="true" className="nb-stripes block h-2.5 w-full border-b-[3px] border-line bg-punch text-[#101010]" />

          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-btn border-[3px] border-line bg-sun transition-transform duration-200 group-hover:rotate-6">
                <Sparkles className="h-6 w-6 text-[#101010]" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base uppercase">1,000+ other sites</h3>
                <p className="font-mono text-[10px] font-bold tracking-wide text-ink-mute uppercase">
                  Universal engine
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-ink-soft">
              Powered by a high-performance upstream extractor. Grab videos, music and clips from{' '}
              <strong className="font-bold text-ink">Pinterest, LinkedIn, Moj, ShareChat, Soundcloud,
              Bandcamp, Vimeo</strong>, and any direct HTML5 video stream.
            </p>
          </div>

          <div className="mx-5 mb-5 border-t-[2.5px] border-line pt-3">
            <a
              href="#downloader"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wide text-brand-ink uppercase underline decoration-[2.5px] underline-offset-4"
            >
              <span>Test your link now</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          </div>
        </article>
      </li>
    </ul>
  )
}
