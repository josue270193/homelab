#!/usr/bin/env bash
# Deploy the production stack on the CachyOS PC: update the checkout from Forgejo, pull images from
# the Forgejo registry, restart what changed, and wait until everything is healthy. Safe to re-run:
# no changes means no restarts. Needs nothing from GitHub (#122): that's only a push mirror.
#
# Usage: scripts/deploy.sh             -> git pull + compose pull + up
#        scripts/deploy.sh --no-pull   -> skip git (e.g. after editing .env); still pulls images
# Env:   DEPLOY_BRANCH (default main)   the only branch production runs from
#        DEPLOY_TIMEOUT (default 180)   seconds to wait for healthy
set -euo pipefail
cd "$(dirname "$0")/.."

branch=${DEPLOY_BRANCH:-main}
timeout=${DEPLOY_TIMEOUT:-180}
pull_git=1
[ "${1:-}" = "--no-pull" ] && pull_git=0

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'deploy: %s\n' "$*" >&2; exit 1; }

# Guards: production only runs committed code from $branch, and only CI-published registry images (never local builds).
[ -f .env ] || die ".env missing (see docs/host.md)"
current=$(git rev-parse --abbrev-ref HEAD)
[ "$current" = "$branch" ] || die "on branch '$current', production deploys only '$branch'"
git diff --quiet HEAD -- || die "uncommitted changes to tracked files; commit or stash them first"
# Code comes from Forgejo, never the GitHub mirror (it can lag behind or be paused).
origin_url=$(git remote get-url origin 2>/dev/null) || die "no 'origin' remote (should be the Forgejo repo)"
case "$origin_url" in
  *github.com*) die "origin is GitHub ($origin_url); point it at Forgejo (docs/forgejo.md)" ;;
esac
if docker compose config --format json | grep -q '"build"'; then
  die "compose would build images (dev mode); set COMPOSE_FILE=compose.yaml in .env"
fi

before=$(git rev-parse --short HEAD)
if [ "$pull_git" = 1 ]; then
  log "git pull (origin/$branch)"
  git pull --ff-only origin "$branch"
fi
after=$(git rev-parse --short HEAD)
[ "$before" = "$after" ] || git log --oneline "$before..$after"

log "validate"
docker compose config -q

log "pull images"
docker compose pull --quiet

log "up (waiting up to ${timeout}s for healthy)"
if ! docker compose up -d --remove-orphans --wait --wait-timeout "$timeout"; then
  docker compose ps
  die "not healthy after ${timeout}s; check: docker compose logs <service>"
fi

log "clean up dangling images"
docker image prune -f >/dev/null

log "deployed $after"
docker compose ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}'
