'use client'

/**
 * Step 2 of the three-page download flow (`/download?url=…`).
 *
 * Responsibilities:
 *  1. Validate the link carried over from step 1 (homepage / platform pages).
 *  2. Run the extraction against `/api/parse` (the same engine the old inline
 *     hero flow used) while showing the animated loading panel.
 *  3. Render the video details + every quality preset. Choosing a preset
 *     stashes a snapshot in sessionStorage and navigates to step 3
 *     (`/download/progress`), which streams the file and animates the download.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Copy,
  Gauge,
  Link2,
  Music,
  RefreshCw,
  Search,
  ShieldAlert,
  Video
} from 'lucide-react'

import { DownloadStepper } from '@/components/download/DownloadStepper'
import { LinkMissingArt } from '@/components/illustrations/ProgressArt'
import { PlatformMark } from '@/components/PlatformMark'
import { LoadingPanel } from '@/components/Spinner'
import { inspectLink } from '@/components/Downloader'
import { EVENTS, hostOf } from '@/lib/analytics'
import { track } from '@/lib/analyticsClient'
import { writePending } from '@/lib/pending'
import type { DownloadOption, ParsePayload } from '@/lib/types'
import { downloadUrlFor } from '@/lib/types'

type Phase = 'missing' | 'invalid' | 'loading' | 'error' | 'ready'

interface Failure {
  message: string
  hint?: string
  retryAfter?: number
  status?: number
}

const TIER_SHORT: Record<DownloadOption['tier'], string> = {
  '2160': '4K',
  '1440': '1440p',
  '1080': '1080p',
  '720': '720p',
  '540': '540p',
  '480': '480p',
  '360': '360p',
  '240': '240p',
  audio: 'MP3',
  original: 'FILE'
}

/** Brutalist chip fills for the option tags (always paired with an ink border). */
const TAG_STYLE: Record<string, string> = {
  best: 'bg-sun text-[#101010]',
  'no-watermark': 'bg-lime text-[#101010]',
  smallest: 'bg-aqua text-[#101010]',
  hd: 'bg-surface-2 text-ink-soft',
  audio: 'bg-punch text-[#101010]'
}

const TAG_LABEL: Record<string, string> = {
  best: 'Best match',
  'no-watermark': 'No watermark',
  smallest: 'Smallest',
  hd: 'HD',
  audio: 'Audio only'
}

