# Files: OpenCloud + Euro-Office (E10)

Self-hosted file storage and sync (#125), reachable **only over Tailscale**. Word, Excel and
PowerPoint files open and edit in the browser through Euro-Office.

| | |
|---|---|
| Web UI / sync URL | `https://files.<domain>` (tailnet only) |
| Office editor | `https://office.<domain>` (tailnet only, opened by OpenCloud, not used directly) |
| Services | `opencloud` (`opencloudeu/opencloud-rolling:9.1.0`), `euro-office` (`ghcr.io/euro-office/documentserver:v9.3.7-1`), both amd64 + arm64 |
| Files | `OPENCLOUD_DATA_DIR` in `.env` (default `/srv/homelab/files`), owned by uid 1000 |
| Config + generated secrets | `data/opencloud/config/opencloud.yaml` (git-ignored, **keep it**) |
| TLS certs | `data/traefik/acme.json` (Let's Encrypt, git-ignored, contains private keys) |
| Database | none: OpenCloud keeps metadata on disk next to the files (no Postgres needed) |
| Health | `opencloud`: `:9205/healthz`; `euro-office`: `/hosting/discovery` (Docker healthchecks) |

## Why OpenCloud + Euro-Office

The issue asked for Nextcloud vs Seafile. We picked neither:

- **OpenCloud** (Go, fork of ownCloud Infinite Scale): one container, no database, no PHP, no
  Redis. Desktop, Android and iOS sync apps. Lighter than Nextcloud, and unlike Seafile it has
  built-in office integration (WOPI).
- **Euro-Office** (European fork of ONLYOFFICE): best fidelity for `.docx`/`.xlsx`/`.pptx`, which
  was the requirement. Collabora is the officially supported alternative, with better `.odt` support.

**Caveat:** OpenCloud lists Euro-Office as a *community* integration, not officially supported, and
the project is young ([docs](https://docs.opencloud.eu/docs/admin/configuration/euro-office)). If it
misbehaves, swap the `euro-office` service for Collabora (`collabora/code`) and set
`COLLABORATION_APP_NAME=Collabora`, `COLLABORATION_APP_PRODUCT=Collabora`. Files are unaffected.

`opencloud-rolling` is the line upstream's compose uses (new features every few weeks). The
`opencloudeu/opencloud` image is the slower production line. Read the release notes before bumping.

## How it is reached (tailnet only)

```
phone/laptop (on Tailscale)
  └─ https://files.<domain> ── DNS: A record = homelab-db's Tailscale IP (100.x)
       └─ tailscale (serve.json: TCP 443 → traefik:443, TLS untouched)
            └─ traefik entrypoint `tailnet` (:443, Let's Encrypt cert) ── Host() → opencloud:9200
                                                                         └→ euro-office:80
```

- The names are in **public** DNS but point to a `100.x` address that only tailnet devices can
  route to. From the internet they lead nowhere. There is also no `public` router for them, so even
  a request through the tunnel would get a 404.
- Certificates come from Let's Encrypt by **DNS-01** (Traefik writes a TXT record with
  `CF_DNS_API_TOKEN`), because Let's Encrypt can't reach a tailnet IP over HTTP.
- Inside Docker, `files.<domain>` and `office.<domain>` are network aliases of `traefik` on the
  `proxy` network. OpenCloud and Euro-Office call each other (WOPI, OIDC discovery) at the same
  `https://` URLs as the browser, with the same valid certificate.
- Big uploads: OpenCloud uploads in chunks (TUS), and the `tailnet` entrypoint has no read timeout.
  Cloudflare's 100 MB limit doesn't apply: no traffic goes through Cloudflare.

## First setup (PC, once)

1. **Data dir** on the free space, owned by the container user (uid 1000):
   ```bash
   sudo install -d -o 1000 -g 1000 /srv/homelab/files
   install -d data/opencloud/config        # as your user (uid 1000); Docker would create it as root
   ```
2. **Secrets** in `.env` (see `.env.example`):
   ```bash
   OPENCLOUD_ADMIN_PASSWORD=$(openssl rand -base64 18)   # login of user `admin`, first start only
   OPENCLOUD_DATA_DIR=/srv/homelab/files
   EURO_OFFICE_JWT_SECRET=$(openssl rand -hex 32)
   CF_DNS_API_TOKEN=...                                  # step 3
   ```
3. **Cloudflare API token**: dashboard → My Profile → API Tokens → Create Token → template
   *Edit zone DNS* → Zone Resources: *Include / Specific zone / `<domain>`* only. Copy it into
   `CF_DNS_API_TOKEN`. It can only edit DNS of this zone.
4. **DNS records** (Cloudflare → `<domain>` → DNS), with the IP of the `homelab-db` node:
   ```bash
   docker compose exec tailscale tailscale --socket=/tmp/tailscaled.sock ip -4   # 100.x.y.z
   ```
   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `files` | `100.x.y.z` | **DNS only** (grey cloud) |
   | A | `office` | `100.x.y.z` | **DNS only** (grey cloud) |

   These beat the `*` wildcard that points to the tunnel. Never set them to *Proxied*.
5. Start it from the main checkout: `docker compose up -d traefik tailscale opencloud euro-office`.
   The first certificate takes ~1 minute (`docker compose logs traefik | grep -i acme`).
6. Open `https://files.<domain>` on a tailnet device and log in as `admin`. Create your own user
   under *Admin settings → Users* and use it instead of `admin` day to day.

Changing `OPENCLOUD_ADMIN_PASSWORD` later does nothing: change the password in the web UI.

## Clients

All clients need **Tailscale connected** on the device: without it the names don't resolve to
anything reachable.

### Android phone

1. Install **Tailscale** (Play Store / F-Droid), log in with the same account as the homelab, and
   switch it on. Optional: Tailscale → Settings → *Always-on VPN* so sync keeps working in the background.
2. Check it: in the phone's browser open `https://files.<domain>`. You should see the OpenCloud
   login page with a valid padlock.
3. Install the **OpenCloud** app (Play Store: "OpenCloud", publisher OpenCloud GmbH; also on F-Droid).
4. Open it → server address `https://files.<domain>` → *Log in*. A browser tab opens the OpenCloud
   login page; sign in with your user. The app returns with your files.
5. Optional, automatic upload: app menu → *Settings* → *Automatic uploads* (pictures/videos),
   choose a destination folder and *Wi-Fi only* if you like. Photos are also planned in Immich
   (#124); pick one so they aren't uploaded twice.
6. Office files: tap a `.docx`/`.xlsx` to download and open it in any installed office app, or edit
   it in place in the phone's browser at `https://files.<domain>` (opens Euro-Office).

Mark folders *Available offline* in the app to keep them synced on the phone.

### Desktop (Mac / PC)

Install **OpenCloud Desktop** (<https://opencloud.eu/en/download>, macOS / Linux / Windows), add the
account `https://files.<domain>`, log in in the browser and choose the folders to sync.

### Office documents in the browser

In the web UI, click a `.docx`, `.xlsx` or `.pptx` file (or *New → Microsoft Word document*). It
opens in Euro-Office in the same tab, saves back to OpenCloud automatically, and several people
can edit at once.

## Monitoring

Uptime Kuma (on `proxy`) resolves the same aliases, so add two HTTP monitors:

- `https://files.<domain>/` → 200
- `https://office.<domain>/hosting/discovery` → 200

They also catch an expired certificate (Traefik renews 30 days before expiry).

## Backups (10.8, #126)

Back up, together:

- `OPENCLOUD_DATA_DIR` (files **and** metadata: they only make sense together),
- `data/opencloud/config/` (generated secrets: without them the data dir can't be decrypted/used),
- `data/traefik/acme.json` (optional, certs are re-issued automatically).

Stop `opencloud` for a consistent copy, or snapshot the btrfs subvolume. Euro-Office is stateless.

## Troubleshooting

- **Browser can't reach `files.<domain>`**: is Tailscale on? `dig +short files.<domain>` must show
  the `100.x` IP. Check `docker compose logs tailscale` and that `serve.json` has port 443.
- **Certificate error**: `CF_DNS_API_TOKEN` missing or wrong scope → `docker compose logs traefik | grep -i acme`.
- **"Open in Euro-Office" missing or editor shows an error**: `docker compose logs opencloud | grep -i collaboration`.
  The collaboration service must reach `https://office.<domain>/hosting/discovery`:
  `docker compose exec opencloud curl -sI https://office.<domain>/hosting/discovery`.
- **Editor opens but can't load/save the file**: Euro-Office must reach `https://files.<domain>`:
  `docker compose exec euro-office curl -sI https://files.<domain>/`. Check that `EURO_OFFICE_JWT_SECRET` is set.
- **Permission denied on start**: the data dir or `data/opencloud/config` is owned by root, so
  `chown -R 1000:1000` it.
