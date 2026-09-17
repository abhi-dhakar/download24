# Download24 — multi-platform video downloader

A production-ready, single-repository **Next.js (App Router + TypeScript) + Tailwind CSS v4** web app
inspired by SaveFrom.net. There is **no Express server**: link extraction happens inside a Next.js
Route Handler (`app/api/parse/route.ts`) that shells out to the real `yt-dlp` binary through
`youtube-dl-exec`, and finished files are streamed to the browser from `app/api/download/route.ts`.

TeraBox share links are the one exception: `yt-dlp` ships no TeraBox extractor, so `lib/terabox.ts`
resolves those shares natively (share page → `jsToken`/`dp-logid` → `/share/list` → signed `dlink`)
and the download route proxies the CDN response.

```
Visitor ── paste link ──▶ POST /api/parse ──▶ LRU cache (15 min) ──▶ yt-dlp -J ──▶ format triage
        ── click 4K ────▶ GET /api/download ─▶ yt-dlp -f f137+ba -o - ─▶ piped to the browser

TeraBox share ──▶ lib/terabox.ts ──▶ /main jsToken ──▶ /api/shorturlinfo (sign/timestamp)
              ──▶ /share/list (signed dlinks) ──▶ one option per file
              ──▶ GET /api/download ─▶ fresh dlink ──▶ CDN bytes piped (or 302 in redirect mode)
```

## The three-page download flow

Downloading is a guided, three-page journey instead of an inline result panel:

| Step | Route | What happens |
| --- | --- | --- |
| 1 — Paste link | `/` (also every `/platform` page) | The hero input validates the URL client-side, then hands over to step 2. Clipboard paste, recent-link history and the `/` keyboard shortcut live here. |
| 2 — Choose quality | `/download?url=…` | The page runs `POST /api/parse`, animates while extracting, then shows the video details (thumbnail, title, channel, duration, platform) and every quality preset from 4K down to MP3. |
| 3 — Download | `/download/progress?src=…&f=…` | The chosen preset streams from `/api/download` while the page shows the selected file (thumbnail, title, platform, quality, size), an ambient "it is running" animation and plain instructions on how long to expect — **no** percentage, byte counter, speed or ETA — then flips to a success scene with "download another" actions. |

Hand-off details worth knowing:

* step 2 encodes the selection in the query string (`src`, `f`, `label`, `ext`, `kind`, `size`,
  `title`, `a=mp3`) so a step-3 link is bookmarkable and shareable;
* step 2 also stashes a thumbnail/platform snapshot in `sessionStorage`
  (`lib/pending.ts`) so step 3 can render a rich header without re-parsing — the query string stays
  the source of truth, so step 3 still works without the snapshot;
* step 3 falls back to a plain browser navigation if the streamed fetch cannot be read
  (e.g. `DOWNLOAD_MODE=redirect` bouncing to a CDN without CORS headers);
* both flow pages are `noindex` — they carry per-user state and mean nothing out of context.

## Site map

| Route | Purpose |
| --- | --- |
| `/` | Landing page: hero downloader (step 1), illustrations, feature/how-to/platform/FAQ previews, quality guide. |
| `/downloader` | Nav target that **redirects to the homepage** — the homepage *is* the downloader. |
| `/features` | Dedicated features page: illustrated feature cards, promises, "under the hood" engineering notes. |
| `/how-it-works` | Dedicated guide: the 4 steps with illustrations, the three-page flow explained, per-device tips. Carries the `HowTo` JSON-LD. |
| `/platforms` | All supported networks: capability table (max quality / watermark-free / MP3) plus the platform grid. |
| `/faq` | The FAQ accordion. Carries the `FAQPage` JSON-LD (the same array renders the visible answers). |
| `/download`, `/download/progress` | Steps 2 and 3 of the flow (see above). |
| `/[slug]` | Per-platform landing pages (`/youtube-video-download`, `/instagram-video-download`, `/terabox-video-download`, …) — eleven SEO-tuned pages that reuse the same hero input. |
| `/terms`, `/privacy` | Legal pages. |

Navigation (header, footer, mobile drawer) links the five top-level destinations; `sitemap.xml`
advertises `/`, `/features`, `/how-it-works`, `/platforms`, `/faq`, the legal pages and every
platform page (never the per-user download flow).

## Illustrations

All artwork is **hand-built inline SVG** in `components/illustrations/` — no binary assets, no icon
fonts, no network requests:

