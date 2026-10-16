# Homelab Roadmap

Self-hosted Docker stack: develop on MacBook (arm64), run on CachyOS PC (amd64),
exposed through Cloudflare Tunnel + Traefik. Tracked in GitHub Issues/Projects.

## Architecture (target)

```
Internet ──> Cloudflare (DNS, TLS, Access)
               │  outbound tunnel (no open ports, works behind CGNAT)
               ▼
         cloudflared ──> Traefik (reverse proxy, routes from Docker labels)
                           ├── whoami.example.dev   (test service)
                           ├── dockge.example.dev   (stack dashboard, behind Access)
                           ├── api.example.dev      (Spring Boot app)
                           └── status.example.dev   (Uptime Kuma)
         internal network only: postgres, docker-socket-proxy
```

## Conventions

- One issue = one small, verifiable change (one Claude Code session).
- Every issue has acceptance criteria; it is closed only when they pass.
- Branch per issue: `feat/<issue-number>-short-name`, PR closes the issue.
- Secrets live in `.env` (git-ignored); `.env.example` is committed.
- Labels: `epic:E0`…`epic:E8`, `type:infra`, `type:app`, `type:docs`.

---

## E0 – Project setup & tracking
Goal: repo, board, and working agreement for Claude Code.

- **0.1 Create repo and base structure**
  AC: repo with `README.md`, `ROADMAP.md`, `CLAUDE.md`, `.gitignore` (ignores `.env`, data volumes), `.env.example`.
- **0.2 Create GitHub Project board and import issues**
  AC: board with columns Backlog / Ready / In progress / Done; all issues from `create-issues.sh` present.
- **0.3 Install and authenticate `gh` CLI on Mac**
  AC: `gh issue list` works from the repo; Claude Code can read issues.

## E1 – Base stack running locally on Mac
Goal: `docker compose up` gives a working Traefik with one routed test service.

- **1.1 Choose Docker runtime on Mac**
  AC: Docker Desktop, OrbStack or Colima installed; `docker compose version` works.
- **1.2 Compose skeleton with networks**
  AC: `compose.yaml` with `proxy` (external-facing) and `internal` networks; `docker compose config` validates.
- **1.3 Add Traefik v3 with Docker provider**
  AC: Traefik only exposes containers with `traefik.enable=true`; dashboard reachable at `traefik.localhost`.
- **1.4 Docker socket proxy**
  AC: Traefik reads Docker through `docker-socket-proxy` (read-only), not the raw socket.
- **1.5 Test service `whoami` routed by labels**
  AC: `http://whoami.localhost` returns whoami output; route defined only via labels.
- **1.6 Service template + docs**
  AC: `services/_template/compose.yaml` and a README section explaining how to expose a new image (host, port).

## E2 – Domain & Cloudflare Tunnel
Goal: public HTTPS subdomains reach Traefik without opening router ports.

- **2.1 Check ISP setup (CGNAT / public IP)**
  AC: documented result (router WAN IP vs public IP) in `docs/network.md`.
- **2.2 Buy domain and move DNS to Cloudflare**
  AC: domain active in Cloudflare dashboard.
- **2.3 Create remotely-managed tunnel**
  AC: tunnel created; token stored in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
- **2.4 Add `cloudflared` service to compose**
  AC: tunnel shows HEALTHY in Cloudflare; container restarts automatically.
- **2.5 Wildcard route to Traefik**
  AC: public hostname `*.example.dev` → `http://traefik:80`; `whoami.example.dev` works over HTTPS.
  Note: free Cloudflare TLS covers one level only (`a.example.dev`, not `a.b.example.dev`).

## E3 – Dynamic service management (the "dashboard")
Goal: add/expose a container from a UI, without touching Traefik config.

- **3.1 Add Dockge (or Portainer CE)**
  AC: manage compose stacks from a web UI at `dockge.example.dev`.
- **3.2 Protect admin UIs with Cloudflare Access**
  AC: Traefik dashboard and Dockge require login (email OTP) before loading.
- **3.3 Expose a new image end-to-end from the UI**
  AC: from Dockge, deploy any public image with labels (host + port) and reach it over HTTPS in under 5 minutes; steps documented.

## E4 – Data layer
Goal: persistent, private, backed-up database.

- **4.1 Postgres on internal network only**
  AC: no published ports; data in named volume; healthcheck passes.
- **4.2 Private DB access for you**
  AC: connect from Mac via Tailscale (or Cloudflare Access TCP); documented. DB is NOT publicly reachable.
- **4.3 Automated backups**
  AC: daily `pg_dump` to a mounted folder, 7-day retention; restore tested once and documented.

## E5 – CI/CD & multi-arch images
Goal: images built in CI, run on both Mac and PC.

- **5.1 GitHub Actions build with buildx**
  AC: workflow builds `linux/amd64,linux/arm64` images on push to `main`.
- **5.2 Push to GitHub Container Registry (GHCR)**
  AC: images visible under the repo's Packages; tagged `latest` and commit SHA.
- **5.3 Local dev override**
  AC: `compose.override.yaml` builds locally on Mac; production compose pulls from GHCR.

## E6 – Deploy on CachyOS PC
Goal: the same stack running 24/7 on the PC.

- **6.1 Install Docker + Compose, enable on boot**
  AC: `systemctl is-enabled docker` = enabled; user in `docker` group.
- **6.2 Clone repo, configure `.env`, start stack**
  AC: all services healthy; public URLs now served from the PC.
- **6.3 Deploy procedure**
  AC: `scripts/deploy.sh` (git pull + compose pull + up -d) or Watchtower; documented.
- **6.4 Host hardening**
  AC: firewall allows no inbound ports from WAN; SSH key-only; automatic security updates decided and documented.

## E7 – Observability & reliability
Goal: know when something is down.

- **7.1 Uptime Kuma**
  AC: monitors for each public service; notification channel (Telegram/email) works.
- **7.2 Log access**
  AC: documented way to read logs per service (Dozzle or `docker compose logs`).
- **7.3 Restart policies & healthchecks everywhere**
  AC: every service has `restart: unless-stopped` and a healthcheck where possible.

## E8 – First real app + portfolio content
Goal: something worth showing.

- **8.1 Spring Boot API skeleton in `apps/api`**
  AC: Java 21, `/actuator/health`, Dockerfile (multi-stage), built by CI.
- **8.2 Connect API to Postgres with Flyway migrations**
  AC: one entity, migrations run on startup.
- **8.3 Expose at `api.example.dev`**
  AC: reachable over HTTPS via labels only.
- **8.4 Write-up for portfolio**
  AC: blog post / README: "Self-hosting Java + AI projects behind CGNAT with Docker, Traefik and Cloudflare Tunnel".

## Later (not planned yet)
- Custom Spring Boot control panel replacing Dockge for routing config.
- Ollama for local LLM demos (depends on PC GPU).
- Off-site backups.
