# Self-hosting Java + AI projects behind CGNAT with Docker, Traefik and Cloudflare Tunnel

*November 2026 · how [josuedev.dpdns.org](https://josuedev.dpdns.org) and
[api.josuedev.dpdns.org](https://api.josuedev.dpdns.org/actuator/health) run from a PC at home*

I wanted a place to run my own projects: a Spring Boot API, a portfolio site, and whatever comes
next, including AI experiments. I didn't want a cloud bill for side projects. I have a desktop PC
that's on most of the day anyway. The catch: my home connection sits behind **CGNAT**, so the
internet can't open a connection to it at all.

This post covers how the stack works, the decisions that mattered, and what I'd do the same way again.
Everything is in the [homelab repo](https://github.com/josue270193/homelab).

## The problem: no inbound connections

The usual way to self-host is port forwarding: open 443 on the router, point it at the server, and
set DNS to your home IP. A traceroute ended that plan quickly. The first hop after my router was in
`100.64.0.0/10`, the range reserved for carrier-grade NAT. My "public" IPv4 is shared with other ISP
customers, and the router never sees inbound traffic, so there's nothing to forward
([the check](network.md)).

That turned out to be a good constraint. If nothing can come in, then **everything has to go out**:

- **Cloudflare Tunnel** for public traffic. A small `cloudflared` container opens outbound
  connections to Cloudflare's edge, and Cloudflare sends visitors back through them. No open ports,
  no home IP in DNS.
- **Tailscale** for private admin access. Same idea: an outbound WireGuard mesh, so the database
  and dashboards are reachable from my laptop and from nowhere else.

The firewall question becomes simple: inbound is denied, because nothing needs it.

## The shape of the stack

```
Internet ─HTTPS─> Cloudflare ─tunnel─> cloudflared ─> Traefik :8000 (entrypoint "public")
                                                         ├─ josuedev.dpdns.org      -> portfolio (Next.js)
                                                         ├─ api.josuedev.dpdns.org  -> api (Spring Boot)
                                                         └─ anything else           -> 404

My laptop ─tailnet─> tailscale container ─> Postgres, Dockge, Uptime Kuma, Traefik dashboard
```

It's one Docker Compose project with two networks:

| Network | Who is on it | Internet egress |
|---|---|---|
| `proxy` | Traefik and everything it routes to | yes |
| `internal` | Postgres, docker-socket-proxy | **no** (`internal: true`) |

A database on `internal` can't reach the internet even if something in it gets compromised. The API
joins both networks: `proxy` to be reachable, `internal` to reach Postgres.

## Traefik: routes live next to the service

Traefik reads routes from Docker labels, so exposing a service means adding labels next to it instead
of editing a central config. Two decisions made this safe:

**Two entrypoints, public and local.** Cloudflare only ever reaches Traefik's `public` entrypoint. A
router answers there only if it declares `entrypoints=public`. Everything else, including the Traefik
dashboard, Dockge and Uptime Kuma, lives on the `web` entrypoint, bound to `127.0.0.1` on the host. If
I forget to mark something public, the result is a 404, not an exposed admin panel.

**No raw Docker socket.** Traefik talks to Docker through
[docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy), which only allows read access to
the endpoints it needs. Mounting `/var/run/docker.sock` into an internet-facing container gives it
root on the host. That's the main reason I skipped Watchtower for auto-updates.

Adding a new public app takes a copied template and two decisions: the subdomain and the container
port. A wildcard DNS record and a wildcard tunnel rule already send `*.josuedev.dpdns.org` to Traefik,
so new subdomains need no DNS or tunnel change.

## The tunnel, as code

Cloudflare's dashboard-managed tunnels need a Zero Trust signup, which asks for a card even on the
free plan. So I created the tunnel with the `cloudflared` CLI instead. That turned out better: the
ingress rules live in [`cloudflared/config.yml`](../cloudflared/config.yml), in git, and change
through reviewed PRs. Only the credentials file is secret, and it's git-ignored and mounted read-only
([tunnel docs](tunnel.md)).

## The Java side

The API is Spring Boot 4.1 on Java 21, with Postgres and Flyway:

- **Flyway owns the schema** and migrates on startup. Hibernate runs with `ddl-auto: validate`, so an
  entity that doesn't match the schema stops the app instead of silently drifting.
- **Behind two proxies, it still sees the truth.** `server.forward-headers-strategy: native` honors
  `X-Forwarded-Proto/For`, so the app knows the request was HTTPS and sees the real client IP.
- **Health includes the database.** `/actuator/health` is the only public endpoint. Docker
  healthchecks, Uptime Kuma and CI's smoke test all hit it.
- **Multi-stage, multi-arch image.** I develop on an arm64 MacBook and the server is amd64. Maven runs
  on the build platform (the jar is arch-independent), so cross-building takes seconds, not minutes of
  emulation. Spring Boot layers mean a code change only pushes the small `application` layer.

CI builds both architectures, starts the image against a throwaway Postgres, checks that Flyway ran,
and only then pushes to GHCR from `main`. The PC never builds anything: it pulls the image CI tested.

## Mac for development, PC for production

The same `compose.yaml` runs on both machines. A committed `compose.override.yaml` adds local
`build:` sections, and Compose loads it automatically on the Mac. On the PC, `.env` sets
`COMPOSE_FILE=compose.yaml`, so the override is ignored and images come from GHCR.

Deploying is one script, [`scripts/deploy.sh`](../scripts/deploy.sh): `git pull`, `compose pull`,
`up -d --wait`. It refuses to run off `main`, with uncommitted changes, or in dev mode, and it fails
loudly if anything isn't healthy within three minutes. Moving production from the Mac to the PC took
copying `.env` and one credentials file, then `docker compose up -d`.

## Where AI fits

Two places.

**Building it.** This repo was built with [Claude Code](https://claude.com/claude-code) as a
pair-programmer under a strict [working agreement](../CLAUDE.md). The work was planned as GitHub issues
with acceptance criteria. Each change went in on one branch per issue, with evidence (`curl`
output, healthchecks) in every PR before merging. MCP servers give the agent the GitHub API and a real
browser to check pages. Planning work as issues with checkable criteria is what made this work: the agent's
output was easy to review because "done" was defined up front.

**Running it.** The stack is ready for AI projects. A new model-backed service is one stack under
`services/`: it joins `proxy`, gets a subdomain from a label, and keeps API keys in `.env`. The
`internal`-only default means a service that should never call out can't. Nothing AI-backed is
public yet; that's the next project.

## What it costs

| Item | Cost |
|---|---|
| Domain (`dpdns.org` subdomain) | free, renewed manually each year |
| Cloudflare DNS + Tunnel | free |
| Tailscale (Personal) | free |
| GitHub Actions + GHCR (public repo) | free |
| Hardware | a PC I already had, plus its electricity |

## What I'd keep

- **Outbound-only connectivity.** CGNAT forced it, but I'd choose it anyway: no home IP in DNS, nothing
  to scan, no port forwarding to forget about.
- **Public by explicit opt-in.** An entrypoint split where the mistake is a 404, not a leak.
- **Infrastructure in git.** Routes, tunnel ingress, monitors documented, deploy scripted. If the
  PC dies, the [recovery notes](../README.md) and the backups are enough to rebuild.
- **Issues with acceptance criteria**, whether a person or an AI agent does the work.

In about four weeks the project went from an empty repo to 59 merged PRs, live on the internet from a desktop
under my desk, for the price of a domain renewal reminder.