| File | What it draws |
| --- | --- |
| `HeroIllustration.tsx` | The homepage showpiece: a browser window resolving a link into quality options, an animated progress bar, a file dropping into a folder with a success check, floating "4K / MP3 / no watermark" chips and a rotating orbit ring. |
| `StepArt.tsx` | Four spot illustrations for the how-to steps (copy the link, paste it, pick a quality, save the file). |
| `FeatureArt.tsx` | Four feature-card illustrations (4K monitor, no-signup shield, speed bolt, multi-platform layers). |
| `ProgressArt.tsx` | The step-3 `DownloadingScene` (indeterminate source → channel → falling file → download shelf), the `SuccessScene` check and the step-2 `LinkMissingArt` empty state. |

Drawing conventions:

* every colour comes from the `@theme` tokens (`var(--color-accent)`, `var(--color-ink-850)`, …) or
  `currentColor` + `text-white/xx` utilities, so **the artwork re-skins itself in light mode**
  exactly like the rest of the UI;
* motion uses translate/opacity CSS keyframes (`--animate-bob`, `--animate-flow-dash`,
  `--animate-draw-check`, … in `app/globals.css`) plus SMIL `<animate>`/`<animateTransform>` for
  rotations and progress fills — the same approach as `components/Spinner.tsx`;
* step 3 is deliberately **indeterminate**: `DownloadingScene` loops the same few seconds of motion
  (rotating arc, flowing dashes, a file dropping into the shelf) instead of binding any geometry to
  transfer state, so nothing on the page implies a percentage it cannot honestly report;
* `prefers-reduced-motion` strips the CSS animations globally (SMIL keeps running, matching the
  existing spinner behaviour).

## Features

| Area | What ships here |
| --- | --- |
| Platforms | YouTube, YouTube Shorts, Instagram (Reels/IGTV), TikTok (no watermark), Facebook, X/Twitter, Vimeo, Dailymotion, Reddit, Twitch clips and **TeraBox share links** (single files, multi-file shares and folders) — plus any other extractor the installed `yt-dlp` supports (`lib/platforms.ts` is the allow-list). |
| Qualities | 4K/2160p, 1440p, 1080p, 720p, 480p, 360p, 240p **and** MP3 audio, each with container (MP4/WebM/MKV), codec family, fps, bitrate and estimated size. |
| Merging | Modern YouTube publishes *no* muxed streams. Options above 720p are therefore flagged `needsMerge` and muxed server-side with `-c copy` (never re-encoded) via ffmpeg. |
| Caching | `lru-cache` with a 15-minute TTL and a 2,000-entry cap in `lib/cache.ts`. Keys ignore tracking junk (`?si=`, `?utm_*`, `?t=`) so the same video is one entry regardless of how the link was shared. Errors get a 45-second negative cache so one dead link cannot be hammered. |
| SEO | `generateMetadata` per page with canonical URLs, OG + Twitter cards, `app/sitemap.ts`, `app/robots.ts`, and a JSON-LD graph (`WebApplication`, `FAQPage` on `/faq`, `HowTo` on `/how-it-works`, `BreadcrumbList` everywhere) generated from the same arrays that render the visible content. |
| Core Web Vitals | `next/font` with metric-adjusted fallbacks, no third-party requests in the critical path, dimension-locked thumbnails (`CLS = 0`), `scrollbar-gutter: stable`, min-height loading slots, and `prefers-reduced-motion` handling. |
| A11y | Skip link, `aria-live` status regions, `aria-invalid`/`role="alert"` on validation, labelled icon buttons, native `<details>`/`<summary>` accordion, visible focus ring, decorative illustrations `aria-hidden`. |
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
| `npm run test:terabox` | Compiles `lib/` and runs `scripts/terabox-selftest.mjs`: the TeraBox engine against a mocked TeraBox (real captured payloads), covering the signed flow, verification walls, errno mapping and token refresh. No network needed. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 10 flat config (`eslint-config-next/core-web-vitals`) |

> **Lint note:** with the repo's current `typescript@7` devDependency, `eslint-config-next`'s
> `typescript-eslint` fails to load (`typescript-eslint does not support TS 7.0`). This is a
> toolchain incompatibility, not a code issue — `npm run typecheck` is the reliable gate until the
> plugin gains TS 7 support.

## Configuration

