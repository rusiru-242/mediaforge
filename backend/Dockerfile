# Build context: backend/ (not repository root).
FROM maven:3.9.11-eclipse-temurin-21 AS builder
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp package -DskipTests

# yt-dlp needs a maintained JS engine for YouTube challenge solving.
FROM node:22-bookworm-slim AS javascript
FROM eclipse-temurin:21-jre-noble AS runtime
WORKDIR /app
ARG YTDLP_VERSION=2026.10.26
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3 python3-venv libstdc++6 \
    && python3 -m venv /opt/extractor \
    && /opt/extractor/bin/pip install --no-cache-dir "yt-dlp[default]==${YTDLP_VERSION}" \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 mediaforge \
    && useradd --uid 10001 --gid 10001 --home-dir /app --no-create-home --shell /usr/sbin/nologin mediaforge \
    && mkdir -p /app/storage /app/tmp \
    && chown -R mediaforge:mediaforge /app/storage /app/tmp
COPY --from=javascript /usr/local/bin/node /usr/local/bin/node
COPY --from=builder /workspace/target/mediaforge-backend-1.0.0.jar /app/mediaforge-backend.jar
ENV PORT=8081 \
    SPRING_PROFILES_ACTIVE=prod \
    STORAGE_LOCAL_PATH=/app/storage \
    UPLOAD_TEMP_PATH=/app/tmp \
    TMPDIR=/app/tmp \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    YTDLP_PATH=/opt/extractor/bin/yt-dlp \
    YTDLP_JS_RUNTIMES=node:/usr/local/bin/node \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50 -XX:+ExitOnOutOfMemoryError -Djava.io.tmpdir=/app/tmp" \
    OMP_NUM_THREADS=1
USER 10001:10001
RUN ffmpeg -version && ffprobe -version && /opt/extractor/bin/yt-dlp --version && node --version \
    && test -x /opt/extractor/bin/yt-dlp && test -x /usr/local/bin/node \
    && test -w /app/storage && test -w /app/tmp
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=12s --start-period=90s --retries=3 \
    CMD curl --fail --silent --max-time 10 "http://127.0.0.1:${PORT:-8081}/actuator/health" >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/mediaforge-backend.jar"]
