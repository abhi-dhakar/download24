/**
 * SEO-friendly Platform landing page configurations.
 * Each entry provides rich SEO metadata, platform-themed gradients/accents,
 * platform-specific FAQs, features, and how-to guides.
 */

import { PLATFORMS, type PlatformId, type Platform } from './platforms'

export interface PlatformFaq {
  question: string
  answer: string
}

export interface PlatformFeature {
  title: string
  description: string
  icon: string
}

export interface PlatformPageConfig {
  slug: string
  platformId: PlatformId
  title: string
  shortTitle: string
  metaTitle: string
  metaDescription: string
  h1: string
  h1Highlight: string
  subtitle: string
  inputPlaceholder: string
  sampleUrl: string
  theme: {
    primary: string
    secondary?: string
    glowRgb: string
    heroGradient: string
  }
  features: PlatformFeature[]
  faqs: PlatformFaq[]
}

export const PLATFORM_PAGES: Record<string, PlatformPageConfig> = {
  'youtube-video-download': {
    slug: 'youtube-video-download',
    platformId: 'youtube',
    title: 'YouTube Video Downloader',
    shortTitle: 'YouTube',
    metaTitle: 'YouTube Video Downloader — Download 4K, 1080p MP4 & MP3 | download24',
    metaDescription:
      'Download YouTube videos in 4K UHD, 1080p Full HD, 720p or extract MP3 audio at 320kbps. Fast, free, no software or registration required.',
    h1: 'Download YouTube Videos in',
    h1Highlight: '4K UHD & MP3',
    subtitle:
      'Save any YouTube video, documentary, or music clip in crisp 4K, 1080p, 720p MP4 or high-bitrate MP3 audio without apps or accounts.',
    inputPlaceholder: 'Paste YouTube link (e.g., https://www.youtube.com/watch?v=...)',
    sampleUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    theme: {
      primary: '#ff0033',
      secondary: '#cc0029',
      glowRgb: '255, 0, 51',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(255, 0, 51, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'Real 4K Ultra HD & 1080p',
        description:
          'Get the untouched original stream directly from YouTube up to 2160p (4K 60fps) without lossy re-encoding.',
        icon: 'sparkles'
      },
      {
        title: 'Lossless MP3 Audio Extraction',
        description:
          'Convert music tracks, podcasts, and talks into crystal-clear MP3 with complete ID3 artist and song metadata.',
        icon: 'music'
      },
      {
        title: 'Zero Buffering or Speed Caps',
        description:
          'We stream directly from top-speed edge servers, bypassing artificial rate limits and annoying queues.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How to download YouTube videos in 1080p or 4K with audio?',
        answer:
          'Modern YouTube separates 1080p and 4K video from audio into DASH streams. Our server automatically muxes both streams losslessly using ffmpeg so your downloaded MP4 file plays everywhere with flawless sound.'
      },
      {
        question: 'Can I download YouTube videos directly as MP3 audio?',
        answer:
          'Yes. Paste the YouTube URL, and our downloader will display an MP3 option. Clicking it extracts the highest-quality audio stream and delivers an MP3 file with title and thumbnail intact.'
      },
      {
        question: 'Does this YouTube downloader work on mobile phones?',
        answer:
          'Yes, download24 works on all devices including iPhone (Safari), Android (Chrome, Firefox), iPad, Windows, macOS, and Linux without installing any app or APK.'
      }
    ]
  },

  'youtube-shorts-download': {
    slug: 'youtube-shorts-download',
    platformId: 'youtube-shorts',
    title: 'YouTube Shorts Downloader',
    shortTitle: 'Shorts',
    metaTitle: 'YouTube Shorts Downloader — Download Vertical MP4 in 1080p | download24',
    metaDescription:
      'Download YouTube Shorts in high quality 1080p MP4 or audio MP3 instantly. Free online downloader with no watermark or limits.',
    h1: 'Download YouTube Shorts in',
    h1Highlight: '1080p HD MP4',
    subtitle:
      'Fast, free, and watermark-free YouTube Shorts downloader. Paste any shorts link and save full-resolution vertical video in seconds.',
    inputPlaceholder: 'Paste YouTube Shorts link (e.g., https://www.youtube.com/shorts/...)',
    sampleUrl: 'https://www.youtube.com/shorts/eV3y4GvB0Ss',
    theme: {
      primary: '#ff0033',
      secondary: '#ff4d6a',
      glowRgb: '255, 0, 51',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(255, 0, 51, 0.25), transparent 70%)'
    },
    features: [
      {
        title: 'Full 1080p Vertical Resolution',
        description: 'Save crisp 9:16 vertical videos ideal for saving, offline playback, and creative remixing.',
        icon: 'sparkles'
      },
      {
        title: 'Clean Original Audio',
        description: 'Download the backing audio track as a standalone MP3 or keep it muxed in the MP4.',
        icon: 'music'
      },
      {
        title: 'Instant Mobile Share-sheet Friendly',
        description: 'Works with short URLs (youtu.be) copied right from the YouTube mobile app share button.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How do I download YouTube Shorts without an app?',
        answer:
          'In YouTube, tap "Share" on the Shorts video and tap "Copy Link". Paste the link into the box above and click Download to save the vertical MP4 directly to your device.'
      },
      {
        question: 'Are downloaded YouTube Shorts watermarked?',
        answer:
          'No! We fetch the master rendition directly from the CDN so there is no watermark, overlay, or quality compression.'
      }
    ]
  },

  'instagram-video-download': {
    slug: 'instagram-video-download',
    platformId: 'instagram',
    title: 'Instagram Video & Reels Downloader',
    shortTitle: 'Instagram',
    metaTitle: 'Instagram Video Downloader — Save Reels, Stories & Posts in HD | download24',
    metaDescription:
      'Download Instagram Reels, videos, Stories, and IGTV in full 1080p HD MP4. Free online Instagram downloader, no login or app required.',
    h1: 'Download Instagram Reels & Videos in',
    h1Highlight: 'Full HD 1080p',
    subtitle:
      'Save Instagram Reels, IGTV clips, and carousel videos without watermarks or quality degradation. Fast, private, and 100% free.',
    inputPlaceholder: 'Paste Instagram link (e.g., https://www.instagram.com/reel/...)',
    sampleUrl: 'https://www.instagram.com/reel/C7YqTg3JM2s/',
    theme: {
      primary: '#e1306c',
      secondary: '#f7b42c',
      glowRgb: '225, 48, 108',
      heroGradient: 'radial-gradient(45% 45% at 50% 20%, rgba(225, 48, 108, 0.30), rgba(247, 180, 44, 0.15), transparent 70%)'
    },
    features: [
      {
        title: 'Instagram Reels & Stories in HD',
        description: 'Grab full-frame 1080p vertical videos with crystal-clear audio sync.',
        icon: 'sparkles'
      },
      {
        title: 'Extract Reels Audio to MP3',
        description: 'Save trending audio tracks, sounds, and music from any Reel directly as MP3.',
        icon: 'music'
      },
      {
        title: 'No Instagram Login Needed',
        description: 'No password or account required. Paste public Instagram links safely and anonymously.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How do I download an Instagram Reel on iPhone or Android?',
        answer:
          'Open Instagram, tap the three dots or paper airplane icon on the Reel, select "Copy link", paste it into download24, and hit Download. The video will save straight to your Photos or Downloads folder.'
      },
      {
        question: 'Can I download Instagram audio and trending music?',
        answer:
          'Yes! Every Instagram video or Reel provides both an MP4 video download option and an MP3 audio download option.'
      }
    ]
  },

  'tiktok-video-download': {
    slug: 'tiktok-video-download',
    platformId: 'tiktok',
    title: 'TikTok Video Downloader Without Watermark',
    shortTitle: 'TikTok',
    metaTitle: 'TikTok Video Downloader Without Watermark (No Logo) MP4 & MP3 | download24',
    metaDescription:
      'Download TikTok videos without watermark in HD MP4 or extract original MP3 audio. Free, lightning-fast TikTok no-watermark saver.',
    h1: 'Download TikTok Videos',
    h1Highlight: 'Without Watermark',
    subtitle:
      'Save clean TikTok videos with no watermark or logos in original Full HD quality, plus one-tap MP3 sound extraction.',
    inputPlaceholder: 'Paste TikTok link (e.g., https://www.tiktok.com/@user/video/... or vm.tiktok.com)',
    sampleUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
    theme: {
      primary: '#fe2c55',
      secondary: '#25f4ee',
      glowRgb: '254, 44, 85',
      heroGradient: 'radial-gradient(45% 45% at 45% 20%, rgba(254, 44, 85, 0.28), rgba(37, 244, 238, 0.16), transparent 70%)'
    },
    features: [
      {
        title: '100% Watermark Free',
        description: 'Requests the raw master video so no TikTok logo or username overlays are burned into the frame.',
        icon: 'sparkles'
      },
      {
        title: 'Original TikTok Audio (MP3)',
        description: 'Isolate viral sounds and voiceovers in crisp MP3 format with a single click.',
        icon: 'music'
      },
      {
        title: 'Supports Short Links (vm.tiktok.com)',
        description: 'Accepts all TikTok link variations including desktop URLs, app shares, and mobile redirects.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How to download TikTok without watermark on mobile?',
        answer:
          'Tap "Share" on any TikTok video, tap "Copy Link", paste it into download24, and click Download. We extract the original clean stream with zero watermark.'
      },
      {
        question: 'Does this tool save TikTok sounds as MP3?',
        answer:
          'Yes! When you paste a TikTok video, an option for MP3 audio will appear alongside the video options so you can save the soundtrack independently.'
      }
    ]
  },

  'facebook-video-download': {
    slug: 'facebook-video-download',
    platformId: 'facebook',
    title: 'Facebook Video Downloader',
    shortTitle: 'Facebook',
    metaTitle: 'Facebook Video Downloader — Download FB Reels & Videos in 1080p HD | download24',
    metaDescription:
      'Download Facebook videos, FB Watch, and Reels in 1080p/720p HD MP4. Free online Facebook video saver for mobile and desktop.',
    h1: 'Download Facebook Videos & Reels in',
    h1Highlight: '1080p HD Quality',
    subtitle:
      'Save Facebook public videos, Watch clips, and Reels in Full HD MP4 or convert them to MP3. Works smoothly across all browsers.',
    inputPlaceholder: 'Paste Facebook link (e.g., https://www.facebook.com/watch/?v=... or fb.watch)',
    sampleUrl: 'https://www.facebook.com/facebook/videos/10155707263041729/',
    theme: {
      primary: '#1877f2',
      secondary: '#0b56b3',
      glowRgb: '24, 119, 242',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(24, 119, 242, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'HD & SD Quality Selection',
        description: 'Choose between high-definition 1080p/720p or data-saving SD formats.',
        icon: 'sparkles'
      },
      {
        title: 'FB Reels & Watch Support',
        description: 'Download both short-form Reels and long-form Facebook Watch broadcasts.',
        icon: 'music'
      },
      {
        title: 'Secure & Private',
        description: 'We never log or save your downloads or personal data. No Facebook credentials required.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How do I download Facebook videos to my phone?',
        answer:
          'Click the share button on the Facebook post, choose "Copy link", paste the URL on download24, and hit Download to save the MP4 directly to your device.'
      },
      {
        question: 'Can I download Facebook Reels?',
        answer:
          'Yes, our engine fully supports Facebook Reels and Facebook Watch links, extracting the best available resolution.'
      }
    ]
  },

  'twitter-video-download': {
    slug: 'twitter-video-download',
    platformId: 'x',
    title: 'Twitter / X Video Downloader',
    shortTitle: 'X / Twitter',
    metaTitle: 'Twitter / X Video Downloader — Download X Videos & GIFs in HD MP4 | download24',
    metaDescription:
      'Download videos and GIFs from Twitter / X in 1080p, 720p HD MP4. Fast, online X video downloader with no registration.',
    h1: 'Download Twitter / X Videos & GIFs in',
    h1Highlight: 'High Definition',
    subtitle:
      'Save clips, news footage, memes, and GIFs from Twitter / X as clean MP4 files without watermarks or compression artifacts.',
    inputPlaceholder: 'Paste X / Twitter link (e.g., https://x.com/user/status/...)',
    sampleUrl: 'https://x.com/SpaceX/status/1410624005669765122',
    theme: {
      primary: '#e7e9ea',
      secondary: '#71767b',
      glowRgb: '231, 233, 234',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(255, 255, 255, 0.18), transparent 70%)'
    },
    features: [
      {
        title: 'Twitter GIFs Converted to MP4',
        description: 'Download animated Twitter GIFs as standard playable MP4 loops.',
        icon: 'sparkles'
      },
      {
        title: 'Original Source Bitrates',
        description: 'Pulls the highest bitrate video stream published by the author.',
        icon: 'music'
      },
      {
        title: 'x.com & twitter.com Compatible',
        description: 'Accepts both new x.com URLs and legacy twitter.com status links.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How to save a video from X / Twitter?',
        answer:
          'Tap the Share icon on the tweet/post, copy the link, paste it into download24, and select your preferred quality to save.'
      },
      {
        question: 'Can I download Twitter videos as MP3 audio?',
        answer:
          'Yes! download24 gives you the option to extract the audio track as an MP3 file.'
      }
    ]
  },

  'vimeo-video-download': {
    slug: 'vimeo-video-download',
    platformId: 'vimeo',
    title: 'Vimeo Video Downloader',
    shortTitle: 'Vimeo',
    metaTitle: 'Vimeo Video Downloader — Download 4K & 1080p HD Videos | download24',
    metaDescription:
      'Download high quality Vimeo videos in 4K UHD, 1080p, and 720p MP4. Free online tool for filmmakers and creators.',
    h1: 'Download Vimeo Videos in',
    h1Highlight: '4K & 1080p Full HD',
    subtitle:
      'Save cinema-grade Vimeo videos in up to 4K Ultra HD. Enjoy uncompressed visual fidelity and original audio quality.',
    inputPlaceholder: 'Paste Vimeo link (e.g., https://vimeo.com/...)',
    sampleUrl: 'https://vimeo.com/76979871',
    theme: {
      primary: '#1ab7ea',
      secondary: '#0088cc',
      glowRgb: '26, 183, 234',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(26, 183, 234, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'Pristine 4K UHD Renditions',
        description: 'Ideal for filmmakers and portfolios wanting master quality video downloads.',
        icon: 'sparkles'
      },
      {
        title: 'Password-Protected Embeds',
        description: 'Works with direct player URLs when you have viewing access.',
        icon: 'music'
      },
      {
        title: 'Zero Recompression',
        description: 'Direct CDN streams preserve creator-grade colour grading and bitrate.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'Can I download 4K videos from Vimeo?',
        answer:
          'Yes! If the creator uploaded a 4K file, download24 will offer the 2160p stream for download.'
      }
    ]
  },

  'dailymotion-video-download': {
    slug: 'dailymotion-video-download',
    platformId: 'dailymotion',
    title: 'Dailymotion Video Downloader',
    shortTitle: 'Dailymotion',
    metaTitle: 'Dailymotion Video Downloader — Download HD MP4 & MP3 | download24',
    metaDescription:
      'Download Dailymotion videos in 1080p, 720p HD MP4 or extract MP3 audio. Free, fast and easy online downloader.',
    h1: 'Download Dailymotion Videos in',
    h1Highlight: '1080p HD & MP3',
    subtitle:
      'Save full news episodes, sports highlights, and music videos from Dailymotion in HD MP4 or MP3 audio.',
    inputPlaceholder: 'Paste Dailymotion link (e.g., https://www.dailymotion.com/video/...)',
    sampleUrl: 'https://www.dailymotion.com/video/x2t9xzx',
    theme: {
      primary: '#0b6dc1',
      secondary: '#005299',
      glowRgb: '11, 109, 193',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(11, 109, 193, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'Full 1080p High Definition',
        description: 'Streamlined downloads for TV episodes, highlights, and viral broadcasts.',
        icon: 'sparkles'
      },
      {
        title: 'High-Bitrate MP3 Audio',
        description: 'Extract soundtracks, talk shows, and podcasts into standard MP3.',
        icon: 'music'
      },
      {
        title: 'Fast Short-Link Support (dai.ly)',
        description: 'Easily parses shortened Dailymotion share links from mobile apps.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How to save Dailymotion clips on Android or iOS?',
        answer:
          'Copy the video URL from Dailymotion, paste it into download24, and select the quality you want to save.'
      }
    ]
  },

  'reddit-video-download': {
    slug: 'reddit-video-download',
    platformId: 'reddit',
    title: 'Reddit Video Downloader With Audio',
    shortTitle: 'Reddit',
    metaTitle: 'Reddit Video Downloader With Audio — Save Reddit Videos MP4 | download24',
    metaDescription:
      'Download Reddit videos with sound in HD MP4. Fix muted Reddit downloads easily with our free online video saver.',
    h1: 'Download Reddit Videos with',
    h1Highlight: 'Full Audio & Sound',
    subtitle:
      'Reddit serves video and audio separately. Our engine automatically merges sound into a single complete MP4 file.',
    inputPlaceholder: 'Paste Reddit link (e.g., https://www.reddit.com/r/... or redd.it)',
    sampleUrl: 'https://www.reddit.com/r/videos/comments/1ehq0zj/',
    theme: {
      primary: '#ff4500',
      secondary: '#cc3700',
      glowRgb: '255, 69, 0',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(255, 69, 0, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'Guaranteed Sound Sync',
        description: 'Solves the classic muted Reddit video bug by merging DASH audio on our server.',
        icon: 'sparkles'
      },
      {
        title: 'Supports Old & New Reddit',
        description: 'Paste links from old.reddit.com, new reddit, or the mobile app redd.it shares.',
        icon: 'music'
      },
      {
        title: 'Direct MP4 File Output',
        description: 'No weird formats or external players needed — plays smoothly everywhere.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'Why do Reddit videos normally download without sound?',
        answer:
          'Reddit stores video and audio as two separate streams. Standard downloaders only fetch the video stream, resulting in muted playback. download24 combines both streams automatically using ffmpeg.'
      }
    ]
  },

  'twitch-clip-download': {
    slug: 'twitch-clip-download',
    platformId: 'twitch',
    title: 'Twitch Clip Downloader',
    shortTitle: 'Twitch',
    metaTitle: 'Twitch Clip Downloader — Download 1080p60 Twitch Clips & VODs | download24',
    metaDescription:
      'Download Twitch clips and highlights in up to 1080p 60fps source quality MP4. Fast, free Twitch downloader for gamers.',
    h1: 'Download Twitch Clips in',
    h1Highlight: '1080p 60FPS Source Quality',
    subtitle:
      'Save your favorite Twitch moments, gaming highlights, and creator clips in original 60fps high framerate MP4.',
    inputPlaceholder: 'Paste Twitch clip link (e.g., https://clips.twitch.tv/...)',
    sampleUrl: 'https://clips.twitch.tv/SpicyGracefulRamenPeteZahHuh',
    theme: {
      primary: '#9146ff',
      secondary: '#772ce8',
      glowRgb: '145, 70, 255',
      heroGradient: 'radial-gradient(40% 40% at 50% 20%, rgba(145, 70, 255, 0.28), transparent 70%)'
    },
    features: [
      {
        title: 'Smooth 60 FPS Source Quality',
        description: 'Preserves the high frame rates essential for fast-paced gaming clips and tournament plays.',
        icon: 'sparkles'
      },
      {
        title: 'Clips & Broadcast Highlights',
        description: 'Download clips directly by URL or save broadcast highlight segments.',
        icon: 'music'
      },
      {
        title: 'No Twitch Account Required',
        description: 'Paste any public clip URL and download without linking your Twitch profile.',
        icon: 'zap'
      }
    ],
    faqs: [
      {
        question: 'How do I download a clip from Twitch?',
        answer:
          'Click the share button on the Twitch clip, copy the link, paste it into download24, and click Download to save the 60fps MP4.'
      }
    ]
  }
}

/** Helper to get page config by slug */
export function getPlatformPageBySlug(slug: string): PlatformPageConfig | undefined {
  return PLATFORM_PAGES[slug]
}

/** Helper to find the slug for a given platform ID */
export function getSlugForPlatformId(platformId: PlatformId): string | undefined {
  for (const page of Object.values(PLATFORM_PAGES)) {
    if (page.platformId === platformId) return page.slug
  }
  return undefined
}
