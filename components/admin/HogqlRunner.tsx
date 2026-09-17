'use client'

import { useState } from 'react'

import { Check, Copy, Loader2, Play, Table2, TriangleAlert } from 'lucide-react'

import { CellValue } from './CellValue'

interface HogqlResponse {
  columns: string[]
  rows: unknown[][]
  isCached?: boolean
  truncated?: boolean
  error?: string
}

const EXAMPLES: Array<{ label: string; sql: string }> = [
  {
    label: 'Top events · 7d',
    sql: `SELECT event, count() AS n, uniq(distinct_id) AS people
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY event
ORDER BY n DESC
LIMIT 25`
  },
  {
    label: 'Completed downloads · 24h',
    sql: `SELECT timestamp, event, distinct_id, properties
FROM events
WHERE event = 'download_completed'
  AND timestamp >= now() - INTERVAL 24 HOUR
ORDER BY timestamp DESC
LIMIT 50`
  },
  {
    label: 'Pageviews by referrer · 7d',
    sql: `SELECT properties.$referrer_host AS referrer,
       count() AS n,
       uniq(distinct_id) AS people
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY referrer
ORDER BY n DESC
LIMIT 15`
  },
  {
    label: 'Traffic by country · 30d',
    sql: `SELECT properties.$geoip_country_code AS country,
       count() AS n,
       uniq(distinct_id) AS people
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY country
ORDER BY n DESC
LIMIT 25`
  }
]

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function HogqlRunner() {
  const [sql, setSql] = useState(EXAMPLES[0].sql)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<HogqlResponse | null>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  async function run() {
    if (busy || sql.trim().length === 0) return
    setBusy(true)
    setError(null)
    const started = performance.now()
    try {
      const res = await fetch('/api/admin/hogql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      })
      const data = (await res.json().catch(() => ({}))) as HogqlResponse
      if (!res.ok) throw new Error(data.error ?? `Query failed (HTTP ${res.status})`)
      setResult(data)
      setElapsedMs(Math.round(performance.now() - started))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed — try again.')
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  async function copyResults() {
    if (!result) return
    try {
      const lines = [
        [...result.columns].join('\t'),
        ...result.rows.map((row) => row.map(formatCell).join('\t'))
      ]
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable (permissions, non-secure context) */
    }
  }

  const visibleColumns = result ? result.columns.slice(0, 30) : []
  const visibleRows = result ? result.rows.slice(0, 200) : []

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ editor */}
      <div className="rounded-xl border border-line bg-ink-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-white/35">Examples</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setSql(example.sql)}
                className="rounded-md border border-line bg-ink-950 px-2 py-1 text-[11px] font-medium text-white/60 transition-colors hover:border-accent/50 hover:text-white"
              >
                {example.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy || sql.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-deep via-accent to-accent-soft px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {busy ? 'Running…' : 'Run query'}
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          rows={10}
          spellCheck={false}
          aria-label="HogQL query"
          placeholder="SELECT … FROM events WHERE …"
          className="block w-full resize-y bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-white/90 placeholder:text-white/25 focus:outline-none"
        />
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-white/35">
          Read-only: only <code className="text-white/55">SELECT</code> / <code className="text-white/55">WITH</code> queries run (enforced
          server-side). Results are capped at 500 rows; keep time ranges short — the project shares a 240-queries/hour budget.
        </p>
      </div>

      {/* ------------------------------------------------------- errors */}
      {error ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words font-mono text-[12.5px]">{error}</span>
        </div>
      ) : null}

      {/* ------------------------------------------------------- results */}
      {result ? (
        <div className="overflow-hidden rounded-xl border border-line bg-ink-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <p className="flex items-center gap-2 text-xs text-white/50">
              <Table2 className="h-3.5 w-3.5 text-accent-soft" aria-hidden />
              {result.rows.length.toLocaleString()} rows · {result.columns.length} columns
              {typeof elapsedMs === 'number' ? ` · ${elapsedMs} ms` : ''}
              {result.isCached ? ' · cached' : ''}
              {result.truncated ? ' · truncated server-side' : ''}
            </p>
            <button
              type="button"
              onClick={copyResults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-ok" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {copied ? 'Copied' : 'Copy as TSV'}
            </button>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-ink-850">
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column} className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-[11px] font-semibold text-accent-soft">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="odd:bg-ink-900/40 even:bg-ink-900/80 hover:bg-white/[0.04]">
                    {visibleColumns.map((column, columnIndex) => (
                      <td key={column} className="max-w-[26rem] whitespace-nowrap border-b border-line/50 px-3 py-1.5 align-top text-[12px]">
                        <CellValue value={row[columnIndex]} />
                      </td>
                    ))}
                  </tr>
                ))}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, visibleColumns.length)} className="px-3 py-8 text-center text-sm text-white/35">
                      No rows returned.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
