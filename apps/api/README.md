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

## Not yet

- Postgres + Flyway: #32. Exposed through Traefik: #33. Built by CI and pushed to GHCR: #21, #22.
