import { FeatureArt, type FeatureArtVariant } from '@/components/illustrations/FeatureArt'
import { FEATURE_HIGHLIGHTS } from '@/lib/seo'

/** Art assigned to each highlight (1:1 with `FEATURE_HIGHLIGHTS[].icon`). */
const ART: Record<FeatureArtVariant, FeatureArtVariant> = {
  sparkles: 'sparkles',
  'user-x': 'user-x',
  zap: 'zap',
  layers: 'layers'
}

/** Candy plate colour per card, so the row reads as a sticker sheet. */
const PLATE = ['bg-sun text-[#101010]', 'bg-punch text-[#101010]', 'bg-lime text-[#101010]', 'bg-aqua text-[#101010]']

/**
 * Feature highlights: 4K, no registration, fast & free, multi-platform.
 * Each card pairs the marketing copy from `lib/seo.ts` with a `FeatureArt`
 * illustration; the dedicated `/features` page expands the same list.
 */
export function FeatureHighlights() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURE_HIGHLIGHTS.map((feature, index) => {
        const variant = ART[feature.icon] ?? 'sparkles'
        return (
          <li
            key={feature.title}
            className="nb-card nb-press-card flex h-full flex-col overflow-hidden"
          >
            <span
              aria-hidden="true"
              className={`${PLATE[index % PLATE.length]} nb-halftone border-b-[3px] border-line bg-blend-normal p-3`}
            >
              <span className="mx-auto block w-full max-w-[168px]">
                <FeatureArt variant={variant} />
              </span>
            </span>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-display text-sm uppercase">{feature.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-soft">{feature.description}</p>
              <p className="mt-3">
                <span className="nb-chip nb-chip-sm nb-chip-soft">{feature.keyword}</span>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
