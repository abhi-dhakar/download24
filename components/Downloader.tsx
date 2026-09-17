'use client'

/**
 * Download24.in — hero extractor input (step 1 of the three-page flow).
 *
 * The homepage and every dedicated platform page render this box. It handles
 * client-side validation, clipboard integration and local history — then hands
 * over to `/download?url=…` (step 2) which runs the actual extraction and
 * lists the quality options.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowDownToLine, ClipboardPaste, History, Info, Search, Trash2, X } from 'lucide-react'

import { EVENTS, hostOf } from '@/lib/analytics'
import { track } from '@/lib/analyticsClient'
import { PLATFORMS, platformForUrl } from '@/lib/platforms'

// Storage key kept from the legacy inline flow so existing visitors keep history.
const RECENT_KEY = 'download24in:recent'
const MAX_RECENT = 5

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

/** Shared step-2 destination builder (also used by the download pages). */
export function downloadDetailsPath(raw: string): string {
  return `/download?url=${encodeURIComponent(raw.trim())}`
}

export function Downloader() {
  const router = useRouter()
  const formId = useId()
  const inputId = `${formId}-url`
  const helpId = `${formId}-help`

  const [url, setUrl] = useState('')
  const [invalidHint, setInvalidHint] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [navigating, setNavigating] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  /* Hydrate history only after mount to prevent hydration mismatch */
  useEffect(() => {
    setRecent(readRecent())
  }, [])

  /* Continue a shared `/?url=…` link straight into step 2 */
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('url')
    if (!param) return
    if (inspectLink(param).ok) {
      router.replace(downloadDetailsPath(param))
    } else {
      setUrl(param)
      setInvalidHint(inspectLink(param).reason ?? null)
    }
  }, [router])

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

  const goToStepTwo = useCallback(
    (raw: string, method: 'submit' | 'paste' | 'clipboard_button' | 'recent' = 'submit') => {
      const candidate = raw.trim()
      const inspected = inspectLink(candidate)
      if (!inspected.ok) {
        setInvalidHint(inspected.reason ?? 'Invalid link format.')
        inputRef.current?.focus()
        // The pasted text itself is never sent — only why it was rejected.
        track(EVENTS.linkRejected, {
          method,
          reason: inspected.reason,
          source_host: inspected.host ?? hostOf(candidate),
          input_length: candidate.length
        })
        return
      }

      setRecent((current) => {
        const next = [candidate, ...current.filter((entry) => entry !== candidate)].slice(0, MAX_RECENT)
        writeRecent(next)
        return next
      })

      track(EVENTS.linkSubmitted, {
        method,
        source_host: inspected.host,
        platform: platformForUrl(candidate)?.id ?? 'unknown',
        entry_page: window.location.pathname
      })

      setNavigating(true)
      router.push(downloadDetailsPath(candidate))
    },
    [router]
  )

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData('text')?.trim()
      if (!text) return
      if (inspectLink(text).ok) {
        event.preventDefault()
        setUrl(text)
        goToStepTwo(text, 'paste')
      }
    },
    [goToStepTwo]
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
        goToStepTwo(text, 'clipboard_button')
      } else {
        setInvalidHint(inspectLink(text).reason ?? null)
        track(EVENTS.linkRejected, {
          method: 'clipboard_button',
          reason: inspectLink(text).reason,
          source_host: hostOf(text),
          input_length: text.length
        })
      }
    } catch {
      setNotice('Browser blocked clipboard reading. Press Ctrl+V or Cmd+V directly in the input.')
      inputRef.current?.focus()
    }
  }, [goToStepTwo])

  const clearInput = useCallback(() => {
    setUrl('')
    setInvalidHint(null)
    setNotice(null)
    window.history.replaceState(null, '', window.location.pathname)
    inputRef.current?.focus()
  }, [])

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      goToStepTwo(url)
    },
    [goToStepTwo, url]
  )

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
              Paste a video or audio link from YouTube, Instagram, Facebook, X, Reddit, Twitch or TeraBox
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
              aria-describedby={helpId}
              aria-invalid={invalidHint ? true : undefined}
              placeholder="Paste a YouTube, Instagram, TikTok, X or TeraBox link..."
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
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden xs:inline">Paste</span>
              </button>
            </div>
          </div>

          {/* Submit Button — kicks off the three-page flow */}
          <button
            type="submit"
            disabled={navigating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-[1.08] active:scale-[0.98] disabled:cursor-progress disabled:opacity-85 sm:w-auto sm:shrink-0 shadow-md"
            aria-keyshortcuts="/"
          >
            {navigating ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>Opening…</span>
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
        <p id={helpId} className="text-white/45" role={invalidHint ? 'alert' : undefined}>
          {invalidHint ? (
            <span className="inline-flex items-center gap-1.5 text-danger font-medium">
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

      {/* History panel */}
      {recent.length > 0 && (
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
                    track(EVENTS.recentLinkReused, { source_host: hostOf(entry) })
                    goToStepTwo(entry, 'recent')
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
              track(EVENTS.recentHistoryCleared, { entries: recent.length })
              setRecent([])
              writeRecent([])
            }}
            className="ml-auto inline-flex items-center gap-1 text-white/35 hover:text-white/70"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Clear History
          </button>
        </div>
      )}
    </div>
  )
}
