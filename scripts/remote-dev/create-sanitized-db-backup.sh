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
CLEAN_DATABASE="swubase_clean"

source_name=""
backup_timestamp="latest"
config_file="${REPOSITORY_DIR}/.env"
config_file_explicit=false
container_created=false
direct_database_created=false
direct_postgres_mode=false
work_directory=""
source_backup_timestamp=""
lock_file_descriptor=""

usage() {
  cat <<'EOF'
Usage:
  ./scripts/remote-dev/create-sanitized-db-backup.sh --source local|r2 [options]

Options:
  --source SOURCE       Source of the raw backup: local or r2 (required).
  --timestamp VALUE     Backup timestamp, or "latest" (default: latest).
  --config PATH         dotenv configuration file. When omitted, source
                        <repository>/.env when present; otherwise use the
                        current process environment.
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

  if [[ "${direct_database_created}" == true ]]; then
    dropdb --if-exists --force "${CLEAN_DATABASE}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${work_directory}" && -d "${work_directory}" ]]; then
    rm -rf -- "${work_directory}"
  fi

  exit "${exit_status}"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but was not found in PATH."
}

acquire_lock() {
  local lock_file=${REMOTE_DEV_LOCK_FILE:-/tmp/swubase-sanitize-db.lock}

  # The descriptor stays open for the entire script. flock releases it if the
  # process exits unexpectedly, unlike a mkdir-based lock.
  exec {lock_file_descriptor}>"${lock_file}"
  flock -n "${lock_file_descriptor}" \
    || fail "Another sanitized database export is already running."
}

require_config_value() {
  local variable_name=$1
  [[ -n "${!variable_name:-}" ]] \
    || fail "Set ${variable_name} in the environment or ${config_file}."
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
  if [[ "${direct_postgres_mode}" == true ]]; then
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    AWS_DEFAULT_REGION="${REMOTE_DEV_R2_REGION:-auto}" \
    AWS_EC2_METADATA_DISABLED=true \
      aws --endpoint-url "${R2_ENDPOINT}" "$@"
    return
  fi

  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    -e AWS_DEFAULT_REGION="${REMOTE_DEV_R2_REGION:-auto}" \
    -e AWS_EC2_METADATA_DISABLED=true \
    -v "${work_directory}:/work" \
    "${REMOTE_DEV_AWS_CLI_IMAGE}" \
    --endpoint-url "${R2_ENDPOINT}" \
    "$@"
}

r2_work_file() {
  local local_path=$1

  if [[ "${direct_postgres_mode}" == true ]]; then
    printf '%s\n' "${local_path}"
  else
    printf '/work/%s\n' "${local_path##*/}"
  fi
}

