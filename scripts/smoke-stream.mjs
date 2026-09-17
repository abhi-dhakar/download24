/**
 * End-to-end smoke test for the realtime-progress pipeline, runnable without
 * YouTube/ffmpeg. It uses the toy "slow HTTP server" (scripts/serve.py style,
 * e.g. `python3 -m http.server` replaced by a throttled file server on
 * 127.0.0.1:8998) as the media source and drives the *production* code path:
 *
 *   buildDownloadArgs  → startStreamJob (--newline, --no-quiet) / prepareFile
 *   → onProgress       → parseYtDlpProgressLine (lib/progress.ts)
 *   → updateLiveJob    → finishLiveJob (lib/liveJobs.ts)
 *
 * Assertions:
 *   1. the pipe path streams the exact file bytes and reports a monotonically
 *      increasing 0→100% with a real total size and speed before completion;
 *   2. the prepare (disk file) path reports the same parsed totals on stdout;
 *   3. the live-job registry ends in `finished` with the right file name.
 *
 * Usage: node scripts/smoke-stream.mjs [http://127.0.0.1:8998/c.mp4]
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const toyUrl = process.argv[2] ?? 'http://127.0.0.1:8998/c.ogg'
const ytdlpPath = process.env.YTDL_PATH ?? `${process.env.HOME}/.local/bin/yt-dlp`
process.env.YTDL_PATH = ytdlpPath

const jiti = createJiti(`${root}/tsconfig.json`, { interopDefault: true })
const { buildDownloadArgs, startStreamJob, prepareFile, canPipeDirectly } = await jiti.import('./lib/ytdlp.ts')
const { registerLiveJob, readLiveJob, finishLiveJob, updateLiveJob } = await jiti.import('./lib/liveJobs.ts')
const { parseYtDlpProgressLine } = await jiti.import('./lib/progress.ts')

let failures = 0
const check = (cond, label, extra = '') => {
  if (cond) console.log('ok  ', label)
  else {
    failures += 1
    console.log('FAIL', label, extra)
  }
}

/** A muxed single-stream 720p MP4 option (pipes straight through, no ffmpeg). */
const option = {
  id: 0,
  label: '720p',
  tier: 'hd',
  height: 720,
  streamHeight: 720,
  ext: 'mp4',
  kind: 'video',
  muxed: true,
  needsMerge: false,
  formatIds: ['22'],
  tags: [],
  sizeLabel: '585.94KiB'
}

const args = buildDownloadArgs({
  url: toyUrl,
  option,
  output: '-',
  quiet: false,
  firstEntryOnly: false
})
console.log('download args:', JSON.stringify(args))
check(args.includes('--newline'), 'passes --newline', args.join(' '))
check(args.includes('--no-quiet'), 'passes --no-quiet (not --quiet)', args.join(' '))
check(!args.includes('--quiet'), 'does not pass --quiet', args.join(' '))
check(canPipeDirectly(option), 'option is pipeable (muxed, no merge)')

const jobId = registerLiveJob('smoke-' + Date.now().toString(36))
const jobId2 = registerLiveJob('smoke2-' + Date.now().toString(36))

const percentSnapshots = []
const totalSnapshots = new Set()
let sawSpeed = false

const absorb = (job) => (line) => {
  const update = parseYtDlpProgressLine(line)
  if (!update) return
  updateLiveJob(job, {
    phase: update.percent !== null && update.percent >= 99.5 ? 'downloading' : 'streaming',
    percent: update.percent ?? undefined,
    totalBytes: update.totalBytes ?? undefined,
    speedBytesPerSec: update.speedBytesPerSec ?? undefined
  })
  if (update.percent !== null) percentSnapshots.push(update.percent)
  if (update.totalBytes !== null) totalSnapshots.add(update.totalBytes)
  if (update.speedBytesPerSec) sawSpeed = true
}

/* ------------------------------------------------------------------ path A */
console.log('\n--- Path A: pipe the file through stdout ---')
const job = startStreamJob(toyUrl, option, { timeoutMs: 90_000, firstEntryOnly: false })
job.onProgress(absorb(jobId))

