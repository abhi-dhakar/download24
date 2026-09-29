import { ImageResponse } from 'next/og'

/**
 * Home-screen tile (180×180), generated at build time.
 *
 * Neo-brutalist: cream paper, thick ink frame, sun-yellow plate and the fat
 * download glyph — matching `components/Logo.tsx` and `app/icon.svg`.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff9ec'
        }}
      >
        <div
          style={{
            width: 156,
            height: 156,
            borderRadius: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffd23f',
            border: '7px solid #101010',
            color: '#101010',
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          ↓
        </div>
      </div>
    ),
    size
  )
}
