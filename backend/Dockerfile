# Build stage
FROM maven:3.8.4-openjdk-17-slim AS build

WORKDIR /app

# Copy pom.xml first for better layer caching
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/ai-doc-assist-0.0.1-SNAPSHOT.jar app.jar

# Add curl for health checks
RUN apk add --no-cache curl

# Run the application
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]