/**
 * The only place in the app that talks to the `yt-dlp` binary.
 *
 * Metadata extraction goes through `youtube-dl-exec` (its `dargs` layer turns
 * camelCase flags such as `dumpSingleJson` into `--dump-single-json`).
 *
 * File delivery uses a raw `spawn` for two reasons:
 *   1. `youtube-dl-exec` buffers stdout in memory, which is unacceptable for a
 *      multi-gigabyte file;
 *   2. more importantly, `yt-dlp` **cannot post-process into a pipe**. Verified
 *      against the real binary: `-f 230+140 -o -` exits 0 but emits raw
 *      concatenated MPEG-TS (no `ftyp`/`moov` atoms at all), because the ffmpeg
 *      merger needs seekable files on disk. So anything that needs a merge or an
 *      audio transcode is written to a temp file first and streamed from there,
 *      while genuinely muxed sources are piped straight through for zero latency
 *      and zero disk use.
 *
 * Progress reporting: for a piped transfer we pass `--newline` without
 * `--quiet`. With `-o -`, yt-dlp then flips its internal `logtostderr` switch,
 * so the human log (including the `[download] Destination: -` size line and one
 * `[download]  46.1% of … at …/s` update per line) goes to **stderr** while the
 * raw media bytes stay on stdout. `lib/progress.ts` parses those lines so the
 * UI can animate a real percentage even on a chunked, length-less response.
 * (`--quiet` would set `noprogress` and suppress every update, which is exactly
 * the \"jumps straight to 100%\" bug this fixes.)
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import path from 'node:path'

import youtubedl from 'youtube-dl-exec'

import { EXTRACT_POOL, PREPARE_POOL, poolLoad } from './pool'
import { LIMITS, cookiesPath } from './site'
import type { DownloadOption } from './types'

/** `stdio: ['ignore','pipe','pipe']` — stdin is intentionally closed. */
export type YtDlpChild = ChildProcessByStdio<null, Readable, Readable>

type YoutubedlInternals = { constants?: { YOUTUBE_DL_PATH?: string } }

/**
 * Resolution order:
 *   1. `YTDL_PATH` (a self-managed / freshly updated yt-dlp),
 *   2. the standalone binary `youtube-dl-exec` downloaded at install time,
 *   3. `yt-dlp` from `PATH`.
 */
export const ytdlpBinary: string =
  process.env.YTDL_PATH?.trim() ||
  (youtubedl as unknown as YoutubedlInternals).constants?.YOUTUBE_DL_PATH ||
  'yt-dlp'

/** LAME VBR preset for MP3 output: 0 ≈ 245 kbps (transparent), 9 ≈ smallest. */
export const audioQuality: string =
  String(process.env.MP3_AUDIO_QUALITY ?? '0').replace(/[^\d]/g, '') || '0'

/** Scratch space for files that must be merged or transcoded before delivery. */
export const DOWNLOAD_TMP_DIR: string =
  process.env.DOWNLOAD_TMP_DIR?.trim() || path.join(tmpdir(), 'savefrom-clone-downloads')

export class ExtractionError extends Error {
  readonly code: 'EXTRACTION_FAILED' | 'SERVER_UNAVAILABLE' | 'TIMEOUT'
  readonly stderr?: string
  readonly exitCode?: number | null

  constructor(
    message: string,
    options: { code?: ExtractionError['code']; stderr?: string; exitCode?: number | null } = {}
  ) {
    super(message)
    this.name = 'ExtractionError'
    this.code = options.code ?? 'EXTRACTION_FAILED'
    this.stderr = options.stderr
    this.exitCode = options.exitCode
  }
}

let ffmpegState: Promise<boolean> | null = null

/** Cached probe for `ffmpeg`, required for merges (1080p+) and MP3 transcoding. */
export function ffmpegAvailable(): Promise<boolean> {
  if (!ffmpegState) {
    if (process.env.YTDL_SKIP_FFMPEG_PROBE === '1') return Promise.resolve(true)
    ffmpegState = new Promise<boolean>((resolve) => {
      const child = spawn(
        /* turbopackIgnore: true */ process.env.FFMPEG_PATH?.trim() || 'ffmpeg',
        ['-version'],
        { stdio: 'ignore' }
      )
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        resolve(false)
      }, 4000)
      child.on('error', () => {
        clearTimeout(timer)
        resolve(false)
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve(code === 0)
      })
    })
  }
  return ffmpegState
}

