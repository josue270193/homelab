#!/usr/bin/env bash
# Redeploy only the portfolio from the Forgejo registry (#151). It is the forced command of the CI
# deploy key on the PC (authorized_keys `command=`, see docs/forgejo.md), so whatever the client
# asks for, this is all that key can run. Also fine to run by hand.
#
# Pulls `portfolio` (PORTFOLIO_TAG from .env, default latest), recreates it only if the image
# changed, and waits until it is healthy. Never touches git or any other service: code and
# config changes still go out with scripts/deploy.sh.
#
# Env: DEPLOY_TIMEOUT (default 120) seconds to wait for healthy
set -euo pipefail
cd "$(dirname "$0")/.."

timeout=${DEPLOY_TIMEOUT:-120}
die() { printf 'deploy-portfolio: %s\n' "$*" >&2; exit 1; }

# Same guards as deploy.sh: production config, registry images only.
[ -f .env ] || die ".env missing (see docs/host.md)"
if docker compose config --format json | grep -q '"build"'; then
  die "compose would build images (dev mode); set COMPOSE_FILE=compose.yaml in .env"
fi

# Ignore SSH_ORIGINAL_COMMAND: the client can't pick a service, tag or flag.
docker compose pull --quiet portfolio
if ! docker compose up -d --no-deps --wait --wait-timeout "$timeout" portfolio; then
  docker compose ps portfolio
  docker compose logs --tail 20 portfolio
  die "portfolio not healthy after ${timeout}s"
fi
docker image prune -f >/dev/null

docker compose ps portfolio --format 'deployed {{.Image}} ({{.Status}})'
docker image inspect --format 'digest {{index .RepoDigests 0}}' \
  "$(docker compose ps -q portfolio | xargs docker inspect --format '{{.Image}}')"
