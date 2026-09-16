/**
 * Turns a raw `yt-dlp --dump-single-json` payload into the compact,
 * UI-friendly contract the landing page renders.
 *
 * Real-world quirks handled here (all observed against live extractors):
 *   - modern YouTube returns *no* muxed streams at all (DASH video + audio),
 *     so every >= 360p option must be flagged as a merge job;
 *   - `storyboard` entries show up as formats with `vcodec: "none"` and
 *     heights of 27/45/90 and must never be offered as downloads;
 *   - `mhtml`, DRM, image and playlist-noise formats are filtered out;
 *   - `filesize` is often missing and `filesize_approx` is an estimate, so the
 *     UI is told the number is approximate.
 */

import { LIMITS } from './site'
import { platformForUrl, type Platform } from './platforms'
import {
  QUALITY_LABEL,
  QUALITY_ORDER,
  type DownloadOption,
  type DownloadTag,
  type ParseErrorResponse,
  type ParsePayload,
  type QualityTier,
  type VideoMeta
} from './types'

/* -------------------------------------------------------------------------- */
/*                            Raw yt-dlp structures                           */
/* -------------------------------------------------------------------------- */

export interface YtDlpFormat {
  format_id?: string
  format?: string
  format_note?: string
  ext?: string
  url?: string
  protocol?: string
  vcodec?: string
  acodec?: string
  width?: number
  height?: number
  fps?: number
  tbr?: number
  vbr?: number
  abr?: number
  filesize?: number
  filesize_approx?: number
  source_preference?: number
  has_drm?: boolean
  container?: string
  dynamic_range?: string
  language?: string
  acodec_missing?: boolean
}

export interface YtDlpThumbnail {
  id?: string
  url?: string
  width?: number
  height?: number
  preference?: number
}

export interface YtDlpVideo {
  _type?: string
  id?: string
  title?: string
  fulltitle?: string
  description?: string
  thumbnail?: string
  images?: YtDlpThumbnail[]
  thumbnails?: YtDlpThumbnail[]
  duration?: number
  duration_string?: string
  uploader?: string
  channel?: string
  uploader_id?: string
  upload_date?: string
  timestamp?: number
  release_timestamp?: number
  view_count?: number
  like_count?: number
  comment_count?: number
  webpage_url?: string
  original_url?: string
  extractor?: string
  extractor_key?: string
  extractor_version?: string
  is_live?: boolean
  live_status?: string
  availability?: string
  age_limit?: number
  playlist?: string
  playlist_id?: string
  playlist_count?: number
  n_entries?: number
  entries?: unknown[]
  formats?: YtDlpFormat[]
  height?: number
  width?: number
  fps?: number
  format?: string
  requested_formats?: YtDlpFormat[]
  _version?: { version?: string; current_git_head?: string }
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const NOISE_EXTS = new Set([
  'mhtml',
  'html',
  'json',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'pdf',
  'ism',
  'ismd',
  'mpd',
  'png_seq'
])

/** Average bitrate of LAME's VBR presets, used to size the MP3 row honestly. */
const MP3_VBR_KBPS: Record<string, number> = {
  '0': 245,
  '1': 225,
  '2': 190,
  '3': 175,
  '4': 165,
  '5': 155,
}

const MPEG_VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'm4s'])
const MPEG_AUDIO_EXTS = new Set(['m4a', 'mp4', 'aac', 'm4s'])
const WEBM_VIDEO_EXTS = new Set(['webm'])
const WEBM_AUDIO_EXTS = new Set(['opus', 'weba'])

export function formatBytes(bytes: number | undefined | null): string | undefined {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return undefined
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}

