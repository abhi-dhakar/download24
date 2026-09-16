/**
 * The curated registry of supported platforms.
 *
 * This single file drives three things at once:
 *   1. the "Supported platforms" grid on the landing page,
 *   2. the platform badge shown on extraction results,
 *   3. server-side allow-listing of URLs in `app/api/parse/route.ts`.
 *
 * Adding a network is therefore a one-line change that automatically updates
 * the UI, the validation layer and the SEO copy.
 */

export type PlatformId =
  | 'youtube'
  | 'youtube-shorts'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'vimeo'
  | 'dailymotion'
  | 'reddit'
  | 'twitch'

export interface Platform {
  id: PlatformId
  /** Marketing name used in badges and copy. */
  name: string
  /** Wordmark shown inside the supported-platform card. */
  displayName: string
  /** Hostnames matched against the submitted URL (sub-domain agnostic). */
  hosts: string[]
  /** Brand accent, used for the glow/badge colours. */
  accent: string
  /** Secondary brand colour for two-tone marks (TikTok, Instagram). */
  accentAlt?: string
  /** Best resolution this source is realistically offered in. */
  maxResolution: 2160 | 1440 | 1080 | 720 | 480
  supportsMp3: boolean
  /** Watermark-free extraction guarantee (TikTok). */
  noWatermark?: boolean
  /** Short, keyword-bearing sentence used in the grid and in the JSON-LD. */
  blurb: string
  /** Formats advertised to search engines for this network. */
  qualities: string[]
  /** Shown in the hero chips and used for one-tap demo URLs. */
  demoUrl?: string
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    displayName: 'YouTube',
    hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'm.youtube.com'],
    accent: '#ff0033',
    maxResolution: 2160,
    supportsMp3: true,
    blurb:
      'Download YouTube videos in 4K UHD, 1440p QHD, 1080p Full HD or convert them to MP3 with ID3 tags.',
    qualities: ['4K', '1440p', '1080p', '720p', '480p', '360p', 'MP3'],
    demoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    displayName: 'Shorts',
    hosts: ['youtube.com'],
    accent: '#ff0033',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Save YouTube Shorts as vertical MP4 clips at full 1080p quality straight from the share link.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://www.youtube.com/shorts/eV3y4GvB0Ss'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    displayName: 'Instagram',
    hosts: ['instagram.com', 'instagr.am', 'ig.me'],
    accent: '#e1306c',
    accentAlt: '#f7b42c',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Grab Instagram Reels, IGTV episodes and video posts as clean MP4 files, including carousels.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://www.instagram.com/reel/C7YqTg3JM2s/'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    displayName: 'TikTok',
    hosts: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    accent: '#fe2c55',
    accentAlt: '#25f4ee',
    maxResolution: 1080,
    supportsMp3: true,
    noWatermark: true,
    blurb:
      'TikTok downloader with no watermark — full-resolution MP4 plus the original MP3 audio track.',
    qualities: ['1080p', '720p', '480p', 'MP3 (no watermark)'],
    demoUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453675'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    displayName: 'Facebook',
    hosts: ['facebook.com', 'fb.watch', 'fb.com', 'm.facebook.com'],
    accent: '#1877f2',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Save Facebook Watch clips, page videos, Reels and private group videos you have access to.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://www.facebook.com/facebook/videos/10155707263041729/'
  },
  {
    id: 'x',
    name: 'Twitter / X',
    displayName: 'X / Twitter',
    hosts: ['x.com', 'twitter.com', 't.co', 'pbs.twimg.com'],
    accent: '#e7e9ea',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Download X (Twitter) videos, GIF-like loops and Spaces recordings as MP4 without the player chrome.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://x.com/SpaceX/status/1410624005669765122'
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    displayName: 'Vimeo',
    hosts: ['vimeo.com', 'player.vimeo.com'],
    accent: '#1ab7ea',
    maxResolution: 2160,
    supportsMp3: true,
    blurb:
      'Pull Vimeo clips up to 4K, including password-protected embeds served through the player URL.',
    qualities: ['4K', '1440p', '1080p', '720p', 'MP3'],
    demoUrl: 'https://vimeo.com/76979871'
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    displayName: 'Dailymotion',
    hosts: ['dailymotion.com', 'dai.ly'],
    accent: '#0b6dc1',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Download Dailymotion videos and highlights in HD MP4 or extract their soundtrack as MP3.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://www.dailymotion.com/video/x2t9xzx'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    displayName: 'Reddit',
    hosts: ['reddit.com', 'redd.it', 'old.reddit.com'],
    accent: '#ff4500',
    maxResolution: 1080,
    supportsMp3: true,
    blurb:
      'Save Reddit videos and audio posts from any subreddit as source-quality MP4, no app required.',
    qualities: ['1080p', '720p', '480p', 'MP3'],
    demoUrl: 'https://www.reddit.com/r/videos/comments/1ehq0zj/'
  },
  {
    id: 'twitch',
    name: 'Twitch',
    displayName: 'Twitch',
    hosts: ['twitch.tv', 'clips.twitch.tv', 'm.twitch.tv'],
    accent: '#9146ff',
    maxResolution: 1080,
    supportsMp3: false,
    blurb:
      'Download Twitch clips and past broadcasts in up to 1080p60 source quality as MP4.',
    qualities: ['1080p', '720p', '480p'],
    demoUrl: 'https://clips.twitch.tv/SpicyGracefulRamenPeteZahHuh'
  }
] as const

