interface FunnelStep {
  label: string
  count: number
  /** Marks a step as a failure/abandonment branch instead of a forward step. */
  failed?: boolean
}

interface FunnelStepsProps {
  steps: FunnelStep[]
  windowLabel?: string
}

/**
 * Plain-CSS funnel: one bar per step, width proportional to the first step,
 * conversion % shown against the previous step. No chart library needed.
 */
export function FunnelSteps({ steps, windowLabel }: FunnelStepsProps) {
  const max = Math.max(1, ...steps.map((step) => step.count))
  const first = steps[0]?.count ?? 0

  return (
    <ol className="space-y-2.5">
      {steps.map((step, index) => {
        const previous = index === 0 ? step.count : steps[index - 1].count
        const widthPct = Math.max(step.count > 0 ? 2 : 0, (step.count / max) * 100)
        const conversion = previous > 0 ? (step.count / previous) * 100 : null
        return (
          <li key={step.label} className="grid grid-cols-[minmax(9rem,14rem)_1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr_auto]">
            <div className="min-w-0">
              <p className={`truncate text-[13px] font-medium ${step.failed ? 'text-white/45' : 'text-white/80'}`}>
                {step.failed ? '↳ ' : ''}
                {step.label}
              </p>
              {index > 0 && conversion !== null && !step.failed ? (
                <p className="text-[11px] tabular-nums text-white/35">{conversion.toFixed(1)}% of previous</p>
              ) : null}
            </div>
            <div className="h-5 overflow-hidden rounded-md bg-ink-800/80">
              <div
                className={`h-full rounded-md transition-[width] duration-500 ${
                  step.failed
                    ? 'bg-danger/45'
                    : 'bg-gradient-to-r from-accent-deep via-accent to-accent-soft'
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <p className={`text-right font-display text-sm font-semibold tabular-nums ${step.failed ? 'text-danger/80' : 'text-white/90'}`}>
              {step.count.toLocaleString()}
            </p>
          </li>
        )
      })}
      {windowLabel && first > 0 ? (
        <li className="pt-1 text-right text-[11px] text-white/35">{windowLabel}</li>
      ) : null}
    </ol>
  )
}
