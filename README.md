# SaveFrom Clone — multi-platform video downloader

A production-ready, single-repository **Next.js (App Router + TypeScript) + Tailwind CSS v4** web app
inspired by SaveFrom.net. There is **no Express server**: link extraction happens inside a Next.js
Route Handler (`app/api/parse/route.ts`) that shells out to the real `yt-dlp` binary through
`youtube-dl-exec`, and finished files are streamed to the browser from `app/api/download/route.ts`.

```
Visitor ── paste link ──▶ POST /api/parse ──▶ LRU cache (15 min) ──▶ yt-dlp -J ──▶ format triage
        ── click 4K ────▶ GET /api/download ─▶ yt-dlp -f f137+ba -o - ─▶ piped to the browser
```

## Features

| Area | What ships here |
| --- | --- |
| Platforms | YouTube, YouTube Shorts, Instagram (Reels/IGTV), TikTok (no watermark), Facebook, X/Twitter, Vimeo, Dailymotion, Reddit, Twitch clips — plus any other extractor the installed `yt-dlp` supports (`lib/platforms.ts` is the allow-list). |
| Qualities | 4K/2160p, 1440p, 1080p, 720p, 480p, 360p, 240p **and** MP3 audio, each with container (MP4/WebM/MKV), codec family, fps, bitrate and estimated size. |
| Merging | Modern YouTube publishes *no* muxed streams. Options above 720p are therefore flagged `needsMerge` and muxed server-side with `-c copy` (never re-encoded) via ffmpeg. |
| Caching | `lru-cache` with a 15-minute TTL and a 2,000-entry cap in `lib/cache.ts`. Keys ignore tracking junk (`?si=`, `?utm_*`, `?t=`) so the same video is one entry regardless of how the link was shared. Errors get a 45-second negative cache so one dead link cannot be hammered. |
| SEO | `generateMetadata` with the 4K/YouTube/TikTok/Instagram title template, canonical URLs, OG + Twitter cards, `app/sitemap.ts`, `app/robots.ts`, and a JSON-LD graph (`WebApplication`, `FAQPage`, `HowTo`, `BreadcrumbList`, `WebSite`) generated from the same arrays that render the visible FAQ and guide. |
| Core Web Vitals | `next/font` with metric-adjusted fallbacks, no third-party requests in the critical path, dimension-locked thumbnail (`CLS = 0`), `scrollbar-gutter: stable`, a min-height result slot, and `prefers-reduced-motion` handling. |
| A11y | Skip link, `aria-live` status region, `aria-invalid`/`role="alert"` on validation, labelled icon buttons, native `<details>`/`<summary>` accordion, visible focus ring. |
| Safety | URL allow-listing, SSRF guards (loopback/RFC1918/CGNAT/link-local/metadata/IPv6-ULA/non-http protocols), body size caps, per-IP rate limiting, per-IP download concurrency, upstream error text sanitised (signed URLs replaced with `<link>`) before it reaches a response or a log. |

## Getting started

```bash
npm install          # postinstall verifies/installs yt-dlp (see scripts/install-ytdlp.mjs)
npm run dev          # http://localhost:3000
```

Requirements: Node **>= 20.9**, and **ffmpeg** on the host if you want merged 1080p/4K and MP3 output:

```bash
apt-get install -y ffmpeg      # or: brew install ffmpeg
```

Without ffmpeg the app still works: the parse route detects it and hides the presets that would fail
instead of handing back dead buttons (`meta.warning` explains why).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server bound to `0.0.0.0:3000` |
| `npm run build` / `npm start` | production build + server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 10 flat config (`eslint-config-next/core-web-vitals`) |

## Configuration

