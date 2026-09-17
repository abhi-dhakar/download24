'use client'

/**
 * Step 3 of the three-page download flow (`/download/progress`).
 *
 * Reads the selection made on step 2 from the query string (`src`, `f`,
 * `label`, `ext`, `kind`, `size`, `title`, `a`) plus a sessionStorage snapshot
 * with the thumbnail/platform. It then starts the download the way the browser
 * does it natively — a hidden same-origin iframe pointing at
 * `/api/download?…&mode=stream&job=<id>` — so Chrome runs the file through its
 * own download manager: the file shows up in the Downloads shelf with the
 * final filename while the bytes are still transferring.
 *
 * The page deliberately shows **no transfer telemetry**: no progress bar, no
 * percentage, no "12 MB of 180 MB", no speed and no countdown. Nobody can act
 * on those numbers, and they make a slow-but-healthy transfer look broken.
 * What a visitor actually needs is (a) the file they picked, (b) proof that
 * the download is alive, and (c) permission to wait — so the card pairs the
 * step-2 thumbnail/metadata with the indeterminate `DownloadingScene`
 * animation and a short list of instructions (large files take a few minutes,
 * keep this tab open).
 *
 * The only thing still read from `/api/download/progress?id=<id>` is the job's
 * *phase*, because that is the sole signal that the transfer finished (or
 * failed) — the browser gives a hidden iframe no completion event.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Clock,
  Download,
  ExternalLink,
  Gauge,
  Hourglass,
  Info,
  RotateCcw
} from 'lucide-react'

import { DownloadStepper } from '@/components/download/DownloadStepper'
import { DownloadingScene, SuccessScene } from '@/components/illustrations/ProgressArt'
import { PlatformMark } from '@/components/PlatformMark'
import { buildFilename, readPending } from '@/lib/pending'

type Phase = 'downloading' | 'done' | 'error'

type LivePhase =
  | 'starting'
  | 'downloading'
  | 'processing'
  | 'streaming'
  | 'redirect'
  | 'finished'
  | 'failed'

/** Only the fields this page cares about — the job's state, never its bytes. */
interface LiveProgress {
  ok: boolean
  gone?: boolean
  phase: LivePhase
  fileName?: string | null
  errorMessage?: string
  errorHint?: string
}

interface Failure {
  message: string
  hint?: string
}

/** Parses a `sizeLabel` like `182.4 MB` back into bytes (best-effort). */
function parseSizeLabel(label: string | null): number | null {
  if (!label) return null
  const match = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i.exec(label.trim())
  if (!match) return null
  const scale = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }[
    match[2].toLowerCase() as 'b' | 'kb' | 'mb' | 'gb' | 'tb'
  ]
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value * scale : null
}

/**
 * Above this the "big files take a while, please wait" note replaces the
 * short one — roughly a long 1080p clip or any 4K/MP3 transcode.
 */
const BIG_FILE_BYTES = 100 * 1024 * 1024

/**
 * How long to keep polling a job the registry does not know about before
 * calling the transfer complete. Early polls lose the race with the iframe
 * request that registers the job, and `/api/download` answers 400/429 *before*
 * registering anything — so a `gone` in the first seconds says nothing. After
 * the grace window it means the entry was pruned once the transfer finished
 * (`finishLiveJob` keeps it for 20s) or the poll hit another instance.
 */
const GONE_GRACE_MS = 8_000

/** Random token used to key the server-side job entry. */
function newJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Plain-language phase caption — what is happening, never how far along. */
const PHASE_CAPTION: Record<LivePhase, string> = {
  starting: 'Connecting to the source',
  downloading: 'Downloading your file',
  processing: 'Merging and converting your file',
  streaming: 'Saving the file to your device',
  redirect: 'Handing the file to your browser',
  finished: 'Download complete',
  failed: 'Download stopped'
}

