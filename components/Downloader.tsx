'use client'

/**
 * Download24.in - Hero Extractor component.
 * Features validated URL processing, automated loading states, clipboard integration,
 * local download history, and an ultra-modern responsive UI.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, Clipboard, History, Info, Search, Trash2, X, Zap } from 'lucide-react'

import { PLATFORMS } from '@/lib/platforms'
import type { ParsePayload } from '@/lib/types'

import { LoadingPanel } from './Spinner'
import { ResultCard } from './ResultCard'

// Updated storage key to prevent collisions with legacy clones
const RECENT_KEY = 'download24in:recent'
const MAX_RECENT = 5

interface Failure {
  message: string
  hint?: string
  retryAfter?: number
  status?: number
}

interface Inspected {
  ok: boolean
  reason?: string
  host?: string
}

const KNOWN_HOSTS = PLATFORMS.flatMap((platform) => platform.hosts)

/** Lightweight client-side safety net (not the main security boundary). */
export function inspectLink(value: string): Inspected {
  const trimmed = value.trim()
  if (!trimmed) return { ok: false, reason: 'Paste a video link to begin.' }
  if (/\s/.test(trimmed)) return { ok: false, reason: 'Link contains spaces. Copy the pure URL.' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'Enter a complete URL starting with https://' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: `Only HTTP/HTTPS links are supported.` }
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const known = KNOWN_HOSTS.some((entry) => host === entry || host.endsWith(`.${entry}`))
  if (!known) {
    return { ok: false, reason: `${host} is not supported yet. Request it below!`, host }
  }
  return { ok: true, host }
}

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function writeRecent(entries: string[]): void {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(entries))
  } catch {
    /* Private modes or full storage gracefully ignored */
  }
}

