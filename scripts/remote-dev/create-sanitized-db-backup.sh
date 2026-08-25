#!/usr/bin/env bash

# Creates a contributor-safe PostgreSQL dump from a Coolify backup.
#
# Run this only on the server that has access to the production backups and R2
# credentials. It never exposes a port for the temporary database, and removes
# its container and local dump files when it finishes.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly CONTAINER_NAME="swubase-clean-db"
readonly CLEAN_DATABASE="swubase_clean"

source_name=""
backup_timestamp="latest"
config_file="${REPOSITORY_DIR}/.env"
container_created=false
work_directory=""

usage() {
  cat <<'EOF'
Usage:
  ./scripts/remote-dev/create-sanitized-db-backup.sh --source local|r2 [options]

Options:
  --source SOURCE       Source of the raw backup: local or r2 (required).
  --timestamp VALUE     Backup timestamp, or "latest" (default: latest).
  --config PATH         dotenv configuration file (default: <repository>/.env).
  -h, --help            Show this help text.

The script restores a raw backup into an unexposed temporary PostgreSQL
container, applies every *.sql file in REMOTE_DEV_SANITIZE_SQL_DIR in filename
order, uploads the resulting dump, and removes all local temporary data.
EOF
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

cleanup() {
  local exit_status=$?

  if [[ "${container_created}" == true ]]; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${work_directory}" && -d "${work_directory}" ]]; then
    rm -rf -- "${work_directory}"
  fi

  exit "${exit_status}"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but was not found in PATH."
}

require_config_value() {
  local variable_name=$1
  [[ -n "${!variable_name:-}" ]] || fail "Set ${variable_name} in ${config_file}."
}

resolve_repository_path() {
  local path=$1

  if [[ "${path}" = /* ]]; then
    printf '%s\n' "${path}"
  else
    printf '%s\n' "${REPOSITORY_DIR}/${path}"
  fi
}

r2_aws() {
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION="${REMOTE_DEV_R2_REGION:-auto}" \
    -e AWS_EC2_METADATA_DISABLED=true \
    -v "${work_directory}:/work" \
    "${REMOTE_DEV_AWS_CLI_IMAGE}" \
    --endpoint-url "${R2_ENDPOINT}" \
    "$@"
}

select_local_backup() {
  local backup_directory=$1
  local selected

  [[ -d "${backup_directory}" ]] || fail "Local backup directory does not exist: ${backup_directory}"

  if [[ "${backup_timestamp}" == latest ]]; then
    selected=$(find "${backup_directory}" -maxdepth 1 -type f -printf '%f\n' \
      | sed -n 's/^pg-dump-postgres-\([0-9][0-9]*\)$/\1 &/p' \
      | sort -n \
      | tail -n 1 \
      | cut -d ' ' -f 2-)
  else
    selected="pg-dump-postgres-${backup_timestamp}"
  fi

  [[ -n "${selected}" && -f "${backup_directory}/${selected}" ]] \
    || fail "No matching local backup was found in ${backup_directory}."

  cp -- "${backup_directory}/${selected}" "${work_directory}/raw-backup.dmp"
  echo "Using local backup timestamp ${selected##*-}."
}

select_r2_backup() {
  local prefix=$1
  local selected_key

  prefix=${prefix#/}
  prefix=${prefix%/}

  if [[ "${backup_timestamp}" == latest ]]; then
    selected_key=$(r2_aws s3api list-objects-v2 \
      --bucket "${REMOTE_DEV_R2_BUCKET}" \
      --prefix "${prefix}/" \
      --query 'Contents[].Key' \
      --output text \
      | tr '\t' '\n' \
      | sed -n 's#^\(.*\/\)\{0,1\}pg-dump-postgres-\([0-9][0-9]*\)$#\2 \0#p' \
      | sort -n \
      | tail -n 1 \
      | cut -d ' ' -f 2-)
  else
    selected_key="${prefix}/pg-dump-postgres-${backup_timestamp}"
  fi

  [[ -n "${selected_key}" ]] || fail "No matching R2 backup was found under the configured prefix."

  r2_aws s3 cp \
    "s3://${REMOTE_DEV_R2_BUCKET}/${selected_key}" \
    /work/raw-backup.dmp \
    --only-show-errors

  echo "Using R2 backup timestamp ${selected_key##*-}."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      [[ $# -ge 2 ]] || fail "--source requires a value."
      source_name=$2
      shift 2
      ;;
    --timestamp)
      [[ $# -ge 2 ]] || fail "--timestamp requires a value."
      backup_timestamp=$2
      shift 2
      ;;
    --config)
      [[ $# -ge 2 ]] || fail "--config requires a path."
      config_file=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

[[ "${source_name}" == local || "${source_name}" == r2 ]] \
  || fail "--source must be either 'local' or 'r2'."
[[ "${backup_timestamp}" == latest || "${backup_timestamp}" =~ ^[0-9]+$ ]] \
  || fail "--timestamp must be 'latest' or a numeric backup timestamp."
[[ -f "${config_file}" ]] || fail "Configuration file was not found: ${config_file}"

# shellcheck disable=SC1090
set -a
source "${config_file}"
set +a

require_command docker
require_config_value R2_ACCESS_KEY_ID
require_config_value R2_SECRET_ACCESS_KEY
require_config_value R2_ENDPOINT
require_config_value REMOTE_DEV_R2_BUCKET
require_config_value REMOTE_DEV_SANITIZED_R2_KEY
require_config_value REMOTE_DEV_AWS_CLI_IMAGE
require_config_value REMOTE_DEV_POSTGRES_IMAGE
require_config_value REMOTE_DEV_SANITIZE_SQL_DIR

sanitize_sql_directory=$(resolve_repository_path "${REMOTE_DEV_SANITIZE_SQL_DIR}")
[[ -d "${sanitize_sql_directory}" ]] \
  || fail "Sanitization SQL directory does not exist: ${sanitize_sql_directory}"

shopt -s nullglob
sanitize_sql_files=("${sanitize_sql_directory}"/*.sql)
shopt -u nullglob
(( ${#sanitize_sql_files[@]} > 0 )) \
  || fail "No sanitization SQL files found in ${sanitize_sql_directory}; refusing to export a raw backup."

if docker container inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  fail "Container '${CONTAINER_NAME}' already exists. Refusing to remove it."
fi

work_directory=$(mktemp -d "${TMPDIR:-/tmp}/swubase-sanitize.XXXXXX")
trap cleanup EXIT INT TERM

case "${source_name}" in
  local)
    require_config_value REMOTE_DEV_LOCAL_BACKUP_DIR
    select_local_backup "${REMOTE_DEV_LOCAL_BACKUP_DIR}"
    ;;
  r2)
    require_config_value REMOTE_DEV_RAW_BACKUP_R2_PREFIX
    select_r2_backup "${REMOTE_DEV_RAW_BACKUP_R2_PREFIX}"
    ;;
esac

echo "Starting unexposed temporary PostgreSQL container '${CONTAINER_NAME}'."
docker run -d --name "${CONTAINER_NAME}" \
  --network none \
  -e POSTGRES_PASSWORD=password \
  "${REMOTE_DEV_POSTGRES_IMAGE}" >/dev/null
container_created=true

echo "Waiting for PostgreSQL to become ready."
for attempt in {1..60}; do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi

  if [[ "${attempt}" -eq 60 ]]; then
    docker logs "${CONTAINER_NAME}" >&2
    fail "PostgreSQL did not become ready within 60 seconds."
  fi

  sleep 1
done

docker cp "${work_directory}/raw-backup.dmp" "${CONTAINER_NAME}:/tmp/raw-backup.dmp"
docker exec "${CONTAINER_NAME}" createdb -U postgres "${CLEAN_DATABASE}"

echo "Restoring the raw backup."
docker exec "${CONTAINER_NAME}" pg_restore \
  -U postgres \
  -d "${CLEAN_DATABASE}" \
  --clean --if-exists \
  --no-owner --no-privileges \
  /tmp/raw-backup.dmp

for sql_file in "${sanitize_sql_files[@]}"; do
  echo "Applying sanitization SQL: $(basename "${sql_file}")"
  docker exec -i "${CONTAINER_NAME}" psql \
    -v ON_ERROR_STOP=1 \
    -U postgres \
    -d "${CLEAN_DATABASE}" < "${sql_file}"
done

echo "Creating the sanitized dump."
docker exec "${CONTAINER_NAME}" pg_dump \
  -U postgres \
  -d "${CLEAN_DATABASE}" \
  --format=custom \
  --no-owner --no-privileges \
  --file=/tmp/swubase-clean-db.dmp
docker exec "${CONTAINER_NAME}" pg_restore --list /tmp/swubase-clean-db.dmp >/dev/null
docker cp "${CONTAINER_NAME}:/tmp/swubase-clean-db.dmp" "${work_directory}/swubase-clean-db.dmp"

echo "Uploading the sanitized dump to R2."
r2_aws s3 cp \
  /work/swubase-clean-db.dmp \
  "s3://${REMOTE_DEV_R2_BUCKET}/${REMOTE_DEV_SANITIZED_R2_KEY#/}" \
  --only-show-errors
r2_aws s3api head-object \
  --bucket "${REMOTE_DEV_R2_BUCKET}" \
  --key "${REMOTE_DEV_SANITIZED_R2_KEY#/}" \
  --query ContentLength \
  --output text >/dev/null

echo "Sanitized backup uploaded successfully. Temporary files and container will now be removed."