export function DownloadFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const src = searchParams.get('src') ?? ''
  const formatId = searchParams.get('f') ?? ''
  const label = searchParams.get('label') ?? 'Selected quality'
  const ext = searchParams.get('ext') ?? 'mp4'
  const kind = searchParams.get('kind') === 'audio' ? 'audio' : 'video'
  const sizeLabel = searchParams.get('size')
  const estimated = searchParams.get('est') === '1'
  const title = searchParams.get('title') ?? 'Your download'
  const audioMp3 = searchParams.get('a') === 'mp3'

  const [phase, setPhase] = useState<Phase>('downloading')
  const [livePhase, setLivePhase] = useState<LivePhase>('starting')
  const [failure, setFailure] = useState<Failure | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [thumbFailed, setThumbFailed] = useState(false)
  const [snapshot] = useState(() => readPendingSafe(src))

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const apiHref = useMemo(() => {
    const params = new URLSearchParams({ src })
    if (formatId) params.set('f', formatId)
    if (audioMp3) params.set('a', 'mp3')
    return `/api/download?${params.toString()}`
  }, [audioMp3, formatId, src])

  const filename = useMemo(() => buildFilename(title, ext), [title, ext])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = null
  }, [])

  /* ---------------------------------------------------------------------- */
  /* The transfer                                                            */
  /* ---------------------------------------------------------------------- */

  const finishDone = useCallback(
    (fileName: string | null) => {
      stopPolling()
      setSavedName(fileName ?? filename)
      setLivePhase('finished')
      setPhase('done')
    },
    [filename, stopPolling]
  )

  const run = useCallback(async () => {
    if (!src || !formatId) {
      setFailure({ message: 'This link is missing its download selection.', hint: 'Start again from the homepage and pick a quality on step 2.' })
      setPhase('error')
      return
    }

    stopPolling()
    const jobId = newJobId()
    const startedAt = Date.now()

    setPhase('downloading')
    setLivePhase('starting')
    setFailure(null)
    setSavedName(null)

    // Native download via a hidden same-origin iframe. Chrome runs it through
    // its download manager: visible in the Downloads shelf with the real name
    // and a live progress bar while the bytes are transferring.
    const iframe = iframeRef.current
    if (iframe) iframe.src = `${apiHref}&mode=stream&job=${encodeURIComponent(jobId)}`

    // Polled for the *phase* only: finished / failed. No counters are read, so
    // a slow transfer renders exactly like a fast one.
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/download/progress?id=${encodeURIComponent(jobId)}`, {
          cache: 'no-store'
        })
        if (!response.ok) return
        const data = (await response.json()) as LiveProgress

        if (!data || data.ok !== true) return

        if (data.gone) {
          // The registry has no such job. Only trust that as "finished" once
          // the download request has had time to register it — otherwise a
          // fast poller would announce completion before a byte moved.
          if (Date.now() - startedAt >= GONE_GRACE_MS) finishDone(null)
          return
        }

        setLivePhase(data.phase)

        if (data.phase === 'finished') {
          finishDone(data.fileName ?? null)
        } else if (data.phase === 'failed') {
          stopPolling()
          setFailure({
            message: data.errorMessage ?? 'The download could not be completed.',
            hint: data.errorHint
          })
          setLivePhase('failed')
          setPhase('error')
        }
      } catch {
        /* network blip — next poll retries */
      }
    }, 1000)
  }, [apiHref, finishDone, formatId, src, stopPolling])

  useEffect(() => {
    // Runs on every *real* mount. React StrictMode's simulated mount→unmount→
    // mount is safe here: the cleanup detaches the iframe and stops polling,
    // and the second invocation re-arms the transfer with a fresh job id.
    void run()
    return () => {
      stopPolling()
      // Detach the iframe so the navigation is cancelled if the page unmounts.
      if (iframeRef.current) iframeRef.current.src = 'about:blank'
    }
  }, [run, stopPolling])

  const cancel = useCallback(() => {
    stopPolling()
    if (iframeRef.current) iframeRef.current.src = 'about:blank'
    router.push(`/download?url=${encodeURIComponent(src)}`)
  }, [router, src, stopPolling])

  const isAudio = kind === 'audio'
  const isBigFile = (parseSizeLabel(sizeLabel) ?? 0) >= BIG_FILE_BYTES
  const caption = PHASE_CAPTION[livePhase] ?? 'Working on your download'

  /* -------------------------------------------------------------- no src */
  if (!src) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <DownloadStepper current={3} />
        <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          Nothing to download
        </h1>
        <p className="text-sm leading-relaxed text-white/55">
          This page shows the live download animation, but no file was selected. Start from the
          homepage: paste a link, pick a quality, and we&apos;ll meet you here.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Start on the homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <DownloadStepper current={3} />

      {/* Hidden iframe drives the browser's native download manager. */}
      <iframe
        ref={iframeRef}
        title="download-frame"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
      />

      {/* ------------------------------------------------------------ card */}
      <section
        aria-labelledby="progress-heading"
        className="glass-card mt-8 rounded-(--radius-card) p-5 shadow-lift sm:p-8"
      >
        <header className="text-center">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">
            {phase === 'done' ? 'Step 3 of 3 · Complete' : 'Step 3 of 3 · Downloading'}
          </p>
          <h1 id="progress-heading" className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            {phase === 'done' ? 'Download complete!' : phase === 'error' ? 'Download failed' : 'Downloading your file'}
          </h1>
        </header>

        {/* ------------------------------------- what is being downloaded */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-inset ring-line sm:w-52">
            {snapshot?.thumbnail && !thumbFailed ? (
              // Width/height come from step 2 so the image cannot shift layout.
              <img
                src={snapshot.thumbnail}
                alt={`Thumbnail for ${title}`}
                width={snapshot.thumbnailWidth ?? 480}
                height={snapshot.thumbnailHeight ?? 270}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setThumbFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-white/25">
                <PlatformMark id={snapshot?.platformId ?? 'generic'} className="h-10 w-10" />
              </span>
            )}
            {/* Light sweep across the thumbnail while the transfer is live. */}
            {phase === 'downloading' ? (
              <span aria-hidden="true" className="sheen absolute inset-0" />
            ) : null}
            {snapshot?.durationLabel ? (
              <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                {snapshot.durationLabel}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm leading-snug font-semibold text-white sm:text-base">{title}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              {snapshot?.platformId ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-medium text-white/70 ring-1 ring-inset ring-line">
                  <PlatformMark id={snapshot.platformId} className="h-3.5 w-3.5 shrink-0" title={snapshot.platformName} />
                  {snapshot.platformName ?? 'Source'}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent ring-1 ring-inset ring-accent/25">
                {isAudio ? '♫' : '▶'} {label}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 font-medium text-white/60 uppercase ring-1 ring-inset ring-line">
                {ext}
              </span>
              {sizeLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-white/60 ring-1 ring-inset ring-line">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {estimated ? '~' : ''}
                  {sizeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------- downloading */}
        {phase === 'downloading' && (
          <div className="mt-7 animate-rise" aria-live="polite" aria-busy="true">
            <div className="mx-auto w-52 sm:w-64">
              <DownloadingScene />
            </div>

            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-accent">
              {caption}
              <span className="flex items-end gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" />
                <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft [animation-delay:220ms]" />
                <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft [animation-delay:440ms]" />
              </span>
            </p>

            {/* Instructions: how long to expect, and what not to do. */}
            <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-line bg-white/[0.02] p-4">
              <p
                className={`flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed ring-1 ring-inset ${
                  isBigFile ? 'bg-warn/[0.08] text-warn ring-warn/25' : 'bg-accent/[0.08] text-accent ring-accent/20'
                }`}
              >
                <Hourglass className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {isBigFile
                    ? `This is a large file${sizeLabel ? ` (${estimated ? 'about ' : ''}${sizeLabel})` : ''}, so it can take a few minutes. That is normal — please wait and keep this tab open until it finishes.`
                    : 'The download is running. Depending on the video length and your connection this usually takes under a minute — please wait, the file lands in your Downloads folder on its own.'}
                </span>
              </p>

              <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-white/55">
                <li className="flex gap-2.5">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden="true" />
                  <span>
                    Watch your browser&apos;s own download shelf for the live status — the file
                    appears there as soon as the transfer starts.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden="true" />
                  <span>
                    Don&apos;t refresh or close this tab while it runs — that stops the transfer and
                    you&apos;ll have to start again.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden="true" />
                  <span>
                    Higher quality and MP3 output take longer because the file is prepared on our
                    server before it reaches you.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Cancel &amp; change quality
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- done */}
        {phase === 'done' && (
          <div className="mt-7 flex flex-col items-center animate-rise" role="status">
            <div className="w-56 sm:w-72">
              <SuccessScene />
            </div>

            <p className="mt-1 text-base font-semibold text-ok">Your file has been saved</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-3 py-1.5 font-semibold text-ok ring-1 ring-inset ring-ok/25">
                <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                Saved as {savedName ?? filename}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download another video
              </Link>
              <Link
                href={`/download?url=${encodeURIComponent(src)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
              >
                <Gauge className="h-4 w-4" aria-hidden="true" />
                Back to quality options
              </Link>
              <button
                type="button"
                onClick={() => void run()}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Save again
              </button>
            </div>

            <p className="mt-5 max-w-md text-center text-xs text-white/40">
              The file is in your browser&apos;s Downloads. Didn&apos;t get it? Use “Save again”,
              or the direct link on the quality page.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------ error */}
        {phase === 'error' && failure && (
          <div className="mt-8 animate-rise" role="alert">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-danger/10 ring-1 ring-inset ring-danger/30">
                <AlertTriangle className="h-7 w-7 text-danger" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-white">{failure.message}</p>
              {failure.hint && (
                <p className="max-w-md text-xs leading-relaxed text-white/55">{failure.hint}</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => void run()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-px"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retry download
              </button>
              <Link
                href={`/download?url=${encodeURIComponent(src)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-line-strong transition-colors hover:bg-white/12"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Pick another quality
              </Link>
              <a
                href={`${apiHref}&mode=stream`}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Direct link
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Quiet footer note mirroring step 2 */}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
        Streams are proxied through Download24 and never stored on disk.
      </p>
    </div>
  )
}

/** sessionStorage read guarded for SSR (the component renders client-side only). */
function readPendingSafe(src: string) {
  if (typeof window === 'undefined') return null
  return readPending(src)
}
