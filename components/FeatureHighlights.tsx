import { FeatureArt, type FeatureArtVariant } from '@/components/illustrations/FeatureArt'
import { FEATURE_HIGHLIGHTS } from '@/lib/seo'

/** Art assigned to each highlight (1:1 with `FEATURE_HIGHLIGHTS[].icon`). */
const ART: Record<FeatureArtVariant, FeatureArtVariant> = {
  sparkles: 'sparkles',
  'user-x': 'user-x',
  zap: 'zap',
  layers: 'layers'
}

/**
 * Feature highlights: 4K, no registration, fast & free, multi-platform.
 * Each card pairs the marketing copy from `lib/seo.ts` with a `FeatureArt`
 * illustration; the dedicated `/features` page expands the same list.
 */
export function FeatureHighlights() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURE_HIGHLIGHTS.map((feature) => {
        const variant = ART[feature.icon] ?? 'sparkles'
        return (
          <li
            key={feature.title}
            className="relative overflow-hidden rounded-(--radius-card) border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
            />
            <div className="mx-auto w-full max-w-[190px]">
              <FeatureArt variant={variant} />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white">{feature.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">{feature.description}</p>
            <p className="mt-3 text-[10px] font-medium tracking-wide text-white/30 uppercase">
              {feature.keyword}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
