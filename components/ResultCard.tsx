'use client'

/**
 * Result container rendered after a successful extraction: thumbnail, title,
 * duration, platform badge and every download preset grouped by resolution.
 *
 * Server-derived data only — this component never re-parses a URL, it renders
 * exactly what `/api/parse` returned.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Gauge,
  Link2,
  RefreshCw,
  ShieldAlert,
  X
} from 'lucide-react'

import { PlatformMark } from './PlatformMark'
import { Spinner } from './Spinner'
import { QUALITY_LABEL, downloadUrlFor, type DownloadOption, type ParsePayload } from '@/lib/types'

interface Props {
  data: ParsePayload
  cached?: boolean
  tookMs?: number
  onRefresh: () => void
  onClose: () => void
  /** Set while a *re-fetch* is running, to dim the panel instead of replacing it. */
  busy?: boolean
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

function PresetRow({
  option,
  sourceUrl,
  title
}: {
  option: DownloadOption
  sourceUrl: string
  title: string
}) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null)
  const href = downloadUrlFor(sourceUrl, option)

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }, [href])

  const startDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadPercent(null)

    try {
      const response = await fetch(href)
      if (!response.ok || !response.body) throw new Error('Download request failed')

      const total = Number(response.headers.get('content-length') ?? 0)
      const reader = response.body.getReader()
      const chunks: ArrayBuffer[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        const chunk = new Uint8Array(value.byteLength)
        chunk.set(value)
        chunks.push(chunk.buffer)
        received += value.byteLength
        if (total > 0) setDownloadPercent(Math.min(99, Math.round((received / total) * 100)))
      }

      const blob = new Blob(chunks, { type: response.headers.get('content-type') ?? 'application/octet-stream' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${title}.${option.ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setDownloadPercent(100)
    } catch {
      // Fall back to the browser's native download handling if streaming is unavailable.
      window.location.href = href
    } finally {
      window.setTimeout(() => {
        setDownloading(false)
        setDownloadPercent(null)
      }, 700)
    }
  }, [downloading, href, option.ext, title])

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
        className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-ink-800 text-[13px] font-semibold text-white/85 ring-1 ring-inset ring-line"
      >
        {TIER_SHORT[option.tier]}
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
        aria-label={`Copy direct download link for ${option.label} of ${title}`}
        title="Copy download link"
      >
        {copied ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>

      <a
        href={href}
        onClick={(event) => {
          if (downloading) {
            event.preventDefault()
            return
          }
          event.preventDefault()
          void startDownload()
        }}
        aria-busy={downloading}
        aria-disabled={downloading}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-soft via-accent to-accent-deep px-3.5 py-2 text-sm font-semibold text-ink-950 shadow-glow transition-transform duration-150 hover:-translate-y-px active:translate-y-0 ${
          downloading ? 'cursor-wait opacity-80' : ''
        }`}
        aria-label={`Download ${option.label}${option.ext ? ` as ${option.ext.toUpperCase()}` : ''}: ${title}`}
      >
        {downloading ? <Spinner className="h-4 w-4" label="Downloading" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        {downloadPercent !== null ? `${downloadPercent}%` : downloading ? 'Downloading' : 'Download'}
      </a>
    </li>
  )
}

export function ResultCard({ data, cached, tookMs, onRefresh, onClose, busy }: Props) {
  const { meta, options } = data
  const videoOptions = useMemo(() => options.filter((option) => option.kind === 'video'), [options])
  const audioOptions = useMemo(() => options.filter((option) => option.kind === 'audio'), [options])
  const [thumbFailed, setThumbFailed] = useState(false)
  const host = useMemo(() => {
    try {
      return new URL(meta.canonicalUrl ?? meta.sourceUrl).hostname.replace(/^www\./, '')
    } catch {
      return 'source'
    }
  }, [meta.canonicalUrl, meta.sourceUrl])

  const highest = videoOptions[0]
  const ytDlpCommand = `"${meta.sourceUrl}"`

  return (
    <section
      aria-labelledby="result-heading"
      className={`glass-card rounded-(--radius-card) p-4 shadow-lift transition-opacity sm:p-6 ${
        busy ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-1 text-xs font-medium ring-1 ring-inset ring-line">
          <PlatformMark id={meta.platformId} className="h-5 w-5" title={meta.platformName} />
          {meta.platformName}
        </span>
        {data.extractor ? (
          <span className="text-[11px] text-white/40">via {data.extractor} extractor</span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-2">
          {typeof tookMs === 'number' ? (
            <span
              className="hidden items-center gap-1 text-[11px] text-white/40 sm:inline-flex"
              title={cached ? 'Served from the 15 minute in-memory LRU cache' : 'Freshly extracted with yt-dlp'}
            >
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              {cached ? 'cached' : 'live'} · {tookMs} ms
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Re-run the extraction and bypass the cache"
          >
            {busy ? (
              <Spinner className="h-3.5 w-3.5" label="Refreshing" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close the result panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
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
              loading="lazy"
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
          <h3 id="result-heading" className="text-base font-semibold text-white sm:text-lg">
            {meta.title}
          </h3>
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
            {highest ? `, up to ${QUALITY_LABEL[highest.tier]}` : ''}.
            {data.muxedMaxHeight
              ? ` Single-file MP4 up to ${data.muxedMaxHeight}p; higher tiers are merged server-side.`
              : ''}
            {meta.isPlaylist && meta.playlistCount ? ` Playlist detected: ${meta.playlistCount} items.` : ''}
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
          <h4 className="flex items-center gap-2 text-[11px] font-semibold text-white/45 uppercase tracking-wider">
            Video quality
            {meta.isLiveNow ? (
              <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] text-danger">live</span>
            ) : null}
          </h4>
          {videoOptions.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {videoOptions.map((option) => (
                <PresetRow key={option.id} option={option} sourceUrl={meta.sourceUrl} title={meta.title} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-xl bg-ink-800 p-3 text-xs text-white/55">
              This source only exposed an audio stream, so no video preset was offered.
            </p>
          )}
        </div>

        <div>
          <h4 className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">Audio</h4>
          {audioOptions.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {audioOptions.map((option) => (
                <PresetRow key={option.id} option={option} sourceUrl={meta.sourceUrl} title={meta.title} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-xl bg-ink-800 p-3 text-xs text-white/55">
              MP3 conversion is unavailable for this link — either the platform provides no audio track or
              the server has no ffmpeg installed.
            </p>
          )}

          <details className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <summary className="text-xs font-medium text-white/70">How this file is produced</summary>
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              The server re-selects these exact streams with{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5 text-white/70">
                yt-dlp -f {highest ? `f${highest.formatIds.join('+')}` : 'bestaudio'} -o - {ytDlpCommand}
              </code>{' '}
              and pipes the finished container straight to your browser. Nothing is stored on disk, and the
              child process is killed the moment you cancel.
            </p>
          </details>
        </div>
      </div>
    </section>
  )
}
