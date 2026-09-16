import { ImageResponse } from 'next/og'

/** Home-screen tile (180×180), generated at build time. */
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
          backgroundColor: '#05070f'
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundImage: 'linear-gradient(140deg, #38bdf8, #0284c7 45%, #2563eb)',
            color: '#ffffff'
          }}
        >
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1 }}>↓</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>4K·MP3</div>
        </div>
      </div>
    ),
    size
  )
}
