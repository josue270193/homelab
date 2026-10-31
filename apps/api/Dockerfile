# syntax=docker/dockerfile:1

# Build stage runs on the builder's native arch: the jar is architecture-independent,
# so cross-builds (amd64 <-> arm64) don't run Maven under emulation.
FROM --platform=$BUILDPLATFORM maven:3.9.16-eclipse-temurin-21-alpine AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package \
 && java -Djarmode=tools -jar target/api.jar extract --layers --launcher --destination /layers

# Runtime: JRE only, non-root, one layer per dependency group so code changes don't re-push libraries.
FROM eclipse-temurin:21.0.13_9-jre-alpine-3.24
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /layers/dependencies/ ./
COPY --from=build /layers/spring-boot-loader/ ./
COPY --from=build /layers/snapshot-dependencies/ ./
COPY --from=build /layers/application/ ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s --retries=3 \
  CMD wget -q -T 3 -O /dev/null http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
