/**
 * Hand-off between step 2 and step 3 of the three-page download flow.
 *
 * Step 2 (`/download`) stashes a snapshot of the parsed video in
 * `sessionStorage` right before navigating, so step 3 (`/download/progress`)
 * can show the thumbnail / platform / duration without re-parsing. The query
 * string remains the source of truth for *what* to download (`src`, `f`), so a
 * bookmarked or shared progress link still works — it just renders without the
 * snapshot extras.
 */

export interface PendingDownload {
  sourceUrl: string
  title: string
  thumbnail?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  platformId?: string
  platformName?: string
  durationLabel?: string
}

export const PENDING_KEY = 'download24:pending'

export function writePending(snapshot: PendingDownload): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(snapshot))
  } catch {
    /* Private mode / storage disabled — step 3 falls back to query params. */
  }
}

/** Returns the snapshot only when it matches the link being downloaded. */
export function readPending(sourceUrl: string): PendingDownload | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<PendingDownload>
    if (candidate.sourceUrl !== sourceUrl || typeof candidate.title !== 'string') return null
    return candidate as PendingDownload
  } catch {
    return null
  }
}

/** Builds a safe filename for the browser's "save as" dialog. */
export function buildFilename(title: string, ext: string): string {
  const base =
    title
      // Control chars, path separators and anything unfriendly to filesystems.
      .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90)
      .replace(/[. ]+$/, '') || 'download24-video'
  return `${base}.${ext}`
}
