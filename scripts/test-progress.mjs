/**
 * Parser assertions for lib/progress.ts.
 * Run: node scripts/test-progress.mjs
 * (Node >= 22.6 strips the TS types on the fly.)
 *
 * The parser extracts the percentage and nothing else: the download route only
 * needs it to threshold a job phase (`downloading` → `processing`/`streaming`).
 * Sizes, speeds and ETAs are not parsed any more, and the last assertion pins
 * that — no transfer telemetry may creep back into the parsed shape.
 */

const { parseYtDlpProgressLine } = await import('../lib/progress.ts')

const cases = [
  ['[download]   0.2% of  585.94KiB at  Unknown B/s ETA Unknown', 0.2],
  ['[download]  46.1% of  585.94KiB at   16.34KiB/s ETA 00:19', 46.1],
  ['[download]  46.1% of ~585.94KiB at   16.34KiB/s ETA 00:19 (frag 3/10)', 46.1],
  ['[download] 100.0% of  585.94KiB at   16.00KiB/s ETA 00:00', 100],
  ['[download] 100% of  585.94KiB in 00:00:37 at 15.83KiB/s', 100],
  ['[download] Destination: -', null],
  ['[download] Resuming download at byte 12345', null],
  ['[info] small: Downloading 1 format(s): mp4', null],
  ['[Merger] Merging formats into "file.mp4"', null]
]

let failed = 0
for (const [line, expectedPercent] of cases) {
  const got = parseYtDlpProgressLine(line)
  if (expectedPercent === null) {
    if (got === null) {
      console.log('ok  ', JSON.stringify(line), '→ null')
    } else {
      failed += 1
      console.log('FAIL', JSON.stringify(line), 'expected null, got', got)
    }
    continue
  }
  if (got?.percent === expectedPercent) {
    console.log('ok  ', JSON.stringify(line), '→', got.percent)
  } else {
    failed += 1
    console.log('FAIL', JSON.stringify(line), '\n  got     ', got, '\n  expected', expectedPercent)
  }
}

/* The parsed shape must stay telemetry-free: percentage only. */
const sample = parseYtDlpProgressLine('[download]  46.1% of  585.94KiB at   16.34KiB/s ETA 00:19')
const keys = Object.keys(sample ?? {}).sort()
if (keys.length === 1 && keys[0] === 'percent') {
  console.log('ok   parsed update carries only `percent` →', JSON.stringify(sample))
} else {
  failed += 1
  console.log('FAIL parsed update leaked transfer telemetry:', JSON.stringify(sample))
}

if (failed > 0) {
  console.error(`${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('all parser assertions passed')