const byId = new Map<string, Platform>(PLATFORMS.map((platform) => [platform.id, platform]))

export const getPlatform = (id: string | null | undefined): Platform | undefined =>
  id ? byId.get(id) : undefined

/** `www.youtube.com` → `youtube.com`, `m.tiktok.com` → `tiktok.com`. */
export const normalizeHost = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/^www\./, '')

const registrableSuffix = (hostname: string): string[] => {
  const parts = normalizeHost(hostname).split('.')
  return parts.length > 2 ? [parts.slice(-2).join('.'), parts.join('.')] : [parts.join('.')]
}

/** Resolve the marketing platform that owns a hostname. */
export function platformForHostname(hostname: string | null | undefined): Platform | undefined {
  if (!hostname) return undefined
  const candidates = new Set(registrableSuffix(hostname))
  // Sub-domain specific hosts (e.g. `clips.twitch.tv`) win over the root domain.
  const clean = normalizeHost(hostname)
  const exact = PLATFORMS.find((platform) => platform.hosts.includes(clean))
  if (exact) return exact
  return PLATFORMS.find((platform) =>
    platform.hosts.some((host) => candidates.has(host) || clean.endsWith(`.${host}`))
  )
}

export function platformForUrl(rawUrl: string): Platform | undefined {
  try {
    return platformForHostname(new URL(rawUrl).hostname)
  } catch {
    return undefined
  }
}

/** Hostnames accepted by the API (curated platforms + operator overrides). */
export const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  ...PLATFORMS.flatMap((platform) => platform.hosts),
  'm.facebook.net',
  'music.youtube.com',
  'www.tiktok.com',
  'shared.tiktok.com',
  'mobile.twitter.com',
  'studio.youtube.com'
])

/** Platforms whose logo grid is rendered above the fold. */
export const HERO_PLATFORMS: readonly Platform[] = [
  PLATFORMS[0], // YouTube
  PLATFORMS[3], // TikTok
  PLATFORMS[2], // Instagram
  PLATFORMS[4], // Facebook
  PLATFORMS[5] // X
]

export const MAX_RES_LABEL: Record<Platform['maxResolution'], string> = {
  2160: '4K UHD',
  1440: '1440p QHD',
  1080: '1080p Full HD',
  720: '720p HD',
  480: '480p SD'
}
