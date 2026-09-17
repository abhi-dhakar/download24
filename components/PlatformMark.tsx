/**
 * Inline brand marks.
 *
 * They are hand-written SVG rather than fetched image assets so that
 *  - nothing third-party has to load (protects LCP and keeps CLS at 0),
 *  - the icons inherit the accent colour of each network,
 *  - and no trademarked bitmap is shipped inside the repository.
 */

import { getPlatform } from '@/lib/platforms'

export type MarkId =
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
  | 'terabox'
  | 'generic'

interface Props {
  id: string
  className?: string
  /** Renders the glyph in the brand colour instead of `currentColor`. */
  branded?: boolean
  title?: string
}

export function PlatformMark({ id, className = 'h-6 w-6', branded = true, title }: Props) {
  const platform = getPlatform(id)
  const accent = branded ? (platform?.accent ?? '#0284c7') : 'currentColor'

  const common = {
    viewBox: '0 0 24 24',
    className,
    'aria-hidden': title ? undefined : true,
    role: title ? ('img' as const) : undefined,
    focusable: 'false' as const
  }

  switch (id as MarkId) {
    case 'youtube':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill={accent} />
          <path d="M10.2 8.6 16 12l-5.8 3.4z" fill="#fff" />
        </svg>
      )
    case 'youtube-shorts':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="4.5" y="1.5" width="15" height="21" rx="5" fill={accent} />
          <path d="M10.6 8 16 12l-5.4 4z" fill="#fff" />
          <rect x="2" y="8.5" width="2.6" height="7" rx="1.3" fill={accent} opacity="0.55" />
          <rect x="19.4" y="8.5" width="2.6" height="7" rx="1.3" fill={accent} opacity="0.55" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <defs>
            <linearGradient id="ig-glow" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f7b42c" />
              <stop offset="0.45" stopColor={accent} />
              <stop offset="1" stopColor="#5b51d8" />
            </linearGradient>
          </defs>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.6" fill="url(#ig-glow)" />
          <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="16.6" cy="7.4" r="1.15" fill="#fff" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path
            d="M13.6 2h2.9a5.1 5.1 0 0 0 4.6 4.6v2.9a7.9 7.9 0 0 1-4.6-1.6v6.3a6.2 6.2 0 1 1-6.2-6.2c.3 0 .6 0 .9.1v3a3.2 3.2 0 1 0 2.4 3.1V2z"
            fill={platform?.accentAlt ?? accent}
            transform="translate(-1.1 -0.6)"
          />
          <path
            d="M13.6 2h2.9a5.1 5.1 0 0 0 4.6 4.6v2.9a7.9 7.9 0 0 1-4.6-1.6v6.3a6.2 6.2 0 1 1-6.2-6.2c.3 0 .6 0 .9.1v3a3.2 3.2 0 1 0 2.4 3.1V2z"
            fill={accent}
            transform="translate(0.9 0.7)"
          />
          <path
            d="M13.6 2h2.9a5.1 5.1 0 0 0 4.6 4.6v2.9a7.9 7.9 0 0 1-4.6-1.6v6.3a6.2 6.2 0 1 1-6.2-6.2c.3 0 .6 0 .9.1v3a3.2 3.2 0 1 0 2.4 3.1V2z"
            fill="#f6f7fb"
          />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="10" fill={accent} />
          <path
            d="M15.6 7.6h-1.9c-1.2 0-1.8.7-1.8 1.9v1.6h3.5l-.5 3.4h-3v7.4h-3.3v-7.4H6v-3.4h2.6V9.2a4.4 4.4 0 0 1 4.7-4.2h2.3z"
            fill="#fff"
          />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#0b0b0d" stroke={accent} strokeWidth="0.8" />
          <path
            d="M5.6 4.8h3.9l3.4 4.7 4-4.7h3.1l-5.9 6.7 6.3 8h-3.9l-3.7-4.8-4 4.8H5.7l6.2-7.2z"
            fill={accent}
            transform="translate(0 0.4) scale(0.9)"
          />
        </svg>
      )
    case 'vimeo':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="1.5" y="3.5" width="21" height="17" rx="4" fill="#101a24" stroke={accent} strokeWidth="0.8" />
          <path
            d="M5.6 9.4c1.4-1.3 2.7-2 3.5-1.3.8.8.7 2.1 1.3 4 .6 1.9 1 2.9 1.7 2.9.7 0 1.8-1.5 2.7-3.4.9-1.9-.2-3-2-2.4 1-3.3 4.3-4.8 6.5-3.8 2.2 1 2 3.9.2 7-1.9 3.2-4.3 5.9-6.7 6.9-2.4.9-3.7-1.5-4.6-4-.5-1.5-1-3-1.4-4-.5-1-1.1-.3-2 .2z"
            fill={accent}
          />
        </svg>
      )
    case 'dailymotion':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="11" cy="12" r="9" fill={accent} />
          <path d="M9.6 7.4h3.9c2.7 0 4.5 1.9 4.5 4.6s-1.9 4.6-4.7 4.6H9.6z" fill="#f4f7fb" />
          <circle cx="19" cy="18.4" r="2.1" fill={accent} />
        </svg>
      )
    case 'reddit':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="18.6" cy="8.4" r="1.7" fill={accent} />
          <circle cx="5.4" cy="8.4" r="1.7" fill={accent} />
          <path
            d="M21.5 12.2a2.5 2.5 0 0 0-4.2-1.9 9.4 9.4 0 0 0-4.1-1.1l.8-3.6 2.9.6a1.8 1.8 0 1 0 .3-1.3l-3.4-.7a.7.7 0 0 0-.8.5l-.9 4a9.4 9.4 0 0 0-4.2 1.2 2.5 2.5 0 1 0-2.7 4.1 4.2 4.2 0 0 0 0 .7c0 3 3.8 5.3 8.4 5.3s8.4-2.3 8.4-5.3a4.2 4.2 0 0 0 0-.7 2.5 2.5 0 0 0 1.2-1.8z"
            fill={accent}
          />
          <circle cx="9.3" cy="14.4" r="1.35" fill="#0b0b0d" />
          <circle cx="14.7" cy="14.4" r="1.35" fill="#0b0b0d" />
          <path d="M9.2 17.4c1.7 1.1 3.9 1.1 5.6 0" stroke="#0b0b0d" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'twitch':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path
            d="M4.6 2.4 2.4 7v12.2h4.3v3.1h3.1l3.1-3.1h3.6L21.6 14V2.4zm14.6 10.6-2.6 2.6h-4.1l-2.6 2.6v-2.6H7.1V5h12.1z"
            fill={accent}
          />
          <path d="M13.6 7.6h1.5v4.6h-1.5zm4.1 0h1.5v4.6h-1.5z" fill={accent} />
        </svg>
      )
    case 'terabox':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <defs>
            <linearGradient id="tb-glow" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={accent} />
              <stop offset="1" stopColor={platform?.accentAlt ?? '#7cc4ff'} />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#tb-glow)" />
          <path
            d="M12 6.6a4.3 4.3 0 0 0-4.15 3.14A3 3 0 0 0 8.5 15.8h7a2.85 2.85 0 0 0 .3-5.68A4.3 4.3 0 0 0 12 6.6z"
            fill="#ffffff"
          />
          <path
            d="M12 9.4v3.1m0 0-1.5-1.5M12 12.5l1.5-1.5"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )
    case 'generic':
    default:
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <rect x="2" y="4" width="20" height="14" rx="3.5" fill="none" stroke={accent} strokeWidth="1.6" />
          <path d="M10 8.8 14.4 11 10 13.2z" fill={accent} />
          <path d="M8 21h8" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
  }
}
