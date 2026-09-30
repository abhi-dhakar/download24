# syntax=docker/dockerfile:1
#
# Production image for the downloader. Two things matter here:
#   1. ffmpeg must exist, otherwise merged 1080p/4K presets and MP3 output fail;
#   2. yt-dlp drifts out of date within weeks whenever a platform changes its
#      player, so we pin it at *build* time from the latest release instead of
#      relying on whatever youtube-dl-exec bundled months ago.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl python3 \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# We download the binary ourselves in the build stage, so skip both fetches here.
ENV YOUTUBE_DL_SKIP_DOWNLOAD=1 YOUTUBE_DL_SKIP_PYTHON_CHECK=1 SKIP_YTDLP_INSTALL=1
RUN npm ci --no-audit --no-fund

FROM node:20-bookworm-slim AS build
WORKDIR /app
# NEXT_OUTPUT flips next.config.ts to `output: 'standalone'`, which the runner
# stage copies as `node server.js`. Local dev builds skip it so `npm start` works.
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN curl -fsSL --create-dirs -o /app/bin/yt-dlp \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  && chmod +x /app/bin/yt-dlp \
  && /app/bin/yt-dlp --version
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    YTDL_PATH=/usr/local/bin/yt-dlp
# ffmpeg = merging/MP3. aria2/certificates = resilient fetches from the runner.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/bin/yt-dlp /usr/local/bin/yt-dlp
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ > /dev/null || exit 1
CMD ["node", "server.js"]
