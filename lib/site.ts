/**
 * Central site configuration, branding and SEO copy.
 *
 * Everything that a operator might want to change when deploying their own
 * instance lives here or in `.env.example` — never inside components.
 */

const trim = (value: string | undefined): string | undefined => {
  const clean = value?.trim()
  return clean && clean.length > 0 ? clean.replace(/\/+$/, '') : undefined
}

/** Public origin of this deployment, e.g. `https://savefrom-clone.example.com`. */
export const siteUrl: string =
  trim(process.env.NEXT_PUBLIC_SITE_URL) ??
  trim(process.env.NEXT_PUBLIC_APP_URL) ??
  trim(process.env.VERCEL_PROJECT_PRODUCTION_URL)?.replace(/^https?:\/\//, 'https://') ??
  trim(process.env.VERCEL_URL)?.replace(/^https?:\/\//, 'https://') ??
  'http://localhost:3000'

/**
 * Canonical origin used for metadata, `alternates.canonical`, sitemap and
 * robots output. Defaults to `NEXT_PUBLIC_SITE_URL` so that preview, staging
 * and localhost builds never pollute Google with duplicate canonicals.
 */
export const canonicalOrigin: string = trim(process.env.NEXT_PUBLIC_CANONICAL_URL) ?? siteUrl

export const isProductionSite: boolean = !siteUrl.includes('localhost')

export const SITE = {
  name: 'SaveFrom Clone',
  shortName: 'SaveFromClone',
  domainHost: siteUrl.replace(/^https?:\/\//, ''),
  title:
    'Free Online Video Downloader - Download 4K Videos from YouTube, TikTok, Instagram | SaveFrom Clone',
  tagline: 'Paste a link. Pick 4K, 1080p or MP3. Download it free.',
  description:
    'Free online video downloader inspired by SaveFrom.net. Paste any link to download videos in up to 4K Ultra HD, 1080p Full HD, 720p HD, 480p or MP3 audio from YouTube, TikTok without watermark, Instagram Reels, Facebook, X/Twitter, Vimeo, Dailymotion, Reddit and Twitch clips. No registration, no app, no limits.',
  keywords: [
    'video downloader',
    'online video downloader',
    '4k video downloader',
    'youtube downloader',
    'download youtube video mp4',
    'tiktok downloader no watermark',
    'tiktok video downloader',
    'instagram reel downloader',
    'instagram video downloader',
    'facebook video downloader',
    'twitter video downloader',
    'x video downloader',
    'vimeo downloader',
    'dailymotion downloader',
    'reddit video downloader',
    'twitch clip downloader',
    'mp3 converter',
    'youtube to mp3',
    '1080p downloader',
    'savefrom clone',
    'savefrom alternative',
    'free video downloader no software',
    'download video in mp4',
    'youtubedl web',
    'yt-dlp online'
  ],
  locale: 'en_US',
  language: 'en',
  ogImage: '/opengraph-image',
  themeColor: '#05070f',
  organization: {
    name: 'SaveFrom Clone',
    url: canonicalOrigin,
    logo: `${canonicalOrigin}/icon.svg`
  }
} as const

/** Global rate/abuse limits shared by the API routes. */
export const LIMITS = {
  /** LRU metadata cache lifetime (spec: 15 minutes). */
  cacheTtlMs: 15 * 60 * 1000,
  /** Maximum `yt-dlp` invocations kept warm in memory. */
  cacheMaxEntries: 2000,
  /** Hard timeout for a metadata extraction. */
  extractTimeoutMs: Number(process.env.YTDL_EXTRACT_TIMEOUT_MS ?? 60_000),
  /** Hard timeout for a proxied download (serverless `maxDuration` should match). */
  downloadTimeoutMs: Number(process.env.YTDL_DOWNLOAD_TIMEOUT_MS ?? 30 * 60_000),
  /** Extractions per minute per client. */
  extractRequestsPerMinute: Number(process.env.RATE_LIMIT_EXTRACT_PER_MIN ?? 40),
  /** Downloads per minute per client. */
  downloadRequestsPerMinute: Number(process.env.RATE_LIMIT_DOWNLOAD_PER_MIN ?? 12),
  /** Concurrent downloads per client. */
  downloadMaxConcurrentPerClient: Number(process.env.RATE_LIMIT_DOWNLOAD_CONCURRENCY ?? 2),
  /** Longest `title` we are willing to render/echo back. */
  maxTitleLength: 300,
  maxUrlLength: 2048
} as const

/** Behaviour flags that change how a finished download reaches the browser. */
export const DOWNLOAD_MODE: 'stream' | 'redirect' =
  process.env.DOWNLOAD_MODE === 'redirect' ? 'redirect' : 'stream'

/** Where an age/region-gated extractor should read Netscape cookies from. */
export const cookiesPath: string | undefined = process.env.YTDL_COOKIES?.trim() || undefined

/** Extra hosts accepted by the API beyond the curated platform list. */
export const extraAllowedHosts: string[] = (process.env.EXTRA_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase().replace(/^\./, ''))
  .filter(Boolean)
