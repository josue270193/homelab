# homelab

Self-hosted Docker stack. Developed on a MacBook (arm64), runs 24/7 on a CachyOS PC (amd64),
published to the internet through Cloudflare Tunnel → Traefik v3 (no open router ports).

```
Internet ──> Cloudflare (DNS, TLS, Access)
               │  outbound tunnel
               ▼
         cloudflared ──> Traefik (routes from Docker labels) ──> services
         internal network only: postgres, docker-socket-proxy
```

## Docs

- [ROADMAP.md](ROADMAP.md) – epics, issues and acceptance criteria.
- [CLAUDE.md](CLAUDE.md) – working agreement for Claude Code (branching, rules).
- Work is tracked in GitHub Issues: `gh issue list`.
- Board: [Homelab project](https://github.com/users/josue270193/projects/2) with Status columns
  **Backlog → Ready → In progress → Done**. New issues from `./create-issues.sh` land there when run
  with `PROJECT="Homelab"` (needs `gh auth refresh -s project`).

## Getting started

Prerequisites on the Mac: [GitHub CLI](https://cli.github.com/) authenticated with the `project`
scope (needed for the board and `create-issues.sh`):

```bash
brew install gh
gh auth login            # GitHub.com, SSH
gh auth refresh -s project
gh issue list            # should list the repo's issues
```

Docker runtime on the Mac: **Docker Desktop** (Compose v2 plugin and buildx included; free for
personal use). It runs amd64 images under emulation, so both target architectures can be tested locally:

```bash
docker compose version                                   # Docker Compose version v5.x
docker run --rm --platform linux/amd64 alpine:3.20 uname -m   # x86_64
docker run --rm --platform linux/arm64 alpine:3.20 uname -m   # aarch64
```

Then:

```bash
git clone git@github.com:josue270193/homelab.git
cd homelab
cp .env.example .env   # fill in real values; .env is git-ignored
```

The Compose stack lives in `compose.yaml` (services are added through epic E1, see ROADMAP.md):

```bash
docker compose config   # validate
docker compose up -d
```

## Networks

| Network    | Purpose                                              | Internet egress |
|------------|------------------------------------------------------|-----------------|
| `proxy`    | Traefik and every service it routes to               | yes             |
| `internal` | Databases, docker-socket-proxy (`internal: true`)    | **no**          |

- Both have fixed names, so other stacks (Dockge, `services/*`) join them with `external: true`.
- A service on `internal` only cannot reach the internet. If it needs to (e.g. an API calling
  external APIs), it also joins `proxy`; add that on purpose, not by default.

## Services

| Service               | Network    | Notes |
|-----------------------|------------|-------|
| `traefik`             | `proxy`, `internal` | Reverse proxy, entrypoint `web` (:80) published on `127.0.0.1` only. Dashboard at <http://traefik.localhost/dashboard/> (no auth, so loopback only; Cloudflare Access in #16). Reads Docker via `docker-socket-proxy`, never the socket. `exposedbydefault=false`: a container is routed only with `traefik.enable=true`. |
| `whoami`              | `proxy`    | Test service at <http://whoami.localhost>; echoes the request. Route defined only by its labels (`traefik.enable`, router rule, service port). |
| `docker-socket-proxy` | `internal` | Read-only Docker API at `tcp://docker-socket-proxy:2375` for Traefik. Allows containers, networks, events, version, ping; denies everything else and all writes (HTTP 403). Socket mounted `:ro`, no published ports. |

Nothing besides `docker-socket-proxy` mounts `/var/run/docker.sock`. If a new service needs
another Docker API section, enable only that variable on the proxy (see
[tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy#grant-or-revoke-access-to-certain-api-sections)).

Notes:
- Traefik ignores a container until its healthcheck passes; a labeled service with a healthcheck
  returns 404 while `health: starting`.
- Port 80 on the Mac must be free; stop any other local stack serving `http://localhost` first.

## Repository rules

- Secrets only in `.env` (git-ignored). Keep `.env.example` in sync when adding variables.
- Service data (bind mounts under `data/`, `volumes/`, `backups/`) is git-ignored.
- Databases are never published; they live only on the `internal` network.
- Services are exposed only through Traefik labels.
