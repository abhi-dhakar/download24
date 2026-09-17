/**
 * Read-only client for the PostHog HTTP API (HogQL queries + project info).
 *
 * This is what powers the /admin dashboard. Design rules:
 *
 *   - server-only: the personal API key lives in `process.env` and never
 *     reaches the browser; every query is issued from server components or
 *     admin route handlers;
 *   - fail soft: every call throws `PosthogApiError` with a human-readable
 *     hint instead of leaking raw axios-style stacks into the UI;
 *   - budget aware: the PostHog query API is capped at 240 queries/hour and
 *     10 s per query, so results are cached in a 60 s LRU (dev hot-reloads
 *     and dashboard tab-watching must not burn the hourly quota);
 *   - the API host is derived from the same `NEXT_PUBLIC_POSTHOG_HOST` the
 *     rest of the app uses, so US/EU/self-hosted deployments all work.
 *
 * Required environment:
 *   POSTHOG_PERSONAL_API_KEY   personal API key (Settings → Your account →
 *                              API keys) with the "Query Read" permission.
 *   POSTHOG_PROJECT_ID         optional; when unset the project is resolved
 *                              automatically by matching
 *                              NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN.
 */

import 'server-only'

import { LRUCache } from 'lru-cache'

import { POSTHOG_TOKEN, posthogUiHost } from './analytics'

const QUERY_CACHE_TTL_MS = 60_000
const PROJECT_INFO_TTL_MS = 60 * 60 * 1000
const INITIAL_REQUEST_TIMEOUT_MS = 35_000
const POLL_TIMEOUT_MS = 20_000
const POLL_TOTAL_BUDGET_MS = 15_000
const MAX_PROJECT_LIST_PAGES = 3

export class PosthogApiError extends Error {
  status: number | undefined

  constructor(message: string, hint?: string, status?: number) {
    super(message)
    this.name = 'PosthogApiError'
    this.status = status
    if (hint) this.message = `${message} — ${hint}`
  }
}

function getPersonalKey(): string | undefined {
  return process.env.POSTHOG_PERSONAL_API_KEY?.trim() || undefined
}

function getApiHost(): string {
  return posthogUiHost().replace(/\/+$/, '')
}

function authHeaders(): HeadersInit {
  const key = getPersonalKey()
  if (!key) throw new PosthogApiError('POSTHOG_PERSONAL_API_KEY is not set')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
}

function timedAbort(timeoutMs: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, done: () => clearTimeout(timer) }
}

async function readApiError(res: Response): Promise<PosthogApiError> {
  const status = res.status
  let detail: string | undefined
  try {
    const body = (await res.json()) as { detail?: unknown; code?: unknown }
    if (typeof body.detail === 'string' && body.detail) detail = body.detail
    else if (typeof body.code === 'string') detail = body.code
  } catch {
    /* non-JSON error body */
  }

  if (status === 401 || status === 403) {
    return new PosthogApiError(
      'PostHog rejected the credentials',
      'Check POSTHOG_PERSONAL_API_KEY — it must be a *personal* API key with the "Query Read" permission (project API keys / phc_… tokens cannot run queries).',
      status
    )
  }
  if (status === 404) {
    return new PosthogApiError(
      'PostHog project not found',
      'Check POSTHOG_PROJECT_ID, or that NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN belongs to a project this key can see.',
      status
    )
  }
  if (status === 429) {
    return new PosthogApiError(
      'PostHog rate limit or read budget reached',
      'Wait a minute and try again — the query API allows 240 queries/hour per project.',
      status
    )
  }
  if (status >= 500) {
    return new PosthogApiError(`PostHog returned ${status}`, 'Try again shortly.', status)
  }
  return new PosthogApiError(
    detail ?? `PostHog query failed (HTTP ${status})`,
    status >= 400 ? 'Check the SQL and the time range — large scans are rejected.' : undefined,
    status
  )
}

