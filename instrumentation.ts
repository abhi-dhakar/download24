/**
 * Server-side instrumentation hooks (Node.js runtime).
 *
 * `onRequestError` forwards every uncaught error from Server Components, route
 * handlers and server actions to PostHog error tracking, tagged with the route
 * and the browser's distinct id when the request carried one. Route handlers
 * that *handle* their failures (`/api/parse`, `/api/download`) report those as
 * regular `extraction_failed` / `download_failed` events instead.
 */

import type { Instrumentation } from 'next'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // Warm the singleton so the first captured event does not pay for construction.
  const { posthogServer } = await import('@/lib/posthogServer')
  posthogServer()
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { captureServerException } = await import('@/lib/posthogServer')
    const header = request.headers['x-posthog-distinct-id']
    const distinctId = (Array.isArray(header) ? header[0] : header) || 'server'
    const digest =
      typeof error === 'object' && error !== null && 'digest' in error
        ? String((error as { digest?: unknown }).digest)
        : undefined

    captureServerException(error, distinctId, {
      request_path: request.path,
      request_method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
      render_source: context.renderSource,
      revalidate_reason: context.revalidateReason,
      ...(digest ? { digest } : {})
    })
  } catch {
    /* never let the reporter fail the request */
  }
}
