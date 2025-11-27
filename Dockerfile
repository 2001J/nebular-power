FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace/app

# Use the container's Maven (no mvnw/.mvn required)
COPY pom.xml .
COPY src src

RUN mvn -B package -DskipTests
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

FROM eclipse-temurin:21-jre
VOLUME /tmp
ARG DEPENDENCY=/workspace/app/target/dependency
COPY --from=build ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=build ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=build ${DEPENDENCY}/BOOT-INF/classes /app
ENTRYPOINT ["java","-cp","app:app/lib/*","com.solar.SolarApplication"]