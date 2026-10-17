#!/usr/bin/env bash
# Creates labels, milestones (one per epic) and issues from ROADMAP.md.
# Requirements: gh CLI authenticated, run from inside the repo folder.
# Optional: PROJECT="Homelab" ./create-issues.sh  (adds issues to that GitHub Project;
#           needs: gh auth refresh -s project)
set -euo pipefail

PROJECT="${PROJECT:-}"

# ---------- labels ----------
for e in E0 E1 E2 E3 E4 E5 E6 E7 E8; do
  gh label create "epic:$e" --color "5319e7" --force >/dev/null
done
gh label create "type:infra" --color "0e8a16" --force >/dev/null
gh label create "type:app"   --color "1d76db" --force >/dev/null
gh label create "type:docs"  --color "fbca04" --force >/dev/null

# ---------- milestones (epics) ----------
declare -A EPICS=(
  [E0]="E0 - Project setup & tracking"
  [E1]="E1 - Base stack on Mac"
  [E2]="E2 - Domain & Cloudflare Tunnel"
  [E3]="E3 - Dynamic service management"
  [E4]="E4 - Data layer"
  [E5]="E5 - CI/CD & multi-arch"
  [E6]="E6 - Deploy on CachyOS"
  [E7]="E7 - Observability"
  [E8]="E8 - First app + portfolio"
)
existing=$(gh api "repos/{owner}/{repo}/milestones?state=all&per_page=100" --jq '.[].title')
for key in "${!EPICS[@]}"; do
  title="${EPICS[$key]}"
  if ! grep -Fxq "$title" <<<"$existing"; then
    gh api "repos/{owner}/{repo}/milestones" -f title="$title" >/dev/null
  fi
done

# ---------- issues ----------
issue() { # epic type title acceptance-criteria
  local epic="$1" type="$2" title="$3" ac="$4"
  local body
  body=$(printf "Epic: %s\n\n## Acceptance criteria\n%s\n\nSee ROADMAP.md for context." "${EPICS[$epic]}" "$ac")
  local args=(--title "$title" --body "$body" --label "epic:$epic" --label "type:$type" --milestone "${EPICS[$epic]}")
  [[ -n "$PROJECT" ]] && args+=(--project "$PROJECT")
  gh issue create "${args[@]}" >/dev/null
  echo "created: [$epic] $title"
}

issue E0 docs  "0.1 Create repo base structure" "- [ ] README.md, ROADMAP.md, CLAUDE.md
- [ ] .gitignore ignores .env and data volumes
- [ ] .env.example committed"
issue E0 docs  "0.2 Set up GitHub Project board" "- [ ] Columns Backlog / Ready / In progress / Done
- [ ] All issues on the board"
issue E0 infra "0.3 Install and authenticate gh CLI" "- [ ] gh issue list works from the repo"

issue E1 infra "1.1 Choose Docker runtime on Mac" "- [ ] Docker Desktop, OrbStack or Colima installed
- [ ] docker compose version works"
issue E1 infra "1.2 Compose skeleton with networks" "- [ ] compose.yaml with proxy and internal networks
- [ ] docker compose config validates"
issue E1 infra "1.3 Add Traefik v3 with Docker provider" "- [ ] exposedByDefault=false
- [ ] Dashboard at traefik.localhost"
issue E1 infra "1.4 Add docker-socket-proxy for Traefik" "- [ ] Traefik uses socket proxy (read-only), not raw socket"
issue E1 infra "1.5 Route whoami test service via labels" "- [ ] http://whoami.localhost works
- [ ] Route defined only with labels"
issue E1 docs  "1.6 Service template and docs" "- [ ] services/_template/compose.yaml
- [ ] README explains exposing a new image (host, port)"

issue E2 docs  "2.1 Check ISP setup (CGNAT / public IP)" "- [ ] Result documented in docs/network.md"
issue E2 infra "2.2 Buy domain and move DNS to Cloudflare" "- [ ] Domain active in Cloudflare"
issue E2 infra "2.3 Create remotely-managed Cloudflare Tunnel" "- [ ] Token stored as CLOUDFLARE_TUNNEL_TOKEN in .env"
issue E2 infra "2.4 Add cloudflared service to compose" "- [ ] Tunnel HEALTHY in Cloudflare
- [ ] restart policy set"
issue E2 infra "2.5 Wildcard route *.domain to Traefik" "- [ ] *.domain -> http://traefik:80
- [ ] whoami.<domain> works over HTTPS"

issue E3 infra "3.1 Add Dockge (or Portainer CE)" "- [ ] Stacks manageable from web UI"
issue E3 infra "3.2 Protect admin UIs with Cloudflare Access" "- [ ] Traefik dashboard and Dockge require login"
issue E3 docs  "3.3 Expose a new image end-to-end from the UI" "- [ ] Any public image reachable over HTTPS in < 5 min
- [ ] Steps documented"

issue E4 infra "4.1 Postgres on internal network only" "- [ ] No published ports
- [ ] Named volume + healthcheck"
issue E4 infra "4.2 Private DB access from Mac" "- [ ] Tailscale or Cloudflare Access TCP
- [ ] DB not publicly reachable (verified)"
issue E4 infra "4.3 Automated Postgres backups" "- [ ] Daily pg_dump, 7-day retention
- [ ] Restore tested and documented"

issue E5 infra "5.1 GitHub Actions multi-arch build" "- [ ] buildx builds linux/amd64 and linux/arm64"
issue E5 infra "5.2 Push images to GHCR" "- [ ] Tags latest + commit SHA"
issue E5 infra "5.3 Local dev override compose file" "- [ ] compose.override.yaml builds locally
- [ ] Prod compose pulls from GHCR"

issue E6 infra "6.1 Install Docker on CachyOS, enable on boot" "- [ ] docker enabled in systemd
- [ ] user in docker group"
issue E6 infra "6.2 Start stack on CachyOS" "- [ ] All services healthy
- [ ] Public URLs served from PC"
issue E6 infra "6.3 Deploy procedure" "- [ ] scripts/deploy.sh or Watchtower
- [ ] Documented"
issue E6 infra "6.4 Host hardening" "- [ ] No inbound WAN ports
- [ ] SSH key-only
- [ ] Update strategy documented"

issue E7 infra "7.1 Uptime Kuma monitoring" "- [ ] Monitor per public service
- [ ] Notifications working"
issue E7 docs  "7.2 Log access" "- [ ] Dozzle or documented docker compose logs usage"
issue E7 infra "7.3 Restart policies and healthchecks" "- [ ] Every service: restart unless-stopped + healthcheck"

issue E8 app   "8.1 Spring Boot API skeleton" "- [ ] Java 21, /actuator/health
- [ ] Multi-stage Dockerfile built by CI"
issue E8 app   "8.2 API + Postgres with Flyway" "- [ ] One entity, migrations on startup"
issue E8 infra "8.3 Expose API at api.<domain>" "- [ ] HTTPS via Traefik labels only"
issue E8 docs  "8.4 Portfolio write-up" "- [ ] Post: self-hosting Java + AI behind CGNAT with Docker, Traefik, Cloudflare Tunnel"

echo "Done."
