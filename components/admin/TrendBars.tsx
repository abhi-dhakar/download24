interface TrendPoint {
  label: string
  value: number
}

interface TrendBarsProps {
  points: TrendPoint[]
  unit?: string
}

/** Tiny pure-CSS bar chart (14-day style activity). Native <title> tooltips. */
export function TrendBars({ points, unit }: TrendBarsProps) {
  const max = Math.max(1, ...points.map((point) => point.value))
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {points.map((point) => (
          <div
            key={point.label}
            className="group relative flex-1 rounded-t-[3px] bg-accent/40 transition-colors hover:bg-accent-soft/80"
            style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }}
            title={`${point.label} — ${point.value.toLocaleString()} ${unit ?? ''}`.trim()}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-white/30">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  )
}