export function formatDuration(seconds: number | undefined, fallback?: string): string | undefined {
  if (fallback) return fallback
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return undefined
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

function formatUploadDate(uploadDate?: string, timestamp?: number, release?: number): string | undefined {
  if (uploadDate && /^\d{8}$/.test(uploadDate)) {
    const day = Number(uploadDate.slice(6, 8))
    const month = Number(uploadDate.slice(4, 6)) - 1
    const year = Number(uploadDate.slice(0, 4))
    if (month >= 0 && month < 12) return `${day} ${MONTHS[month]} ${year}`
  }
  const epoch = timestamp ?? release
  if (epoch && Number.isFinite(epoch)) {
    const date = new Date(epoch * 1000)
    if (!Number.isNaN(date.getTime())) {
      return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
    }
  }
  return undefined
}

/**
 * Quality class from the **short** edge.
 *
 * Bucketing by `height` alone is wrong for portrait media: a TikTok at
 * 1080x1920 would be advertised as "4K" (1920 rows) when it is the same class
 * as a 1920x1080 desktop video. The short edge is orientation-agnostic, which
 * is also how the platforms themselves label their ladders (540p, 1080p…).
 */
export function tierForSize(width: number | undefined, height: number | undefined): QualityTier {
  const edges = [width, height].filter((value): value is number => typeof value === 'number' && value > 0)
  const shortEdge = edges.length > 0 ? Math.min(...edges) : (height ?? 0)
  if (shortEdge >= 2160) return '2160'
  if (shortEdge >= 1440) return '1440'
  if (shortEdge >= 1080) return '1080'
  if (shortEdge >= 720) return '720'
  if (shortEdge >= 540) return '540'
  if (shortEdge >= 420) return '480'
  if (shortEdge >= 320) return '360'
  return '240'
}

/** Nominal vertical resolution used in labels and in `height<=N` fallbacks. */
export const shortEdgeOf = (format: YtDlpFormat): number => {
  const edges = [format.width, format.height].filter(
    (value): value is number => typeof value === 'number' && value > 0
  )
  return edges.length > 0 ? Math.min(...edges) : 0
}

export const isAudioOnlyFormat = (format: YtDlpFormat): boolean =>
  Boolean(format.acodec && format.acodec !== 'none') &&
  (!format.vcodec || format.vcodec === 'none') &&
  !NOISE_EXTS.has(format.ext ?? '') &&
  !format.has_drm

export const isVideoFormat = (format: YtDlpFormat): boolean =>
  Boolean(format.vcodec && format.vcodec !== 'none') &&
  !NOISE_EXTS.has(format.ext ?? '') &&
  !format.has_drm &&
  shortEdgeOf(format) >= 144 &&
  format.ext !== 'mhtml'

export const isMuxedFormat = (format: YtDlpFormat): boolean =>
  isVideoFormat(format) && Boolean(format.acodec && format.acodec !== 'none')

const tbrOf = (format: YtDlpFormat): number =>
  format.tbr ?? (format.vbr ?? 0) + (format.abr ?? 0)

const sizeOf = (format: YtDlpFormat): number | undefined =>
  format.filesize ?? format.filesize_approx ?? undefined

const containerOf = (format: YtDlpFormat): string => format.ext ?? format.container ?? 'mp4'

/**
 * Container the *finished* file will use. Muxed sources keep their native
 * container; split video+audio merges are only forced to mp4/webm when both
 * streams live in that family, otherwise yt-dlp picks mkv (always safe).
 */
function pickContainer(video: YtDlpFormat, audio: YtDlpFormat | null): DownloadOption['ext'] {
  const videoExt = containerOf(video)
  if (!audio) {
    if (MPEG_VIDEO_EXTS.has(videoExt) || videoExt === 'm3u8' || videoExt === 'ts') return 'mp4'
    if (WEBM_VIDEO_EXTS.has(videoExt)) return 'webm'
    return (['mp4', 'webm', 'mkv', 'm4a', 'mp3'] as const).includes(videoExt as never)
      ? (videoExt as DownloadOption['ext'])
      : 'mkv'
  }
  const audioExt = containerOf(audio)
  const videoIsMpeg = MPEG_VIDEO_EXTS.has(videoExt) || videoExt === 'm3u8' || videoExt === 'ts'
  const audioIsMpeg = MPEG_AUDIO_EXTS.has(audioExt)
  if (videoIsMpeg && audioIsMpeg) return 'mp4'
  if (WEBM_VIDEO_EXTS.has(videoExt) && (WEBM_AUDIO_EXTS.has(audioExt) || audioExt === 'webm')) {
    return 'webm'
  }
  return 'mkv'
}

/** Higher is better. Prefers self-contained files, then quality per bit. */
const formatScore = (format: YtDlpFormat): number => {
  let score = 0
  if (isMuxedFormat(format)) score += 10_000
  const ext = containerOf(format)
  if (ext === 'mp4') score += 800
  else if (ext === 'm4a') score += 700
  else if (ext === 'mov') score += 600
  else if (ext === 'webm') score += 500
  else if (ext === 'm3u8') score += 100
  // `source_preference` is lower-is-better in yt-dlp; normalise it away.
  if (typeof format.source_preference === 'number') {
    score += Math.max(-400, Math.min(400, 100 - format.source_preference * 10))
  }
  score += Math.min(3000, tbrOf(format))
  if (format.dynamic_range === 'SDR') score += 20
  return score
}

const audioScore = (format: YtDlpFormat): number => {
  let score = Math.min(2000, format.abr ?? format.tbr ?? 0)
  const ext = containerOf(format)
  if (ext === 'm4a') score += 400
  if (ext === 'opus') score += 300
  if (typeof format.source_preference === 'number') {
    score += Math.max(-200, Math.min(200, 50 - format.source_preference * 5))
  }
  return score
}

const codecLabel = (vcodec?: string): string | undefined => {
  if (!vcodec || vcodec === 'none') return undefined
  const base = vcodec.split('.')[0]
  return base.toUpperCase()
}

/* -------------------------------------------------------------------------- */
/*                              Option generation                             */
/* -------------------------------------------------------------------------- */

export interface BuildOptionsInput {
  raw: YtDlpVideo
  sourceUrl: string
  platform?: Platform
}

/**
 * Builds the grouped download options: one entry per available resolution tier
 * plus a single MP3 entry. `id` values are dense indices (0..n) used by the
 * download endpoint to re-select the *same* streams later.
 */
export function buildDownloadOptions({ raw, sourceUrl, platform }: BuildOptionsInput): {
  options: DownloadOption[]
  muxedMaxHeight: number | null
  supportsMp3: boolean
} {
  const formats = Array.isArray(raw.formats) ? raw.formats : []
  const videos = formats.filter(isVideoFormat)
  const audios = formats.filter(isAudioOnlyFormat).sort((a, b) => audioScore(b) - audioScore(a))
  const bestAudio = audios[0] ?? null

  const groups = new Map<QualityTier, YtDlpFormat[]>()
  for (const format of videos) {
    const tier = tierForSize(format.width, format.height)
    const bucket = groups.get(tier)
    if (bucket) bucket.push(format)
    else groups.set(tier, [format])
  }

  const options: DownloadOption[] = []
  const orderedTiers = QUALITY_ORDER.filter((tier) => tier !== 'audio' && groups.has(tier))

  for (const tier of orderedTiers) {
    const bucket = groups.get(tier) ?? []
    const sorted = [...bucket].sort((a, b) => formatScore(b) - formatScore(a))
    const primary = sorted[0]
    if (!primary) continue

    const muxed = isMuxedFormat(primary)
    const audio = muxed ? null : bestAudio
    const height = shortEdgeOf(primary) || null
    const resolutionLabel =
      primary.width && primary.height ? `${primary.width}x${primary.height}` : undefined
    const ext = pickContainer(primary, audio)
    const hasOwnAudio = muxed

    const videoBytes = sizeOf(primary)
    const audioBytes = hasOwnAudio ? undefined : sizeOf(audio ?? {})
    const totalTbr =
      (primary.tbr ?? 0) + (hasOwnAudio ? 0 : audio ? (audio.abr ?? audio.tbr ?? 0) : 0)

    // Prefer source-reported sizes. When they are missing, estimate from the
    // media duration and reported bitrate, and mark the result as approximate.
    // Bitrate estimates can be noticeably higher than the final file size.
    const bitrateEstimate =
      raw.duration && totalTbr > 0 ? Math.round((raw.duration * totalTbr * 1000) / 8) : undefined
    const size =
      videoBytes !== undefined && (hasOwnAudio || audioBytes !== undefined)
        ? {
            bytes: (videoBytes ?? 0) + (audioBytes ?? 0),
            exact: primary.filesize !== undefined && (hasOwnAudio || audio?.filesize !== undefined)
          }
        : { bytes: bitrateEstimate, exact: false }
    const bytes = size.bytes
    const estimated = bytes === undefined ? undefined : !size.exact

    const tags: DownloadTag[] = []
    if (tier === orderedTiers[0]) tags.push('best')
    if (tier === '1080' || tier === '720') tags.push('hd')
    if (platform?.id === 'tiktok' && ext === 'mp4') tags.push('no-watermark')

    options.push({
      id: options.length,
      label: QUALITY_LABEL[tier],
      tier,
      height,
      resolutionLabel,
      streamHeight: primary.height ?? undefined,
      ext,
      kind: 'video',
      muxed,
      needsMerge: !muxed,
      vcodec: codecLabel(primary.vcodec),
      acodec: codecLabel((muxed ? primary : audio)?.acodec),
      fps: primary.fps && primary.fps > 30 ? Math.round(primary.fps) : undefined,
      bitrateKbps: totalTbr > 0 ? Math.round(totalTbr) : undefined,
      bytes,
      sizeLabel: formatBytes(bytes),
      estimated: estimated || undefined,
      formatIds: [String(primary.format_id ?? 'bv'), ...(audio ? [String(audio.format_id ?? 'ba')] : [])],
      tags
    })
  }

  // Smallest video tier gets a "data saver" pill.
  const videoOptions = options.filter((option) => option.kind === 'video')
  if (videoOptions.length > 1) {
    const smallest = videoOptions[videoOptions.length - 1]
    smallest.tags = [...smallest.tags, 'smallest']
  }

  const supportsMp3 =
    platform?.supportsMp3 !== false && (audios.length > 0 || videoOptions.length > 0)

  if (supportsMp3) {
    const source = bestAudio ?? videos[videos.length - 1]
    const audioOnly = Boolean(bestAudio && isAudioOnlyFormat(bestAudio))
    // The delivered file is a fresh LAME encode, so size it from the *target*
    // bitrate rather than the source stream (which is a different codec and
    // typically far smaller than the VBR output we are about to write).
    const kbps = MP3_VBR_KBPS[process.env.MP3_AUDIO_QUALITY ?? '0'] ?? 192
    const seconds = typeof raw.duration === 'number' ? raw.duration : 0
    const bytes = seconds > 0 ? Math.round((seconds * kbps * 1000) / 8) : sizeOf(source ?? {})
    options.push({
      id: options.length,
      label: 'MP3 Audio',
      tier: 'audio',
      height: null,
      ext: 'mp3',
      kind: 'audio',
      muxed: true,
      needsMerge: false,
      acodec: 'MP3',
      bitrateKbps: kbps,
      bytes,
      sizeLabel: formatBytes(bytes),
      estimated: true,
      formatIds: [audioOnly ? String(bestAudio?.format_id ?? 'ba') : 'b'],
      audioFormatId: audioOnly ? 'bestaudio' : 'best',
      tags: ['audio']
    })
  }

  const muxedHeights = videos.filter(isMuxedFormat).map((format) => shortEdgeOf(format))
  return {
    options,
    muxedMaxHeight: muxedHeights.length ? Math.max(...muxedHeights) : null,
    supportsMp3
  }
}

/* -------------------------------------------------------------------------- */
/*                             Metadata enrichment                            */
/* -------------------------------------------------------------------------- */

const GENERIC_PLATFORM = {
  id: 'generic',
  name: 'Web video',
  displayName: 'Web',
  accent: '#22d3ee',
  maxResolution: 1080,
  supportsMp3: true
} as const

function bestThumbnail(raw: YtDlpVideo, platform?: Platform): {
  url?: string
  width?: number
  height?: number
} {
  const candidates = [...(raw.thumbnails ?? []), ...(raw.images ?? [])].filter(
    (entry): entry is Required<Pick<YtDlpThumbnail, 'url'>> & YtDlpThumbnail =>
      typeof entry.url === 'string' && entry.url.startsWith('http')
  )
  const withSize = candidates.filter((entry) => typeof entry.width === 'number')
  const widest =
    withSize.length > 0
      ? withSize.reduce((best, entry) => ((entry.width ?? 0) > (best.width ?? 0) ? entry : best))
      : candidates.sort((a, b) => (b.preference ?? 0) - (a.preference ?? 0))[0]
  const fallback =
    raw.thumbnail ??
    (platform?.id === 'youtube' && raw.id ? `https://i.ytimg.com/vi/${raw.id}/maxresdefault.jpg` : undefined)
  return {
    url: widest?.url ?? fallback,
    width: widest?.width,
    height: widest?.height
  }
}

export function buildMeta(raw: YtDlpVideo, sourceUrl: string, platform?: Platform): VideoMeta {
  const thumbnail = bestThumbnail(raw, platform)
  const liveStatus = raw.live_status ?? (raw.is_live ? 'is_live' : 'not_live')
  const availabilityRaw = raw.availability
  const isPlaylist =
    raw._type === 'playlist' ||
    (typeof raw.n_entries === 'number' && raw.n_entries > 1) ||
    (typeof raw.playlist_count === 'number' && raw.playlist_count > 1)

  const needsCookies = Boolean(availabilityRaw?.match(/private|premium|rental/)) || (raw.age_limit ?? 0) >= 18
  let warning: string | undefined
  if (liveStatus === 'is_live') {
    warning = 'This is a live stream — only the currently available DVR window can be saved.'
  } else if (liveStatus === 'post_live') {
    warning = 'This stream just ended; VOD exports sometimes appear a few hours later.'
  } else if (needsCookies) {
    warning = 'Age or login restricted media needs a cookies file configured on the server.'
  } else if (availabilityRaw === 'no_private') {
    warning = 'Some items in this result are private and were skipped.'
  }

  const title = (raw.title || raw.fulltitle || 'Untitled video')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.maxTitleLength)

  return {
    sourceUrl,
    canonicalUrl: raw.webpage_url || raw.original_url || sourceUrl,
    externalId: raw.id ? String(raw.id).slice(0, 128) : undefined,
    title,
    thumbnail: thumbnail.url,
    thumbnailWidth: thumbnail.width,
    thumbnailHeight: thumbnail.height,
    durationSeconds: raw.duration,
    durationLabel: formatDuration(raw.duration, raw.duration_string),
    uploader: raw.uploader,
    channel: raw.channel ?? raw.uploader,
    publicationDate: raw.upload_date,
    uploadDateLabel: formatUploadDate(raw.upload_date, raw.timestamp, raw.release_timestamp),
    viewCount: raw.view_count,
    likeCount: raw.like_count,
    platformId: platform?.id ?? GENERIC_PLATFORM.id,
    platformName: platform?.name ?? GENERIC_PLATFORM.name,
    accent: platform?.accent ?? GENERIC_PLATFORM.accent,
    availability:
      availabilityRaw === 'private'
        ? 'private'
        : availabilityRaw === 'unlisted'
          ? 'unlisted'
          : availabilityRaw === 'premium' || availabilityRaw === 'rental'
            ? availabilityRaw
            : liveStatus === 'is_live' || liveStatus === 'post_live'
              ? 'live'
              : 'public',
    isLive: raw.is_live === true || liveStatus !== 'not_live',
    isLiveNow: liveStatus === 'is_live' || liveStatus === 'pre_live',
    isAgeRestricted: (raw.age_limit ?? 0) >= 18,
    isPlaylist,
    playlistCount: raw.n_entries ?? raw.playlist_count,
    regionRestricted: availabilityRaw === 'country_restricted',
    warning
  }
}

