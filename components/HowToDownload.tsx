import { StepArt, type StepArtVariant } from '@/components/illustrations/StepArt'
import { HOW_TO_STEPS } from '@/lib/seo'

/** Art assigned to each step of the guide (1:1 with `HOW_TO_STEPS`). */
const STEP_ART: StepArtVariant[] = ['copy', 'paste', 'quality', 'save']

/**
 * Step-by-step "How to download" guide.
 *
 * Marked up as an ordered list of `<li><h3>` blocks — the semantic shape Google
 * uses to pull a step-by-step answer box — and mirrored in `HowTo` JSON-LD.
 * Each card carries a `StepArt` illustration; the dedicated `/how-it-works`
 * page renders the same steps in a larger layout.
 */
export function HowToDownload() {
  return (
    <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {HOW_TO_STEPS.map((step, index) => {
        const number = index + 1
        return (
          <li
            key={step.title}
            id={`step-${number}`}
            className="relative flex flex-col gap-3 rounded-(--radius-card) border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong sm:p-5"
          >
            <div className="mx-auto w-full max-w-[200px]">
              <StepArt variant={STEP_ART[index] ?? 'copy'} />
            </div>
            <div className="flex min-w-0 gap-3">
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
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{step.description}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
