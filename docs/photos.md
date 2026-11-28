# Photos: Immich (E10)

Photo and video backup from the phone (#124), reachable **only over Tailscale**.

> **Do not import the only copy of any photo until offsite backups (10.8, #126) are done.**
> Until then the library is on a single disk with no copy elsewhere. Keep the originals on the
> phone / Google Photos / wherever they are now, and treat Immich as a second copy.

| | |
|---|---|
| Web UI / app server URL | `https://photos.<domain>` (tailnet only) |
| Services | `immich-server`, `immich-machine-learning` (`ghcr.io/immich-app/*:v3.4.2`, amd64 + arm64), `immich-db-init` (one-shot) |
| Shared | `postgres` (DB + role `immich`, not superuser) and `redis` (Valkey, DB index 0), both on `internal` only |
| Library | `IMMICH_LIBRARY_DIR` in `.env` (default `/srv/homelab/photos`): originals, thumbnails, encoded videos |
| ML models | volume `homelab_immich-model-cache` (re-downloaded if lost) |
| Health | image `HEALTHCHECK`s (`immich-server`: `/api/server/ping`) |
| DB backups | daily `pg_dump` of `immich` by `postgres-backup`, with the other DBs |
| Disk alert | `disk-alert` → Uptime Kuma Push monitor at 80% of `/` (see below) |

## Why tailnet only

Same path as Files ([docs/files.md](files.md#how-it-is-reached-tailnet-only)): `photos.<domain>` has
a DNS-only A record to homelab-db's Tailscale IP, `tailscale` forwards TCP 443 to Traefik's
`tailnet` entrypoint, which has a Let's Encrypt cert (DNS-01). There is no `public` router.

Not through Cloudflare because:

- the free plan rejects request bodies over **100 MB**, and the Immich app uploads each video in
  one request (no chunking), so long videos would fail;
- Cloudflare's terms don't allow serving mostly video/large media through the CDN/tunnel.

Over Tailscale nothing limits the upload size: Traefik has no body limit, and the `tailnet`
entrypoint has no read timeout.

## Shared Postgres and Redis

Immich uses the stack's one `postgres` and one `redis`, like every other app:

- **Postgres** runs Immich's image (`ghcr.io/immich-app/postgres:18-vectorchord1.1.1-pgvector0.8.7`,
  pinned by digest): the official Postgres 18 on Debian plus the VectorChord and pgvector
  extensions Immich needs (smart search, faces), preloaded, with SSD tuning. For Forgejo and the API
  it is plain Postgres 18.
- `immich-db-init` (`scripts/pg-create-db.sh`, like `forgejo-db-init`) creates the `immich` role and
  database, and, as the superuser, the `vchord` and `earthdistance` extensions. The `immich` role is
  **not** a superuser, so it can't touch the other databases. Immich creates the other extensions it
  needs (`pg_trgm`, `unaccent`, `uuid-ossp`) itself as the DB owner.
- **Redis** is Valkey 9.2 on `internal`. Each app gets its own DB number (comment on `redis` in
  `compose.yaml`): Immich uses 0.

What the non-superuser setup costs (upstream calls it "advanced"):

- Immich's **own** DB backup job uses `pg_dumpall` and needs a superuser, so turn it off
  (step 5 below). `postgres-backup` dumps `immich` every night with the other databases instead.
- After a VectorChord upgrade (a new Postgres image tag), run once as the superuser:
  ```bash
  docker compose exec postgres psql -U homelab -d immich -c 'ALTER EXTENSION vchord UPDATE' \
    -c 'REINDEX INDEX face_index' -c 'REINDEX INDEX clip_index'
  ```

## One-off: moving Postgres to the new image (this PR)

The old `postgres` ran `postgres:18.6-alpine3.24`. Its cluster can't just be reopened by the new
(Debian/glibc) image: it was created with collation `en_US.utf8` on musl, which sorts text
differently on glibc, so Forgejo's and the API's text indexes would be silently wrong. So the data
moves by dump and restore into a **new** volume, `homelab_postgres18-data`, with
[`scripts/pg-migrate-vchord.sh`](../scripts/pg-migrate-vchord.sh). The old volume
`homelab_postgres-data` stays untouched for rollback.

**Do not run `scripts/deploy.sh` for this change.** The deploy.sh that pulls it is the old one, and
its `docker compose up -d` would start the new image over the old data. After this change,
deploy.sh refuses to run until the migration is done.

On the PC, from the main checkout, with the old stack running:

```bash
# 1. .env: add IMMICH_LIBRARY_DIR and IMMICH_DB_PASSWORD (step 2 of First setup) first
git pull --ff-only origin main
scripts/pg-migrate-vchord.sh
```

The script stops `api`, `forgejo`, `forgejo-runner` and `postgres-backup` (git is down for about a
minute) and dumps roles + every DB into `backups/postgres/migrate-<ts>/`. Then it **removes** the old
`postgres` container (recreating it would carry the old volume over) and starts the new one on the
empty new volume. Before restoring, it checks the new cluster really is fresh. It restores, compares
exact row counts of every table before and after, and only then starts everything
(`docker compose up -d --wait`). If any check fails it stops, with the apps still down and the old
volume intact.

Rehearsed on a throwaway project: Forgejo-like data restored with equal counts, then Immich v3.4.2
started on the shared DB as non-superuser (migrations, vector indexes, `/api/server/ping`).

On the Mac (dev), run the same script once too if a `homelab_postgres-data` volume exists there
(`docker volume ls`), before `docker compose up`.

Afterwards, check: `git push` works, `https://git.<domain>` loads, the API monitor is green.
Keep the old volume a week or two, then `docker volume rm homelab_postgres-data` and remove its
line from `volumes:` in `compose.yaml`.

### Rollback of the Postgres move

The old volume still holds the data as of the migration (anything written after it is lost):

```bash
docker compose stop api forgejo-runner forgejo postgres-backup immich-server
docker compose rm -f -s postgres
git revert <this merge> && docker compose up -d --remove-orphans   # back to the alpine image on homelab_postgres-data
```

## First setup (PC, once)

1. **Library dir** on the free space (btrfs root for now). Immich runs as root inside the container:
   ```bash
   sudo install -d /srv/homelab/photos
   ```
2. **`.env`** (see `.env.example`). Add these **before** pulling/merging: `docker compose` refuses to
   run without them, and that includes `deploy.sh` and the portfolio auto-deploy. First time only:
   then follow *One-off: moving Postgres* above instead of steps 4 onwards' `up`.
   ```bash
   IMMICH_LIBRARY_DIR=/srv/homelab/photos
   IMMICH_DB_PASSWORD=...        # openssl rand -hex 24 (letters + digits only)
   DISK_ALERT_PUSH_URL=          # step 6
   ```
3. **DNS record** (Cloudflare → `<domain>` → DNS), same IP as `files`:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `photos` | `100.x.y.z` (homelab-db) | **DNS only** (grey cloud) |

   Get the IP with `docker compose exec tailscale tailscale --socket=/tmp/tailscaled.sock ip -4`.
4. Start it from the main checkout:
   ```bash
   docker compose up -d traefik immich-db-init redis immich-machine-learning immich-server disk-alert
   ```
   The first certificate for `photos.` takes ~1 minute (`docker compose logs traefik | grep -i acme`).
5. Open `https://photos.<domain>` on a tailnet device → *Getting started* creates the **admin**
   account (the first user). Then:
   - *Administration → Settings → Server → External domain* = `https://photos.<domain>` (share links).
   - *Administration → Users*: create your own user if the admin is not meant for daily use.
   - *Administration → Settings → Backup*: **turn off** *Database dumps*. They need a superuser
     (`pg_dumpall`) and would only fail; `postgres-backup` already dumps `immich` daily.
6. **Disk alert**: in Uptime Kuma → *Add New Monitor* → type **Push**, name `Disk usage`, heartbeat
   interval **600** s, retries 0. Copy the push URL, replace the host with `uptime-kuma:3001`
   (`http://uptime-kuma:3001/api/push/<token>`), put it in `DISK_ALERT_PUSH_URL`, then
   `docker compose up -d disk-alert`. The monitor turns green within 5 minutes.
7. **Photos monitor** in Uptime Kuma: *HTTP(s) - Keyword*, `https://photos.<domain>/api/server/ping`,
   keyword `pong` (Kuma resolves `photos.<domain>` to Traefik through a network alias, so this also
   checks the certificate).

## Phone app (Android / iOS)

Needs **Tailscale connected** on the phone (Settings → *Always-on VPN* on Android, so background
backup keeps working).

1. Check Tailscale first: the phone's browser must open `https://photos.<domain>` with a valid padlock.
2. Install **Immich** (Play Store / F-Droid / App Store, publisher Immich).
3. Server endpoint URL: `https://photos.<domain>` → log in with your user.
4. Tap the cloud icon (top right) → choose albums (e.g. *Camera*) → *Enable backup*.
   Settings: *Background backup* on; *Wi-Fi only* if you like.
5. Test before relying on it: back up a few photos **and a video over 100 MB** (a ~1 min 4K clip),
   and check both play in the web UI. The app re-tries failed uploads; a failure on the big video
   would show up as stuck in the backup screen (see Troubleshooting).

If you also use OpenCloud's automatic upload ([docs/files.md](files.md#android-phone)), pick one
for photos so they aren't uploaded twice.

## Disk usage alert

`disk-alert` (alpine, [`scripts/disk-alert.sh`](../scripts/disk-alert.sh)) runs `df` every 5 min on
`/` and on `IMMICH_LIBRARY_DIR` (the same disk today; a separate one after a move), and pushes the
result to the Kuma Push monitor:

- every disk below `DISK_ALERT_PERCENT` (default 80): `status=up`, message e.g. `photos 58%, root 58%`;
- any disk at or above it: `status=down`, message `FULL: root 83% >= 80% | ...` → Telegram alert;
- no push for 10 min (container stopped): Kuma marks it down too.

It runs as `nobody` with `/` and the library mounted read-only, no capabilities, read-only rootfs,
and only `df` (statfs) touches them. Try it once by hand: `docker compose run --rm disk-alert --once`
(add `-e DISK_ALERT_PERCENT=1` to see an alert).

On btrfs, `df` is approximate (metadata, snapshots). If it says ~80% but `btrfs filesystem usage /`
shows plenty unallocated, it is still a good moment to clean up or move the library.

## Moving the library to a bigger disk later

1. `docker compose stop immich-server immich-machine-learning`
2. Copy, keeping everything: `sudo rsync -aHAX --info=progress2 /srv/homelab/photos/ /mnt/big/photos/`
3. Set `IMMICH_LIBRARY_DIR=/mnt/big/photos` in `.env`, then `docker compose up -d immich-server disk-alert`.
4. Check a few photos and videos open, then delete the old copy.

Paths inside the container stay `/data/...`, so the database needs no change.

## Backups (10.8, #126)

Back up, together:

- `IMMICH_LIBRARY_DIR`: the originals. `thumbs/` and `encoded-video/` can be skipped, Immich
  regenerates them.
- The `immich` DB dumps in `backups/postgres/` (same night as the library copy, ideally). Without
  the DB, the library is just files: albums, faces, people and edits live in the DB.

Restore: create the DB with `immich-db-init`, then `pg_restore -U homelab -d immich <dump>`
([upstream guide](https://docs.immich.app/administration/backup-and-restore)).

## Upgrading

Immich moves fast and sometimes needs migration steps. To bump:

1. Read the release notes from the current version up to the new one.
2. Download that release's `docker-compose.yml`: copy the server + machine-learning tag into
   `compose.yaml`. If its Postgres image has a newer VectorChord than ours, bump `postgres` too
   (all four services that use that image), then run the `ALTER EXTENSION vchord UPDATE` above.
3. `docker compose pull immich-server immich-machine-learning && docker compose up -d immich-server immich-machine-learning`.

Keep the server and machine-learning tags equal.

## Troubleshooting

- **App: "Server not reachable"**: Tailscale on? `dig +short photos.<domain>` must show the `100.x` IP.
- **Certificate error**: `docker compose logs traefik | grep -i acme` (`CF_DNS_API_TOKEN`, see docs/files.md).
- **Big video stuck in the app**: `docker compose logs immich-server | grep -i upload`. Check you are
  on the tailnet URL, not a Cloudflare one (there is none, by design).
- **Smart search / faces empty**: models download on first use; `docker compose logs immich-machine-learning`.
- **Server won't start, DB errors**: `docker compose logs immich-db-init immich-server`. Changing
  `IMMICH_DB_PASSWORD` is fine: `immich-db-init` sets the role's password on every start.
- **"vchord version not supported"** after an image bump: run the `ALTER EXTENSION vchord UPDATE` above.