export interface BuildPayloadOptions {
  /**
   * When `false`, presets that require ffmpeg (video+audio merges and MP3
   * transcoding) are dropped instead of being offered as dead buttons.
   */
  ffmpegAvailable?: boolean
  /** Total item count when the submitted link was a playlist. */
  playlistCount?: number
}

/** Full conversion from raw extractor JSON to the API payload. */
export function buildParsePayload(
  raw: YtDlpVideo,
  sourceUrl: string,
  payloadOptions: BuildPayloadOptions = {}
): ParsePayload {
  const platform = platformForUrl(sourceUrl)
  const meta = buildMeta(raw, sourceUrl, platform ?? undefined)
  const {
    options: builtOptions,
    muxedMaxHeight,
    supportsMp3
  } = buildDownloadOptions({ raw, sourceUrl, platform: platform ?? undefined })

  let options = builtOptions
  let warning = meta.warning
  if (payloadOptions.ffmpegAvailable === false) {
    const selfContained = builtOptions.filter((option) => !option.needsMerge && option.kind !== 'audio')
    if (selfContained.length > 0) {
      options = selfContained.map((option, index) => ({ ...option, id: index }))
      warning =
        'This server is missing ffmpeg, so merged 1080p/4K presets and MP3 conversion are hidden. Single-file streams only.'
    }
  }

  if (options.length > 1) {
    const video = options.filter((option) => option.kind === 'video')
    if (video.length > 0) {
      const best = video[0]
      if (!best.tags.includes('best')) best.tags = [...best.tags, 'best']
    }
  }

  const tiers = new Set(options.map((option) => option.tier))
  const availableQualities = QUALITY_ORDER.filter((tier) => tiers.has(tier))
  const firstVideo = options.find((option) => option.kind === 'video')
  const maxQuality = firstVideo?.tier ?? (options.length > 0 ? 'audio' : null)
  const playlistCount = meta.playlistCount ?? payloadOptions.playlistCount

  return {
    meta: {
      ...meta,
      warning,
      playlistCount,
      isPlaylist: meta.isPlaylist || (playlistCount ?? 0) > 1
    },
    options,
    availableQualities,
    maxQuality,
    supportsMp3: payloadOptions.ffmpegAvailable === false ? false : supportsMp3,
    muxedMaxHeight,
    extractor: raw.extractor_key ?? raw.extractor,
    extractorVersion: raw.extractor_version ?? raw._version?.version,
    fetchedAt: Date.now(),
    cacheTtlSeconds: Math.round(LIMITS.cacheTtlMs / 1000)
  }
}

