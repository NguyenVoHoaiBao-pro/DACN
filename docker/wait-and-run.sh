#!/bin/sh
set -e

wait_for() {
  host="$1"
  port="$2"
  label="$3"
  echo "Waiting for ${label} (${host}:${port})..."
  while ! nc -z "$host" "$port"; do
    sleep 2
  done
  echo "${label} is ready."
}

case "${MODULE_NAME}" in
  discovery-server)
  config-server)
    wait_for discovery-server 8761 "Eureka"
    ;;
  auth-service)
    wait_for discovery-server 8761 "Eureka"
    wait_for config-server 8888 "Config Server"
    wait_for user-service 8083 "User Service"
    ;;
  api-gateway)
    wait_for discovery-server 8761 "Eureka"
    wait_for config-server 8888 "Config Server"
    sleep 15
    ;;
  *)
    wait_for mysql 3306 "MySQL"
    wait_for discovery-server 8761 "Eureka"
    wait_for config-server 8888 "Config Server"
    ;;
esac

exec java ${JAVA_OPTS:--Xms256m -Xmx512m} -jar /app/app.jar
