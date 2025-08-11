# Build stage with Java 21
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copy Maven wrapper and pom.xml first for better layer caching
COPY .mvn .mvn
COPY mvnw pom.xml ./

# Make mvnw executable
RUN chmod +x ./mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Runtime stage with Java 21
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy the built jar from build stage
COPY --from=build /app/target/ai-doc-assist-0.0.1-SNAPSHOT.jar app.jar

# Add curl for health checks
RUN apk add --no-cache curl

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application with Java 21 optimizations
CMD ["java", \
     "-XX:+UseZGC", \
     "-XX:+UnlockExperimentalVMOptions", \
     "-XX:+UseTransparentHugePages", \
     "-Xmx1024m", \
     "-Xms512m", \
     "-jar", "app.jar"]
