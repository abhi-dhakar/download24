import { StepArt, type StepArtVariant } from '@/components/illustrations/StepArt'
import { HOW_TO_STEPS } from '@/lib/seo'

/** Art assigned to each step of the guide (1:1 with `HOW_TO_STEPS`). */
const STEP_ART: StepArtVariant[] = ['copy', 'paste', 'quality', 'save']
/** Number-plate colours, one per step. */
const PLATE = ['bg-sun', 'bg-punch', 'bg-lime', 'bg-aqua']

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
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {HOW_TO_STEPS.map((step, index) => {
        const number = index + 1
        return (
          <li
            key={step.title}
            id={`step-${number}`}
            className="nb-card nb-press-card flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b-[3px] border-line bg-surface-2 p-3">
              <span
                aria-hidden="true"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-btn border-[3px] border-line ${
                  PLATE[index % PLATE.length]
                } font-display text-base text-[#101010]`}
              >
                {number}
              </span>
              <span className="mx-auto w-full max-w-[132px]">
                <StepArt variant={STEP_ART[index] ?? 'copy'} />
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-display text-sm uppercase">
                <span className="sr-only">Step {number}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
