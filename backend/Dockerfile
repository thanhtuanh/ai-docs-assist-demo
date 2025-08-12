# ---------- Build stage ----------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Wrapper + POM zuerst (Cache)
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x ./mvnw
RUN ./mvnw -B dependency:go-offline

# Quellcode
COPY backend/src ./src
RUN ./mvnw -B clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# non-root user
RUN addgroup -g 1001 -S appgroup \
 && adduser -u 1001 -S appuser -G appgroup

# Jar aus dem Build übernehmen (Dateiname egal)
COPY --from=build /app/target/*.jar app.jar

# optional: curl für Healthchecks
RUN apk add --no-cache curl \
 && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080
CMD ["java","-XX:+UseZGC","-XX:+UnlockExperimentalVMOptions","-XX:+UseTransparentHugePages","-Xmx1024m","-Xms512m","-jar","app.jar"]
