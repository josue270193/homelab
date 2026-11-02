# Cloudflare Tunnel

| | |
|---|---|
| Tunnel | `homelab`, ID `b220f235-2216-46a0-b12b-b82a505e06f1` |
| Type | **locally-managed** (created with the `cloudflared` CLI) |
| Routes | [`cloudflared/config.yml`](../cloudflared/config.yml), in git |
| Credentials | `data/cloudflared/<tunnel-id>.json` (secret, git-ignored, `600`) |

## Why locally-managed

The ROADMAP planned a remotely-managed tunnel (token from the Zero Trust dashboard). Signing up for
Zero Trust asks for a payment method even on the Free plan, so the tunnel was created from the CLI
instead. The tunnel itself is free either way. Bonus: routes are code (reviewed in PRs), not dashboard clicks.

Cloudflare Access is a Zero Trust feature, so it isn't used. Admin UIs (Dockge, Traefik dashboard,
Uptime Kuma) are **never** published through the tunnel; they're reached over Tailscale
(README → Private access).

## Files

```
cloudflared/config.yml                 # tunnel ID + ingress rules (public, versioned)
data/cloudflared/<tunnel-id>.json      # tunnel credentials: lets anyone run this tunnel. SECRET
data/cloudflared/cert.pem              # account cert from `tunnel login`. SECRET, see below
```

`cert.pem` can create/delete tunnels and DNS records in the zone. Running the tunnel doesn't need it,
only creating tunnels and DNS routes does. Delete it once routes are set up, and re-run `tunnel login`
when you need it again.

## Commands

All through Docker, no install needed:

```bash
cf() { docker run --rm -v "$PWD/data/cloudflared:/home/nonroot/.cloudflared" cloudflare/cloudflared:2026.10.4 "$@"; }

cf tunnel login                      # browser: authorize josuedev.dpdns.org (writes cert.pem)
cf tunnel list                       # tunnels and their connections
cf tunnel info homelab               # connectors (after #13)
cf tunnel route dns homelab <host>   # CNAME <host> -> <id>.cfargotunnel.com (needs cert.pem)

# Validate routes before a PR
docker run --rm -v "$PWD/cloudflared/config.yml:/etc/cloudflared/config.yml:ro" \
  cloudflare/cloudflared:2026.10.4 tunnel --config /etc/cloudflared/config.yml ingress validate
```

## Public vs private (#14)

```
Internet ──HTTPS──> Cloudflare (*.josuedev.dpdns.org, wildcard cert)
                      │ tunnel
                      ▼
               cloudflared ──> traefik:8000  (entrypoint `public`, not published on the host)
                                  └─ only routers with entrypoints=public answer; everything else 404

Mac browser ──> 127.0.0.1:${TRAEFIK_HTTP_PORT} ──> traefik:80 (entrypoint `web`): all local routers
```

- DNS: one proxied wildcard `CNAME *.josuedev.dpdns.org → <tunnel-id>.cfargotunnel.com`
  (`cf tunnel route dns homelab '*.josuedev.dpdns.org'`). The apex has no record.
- Ingress: `*.josuedev.dpdns.org → http://traefik:8000`, anything else `http_status:404`.
- **To make a service public**, give it a second router on `public` with rule ``Host(`<sub>.${DOMAIN}`)``
  (see `whoami-public` in `compose.yaml` and the commented block in `services/_template`).
  No tunnel or DNS change is needed for new subdomains.
- **Never** put admin UIs (Traefik dashboard, Dockge, Uptime Kuma) on `public`: they have no auth.
- After editing `cloudflared/config.yml`: `docker compose restart cloudflared` (it reads the file only at start).
- Mac and PC must not both run `cloudflared` with these credentials: Cloudflare would split public
  traffic between them. Stop it on the Mac once the PC serves the tunnel (#25).

## Running (#13)

The `cloudflared` service in `compose.yaml` runs the tunnel: outbound only, on `proxy`, config and
credentials mounted read-only, metrics on the container's `127.0.0.1:20241` only.

| Check | How |
|---|---|
| Container health | `docker compose ps cloudflared` → `healthy` (`cloudflared tunnel ready`: ≥1 edge connection) |
| Edge connections | `docker compose logs cloudflared \| grep "Registered tunnel connection"` (normally 4) |
| From Cloudflare's side | `cf tunnel info homelab` → one connector, `2x<colo>, 2x<colo>` |

**Linux (CachyOS PC):** the container runs as uid `65532`, and the credentials file is `600`. On the Mac,
Docker Desktop hides this; on Linux the container can't read it. Before the first start there:

```bash
sudo chown 65532:65532 data/cloudflared/*.json
```

## Recreate from scratch (new machine or lost credentials)

1. `cf tunnel login`
2. Lost credentials: `cf tunnel delete homelab`, then `cf tunnel create homelab` and put the new ID in
   `cloudflared/config.yml`; re-run the DNS routes.
3. Same credentials on another machine (e.g. the CachyOS PC): copy `data/cloudflared/<id>.json` there
   over SSH. Nothing else changes.