/* -------------------------------------------------------------------------- */
/*                              Extraction (parse)                            */
/* -------------------------------------------------------------------------- */

/** Flags understood by `youtube-dl-exec` (dargs maps them to CLI arguments). */
export type YtdlFlags = Record<string, string | number | boolean | string[] | undefined>

export interface ExtractOptions {
  /** `--playlist-items 1:N` — used when the visitor submits a playlist URL. */
  playlistLimit?: number
  timeoutMs?: number
  signal?: AbortSignal
  /** Extra raw flags merged last, useful for per-platform tweaks. */
  flags?: YtdlFlags
}

export function baseFlags(): YtdlFlags {
  return {
    // Never let yt-dlp prompt for input: a hanging child is worse than a 400.
    noWarnings: true,
    noProgress: true,
    skipDownload: true,
    noColor: true,
    ignoreConfig: true,
    encoding: 'utf8',
    retries: 2,
    socketTimeout: Number(process.env.YTDL_SOCKET_TIMEOUT ?? 20),
    ...(cookiesPath ? { cookies: cookiesPath } : {}),
    ...(process.env.YTDL_USER_AGENT ? { userAgent: process.env.YTDL_USER_AGENT } : {})
  }
}

/**
 * Runs `yt-dlp -J` and returns the parsed info dict.
 *
 * `--no-playlist` is the default so that `youtube.com/watch?v=X&list=Y` resolves
 * to the single video the visitor actually pasted, matching SaveFrom behaviour.
 */
export async function extractInfo(url: string, options: ExtractOptions = {}) {
  // Backpressure first: an unbounded fan-out of yt-dlp children OOM-kills the
  // process, so a caller that cannot be scheduled shortly is asked to retry.
  const releaseSlot = await EXTRACT_POOL.acquire()
  if (!releaseSlot) {
    const load = poolLoad().extract
    throw new ExtractionError(
      `This server is at its concurrent extraction limit (${load.max}). ${load.queued} request(s) are already queued.`,
      { code: 'SERVER_UNAVAILABLE' }
    )
  }

  try {
    return await runExtraction(url, options)
  } finally {
    releaseSlot()
  }
}

