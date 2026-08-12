# Multi-stage build. Both stages share the same base OS (Debian slim) so
# the Prisma query engine binary generated during `build` is guaranteed
# compatible with `runtime` — Prisma downloads a platform-specific binary
# at `generate` time, and mismatched build/runtime OSes (e.g. building on
# Alpine, running on Debian) is a common source of "engine not found"
# failures in Docker deploys.
FROM node:20-bookworm-slim AS build

# The -slim base doesn't include OpenSSL, which Prisma's query engine
# needs to detect the right binary target — without it, `prisma
# generate` guesses (falls back to openssl-1.1.x) instead of detecting,
# which can silently pick a binary the runtime stage can't actually run.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first, separate from source, so this layer only
# re-installs when package*.json actually changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Prisma's client is generated code checked into node_modules, not
# source — must run before `tsc` in case any file imports @prisma/client
# types, and its output (node_modules/.prisma) is what `runtime` below
# copies out of this stage.
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime

# Same reason as the build stage — the Prisma query engine binary itself
# (not just `generate`) needs OpenSSL present at runtime to actually load.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Runs as an unprivileged user rather than the image's default root —
# standard container hardening; nothing in this app needs root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs assetsouq

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The generated Prisma client (node_modules/.prisma) isn't reproduced by
# `npm ci --omit=dev` above — it's build output, not a package-lock
# dependency — so it's copied from the build stage instead of
# regenerated here, which would otherwise need the `prisma` CLI (a
# devDependency deliberately excluded from this image to keep it lean;
# see docs/07-Deployment.md's migration section for where that CLI does
# run from).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

USER assetsouq

EXPOSE 4000

# No curl/wget in the -slim base image — a one-line Node request avoids
# installing extra packages just for this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/api/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
