import { Layers, Sparkles, UserX, Zap } from 'lucide-react'

import { FEATURE_HIGHLIGHTS } from '@/lib/seo'

const ICONS = {
  sparkles: Sparkles,
  'user-x': UserX,
  zap: Zap,
  layers: Layers
} as const

/** Feature highlights: 4K, no registration, fast & free, multi-platform. */
export function FeatureHighlights() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURE_HIGHLIGHTS.map((feature) => {
        const Icon = ICONS[feature.icon] ?? Sparkles
        return (
          <li
            key={feature.title}
            className="relative overflow-hidden rounded-(--radius-card) border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
            />
            <Icon className="h-5 w-5 text-accent-soft" aria-hidden="true" strokeWidth={2} />
            <h3 className="mt-3 text-sm font-semibold text-white">{feature.title}</h3>
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
