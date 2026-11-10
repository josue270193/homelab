# Production host: CachyOS PC

The stack runs 24/7 on a CachyOS (Arch-based) PC, `x86_64`. This page covers host setup.
Starting the stack is in the README ([Dev vs production](../README.md#dev-mac-vs-production-pc)).

## Docker + Compose

```sh
sudo pacman -S --needed docker docker-compose docker-buildx
sudo systemctl enable --now docker   # start now and on every boot
sudo usermod -aG docker "$USER"      # then log out and back in
```

`docker-compose` is the Compose v2 plugin (`docker compose ...`), not the old Python tool.

### Check

```sh
systemctl is-enabled docker   # enabled
id -nG | grep -w docker       # your user is in the group
docker compose version        # plugin found
docker info --format '{{.ServerVersion}} {{.Architecture}}'   # x86_64
```

Verified on 2026-11-10: Docker 29.7.2, Compose 5.7.0, buildx 0.36.0, cgroup driver `systemd`.

Being in the `docker` group is effectively root on this machine; only trusted users belong in it.

## Start the stack

First start on a new PC (production since 2026-11-10):

1. Clone the repo, then copy `.env` from the old machine (or fill it from `.env.example`). The
   production-only values are `COMPOSE_FILE=compose.yaml`, so the PC pulls the CI images from GHCR
   and never builds; `TRAEFIK_HTTP_PORT=80`; and `STACKS_DIR` set to this clone's absolute
   `services/` path. Then `chmod 600 .env`.
2. Copy the tunnel credentials `data/cloudflared/<tunnel-id>.json` over, then give them to the
   container user: `sudo chown 65532:65532 data/cloudflared/*.json` (see [tunnel.md](tunnel.md)).
3. **Stop the stack on any other machine** (`docker compose down`): two connectors on the same
   tunnel split traffic between them.
4. Start everything:

   ```sh
   docker compose config --format json | grep -q '"build"' && echo dev || echo prod   # prod
   docker compose pull && docker compose up -d
   docker compose ps          # every service with a healthcheck: (healthy)
   ```

5. Tailscale: with no `TS_AUTHKEY`, open the login URL from `docker compose logs tailscale` once.
   Remove the old machine's `homelab-db` device first so the name stays the same.

### Prove the public URLs come from this PC

```sh
curl -s https://whoami.josuedev.dpdns.org/ | grep Hostname   # equals...
docker compose ps -q whoami | cut -c1-12                        # ...this container ID
```
