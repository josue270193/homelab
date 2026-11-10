#!/bin/sh
# Daily pg_dump with N-day retention. Runs inside the postgres image (same pg_dump version as the server).
# Env: PGHOST PGUSER PGPASSWORD, BACKUP_DATABASES (space-separated; default: PGDATABASE),
#      BACKUP_TIME (HH:MM, local TZ), BACKUP_KEEP_DAYS.
# Usage: pg-backup.sh          -> loop forever, one dump per day at BACKUP_TIME
#        pg-backup.sh --once   -> one dump + prune, then exit
set -eu

DIR=/backups
TIME="${BACKUP_TIME:-03:00}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
DATABASES="${BACKUP_DATABASES:-$PGDATABASE}"

# One database. Explicit returns: `set -e` is ignored inside `dump || ...`, so it can't be relied on.
dump() {
  ts=$(date +%Y%m%d-%H%M%S)
  out="$DIR/${1}-${ts}.dump"
  # Write to a temp name and rename, so a failed/partial dump never looks like a backup.
  if ! pg_dump -Fc -d "$1" -f "$out.partial"; then
    rm -f "$out.partial"
    return 1
  fi
  mv "$out.partial" "$out" || return 1
  echo "$(date -Iseconds) backup ok: $(basename "$out") ($(du -h "$out" | cut -f1))"
}

# Every database; .last_success only when all of them worked (the healthcheck watches it).
backup() {
  ok=1
  for db in $DATABASES; do
    dump "$db" || { echo "$(date -Iseconds) backup FAILED: $db" >&2; ok=0; }
  done
  [ "$ok" = 1 ] || return 1
  # Retention: delete dumps older than KEEP_DAYS days.
  find "$DIR" -name '*.dump' -type f -mmin +$((KEEP_DAYS * 1440)) -print -delete | sed 's/^/pruned: /'
  touch "$DIR/.last_success"
}

if [ "${1:-}" = "--once" ]; then
  backup
  exit 0
fi

echo "$(date -Iseconds) scheduler started: daily at $TIME, keep $KEEP_DAYS days"
while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%F) $TIME" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  backup || echo "$(date -Iseconds) backup FAILED" >&2
done