/** Resolves the numeric project id, matching the public token when needed. */
async function resolveProjectId(): Promise<number> {
  const explicit = process.env.POSTHOG_PROJECT_ID?.trim()
  if (explicit && /^\d+$/.test(explicit)) return Number(explicit)

  const base = getApiHost()
  let cursor: string | null = `${base}/api/projects/?limit=100`
  for (let attempt = 0; cursor && attempt < MAX_PROJECT_LIST_PAGES; attempt += 1) {
    const page = await fetch(cursor, { headers: authHeaders() })
    if (!page.ok) throw await readApiError(page)
    const body = (await page.json()) as {
      results: Array<{ id: number; public_token?: string }>
      next: string | null
    }
    if (POSTHOG_TOKEN) {
      const match = body.results.find((project) => project.public_token === POSTHOG_TOKEN)
      if (match) return match.id
    } else if (body.results.length === 1) {
      // No public token to match against, exactly one project in scope: use it.
      return body.results[0].id
    }
    cursor = body.next ? new URL(body.next, base).toString() : null
  }

  throw new PosthogApiError(
    'Could not resolve the PostHog project id',
    'Set POSTHOG_PROJECT_ID explicitly (project settings → project id), or make sure POSTHOG_PERSONAL_API_KEY can see the project of NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN.'
  )
}

const projectIdCache = new LRUCache<string, number>({ max: 4, ttl: PROJECT_INFO_TTL_MS })

async function projectId(): Promise<number> {
  const cacheKey = process.env.POSTHOG_PROJECT_ID?.trim() || POSTHOG_TOKEN || 'only-project'
  const cached = projectIdCache.get(cacheKey)
  if (cached) return cached
  const resolved = await resolveProjectId()
  projectIdCache.set(cacheKey, resolved)
  return resolved
}

/* -------------------------------------------------------------------------- */
/*                              HogQL query runner                            */
/* -------------------------------------------------------------------------- */

export interface HogqlResult {
  columns: string[]
  rows: unknown[][]
  isCached: boolean
}

interface HogqlResponseShape {
  results?: {
    columns?: Array<{ name: string; type?: string } | string>
    rows?: unknown[][]
  }
  is_cached?: boolean
  query_status?: { id: string; complete: boolean }
}

const queryCache = new LRUCache<string, HogqlResult>({ max: 200, ttl: QUERY_CACHE_TTL_MS })

function normalizeResults(body: HogqlResponseShape): { columns: string[]; rows: unknown[][] } {
  const raw = body.results
  if (!raw || !Array.isArray(raw.rows)) {
    throw new PosthogApiError('PostHog returned no result rows', 'The query may have run async — try again.')
  }
  const columns = (raw.columns ?? []).map((column, index) =>
    typeof column === 'string' ? column : (column.name ?? `column_${index + 1}`)
  )
  return { columns, rows: raw.rows }
}

async function posthogQueryOnce(body: Record<string, unknown>): Promise<HogqlResult> {
  const projectIdValue = await projectId()
  const url = `${getApiHost()}/api/projects/${projectIdValue}/query/`
  const { signal, done } = timedAbort(INITIAL_REQUEST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal
    })
  } catch (error) {
    throw new PosthogApiError(
      'Could not reach the PostHog API',
      `Check NEXT_PUBLIC_POSTHOG_HOST (got ${getApiHost()}).`,
      undefined
    )
  } finally {
    done()
  }
  if (!res.ok) throw await readApiError(res)

  const data = (await res.json()) as HogqlResponseShape
  if (data.results?.rows) {
    return { ...normalizeResults(data), isCached: data.is_cached === true }
  }
  if (data.query_status && !data.query_status.complete) {
    return await pollQuery(data.query_status.id)
  }
  throw new PosthogApiError('Unexpected response shape from the PostHog query API')
}

async function pollQuery(queryId: string): Promise<HogqlResult> {
  const started = Date.now()
  const projectIdValue = await projectId()
  const url = `${getApiHost()}/api/projects/${projectIdValue}/query/${queryId}/`

  while (Date.now() - started < POLL_TOTAL_BUDGET_MS) {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    const { signal, done } = timedAbort(POLL_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url, { headers: authHeaders(), signal })
    } finally {
      done()
    }
    if (!res.ok) throw await readApiError(res)
    const data = (await res.json()) as HogqlResponseShape
    if (data.results?.rows) return { ...normalizeResults(data), isCached: data.is_cached === true }
    if (!data.query_status || data.query_status.complete) {
      break // completed but shape changed; fall through to the error below
    }
  }
  throw new PosthogApiError('PostHog query did not finish in time', 'Narrow the time range or add a LIMIT, then retry.')
}

