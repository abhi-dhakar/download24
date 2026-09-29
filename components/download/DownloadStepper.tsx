import { ArrowDownToLine, Check, Link2, SlidersHorizontal } from 'lucide-react'

/**
 * DownloadStepper — the "you are here" indicator for the three-page download
 * flow (homepage → /download → /download/progress).
 *
 * Pure server component: the current step arrives as a prop from whichever
 * page renders it, and states are expressed with classes only. Each step is a
 * bordered chip joined by a fat rule — done steps go lime, the current step
 * goes sun-yellow with a hard shadow, upcoming steps stay flat.
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
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={`inline-flex min-w-0 items-center gap-2 rounded-pill border-[2.5px] border-line px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase sm:px-3 sm:text-[11px] ${
                state === 'done'
                  ? 'bg-lime text-[#101010]'
                  : state === 'current'
                    ? 'bg-sun text-[#101010] shadow-hard-xs'
                    : 'bg-surface text-ink-mute'
              }`}
            >
              {state === 'done' ? (
                <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" aria-hidden="true" />
              ) : (
                <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
              )}
              <span className="hidden truncate sm:inline">{step.label}</span>
              <span className="sm:hidden">{number}</span>
            </span>

            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="h-[3px] min-w-3 flex-1">
                <span className={`block h-[3px] w-full ${state === 'done' ? 'bg-ok' : 'bg-line-soft'}`} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
