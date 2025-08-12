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

# kleineres Image, keine optionalen Tools
# (curl sparen wir uns für minimalen RAM-Footprint)

# non-root user
RUN addgroup -g 1001 -S appgroup \
 && adduser -u 1001 -S appuser -G appgroup

# Jar aus dem Build übernehmen (Name egal)
COPY --from=build /app/target/*.jar app.jar

# konservative Defaults für 512 MiB Instanz
# (kann in Render via ENV überschrieben werden)
ENV JAVA_TOOL_OPTIONS="\
 -Xms128m \
 -Xmx256m \
 -XX:+UseSerialGC \
 -XX:MaxMetaspaceSize=128m \
 -Dserver.tomcat.max-threads=20 \
 -Dspring.datasource.hikari.maximum-pool-size=5 \
 -Dspring.main.lazy-initialization=true \
 -Dfile.encoding=UTF-8 \
 -XX:+ExitOnOutOfMemoryError"

USER appuser
EXPOSE 8080

# Start
CMD ["java","-jar","app.jar"]
