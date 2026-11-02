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
Uptime Kuma) are **never** published through the tunnel; they're reached over Tailscale.

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

## Recreate from scratch (new machine or lost credentials)

1. `cf tunnel login`
2. Lost credentials: `cf tunnel delete homelab`, then `cf tunnel create homelab` and put the new ID in
   `cloudflared/config.yml`; re-run the DNS routes.
3. Same credentials on another machine (e.g. the CachyOS PC): copy `data/cloudflared/<id>.json` there
   over SSH. Nothing else changes.
