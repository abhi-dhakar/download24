/**
 * postinstall: make sure a usable `yt-dlp` exists before the app is built.
 *
 * `youtube-dl-exec` already fetches a standalone binary into
 * `node_modules/youtube-dl-exec/bin/yt-dlp` during its own install. This script
 * verifies that happened and otherwise tries two fallbacks. It never fails the
 * install — a hard failure here would break CI for people who provide `yt-dlp`
 * another way (base image, `YTDL_PATH`, …).
 *
 * The runtime check in `app/api/parse/route.ts` is what turns a genuinely
 * missing binary into a clear 503 instead of a mystery stack trace.
 */

import { spawnSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BUNDLED = path.join(ROOT, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp')

const candidates = [
  process.env.YTDL_PATH,
  BUNDLED,
  path.join(ROOT, 'node_modules', '.bin', 'yt-dlp'),
  'yt-dlp'
].filter(Boolean)

const log = (message) => console.log(`[install-ytdlp] ${message}`)

/** Returns the version string when `binary` is runnable, otherwise false. */
function probe(binary) {
  if (binary !== 'yt-dlp') {
    try {
      accessSync(binary, constants.X_OK)
    } catch {
      return false
    }
  }
  const result = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 20_000 })
  return result.status === 0 ? result.stdout.trim() : false
}

function downloadStandalone() {
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
  const result = spawnSync('curl', ['-fsSL', '--create-dirs', '-o', BUNDLED, url], {
    encoding: 'utf8',
    timeout: 180_000
  })
  if (result.status !== 0) return false
  spawnSync('chmod', ['+x', BUNDLED])
  return probe(BUNDLED)
}

function installWithPip() {
  for (const launcher of ['pip3', 'pip', 'python3 -m pip']) {
    const [cmd, ...prefix] = launcher.split(' ')
    const result = spawnSync(cmd, [...prefix, 'install', '--user', '--quiet', '--upgrade', 'yt-dlp'], {
      encoding: 'utf8',
      timeout: 180_000
    })
    if (result.status === 0) {
      log(`installed yt-dlp with \`${launcher}\` (re-run \`yt-dlp -U\` occasionally to stay current)`)
      return true
    }
  }
  return false
}

async function main() {
  if (process.env.SKIP_YTDLP_INSTALL === '1') {
    log('skipped because SKIP_YTDLP_INSTALL=1')
    return
  }

  for (const candidate of candidates) {
    const version = probe(candidate)
    if (version) {
      log(`ready — ${candidate} (${version})`)
      return
    }
  }

  log('no usable yt-dlp found yet, attempting a fetch')
  if (downloadStandalone()) return
  if (installWithPip()) return

  console.warn(
    '[install-ytdlp] WARNING: yt-dlp is unavailable, so /api/parse will answer 503.\n' +
      '               Fix with one of: `pipx install yt-dlp`, `brew install yt-dlp`, ' +
      'or export YTDL_PATH=/absolute/path/to/yt-dlp'
  )
}

await main()
