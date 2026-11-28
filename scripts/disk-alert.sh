#!/bin/sh
# Disk usage alert (#124). Runs in the `disk-alert` container (alpine, busybox df + wget).
# Every DISK_ALERT_INTERVAL seconds it checks each directory under /host (host paths mounted
# read-only: /host/root = `/`, /host/photos = the Immich library) and pushes one heartbeat to an
# Uptime Kuma Push monitor:
#   all below DISK_ALERT_PERCENT -> status=up   msg="root 41%, photos 41%"
#   any at or above it           -> status=down msg="FULL: root 83% >= 80% | root 83%, photos 83%"
# Kuma notifies on down, and also when no push arrives (container dead).
# Env: DISK_ALERT_PUSH_URL (http://uptime-kuma:3001/api/push/<token>; empty = log only),
#      DISK_ALERT_PERCENT (default 80), DISK_ALERT_INTERVAL (seconds, default 300).
# Usage: disk-alert.sh          -> loop forever
#        disk-alert.sh --once   -> one check + push, then exit (exit 1 if a disk is over the limit)
set -u

LIMIT="${DISK_ALERT_PERCENT:-80}"
INTERVAL="${DISK_ALERT_INTERVAL:-300}"
URL="${DISK_ALERT_PUSH_URL:-}"
OK_FILE=/tmp/disk-alert.ok

check() {
  summary=""
  full=""
  for dir in /host/*; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    # POSIX output: line 2, column 5 is "Capacity" (e.g. 41%).
    pct=$(df -P "$dir" | awk 'NR==2 { sub("%", "", $5); print $5 }')
    if [ -z "$pct" ]; then
      full="${full:+$full, }$name unreadable"
      continue
    fi
    summary="${summary:+$summary, }$name $pct%"
    if [ "$pct" -ge "$LIMIT" ]; then
      full="${full:+$full, }$name $pct% >= $LIMIT%"
    fi
  done

  if [ -n "$full" ]; then
    status=down
    msg="FULL: $full | $summary"
    rm -f "$OK_FILE"
  else
    status=up
    msg="$summary"
    touch "$OK_FILE"
  fi
  echo "$(date -Iseconds) $status: $msg"

  if [ -n "$URL" ]; then
    # Kuma takes status/msg as query parameters; encode the few characters our message uses.
    enc=$(printf '%s' "$msg" | sed -e 's/%/%25/g' -e 's/ /%20/g' -e 's/,/%2C/g' -e 's/|/%7C/g' -e 's/>/%3E/g' -e 's/=/%3D/g')
    if ! wget -q -T 10 -O /dev/null "$URL?status=$status&msg=$enc"; then
      echo "$(date -Iseconds) push to Uptime Kuma failed" >&2
    fi
  fi

  [ "$status" = up ]
}

if [ "${1:-}" = "--once" ]; then
  check
  exit $?
fi

[ -n "$URL" ] || echo "DISK_ALERT_PUSH_URL is empty: logging only, no alerts (docs/photos.md)" >&2
while true; do
  check
  sleep "$INTERVAL"
done
