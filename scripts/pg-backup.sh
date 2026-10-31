#!/bin/sh
# Daily pg_dump with N-day retention. Runs inside the postgres image (same pg_dump version as the server).
# Env: PGHOST PGUSER PGPASSWORD PGDATABASE, BACKUP_TIME (HH:MM, local TZ), BACKUP_KEEP_DAYS.
# Usage: pg-backup.sh          -> loop forever, one dump per day at BACKUP_TIME
#        pg-backup.sh --once   -> one dump + prune, then exit
set -eu

DIR=/backups
TIME="${BACKUP_TIME:-03:00}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

backup() {
  ts=$(date +%Y%m%d-%H%M%S)
  out="$DIR/${PGDATABASE}-${ts}.dump"
  # Write to a temp name and rename, so a failed/partial dump never looks like a backup.
  # Explicit returns: `set -e` is ignored inside `backup || ...`, so it can't be relied on here.
  if ! pg_dump -Fc -f "$out.partial"; then
    rm -f "$out.partial"
    return 1
  fi
  mv "$out.partial" "$out" || return 1
  echo "$(date -Iseconds) backup ok: $(basename "$out") ($(du -h "$out" | cut -f1))"
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
