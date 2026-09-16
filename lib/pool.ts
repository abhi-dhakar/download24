/**
 * A tiny counting semaphore with a bounded queue.
 *
 * Why this exists: every extraction spawns a `yt-dlp` child process, and a
 * PyInstaller-built `yt-dlp` costs roughly 30-60 MB of RSS. Per-IP rate limiting
 * alone does **not** bound that — 40 requests inside the same second spawn 40
 * children and the kernel OOM-kills the Node process (reproduced: `exit 137`).
 * So concurrency gets its own limit, and callers who cannot be scheduled within
 * a short grace period are told to retry instead of being queued forever.
 */

export interface SlotPool {
  /** Resolves with a release closure, or `null` when the queue deadline passed. */
  acquire(): Promise<(() => void) | null>
  stats(): { active: number; queued: number; max: number }
}

export interface SlotPoolOptions {
  max: number
  /** How long a caller waits for a free slot before being told "busy". */
  waitMs?: number
  /** Used to clamp an env override to something sane. */
  label?: string
}

const clamp = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min

interface Waiter {
  resolve: (granted: boolean) => void
  deadline: number
}

export function createSlotPool({ max, waitMs = 10_000, label = 'pool' }: SlotPoolOptions): SlotPool {
  const limit = clamp(max, 1, 64)
  const budget = clamp(waitMs, 0, 120_000)
  let active = 0
  const queue: Waiter[] = []

  const release = () => {
    active = Math.max(0, active - 1)
    grant()
  }

  function grant(): void {
    while (active < limit && queue.length > 0) {
      const waiter = queue.shift()
      if (!waiter) break
      if (budget > 0 && waiter.deadline <= Date.now()) {
        waiter.resolve(false)
        continue
      }
      active += 1
      waiter.resolve(true)
    }
  }

  return {
    acquire() {
      if (active < limit) {
        const alreadyQueued = queue.length
        if (alreadyQueued > 0) {
          // Strict FIFO: never jump ahead of somebody already waiting.
          return new Promise<(() => void) | null>((resolve) => {
            queue.push({
              resolve: (granted) => resolve(granted ? () => release() : null),
              deadline: Date.now() + budget
            })
            grant()
          })
        }
        active += 1
        return Promise.resolve(release)
      }

      if (budget === 0) return Promise.resolve(null)

      return new Promise<(() => void) | null>((resolve) => {
        const waiter: Waiter = {
          resolve: (granted) => {
            if (granted) resolve(() => release())
            else resolve(null)
          },
          deadline: Date.now() + budget
        }
        queue.push(waiter)
        // Give up waiting on our own terms if no slot ever frees.
        setTimeout(() => {
          const index = queue.indexOf(waiter)
          if (index >= 0) {
            queue.splice(index, 1)
            waiter.resolve(false)
          }
        }, budget + 50).unref?.()
      })
    },
    stats() {
      return { active, queued: queue.length, max: limit }
    }
  }
}

/**
 * Pool sizes are deliberately conservative: they trade a little throughput for
 * "the box stays up". `1 x CPU` is a reasonable rule of thumb for extraction,
 * and merges/transcodes (ffmpeg + yt-dlp) are heavier still.
 */
export const EXTRACT_POOL: SlotPool = createSlotPool({
  label: 'extract',
  max: Number(process.env.YTDL_MAX_CONCURRENT_EXTRACTS ?? 6),
  waitMs: Number(process.env.YTDL_EXTRACT_QUEUE_TIMEOUT_MS ?? 10_000)
})

export const PREPARE_POOL: SlotPool = createSlotPool({
  label: 'prepare',
  max: Number(process.env.DOWNLOAD_MAX_CONCURRENT_JOBS ?? 4),
  waitMs: Number(process.env.DOWNLOAD_QUEUE_TIMEOUT_MS ?? 0)
})

export function poolLoad(): { extract: { active: number; queued: number; max: number }; prepare: { active: number; queued: number; max: number } } {
  return { extract: EXTRACT_POOL.stats(), prepare: PREPARE_POOL.stats() }
}
