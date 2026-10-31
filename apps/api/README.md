# homelab-api

Spring Boot 4.1 / Java 21 skeleton. Only `/actuator/health` (plus `/liveness` and `/readiness`) is exposed.

## Build and run

No local JDK or Maven needed: everything builds inside Docker (tests run during the build).

```bash
cd apps/api
docker build -t homelab-api:dev .
docker run --rm -p 127.0.0.1:8080:8080 homelab-api:dev   # local try-out only
curl http://localhost:8080/actuator/health                # {"groups":["liveness","readiness"],"status":"UP"}
```

Other architecture (e.g. amd64 image for the CachyOS PC, from the Mac):

```bash
docker buildx build --platform linux/amd64 --load -t homelab-api:amd64 .
```

## Image

- Multi-stage: `maven:3.9.16-eclipse-temurin-21-alpine` builds, `eclipse-temurin:21.0.13_9-jre-alpine-3.24` runs.
- The build stage uses `$BUILDPLATFORM`: the jar is arch-independent, so cross-builds don't run Maven
  under emulation (amd64 build from an arm64 Mac: seconds, not minutes).
- Spring Boot layers (`dependencies`, `spring-boot-loader`, `snapshot-dependencies`, `application`)
  are separate image layers: a code change only rebuilds and pushes the small `application` layer.
- Runs as non-root user `app`; `HEALTHCHECK` on `/actuator/health`; heap capped at 75% of the container limit.

## CI

[`.github/workflows/api-image.yml`](../../.github/workflows/api-image.yml) runs on every PR and push to
`main` that touches `apps/api/`: builds `linux/amd64` + `linux/arm64` with buildx (tests run in the
build), then starts the amd64 image and waits for `/actuator/health`. Nothing is pushed yet.
Actions are pinned to commit SHAs; layer cache lives in the GitHub Actions cache.

## Not yet

- Postgres + Flyway: #32. Exposed through Traefik: #33. Pushed to GHCR: #22.
