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
  audio: 'MP3'
}

const TAG_STYLE: Record<string, string> = {
  best: 'bg-accent/20 text-accent-soft ring-accent/30',
  'no-watermark': 'bg-ok/15 text-ok ring-ok/30',
  smallest: 'bg-cyan-glow/15 text-cyan-glow ring-cyan-glow/25',
  hd: 'bg-white/10 text-white/70 ring-white/15',
  audio: 'bg-white/10 text-white/70 ring-white/15'
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
    } catch {
      setCopied(false)
    }
  }, [directApiHref])

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
    <li className="group flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-white/[0.05]">
      <span
        aria-hidden="true"
        className={`grid h-11 w-14 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${
          option.kind === 'audio'
            ? 'bg-accent/10 text-accent-soft ring-accent/25'
            : 'bg-ink-800 text-[13px] font-semibold text-white/85 ring-line'
        }`}
      >
        {option.kind === 'audio' ? <Music className="h-4 w-4" /> : TIER_SHORT[option.tier]}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-white/95">{option.label}</span>
          {option.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TAG_STYLE[tag] ?? TAG_STYLE.hd}`}
            >
              {TAG_LABEL[tag] ?? tag}
            </span>
          ))}
        </span>
        <span className="mt-0.5 block break-words text-xs leading-5 text-white/50">
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

      <button
        type="button"
        onClick={copyLink}
        className="hidden shrink-0 rounded-lg p-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 focus-visible:text-white sm:block"
        aria-label={`Copy direct download link for ${option.label} of ${meta.title}`}
        title="Copy download link"
      >
        {copied ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>

      {/* Step 3 navigation — hand the snapshot over, then push. */}
      <Link
        href={href}
        onClick={() =>
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
        }
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
        aria-label={`Download ${option.label}${option.ext ? ` as ${option.ext.toUpperCase()}` : ''}: ${meta.title}`}
      >
        <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
        Download
      </Link>
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
        setPhase('error')
        setData(null)
        return
      }

      setData(payload.data)
      setStats({ cached: payload.cached, tookMs: payload.tookMs })
      setPhase('ready')
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      setFailure({
        message: 'No response from Download24 servers.',
        hint: 'Please check your internet connection and try again.'
      })
      setPhase('error')
      setData(null)
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
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            No link to download yet
          </h1>
          <p className="text-sm leading-relaxed text-white/55">
            This page reviews the video you paste on the homepage. Head back, copy a link from
            YouTube, Instagram, TikTok, Facebook or X, and press <em>Download</em>.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Paste a link on the homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <DownloadStepper current={2} />

      <header className="mt-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">
          Step 2 of 3 · Choose quality
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
          {phase === 'ready' && meta ? 'Your video is ready' : 'Reading your link'}
        </h1>

        {/* The link being processed, with an inline "change it" control. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-white/60">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">{url}</span>
          </span>
          <button
            type="button"
            onClick={() => setSwapValue(url)}
            className="rounded-full px-2.5 py-1.5 font-semibold text-accent transition-colors hover:bg-accent/10"
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
            className="mx-auto mt-3 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-white/[0.02] p-1.5"
          >
            <label htmlFor="swap-url" className="sr-only">
              Paste a different video link
            </label>
            <Search className="ml-2 h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
            <input
              id="swap-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://…"
              value={swapValue}
              onChange={(event) => setSwapValue(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder-white/35 outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
            >
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
                  <p className="mt-1 text-xs text-warn">
                    Please wait {failure.retryAfter}s before retrying.
                  </p>
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
                <Link
                  href="/"
                  className="rounded-lg px-3 py-1.5 text-center text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white"
                >
                  New link
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- invalid */}
        {phase === 'invalid' && failure && (
          <div className="rounded-(--radius-card) border border-warn/25 bg-warn/[0.06] p-5 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-warn" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-white">{failure.message}</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-white/55">
              Check the link for typos, or pick one from a supported platform — YouTube, Instagram,
              TikTok, Facebook, X, Vimeo, Dailymotion, Reddit and Twitch all work.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to the homepage
            </Link>
          </div>
        )}

        {/* --------------------------------------------------------- ready */}
        {phase === 'ready' && data && meta && (
          <section aria-labelledby="download-details-heading" className="animate-rise">
            <div className="glass-card rounded-(--radius-card) p-4 shadow-lift sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-1 text-xs font-medium ring-1 ring-inset ring-line">
                  <PlatformMark id={meta.platformId} className="h-5 w-5" title={meta.platformName} />
                  {meta.platformName}
                </span>
                {data.extractor ? (
                  <span className="text-[11px] text-white/40">via {data.extractor} extractor</span>
                ) : null}
                {typeof stats?.tookMs === 'number' ? (
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/40"
                    title={stats.cached ? 'Served from the 15 minute in-memory LRU cache' : 'Freshly extracted with yt-dlp'}
                  >
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                    {stats.cached ? 'cached' : 'live'} · {stats.tookMs} ms
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void extract(url, { refresh: true })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Re-run the extraction and bypass the cache"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Refresh
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-inset ring-line sm:w-64">
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
                    <span className="absolute inset-0 grid place-items-center text-white/25">
                      <PlatformMark id={meta.platformId} className="h-10 w-10" />
                    </span>
                  )}
                  {meta.durationLabel ? (
                    <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                      {meta.durationLabel}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 id="download-details-heading" className="text-base font-semibold text-white sm:text-lg">
                    {meta.title}
                  </h2>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/55">
                    {meta.channel || meta.uploader ? (
                      <div className="flex gap-1.5">
                        <dt className="text-white/40">Channel</dt>
                        <dd className="font-medium text-white/80">{meta.channel ?? meta.uploader}</dd>
                      </div>
                    ) : null}
                    {meta.viewCount ? (
                      <div className="flex gap-1.5">
                        <dt className="text-white/40">Plays</dt>
                        <dd className="font-medium text-white/80">{formatViews(meta.viewCount)}</dd>
                      </div>
                    ) : null}
                    {meta.uploadDateLabel ? (
                      <div className="flex gap-1.5">
                        <dt className="text-white/40">Published</dt>
                        <dd className="font-medium text-white/80">{meta.uploadDateLabel}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-1.5">
                      <dt className="text-white/40">Source</dt>
                      <dd className="font-medium">
                        <a
                          href={meta.canonicalUrl ?? meta.sourceUrl}
                          target="_blank"
                          rel="nofollow noopener noreferrer ugc"
                          className="inline-flex max-w-[16rem] items-center gap-1 truncate text-white/80 underline decoration-white/25 underline-offset-2 hover:text-white"
                        >
                          {host}
                        </a>
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-2 text-xs text-white/45">
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
                  className="mt-4 flex items-start gap-2 rounded-xl bg-warn/10 p-3 text-xs text-warn ring-1 ring-inset ring-warn/25"
                >
                  <ShieldAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{meta.warning}</span>
                </p>
              ) : null}

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold text-white/45 uppercase tracking-wider">
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    Video quality
                    {meta.isLiveNow ? (
                      <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] text-danger">live</span>
                    ) : null}
                  </h3>
                  {videoOptions.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-2">
                      {videoOptions.map((option) => (
                        <OptionRow key={option.id} option={option} meta={meta} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl bg-ink-800 p-3 text-xs text-white/55">
                      This source only exposed an audio stream, so no video preset was offered.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold text-white/45 uppercase tracking-wider">
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
                    <p className="mt-2 rounded-xl bg-ink-800 p-3 text-xs text-white/55">
                      MP3 conversion is unavailable for this link — either the platform provides no
                      audio track or the server has no ffmpeg installed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-white/40">
              Nothing is stored on the server — streams are piped straight to your browser and the
              child process exits the moment your download ends.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
