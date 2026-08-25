#!/usr/bin/env bash

set -Eeuo pipefail

readonly CONTAINER_NAME="swubase-postgres"
readonly IMAGE="postgres:16-alpine"
readonly DATABASE_NAME="swubase_postgres_local"
readonly DATABASE_PORT="5442"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DUMP_FILE="${SCRIPT_DIR}/pg-dump.dmp"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Error: '${DUMP_FILE}' was not found." >&2
  exit 1
fi

echo "=== Pulling ${IMAGE} image ==="
docker pull "${IMAGE}"

echo "=== Starting container '${CONTAINER_NAME}' ==="
if docker container inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  echo "Container '${CONTAINER_NAME}' already exists. Removing..."
  docker rm -f "${CONTAINER_NAME}"
fi

docker run -d --name "${CONTAINER_NAME}" \
  -e POSTGRES_PASSWORD=password \
  -p "${DATABASE_PORT}:5432" \
  "${IMAGE}"

echo "=== Waiting for PostgreSQL to become ready ==="
for attempt in {1..30}; do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi

  if [[ "${attempt}" -eq 30 ]]; then
    echo "Error: PostgreSQL did not become ready within 30 seconds." >&2
    docker logs "${CONTAINER_NAME}" >&2
    exit 1
  fi

  sleep 1
done

echo "=== Copying dump file into container ==="
docker cp "${DUMP_FILE}" "${CONTAINER_NAME}:/tmp/pg-dump.dmp"

echo "=== Creating clean local database '${DATABASE_NAME}' ==="
docker exec "${CONTAINER_NAME}" dropdb -U postgres "${DATABASE_NAME}" --if-exists
docker exec "${CONTAINER_NAME}" createdb -U postgres "${DATABASE_NAME}"

echo "=== Restoring data from dump ==="
docker exec "${CONTAINER_NAME}" pg_restore \
  -U postgres \
  -d "${DATABASE_NAME}" \
  --clean --if-exists \
  --no-owner --no-privileges \
  --verbose \
  /tmp/pg-dump.dmp

echo "=== Done! ==="
echo
echo "You can now connect using:"
echo "  DATABASE_URL=postgresql://postgres:password@localhost:${DATABASE_PORT}/${DATABASE_NAME}"
echo
echo "Use this to verify:"
echo "  docker exec -it ${CONTAINER_NAME} psql -U postgres -d ${DATABASE_NAME} -c '\\dt'"
