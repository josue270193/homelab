# Forgejo: self-hosted git (E10)

[Forgejo](https://forgejo.org) replaces GitHub as the home of the code (#119). GitHub stays as a
push mirror (#120). It's the `forgejo` service in `compose.yaml`, image
`codeberg.org/forgejo/forgejo:17.0.1-rootless` (amd64 + arm64, runs as uid 1000).

| | |
|---|---|
| Web UI | `https://git.<domain>` (public, Traefik `public`), `http://git.localhost` (this machine) |
| Git over HTTPS | `https://git.<domain>/<owner>/<repo>.git` (see the 100 MB limit below) |
| Git over SSH | `ssh://git@homelab-db.<tailnet>.ts.net/<owner>/<repo>.git`, **tailnet only** |
| Data | `data/forgejo/` (repos, LFS, avatars, `custom/conf/app.ini` with generated secrets): git-ignored |
| Database | `forgejo` DB + role on the shared Postgres, created by `forgejo-db-init` |
| Health | `GET /api/healthz` (Docker healthcheck + Uptime Kuma) |

## Configuration

Everything is set with `FORGEJO__<section>__<KEY>` variables in `compose.yaml` and written into
`app.ini` on start. `app.ini` itself is never edited by hand and never committed: Forgejo generates
`SECRET_KEY`, `INTERNAL_TOKEN` and `JWT_SECRET` into it on first start, so **losing `data/forgejo`
means losing those secrets** (sessions and 2FA secrets stop working).

Security-relevant settings:

- `INSTALL_LOCK=true`: the web installer is disabled (`/install` is 404); the instance never shows a setup page on the internet.
- `DISABLE_REGISTRATION=true`: no sign-ups. Accounts are created by the admin (below).
- `REQUIRE_SIGNIN_VIEW=false`: public repos are browsable without an account. Private repos stay private.
- OpenID sign-in/sign-up off, `COOKIE_SECURE=true`, emails private by default.
- SSH: Forgejo's built-in SSH server on `:2222` in the container, **not** published on the host. The
  `tailscale` service forwards tailnet port 22 to it (`tailscale/serve.json`).

`.env` (see `.env.example`):

```bash
FORGEJO_DB_PASSWORD=$(openssl rand -hex 24)          # role password; the DB is created automatically
FORGEJO_SSH_DOMAIN=homelab-db.<tailnet>.ts.net       # shown in SSH clone URLs
```

## First start

```bash
# Create the data dir as YOUR user first. If it doesn't exist, Docker creates it as root and the
# rootless container (uid 1000) fails with "mkdir: can't create directory '/var/lib/gitea/git'".
mkdir -p data/forgejo
docker compose up -d forgejo        # also runs forgejo-db-init once
docker compose ps forgejo           # (healthy)

# The first admin. --must-change-password forces a new password at first login.
docker compose exec forgejo forgejo admin user create --admin \
  --username <you> --email <you@example.com> --random-password --must-change-password
```

Then, in the web UI as that user:

1. Change the password (asked automatically), then **Settings → Security → Two-factor authentication**: enable TOTP and keep the recovery code in your password manager.
2. **Settings → SSH / GPG keys**: add the public key of each machine that pushes (Mac, PC).
3. Optional: **Site administration → Configuration** to review the effective settings.

`docker compose restart tailscale` is needed once after `serve.json` changes (port 22).

## Clone and push

```bash
# From any device on the tailnet (SSH, no size limit):
git clone ssh://git@homelab-db.<tailnet>.ts.net/<owner>/<repo>.git

# From anywhere (HTTPS, through Cloudflare): fine for clones and normal pushes
git clone https://git.<domain>/<owner>/<repo>.git
```

**Cloudflare free plan: max 100 MB per request.** Pushes over the public HTTPS URL fail if a single
pack is larger (big first push, large binaries). Use SSH over Tailscale for those, or LFS.

Already hit that error? The dir is empty, so `rmdir data/forgejo && mkdir data/forgejo` (no sudo:
`data/` is yours) and the container recovers on its next restart.

## This repo on Forgejo (#120)

`josue/homelab` was imported with **New migration → GitHub** (full history, issues, labels,
milestones, PRs), then made the source of truth. Remotes on each machine:

```bash
git remote rename origin github      # optional: keep GitHub for reference only
git remote add origin ssh://git@homelab-db.<tailnet>.ts.net/josue/homelab.git
git fetch origin && git branch -u origin/main main
```

- **Push mirror to GitHub:** repo **Settings → Repository → Mirror settings**, remote
  `https://github.com/josue270193/homelab.git`, sync on push plus every 8 h. It authenticates
  with a fine-grained GitHub token (Contents: read and write, this repo only) stored in Forgejo,
  never in git. If the token expires the mirror shows `last_error`: create a new one and update it there.
- **Branch protection on `main`:** no direct pushes, signed commits required. Each committer's
  GPG key must be added under **Settings → SSH / GPG keys** for commits to show as verified.
- **CLI:** `gt` (the Gitea CLI) talks to Forgejo; see CLAUDE.md for the commands.

## CI: Forgejo Actions (#121)

Forgejo has no hosted runners: jobs run on our own `forgejo-runner` (`compose.yaml`). Workflows live
in `.forgejo/workflows/` (Forgejo ignores `.github/` when that dir exists, and GitHub sees no
workflows on the mirror, so CI runs only once).

```
forgejo-runner ──TLS──> runner-dind (its own dockerd, privileged) ──> job containers (network: host)
      │                                                                 │
      └── ci network ── forgejo:3000 (runner API, registry pushes) <────┘
```

- **Never the host socket.** Jobs talk to `runner-dind` over mutual TLS (`DOCKER_HOST` set by the
  runner config); `docker_host: "-"` means no socket is mounted into jobs. The `ci` network has
  egress but no route to `internal`, so jobs can't reach Postgres.
- **Job image:** label `ubuntu-latest` → `ghcr.io/catthehacker/ubuntu:act-24.04-<date>` (docker CLI,
  compose, buildx, node). Bump the pinned date tag like any other image.
- **Actions:** `uses: actions/...` resolves on `data.forgejo.org`, Forgejo's mirror of the common
  actions (`FORGEJO__actions__DEFAULT_ACTIONS_URL`), so CI doesn't need GitHub (#122). Before pinning a
  new action SHA, check it's mirrored:
  `curl -fsI https://data.forgejo.org/api/v1/repos/<owner>/<action>/git/commits/<sha>`.
  `permissions:` blocks are not supported by Forgejo and were removed.
- **Multi-arch:** `docker/setup-qemu-action` registers arm64 binfmt through the privileged DinD (the
  binfmt handlers are kernel-wide, so this also affects the host). BuildKit runs with
  `network=host` inside `runner-dind` so it can resolve `forgejo`.
- **State persists between jobs** (unlike GitHub's throwaway VMs): smoke tests remove their own
  containers, and images/layers accumulate in the `runner-dind` volume. Prune now and then:
  `docker compose exec runner-dind docker system prune -af`.

### Registering the runner

The runner is created through the API (repo-level, so it only serves this repo); the response's
`uuid` and `token` go into `.env` as `FORGEJO_RUNNER_UUID` / `FORGEJO_RUNNER_TOKEN`:

```bash
gt api /repos/josue/homelab/actions/runners -f name=homelab-pc -R josue/homelab   # prints uuid + token once
mkdir -p data/forgejo-runner        # as your user, before the first start
docker compose up -d forgejo-runner # also starts runner-dind
docker compose logs forgejo-runner  # "declared successfully"
```

To rotate the token: delete the runner (**Settings → Actions → Runners**), register a new one and
update `.env`.

### Registry (Forgejo packages)

Images are published to Forgejo's container registry as `josue/homelab-api` and
`josue/homelab-portfolio`.

- **Push (CI):** to `forgejo:3000/josue/...` over plain HTTP inside the `ci` network
  (`--insecure-registry` on `runner-dind`, `http = true` for BuildKit). This bypasses Cloudflare's
  100 MB upload cap; only the small token request goes through `git.<domain>`.
- **Pull (production):** `git.<domain>/josue/homelab-api:${API_TAG:-latest}` in `compose.yaml`. Same
  registry, public hostname; the packages are public like the repo, so no `docker login` is needed.
- **Credential:** repo secret `REGISTRY_TOKEN` = an access token of `josue` with **only**
  `write:package` scope (**Settings → Applications → Generate new token**, then repo **Settings →
  Actions → Secrets**). The automatic job token isn't used for pushes.
- Each image also has a `buildcache` tag (BuildKit layer cache, written on `main`).

## Deploying without GitHub (#122)

A merged change goes live without touching GitHub:

1. PR on Forgejo → CI on `forgejo-runner` (actions from `data.forgejo.org`).
2. Merge (fast-forward) → `api-image` / `portfolio-image` publish to the Forgejo registry.
3. On the PC: `scripts/deploy.sh` pulls `origin` (Forgejo, over Tailscale SSH) and the images from
   `git.<domain>`. It refuses to run if `origin` points at GitHub.

GitHub is only the push mirror: if it is down or the mirror is paused, nothing above changes (the
mirror just shows `last_error` and catches up on the next sync). Remaining third-party pulls are
Docker Hub / Codeberg / `code.forgejo.org` images and, for CI only, the job image
`ghcr.io/catthehacker/ubuntu`, which stays cached in the `runner-dind` volume after its first pull.

## Recovery: the PC is lost

Forgejo itself runs on the PC, so losing it means losing the code host too. The GitHub mirror is the
offsite copy of the code (history up to the last mirror sync; **issues, PRs and packages are not
mirrored**) until offsite backups exist (#126).

1. New machine: follow [docs/host.md](host.md) (Docker, Compose, firewall).
2. Clone from the mirror: `git clone git@github.com:josue270193/homelab.git`; restore `.env` from
   your password manager / backup (it is never in git).
3. Restore data: the Postgres dumps (`forgejo-*.dump`, `homelab-*.dump`) and `data/` from the 10.8
   backups (#126), see Backups below and README "If `data/` is lost". With `data/forgejo` and the
   `forgejo` DB back, Forgejo has its repos, issues and secrets again. Repoint `origin` at it
   (`git remote set-url origin ssh://git@homelab-db.<tailnet>.ts.net/josue/homelab.git`):
   `deploy.sh` refuses a GitHub `origin`.
4. Images: the registry lives in `data/forgejo` too. If it wasn't restored, either build locally
   once (`docker compose -f compose.yaml -f compose.override.yaml build api portfolio` and tag them
   as `git.<domain>/josue/homelab-*:latest`) or push any commit to `main` once the runner is up so CI
   republishes them.
5. Runner: register a new one (above) and update `FORGEJO_RUNNER_UUID` / `FORGEJO_RUNNER_TOKEN`;
   recreate the `REGISTRY_TOKEN` secret if the Forgejo DB was not restored.
6. If Forgejo could not be restored at all: create the instance fresh (First start), push the
   mirror clone to it, then repoint `origin` (Clone and push above).

## Backups

- The `forgejo` database is in the nightly `pg_dump` (`BACKUP_DATABASES` on `postgres-backup`).
- `data/forgejo` (the repositories themselves and `app.ini`) must be backed up with the rest of
  `data/`: offsite backups are #126. Until then, the GitHub push mirror (#120) is the offsite copy
  of the code.
- Restore: stop `forgejo`, restore `data/forgejo`, `pg_restore -d forgejo --clean` the latest
  `forgejo-*.dump`, start `forgejo`.

## Upgrades

Pin a new tag in `compose.yaml` through a PR (read the release notes: major versions can migrate the
DB). Take a backup first (`docker compose exec postgres-backup /bin/sh /pg-backup.sh --once`).
