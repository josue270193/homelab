# homelab-api

Spring Boot 4.1 / Java 21 on Postgres. Only `/actuator/health` (plus `/liveness` and `/readiness`) is exposed;
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

[`.github/workflows/api-image.yml`](../../.github/workflows/api-image.yml) runs on every PR and push to
`main` that touches `apps/api/`:

1. Builds `linux/amd64` + `linux/arm64` with buildx (tests run in the build).
2. Starts the amd64 image against a throwaway Postgres, waits for `/actuator/health` and checks
   that Flyway applied the migrations (smoke test).
3. **Only on `main`**, after the smoke test: pushes to `ghcr.io/josue270193/homelab-api` with tags
   `latest` and `sha-<short commit sha>`. Pull requests never push.

Uses the workflow's `GITHUB_TOKEN` (`packages: write`), no personal token. Actions are pinned to commit
SHAs; layer cache lives in the GitHub Actions cache.

```bash
docker pull ghcr.io/josue270193/homelab-api:latest        # or :sha-<short sha> to pin a build
```

If the package is private, log in first with a classic token that has `read:packages`
(`docker login ghcr.io -u josue270193`, paste the token at the prompt so it stays out of shell history).

## Not yet

- Exposed through Traefik: #33.