/**
 * Runs a HogQL statement against the project and returns plain rows.
 * Results are cached for 60 s per distinct SQL string.
 */
export async function runHogql(sql: string, name: string): Promise<HogqlResult> {
  const trimmed = sql.trim().replace(/;+\s*$/, '')
  if (!/^\s*select/i.test(trimmed) && !/^\s*with/i.test(trimmed)) {
    throw new PosthogApiError('Only read-only queries are allowed', 'Queries must start with SELECT (or WITH).')
  }
  const cacheKey = `${name}|${trimmed}`
  const cached = queryCache.get(cacheKey)
  if (cached) return { ...cached, isCached: true }

  const result = await posthogQueryOnce({
    query: { kind: 'HogQLQuery', query: trimmed },
    name,
    refresh: 'blocking'
  })
  queryCache.set(cacheKey, result)
  return result
}

/* -------------------------------------------------------------------------- */
/*                                Project info                                */
/* -------------------------------------------------------------------------- */

export interface ProjectInfo {
  id: number
  name: string
  createdAt?: string
  apiHost: string
  /** Deep link into the same project's web UI (overview + raw events). */
  uiOverviewUrl: string
  uiEventsUrl: string
}

const projectInfoCache = new LRUCache<string, ProjectInfo>({ max: 4, ttl: PROJECT_INFO_TTL_MS })

/** Project name + deep links; falls back to metadata-only info on lookup failure. */
export async function getProjectInfo(): Promise<ProjectInfo> {
  const cacheKey = process.env.POSTHOG_PROJECT_ID?.trim() || POSTHOG_TOKEN || 'only-project'
  const cached = projectInfoCache.get(cacheKey)
  if (cached) return cached

  const apiHost = getApiHost()
  const fallback: ProjectInfo = {
    id: 0,
    name: POSTHOG_TOKEN ? 'configured project' : 'project',
    apiHost,
    uiOverviewUrl: `${apiHost}/project/`,
    uiEventsUrl: `${apiHost}/project/`
  }
  try {
    const id = await projectId()
    const res = await fetch(`${apiHost}/api/projects/${id}/`, { headers: authHeaders() })
    if (!res.ok) throw new Error(String(res.status))
    const body = (await res.json()) as { id: number; name?: string; created_at?: string }
    const info: ProjectInfo = {
      id: body.id,
      name: body.name ?? `Project ${body.id}`,
      createdAt: body.created_at,
      apiHost,
      uiOverviewUrl: `${apiHost}/project/${id}/`,
      uiEventsUrl: `${apiHost}/project/${id}/events/`
    }
    projectInfoCache.set(cacheKey, info)
    return info
  } catch {
    return fallback
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Status                                   */
/* -------------------------------------------------------------------------- */

export type PosthogApiStatus =
  | { ready: true }
  | { ready: false; missing: string[] }

/** Synchronous, env-only health check — safe to call during rendering. */
export function posthogApiStatus(): PosthogApiStatus {
  const missing: string[] = []
  if (!getPersonalKey()) missing.push('POSTHOG_PERSONAL_API_KEY')
  if (!process.env.POSTHOG_PROJECT_ID?.trim() && !POSTHOG_TOKEN) {
    missing.push('POSTHOG_PROJECT_ID (or NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN to auto-resolve)')
  }
  return missing.length === 0 ? { ready: true } : { ready: false, missing }
}

/**
 * SQL string literal escaping for values interpolated into HogQL.
 * ClickHouse-style `''` doubling; control characters are dropped.
 */
export function sqlQuote(value: string): string {
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/'/g, "''")
  return `'${cleaned.slice(0, 512)}'`
}
