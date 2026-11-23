#!/usr/bin/env bash
# Validates every Compose file the way each machine loads it. Used by CI (compose-validate.yml)
# and runnable locally before a PR. Never reads the real .env: it builds a throwaway env file from
# .env.example with dummy values for the required secrets.
set -euo pipefail
cd "$(dirname "$0")/.."

env_file=$(mktemp)
trap 'rm -f "$env_file"' EXIT

# Start from the example; STACKS_DIR must be a real path, COMPOSE_FILE is chosen per check below.
sed -e "s|^STACKS_DIR=.*|STACKS_DIR=$PWD/services|" \
    -e 's|^COMPOSE_FILE=.*||' \
    .env.example > "$env_file"

# Every required variable (`${VAR:?...}` in any Compose file) that the example leaves empty or
# omits gets a dummy value, so a new secret can't break this check (#149). Values the example
# already sets (paths like OPENCLOUD_DATA_DIR) are kept.
for var in $(grep -ohE '\$\{[A-Za-z0-9_]+:\?' compose*.yaml services/*/compose.yaml | sed -E 's/^\$\{//; s/:\?$//' | sort -u); do
  if grep -qE "^${var}=.+" "$env_file"; then
    continue
  elif grep -qE "^${var}=" "$env_file"; then
    sed -i.bak "s|^${var}=.*|${var}=dummy-for-validation|" "$env_file" && rm -f "$env_file.bak"
  else
    echo "${var}=dummy-for-validation" >> "$env_file"
  fi
done

failed=0
check() {
  local label=$1; shift
  if out=$("$@" config -q 2>&1); then
    echo "ok    $label"
  else
    echo "FAIL  $label"
    # shellcheck disable=SC2001  # indents every line of a multi-line error; sed is clearest here
    echo "$out" | sed 's/^/      /'
    failed=1
  fi
}

# Mac (dev): compose.yaml + compose.override.yaml, loaded automatically.
check "dev  (compose.yaml + compose.override.yaml)" \
  env -u COMPOSE_FILE docker compose --env-file "$env_file"
# PC (prod): compose.yaml only.
check "prod (compose.yaml)" \
  env COMPOSE_FILE=compose.yaml docker compose --env-file "$env_file"
# Every extra stack under services/ (Dockge / template), as its own project.
for f in services/*/compose.yaml; do
  check "$f" docker compose -f "$f" --env-file "$env_file"
done

exit $failed
