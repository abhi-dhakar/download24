import { FAQ_ITEMS } from '@/lib/seo'
import { FaqTracker } from './FaqTracker'

/**
 * FAQ accordion built from native `<details>` / `<summary>` elements.
 *
 * Why native: it is keyboard accessible and screen-reader friendly with zero
 * JavaScript, it survives a failed hydration, and the `name` attribute gives us
 * exclusive-open accordion behaviour for free in evergreen browsers. The exact
 * same array feeds the `FAQPage` JSON-LD, so the rich result always matches the
 * visible answer.
 */
export function FaqAccordion() {
  return (
    <div className="flex flex-col gap-2.5">
      <FaqTracker />
      {FAQ_ITEMS.map((item, index) => (
        <details
          key={item.question}
          name="download24-faq"
          data-faq-question={item.question}
          className="group rounded-(--radius-card) border border-line bg-white/[0.02] px-4 transition-colors open:border-line-strong open:bg-white/[0.04] hover:border-line-strong"
          {...(index === 0 ? { open: true } : {})}
        >
          <summary
            aria-label={`FAQ: ${item.question}`}
            className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left text-sm font-semibold text-white sm:text-[15px]"
          >
            <span className="min-w-0">{item.question}</span>
            <span
              aria-hidden="true"
              className="faq-chevron mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-white/60 ring-1 ring-inset ring-line transition-transform duration-200"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M8 3v10" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="faq-panel pb-4">
            <p className="max-w-3xl text-sm leading-relaxed text-white/60">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
