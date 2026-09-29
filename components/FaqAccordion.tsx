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
 *
 * Brutalist treatment: numbered plates, thick borders, and the open item lifts
 * off the page with a hard shadow.
 */
export function FaqAccordion() {
  return (
    <div className="flex flex-col gap-3.5">
      <FaqTracker />
      {FAQ_ITEMS.map((item, index) => (
        <details
          key={item.question}
          name="download24-faq"
          data-faq-question={item.question}
          className="nb-card-flat group overflow-hidden open:shadow-hard"
          {...(index === 0 ? { open: true } : {})}
        >
          <summary
            aria-label={`FAQ: ${item.question}`}
            className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-btn border-[2.5px] border-line bg-sun font-mono text-[11px] font-bold text-[#101010] group-open:bg-punch"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 font-sans text-[15px] leading-snug font-bold text-ink sm:text-base">
              {item.question}
            </span>
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-btn border-[2.5px] border-line bg-surface text-ink transition-transform duration-200 group-open:bg-sun"
            >
              <svg viewBox="0 0 16 16" className="faq-chevron h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M3 8h10M8 3v10" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="faq-panel border-t-[3px] border-line bg-surface-2 px-4 pt-3.5 pb-4 sm:px-5">
            <p className="max-w-3xl pl-0 text-sm leading-relaxed text-ink-soft sm:pl-12">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