backup_timestamp_from_name() {
  local backup_name=${1##*/}

  backup_name=${backup_name#pg-dump-postgres-}
  backup_name=${backup_name%.dmp}
  [[ "${backup_name}" =~ ^[0-9]+$ ]] \
    || fail "Backup name does not contain a numeric timestamp: ${1}"
  printf '%s\n' "${backup_name}"
}

select_local_backup() {
  local backup_directory=$1
  local selected

  [[ -d "${backup_directory}" ]] || fail "Local backup directory does not exist: ${backup_directory}"

  if [[ "${backup_timestamp}" == latest ]]; then
    selected=$(find "${backup_directory}" -maxdepth 1 -type f -printf '%f\n' \
      | sed -n 's/^pg-dump-postgres-\([0-9][0-9]*\)\(\.dmp\)\{0,1\}$/\1 &/p' \
      | sort -n \
      | tail -n 1 \
      | cut -d ' ' -f 2-)
  else
    for candidate in \
      "pg-dump-postgres-${backup_timestamp}" \
      "pg-dump-postgres-${backup_timestamp}.dmp"; do
      if [[ -f "${backup_directory}/${candidate}" ]]; then
        selected=${candidate}
        break
      fi
    done
  fi

  [[ -n "${selected}" && -f "${backup_directory}/${selected}" ]] \
    || fail "No matching local backup was found in ${backup_directory}."

  cp -- "${backup_directory}/${selected}" "${work_directory}/raw-backup.dmp"
  source_backup_timestamp=$(backup_timestamp_from_name "${selected}")
  echo "Using local backup timestamp ${source_backup_timestamp}."
}

select_r2_backup() {
  local prefix=$1
  local selected_key candidate backup_filename

  prefix=${prefix#/}
  prefix=${prefix%/}

  if [[ "${backup_timestamp}" == latest ]]; then
    selected_key=$(r2_aws s3api list-objects-v2 \
      --bucket "${REMOTE_DEV_R2_BUCKET}" \
      --prefix "${prefix}/" \
      --query 'Contents[].Key' \
      --output text \
      | tr '\t' '\n' \
      | sed -n 's#^\(.*\/\)\{0,1\}pg-dump-postgres-\([0-9][0-9]*\)\(\.dmp\)\{0,1\}$#\2 \0#p' \
      | sort -n \
      | tail -n 1 \
      | cut -d ' ' -f 2-)
  else
    for backup_filename in \
      "pg-dump-postgres-${backup_timestamp}" \
      "pg-dump-postgres-${backup_timestamp}.dmp"; do
      candidate="${prefix}/${backup_filename}"
      if r2_aws s3api head-object \
        --bucket "${REMOTE_DEV_R2_BUCKET}" \
        --key "${candidate}" >/dev/null 2>&1; then
        selected_key=${candidate}
        break
      fi
    done
  fi

  [[ -n "${selected_key}" ]] || fail "No matching R2 backup was found under the configured prefix."

  r2_aws s3 cp \
    "s3://${REMOTE_DEV_R2_BUCKET}/${selected_key}" \
    "$(r2_work_file "${work_directory}/raw-backup.dmp")" \
    --only-show-errors

  source_backup_timestamp=$(backup_timestamp_from_name "${selected_key}")
  echo "Using R2 backup timestamp ${source_backup_timestamp}."
}

json_string() {
  local value=$1

  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '"%s"' "${value}"
}

write_manifest() {
  local manifest_file=$1
  local artifact_key=$2
  local artifact_url=$3
  local checksum=$4
  local size_bytes=$5
  local generated_at=$6
  local sql_revision=$7
  local application_revision=$8

  {
    printf '{\n'
    printf '  "formatVersion": 1,\n'
    printf '  "artifactKey": '
    json_string "${artifact_key}"
    printf ',\n  "artifactUrl": '
    json_string "${artifact_url}"
    printf ',\n  "sha256": '
    json_string "${checksum}"
    printf ',\n  "sizeBytes": %s,\n' "${size_bytes}"
    printf '  "generatedAt": '
    json_string "${generated_at}"
    printf ',\n  "sourceBackupTimestamp": '
    json_string "${source_backup_timestamp}"
    printf ',\n  "postgresMajor": "16",\n'
    printf '  "sanitizationSqlRevision": '
    json_string "${sql_revision}"
    printf ',\n  "applicationRevision": '
    json_string "${application_revision}"
    printf '\n}\n'
  } > "${manifest_file}"
}

cleanup_old_immutable_generations() {
  local generations_prefix=$1
  local current_key=$2
  local retention_days=$3
  local cutoff_timestamp old_key

  [[ "${retention_days}" =~ ^[0-9]+$ ]] \
    || fail "REMOTE_DEV_SANITIZED_RETENTION_DAYS must be a non-negative integer."
  cutoff_timestamp=$(date -u -d "-${retention_days} days" +%Y-%m-%dT%H:%M:%SZ)

  while IFS= read -r old_key; do
    [[ -n "${old_key}" && "${old_key}" != None && "${old_key}" != "${current_key}" ]] || continue
    echo "Removing expired immutable sanitized dump generation ${old_key}."
    r2_aws s3 rm "s3://${REMOTE_DEV_R2_BUCKET}/${old_key}" --only-show-errors
  done < <(
    r2_aws s3api list-objects-v2 \
      --bucket "${REMOTE_DEV_R2_BUCKET}" \
      --prefix "${generations_prefix}/" \
      --query "Contents[?LastModified<=\`${cutoff_timestamp}\`].Key" \
      --output text \
      | tr '\t' '\n'
  )
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
      config_file_explicit=true
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

if [[ -f "${config_file}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${config_file}"
  set +a
elif [[ "${config_file_explicit}" == true ]]; then
  fail "Configuration file was not found: ${config_file}"
fi

if [[ -n "${REMOTE_DEV_CLEAN_DB_HOST:-}" ]]; then
  direct_postgres_mode=true
  CLEAN_DATABASE=${REMOTE_DEV_CLEAN_DB_NAME:-${CLEAN_DATABASE}}
  case "${CLEAN_DATABASE}" in
    postgres|template0|template1)
      fail "REMOTE_DEV_CLEAN_DB_NAME must not be a PostgreSQL system database."
      ;;
  esac
  export PGHOST="${REMOTE_DEV_CLEAN_DB_HOST}"
  export PGPORT="${REMOTE_DEV_CLEAN_DB_PORT:-5432}"
  export PGUSER="${REMOTE_DEV_CLEAN_DB_USER:-postgres}"
  export PGPASSWORD="${REMOTE_DEV_CLEAN_DB_PASSWORD:-}"
fi

require_config_value R2_ACCESS_KEY_ID
require_config_value R2_SECRET_ACCESS_KEY
require_config_value R2_ENDPOINT
require_config_value REMOTE_DEV_R2_BUCKET
require_config_value REMOTE_DEV_SANITIZED_R2_KEY
require_config_value REMOTE_DEV_SANITIZED_MANIFEST_R2_KEY
require_config_value REMOTE_DEV_SANITIZED_PUBLIC_BASE_URL
require_config_value REMOTE_DEV_SANITIZE_SQL_DIR
require_command flock

if [[ "${direct_postgres_mode}" == true ]]; then
  require_config_value REMOTE_DEV_CLEAN_DB_HOST
  require_config_value REMOTE_DEV_CLEAN_DB_PASSWORD
  require_command aws
  require_command pg_isready
  require_command createdb
  require_command dropdb
  require_command pg_restore
  require_command pg_dump
  require_command psql
else
  require_command docker
  require_config_value REMOTE_DEV_AWS_CLI_IMAGE
  require_config_value REMOTE_DEV_POSTGRES_IMAGE
fi

: "${REMOTE_DEV_SANITIZED_RETENTION_DAYS:=14}"

sanitize_sql_directory=$(resolve_repository_path "${REMOTE_DEV_SANITIZE_SQL_DIR}")
[[ -d "${sanitize_sql_directory}" ]] \
  || fail "Sanitization SQL directory does not exist: ${sanitize_sql_directory}"

shopt -s nullglob
sanitize_sql_files=("${sanitize_sql_directory}"/*.sql)
shopt -u nullglob
(( ${#sanitize_sql_files[@]} > 0 )) \
  || fail "No sanitization SQL files found in ${sanitize_sql_directory}; refusing to export a raw backup."

acquire_lock

if [[ "${direct_postgres_mode}" == false ]] && docker container inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
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

if [[ "${direct_postgres_mode}" == true ]]; then
  echo "Waiting for private PostgreSQL service '${PGHOST}' to become ready."
  for attempt in {1..60}; do
    if pg_isready -d postgres >/dev/null 2>&1; then
      break
    fi

    if [[ "${attempt}" -eq 60 ]]; then
      fail "Private PostgreSQL service '${PGHOST}' did not become ready within 60 seconds."
    fi

    sleep 1
  done

  dropdb --if-exists --force "${CLEAN_DATABASE}"
  createdb "${CLEAN_DATABASE}"
  direct_database_created=true

  echo "Restoring the raw backup into private PostgreSQL service '${PGHOST}'."
  pg_restore \
    -d "${CLEAN_DATABASE}" \
    --clean --if-exists \
    --no-owner --no-privileges \
    "${work_directory}/raw-backup.dmp"

  for sql_file in "${sanitize_sql_files[@]}"; do
    echo "Applying sanitization SQL: $(basename "${sql_file}")"
    psql -v ON_ERROR_STOP=1 -d "${CLEAN_DATABASE}" < "${sql_file}"
  done

  echo "Creating the sanitized dump."
  pg_dump \
    -d "${CLEAN_DATABASE}" \
    --format=custom \
    --no-owner --no-privileges \
    --file="${work_directory}/swubase-clean-db.dmp"
  pg_restore --list "${work_directory}/swubase-clean-db.dmp" >/dev/null
else
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
fi

require_command sha256sum
dump_checksum=$(sha256sum "${work_directory}/swubase-clean-db.dmp" | awk '{print $1}')
dump_size=$(wc -c < "${work_directory}/swubase-clean-db.dmp" | tr -d ' ')
sanitization_sql_revision=$(sha256sum "${sanitize_sql_files[@]}" | sha256sum | awk '{print $1}')
application_revision=$(git -C "${REPOSITORY_DIR}" rev-parse --short HEAD 2>/dev/null || printf 'unknown')
generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

sanitized_key=${REMOTE_DEV_SANITIZED_R2_KEY#/}
sanitized_directory=$(dirname "${sanitized_key}")
immutable_key="${sanitized_directory}/generations/swubase-clean-db-${source_backup_timestamp}-${dump_checksum:0:16}.dmp"
manifest_key=${REMOTE_DEV_SANITIZED_MANIFEST_R2_KEY#/}
public_base_url=${REMOTE_DEV_SANITIZED_PUBLIC_BASE_URL%/}
artifact_url="${public_base_url}/${immutable_key}"
manifest_file="${work_directory}/swubase-clean-db.manifest.json"
write_manifest \
  "${manifest_file}" \
  "${immutable_key}" \
  "${artifact_url}" \
  "${dump_checksum}" \
  "${dump_size}" \
  "${generated_at}" \
  "${sanitization_sql_revision}" \
  "${application_revision}"

echo "Uploading immutable sanitized dump generation to R2."
r2_aws s3 cp \
  "$(r2_work_file "${work_directory}/swubase-clean-db.dmp")" \
  "s3://${REMOTE_DEV_R2_BUCKET}/${immutable_key}" \
  --cache-control 'public, max-age=31536000, immutable' \
  --only-show-errors
uploaded_size=$(r2_aws s3api head-object \
  --bucket "${REMOTE_DEV_R2_BUCKET}" \
  --key "${immutable_key}" \
  --query ContentLength \
  --output text)
[[ "${uploaded_size}" == "${dump_size}" ]] \
  || fail "Immutable sanitized dump size differs after upload."

# Keep the original fixed key as a compatibility copy. Local worktrees never
# restore from it; they restore only from the immutable URL in the manifest.
echo "Updating compatibility sanitized dump key."
r2_aws s3 cp \
  "$(r2_work_file "${work_directory}/swubase-clean-db.dmp")" \
  "s3://${REMOTE_DEV_R2_BUCKET}/${sanitized_key}" \
  --cache-control 'no-cache' \
  --only-show-errors

# Uploading this last atomically points consumers at a completely uploaded,
# checksum-verified immutable object rather than a key being overwritten.
echo "Publishing sanitized dump manifest."
r2_aws s3 cp \
  "$(r2_work_file "${manifest_file}")" \
  "s3://${REMOTE_DEV_R2_BUCKET}/${manifest_key}" \
  --content-type application/json \
  --cache-control 'no-cache' \
  --only-show-errors
r2_aws s3api head-object \
  --bucket "${REMOTE_DEV_R2_BUCKET}" \
  --key "${manifest_key}" \
  --query ContentLength \
  --output text >/dev/null

cleanup_old_immutable_generations \
  "${sanitized_directory}/generations" \
  "${immutable_key}" \
  "${REMOTE_DEV_SANITIZED_RETENTION_DAYS}"

echo "Sanitized backup generation ${immutable_key} and manifest uploaded successfully. Temporary files and container will now be removed."
