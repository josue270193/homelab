# syntax=docker/dockerfile:1

# deps + build run on the builder's native arch: the standalone output is plain JS with no
# native addons, so cross-builds (amd64 <-> arm64) don't run npm/next under emulation.
FROM --platform=$BUILDPLATFORM node:24.22.1-alpine3.24 AS deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM --platform=$BUILDPLATFORM node:24.22.1-alpine3.24 AS build
WORKDIR /src
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /src/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime: only the standalone server + static assets, non-root.
FROM node:24.22.1-alpine3.24
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /src/.next/standalone ./
COPY --from=build --chown=node:node /src/.next/static ./.next/static
COPY --from=build --chown=node:node /src/public ./public
USER node
EXPOSE 3000
# 127.0.0.1, not localhost: busybox wget tries ::1 first and server.js listens on IPv4 only.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD wget -q -T 3 -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