async function runExtraction(url: string, options: ExtractOptions) {
  const timeoutMs = options.timeoutMs ?? LIMITS.extractTimeoutMs
  const wantsPlaylist = Number.isFinite(options.playlistLimit ?? NaN)

  const flags: YtdlFlags = {
    ...baseFlags(),
    dumpSingleJson: true,
    noPlaylist: !wantsPlaylist,
    ...(wantsPlaylist
      ? {
          yesPlaylist: true,
          playlistItems: `1:${Math.max(2, Math.min(8, Math.trunc(options.playlistLimit ?? 2)))}`,
          flatPlaylist: false
        }
      : {}),
    ...options.flags
  }

  const handle = youtubedl.exec(url, flags as never, { windowsHide: true })

  let timedOut = false
  const killer = setTimeout(() => {
    timedOut = true
    try {
      handle.kill('SIGKILL')
    } catch {
      /* the child already exited */
    }
  }, timeoutMs)

  const onAbort = () => {
    try {
      handle.kill('SIGKILL')
    } catch {
      /* already gone */
    }
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const result = await handle
    const stdout = typeof result.stdout === 'string' ? result.stdout : String(result.stdout ?? '')
    if (!stdout.trim()) {
      throw new ExtractionError('yt-dlp returned an empty payload.', { code: 'EXTRACTION_FAILED' })
    }
    const payload = JSON.parse(stdout) as Record<string, unknown>
    if (wantsPlaylist && Array.isArray(payload.entries)) {
      payload.entries = (payload.entries as unknown[]).slice(0, options.playlistLimit ?? 2)
    }
    return payload
  } catch (error) {
    if (error instanceof ExtractionError) throw error
    if (timedOut) {
      throw new ExtractionError(`Extraction timed out after ${Math.round(timeoutMs / 1000)}s.`, {
        code: 'TIMEOUT'
      })
    }
    if (options.signal?.aborted) {
      throw new ExtractionError('Extraction was cancelled by the client.', { code: 'TIMEOUT' })
    }
    const err = error as { stderr?: string; message?: string; exitCode?: number; code?: string }
    if (err.code === 'ENOENT') {
      throw new ExtractionError(
        `The yt-dlp binary was not found at "${ytdlpBinary}". Run \`npm install\` (or set YTDL_PATH) on the server.`,
        { code: 'SERVER_UNAVAILABLE' }
      )
    }
    const stderr = err.stderr || err.message || 'Unknown yt-dlp failure'
    if (/ffmpeg/i.test(stderr) && !(await ffmpegAvailable())) {
      throw new ExtractionError(
        'ffmpeg is not installed on this server, so video+audio merging is impossible. ' +
          `Details: ${stderr.slice(0, 200)}`,
        { code: 'SERVER_UNAVAILABLE', stderr }
      )
    }
    throw new ExtractionError(stderr, {
      code: 'EXTRACTION_FAILED',
      stderr,
      exitCode: typeof err.exitCode === 'number' ? err.exitCode : null
    })
  } finally {
    clearTimeout(killer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

/* -------------------------------------------------------------------------- */
/*                            Download argument build                         */
/* -------------------------------------------------------------------------- */

/**
 * Rebuilds the `-f` selector from cached **stream ids** rather than replaying a
 * stored media URL, so signed CDN links going stale can never break a download.
 */
export function formatSelectorFor(option: DownloadOption): string {
  // Bound for `height<=N` fallbacks. Uses the *reported* height because that is
  // what yt-dlp compares against (1920 for a 1080x1920 vertical stream), while
  // `option.height` is the nominal class (1080) shown to the visitor.
  const bound = option.streamHeight ?? option.height ?? 0

  if (option.kind === 'audio') {
    const [audioId] = option.formatIds
    return [audioId && audioId !== 'b' ? `f${audioId}` : null, option.audioFormatId ?? 'bestaudio', 'b']
      .filter(Boolean)
      .join('/')
  }

  if (option.muxed) {
    // The raw `format_id` is tried first but is *not* reliable across calls:
    // several extractors (TikTok, Instagram) append per-run uniquifiers such as
    // `-0`/`-1`, which vanish on the next request. The `/` chain below is what
    // actually keeps a download working minutes after the page was parsed.
    const [videoId] = option.formatIds
    return [`f${videoId}`, bound > 0 ? `b[height<=${bound}]` : 'b', 'b'].join('/')
  }

  const [videoId, audioId] = option.formatIds
  const primary = `f${videoId}${audioId ? `+f${audioId}` : '+ba'}`
  const fallback =
    bound > 0 ? `bv*[height<=${bound}]+ba/b[height<=${bound}]` : 'bv*+ba/b'
  return [primary, fallback, 'b'].join('/')
}

/**
 * True when the preset is already a single, complete file: it can be piped
 * through stdout without ffmpeg, which is both faster and disk-free.
 */
export function canPipeDirectly(option: DownloadOption): boolean {
  return option.kind === 'video' && option.muxed && !option.needsMerge
}

interface BuildArgsInput {
  url: string
  option: DownloadOption
  /** `'-'` for a piped transfer, or a `-o` template for a file transfer. */
  output: string
  mergeOutputFormat?: DownloadOption['ext']
  quiet: boolean
  /** A playlist link must never fan out into N downloads. */
  firstEntryOnly: boolean
}

export function buildDownloadArgs({
  url,
  option,
  output,
  mergeOutputFormat,
  quiet,
  firstEntryOnly
}: BuildArgsInput): string[] {
  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--no-color',
    '--ignore-config',
    // Never switch output into a `\r` spinner: progress lines must be
    // terminable by newline so they can be parsed incrementally from stderr.
    '--newline',
    '--no-mtime',
    '--retries',
    '2',
    '--fragment-retries',
    '2',
    '--socket-timeout',
    String(Number(process.env.YTDL_SOCKET_TIMEOUT ?? 20)),
    '--concurrent-fragments',
    String(Number(process.env.YTDL_CONCURRENT_FRAGMENTS ?? 4))
  ]

  if (firstEntryOnly) args.push('--playlist-items', '1')
  // `-o -` flips yt-dlp's internal `logtostderr`, so the human log (progress
  // included) lands on stderr while the media bytes stay clean on stdout.
  if (quiet) args.push('--quiet')
  else args.push('--no-quiet')
  if (cookiesPath) args.push('--cookies', cookiesPath)
  if (process.env.YTDL_USER_AGENT) args.push('--user-agent', process.env.YTDL_USER_AGENT)
  if (process.env.FFMPEG_PATH?.trim()) args.push('--ffmpeg-location', process.env.FFMPEG_PATH.trim())

  args.push('-f', formatSelectorFor(option))

  if (option.kind === 'audio') {
    // Transcode audio only (never video) and keep ID3 tags via ffmpeg.
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', audioQuality)
    if (process.env.YTDL_NO_ID3 !== '1') args.push('--embed-metadata')
    // Needs AtomicParsley/mutagen, so it stays opt-in.
    if (process.env.MP3_EMBED_THUMBNAIL === '1') args.push('--embed-thumbnail')
  } else if (option.needsMerge) {
    // yt-dlp's merger copies codecs by default (there is no `--copy-codecs`;
    // `-c` is `--continue`), so we only express the container preference.
    // `--remux-video` is deliberately avoided: it hard-fails when a codec does
    // not fit the requested container, whereas merge-output-format falls back.
    if (mergeOutputFormat && mergeOutputFormat !== 'mkv') {
      args.push('--merge-output-format', mergeOutputFormat)
    }
  }

  args.push('-o', output)
  args.push('--', url)
  return args
}

/* -------------------------------------------------------------------------- */
/*                        Path A: pipe a muxed file through                   */
/* -------------------------------------------------------------------------- */

export interface StreamJob {
  child: YtDlpChild
  /** Kill the child and clear the timer/listener. Safe to call twice. */
  dispose: () => void
  readonly startedAt: number
  stderrTail: () => string
  /**
   * Raw (utf8) progress lines parsed from stderr. `--newline` guarantees each
   * update is a whole line. `lib/progress.ts` turns them into percentages.
   */
  onProgress: (cb: ((line: string) => void) | null) => void
}

export interface StreamJobOptions {
  signal?: AbortSignal
  timeoutMs?: number
  firstEntryOnly?: boolean
}

export interface PrepareJobOptions extends StreamJobOptions {
  /** Container preference for the merge step; ignored when nothing is merged. */
  mergeOutputFormat?: DownloadOption['ext']
  /**
   * Raw (utf8) `--newline` progress lines from stdout. For a *file* output
   * yt-dlp keeps media bytes on disk and prints only the human log to stdout,
   * so these lines are pure progress text (see `lib/progress.ts`).
   */
  onProgress?: (line: string) => void
}

export function startStreamJob(url: string, option: DownloadOption, options: StreamJobOptions = {}): StreamJob {
  const startedAt = Date.now()
  const child = spawn(
    /* turbopackIgnore: true */ ytdlpBinary,
    buildDownloadArgs({
      url,
      option,
      output: '-',
      quiet: false,
      firstEntryOnly: options.firstEntryOnly ?? false
    }),
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  ) as YtDlpChild

  let stderrBuffer = ''
  /** Last *completed* line; `--newline` keeps updates coming `\n`-terminated. */
  let stderrLine = ''
  const linesSeen: string[] = []
  let progressListener: ((line: string) => void) | null = null

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderrBuffer = (stderrBuffer + chunk).slice(-8000)
    stderrLine += chunk.replace(/\u001b\[[0-9;]*m/g, '')
    let newlineIndex = stderrLine.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = stderrLine.slice(0, newlineIndex).replace(/\r/g, '').trim()
      stderrLine = stderrLine.slice(newlineIndex + 1)
      if (line) {
        linesSeen.push(line)
        if (linesSeen.length > 5) linesSeen.shift()
        progressListener?.(line)
      }
      newlineIndex = stderrLine.indexOf('\n')
    }
  })

  const timeoutMs = options.timeoutMs ?? LIMITS.extractTimeoutMs
  const timer = setTimeout(() => {
    child.kill('SIGTERM')
    setTimeout(() => child.kill('SIGKILL'), 5000).unref?.()
  }, timeoutMs)

  const onAbort = () => child.kill('SIGTERM')
  options.signal?.addEventListener('abort', onAbort, { once: true })

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }

  return {
    child,
    dispose,
    startedAt,
    stderrTail: () =>
      stderrBuffer.replace(/\u001b\[[0-9;]*m/g, '').slice(-1200) || 'yt-dlp exited without writing any data.',
    onProgress(cb: ((line: string) => void) | null) {
      progressListener = cb
      if (cb) for (const line of linesSeen) cb(line)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                 Path B: prepare a merged/transcoded file on disk           */
/* -------------------------------------------------------------------------- */

export interface PreparedFile {
  path: string
  size: number
  /** Real container produced by yt-dlp (it may legitimately differ from our guess). */
  ext: string
  elapsedMs: number
}

/** Snapshot of both pools, exposed for health checks and busy responses. */
export function engineLoad() {
  return poolLoad()
}

let swept = false
/** Best-effort cleanup of leftovers from crashed or killed requests. */
async function sweepStaleFiles(maxAgeMs = 60 * 60 * 1000): Promise<void> {
  await mkdir(/* turbopackIgnore: true */ DOWNLOAD_TMP_DIR, { recursive: true })
  if (swept) return
  swept = true
  try {
    const now = Date.now()
    for (const name of await readdir(/* turbopackIgnore: true */ DOWNLOAD_TMP_DIR)) {
      const full = path.join(DOWNLOAD_TMP_DIR, name)
      const info = await stat(/* turbopackIgnore: true */ full).catch(() => null)
      if (info && now - info.mtimeMs > maxAgeMs) await rm(/* turbopackIgnore: true */ full, { force: true }).catch(() => {})
    }
  } catch {
    /* a read-only tmp dir just means no sweep */
  }
}

export async function removePreparedFile(filePath: string): Promise<void> {
  await rm(/* turbopackIgnore: true */ filePath, { force: true }).catch(() => {})
  await rm(/* turbopackIgnore: true */ `${filePath}.part`, { force: true }).catch(() => {})
}

/**
 * Downloads + merges/transcodes into `DOWNLOAD_TMP_DIR` and resolves with the
 * finished file. The real extension comes back from disk, so a container
 * fallback (say mkv instead of mp4) still produces a correctly named download.
 */
export async function prepareFile(
  url: string,
  option: DownloadOption,
  options: PrepareJobOptions = {}
): Promise<PreparedFile> {
  // Merging/transcoding is the heaviest thing this app does (yt-dlp + ffmpeg and
  // a real file on disk), so it gets its own smaller pool and no queue: when it
  // is saturated the visitor is told to retry rather than silently stalling.
  const release = await PREPARE_POOL.acquire()
  if (!release) {
    const load = poolLoad().prepare
    throw new ExtractionError(
      `This server is converting ${load.max} file(s) already. Try again in a few seconds.`,
      { code: 'SERVER_UNAVAILABLE' }
    )
  }

  const startedAt = Date.now()
  await sweepStaleFiles()
  const token = randomUUID()
  const template = path.join(DOWNLOAD_TMP_DIR, `${token}.%(ext)s`)

  const child = spawn(
    /* turbopackIgnore: true */ ytdlpBinary,
    buildDownloadArgs({
      url,
      option,
      output: template,
      quiet: false,
      mergeOutputFormat: options.mergeOutputFormat,
      firstEntryOnly: options.firstEntryOnly ?? false
    }),
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  )

  let stderrBuffer = ''
  child.stderr?.setEncoding('utf8')
  child.stderr?.on('data', (chunk: string) => {
    stderrBuffer = (stderrBuffer + chunk).slice(-12_000)
  })

  // For a disk-file output, stdout carries only the `--newline` progress log
  // (the media bytes go to the temp file). Feed each completed line forward.
  let stdoutLine = ''
  child.stdout?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => {
    stdoutLine += chunk.replace(/\u001b\[[0-9;]*m/g, '')
    let newlineIndex = stdoutLine.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = stdoutLine.slice(0, newlineIndex).replace(/\r/g, '').trim()
      stdoutLine = stdoutLine.slice(newlineIndex + 1)
      if (line) options.onProgress?.(line)
      newlineIndex = stdoutLine.indexOf('\n')
    }
  })

  const timeoutMs = options.timeoutMs ?? LIMITS.downloadTimeoutMs
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGTERM')
    setTimeout(() => child.kill('SIGKILL'), 5000).unref?.()
  }, timeoutMs)

  const onAbort = () => child.kill('SIGTERM')
  options.signal?.addEventListener('abort', onAbort, { once: true })

  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  }).finally(() => {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
    release()
  })

  if (code !== 0) {
    await removePreparedFile(template.replace('.%(ext)s', '.mp4'))
    for (const name of await readdir(/* turbopackIgnore: true */ DOWNLOAD_TMP_DIR).catch(() => [] as string[])) {
      if (name.startsWith(token)) await removePreparedFile(path.join(DOWNLOAD_TMP_DIR, name))
    }
    if (timedOut) {
      throw new ExtractionError(
        `Preparing this file took longer than ${Math.round(timeoutMs / 1000)}s and was stopped.`,
        { code: 'TIMEOUT' }
      )
    }
    if ((child as { code?: string }).code === 'ENOENT') {
      throw new ExtractionError(`The yt-dlp binary was not found at "${ytdlpBinary}".`, {
        code: 'SERVER_UNAVAILABLE'
      })
    }
    throw new ExtractionError(stderrBuffer.slice(-1200) || `yt-dlp exited with code ${code}.`, {
      code: 'EXTRACTION_FAILED',
      stderr: stderrBuffer,
      exitCode: code
    })
  }

  const names = await readdir(/* turbopackIgnore: true */ DOWNLOAD_TMP_DIR).catch(() => [] as string[])
  const produced = names.filter((name) => name.startsWith(token) && !name.endsWith('.part'))
  if (produced.length === 0) {
    throw new ExtractionError('yt-dlp finished but produced no file.', { code: 'EXTRACTION_FAILED' })
  }

  // Largest file wins: with `-k` or a retry, stray `.f<id>` fragments can exist.
  let best: { path: string; size: number } | null = null
  for (const name of produced) {
    const full = path.join(DOWNLOAD_TMP_DIR, name)
    const info = await stat(/* turbopackIgnore: true */ full).catch(() => null)
    if (info && info.size > 0 && (!best || info.size > best.size)) best = { path: full, size: info.size }
  }
  if (!best) {
    for (const name of produced) await removePreparedFile(path.join(DOWNLOAD_TMP_DIR, name))
    throw new ExtractionError('yt-dlp produced an empty file.', { code: 'EXTRACTION_FAILED' })
  }

  return {
    path: best.path,
    size: best.size,
    ext: (path.extname(best.path).slice(1) || option.ext).toLowerCase(),
    elapsedMs: Date.now() - startedAt
  }
}

