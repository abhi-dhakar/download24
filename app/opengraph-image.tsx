import { ImageResponse } from 'next/og'

import { SITE } from '@/lib/site'

/**
 * Social card, generated at build time (no binary in git).
 *
 * Kept deliberately text-only: it renders deterministically, weighs nothing,
 * and never depends on a remote image that could break the preview.
 */
export const alt =
  'SaveFrom Clone — free online video downloader interface showing 4K, 1080p, 720p and MP3 download options'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PLATFORM_CHIPS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'X / Twitter', 'Vimeo', 'Reddit']
const QUALITY_CHIPS = ['4K UHD', '1080p', '720p', '480p', '360p', 'MP3']

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          backgroundColor: '#05070f',
          backgroundImage:
            'radial-gradient(900px 480px at 12% -10%, rgba(255,106,61,0.34), transparent 62%), radial-gradient(760px 420px at 92% 6%, rgba(34,211,238,0.22), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
          color: '#fff',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: 'linear-gradient(135deg, #ffb03a, #ff6a3d 45%, #ff2f6d)',
              color: '#05070f',
              fontSize: 30,
              fontWeight: 800
            }}
          >
            ↓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{SITE.name}</div>
            <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)' }}>
              free · no registration · no app
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 74, lineHeight: 1.04, fontWeight: 800, letterSpacing: -2 }}>
            Online video downloader
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.72)', maxWidth: 900 }}>
            Paste one link, get every quality — up to 4K Ultra HD MP4 or MP3 audio.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '20px 24px',
              borderRadius: 18,
              border: '2px solid rgba(255,255,255,0.16)',
              backgroundColor: 'rgba(255,255,255,0.05)'
            }}
          >
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)' }}>https://</div>
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.75)' }}>
              youtube.com / tiktok.com / instagram.com/reel
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 12,
                backgroundImage: 'linear-gradient(90deg, #ffb03a, #ff6a3d 50%, #ff2f6d)',
                color: '#05070f',
                fontSize: 20,
                fontWeight: 700
              }}
            >
              Get links
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {QUALITY_CHIPS.map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,176,58,0.16)',
                  border: '1px solid rgba(255,176,58,0.35)',
                  color: '#ffd79a'
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATFORM_CHIPS.map((platform) => (
              <div
                key={platform}
                style={{
                  fontSize: 17,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.62)'
                }}
              >
                {platform}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.42)' }}>15-minute result cache · yt-dlp engine</div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=86400, immutable' } }
  )
}
