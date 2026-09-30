'use client'

/**
 * download24.in — hero extractor input (step 1 of the three-page flow).
 *
 * The homepage and every dedicated platform page render this box. It handles
 * client-side validation, clipboard integration and local history — then hands
 * over to `/download?url=…` (step 2) which runs the actual extraction and
 * lists the quality options.
 *
 * Visually this is the loudest object on the site: a bordered plate with a
 * hard offset shadow, a fat input, and two chunky action buttons.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  History,
  Info,
  Link2,
  Trash2,
  X
} from 'lucide-react'

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
      <form
        onSubmit={submit}
        aria-labelledby="downloader-heading"
        className="nb-panel nb-press nb-press-lg p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2.5">
          <span className="nb-kicker">Paste your link</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="nb-chip nb-chip-sm nb-chip-lime">4K</span>
            <span className="nb-chip nb-chip-sm nb-chip-punch">MP3</span>
            <span className="nb-chip nb-chip-sm nb-chip-soft">No signup</span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Full-width link input box */}
          <div className="relative flex w-full items-center">
            <Link2
              className="pointer-events-none absolute left-3.5 h-5 w-5 shrink-0 text-ink-mute"
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
              placeholder="https://youtube.com/watch?v=…"
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
              className="nb-input w-full !py-3.5 pr-11 pl-11 text-[15px] sm:text-base"
            />

            {url.length > 0 && (
              <button
                type="button"
                onClick={clearInput}
                className="absolute right-2.5 rounded-md border-2 border-line bg-surface-2 p-1 text-ink-mute transition-colors hover:bg-danger hover:text-white"
                title="Clear field"
                aria-label="Clear link input"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex w-full items-stretch gap-3">
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="nb-btn nb-btn-sun px-4 sm:px-6 shrink-0"
              title="Paste link from clipboard"
              aria-label="Paste link from clipboard"
            >
              <ClipboardPaste className="h-4.5 w-4.5" aria-hidden="true" />
              <span>Paste</span>
            </button>

            <button
              type="submit"
              disabled={navigating}
              className="nb-btn nb-btn-brand nb-btn-lg flex-1 justify-center"
            >
              {navigating ? 'Opening…' : 'Download'}
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------- help line */}
        <div
          id={helpId}
          className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 font-mono text-[11px] leading-relaxed text-ink-mute"
        >
          {invalidHint ? (
            <span className="flex items-center gap-1.5 font-bold text-danger-ink" role="alert">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {invalidHint}
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              HD MP4, MP3 audio and 4K Ultra HD • press
              <kbd className="rounded-md border-2 border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                /
              </kbd>
              to focus
            </span>
          )}
          {notice && (
            <span className="font-bold text-warn-ink" role="status">
              {notice}
            </span>
          )}
        </div>
      </form>

      {/* ------------------------------------------------------ recent links */}
      {recent.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-ink-mute uppercase">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Recent
          </span>
          <div className="flex flex-wrap gap-2">
            {recent.map((entry) => (
              <span
                key={entry}
                className="inline-flex items-center gap-1 rounded-pill border-[2.5px] border-line bg-surface py-0.5 pr-1.5 pl-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUrl(entry)
                    track(EVENTS.recentLinkReused, { source_host: hostOf(entry) })
                    goToStepTwo(entry, 'recent')
                  }}
                  className="max-w-[12rem] truncate font-mono text-[11px] font-bold text-ink-soft hover:text-ink"
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
                  className="rounded-full border-2 border-transparent p-0.5 text-ink-mute hover:border-line hover:text-danger-ink"
                  aria-label="Remove history entry"
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
            className="ml-auto flex items-center gap-1 font-mono text-[11px] font-bold text-ink-mute uppercase underline decoration-2 underline-offset-4 hover:text-ink"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
