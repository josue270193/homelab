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
- [docs/network.md](docs/network.md) – home network check: IPv4 is behind CGNAT, hence Cloudflare Tunnel.
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
# set a real POSTGRES_PASSWORD, e.g.:
sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
```

`.env` is required: without `POSTGRES_PASSWORD`, `docker compose` refuses to run.

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
| `dockge`              | `proxy`    | Stack manager UI at <http://dockge.localhost> (`louislam/dockge:1.5.0`). Manages the stacks in `services/`. Mounts the raw Docker socket (exception, see below). |
| `whoami`              | `proxy`    | Test service at <http://whoami.localhost>; echoes the request. Route defined only by its labels (`traefik.enable`, router rule, service port). |
| `postgres`            | `internal` | `postgres:18.6-alpine3.24`. No published ports, no internet egress. Named volume `postgres-data`, `pg_isready` healthcheck. Password required from `.env`. See below. |
| `postgres-backup`     | `internal` | Daily `pg_dump` to `./backups/postgres`, 7-day retention. See below. |
| `docker-socket-proxy` | `internal` | Read-only Docker API at `tcp://docker-socket-proxy:2375` for Traefik. Allows containers, networks, events, version, ping; denies everything else and all writes (HTTP 403). Socket mounted `:ro`, no published ports. |

Only `docker-socket-proxy` (read-only) and `dockge` (read-write, see below) mount
`/var/run/docker.sock`. If a new service needs another Docker API section, enable only that
variable on the proxy (see
[tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy#grant-or-revoke-access-to-certain-api-sections)).

### Postgres

- Reachable only as `postgres:5432` from containers on `internal`; no host or LAN port.
- Data in the named volume `homelab_postgres-data` (mounted at `/var/lib/postgresql`, as Postgres 18+ expects).
- `POSTGRES_*` from `.env` are applied **only when the volume is first created**. Changing the
  password later in `.env` does nothing; change it inside the DB (`ALTER USER ...`) instead.
- Shell into it: `docker compose exec postgres psql -U homelab -d homelab`.

### Postgres backups

`postgres-backup` runs [`scripts/pg-backup.sh`](scripts/pg-backup.sh) in the same Postgres image:
one `pg_dump -Fc` per day at `BACKUP_TIME` (default 03:00, `TZ` from `.env`) into
`./backups/postgres/` (git-ignored), deleting dumps older than `BACKUP_KEEP_DAYS` (default 7).
A failed dump leaves no file and is logged as `backup FAILED`; the container turns **unhealthy**
when the last successful dump is older than 26 h.

```bash
docker compose logs postgres-backup                          # schedule + results
docker compose exec postgres-backup sh /pg-backup.sh --once  # backup now
ls -lh backups/postgres/
```

**Restore** (tested: 1000/1000 rows recovered into a fresh DB). Restore into a new DB first, check it,
then swap. Never restore over the live DB blindly:

```bash
DUMP=homelab-YYYYmmdd-HHMMSS.dump                       # pick one from backups/postgres/
docker compose exec postgres createdb -U homelab homelab_restore
docker compose exec postgres-backup pg_restore -d homelab_restore --no-owner /backups/$DUMP
docker compose exec postgres psql -U homelab -d homelab_restore -c '\dt'   # check
```

To replace the live DB with it: stop the apps using it, then in `psql -U homelab -d postgres`:
`DROP DATABASE homelab; ALTER DATABASE homelab_restore RENAME TO homelab;`

Backups live on the same disk as the DB, so they protect against mistakes, not disk loss
(off-site copies are in "Later" in ROADMAP.md).

Notes:
- Traefik ignores a container until its healthcheck passes; a labeled service with a healthcheck
  returns 404 while `health: starting`.
- Port 80 on the Mac must be free; stop any other local stack serving `http://localhost` first.

### Restart and health policy

Every service has `restart: unless-stopped` (comes back after a crash or reboot, but not after
`docker compose stop` / `docker kill`) and a health check:

| Service | Health check |
|---|---|
| `traefik` | `traefik healthcheck --ping` |
| `docker-socket-proxy` | `wget /_ping` (checks proxy **and** Docker daemon) |
| `postgres` | `pg_isready` |
| `postgres-backup` | last successful dump < 26 h old |
| `dockge` | image's `extra/healthcheck` |
| `whoami` | **Traefik** probes `/health` every 10 s (image is `FROM scratch`, no Docker healthcheck possible); on failure Traefik returns 503 |

New services: add a Docker `healthcheck` with `start_interval: 2s` (Traefik won't route to a
container until it is healthy). Images without a shell use Traefik's
`loadbalancer.healthcheck.path` label instead. Both options are in `services/_template`.
`docker compose ps` shows the state of each.

## Expose a new image

Each extra service is its own stack under `services/<name>/`, joined to the shared `proxy` network.
You only decide two things: the **host** (subdomain) and the **container port** the app listens on.

```bash
cp -r services/_template services/myapp
```

Edit `services/myapp/compose.yaml` (lines marked `CHANGE`):

| Field | Example | Notes |
|---|---|---|
| `name:` | `myapp` | Stack name, unique. |
| `image:` | `ghcr.io/me/myapp:1.2.3` | Pinned tag with amd64 + arm64. |
| router rule | `traefik.http.routers.myapp.rule: Host(\`myapp.${DOMAIN:-localhost}\`)` | The host. Router name (`myapp`) must be unique across all stacks. |
| service port | `traefik.http.services.myapp.loadbalancer.server.port: "8080"` | Port **inside** the container, not a host port. |

Start it (main stack must already be up, it owns the `proxy` network):

```bash
cd services/myapp
docker compose --env-file ../../.env up -d
curl -I http://myapp.localhost
```

- `--env-file ../../.env` gives it `DOMAIN` and secrets; without it the host falls back to `*.localhost`.
- Never add `ports:`; Traefik is the only way in.
- Needs a database? Also join `internal` (uncomment it in both places).
- `network proxy declared as external, but could not be found` → start the main stack first.

### From the UI (Dockge)

Open <http://dockge.localhost>. The first visit asks you to create the admin account.
Dockge lists every folder in `services/` as a stack (`_template` included) and can create, edit,
deploy and stop them. Stacks created in the UI are written to `services/<name>/compose.yaml`, so
they show up in `git status`: commit them through a PR like anything else.

- Dockge does not load the root `.env` (no `--env-file ../../.env`). Put the variables a stack
  needs in its own `services/<name>/.env` (git-ignored), or rely on defaults such as `${DOMAIN:-localhost}`.
- The main stack (repo root `compose.yaml`: Traefik, Postgres, Dockge itself) is **not** in
  `services/`, so it can't be stopped from the UI by mistake. Manage it from the terminal.

**Security exception.** Dockge mounts the Docker socket read-write: it has to create, stop and
remove containers, which is root-equivalent on the host whether or not a proxy sits in between.
Mitigations: only Dockge has it (Traefik keeps the read-only proxy), its own login, and it's reachable
only on `127.0.0.1` until Cloudflare Access protects it (#16). `STACKS_DIR` in `.env` must be the
absolute path to `services/`, because Dockge mounts it at the same path inside the container.
Dockge's last release is 1.5.0 (Mar 2025); revisit if it stays unmaintained.

## Repository rules

- Secrets only in `.env` (git-ignored). Keep `.env.example` in sync when adding variables.
- Service data (bind mounts under `data/`, `volumes/`, `backups/`) is git-ignored.
- Databases are never published; they live only on the `internal` network.
- Services are exposed only through Traefik labels.
