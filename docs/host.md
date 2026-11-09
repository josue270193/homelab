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