/* -------------------------------------------------------------------------- */
/*                             Upstream error mapping                         */
/* -------------------------------------------------------------------------- */

export type MappedErrorCode = Extract<
  ParseErrorResponse['code'],
  | 'UNAVAILABLE'
  | 'LOGIN_REQUIRED'
  | 'GEOBLOCKED'
  | 'TOO_MANY_REQUESTS'
  | 'UNSUPPORTED_URL'
  | 'SERVER_UNAVAILABLE'
  | 'EXTRACTION_FAILED'
>

export type MappedError = {
  code: MappedErrorCode
  message: string
  hint?: string
}

/** Removes ANSI noise and never leaks upstream signed URLs into the response. */
export function cleanUpstreamError(message: string | undefined, limit = 400): string {
  return (message ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/https?:\/\/\S+/g, '<link>')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('[debug]'))
    .join(' ')
    .slice(0, limit)
    .trim()
}

const RULES: Array<{ test: RegExp; build: (clean: string) => MappedError }> = [
  {
    test: /HTTP Error 429|Too Many Requests|please slow down/i,
    build: () => ({
      code: 'TOO_MANY_REQUESTS',
      message: 'The source site is rate-limiting this server right now.',
      hint: 'Wait a minute and try again — repeat results are served from cache.'
    })
  },
  {
    test: /Sign in to confirm you.?re not a bot|not a bot|cookies|log in|login is required|account to be logged in/i,
    build: () => ({
      code: 'LOGIN_REQUIRED',
      message: 'This media needs an authenticated session on the source platform.',
      hint: 'A server operator can point YTDL_COOKIES at a Netscape cookies.txt file to unlock it.'
    })
  },
  {
    test: /available in your country|geo.?restrict|region.?restrict|blocked in your location/i,
    build: () => ({
      code: 'GEOBLOCKED',
      message: 'The uploader restricted this video by region, so our server cannot read it.',
      hint: 'Try the official app in the licensed country, or use a platform we can reach.'
    })
  },
  {
    test: /ffmpeg.*not found|ffmpeg is not installed|You have requested merging.*ffmpeg|Install ffmpeg/i,
    build: () => ({
      code: 'SERVER_UNAVAILABLE',
      message: 'The merge tool (ffmpeg) is missing on this server, so 1080p+ and MP3 are unavailable.',
      hint: 'Deploy with ffmpeg installed, or set DOWNLOAD_MODE=redirect for single-file formats.'
    })
  },
  {
    test: /Video unavailable|Private Video|no longer available|removed by the uploader|does not exist|does not exist on|community guidelines|copyright|is not a valid URL|requested formats? .*not available|Empty JSON|no video could be found|unable to extract|unsupported url/i,
    build: (clean) => ({
      code: 'UNAVAILABLE',
      message: 'That link cannot be downloaded — it may be private, deleted, or still processing.',
      hint: clean ? `Source said: ${clean}` : 'Open the link in a new tab to confirm it plays.'
    })
  },
  {
    test: /live stream|is currently live|pre.?live/i,
    build: () => ({
      code: 'UNAVAILABLE',
      message: 'This is a live broadcast; only finished VOD segments can be saved.',
      hint: 'Come back once the stream is published as a replay.'
    })
  }
]

export function mapExtractionError(rawMessage: string | undefined): MappedError {
  const clean = cleanUpstreamError(rawMessage)
  for (const rule of RULES) {
    if (rule.test.test(clean)) return rule.build(clean)
  }
  return {
    code: 'EXTRACTION_FAILED',
    message: 'We could not read that page. The platform may have changed its player.',
    hint: clean ? `Details: ${clean}` : 'Try the share link from the official mobile app.'
  }
}
