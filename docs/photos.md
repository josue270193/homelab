# Photos: Immich (E10)

Photo and video backup from the phone (#124), reachable **only over Tailscale**.

> **Do not import the only copy of any photo until offsite backups (10.8, #126) are done.**
> Until then the library is on a single disk with no copy elsewhere. Keep the originals on the
> phone / Google Photos / wherever they are now, and treat Immich as a second copy.

| | |
|---|---|
| Web UI / app server URL | `https://photos.<domain>` (tailnet only) |
| Services | `immich-server`, `immich-machine-learning` (`ghcr.io/immich-app/*:v3.4.2`), `immich-postgres` (Immich's Postgres 14 + VectorChord, pinned by digest), `immich-redis` (`valkey/valkey:9.2.1-alpine3.24`), all amd64 + arm64 |
| Library | `IMMICH_LIBRARY_DIR` in `.env` (default `/srv/homelab/photos`): originals, thumbnails, encoded videos, DB dumps |
| Database | volume `homelab_immich-db-data`, on `internal` only (no port, no egress) |
| ML models | volume `homelab_immich-model-cache` (re-downloaded if lost) |
| Health | image `HEALTHCHECK`s (`immich-server`: `/api/server/ping`), `valkey-cli ping` |
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

## Why its own Postgres

Immich needs the VectorChord extension (smart search, face recognition) and supports only the
Postgres versions in its own image. The shared `postgres` (18, plain) has neither, so Immich gets
`immich-postgres`, pinned to the exact image + digest upstream ships with v3.4.2. It is only on
`internal`, like every database here.

## First setup (PC, once)

1. **Library dir** on the free space (btrfs root for now). Immich runs as root inside the container:
   ```bash
   sudo install -d /srv/homelab/photos
   ```
2. **`.env`** (see `.env.example`). Add these **before** pulling/merging: `docker compose` refuses to
   run without them, and that includes `deploy.sh` and the portfolio auto-deploy.
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
   docker compose up -d traefik immich-postgres immich-redis immich-machine-learning immich-server disk-alert
   ```
   The first certificate for `photos.` takes ~1 minute (`docker compose logs traefik | grep -i acme`).
5. Open `https://photos.<domain>` on a tailnet device → *Getting started* creates the **admin**
   account (the first user). Then:
   - *Administration → Settings → Server → External domain* = `https://photos.<domain>` (share links).
   - *Administration → Users*: create your own user if the admin is not meant for daily use.
   - *Administration → Settings → Backup*: database dumps are on by default (daily, keep 14) into
     `IMMICH_LIBRARY_DIR/backups/`. Leave them on.
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

- `IMMICH_LIBRARY_DIR` (originals **and** `backups/` with Immich's daily DB dumps). Thumbnails
  (`thumbs/`) and `encoded-video/` can be skipped: Immich regenerates them.
- The DB itself is covered by those dumps; the `homelab_immich-db-data` volume does not need a
  file-level copy (restore: [upstream guide](https://docs.immich.app/administration/backup-and-restore)).

## Upgrading

Immich moves fast and sometimes needs migration steps. To bump:

1. Read the release notes from the current version up to the new one.
2. Download that release's `docker-compose.yml` and copy its image tags into `compose.yaml`
   (server, machine-learning, **and** the Postgres image + digest, Valkey major).
3. `docker compose pull immich-server immich-machine-learning immich-postgres && docker compose up -d immich-server`.

Keep the server and machine-learning tags equal.

## Troubleshooting

- **App: "Server not reachable"**: Tailscale on? `dig +short photos.<domain>` must show the `100.x` IP.
- **Certificate error**: `docker compose logs traefik | grep -i acme` (`CF_DNS_API_TOKEN`, see docs/files.md).
- **Big video stuck in the app**: `docker compose logs immich-server | grep -i upload`. Check you are
  on the tailnet URL, not a Cloudflare one (there is none, by design).
- **Smart search / faces empty**: models download on first use; `docker compose logs immich-machine-learning`.
- **Server won't start, DB errors**: `docker compose logs immich-postgres`. The password only applies when
  the volume is first created; changing `IMMICH_DB_PASSWORD` later breaks the login (`ALTER USER` instead).
