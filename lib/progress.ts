/**
 * Shared parsing for yt-dlp progress reporting.
 *
 * When a file is piped (`-o -`) **without** `--quiet`, yt-dlp automatically
 * sends its human log to stderr (its `logtostderr` switch flips on when the
 * output template is `-`) and, with `--newline`, writes one progress update
 * per line instead of a `\r` spinner over the raw bytes on stdout:
 *
 *   [download]   46.1% of  585.94KiB at   16.34KiB/s ETA 00:19
 *   [download]   46.1% of ~585.94KiB at   16.34KiB/s ETA 00:19 (frag 3/10)
 *   [download] 100.0% of  585.94KiB at   16.00KiB/s ETA 00:00
 *   [download] 100% of  585.94KiB in 00:00:37 at 15.83KiB/s
 *
 * The raw media bytes go to stdout untouched; these stderr lines are the only
 * signal that lets the server (and through it the UI) report a genuine
 * percentage while the bytes are still flowing.
 */

export interface YtDlpProgress {
  /** 0–100, or null when the downloader could not compute one. */
  percent: number | null
  /** Exact/estimated total size in bytes, or null when unknown. */
  totalBytes: number | null
  /** Instantaneous transfer rate in bytes/second, or null. */
  speedBytesPerSec: number | null
}

const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
  PB: 1024 ** 5,
  KIB: 1024,
  MIB: 1024 ** 2,
  GIB: 1024 ** 3,
  TIB: 1024 ** 4,
  PIB: 1024 ** 5
}

/** Parses a size like `585.94KiB`, `~1.2GiB` or `Unknown` into bytes. */
export function parseYtDlpSize(text: string | undefined | null): number | null {
  if (!text) return null
  const match = /(\d+(?:\.\d+)?)\s*([KMGTP]?i?B)/i.exec(text.trim())
  if (!match) return null
  const value = Number(match[1])
  const unit = SIZE_UNITS[match[2].toUpperCase()]
  if (!Number.isFinite(value) || !unit) return null
  return Math.round(value * unit)
}

/**
 * Parses a single stderr line into a progress update, or `null` when the line
 * carries nothing usable (extraction info, warnings, "Destination:", errors…).
 */
export function parseYtDlpProgressLine(line: string): YtDlpProgress | null {
  if (!line.includes('[download]')) return null

  const percentMatch = /(\d+(?:\.\d+)?)\s*%/.exec(line)
  const percent = percentMatch ? Number(percentMatch[1]) : null

  // Total: the size right after `of ` (progress lines and the 100% summary).
  const totalMatch = /(?:^|[^a-z])of\s*~?\s*(\d+(?:\.\d+)?)\s*([KMGTP]?i?B)/i.exec(line)
  const totalBytes = totalMatch ? parseYtDlpSize(`${totalMatch[1]}${totalMatch[2]}`) : null

  // Speed: the value immediately before `/s` in the `at …/s` tail.
  const speedMatch = /at\s*(\d+(?:\.\d+)?\s*[KMGTP]?i?B)\/s/i.exec(line)
  const speedBytesPerSec = speedMatch ? parseYtDlpSize(speedMatch[1]) : null

  if (percent === null && totalBytes === null && speedBytesPerSec === null) return null

  return {
    percent: percent !== null && Number.isFinite(percent) ? percent : null,
    totalBytes,
    speedBytesPerSec
  }
}
