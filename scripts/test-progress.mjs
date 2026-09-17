/**
 * Parser assertions for lib/progress.ts.
 * Run: node scripts/test-progress.mjs
 * (Node >= 22.6 strips the TS types on the fly.)
 */

const { parseYtDlpProgressLine, parseYtDlpSize } = await import('../lib/progress.ts')

const cases = [
  ['[download]   0.2% of  585.94KiB at  Unknown B/s ETA Unknown', { percent: 0.2, total: 600003, speed: null }],
  ['[download]  46.1% of  585.94KiB at   16.34KiB/s ETA 00:19', { percent: 46.1, total: 600003, speed: Math.round(16.34 * 1024) }],
  ['[download]  46.1% of ~585.94KiB at   16.34KiB/s ETA 00:19 (frag 3/10)', { percent: 46.1, total: 600003, speed: Math.round(16.34 * 1024) }],
  ['[download] 100.0% of  585.94KiB at   16.00KiB/s ETA 00:00', { percent: 100, total: 600003, speed: 16384 }],
  ['[download] 100% of  585.94KiB in 00:00:37 at 15.83KiB/s', { percent: 100, total: 600003, speed: Math.round(15.83 * 1024) }],
  ['[download] Destination: -', null],
  ['[download] Resuming download at byte 12345', null],
  ['[info] small: Downloading 1 format(s): mp4', null],
  ['[Merger] Merging formats into "file.mp4"', null]
]

let failed = 0
for (const [line, expected] of cases) {
  const got = parseYtDlpProgressLine(line)
  if (expected === null) {
    if (got === null) {
      console.log('ok  ', JSON.stringify(line), '→ null')
    } else {
      failed += 1
      console.log('FAIL', JSON.stringify(line), 'expected null, got', got)
    }
    continue
  }
  const oks = [
    got?.percent === expected.percent,
    got?.totalBytes === expected.total,
    got?.speedBytesPerSec === expected.speed
  ]
  if (oks.every(Boolean)) {
    console.log('ok  ', JSON.stringify(line))
  } else {
    failed += 1
    console.log('FAIL', JSON.stringify(line), '\n  got     ', got, '\n  expected', expected)
  }
}

const sizes = [
  ['585.94KiB', 600003],
  ['1.00GiB', 1073741824],
  ['Unknown', null],
  ['', null]
]
for (const [input, expectedBytes] of sizes) {
  const got = parseYtDlpSize(input)
  if (got === expectedBytes) console.log('ok  size', JSON.stringify(input), '→', got)
  else {
    failed += 1
    console.log('FAIL size', JSON.stringify(input), 'got', got, 'expected', expectedBytes)
  }
}

if (failed > 0) {
  console.error(`${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('all parser assertions passed')
