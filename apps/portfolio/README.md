# portfolio

Personal portfolio website, a subproject of this homelab (epic **E9**, issues #70–#78).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.

## Run locally

Needs Node ≥ 20.9.

```bash
cd apps/portfolio
npm ci
npm run dev       # http://localhost:3000
npm run lint
npm run build     # production build, also produces .next/standalone
```

## Docker

```bash
docker build -t homelab-portfolio:dev .
docker run --rm -p 127.0.0.1:3000:3000 homelab-portfolio:dev
curl http://localhost:3000/api/health   # {"status":"UP"}
```

Multi-stage on `node:24.22.1-alpine3.24`. It runs as the non-root `node` user, and the
`HEALTHCHECK` polls `/api/health`. The build stages run on `$BUILDPLATFORM`, so
`--platform linux/amd64,linux/arm64` builds without emulating npm.

## Notes

- `output: "standalone"` in `next.config.ts`: the build emits a self-contained `server.js` with only
  the needed `node_modules`, used by the Docker image (#71).
- Versions are pinned exactly in `package.json` (Next.js picked a few days after release, not the same-day patch).
- `npm audit` reports moderate issues only in dev tooling (ESLint → `minimatch`); runtime deps:
  `npm audit --omit=dev` → 0.
- Telemetry: set `NEXT_TELEMETRY_DISABLED=1` (CI and Docker do).

## Roadmap (E9)

Scaffold (#70) → Dockerfile + health (#71) → CI to GHCR (#72) → apex domain (#73) → content (#74)
→ CV download (#75) → contact via Telegram (#76) → bot protection (#77) → optional email (#78).
