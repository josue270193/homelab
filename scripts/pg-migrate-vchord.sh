#!/usr/bin/env bash
# One-off (#124): move the shared Postgres from postgres:18.6-alpine (volume homelab_postgres-data)
# to Immich's Postgres image with VectorChord (volume homelab_postgres18-data), by dump + restore.
#
# Why not reuse the volume: the old cluster was initialised on Alpine (musl) with en_US.utf8; the new
# image is Debian (glibc), which sorts that collation differently, so text indexes (Forgejo, API)
# would be silently wrong. A dump + restore rebuilds every index under the new collation.
#
# Run on the PC from the main checkout, AFTER `git pull` of this change and BEFORE scripts/deploy.sh
# (deploy.sh refuses to run until this is done). The old container must still be running.
#   scripts/pg-migrate-vchord.sh
# What it does: stops the apps that use Postgres, dumps every DB from the running old container into
# backups/postgres/migrate-<ts>/, starts the new postgres on the new (empty) volume, restores roles +
# databases, checks row counts, then `docker compose up -d --wait` for the rest.
# The old volume is left untouched (rollback: docs/photos.md#rollback-of-the-postgres-move).
set -euo pipefail
cd "$(dirname "$0")/.."

project=${COMPOSE_PROJECT_NAME:-homelab}   # override only to rehearse in a throwaway project
old_volume=${project}_postgres-data
new_volume=${project}_postgres18-data
user=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- || true); user=${user:-homelab}
main_db=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- || true); main_db=${main_db:-homelab}

# Exact row count of every table, one "schema.table|count" per line (compared before/after).
count_sql="SELECT table_schema || '.' || table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'pg-migrate-vchord: %s\n' "$*" >&2; exit 1; }

docker volume inspect "$old_volume" >/dev/null 2>&1 || die "$old_volume not found: nothing to migrate"
if docker volume inspect "$new_volume" >/dev/null 2>&1; then
  die "$new_volume already exists: migration already done (or half done). Check it, see docs/photos.md"
fi
running=$(docker compose ps -q postgres)
[ -n "$running" ] || die "postgres is not running: start the old container first (docker start ${project}-postgres-1)"
old_image=$(docker inspect --format '{{.Config.Image}}' "$running")
case "$old_image" in
  postgres:*alpine*) ;;
  *) die "running postgres is '$old_image', expected the old postgres:*-alpine image" ;;
esac

out=backups/postgres/migrate-$(date +%Y%m%d-%H%M%S)
mkdir -p "$out"
chmod 700 "$out"   # globals.sql holds password hashes

log "stop apps that use Postgres"
docker compose stop api forgejo-runner forgejo postgres-backup

# Every non-template DB except `postgres`. psql in the OLD container (`exec` never recreates it).
dbs=$(docker compose exec -T postgres psql -U "$user" -d postgres -Atc \
  "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY 1")
log "dump from $old_image: roles + $(echo "$dbs" | tr '\n' ' ')into $out"
docker compose exec -T postgres pg_dumpall -U "$user" --globals-only > "$out/globals.sql"
for db in $dbs; do
  docker compose exec -T postgres pg_dump -U "$user" -Fc -d "$db" > "$out/$db.dump"
  docker compose exec -T postgres psql -U "$user" -d "$db" -Atc "$count_sql" > "$out/$db.before"
  echo "  $db: $(du -h "$out/$db.dump" | cut -f1)"
done

log "replace postgres (new image, new volume $new_volume)"
# Remove the old container, don't just recreate it: on recreate Compose carries over volumes mounted
# at the old image's VOLUME path (/var/lib/postgresql), and the new entrypoint would then find and run
# the old musl cluster there instead of initialising the new volume (seen in the rehearsal).
docker compose rm -f -s postgres
docker compose up -d --no-deps --wait --wait-timeout 120 postgres

# The new cluster must be fresh: on the new volume, holding only what initdb made.
datadir=$(docker compose exec -T postgres psql -U "$user" -d postgres -Atc "SHOW data_directory")
case "$datadir" in
  /var/lib/postgresql/data/*) ;;
  *) die "new postgres runs from '$datadir', not the new volume: stop here, see docs/photos.md" ;;
esac
present=$(docker compose exec -T postgres psql -U "$user" -d postgres -Atc \
  "SELECT string_agg(datname, ' ' ORDER BY datname) FROM pg_database WHERE NOT datistemplate AND datname NOT IN ('postgres', '$main_db')")
[ -z "$present" ] || die "new cluster is not empty (has: $present): stop here, see docs/photos.md"
docker compose exec -T postgres psql -U "$user" -d postgres -Atc "SELECT version()"

log "restore roles (the superuser '$user' already exists: its 'already exists' error is expected)"
docker compose exec -T postgres psql -U "$user" -d postgres -q < "$out/globals.sql" 2>&1 \
  | grep -v "role \"$user\" already exists" || true

for db in $dbs; do
  log "restore $db"
  if [ "$db" = "$main_db" ]; then
    # Created by the image's initdb (POSTGRES_DB): restore into it.
    docker compose exec -T postgres pg_restore -U "$user" -d "$db" --exit-on-error < "$out/$db.dump"
  else
    docker compose exec -T postgres pg_restore -U "$user" -d postgres --create --exit-on-error < "$out/$db.dump"
  fi
  docker compose exec -T postgres psql -U "$user" -d "$db" -Atc "ANALYZE" >/dev/null
  docker compose exec -T postgres psql -U "$user" -d "$db" -Atc "$count_sql" > "$out/$db.after"
  if diff -q "$out/$db.before" "$out/$db.after" >/dev/null; then
    echo "  row counts match ($(wc -l < "$out/$db.after") tables)"
  else
    diff "$out/$db.before" "$out/$db.after" || true
    die "row counts differ for $db: nothing else started; old volume untouched, see docs/photos.md"
  fi
done

log "start everything"
docker compose up -d --wait --wait-timeout 300
docker compose ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}'
log "done. Dumps kept in $out (contains password hashes). Old volume $old_volume kept for rollback."
