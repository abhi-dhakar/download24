'use client'

/**
 * Step 3 of the three-page download flow (`/download/progress`).
 *
 * Reads the selection made on step 2 from the query string (`src`, `f`,
 * `label`, `ext`, `kind`, `size`, `title`, `a`) plus a sessionStorage snapshot
 * with the thumbnail/platform, then streams the file from `/api/download`
 * while the UI animates: a live progress gauge, transfer speed, ETA and a
 * moving byte counter. When the last chunk lands, the blob is handed to the
 * browser's save dialog and the panel switches to the success scene.
 *
 * If the streamed fetch fails (e.g. `DOWNLOAD_MODE=redirect` bouncing to a CDN
 * without CORS headers) the component falls back to a plain navigation, which
 * lets the browser download the file natively.
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
  RotateCcw
} from 'lucide-react'

import { DownloadStepper } from '@/components/download/DownloadStepper'
import { ProgressGauge, SuccessScene } from '@/components/illustrations/ProgressArt'
import { PlatformMark } from '@/components/PlatformMark'
import { buildFilename, readPending } from '@/lib/pending'

type Phase = 'downloading' | 'saving' | 'done' | 'error' | 'fallback'

interface Failure {
  message: string
  hint?: string
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unit]}`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 10) return `${seconds.toFixed(1)}s`
  const rounded = Math.round(seconds)
  if (rounded < 60) return `${rounded}s`
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, '0')}s`
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
  const [received, setReceived] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [speed, setSpeed] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [snapshot, setSnapshot] = useState(readPendingSafe(src))

  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(0)
  const emitRef = useRef(0)
  const speedRef = useRef(0)

  const apiHref = useMemo(() => {
    const params = new URLSearchParams({ src })
    if (formatId) params.set('f', formatId)
    if (audioMp3) params.set('a', 'mp3')
    return `/api/download?${params.toString()}`
  }, [audioMp3, formatId, src])

  const filename = useMemo(() => buildFilename(title, ext), [title, ext])

  /* ---------------------------------------------------------------------- */
  /* The transfer                                                            */
  /* ---------------------------------------------------------------------- */

  const saveBlob = useCallback((blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }, [filename])

  const run = useCallback(async () => {
    if (!src || !formatId) {
      setFailure({ message: 'This link is missing its download selection.', hint: 'Start again from the homepage and pick a quality on step 2.' })
      setPhase('error')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase('downloading')
    setFailure(null)
    setReceived(0)
    setSpeed(0)
    setElapsed(0)
    setTotal(parseSizeLabel(sizeLabel))
    speedRef.current = 0
    startedRef.current = performance.now()
    emitRef.current = 0

    try {
      const response = await fetch(apiHref, { signal: controller.signal })

      if (!response.ok || !response.body) {
        let message = `The download could not start (HTTP ${response.status}).`
        let hint: string | undefined
        try {
          const payload = (await response.json()) as { message?: string; hint?: string }
          message = payload.message ?? message
          hint = payload.hint
        } catch {
          /* non-JSON error body */
        }
        setFailure({ message, hint })
        setPhase('error')
        return
      }

      const contentLength = Number(response.headers.get('content-length') ?? 0)
      if (contentLength > 0) setTotal(contentLength)
      else {
        const headerEstimate = parseSizeLabel(response.headers.get('x-size-estimate'))
        if (headerEstimate) setTotal(headerEstimate)
      }

      const reader = response.body.getReader()
      const chunks: BlobPart[] = []
      let bytes = 0
      let lastTime = performance.now()
      let lastBytes = 0

      /* Throttled state emission: chunk events fire far faster than paints. */
      const emit = (now: number) => {
        setReceived(bytes)
        setSpeed(speedRef.current)
        setElapsed((now - startedRef.current) / 1000)
        emitRef.current = now
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue

        chunks.push(value as unknown as BlobPart)
        bytes += value.byteLength

        const now = performance.now()
        const dt = (now - lastTime) / 1000
        if (dt >= 0.25) {
          const instantaneous = (bytes - lastBytes) / dt
          speedRef.current = speedRef.current === 0 ? instantaneous : speedRef.current * 0.7 + instantaneous * 0.3
          lastTime = now
          lastBytes = bytes
        }
        if (now - emitRef.current > 150) emit(now)
      }

      emit(performance.now())
      setPhase('saving')
      saveBlob(
        new Blob(chunks, {
          type: response.headers.get('content-type') ?? 'application/octet-stream'
        })
      )
      setPhase('done')
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      setFailure({
        message: 'The stream was interrupted before the file finished.',
        hint: 'Your network or the source platform dropped the connection. Retry, or use the direct link below.'
      })
      setPhase('error')
    }
  }, [apiHref, filename, formatId, saveBlob, sizeLabel, src])

  useEffect(() => {
    void run()
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run captures every input it needs; re-running on identity churn would restart transfers.
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    router.push(`/download?url=${encodeURIComponent(src)}`)
  }, [router, src])

  const percent = total && total > 0 ? Math.min(99.5, (received / total) * 100) : null
  const eta = total && total > 0 && speed > 0 ? (total - received) / speed : null
  const isAudio = kind === 'audio'

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

          {/* What is being downloaded */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white/[0.02] px-3 py-1.5">
              {snapshot?.platformId ? (
                <PlatformMark id={snapshot.platformId} className="h-4 w-4 shrink-0" title={snapshot.platformName} />
              ) : null}
              <span className="truncate font-medium text-white/80">{title}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-semibold text-accent ring-1 ring-inset ring-accent/25">
              {isAudio ? '♫' : '▶'} {label}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1.5 font-medium text-white/60 uppercase ring-1 ring-inset ring-line">
              {ext}
            </span>
            {snapshot?.durationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-white/60 ring-1 ring-inset ring-line">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {snapshot.durationLabel}
              </span>
            ) : null}
          </div>
        </header>

        {/* ------------------------------------------------- downloading */}
        {(phase === 'downloading' || phase === 'saving') && (
          <div className="mt-8 animate-rise" aria-live="polite" aria-busy="true">
            <div className="mx-auto w-52 sm:w-60">
              <ProgressGauge
                percent={percent}
                caption={total && total > 0 ? `${formatBytes(received)} / ${formatBytes(total)}` : `${formatBytes(received)} transferred`}
              />
            </div>

            {/* striped transfer bar under the gauge */}
            <div className="mx-auto mt-6 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-ink-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-accent-soft via-accent to-accent-deep transition-[width] duration-300 ${
                  percent === null ? 'w-1/3 animate-pulse-soft' : ''
                }`}
                style={percent === null ? undefined : { width: `${Math.max(2, percent)}%` }}
              />
            </div>

            <dl className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Speed</dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {formatBytes(speed)}/s
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Downloaded</dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {formatBytes(received)}
                  {total && total > 0 ? (
                    <span className="font-normal text-white/45"> / {formatBytes(total)}</span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                  {phase === 'saving' ? 'Saving' : eta !== null ? 'Remaining' : 'Elapsed'}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {phase === 'saving' ? 'file…' : eta !== null ? formatDuration(eta) : formatDuration(elapsed)}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-center text-xs text-white/45">
              {total && total > 0 && estimated
                ? 'Size is the platform’s estimate — the real file may differ slightly.'
                : 'Keep this tab open; the file streams straight to your device and nothing is stored on the server.'}
            </p>

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
          <div className="mt-8 flex flex-col items-center animate-rise" role="status">
            <div className="w-60 sm:w-72">
              <SuccessScene />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-3 py-1.5 font-semibold text-ok ring-1 ring-inset ring-ok/25">
                <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                Saved as {filename}
              </span>
            </div>

            <dl className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Size</dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {formatBytes(received)}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Quality</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-white">{label}</dd>
              </div>
              <div className="rounded-xl border border-line bg-white/[0.02] px-2 py-2.5">
                <dt className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Took</dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {formatDuration(elapsed)}
                </dd>
              </div>
            </dl>

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
              Didn&apos;t get a save prompt? Check your browser&apos;s download bar — some browsers
              save silently to your Downloads folder.
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
                href={apiHref}
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
        Streams are proxied through Download24 and never written to disk.
      </p>
    </div>
  )
}

/** sessionStorage read guarded for SSR (the component renders client-side only). */
function readPendingSafe(src: string) {
  if (typeof window === 'undefined') return null
  return readPending(src)
}