function formatViews(count?: number): string | undefined {
  if (!count || count < 1) return undefined
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${Math.round(count / 1_000)}K views`
  return `${count} views`
}

/** Query-string contract with step 3 (`/download/progress`). */
function progressPathFor(meta: ParsePayload['meta'], option: DownloadOption): string {
  const params = new URLSearchParams({
    src: meta.sourceUrl,
    f: String(option.id),
    label: option.label,
    ext: option.ext,
    kind: option.kind
  })
  if (option.sizeLabel) params.set('size', option.sizeLabel)
  if (option.estimated) params.set('est', '1')
  params.set('title', meta.title)
  if (option.kind === 'audio' && option.ext === 'mp3') params.set('a', 'mp3')
  return `/download/progress?${params.toString()}`
}

/* -------------------------------------------------------------------------- */
/* Option row                                                                 */
/* -------------------------------------------------------------------------- */

function OptionRow({
  option,
  meta
}: {
  option: DownloadOption
  meta: ParsePayload['meta']
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const href = progressPathFor(meta, option)
  const directApiHref = downloadUrlFor(meta.sourceUrl, option)

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${directApiHref}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      track(EVENTS.downloadLinkCopied, {
        platform: meta.platformId,
        quality: option.tier,
        kind: option.kind,
        ext: option.ext
      })
    } catch {
      setCopied(false)
    }
  }, [directApiHref, meta.platformId, option.ext, option.kind, option.tier])

  const spec = [
    option.ext.toUpperCase(),
    option.vcodec,
    option.acodec && option.kind === 'video' ? `+ ${option.acodec}` : null,
    option.resolutionLabel ?? null,
    option.fps ? `${option.fps} fps` : null,
    option.bitrateKbps ? `${option.bitrateKbps} kbps` : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex flex-col gap-3 rounded-2xl border-[3px] border-line bg-surface p-3 transition-shadow sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={`grid h-12 w-16 shrink-0 place-items-center rounded-xl border-[2.5px] border-line font-display text-[13px] ${
          option.kind === 'audio' ? 'bg-punch text-[#101010]' : 'bg-sun text-[#101010]'
        }`}
      >
        {option.kind === 'audio' ? <Music className="h-4 w-4" /> : TIER_SHORT[option.tier]}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="truncate font-sans text-sm font-bold text-ink">{option.label}</span>
          {option.tags.map((tag) => (
            <span
              key={tag}
              className={`nb-chip nb-chip-sm ${TAG_STYLE[tag] ?? TAG_STYLE.hd}`}
            >
              {TAG_LABEL[tag] ?? tag}
            </span>
          ))}
        </span>
        <span className="mt-1 block font-mono text-[11px] leading-5 break-words text-ink-mute">
          {spec}
          {option.sizeLabel ? (
            <>
              {' · '}
              {option.estimated ? '~' : ''}
              {option.sizeLabel}
            </>
          ) : (
            ' · size reported by the source'
          )}
          {option.needsMerge ? ' · merged video+audio' : ''}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="grid h-10 w-10 place-items-center rounded-btn border-[2.5px] border-line bg-surface-2 text-ink transition-colors hover:bg-sun focus-visible:text-ink"
          aria-label={`Copy direct download link for ${option.label} of ${meta.title}`}
          title="Copy download link"
        >
          {copied ? <Check className="h-4 w-4 text-ok-ink" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </button>

        {/* Step 3 navigation — hand the snapshot over, then push. */}
        <Link
          href={href}
          onClick={() => {
            writePending({
              sourceUrl: meta.sourceUrl,
              title: meta.title,
              thumbnail: meta.thumbnail,
              thumbnailWidth: meta.thumbnailWidth,
              thumbnailHeight: meta.thumbnailHeight,
              platformId: meta.platformId,
              platformName: meta.platformName,
              durationLabel: meta.durationLabel
            })
            // The conversion event: which preset the visitor actually picked.
            track(EVENTS.qualitySelected, {
              platform: meta.platformId,
              source_host: hostOf(meta.sourceUrl),
              quality: option.tier,
              label: option.label,
              kind: option.kind,
              ext: option.ext,
              needs_merge: option.needsMerge,
              muxed: option.muxed,
              size_bytes: option.bytes ?? null,
              size_estimated: Boolean(option.estimated),
              tags: option.tags,
              duration_seconds: meta.durationSeconds ?? null,
              is_playlist: meta.isPlaylist
            })
          }}
          className="nb-btn nb-btn-brand nb-btn-sm"
          aria-label={`Download ${option.label}${option.ext ? ` as ${option.ext.toUpperCase()}` : ''}: ${meta.title}`}
        >
          <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
          Download
        </Link>
      </span>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function DownloadDetails() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = (searchParams.get('url') ?? '').trim()

  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<ParsePayload | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [stats, setStats] = useState<{ cached: boolean; tookMs: number } | null>(null)
  const [stage, setStage] = useState(0)
  const [swapValue, setSwapValue] = useState('')
  const [thumbFailed, setThumbFailed] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  /* Progressive hint text while the extractor walks the source page. */
  useEffect(() => {
    if (phase !== 'loading') {
      setStage(0)
      return
    }
    const timer = setInterval(() => setStage((val) => Math.min(2, val + 1)), 1400)
    return () => clearInterval(timer)
  }, [phase])

  const extract = useCallback(async (raw: string, options: { refresh?: boolean } = {}) => {
    const inspected = inspectLink(raw)
    if (!inspected.ok) {
      setPhase('invalid')
      setFailure({ message: inspected.reason ?? 'That link cannot be processed.' })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase('loading')
    setFailure(null)
    setThumbFailed(false)

    const startedAt = performance.now()
    if (options.refresh) {
      track(EVENTS.extractionRetried, { source_host: inspected.host })
    }

    try {
      const response = await fetch(`/api/parse${options.refresh ? '?refresh=1' : ''}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ url: raw }),
        signal: controller.signal
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: ParsePayload; cached: boolean; tookMs: number }
        | { ok: false; message?: string; hint?: string; retryAfter?: number }
        | null

      if (!response.ok || !payload || payload.ok !== true) {
        const failureBody = payload && payload.ok === false ? payload : null
        const message =
          failureBody?.message ??
          (response.status === 429
            ? 'Too many requests. Please try again in 1 minute.'
            : `Engine error (HTTP ${response.status}). Our team is notified.`)
        setFailure({
          message,
          hint: failureBody?.hint,
          retryAfter: failureBody?.retryAfter,
          status: response.status
        })
        setPhase('error')
        setData(null)
        track(EVENTS.extractionErrorViewed, {
          source_host: inspected.host,
          http_status: response.status,
          error_code: (failureBody as { code?: string } | null)?.code ?? 'HTTP_ERROR',
          error_message: message,
          refresh: Boolean(options.refresh),
          client_ms: Math.round(performance.now() - startedAt)
        })
        return
      }

      setData(payload.data)
      setStats({ cached: payload.cached, tookMs: payload.tookMs })
      setPhase('ready')
      track(EVENTS.extractionViewed, {
        platform: payload.data.meta.platformId,
        source_host: inspected.host,
        cached: payload.cached,
        server_ms: payload.tookMs,
        client_ms: Math.round(performance.now() - startedAt),
        option_count: payload.data.options.length,
        max_quality: payload.data.maxQuality,
        supports_mp3: payload.data.supportsMp3,
        is_playlist: payload.data.meta.isPlaylist,
        duration_seconds: payload.data.meta.durationSeconds ?? null,
        refresh: Boolean(options.refresh)
      })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      setFailure({
        message: 'No response from Download24 servers.',
        hint: 'Please check your internet connection and try again.'
      })
      setPhase('error')
      setData(null)
      track(EVENTS.extractionErrorViewed, {
        source_host: inspected.host,
        error_code: 'NETWORK',
        error_message: (error as Error)?.message ?? 'network error',
        refresh: Boolean(options.refresh),
        client_ms: Math.round(performance.now() - startedAt)
      })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }, [])

  /* Run (or re-run) the extraction whenever the carried-over link changes. */
  useEffect(() => {
    if (!url) {
      setPhase('missing')
      return
    }
    void extract(url)
    return () => abortRef.current?.abort()
  }, [extract, url])

  const meta = data?.meta
  const videoOptions = useMemo(
    () => data?.options.filter((option) => option.kind === 'video') ?? [],
    [data]
  )
  const audioOptions = useMemo(
    () => data?.options.filter((option) => option.kind === 'audio') ?? [],
    [data]
  )
  const highest = videoOptions[0]
  const host = useMemo(() => {
    try {
      return new URL(meta?.canonicalUrl ?? meta?.sourceUrl ?? url).hostname.replace(/^www\./, '')
    } catch {
      return 'source'
    }
  }, [meta?.canonicalUrl, meta?.sourceUrl, url])

  /* ---------------------------------------------------------------- missing */
  if (phase === 'missing') {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <DownloadStepper current={2} />
        <div className="w-56 sm:w-64">
          <LinkMissingArt />
        </div>
        <div className="space-y-2.5">
          <h1 className="nb-h2">
            No link to download <span className="nb-mark nb-mark-punch">yet</span>
          </h1>
          <p className="nb-lead">
            This page reviews the video you paste on the homepage. Head back, copy a link from
            YouTube, Instagram, TikTok, Facebook or X, and press <em>Download</em>.
          </p>
        </div>
        <Link href="/" className="nb-btn nb-btn-brand nb-btn-lg">
          <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
          Paste a link on the homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <DownloadStepper current={2} />

      <header className="mt-8 text-center">
        <p className="nb-sticker mx-auto">Step 2 of 3 · Choose quality</p>
        <h1 className="nb-h2 mt-5">
          {phase === 'ready' && meta ? (
            <>
              Your video is <span className="nb-mark nb-mark-lime">ready</span>
            </>
          ) : (
            'Reading your link'
          )}
        </h1>

        {/* The link being processed, with an inline "change it" control. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="nb-chip nb-chip-sm nb-chip-soft max-w-full">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-brand-ink" aria-hidden="true" />
            <span className="truncate" data-ph-mask>{url}</span>
          </span>
          <button
            type="button"
            onClick={() => setSwapValue(url)}
            className="font-mono text-[11px] font-bold tracking-wide text-brand-ink uppercase underline decoration-[2.5px] underline-offset-4 hover:text-ink"
          >
            Try a different link
          </button>
        </div>

        {swapValue !== '' && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const next = swapValue.trim()
              if (!next) return
              router.replace(`/download?url=${encodeURIComponent(next)}`)
              setSwapValue('')
            }}
            className="nb-card-flat mx-auto mt-4 flex max-w-xl items-center gap-2 p-2"
          >
            <label htmlFor="swap-url" className="sr-only">
              Paste a different video link
            </label>
            <Search className="ml-2 h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
            <input
              id="swap-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://…"
              value={swapValue}
              onChange={(event) => setSwapValue(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none"
            />
            <button type="submit" className="nb-btn nb-btn-brand nb-btn-sm shrink-0">
              Analyze
            </button>
          </form>
        )}
      </header>

      <div className="result-slot mt-8">
        {/* ------------------------------------------------------- loading */}
        {phase === 'loading' && <LoadingPanel stage={stage} />}

        {/* -------------------------------------------------------- error */}
        {phase === 'error' && failure && (
          <div role="alert" aria-live="assertive" className="nb-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-btn border-[3px] border-line bg-danger">
                <AlertTriangle className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm uppercase">{failure.message}</p>
                {failure.hint && (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{failure.hint}</p>
                )}
                {failure.retryAfter && (
                  <p className="mt-1.5 font-mono text-[11px] font-bold text-warn-ink uppercase">
                    Please wait {failure.retryAfter}s before retrying.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => void extract(url, { refresh: true })} className="nb-btn nb-btn-sm nb-btn-sun">
                  Retry link
                </button>
                <Link href="/" className="nb-btn nb-btn-sm">
                  New link
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- invalid */}
        {phase === 'invalid' && failure && (
          <div className="nb-card p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-btn border-[3px] border-line bg-warn">
              <AlertTriangle className="h-6 w-6 text-[#101010]" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display text-sm uppercase">{failure.message}</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-soft">
              Check the link for typos, or pick one from a supported platform — YouTube, Instagram,
              TikTok, Facebook, X, Vimeo, Dailymotion, Reddit, Twitch and TeraBox share links all work.
            </p>
            <Link href="/" className="nb-btn nb-btn-brand mt-5">
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
              Back to the homepage
            </Link>
          </div>
        )}

        {/* --------------------------------------------------------- ready */}
        {phase === 'ready' && data && meta && (
          <section aria-labelledby="download-details-heading" className="animate-rise">
            <div className="nb-panel p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="nb-chip nb-chip-sm nb-chip-soft">
                  <PlatformMark id={meta.platformId} className="h-4 w-4" title={meta.platformName} />
                  {meta.platformName}
                </span>
                {data.extractor ? (
                  <span className="font-mono text-[11px] text-ink-mute">via {data.extractor} extractor</span>
                ) : null}
                {typeof stats?.tookMs === 'number' ? (
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-ink-mute uppercase"
                    title={stats.cached ? 'Served from the 15 minute in-memory LRU cache' : 'Freshly extracted with yt-dlp'}
                  >
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                    {stats.cached ? 'cached' : 'live'} · {stats.tookMs} ms
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void extract(url, { refresh: true })}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-brand-ink uppercase underline decoration-[2.5px] underline-offset-4 hover:text-ink"
                  aria-label="Re-run the extraction and bypass the cache"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Refresh
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl border-[3px] border-line bg-surface-2 sm:w-64">
                  {meta.thumbnail && !thumbFailed ? (
                    // Width/height come from the extractor so the image cannot shift layout.
                    <img
                      src={meta.thumbnail}
                      alt={`Preview thumbnail for ${meta.title}`}
                      width={meta.thumbnailWidth ?? 480}
                      height={meta.thumbnailHeight ?? 270}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setThumbFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-ink-mute">
                      <PlatformMark id={meta.platformId} className="h-10 w-10" />
                    </span>
                  )}
                  {meta.durationLabel ? (
                    <span className="absolute right-2 bottom-2 rounded-md border-2 border-line bg-ink px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-paper">
                      {meta.durationLabel}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 id="download-details-heading" className="nb-h3">
                    {meta.title}
                  </h2>
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
                    {meta.channel || meta.uploader ? (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-mute">Channel</dt>
                        <dd className="font-bold text-ink">{meta.channel ?? meta.uploader}</dd>
                      </div>
                    ) : null}
                    {meta.viewCount ? (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-mute">Plays</dt>
                        <dd className="font-bold text-ink">{formatViews(meta.viewCount)}</dd>
                      </div>
                    ) : null}
                    {meta.uploadDateLabel ? (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-mute">Published</dt>
                        <dd className="font-bold text-ink">{meta.uploadDateLabel}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-1.5">
                      <dt className="text-ink-mute">Source</dt>
                      <dd className="font-medium">
                        <a
                          href={meta.canonicalUrl ?? meta.sourceUrl}
                          target="_blank"
                          rel="nofollow noopener noreferrer ugc"
                          className="nb-link inline-flex max-w-[16rem] items-center gap-1 truncate"
                        >
                          {host}
                        </a>
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs leading-relaxed text-ink-mute">
                    {videoOptions.length} video preset{videoOptions.length === 1 ? '' : 's'}
                    {audioOptions.length > 0 ? ` and ${audioOptions.length} audio preset` : ''}
                    {highest ? `, up to ${highest.label}` : ''}. Pick one to continue to the final
                    step.
                  </p>
                </div>
              </div>

              {meta.warning ? (
                <p
                  role="status"
                  className="nb-inset mt-4 flex items-start gap-2 border-warn bg-warn/15 p-3 text-xs text-warn-ink"
                >
                  <ShieldAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{meta.warning}</span>
                </p>
              ) : null}

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.14em] text-ink-mute uppercase">
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    Video quality
                    {meta.isLiveNow ? (
                      <span className="nb-chip nb-chip-sm nb-chip-soft border-danger bg-danger/15 text-danger-ink">live</span>
                    ) : null}
                  </h3>
                  {videoOptions.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-2">
                      {videoOptions.map((option) => (
                        <OptionRow key={option.id} option={option} meta={meta} />
                      ))}
                    </ul>
                  ) : (
                    <p className="nb-inset mt-2 p-3 text-xs text-ink-soft">
                      This source only exposed an audio stream, so no video preset was offered.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.14em] text-ink-mute uppercase">
                    <Music className="h-3.5 w-3.5" aria-hidden="true" />
                    Audio
                  </h3>
                  {audioOptions.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-2">
                      {audioOptions.map((option) => (
                        <OptionRow key={option.id} option={option} meta={meta} />
                      ))}
                    </ul>
                  ) : (
                    <p className="nb-inset mt-2 p-3 text-xs text-ink-soft">
                      MP3 conversion is unavailable for this link — either the platform provides no
                      audio track or the server has no ffmpeg installed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-ink-mute uppercase">
              Nothing is stored on the server — streams are piped straight to your browser and the
              child process exits the moment your download ends.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
