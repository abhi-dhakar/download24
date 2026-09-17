/**
 * /admin · overview.
 *
 * Six HogQL queries, all cached 60 s (see lib/posthogApi.ts), rendered in
 * parallel with per-section error isolation: a failing or slow query degrades
 * one card, never the whole page. KPIs + funnel come from a SINGLE 30-day
 * scan (countIf/uniqIf columns) because the PostHog query budget is shared
 * with every other dashboard the project owner runs.
 */

import type { Metadata } from 'next'

import { EVENTS } from '@/lib/analytics'
import { runHogql, posthogApiStatus } from '@/lib/posthogApi'

import { FunnelSteps } from '@/components/admin/FunnelSteps'
import { PosthogSetupNotice } from '@/components/admin/AdminSetupNotice'
import { SectionCard } from '@/components/admin/SectionCard'
import { StatCard } from '@/components/admin/StatCard'
import { TrendBars } from '@/components/admin/TrendBars'
import { CellValue } from '@/components/admin/CellValue'

export const metadata: Metadata = { title: 'Overview' }

export const dynamic = 'force-dynamic'

/* ---------------------------------------------------------------- helpers */

const num = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const fmt = (value: number): string => value.toLocaleString()

function formatTs(value: unknown): string {
  if (value instanceof Date) return value.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }
  return String(value)
}