Everything is optional; see `.env.example` for the full annotated list.

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `metadataBase`, canonical URLs, sitemap/robots host |
| `NEXT_PUBLIC_CANONICAL_URL` | falls back to the above | Pin canonicals to production from preview deploys |
| `DOWNLOAD_MODE` | `stream` | `redirect` 302s already-muxed sources to their CDN URL instead of proxying bytes |
| `YTDL_PATH` | bundled binary | Point at a self-managed/`yt-dlp -U` updated binary |
| `YTDL_COOKIES` | unset | Netscape `cookies.txt` for age/login/region-gated media |
| `MP3_AUDIO_QUALITY` | `0` | LAME VBR (0 ≈ 245 kbps, 9 ≈ smallest) |
| `RATE_LIMIT_EXTRACT_PER_MIN` | `40` | Extractions per hashed client per minute |
| `RATE_LIMIT_DOWNLOAD_PER_MIN` | `12` | Downloads per hashed client per minute |
| `EXTRA_ALLOWED_HOSTS` | unset | Add hosts to the allow-list without touching code |

On non-`localhost` hosts `robots.txt`/`sitemap.xml` are emitted; on `localhost` robots disallows
everything and the sitemap is empty, so a dev box can never leak into the index.

## API

```bash
# extract (cache-aware)
curl -s -X POST localhost:3000/api/parse \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=aqz-KE-bpKQ"}' | jq '.data | {meta: .meta.title, q: .availableQualities, n: (.options|length)}'

# bypass the cache
curl -s -X POST 'localhost:3000/api/parse?refresh=1' -H 'content-type: application/json' -d '{"url":"…"}'

# stream a preset (index = DownloadOption.id from the response above)
curl -sL -o clip.mp4 'localhost:3000/api/download?src=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ&f=2'
```

Response headers worth knowing: `X-Cache: HIT|MISS`, `X-Cache-Ttl`, `X-Request-Duration-Ms`, and on
download `X-Download-Mode`, `X-Size-Estimate`, `X-Merged-Streams`.

Failure codes are structured, so the UI can react without string matching:
`INVALID_URL` `UNSUPPORTED_URL` `SELF_REQUEST` `RATE_LIMITED` `TIMEOUT` `UNAVAILABLE`
`LOGIN_REQUIRED` `GEOBLOCKED` `TOO_MANY_REQUESTS` `SERVER_UNAVAILABLE` `EXTRACTION_FAILED`.

## Deploying

**Recommended: a long-lived Node host (Docker, Fly.io, Railway, Render, a VPS).**

```bash
docker build -t savefrom-clone . && docker run --rm -p 3000:3000 savefrom-clone
```

`Dockerfile` installs ffmpeg, refreshes `yt-dlp` at build time (it drifts within weeks when a platform
changes its player) and runs `next start`.

**Serverless (Vercel et al.) works for the parse endpoint**, which is short and cacheable, but be aware:

* streaming a 4K file through a function is bound by `maxDuration` and by response-size/time limits —
  set `DOWNLOAD_MODE=redirect` and expect merged/MP3 presets to be slow or fail;
* the default runtime has no ffmpeg; you need a custom runtime or a container;
* `node_modules/youtube-dl-exec/bin/yt-dlp` is ~3 MB, so keep it in the install step rather than committing it.

## Architecture notes

* `lib/ytdlp.ts` is the **only** file that touches the binary. Metadata extraction uses
  `youtube-dl-exec` (its `dargs` layer maps camelCase flags such as `dumpSingleJson` → `--dump-single-json`).
  Downloads use a raw `spawn`, because `youtube-dl-exec` buffers stdout in memory — unacceptable for a
  2 GB file we want to pipe straight through.
* Two engine quirks are handled explicitly: dargs maps a `false` flag value to *nothing* (never to
  `--no-flag`), and boolean flags must be passed as bare `true`.
* `formatSelectorFor()` rebuilds the `-f` selector from cached **format ids** at download time instead of
  replaying a stored media URL, because signed CDN URLs expire in minutes.
* The download route holds its per-IP concurrency slot until the stream closes or is cancelled, not until
  the handler returns, and kills the `yt-dlp` child on client disconnect (`ReadableStream.cancel`).

## Legal

Demo project. Not affiliated with YouTube, Google, Meta, Instagram, Facebook, TikTok, ByteDance, X Corp.,
Twitter, Vimeo, Dailymotion, Reddit or Twitch. No media is hosted or stored. You are responsible for
respecting copyright and each platform's terms — see `app/terms/page.tsx`, which you should have a lawyer
review before going public.
