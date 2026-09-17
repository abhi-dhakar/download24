import type { MetadataRoute } from 'next'

import { canonicalOrigin, isProductionSite } from '@/lib/site'

/**
 * Dynamic robots file (`/robots.txt`).
 *
 * The API is crawlable-proof but deliberately blocked: `/api/parse` spawns an
 * extractor per miss, so a crawler walking it would be pure self-inflicted DoS.
 * On non-production hosts the whole site is disallowed and the sitemap is
 * omitted, so a preview deploy can never leak into the index.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  if (!isProductionSite) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: undefined,
      host: canonicalOrigin
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
          disallow: ['/api/', '/api/parse', '/api/download', '/admin', '/?url=', '/?refresh=1'],
        crawlDelay: 1
      },
      // Download endpoints are heavy by nature; keep the aggressive fetchers away.
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'AhrefsBot', disallow: '/' },
      { userAgent: 'DotBot', disallow: '/' },
      { userAgent: 'MJ12bot', disallow: '/' }
    ],
    sitemap: `${canonicalOrigin}/sitemap.xml`,
    host: canonicalOrigin.replace(/^https?:\/\//, '')
  }
}
