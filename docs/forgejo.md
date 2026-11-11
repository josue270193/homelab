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
