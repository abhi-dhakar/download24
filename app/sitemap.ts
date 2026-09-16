import type { MetadataRoute } from 'next'

import { canonicalOrigin, isProductionSite } from '@/lib/site'

/**
 * Dynamic sitemap (`/sitemap.xml`).
 *
 * The home page is the commercial landing page and gets `hourly` because the
 * copy around supported formats changes as the extractor list grows; the legal
 * pages are effectively static. Every entry carries an explicit absolute URL and
 * language alternates so the file is valid for Google Search Console.
 */
export const dynamic = 'force-static'

interface SitemapRoute {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const ROUTES: SitemapRoute[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 }
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // Never advertise a preview/staging host to crawlers.
  if (!isProductionSite) return []

  return ROUTES.map((route) => ({
    url: `${canonicalOrigin}${route.path === '/' ? '/' : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: {
      languages: {
        'x-default': `${canonicalOrigin}${route.path === '/' ? '/' : route.path}`,
        en: `${canonicalOrigin}${route.path === '/' ? '/' : route.path}`
      }
    }
  }))
}
