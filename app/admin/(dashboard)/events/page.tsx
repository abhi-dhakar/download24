/**
 * /admin/events · raw event explorer.
 *
 * Every row carries the FULL `properties` payload (expandable), the distinct
 * id, the resolved person id and the exact timestamp — i.e. everything the
 * project ingested, straight from the events table. Filtering is plain
 * searchParams: the page is a server component, so each filter change is a
 * normal navigation and the query is built (and escaped) on the server.
 *
 * Filters:
 *   event   exact event name (datalist of the app's own catalogue + $events)
 *   person  exact distinct_id
 *   prop    `key:value` substring match on one property (e.g. $geoip_country_code:IN)
 *   hours   1 / 24 / 72 / 168 (7d) / 720 (30d) — default 24
 *   limit   10–100 rows — default 50
 */

import type { Metadata } from 'next'

import { EVENTS } from '@/lib/analytics'
import { posthogApiStatus, runHogql, sqlQuote } from '@/lib/posthogApi'

import { CellValue } from '@/components/admin/CellValue'
import { PosthogSetupNotice } from '@/components/admin/AdminSetupNotice'
import { SectionCard } from '@/components/admin/SectionCard'

export const metadata: Metadata = { title: 'Events' }

export const dynamic = 'force-dynamic'

const HOURS_OPTIONS = [
  { value: '1', label: 'Last hour' },
  { value: '24', label: 'Last 24 hours' },
  { value: '72', label: 'Last 3 days' },
  { value: '168', label: 'Last 7 days' },
  { value: '720', label: 'Last 30 days' }
] as const

const LIMIT_OPTIONS = [10, 25, 50, 100] as const

/** Built-in + app events, for the datalist. */
const KNOWN_EVENTS = [...Object.values(EVENTS), '$pageview', '$pageleave', '$autocapture', '$navigation_start']

const clampInt = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function parseHoursParam(raw: string | undefined): number {
  const parsed = Number(raw)
  const allowed = HOURS_OPTIONS.map((option) => Number(option.value))
  return allowed.includes(parsed) ? parsed : 24
}