export function Downloader() {
  const formId = useId()
  const inputId = `${formId}-url`
  const helpId = `${formId}-help`
  const statusId = `${formId}-status`

  const [url, setUrl] = useState('')
  const [data, setData] = useState<ParsePayload | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{ cached: boolean; tookMs: number } | null>(null)
  const [invalidHint, setInvalidHint] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [stage, setStage] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)

  /* Hydrate history only after mount to prevent hydration mismatch */
  useEffect(() => {
    setRecent(readRecent())
    mountedRef.current = true
  }, [])

  /* Change loading hints progressively during active fetch */
  useEffect(() => {
    if (!loading) {
      setStage(0)
      return
    }
    const timer = setInterval(() => setStage((val) => Math.min(2, val + 1)), 1400)
    return () => clearInterval(timer)
  }, [loading])

  /* Press "/" to focus search input instantly */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const extract = useCallback(async (raw: string, options: { refresh?: boolean } = {}) => {
    const candidate = raw.trim()
    const inspected = inspectLink(candidate)
    if (!inspected.ok) {
      setInvalidHint(inspected.reason ?? 'Invalid link format.')
      inputRef.current?.focus()
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setFailure(null)
    setInvalidHint(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/parse${options.refresh ? '?refresh=1' : ''}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ url: candidate }),
        signal: controller.signal
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: ParsePayload; cached: boolean; tookMs: number }
        | { ok: false; message?: string; hint?: string; retryAfter?: number }
        | null

      if (!response.ok || !payload || payload.ok !== true) {
        const failureBody = payload && payload.ok === false ? payload : null
        setFailure({
          message:
            failureBody?.message ??
            (response.status === 429
              ? 'Too many requests. Please try again in 1 minute.'
              : `Engine error (HTTP ${response.status}). Our team is notified.`),
          hint: failureBody?.hint,
          retryAfter: failureBody?.retryAfter,
          status: response.status
        })
        setData(null)
        return
      }

      setData(payload.data)
      setStats({ cached: payload.cached, tookMs: payload.tookMs })
      setRecent((current) => {
        const next = [candidate, ...current.filter((entry) => entry !== candidate)].slice(0, MAX_RECENT)
        writeRecent(next)
        return next
      })

      // Updates browser URL without polluting user's session history
      window.history.replaceState(null, '', `?url=${encodeURIComponent(candidate)}`)
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      setFailure({
        message: 'No response from Download24 servers.',
        hint: 'Please check your internet connection and try again.'
      })
      setData(null)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }, [])

  /* Parse arriving query parameter immediately (e.g. sharing from external source) */
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('url')
    if (param) {
      setUrl(param)
      void extract(param)
    }
    return () => abortRef.current?.abort()
  }, [extract])

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData('text')?.trim()
      if (!text) return
      if (inspectLink(text).ok) {
        event.preventDefault()
        setUrl(text)
        void extract(text)
      }
    },
    [extract]
  )

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText())?.trim()
      if (!text) {
        setNotice('Clipboard is empty! Copy a video URL first.')
        return
      }
      setUrl(text)
      if (inspectLink(text).ok) {
        void extract(text)
      } else {
        setInvalidHint(inspectLink(text).reason ?? null)
      }
    } catch {
      setNotice('Browser blocked clipboard reading. Press Ctrl+V or Cmd+V directly in the input.')
      inputRef.current?.focus()
    }
  }, [extract])

  const clearInput = useCallback(() => {
    setUrl('')
    setInvalidHint(null)
    setFailure(null)
    setData(null)
    setStats(null)
    window.history.replaceState(null, '', window.location.pathname)
    inputRef.current?.focus()
  }, [])

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void extract(url)
    },
    [extract, url]
  )

  const liveStatus = loading
    ? 'Scanning URL and preparing download options.'
    : data
      ? `Success: ${data.options.length} qualities available.`
      : failure
        ? failure.message
        : 'Awaiting video URL input.'

  return (
    <div className="w-full">
      {/* Outer Glow Card Wrapper */}
      <form
        onSubmit={submit}
        className="group relative rounded-[1.4rem] bg-gradient-to-r from-accent-soft/75 via-accent/50 to-accent-deep/75 p-[1px] shadow-glow transition-shadow focus-within:shadow-[0_0_0_1px_rgba(56,189,248,0.45),0_15px_60px_-15px_rgba(2,132,199,0.4)]"
        aria-labelledby="downloader-heading"
      >
        <div className="flex flex-col gap-1 rounded-[calc(1.4rem-1px)] bg-ink-950/95 p-1.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-5 w-5 shrink-0 text-white/30 group-focus-within:text-accent/80 transition-colors"
              aria-hidden="true"
            />
            <label htmlFor={inputId} className="sr-only">
              Paste video or audio link from YouTube, Instagram, Facebook, X, Reddit or Twitch
            </label>
            <input
              id={inputId}
              ref={inputRef}
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={invalidHint ? `${helpId} ${statusId}` : helpId}
              aria-invalid={invalidHint ? true : undefined}
              aria-busy={loading || undefined}
              placeholder="Paste YouTube Shorts, Instagram Reels, FB, or X link..."
              value={url}
              onChange={(event) => {
                const next = event.target.value
                setUrl(next)
                if (invalidHint && next.trim().length > 0 && inspectLink(next).ok) {
                  setInvalidHint(null)
                }
              }}
              onPaste={onPaste}
              onInvalid={(event) => event.preventDefault()}
              className="w-full min-w-0 rounded-xl bg-transparent py-3 pr-24 pl-11 text-[15px] text-white placeholder-white/35 outline-none transition-all sm:py-4 sm:text-base md:pr-28"
            />
            
            {/* Action buttons embedded in the input bar */}
            <div className="absolute right-2 flex items-center gap-1">
              {url.length > 0 && (
                <button
                  type="button"
                  onClick={clearInput}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
                  title="Clear field"
                  aria-label="Clear link input"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                title="Paste link from clipboard"
                aria-label="Paste link from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden xs:inline">Paste</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-[1.08] active:scale-[0.98] disabled:cursor-progress disabled:opacity-85 sm:w-auto sm:shrink-0 shadow-md"
            aria-keyshortcuts="/"
          >
            {loading ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>Processing…</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Auxiliary Metadata Row */}
      <div className="mt-2.5 flex flex-col gap-1.5 px-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p id={helpId} className="text-white/45">
          {invalidHint ? (
            <span className="inline-flex items-center gap-1.5 text-danger font-medium" role="alert">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {invalidHint}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
              HD MP4, Audio MP3, and 4K Ultra HD supported • Press <kbd className="rounded bg-white/10 px-1 font-mono text-[10px]">/</kbd> to focus
            </span>
          )}
        </p>
        {notice && (
          <p className="text-warn font-medium sm:text-right" role="status">
            {notice}
          </p>
        )}
      </div>

      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {liveStatus}
      </p>

      {/* History panel */}
      {recent.length > 0 && !data && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/[0.01] p-2.5 text-xs">
          <span className="inline-flex items-center gap-1 text-white/40">
            <History className="h-3.5 w-3.5 text-white/30" aria-hidden="true" />
            Recently Saved:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((entry) => (
              <span key={entry} className="inline-flex items-center rounded-lg bg-white/[0.04] p-0.5 pr-2 pl-2 border border-line hover:bg-white/[0.08] transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    setUrl(entry)
                    void extract(entry)
                  }}
                  className="max-w-[12rem] truncate text-white/70 hover:text-white"
                  title={entry}
                >
                  {entry.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = recent.filter((item) => item !== entry)
                    setRecent(next)
                    writeRecent(next)
                  }}
                  className="ml-1.5 rounded-md p-0.5 text-white/30 hover:bg-white/10 hover:text-danger"
                  aria-label={`Remove history entry`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setRecent([])
              writeRecent([])
            }}
            className="ml-auto text-white/35 hover:text-white/70 underline decoration-white/20 underline-offset-2"
          >
            Clear History
          </button>
        </div>
      )}

      {/* Dynamic Results Area */}
      <div className="mt-6 result-slot">
        {loading && !data && <LoadingPanel stage={stage} />}

        {failure && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-(--radius-card) border border-danger/25 bg-danger/[0.05] p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{failure.message}</p>
                {failure.hint && (
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{failure.hint}</p>
                )}
                {failure.retryAfter && (
                  <p className="mt-1 text-xs text-warn">Please wait {failure.retryAfter}s before retrying.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => void extract(url, { refresh: true })}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Retry link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFailure(null)
                    setData(null)
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Clear error
                </button>
              </div>
            </div>
          </div>
        )}

        {data && !loading && (
          <ResultCard
            data={data}
            cached={stats?.cached}
            tookMs={stats?.tookMs}
            busy={loading}
            onRefresh={() => void extract(url, { refresh: true })}
            onClose={() => {
              setData(null)
              setStats(null)
              window.history.replaceState(null, '', window.location.pathname)
            }}
          />
        )}

        {/* Empty State placeholder */}
        {!loading && !data && !failure && (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-line bg-white/[0.01] p-8 text-center sm:p-12">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40 ring-1 ring-inset ring-line">
              <Zap className="h-5 w-5 text-white/55" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white/80">Ready to fetch media options</p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-white/45">
                Insert a supported URL in the container above. We'll automatically identify the format, resolve file options up to 4K resolution, and prepare water-mark-free video, audio stream, and custom MP3 downloads.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}