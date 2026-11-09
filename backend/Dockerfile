# =============================================================================
# MediaForge Backend — Multi-Stage Production Dockerfile
# =============================================================================

# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper and POM
COPY pom.xml .
COPY src ./src

# Build package without running integration tests during container image build
RUN ./mvnw clean package -DskipTests || \
    (apk add --no-cache maven && mvn clean package -DskipTests)

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Security: create non-root user
RUN addgroup -S mediaforge && adduser -S mediaforge -G mediaforge

# Create storage directory with appropriate permissions
RUN mkdir -p /app/uploads && chown -R mediaforge:mediaforge /app

USER mediaforge

# Copy built JAR from builder stage
COPY --from=builder --chown=mediaforge:mediaforge /workspace/target/*.jar /app/mediaforge-backend.jar

ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xms256m -Xmx1024m -XX:+UseG1GC"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/mediaforge-backend.jar"]
