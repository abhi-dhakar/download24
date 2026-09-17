/** Shared API ⇄ UI contracts. Imported by both server routes and client components. */

export type QualityTier =
  | '2160'
  | '1440'
  | '1080'
  | '720'
  | '540'
  | '480'
  | '360'
  | '240'
  | 'audio'
  /** File shares (TeraBox) publish no resolution metadata — the file is the source. */
  | 'original'

export const QUALITY_ORDER: QualityTier[] = [
  '2160',
  '1440',
  '1080',
  '720',
  '540',
  '480',
  '360',
  '240',
  'audio',
  'original'
]

export const QUALITY_LABEL: Record<QualityTier, string> = {
  '2160': '4K Ultra HD',
  '1440': '1440p QHD',
  '1080': '1080p Full HD',
  '720': '720p HD',
  '540': '540p',
  '480': '480p SD',
  '360': '360p Mobile',
  '240': '240p Data saver',
  audio: 'MP3 Audio',
  original: 'Original file'
}

/** Marketing tag rendered as a pill next to a resolution. */
export type DownloadTag = 'best' | 'no-watermark' | 'smallest' | 'hd' | 'audio'

export interface DownloadOption {
  /** Stable index into the format list, echoed back to `/api/download`. */
  id: number
  label: string
  tier: QualityTier
  /** Nominal class of the stream (the short edge, so 1080x1920 == 1080p). */
  height: number | null
  /** Real pixel dimensions, e.g. `1080x1920` for vertical media. */
  resolutionLabel?: string
  /**
   * The height exactly as the platform reported it, used only as the bound in
   * `height<=N` format-selector fallbacks. It differs from `height` for
   * portrait media (1080x1920 reports 1920), and yt-dlp matches against that.
   */
  streamHeight?: number
  /**
   * Container the finished file will use. Known media containers keep
   * autocomplete; file shares (TeraBox) can legitimately hold anything, so the
   * union stays open for those.
   */
  ext: 'mp4' | 'webm' | 'mkv' | 'm4a' | 'mp3' | 'opus' | (string & {})
  kind: 'video' | 'audio'
  /** True when video and audio already live in the same stream (no merge step). */
  muxed: boolean
  /** Video+audio are separate streams, so the server must merge with ffmpeg. */
  needsMerge: boolean
  vcodec?: string
  acodec?: string
  fps?: number
  bitrateKbps?: number
  bytes?: number
  sizeLabel?: string
  /** True when `bytes` is a sum of separately reported stream sizes. */
  estimated?: boolean
  formatIds: string[]
  tags: DownloadTag[]
  /** For audio options: the upstream selector (`bestaudio`, `f251`, ...). */
  audioFormatId?: string
  /**
   * Routing data for engines that are **not** yt-dlp. TeraBox file shares are
   * fetched by path after a fresh token/signature resolve, because the signed
   * `dlink` handed out during extraction expires within minutes.
   */
  remoteFile?: {
    path: string
    name: string
    /** Signed URL captured at parse time; only used as a first-try hint. */
    dlink?: string
  }
}

export interface VideoMeta {
  sourceUrl: string
  canonicalUrl?: string
  externalId?: string
  title: string
  /** Best available thumbnail (never proxied; rendered with locked dimensions). */
  thumbnail?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  durationSeconds?: number
  durationLabel?: string
  uploader?: string
  channel?: string
  publicationDate?: string
  uploadDateLabel?: string
  viewCount?: number
  likeCount?: number
  platformId: string
  platformName: string
  accent: string
  availability?: 'public' | 'private' | 'unlisted' | 'premium' | 'rental' | 'live'
  isLive: boolean
  isLiveNow: boolean
  isAgeRestricted: boolean
  /** True when the link expanded to a multi-item playlist. */
  isPlaylist: boolean
  playlistCount?: number
  regionRestricted?: boolean
  warning?: string
}

export interface ParsePayload {
  meta: VideoMeta
  /** Grouped, human-facing download choices (4K, 1080p, ... MP3). */
  options: DownloadOption[]
  /** Quality tiers present, most useful first. */
  availableQualities: QualityTier[]
  maxQuality: QualityTier | null
  supportsMp3: boolean
  /** Highest single-file (no ffmpeg merge) resolution, used for the "MP4" note. */
  muxedMaxHeight: number | null
  extractor?: string
  extractorVersion?: string
  fetchedAt: number
  cacheTtlSeconds: number
}

export interface ParseResponse {
  ok: true
  data: ParsePayload
  cached: boolean
  /** Milliseconds the request took (cache hits are usually < 1 ms). */
  tookMs: number
}

export interface ParseErrorResponse {
  ok: false
  code:
    | 'INVALID_URL'
    | 'UNSUPPORTED_URL'
    | 'SELF_REQUEST'
    | 'RATE_LIMITED'
    | 'TIMEOUT'
    | 'EXTRACTION_FAILED'
    | 'UNAVAILABLE'
    | 'TOO_MANY_REQUESTS'
    | 'GEOBLOCKED'
    | 'LOGIN_REQUIRED'
    | 'SERVER_UNAVAILABLE'
  message: string
  hint?: string
  /** Seconds to wait before retrying (only for 429 responses). */
  retryAfter?: number
  cached: false
  tookMs: number
}

export type ParseResult = ParseResponse | ParseErrorResponse

/** Query contract for `/api/download`. */
export interface DownloadQuery {
  src: string
  /** Index into `options`; selects the exact streams re-resolved server-side. */
  f?: string
  /** Audio hint; MP3 is the only transcoded target this server offers. */
  a?: 'mp3'
}

/** Single source of truth for building download links in the UI. */
export function downloadUrlFor(
  sourceUrl: string,
  option: Pick<DownloadOption, 'id' | 'ext' | 'kind'>
): string {
  const params = new URLSearchParams({ src: sourceUrl })
  params.set('f', String(option.id))
  if (option.kind === 'audio' && option.ext === 'mp3') params.set('a', 'mp3')
  return `/api/download?${params.toString()}`
}
