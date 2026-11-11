# homelab-api

Spring Boot 4.1 / Java 21 on Postgres. Public at <https://api.josuedev.dpdns.org/actuator/health>. Only `/actuator/health` (plus `/liveness` and `/readiness`) is exposed;
health includes the database connection.

## Build and run

No local JDK or Maven needed: everything builds inside Docker (tests run during the build).

```bash
cd apps/api
docker build -t homelab-api:dev .
# Run it with the rest of the stack (it needs Postgres):
cd ../.. && docker compose up -d --build api
docker compose exec api wget -qO- http://localhost:8080/actuator/health   # {"groups":["liveness","readiness"],"status":"UP"}
```

Other architecture (e.g. amd64 image for the CachyOS PC, from the Mac):

```bash
docker buildx build --platform linux/amd64 --load -t homelab-api:amd64 .
```

## Database

- Connection from the environment only: `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` (set in
  `compose.yaml` from `.env`). There is no default, so the app fails at startup without a database.
- **Flyway owns the schema.** Migrations live in `src/main/resources/db/migration` and run on every
  start (no-op when up to date). Add a change as a new file `V<n>__<what>.sql`; never edit an applied one.
- Behind Traefik + Cloudflare: `server.forward-headers-strategy: native` honors `X-Forwarded-Proto/For`
  (Traefik's `public` entrypoint passes them through), so the app sees `https` and the client IP.
- Hibernate runs with `ddl-auto: validate`: if an entity doesn't match the migrated schema, startup fails.
- First entity: `Note` (`id`, `body`, `created_at`) in table `note` (`V1__create_note.sql`).
- Tests run inside `docker build` without Postgres, against H2 in PostgreSQL mode (same migrations).
  The real Postgres check happens in CI's smoke test and when the stack starts.

```bash
docker compose exec postgres psql -U homelab -d homelab -c 'select * from flyway_schema_history'
```

## Image

- Multi-stage: `maven:3.9.16-eclipse-temurin-21-alpine` builds, `eclipse-temurin:21.0.13_9-jre-alpine-3.24` runs.
- The build stage uses `$BUILDPLATFORM`: the jar is arch-independent, so cross-builds don't run Maven
  under emulation (amd64 build from an arm64 Mac: seconds, not minutes).
- Spring Boot layers (`dependencies`, `spring-boot-loader`, `snapshot-dependencies`, `application`)
  are separate image layers: a code change only rebuilds and pushes the small `application` layer.
- Runs as non-root user `app`; `HEALTHCHECK` on `/actuator/health`; heap capped at 75% of the container limit.

## CI and images

[`.forgejo/workflows/api-image.yml`](../../.forgejo/workflows/api-image.yml) runs on Forgejo Actions on every PR and push to
`main` that touches `apps/api/`:

1. Builds `linux/amd64` + `linux/arm64` with buildx (tests run in the build).
2. Starts the amd64 image against a throwaway Postgres, waits for `/actuator/health` and checks
   that Flyway applied the migrations (smoke test).
3. **Only on `main`**, after the smoke test: pushes to the Forgejo registry as `josue/homelab-api`
   with tags `latest` and `sha-<short commit sha>`. Pull requests never push.

Pushes use the `REGISTRY_TOKEN` repo secret (`write:package` only) and go over the internal `ci`
network, not Cloudflare. Actions are pinned to commit SHAs; the layer cache is the `buildcache` tag.
See [docs/forgejo.md](../../docs/forgejo.md#ci-forgejo-actions-121). Neither CI nor the deploy needs
GitHub ([verified](../../docs/forgejo.md#deploying-without-github-122)).

```bash
docker pull git.<domain>/josue/homelab-api:latest        # or :sha-<short sha> to pin a build
```

