# syntax=docker/dockerfile:1

# ============================================================
# 1. Dependencies
# ============================================================
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Copy only package files first for better Docker layer caching
COPY package.json package-lock.json ./

# We install yt-dlp manually later in the build stage.
ENV YOUTUBE_DL_SKIP_DOWNLOAD=1 \
    YOUTUBE_DL_SKIP_PYTHON_CHECK=1 \
    SKIP_YTDLP_INSTALL=1

# IMPORTANT:
# Skip package postinstall scripts because the project's
# postinstall tries to execute scripts/install-ytdlp.mjs,
# which is not copied into this stage.
RUN npm ci --no-audit --no-fund --ignore-scripts


# ============================================================
# 2. Build
# ============================================================
FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone

# curl is required to download the latest yt-dlp binary
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# ------------------------------------------------------------
# Download latest yt-dlp
# ------------------------------------------------------------
RUN mkdir -p /app/bin \
    && curl -fL --retry 5 --retry-delay 2 \
        -o /app/bin/yt-dlp \
        https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && /app/bin/yt-dlp --version

# ------------------------------------------------------------
# Build Next.js application
# ------------------------------------------------------------
RUN npm run build


# ============================================================
# 3. Production Runner
# ============================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    YTDL_PATH=/usr/local/bin/yt-dlp

# ------------------------------------------------------------
# Runtime dependencies
#
# ffmpeg:
#   Required for video/audio merging and MP3 conversion.
#
# curl:
#   Used by the Docker healthcheck.
# ------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        ca-certificates \
        curl \
        python3 \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Create non-root user
# ------------------------------------------------------------
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# ------------------------------------------------------------
# Copy Next.js standalone build
# ------------------------------------------------------------
COPY --from=build /app/public ./public

COPY --from=build \
    --chown=nextjs:nodejs \
    /app/.next/standalone ./

COPY --from=build \
    --chown=nextjs:nodejs \
    /app/.next/static ./.next/static

# ------------------------------------------------------------
# Copy yt-dlp
# ------------------------------------------------------------
COPY --from=build /app/bin/yt-dlp /usr/local/bin/yt-dlp

# ------------------------------------------------------------
# Run as non-root user
# ------------------------------------------------------------
USER nextjs

EXPOSE 3000

# ------------------------------------------------------------
# Healthcheck
# ------------------------------------------------------------
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/ > /dev/null || exit 1

# ------------------------------------------------------------
# Start Next.js standalone server
# ------------------------------------------------------------
CMD ["node", "server.js"]