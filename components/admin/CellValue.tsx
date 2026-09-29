/**
 * Renders one arbitrary HogQL cell: scalars inline, objects/arrays as a
 * collapsible JSON block, `null` as a dash. Server-safe (no hooks) so the
 * same component works in server pages and in the client-side SQL runner.
 */

const LONG_INLINE_LIMIT = 140

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  }
  return false
}

function JsonBlock({ data }: { data: unknown }) {
  const pretty = JSON.stringify(data, null, 2) ?? String(data)
  return (
    <details className="max-w-md">
      <summary className="cursor-pointer select-none rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-brand-ink hover:bg-surface-2">
        {pretty.length > 48 ? `${pretty.slice(0, 48)}…` : pretty}
      </summary>
      <pre className="mt-1.5 max-h-72 max-w-full overflow-auto rounded-lg border border-line bg-paper/90 p-2.5 text-[11px] leading-relaxed text-ink-soft">
        {pretty}
      </pre>
    </details>
  )
}

export function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-ink-mute">—</span>
  }
  if (value instanceof Date) {
    return <span className="tabular-nums text-ink-soft">{value.toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="tabular-nums text-ink">{String(value)}</span>
  }
  if (typeof value === 'string') {
    if (value.length > 0 && looksLikeJson(value)) return <JsonBlock data={JSON.parse(value)} />
    if (value.length > LONG_INLINE_LIMIT) {
      return (
        <span className="break-all text-ink-soft" title={value}>
          {value.slice(0, LONG_INLINE_LIMIT)}…
        </span>
      )
    }
    return <span className="break-words text-ink">{value || <span className="text-ink-mute">''</span>}</span>
  }
  return <JsonBlock data={value} />
}
