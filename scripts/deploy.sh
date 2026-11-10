#!/usr/bin/env bash
# Deploy the production stack on the CachyOS PC: update the checkout from git, pull images, restart
# what changed, and wait until everything is healthy. Safe to re-run: no changes means no restarts.
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

# Guards: production only runs committed code from $branch, and only GHCR images (never local builds).
[ -f .env ] || die ".env missing (see docs/host.md)"
current=$(git rev-parse --abbrev-ref HEAD)
[ "$current" = "$branch" ] || die "on branch '$current', production deploys only '$branch'"
git diff --quiet HEAD -- || die "uncommitted changes to tracked files; commit or stash them first"
if docker compose config --format json | grep -q '"build"'; then
  die "compose would build images (dev mode); set COMPOSE_FILE=compose.yaml in .env"
fi

before=$(git rev-parse --short HEAD)
if [ "$pull_git" = 1 ]; then
  log "git pull ($branch)"
  git pull --ff-only
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