let bytes = 0
let exitCode = null
let stderrDuringRun = []
job.child.stderr.on('data', (c) => stderrDuringRun.push(String(c)))
await new Promise((resolve, reject) => {
  job.child.stdout.on('data', (chunk) => {
    bytes += chunk.length
  })
  job.child.on('error', reject)
  job.child.on('close', (code) => {
    exitCode = code
    resolve()
  })
})

const cleanExit = exitCode === 0
if (cleanExit) finishLiveJob(jobId, 'sample.mp4')
check(cleanExit, `yt-dlp exited 0 (got ${exitCode})`)
// The toy server serves a 600000-byte file; yt-dlp *displays* it as the
// rounded "585.94KiB", so the parsed totalBytes (~600003) is a display
// approximation of the real size — we assert both here.
check(bytes === 600000, `streamed all file bytes (${bytes} === 600000)`, `bytes=${bytes}`)

const peaks = percentSnapshots.map((p) => p).filter((p, i, a) => a.indexOf(p) === i)
console.log(`  distinct percent values seen: ${peaks.length}  →`, peaks.slice(0, 12), peaks.length > 12 ? `… +${peaks.length - 12}` : '')
check(percentSnapshots.some((p) => p > 0 && p < 60), 'saw an *early* percent (<60%) before completion')
check(percentSnapshots.some((p) => p >= 99), 'saw a 100% (done) line')
check(totalSnapshots.has(600003), 'reported totalBytes = 600003 (parsed 585.94KiB)', `totals=${[...totalSnapshots].join(',')}`)
check(sawSpeed, 'reported a non-zero speedBytesPerSec')

// Monotonicity over the *first* N (frag retries can bounce; compare running max)
let runningMax = -1
let monotonic = true
for (const p of percentSnapshots) {
  if (p < runningMax - 0.5) monotonic = false
  runningMax = Math.max(runningMax, p)
}
check(monotonic, 'percent increased without falling')

const finalJob = readLiveJob(jobId)
console.log('  final job state:', JSON.stringify(finalJob))
check(finalJob?.phase === 'finished', 'live job ended in `finished`')
check(finalJob?.percent === 100, 'live job percent is 100')
check(finalJob?.fileName === 'sample.mp4', 'live job carries the file name')

/* ------------------------------------------------------------------ path B */
console.log('\n--- Path B: prepare a file on disk (no merge), parse stdout progress ---')
const prepareSnapshots = []
const prepareTotals = new Set()
let prepared
try {
  prepared = await prepareFile(toyUrl, option, {
    timeoutMs: 90_000,
    firstEntryOnly: false,
    onProgress: (line) => {
      const update = parseYtDlpProgressLine(line)
      if (!update) return
      updateLiveJob(jobId2, {
        phase: 'downloading',
        percent: update.percent ?? undefined,
        totalBytes: update.totalBytes ?? undefined,
        speedBytesPerSec: update.speedBytesPerSec ?? undefined
      })
      if (update.percent !== null) prepareSnapshots.push(update.percent)
      if (update.totalBytes !== null) prepareTotals.add(update.totalBytes)
    }
  })
  finishLiveJob(jobId2, `sample.${prepared.ext}`)
  console.log('  prepared:', JSON.stringify(prepared))
  check(prepared.size === 600000, `prepared file has all bytes (${prepared.size} === 600000)`)
  check(prepareSnapshots.some((p) => p > 0 && p < 99), 'prepare path saw an early percent')
  check(prepareSnapshots.some((p) => p >= 99), 'prepare path saw 100%')
  check(prepareTotals.has(600003), 'prepare path reported totalBytes = 600003')
} catch (error) {
  check(false, `prepare path completed (${error.message})`, error.stack)
}

/* ------------------------------------------------------------------ report */
console.log('\n' + (failures === 0 ? 'ALL SMOKE ASSERTIONS PASSED' : `${failures} SMOKE ASSERTION(S) FAILED`))
process.exit(failures === 0 ? 0 : 1)
