import { ArrowDownToLine, Check, Link2, SlidersHorizontal } from 'lucide-react'

/**
 * DownloadStepper — the "you are here" indicator for the three-page download
 * flow (homepage → /download → /download/progress).
 *
 * Pure server component: the current step arrives as a prop from whichever
 * page renders it, and states are expressed with classes only.
 */

const STEPS = [
  { label: 'Paste link', icon: Link2 },
  { label: 'Choose quality', icon: SlidersHorizontal },
  { label: 'Download file', icon: ArrowDownToLine }
] as const

export function DownloadStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="Download progress"
      className="mx-auto flex w-full max-w-2xl items-center gap-2 sm:gap-3"
    >
      {STEPS.map((step, index) => {
        const number = index + 1
        const state = number < current ? 'done' : number === current ? 'current' : 'upcoming'
        const Icon = step.icon

        return (
          <li key={step.label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 transition-colors ${
                  state === 'done'
                    ? 'bg-ok/15 text-ok ring-ok/40'
                    : state === 'current'
                      ? 'bg-gradient-to-br from-accent-soft via-accent to-accent-deep text-white shadow-glow ring-accent/40'
                      : 'bg-white/[0.03] text-white/40 ring-line'
                }`}
              >
                {state === 'done' ? (
                  <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4 stroke-[2.25]" aria-hidden="true" />
                )}
              </span>
              <span
                className={`hidden truncate text-xs font-semibold sm:block ${
                  state === 'upcoming' ? 'text-white/40' : 'text-white/85'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px min-w-3 flex-1 sm:min-w-6">
                <span
                  className={`block h-px w-full ${state === 'done' ? 'bg-ok/50' : 'bg-line'}`}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
