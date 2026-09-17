/**
 * Parsing for yt-dlp's stderr progress lines.
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
 * Only the **percentage** is extracted, and it is never shown to anybody: it
 * exists so the server knows when the source→server fetch has finished, which
 * is what flips the job from `downloading` to `processing` (the ffmpeg
 * merge/transcode) or `streaming` (the final flush to the browser) — see
 * `lib/liveJobs.ts` and `app/api/download/route.ts`.
 *
 * Sizes, speeds and ETAs on those lines are deliberately ignored. Nothing
 * downstream consumes them any more: step 3 (`/download/progress`) renders the
 * selected file plus an indeterminate animation, never transfer telemetry.
 */

export interface YtDlpProgress {
  /** 0–100, or null when the line carried no percentage at all. */
  percent: number | null
}

/**
 * Parses a single stderr line into a percentage, or `null` when the line
 * carries nothing usable (extraction info, warnings, "Destination:", errors…).
 */
export function parseYtDlpProgressLine(line: string): YtDlpProgress | null {
  if (!line.includes('[download]')) return null

  const percentMatch = /(\d+(?:\.\d+)?)\s*%/.exec(line)
  const percent = percentMatch ? Number(percentMatch[1]) : null
  if (percent === null || !Number.isFinite(percent)) return null

  return { percent }
}