function dayLabel(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type Section = { data: unknown[][] | null; error: string | null }

async function runSection(name: string, sql: string): Promise<Section> {
  try {
    const result = await runHogql(sql, name)
    return { data: result.rows, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Query failed.' }
  }
}

/** The KPI + funnel numbers in ONE 30-day scan (14 aggregate columns). */
function buildHeadlineSql(): string {
  const failed = `'${EVENTS.extractionFailed}','${EVENTS.downloadFailed}'`
  return `SELECT
  countIf(timestamp >= now() - INTERVAL 24 HOUR) AS events_24h,
  countIf(timestamp >= now() - INTERVAL 7 DAY) AS events_7d,
  uniqIf(distinct_id, timestamp >= now() - INTERVAL 24 HOUR) AS people_24h,
  uniqIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY) AS people_7d,
  uniq(distinct_id) AS people_30d,
  countIf(event IN (${failed}) AND timestamp >= now() - INTERVAL 24 HOUR) AS failed_24h,
  countIf(event = '${EVENTS.rateLimited}' AND timestamp >= now() - INTERVAL 24 HOUR) AS limited_24h,
  uniqIf(distinct_id, event = '${EVENTS.linkSubmitted}' AND timestamp >= now() - INTERVAL 7 DAY) AS step_link,
  uniqIf(distinct_id, event = '${EVENTS.extractionCompleted}' AND timestamp >= now() - INTERVAL 7 DAY) AS step_extraction,
  uniqIf(distinct_id, event = '${EVENTS.qualitySelected}' AND timestamp >= now() - INTERVAL 7 DAY) AS step_quality,
  uniqIf(distinct_id, event = '${EVENTS.downloadStarted}' AND timestamp >= now() - INTERVAL 7 DAY) AS step_started,
  uniqIf(distinct_id, event = '${EVENTS.downloadCompleted}' AND timestamp >= now() - INTERVAL 7 DAY) AS step_completed,
  countIf(event = '${EVENTS.extractionFailed}' AND timestamp >= now() - INTERVAL 7 DAY) AS failed_extraction_7d,
  countIf(event = '${EVENTS.downloadFailed}' AND timestamp >= now() - INTERVAL 7 DAY) AS failed_download_7d
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY`
}

/* ------------------------------------------------------------------ page */

export default async function AdminOverviewPage() {
  const status = posthogApiStatus()
  if (!status.ready) {
    return (
      <div className="mx-auto max-w-2xl">
        <PosthogSetupNotice missing={status.missing} />
      </div>
    )
  }

  const [headline, topEvents, trend, topPages, topReferrers, recentFailures] = await Promise.all([
    runSection('admin-overview-headline', buildHeadlineSql()),
    runSection(
      'admin-overview-top-events',
      `SELECT event, count() AS n, uniq(distinct_id) AS people
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY event
ORDER BY n DESC
LIMIT 18`
    ),
    runSection(
      'admin-overview-daily-trend',
      `SELECT toStartOfDay(timestamp) AS day, count() AS events, uniq(distinct_id) AS people
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
GROUP BY day
ORDER BY day`
    ),
    runSection(
      'admin-overview-top-pages',
      `SELECT splitByString('#', splitByString('?', properties.$current_url))[1] AS path, count() AS n
FROM events
WHERE event = '$pageview'
  AND properties.$current_url IS NOT NULL
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY path
ORDER BY n DESC
LIMIT 10`
    ),
    runSection(
      'admin-overview-top-referrers',
      `SELECT coalesce(properties.$referrer_host, '(direct)') AS referrer, count() AS n, uniq(distinct_id) AS people
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY referrer
ORDER BY n DESC
LIMIT 10`
    ),
    runSection(
      'admin-overview-recent-failures',
      `SELECT timestamp, event, properties.error_code AS code, properties.error AS message, distinct_id
FROM events
WHERE event IN ('${EVENTS.extractionFailed}','${EVENTS.downloadFailed}')
  AND timestamp >= now() - INTERVAL 48 HOUR
ORDER BY timestamp DESC
LIMIT 25`
    )
  ])

  const allFailed = [headline, topEvents, trend, topPages, topReferrers, recentFailures].every((section) => section.error !== null)
  const firstError = [headline, topEvents, trend, topPages, topReferrers, recentFailures].find((section) => section.error)?.error

  const row = headline.data?.[0]
  const kpis = {
    events24h: num(row?.[0]),
    events7d: num(row?.[1]),
    people24h: num(row?.[2]),
    people7d: num(row?.[3]),
    people30d: num(row?.[4]),
    failed24h: num(row?.[5]),
    limited24h: num(row?.[6])
  }

  const funnel = [
    { label: 'Link submitted', count: num(row?.[7]) },
    { label: 'Extraction completed', count: num(row?.[8]) },
    { label: 'Quality selected', count: num(row?.[9]) },
    { label: 'Download started', count: num(row?.[10]) },
    { label: 'Download completed', count: num(row?.[11]) },
    { label: 'extraction_failed (events)', count: num(row?.[12]), failed: true },
    { label: 'download_failed (events)', count: num(row?.[13]), failed: true }
  ]

  // 14 fixed slots so the chart keeps its shape on quiet days.
  const trendPoints: Array<{ label: string; value: number }> = []
  const trendByDay = new Map<string, number>()
  const peopleByDay = new Map<string, number>()
  for (const r of trend.data ?? []) {
    trendByDay.set(dayLabel(r[0]), num(r[1]))
    peopleByDay.set(dayLabel(r[0]), num(r[2]))
  }
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86_400_000)
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    trendPoints.push({ label, value: trendByDay.get(label) ?? 0 })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-0.5 text-xs text-white/40">
            Live PostHog data for this project · figures refresh at most every 60 seconds
          </p>
        </div>
      </div>

      {allFailed ? (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          Every PostHog query failed this render — the dashboard itself is fine, but the API is not reachable or the credentials were rejected.
          <br />
          <span className="font-mono text-xs">{firstError}</span>
        </div>
      ) : null}

      {/* ------------------------------------------------ KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Events · 24h" value={headline.data ? fmt(kpis.events24h) : '—'} />
        <StatCard label="Events · 7d" value={headline.data ? fmt(kpis.events7d) : '—'} />
        <StatCard label="People · 24h" value={headline.data ? fmt(kpis.people24h) : '—'} />
        <StatCard label="People · 7d" value={headline.data ? fmt(kpis.people7d) : '—'} />
        <StatCard label="People · 30d" value={headline.data ? fmt(kpis.people30d) : '—'} />
        <StatCard
          label="Failures · 24h"
          value={headline.data ? fmt(kpis.failed24h) : '—'}
          tone={headline.data && kpis.failed24h > 0 ? 'danger' : 'ok'}
          sub="extraction + download"
        />
        <StatCard
          label="Rate limited · 24h"
          value={headline.data ? fmt(kpis.limited24h) : '—'}
          tone={headline.data && kpis.limited24h > 0 ? 'warn' : 'default'}
        />
      </div>

      {/* ---------------------------------------- funnel + activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Download funnel · 7 days" hint="unique people per step" error={headline.error}>
          <FunnelSteps steps={funnel} windowLabel="7-day window · failures shown as events" />
        </SectionCard>

        <SectionCard title="Activity · 14 days" hint="events per day (UTC)" error={trend.error}>
          <TrendBars points={trendPoints} unit="events" />
          {trend.data ? (
            <p className="mt-4 text-[11px] text-white/35">
              {fmt(trendPoints.reduce((acc, point) => acc + point.value, 0))} events total ·{' '}
              {fmt(trend.data.reduce((acc, r) => acc + num(r[2]), 0))} unique people over 14 days
            </p>
          ) : null}
        </SectionCard>
      </div>

      {/* ---------------------------------------- breakdowns */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Top events · 7 days" error={topEvents.error}>
          {topEvents.data && topEvents.data.length > 0 ? (
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 text-right font-medium">Count</th>
                  <th className="pb-2 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.data.map((r) => (
                  <tr key={String(r[0])} className="border-t border-line/60">
                    <td className="max-w-40 truncate py-1.5 font-mono text-[11.5px] text-white/80" title={String(r[0])}>
                      {String(r[0])}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-white/70">{fmt(num(r[1]))}</td>
                    <td className="py-1.5 text-right tabular-nums text-white/50">{fmt(num(r[2]))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-white/35">No events yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Top pages · 7 days" hint="$pageview" error={topPages.error}>
          {topPages.data && topPages.data.length > 0 ? (
            <ol className="space-y-1">
              {topPages.data.map((r) => (
                <li key={String(r[0])} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate font-mono text-[11.5px] text-white/70" title={String(r[0])}>
                    {String(r[0])}
                  </span>
                  <span className="shrink-0 tabular-nums text-white/50">{fmt(num(r[1]))}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/35">No pageviews yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Top referrers · 7 days" hint="$pageview" error={topReferrers.error}>
          {topReferrers.data && topReferrers.data.length > 0 ? (
            <ol className="space-y-1">
              {topReferrers.data.map((r) => (
                <li key={String(r[0])} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate font-mono text-[11.5px] text-white/70" title={String(r[0])}>
                    {String(r[0])}
                  </span>
                  <span className="shrink-0 tabular-nums text-white/50">
                    {fmt(num(r[1]))} · {fmt(num(r[2]))}p
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/35">No referrer data yet.</p>
          )}
        </SectionCard>
      </div>

      {/* ---------------------------------------- recent failures */}
      <SectionCard title="Recent failures · 48 hours" hint="extraction_failed + download_failed" error={recentFailures.error}>
        {recentFailures.data && recentFailures.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 font-medium">Time (UTC)</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Message</th>
                  <th className="pb-2 font-medium">Distinct ID</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.data.map((r, index) => (
                  <tr key={`${String(r[0])}-${index}`} className="border-t border-line/60 align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-white/60">{formatTs(r[0])}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-[11.5px] text-danger/90">{String(r[1])}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3">
                      <CellValue value={r[2]} />
                    </td>
                    <td className="max-w-72 py-1.5 pr-3">
                      <CellValue value={r[3]} />
                    </td>
                    <td className="max-w-36 truncate whitespace-nowrap py-1.5 font-mono text-[11px] text-white/45" title={String(r[4] ?? '')}>
                      {String(r[4])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-white/35">No failures in the last 48 hours. 🎉</p>
        )}
      </SectionCard>
    </div>
  )
}
