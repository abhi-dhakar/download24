/**
 * Structured data + long-form copy for the landing page.
 *
 * The FAQ array below is the *single* source of truth: the visible
 * `<details>` accordion and the `FAQPage` JSON-LD both map over it, so the rich
 * result markup can never drift away from what a human actually reads.
 */

import { canonicalOrigin, LIMITS, SITE } from './site'
import { PLATFORMS } from './platforms'

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How do I download a video from YouTube, TikTok or Instagram for free?',
    answer:
      'Copy the share link from the app or browser, paste it into the download box at the top of this page and press "Get links". We read the page with an up-to-date yt-dlp engine, list every available resolution, and hand you a direct MP4 or MP3 file. There is no software to install, no browser extension and no account required — the whole extraction runs in your browser against our server in a couple of seconds.'
  },
  {
    question: 'Which video qualities are supported — is 4K really available?',
    answer:
      'Every stream the source exposes is listed: 2160p (4K UHD), 1440p QHD, 1080p Full HD, 720p HD, 480p and 360p, plus MP3 audio. The picker shows the container (MP4, WebM or MKV), the codec family, the frame rate and an estimated file size, so you can judge whether a 4K clip is worth the bandwidth. If a channel only publishes 720p, 720p is the ceiling — we never upscale, because that would only inflate the file without adding detail.'
  },
  {
    question: 'Can I download TikTok videos without the watermark and turn them into MP3?',
    answer:
      'Yes. For TikTok we request the source rendition that has no watermark burned in, which keeps the original vertical resolution and audio. The same link can be converted to MP3 in one click: the server extracts the audio stream and re-encodes it with LAME at VBR quality 0 (roughly 245 kbps) while keeping the artist, title and cover art tags where the platform provides them.'
  },
  {
    question: 'Is it legal and safe to use this online video downloader?',
    answer:
      'The tool itself is legal; what you do with a specific video is your responsibility. Downloading a file you own, a Creative Commons work, or content whose licence allows redistribution is fine, while copying someone else’s protected video or breaking a platform’s terms of service is not. We process only the public URL you paste, never store your searches or downloads, do not run virus-scanned installers, and ask you to respect copyright and each platform’s rules.'
  },
  {
    question: 'Do I need to register, install an app, or pay for premium speeds?',
    answer:
      `No. There is no signup, no login, no desktop app and no queue with artificial speed caps. Repeated requests for the same link are served from a 15 minute in-memory LRU cache, so a popular video resolves almost instantly for everyone after the first lookup. Fair-use limits exist per IP address to keep the service available — a generous allowance of ${LIMITS.extractRequestsPerMinute} extractions per minute — and nothing else is throttled.`
  }
]

export interface HowToStep {
  title: string
  description: string
}

export const HOW_TO_STEPS: HowToStep[] = [
  {
    title: 'Copy the video link',
    description:
      'Open the video in YouTube, TikTok, Instagram, X or Facebook, press Share and choose “Copy link”. Short share URLs such as youtu.be or vm.tiktok.com work exactly as well as the long form.'
  },
  {
    title: 'Paste it into the box',
    description:
      'Drop the link in the download bar above and hit Get links. The URL is validated in your browser first, so a typo or a trackings-only link is rejected before any request leaves the page.'
  },
  {
    title: 'Pick your quality and format',
    description:
      'The results panel groups every usable stream by resolution — 4K UHD, 1080p Full HD, 720p HD, 480p, 360p — plus an MP3 audio row, each with container, codec and estimated size.'
  },
  {
    title: 'Save the file',
    description:
      'Press Download and the finished MP4 or MP3 is written straight to your device. Nothing is stored on the server: the stream is piped to you and the child process exits the moment your download ends.'
  }
]

export interface FeatureHighlight {
  title: string
  description: string
  /** Keyphrase echoed in the <h3> for long-tail queries. */
  keyword: string
  icon: 'sparkles' | 'user-x' | 'zap' | 'layers'
}

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    title: 'Up to 4K Ultra HD',
    keyword: '2160p video downloader',
    description:
      'Source-quality downloads for 2160p, 1440p, 1080p and 720p when the channel publishes them — never upscaled, always the real rendition.',
    icon: 'sparkles'
  },
  {
    title: 'No registration required',
    keyword: 'free downloader no signup',
    description:
      'No account, no email, no app store, no watermark of our own on the file. Open the page, paste a link, keep the video.',
    icon: 'user-x'
  },
  {
    title: 'Fast & free',
    keyword: 'instant video downloader',
    description:
      'Extractions typically finish in one to three seconds, and repeat lookups are served from a 15 minute LRU cache instead of hitting the platform again.',
    icon: 'zap'
  },
  {
    title: 'Multi-platform support',
    keyword: 'all platforms downloader',
    description:
      'Ten networks in one box: YouTube, Shorts, TikTok, Instagram, Facebook, X, Vimeo, Dailymotion, Reddit and Twitch, with new extractors arriving whenever yt-dlp adds them.',
    icon: 'layers'
  }
]

/* -------------------------------------------------------------------------- */
/*                              JSON-LD builders                              */

const PLATFORM_NAMES = PLATFORMS.map((platform) => platform.name)

export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE.name,
    url: `${canonicalOrigin}/`,
    description: SITE.description,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'OnlineVideoDownloader',
    softwareVersion: '1.0.0',
    operatingSystem: 'Any (web browser — Windows, macOS, Linux, Android, iOS)',
    browserRequirements: 'Requires JavaScript and a modern evergreen browser',
    inLanguage: 'English',
    isAccessibleForFree: true,
    featureList: [
      '4K / 2160p Ultra HD video downloads',
      '1080p Full HD and 720p HD MP4',
      'MP3 audio extraction with ID3 tags',
      'TikTok downloads without watermark',
      'Instagram Reels and Facebook video support',
      'No registration or software installation',
      'Works on mobile browsers'
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${canonicalOrigin}/`
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.organization.name,
      url: SITE.organization.url
    },
    screenshot: `${canonicalOrigin}/opengraph-image`,
    sameAs: [],
    relevantSpecialty: PLATFORM_NAMES
  }
}

export function faqPageSchema(items: FaqItem[] = FAQ_ITEMS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: `${canonicalOrigin}/`,
    description: SITE.tagline,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      // The downloader is the search: a pasted link *is* the query.
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${canonicalOrigin}/?url={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: organizationSchema()
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.organization.name,
    url: SITE.organization.url,
    logo: SITE.organization.logo,
    description: `${SITE.name} is a free, ad-light web utility for downloading online video in up to 4K.`
  }
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: `${canonicalOrigin}${entry.path}`
    }))
  }
}

export function howToSchema(steps: HowToStep[] = HOW_TO_STEPS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to download online video in up to 4K with ${SITE.name}`,
    description:
      'Four steps to save a video from YouTube, TikTok, Instagram, Facebook, X, Vimeo or Reddit as MP4 or MP3.',
    totalTime: 'PT1M',
    tool: [
      { '@type': 'HowToTool', name: 'A web browser' },
      { '@type': 'HowToTool', name: 'The share link of the video' }
    ],
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
      url: `${canonicalOrigin}/#step-${index + 1}`
    }))
  }
}

/**
 * Escapes `<`, `>`, `&` and the JS line separators so a video title can never
 * break out of the `<script>` element (Next would otherwise warn about an
 * unsafe HTML payload).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028|\u2029/g, '')
}
