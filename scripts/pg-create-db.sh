#!/bin/sh
# Creates (or updates) one app database + login role on the shared Postgres. Idempotent: safe on
# every `docker compose up`. Runs as a one-shot service in the postgres image, as the superuser.
# Env: PGHOST PGUSER PGPASSWORD (superuser), APP_DB, APP_USER, APP_PASSWORD,
#      APP_EXTENSIONS (optional, space-separated, e.g. "vchord earthdistance"): created in APP_DB WITH
#      CASCADE by the superuser, so the app role never needs superuser rights.
set -eu
: "${APP_DB:?}" "${APP_USER:?}" "${APP_PASSWORD:?}"

until pg_isready -q; do sleep 1; done

# Passwords and names go through psql variables (:'x' quotes a literal, :"x" an identifier),
# never string-built SQL. DO blocks can't see psql variables, so the role is created first and the
# password set outside the block.
psql -v ON_ERROR_STOP=1 -d postgres -v db="$APP_DB" -v user="$APP_USER" -v pw="$APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'user')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'user') \gexec
ALTER ROLE :"user" WITH LOGIN PASSWORD :'pw';
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'user')
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db') \gexec
-- Only the owner (and the superuser) may connect.
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
SQL

for ext in ${APP_EXTENSIONS:-}; do
  psql -v ON_ERROR_STOP=1 -q -d "$APP_DB" -v ext="$ext" <<'SQL'
SELECT format('CREATE EXTENSION IF NOT EXISTS %I CASCADE', :'ext') \gexec
SQL
  echo "extension '$ext' ready in '$APP_DB'"
done

echo "database '$APP_DB' ready for role '$APP_USER'"
