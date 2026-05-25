# syntax=docker/dockerfile:1.4
# Build a Spring Boot microservice. Usage: docker build --build-arg MODULE=catalog-service .
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace
ARG MODULE

COPY shared/pom.xml shared/pom.xml
COPY shared/src shared/src
RUN mvn -f shared/pom.xml install -DskipTests -B -q

COPY ${MODULE}/pom.xml ${MODULE}/pom.xml
COPY ${MODULE}/src ${MODULE}/src
RUN mvn -f ${MODULE}/pom.xml package -DskipTests -B -q

FROM eclipse-temurin:17-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends netcat-openbsd curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG MODULE
COPY --from=build /workspace/${MODULE}/target/*-SNAPSHOT.jar /app/app.jar
COPY docker/wait-and-run.sh /wait-and-run.sh
RUN chmod +x /wait-and-run.sh
ENV MODULE_NAME=${MODULE}
ENTRYPOINT ["/wait-and-run.sh"]