function formatTs(value: unknown): string {
  if (value instanceof Date) return value.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }
  return String(value)
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const status = posthogApiStatus()
  if (!status.ready) {
    return (
      <div className="mx-auto max-w-2xl">
        <PosthogSetupNotice missing={status.missing} />
      </div>
    )
  }

  const params = await searchParams
  const single = (key: string): string | undefined => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const event = single('event')?.trim() ?? ''
  const person = single('person')?.trim() ?? ''
  const prop = single('prop')?.trim() ?? ''
  const hours = parseHoursParam(single('hours'))
  const limit = clampInt(single('limit'), 50, 10, 100)

  const clauses = [`timestamp >= now() - INTERVAL ${hours} HOUR`]
  let propKey: string | null = null
  if (event.length > 0) clauses.push(`event = ${sqlQuote(event)}`)
  if (person.length > 0) clauses.push(`distinct_id = ${sqlQuote(person)}`)
  if (prop.length > 0) {
    const separator = prop.indexOf(':')
    if (separator > 0) {
      propKey = prop.slice(0, separator)
      const needle = prop.slice(separator + 1)
      clauses.push(`position(properties[${sqlQuote(propKey)}], ${sqlQuote(needle)}) > 0`)
    } else {
      // No "key:" prefix — fall back to searching the event name and the
      // distinct id, which is usually what a bare token was meant for.
      clauses.push(`event = ${sqlQuote(prop)} OR distinct_id = ${sqlQuote(prop)}`)
    }
  }

  const sql = `SELECT timestamp, event, distinct_id, person.id AS person_id, properties
FROM events
WHERE ${clauses.join('\n  AND ')}
ORDER BY timestamp DESC
LIMIT ${limit}`

  let rows: unknown[][] | null = null
  let error: string | null = null
  try {
    const result = await runHogql(sql, 'admin-event-explorer')
    rows = result.rows
  } catch (err) {
    error = err instanceof Error ? err.message : 'Query failed.'
  }

  const windowLabel = HOURS_OPTIONS.find((option) => Number(option.value) === hours)?.label ?? `Last ${hours} h`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-white">Event explorer</h1>
        <p className="mt-0.5 text-xs text-white/40">
          Raw events with the full properties payload · newest first · {windowLabel.toLowerCase()}, max {limit} rows
        </p>
      </div>

      {/* ------------------------------------------------ filters */}
      <form method="GET" action="/admin/events" className="grid gap-3 rounded-xl border border-line bg-ink-900/70 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="f-event" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Event
          </label>
          <input
            id="f-event"
            name="event"
            type="text"
            list="known-events"
            value={event}
            placeholder="download_completed"
            spellCheck={false}
            className="w-full rounded-lg border border-line-strong bg-ink-950 px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <datalist id="known-events">
            {KNOWN_EVENTS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="f-person" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Distinct ID
          </label>
          <input
            id="f-person"
            name="person"
            type="text"
            value={person}
            placeholder="exact distinct_id"
            spellCheck={false}
            className="w-full rounded-lg border border-line-strong bg-ink-950 px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label htmlFor="f-prop" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Property
          </label>
          <input
            id="f-prop"
            name="prop"
            type="text"
            value={prop}
            placeholder="key:value"
            spellCheck={false}
            title='Substring match on one property, e.g. $geoip_country_code:IN or $current_url:/download'
            className="w-full rounded-lg border border-line-strong bg-ink-950 px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label htmlFor="f-hours" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Window
          </label>
          <select
            id="f-hours"
            name="hours"
            value={String(hours)}
            className="w-full rounded-lg border border-line-strong bg-ink-950 px-3 py-2 text-[12.5px] text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {HOURS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="f-limit" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
              Rows
            </label>
            <select
              id="f-limit"
              name="limit"
              value={limit}
              className="w-full rounded-lg border border-line-strong bg-ink-950 px-3 py-2 text-[12.5px] text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-accent-deep via-accent to-accent-soft px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Filter
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-white/35 sm:col-span-2 lg:col-span-6">
          Leave a field empty to ignore it. <code className="text-white/55">Property</code> takes <code className="text-white/55">key:value</code>{' '}
          (substring) — a bare value searches event name and distinct ID instead.
        </p>
      </form>

      {/* ------------------------------------------------ results */}
      <SectionCard
        title={`Events${rows ? ` · ${rows.length.toLocaleString()} shown` : ''}`}
        hint={`ordered by timestamp, descending${propKey ? ` · property filter: ${propKey}` : ''}`}
        error={error}
      >
        {rows && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 pr-3 font-medium">Time (UTC)</th>
                  <th className="pb-2 pr-3 font-medium">Event</th>
                  <th className="pb-2 pr-3 font-medium">Distinct ID</th>
                  <th className="pb-2 pr-3 font-medium">Person ID</th>
                  <th className="pb-2 font-medium">Properties (full payload)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={`${String(r[0])}-${index}`} className="border-t border-line/60 align-top odd:bg-ink-900/40 even:bg-ink-900/80">
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-white/60">{formatTs(r[0])}</td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-[11.5px] text-accent-soft">{String(r[1])}</td>
                    <td className="max-w-44 truncate whitespace-nowrap py-2 pr-3 font-mono text-[11px] text-white/50" title={String(r[2] ?? '')}>
                      {String(r[2])}
                    </td>
                    <td className="max-w-40 truncate whitespace-nowrap py-2 pr-3 font-mono text-[11px] text-white/40" title={String(r[3] ?? '')}>
                      {r[3] ? <CellValue value={r[3]} /> : <span className="text-white/25">—</span>}
                    </td>
                    <td className="py-2">
                      <CellValue value={r[4]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-white/35">
            No events match those filters{error ? '' : ' in the selected window'}.
          </p>
        )}
      </SectionCard>
    </div>
  )
}