Everything is optional; see `.env.example` for the full annotated list.

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `metadataBase`, canonical URLs, sitemap/robots host |
| `NEXT_PUBLIC_CANONICAL_URL` | falls back to the above | Pin canonicals to production from preview deploys |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | unset | Turns on PostHog analytics (see [Analytics](#analytics-posthog)). Unset = nothing loaded, nothing sent |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog ingestion origin — `https://eu.i.posthog.com` for EU Cloud, or your self-hosted URL |
| `NEXT_PUBLIC_APP_VERSION` | `dev` | Release label stamped on every analytics event |
| `DOWNLOAD_MODE` | `stream` | `redirect` 302s already-muxed sources to their CDN URL instead of proxying bytes |
| `YTDL_PATH` | bundled binary | Point at a self-managed/`yt-dlp -U` updated binary |
| `YTDL_COOKIES` | unset | Netscape `cookies.txt` for age/login/region-gated media |
| `MP3_AUDIO_QUALITY` | `0` | LAME VBR (0 ≈ 245 kbps, 9 ≈ smallest) |
| `RATE_LIMIT_EXTRACT_PER_MIN` | `40` | Extractions per hashed client per minute |
| `RATE_LIMIT_DOWNLOAD_PER_MIN` | `12` | Downloads per hashed client per minute |
| `EXTRA_ALLOWED_HOSTS` | unset | Add hosts to the allow-list without touching code |
| `TERABOX_COOKIE` | unset | `ndus` token, Cookie header or JSON — answers TeraBox's verification wall and unlocks signed `dlink`s for flagged shares |
| `TERABOX_RESOLVE_PROXY` | unset | Optional `?mode=resolve&surl=…` resolver used when TeraBox blocks the host's region |
| `TERABOX_MAX_FILES` / `TERABOX_MAX_DEPTH` | `60` / `2` | How many files a share may expand into and how deep folders are walked |
| `TERABOX_API_BASE` / `TERABOX_TIMEOUT_MS` / `TERABOX_USER_AGENT` | unset | Pin the API origin, the per-call timeout or the browser UA the share page is fetched with |

On non-`localhost` hosts `robots.txt`/`sitemap.xml` are emitted; on `localhost` robots disallows
everything and the sitemap is empty, so a dev box can never leak into the index.

## Analytics (PostHog)

Set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` (Project settings → *Project API key*, starts with `phc_`) and,
for EU Cloud, `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`. Everything then lands in that one
PostHog project — no in-app dashboard to maintain:

| Where | What you get in PostHog |
| --- | --- |
| Browser (`instrumentation-client.ts`) | `$pageview`/`$pageleave` for every navigation, autocapture of clicks & form submits, rage/dead clicks, heatmaps, scroll depth, web vitals, session replay (all inputs and the pasted link masked), uncaught JS errors |
| Browser (custom) | `link_submitted`, `link_rejected`, `extraction_viewed`, `extraction_error_viewed`, `extraction_retried`, `quality_selected`, `download_link_copied`, `download_finished_viewed`, `download_error_viewed`, `download_cancelled`, `download_retried`, `recent_link_reused`, `theme_toggled`, `faq_opened`, `not_found_viewed` |
| Server (`/api/parse`) | `extraction_completed` / `extraction_failed` with platform, extractor, cache hit, latency, option count, error code |
| Server (`/api/download`) | `download_started` (delivery mode, setup time, size), `download_completed` (bytes, duration), `download_failed` (error code, HTTP status), `rate_limited` |
| Server (`instrumentation.ts`) | uncaught route/render errors via `onRequestError` → Error tracking |

Server events carry the browser's distinct id and session id (`tracing_headers` on fetches, `phd`/`phs`
query params on the download iframe), so a failed download shows up on the same person and inside the
same session replay as the click that caused it. The link itself and the video title are never sent —
only the source host (`youtube.com`), the platform id, the chosen quality and the outcome.

All SDK traffic goes through the first-party path `/_d24/*`, which `proxy.ts` forwards to the PostHog
host (assets to `*-assets.i.posthog.com`), so domain-based tracker blockers do not drop events.
`skipTrailingSlashRedirect` is enabled for the same reason (PostHog endpoints end in `/`); `proxy.ts`
restores the slash-less canonical URL for every page with a 308.

Suggested first dashboard: a funnel `link_submitted → extraction_completed → quality_selected →
download_started → download_completed`, broken down by `platform`, plus a trend of
`extraction_failed` / `download_failed` by `error_code`.

The event catalogue lives in `lib/analytics.ts` (`EVENTS`); the privacy page describes the collection
whenever the token is set and says analytics are off when it is not.

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

# poll the phase of a download started with &job=<id> (step 3's completion signal)
curl -s 'localhost:3000/api/download/progress?id=<jobId>'
# → {"ok":true,"jobId":"<jobId>","phase":"downloading"}
#   phase ∈ starting | downloading | processing | streaming | redirect | finished | failed,
#   plus `fileName` once delivery starts and `errorMessage`/`errorHint` on failure.
#   Unknown/expired jobs answer {"ok":true,"gone":true,"phase":"finished"}.
#   No percentage, byte counter, speed or ETA is exposed — step 3 renders none of it.
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

**Extraction engine**

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

**TeraBox engine (`lib/terabox.ts`)**

* TeraBox is a *file host*, not a streaming site, and `yt-dlp` has no extractor for it, so the
  share flow is implemented directly, following the same calls the official player makes:

  | Step | Call | What it buys |
  | --- | --- | --- |
  | 1 | `GET <mirror>/main` | session cookies + `templateData.jsToken` |
  | 2 | `GET <mirror>/sharing/link?surl=…` | title, thumbnail, and the tokens anonymous pages carry |
  | 3 | `GET /api/shorturlinfo?shorturl=1<surl>&root=1&jsToken=…` | the share record: file list **and** the `sign`/`timestamp`/`shareid`/`uk` triple |
  | 4 | `GET /share/list?…&sign=…&timestamp=…&shareid=…&uk=…` | one entry per file, with signed `dlink`s |
  | 5 | `GET /share/download?…&fid_list=[fsId]` (or the `data.<mirror>` REST twin) | a fresh signed URL when step 4 had none |
  | 6 | `GET <dlink>` | 302 → CDN bytes |

* The engine is deliberately forgiving, because TeraBox rotates its API and rate-limits *signed*
  calls hard:
  * mirrors are swept in turn (page origin → the origin it redirects to → canonical mirrors) and an
    errno the module does not recognise is reported as `UPSTREAM_ERROR` (503, retryable) — it never
    stops the sweep and never claims the link is dead;
  * `4000020` / `400141` / `460020` / `-6` mean "stale token": `jsToken` is re-scraped from `/main`
    and the call is retried once;
  * a plain anonymous `/share/list` (no token, no signature) is kept as the last resort — it still
    returns the file list, so a share stays browsable and the UI can say *what* is missing instead
    of pretending the link expired;
  * `400210` (`need verify_v2`) means TeraBox is challenging this host's IP; the payload warning
    then points at `TERABOX_COOKIE`, which is also what unlocks `dlink`s for flagged (adult) shares.
* Folders are walked recursively (`dir=/folder`) up to `TERABOX_MAX_DEPTH` levels and
  `TERABOX_MAX_FILES` files, so one share link can list every video it contains. Each file becomes
  a normal `DownloadOption` — `lib/types.ts` only grows an optional `remoteFile` field so the
  download route knows which share path to open.
* When TeraBox reports video dimensions they set the quality chip; otherwise the file name
  (`…-1080p.mp4`) is the hint, and a file with neither shows as "Original file" rather than a
  made-up resolution.
* Because signed `dlink`s expire in minutes, nothing is ever replayed from cache: `/api/download`
  re-resolves the share (fresh `sign`/`timestamp` included) and opens a new link, then pipes the CDN
  bytes (`X-Download-Mode: terabox-cdn`) or 302s to the signed URL when `DOWNLOAD_MODE=redirect`.
* `TERABOX_RESOLVE_PROXY` is an optional escape hatch for hosts whose region TeraBox refuses to
  serve at all (`?mode=resolve&surl=…&raw=1` contract); every URL returned upstream still passes
  the same SSRF/public-host guard as the rest of the app.

**Frontend flow**

* `components/Downloader.tsx` is step 1 everywhere (homepage + platform pages): it validates, records
  history and navigates — it never parses. The old inline result card was replaced by the step-2 page.
* `components/download/DownloadDetails.tsx` (step 2) and `components/download/DownloadFlow.tsx`
  (step 3) are the only client components that talk to the API; both read the URL through
  `useSearchParams` inside a `<Suspense>` boundary so the page chrome stays prerendered.
* `components/download/DownloadStepper.tsx` renders the shared "Paste link → Choose quality →
  Download file" progress indicator on both flow pages.
* `lib/pending.ts` owns the sessionStorage hand-off and the filename sanitiser used when the browser
  saves the blob.
* The server still parses yt-dlp's `--newline` output into a job phase (`lib/progress.ts` →
  `lib/liveJobs.ts`), and step 3 polls `/api/download/progress` for that **phase alone** — it is the
  only completion signal a hidden-iframe download offers. The counters yt-dlp reports never reach
  the UI: `DownloadFlow` reads `phase`/`fileName`/errors and renders nothing numeric.

## Legal

Demo project. Not affiliated with YouTube, Google, Meta, Instagram, Facebook, TikTok, ByteDance, X Corp.,
Twitter, Vimeo, Dailymotion, Reddit, Twitch or TeraBox (Baidu). No media is hosted or stored. You are responsible for
respecting copyright and each platform's terms — see `app/terms/page.tsx`, which you should have a lawyer
review before going public.
