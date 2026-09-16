import { ArrowUpRight, Check, Sparkles, Zap } from 'lucide-react'

import { MAX_RES_LABEL, PLATFORMS } from '@/lib/platforms'
import { PlatformMark } from './PlatformMark'

/**
 * Supported platforms grid for Download24.in.
 * Fully semantic, indexable content designed for high keyword visibility
 * and zero load latency.
 */
export function PlatformGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((platform) => (
        <li key={platform.id}>
          <article
            aria-labelledby={`platform-${platform.id}-title`}
            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-(--radius-card) border border-line bg-gradient-to-b from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:bg-white/[0.05] hover:shadow-2xl"
          >
            {/* Ambient Platform Brand Glow */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
              style={{ background: `radial-gradient(circle, ${platform.accent || '#FF6A3D'}, transparent 70%)` }}
            />

            <div>
              {/* Header: Icon, Name & Top Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink-900/90 ring-1 ring-inset ring-line transition-transform duration-300 group-hover:scale-105 group-hover:ring-line-strong">
                    <PlatformMark id={platform.id} className="h-7 w-7" title={platform.displayName} />
                  </span>
                  <div className="min-w-0">
                    <h3
                      id={`platform-${platform.id}-title`}
                      className="truncate text-base font-bold text-white transition-colors group-hover:text-accent"
                    >
                      {platform.name}
                    </h3>
                    <p className="text-[11px] font-medium text-white/45">
                      Fast Extractor · {MAX_RES_LABEL[platform.maxResolution]}
                    </p>
                  </div>
                </div>

                {/* Quick Link Indicator */}
                <a
                  href="#downloader"
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white"
                  title={`Download from ${platform.name}`}
                  aria-label={`Jump to downloader for ${platform.name}`}
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              {/* Badges strip (Watermark / Audio status) */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {platform.noWatermark && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ok/20 bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
                    <Zap className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                    No Watermark
                  </span>
                )}
                {platform.supportsMp3 && (
                  <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    MP3 Audio
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-line bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-white/60">
                  {MAX_RES_LABEL[platform.maxResolution]}
                </span>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {platform.blurb}
              </p>
            </div>

            {/* Quality Support Badges */}
            <div className="mt-4 pt-3 border-t border-line/60">
              <span className="sr-only">Available formats:</span>
              <ul className="flex flex-wrap gap-1.5" aria-label={`${platform.name} quality tiers`}>
                {platform.qualities.map((quality) => (
                  <li
                    key={quality}
                    className="inline-flex items-center gap-1 rounded-md bg-ink-900/80 px-2 py-1 text-[10px] font-medium text-white/70 ring-1 ring-inset ring-line transition-colors group-hover:border-line-strong"
                  >
                    <Check className="h-2.5 w-2.5 text-ok" aria-hidden="true" strokeWidth={3} />
                    {quality}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </li>
      ))}

      {/* Generic / All-Platform Extractor Card */}
      <li>
        <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-(--radius-card) border border-dashed border-accent/40 bg-gradient-to-br from-accent/[0.09] via-white/[0.01] to-transparent p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/70 hover:shadow-glow">
          <div>
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-inset ring-accent/30 transition-transform duration-300 group-hover:scale-105">
                <Sparkles className="h-6 w-6 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">1,000+ Other Sites</h3>
                <p className="mt-0.5 text-[11px] font-medium text-accent-soft">
                  Universal Video &amp; Audio Engine
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-white/65">
              Powered by high-performance upstream extraction. Download videos, music, and clips from{' '}
              <strong className="text-white/85">Pinterest, LinkedIn, Moj, ShareChat, Soundcloud, Bandcamp, Vimeo</strong>, and any direct HTML5 video stream.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-accent/20">
            <a
              href="#downloader"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-white"
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