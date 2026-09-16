import { HOW_TO_STEPS } from '@/lib/seo'

/**
 * Step-by-step "How to download" guide.
 *
 * Marked up as an ordered list of `<li><h3>` blocks — the semantic shape Google
 * uses to pull a step-by-step answer box — and mirrored in `HowTo` JSON-LD.
 */
export function HowToDownload() {
  return (
    <ol className="relative grid gap-3 lg:grid-cols-2">
      {HOW_TO_STEPS.map((step, index) => {
        const number = index + 1
        return (
          <li
            key={step.title}
            id={`step-${number}`}
            className="relative flex gap-4 rounded-(--radius-card) border border-line bg-white/[0.02] p-4 sm:p-5"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-soft via-accent to-accent-deep font-display text-sm font-bold text-white"
            >
              {number}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white sm:text-base">
                <span className="sr-only">
                  Step {number}:{' '}
                </span>
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
