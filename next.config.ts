import type { NextConfig } from 'next'

/**
 * Security + performance configuration.
 *
 * `serverExternalPackages` keeps `youtube-dl-exec` (and its `tinyspawn`
 * dependency, which spawns the real `yt-dlp` binary) out of the bundler so the
 * child-process plumbing keeps working at runtime.
 */
const isProduction = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        }
      ]
    : [])
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // PostHog's ingestion endpoints end in a slash (`/e/`, `/s/`, `/flags/`).
  // Next would otherwise 308 them slash-less through the `/_d24` proxy
  // (proxy.ts) and the browser SDK would silently drop every event. Pages keep
  // canonical slash-less URLs via `alternates.canonical` + the sitemap.
  skipTrailingSlashRedirect: true,
  // Minimal self-hostable server output (the Dockerfile runs `node server.js`).
  // Opt-in so that a plain `npm run build && npm start` keeps working locally,
  // since `next start` refuses to serve a standalone build.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  images: {
    // Thumbnails are rendered as plain, dimension-locked <img> tags (see
    // ResultCard) because extraction results reference arbitrary, short-lived
    // CDN hosts that no static remotePatterns allowlist could cover safely.
    formats: ['image/avif', 'image/webp']
  },
  serverExternalPackages: ['youtube-dl-exec', 'tinyspawn', 'binary-version-check'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

export default nextConfig
