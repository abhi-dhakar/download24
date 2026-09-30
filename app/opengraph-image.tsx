import { ImageResponse } from 'next/og'

import { SITE } from '@/lib/site'

/**
 * Social card, generated at build time (no binary in git).
 *
 * Neo-brutalist redesign: cream paper, hard ink borders, offset black shadows,
 * candy chips and the fat download mark — so a shared link looks like the site.
 * Kept deliberately text-only: it renders deterministically, weighs nothing,
 * and never depends on a remote image that could break the preview.
 */
export const alt =
  'download24 — free online video downloader showing 4K, 1080p, 720p and MP3 download options'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#101010'
const PAPER = '#fff9ec'

const PLATFORM_CHIPS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'X / Twitter', 'Vimeo', 'Reddit']
const QUALITY_CHIPS = ['4K UHD', '1080p', '720p', '480p', '360p', 'MP3']

const QUALITY_TONES = ['#ffd23f', '#b9f24a', '#35d6e8', '#ff5ca8', '#7c5cff', '#ff8a3d']

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
          padding: 56,
          backgroundColor: PAPER,
          backgroundImage:
            'radial-gradient(rgba(16,16,16,0.16) 2px, transparent 2px), radial-gradient(900px 480px at 6% -10%, rgba(255,210,63,0.55), transparent 62%), radial-gradient(760px 420px at 96% 4%, rgba(255,92,168,0.40), transparent 60%)',
          backgroundSize: '22px 22px, auto, auto',
          color: INK,
          fontFamily: 'sans-serif'
        }}
      >
        {/* ------------------------------------------------------------ brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffd23f',
              border: `4px solid ${INK}`,
              boxShadow: `6px 6px 0 0 ${INK}`,
              color: INK,
              fontSize: 36,
              fontWeight: 800
            }}
          >
            ↓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 2,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: -0.5
              }}
            >
              {SITE.name}
              <span style={{ fontSize: 20, fontWeight: 700, opacity: 0.5 }}>.in</span>
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                opacity: 0.6
              }}
            >
              free · no signup · no app
            </div>
          </div>

          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              padding: '10px 20px',
              borderRadius: 999,
              backgroundColor: '#b9f24a',
              border: `4px solid ${INK}`,
              fontSize: 20,
              fontWeight: 800,
              textTransform: 'uppercase'
            }}
          >
            4K · MP3
          </div>
        </div>

        {/* ----------------------------------------------------------- claim */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 74,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: -2.5,
              textTransform: 'uppercase'
            }}
          >
            <div>Online video</div>
            <div>downloader</div>
          </div>
          <div style={{ fontSize: 27, fontWeight: 600, opacity: 0.78, maxWidth: 940 }}>
            Paste one link, get every quality — up to 4K Ultra HD MP4 or MP3 audio, without a watermark.
          </div>

          {/* fake input plate */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 22px',
              borderRadius: 20,
              border: `4px solid ${INK}`,
              backgroundColor: '#ffffff',
              boxShadow: `8px 8px 0 0 ${INK}`,
              marginTop: 6
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.45 }}>https://</div>
            <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.75 }}>
              youtube.com / tiktok.com / instagram.com/reel
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                padding: '12px 24px',
                borderRadius: 12,
                backgroundColor: '#2f5bff',
                border: `4px solid ${INK}`,
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 800,
                textTransform: 'uppercase'
              }}
            >
              Download
            </div>
          </div>

          {/* quality chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {QUALITY_CHIPS.map((chip, index) => (
              <div
                key={chip}
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  padding: '8px 18px',
                  borderRadius: 999,
                  backgroundColor: QUALITY_TONES[index % QUALITY_TONES.length],
                  border: `4px solid ${INK}`,
                  color: INK
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------------- footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATFORM_CHIPS.map((platform) => (
              <div
                key={platform}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: `3px solid ${INK}`,
                  backgroundColor: '#ffffff',
                  color: INK
                }}
              >
                {platform}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.55 }}>
            15-minute result cache · yt-dlp engine
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=86400, immutable' } }
  )
}