/**
 * Web ReadableStream over a prepared file.
 *
 * `onSettled` fires exactly once on completion, failure *or* cancellation —
 * the caller uses it to release the per-client concurrency slot, and forgetting
 * any of the three paths leaks the slot until its TTL expires.
 */
export function fileBody(
  prepared: PreparedFile,
  onSettled?: () => void
): ReadableStream<Uint8Array> {
  const source = createReadStream(prepared.path)
  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    void removePreparedFile(prepared.path)
    onSettled?.()
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      source.on('data', (chunk: string | Buffer) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        controller.enqueue(new Uint8Array(buffer))
      })
      source.on('error', (error) => {
        controller.error(error)
        settle()
      })
      source.on('end', () => {
        try {
          controller.close()
        } catch {
          /* already closed by a cancel */
        }
        settle()
      })
    },
    cancel() {
      source.destroy()
      settle()
    }
  })
}

/** Turns a failed child process into a message that is safe to show a visitor. */
export function errorFromChildFailure(job: StreamJob, exitCode: number | null): string {
  const tail = job.stderrTail()
  if (/ffmpeg/i.test(tail)) {
    return 'The server is missing ffmpeg, which is required for merging 1080p/4K streams and MP3 conversion.'
  }
  if (/Requested format is not available/i.test(tail)) {
    return 'That exact stream is no longer available. Run the extraction again to refresh the format list.'
  }
  return tail || `yt-dlp exited with code ${exitCode ?? 'null'}.`
}
