#!/usr/bin/env bash

# Shared implementation for the Linux/WSL worktree-development commands.
#
# The local .swubase directory is intentionally worktree-local and ignored.
# The machine-wide registry is deliberately outside the repository so it can
# safely clean resources after Codex or Git deletes a worktree directory.

set -Eeuo pipefail

readonly SWUBASE_WORKTREE_POSTGRES_IMAGE="${SWUBASE_WORKTREE_POSTGRES_IMAGE:-postgres:16-alpine}"
readonly SWUBASE_WORKTREE_POSTGRES_MAJOR="16"
readonly SWUBASE_WORKTREE_DB_PASSWORD="password"
readonly SWUBASE_WORKTREE_DB_PORT_START="5442"
readonly SWUBASE_WORKTREE_DB_PORT_END="5499"
readonly SWUBASE_WORKTREE_BACKEND_PORT_START="3010"
readonly SWUBASE_WORKTREE_BACKEND_PORT_END="3099"
readonly SWUBASE_WORKTREE_FRONTEND_PORT_START="5173"
readonly SWUBASE_WORKTREE_FRONTEND_PORT_END="5180"

readonly SWUBASE_WORKTREE_LIB_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly SWUBASE_WORKTREE_REPOSITORY_DIR="$(cd -- "${SWUBASE_WORKTREE_LIB_DIR}/../.." && pwd -P)"
readonly SWUBASE_WORKTREE_LOCAL_STATE_DIR="${SWUBASE_WORKTREE_REPOSITORY_DIR}/.swubase"
readonly SWUBASE_WORKTREE_LOCAL_STATE_FILE="${SWUBASE_WORKTREE_LOCAL_STATE_DIR}/worktree-dev.env"
readonly SWUBASE_WORKTREE_ENV_FILE="${SWUBASE_WORKTREE_REPOSITORY_DIR}/.env.worktree"
readonly SWUBASE_WORKTREE_FRONTEND_ENV_FILE="${SWUBASE_WORKTREE_REPOSITORY_DIR}/frontend/.env.worktree"
readonly SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_FILE="${SWUBASE_WORKTREE_REPOSITORY_DIR}/.idea/dataSources.xml"
readonly SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_LOCAL_FILE="${SWUBASE_WORKTREE_REPOSITORY_DIR}/.idea/dataSources.local.xml"

readonly SWUBASE_WORKTREE_STATE_ROOT="${SWUBASE_WORKTREE_STATE_ROOT:-${XDG_STATE_HOME:-${HOME}/.local/state}/swubase/worktree-dev}"
readonly SWUBASE_WORKTREE_CONFIG_DIR="${SWUBASE_WORKTREE_CONFIG_DIR:-${XDG_CONFIG_HOME:-${HOME}/.config}/swubase/worktree-dev}"
readonly SWUBASE_WORKTREE_ACCESS_CONFIG_FILE="${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE:-${SWUBASE_WORKTREE_CONFIG_DIR}/access.env}"
readonly SWUBASE_WORKTREE_REGISTRY_DIR="${SWUBASE_WORKTREE_STATE_ROOT}/worktrees"
readonly SWUBASE_WORKTREE_PORT_REGISTRY_DIR="${SWUBASE_WORKTREE_STATE_ROOT}/ports"
readonly SWUBASE_WORKTREE_DUMP_CACHE_DIR="${SWUBASE_WORKTREE_STATE_ROOT}/dumps"
readonly SWUBASE_WORKTREE_LOCK_FILE="${SWUBASE_WORKTREE_STATE_ROOT}/registry.lock"
readonly SWUBASE_WORKTREE_DEFAULT_PUBLIC_ORIGIN_TEMPLATE='http://localhost:{frontend_port}'

log_info() {
  printf '%s\n' "==> $*" >&2
}

log_warning() {
  printf '%s\n' "Warning: $*" >&2
}

fail() {
  printf '%s\n' "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but was not found in PATH."
}

dotenv_value() {
  local dotenv_file=$1
  local key=$2
  local value

  [[ -f "${dotenv_file}" ]] || return 1
  value=$(sed -n -E "s/^${key}=//p" "${dotenv_file}" | tail -n 1)
  [[ -n "${value}" ]] || return 1
  if [[ "${value}" == \"*\" || "${value}" == \'*\' ]]; then
    value=${value:1:${#value}-2}
  fi
  printf '%s\n' "${value}"
}

access_config_value() {
  local key=$1
  local default_value=$2
  local value="${!key:-}"

  if [[ -z "${value}" ]]; then
    value=$(dotenv_value "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}" "${key}" || true)
  fi
  printf '%s\n' "${value:-${default_value}}"
}

resolve_public_origin() {
  local origin_template=$1
  local frontend_port=$2

  ORIGIN_TEMPLATE="${origin_template}" FRONTEND_PORT="${frontend_port}" bun -e '
const template = process.env.ORIGIN_TEMPLATE;
const port = process.env.FRONTEND_PORT;
const placeholder = "{frontend_port}";
if (template.split(placeholder).length !== 2) process.exit(2);

let url;
try {
  url = new URL(template.replace(placeholder, port));
} catch {
  process.exit(2);
}

if (
  !["http:", "https:"].includes(url.protocol) ||
  url.port !== port ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
) {
  process.exit(2);
}

process.stdout.write(`${url.origin}\t${url.hostname.toLowerCase()}\t${url.protocol}`);
'
}

load_requested_access_profile() {
  local resolved_profile

  REQUESTED_SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE=$(access_config_value \
    SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE \
    "${SWUBASE_WORKTREE_DEFAULT_PUBLIC_ORIGIN_TEMPLATE}")
  REQUESTED_SWUBASE_WORKTREE_TAILSCALE_SERVE=$(access_config_value \
    SWUBASE_WORKTREE_ACCESS_TAILSCALE_SERVE \
    false)

  case "${REQUESTED_SWUBASE_WORKTREE_TAILSCALE_SERVE}" in
    true|false)
      ;;
    *)
      fail "SWUBASE_WORKTREE_TAILSCALE_SERVE must be true or false."
      ;;
  esac

  resolved_profile=$(resolve_public_origin \
    "${REQUESTED_SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE}" \
    "${SWUBASE_FRONTEND_PORT}") \
    || fail "SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE must be an http(s) origin with exactly one {frontend_port} placeholder and no path."
  IFS=$'\t' read -r \
    REQUESTED_SWUBASE_WORKTREE_PUBLIC_ORIGIN \
    REQUESTED_SWUBASE_WORKTREE_PUBLIC_HOST \
    REQUESTED_SWUBASE_WORKTREE_PUBLIC_PROTOCOL <<< "${resolved_profile}"

  if [[ "${REQUESTED_SWUBASE_WORKTREE_TAILSCALE_SERVE}" == true \
    && "${REQUESTED_SWUBASE_WORKTREE_PUBLIC_PROTOCOL}" != https: ]]; then
    fail "Tailscale Serve requires an https public-origin template."
  fi
}

apply_requested_access_profile() {
  SWUBASE_WORKTREE_PUBLIC_ORIGIN="${REQUESTED_SWUBASE_WORKTREE_PUBLIC_ORIGIN}"
  SWUBASE_WORKTREE_PUBLIC_HOST="${REQUESTED_SWUBASE_WORKTREE_PUBLIC_HOST}"
  SWUBASE_WORKTREE_TAILSCALE_SERVE="${REQUESTED_SWUBASE_WORKTREE_TAILSCALE_SERVE}"
}

hydrate_legacy_access_profile() {
  if [[ -n "${SWUBASE_WORKTREE_PUBLIC_ORIGIN:-}" \
    && -n "${SWUBASE_WORKTREE_PUBLIC_HOST:-}" \
    && -n "${SWUBASE_WORKTREE_TAILSCALE_SERVE:-}" ]]; then
    return 0
  fi

  SWUBASE_WORKTREE_PUBLIC_ORIGIN="http://localhost:${SWUBASE_FRONTEND_PORT}"
  SWUBASE_WORKTREE_PUBLIC_HOST=localhost
  SWUBASE_WORKTREE_TAILSCALE_SERVE=false
}

initialize_registry() {
  umask 077
  mkdir -p \
    "${SWUBASE_WORKTREE_REGISTRY_DIR}" \
    "${SWUBASE_WORKTREE_PORT_REGISTRY_DIR}" \
    "${SWUBASE_WORKTREE_DUMP_CACHE_DIR}"
  chmod 700 \
    "${SWUBASE_WORKTREE_STATE_ROOT}" \
    "${SWUBASE_WORKTREE_REGISTRY_DIR}" \
    "${SWUBASE_WORKTREE_PORT_REGISTRY_DIR}" \
    "${SWUBASE_WORKTREE_DUMP_CACHE_DIR}"
}

acquire_registry_lock() {
  require_command flock
  exec 9>"${SWUBASE_WORKTREE_LOCK_FILE}"
  flock -x 9
}

release_registry_lock() {
  flock -u 9 2>/dev/null || true
  exec 9>&-
}

slugify() {
  local value=$1

  value=$(printf '%s' "${value}" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')
  [[ -n "${value}" ]] || value="worktree"
  printf '%s\n' "${value}"
}

sha256_string() {
  printf '%s' "$1" | sha256sum | awk '{print $1}'
}

sha256_file() {
  sha256sum "$1" | awk '{print $1}'
}

current_branch_for_path() {
  local worktree_path=$1
  local branch

  branch=$(git -C "${worktree_path}" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  printf '%s\n' "${branch:-detached}"
}

identity_for_path() {
  local worktree_path=$1
  local branch path_hash readable_name

  worktree_path=$(cd -- "${worktree_path}" && pwd -P)
  branch=$(current_branch_for_path "${worktree_path}")
  path_hash=$(sha256_string "${worktree_path}" | cut -c1-8)
  readable_name=$(slugify "$(basename "${worktree_path}")-${branch}")
  readable_name=${readable_name:0:40}
  printf '%s-%s\n' "${readable_name}" "${path_hash}"
}

derive_current_identity() {
  git -C "${SWUBASE_WORKTREE_REPOSITORY_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || fail "Run this command from a Git worktree."

  EXPECTED_WORKTREE_PATH="${SWUBASE_WORKTREE_REPOSITORY_DIR}"
  EXPECTED_WORKTREE_BRANCH=$(current_branch_for_path "${EXPECTED_WORKTREE_PATH}")
  EXPECTED_WORKTREE_REVISION=$(git -C "${EXPECTED_WORKTREE_PATH}" rev-parse --short HEAD)
  EXPECTED_WORKTREE_ID=$(identity_for_path "${EXPECTED_WORKTREE_PATH}")
  EXPECTED_WORKTREE_PATH_HASH=$(sha256_string "${EXPECTED_WORKTREE_PATH}" | cut -c1-16)
  EXPECTED_DB_CONTAINER="swubase-db-${EXPECTED_WORKTREE_ID}"
  EXPECTED_DB_VOLUME="swubase-db-data-${EXPECTED_WORKTREE_ID}"
  EXPECTED_DB_NAME="swubase_${EXPECTED_WORKTREE_ID//-/_}"
}

write_assignment() {
  local key=$1
  local value=$2

  printf '%s=%q\n' "${key}" "${value}"
}

write_file_atomically() {
  local target_file=$1
  local writer=$2
  local parent_directory temporary_file

  parent_directory=$(dirname -- "${target_file}")
  mkdir -p "${parent_directory}"
  temporary_file=$(mktemp "${parent_directory}/.$(basename -- "${target_file}").XXXXXX")
  chmod 600 "${temporary_file}"
  "${writer}" "${temporary_file}"
  mv -- "${temporary_file}" "${target_file}"
}

stored_access_config_value() {
  local key=$1
  local default_value=$2
  local value

  value=$(dotenv_value "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}" "${key}" || true)
  printf '%s\n' "${value:-${default_value}}"
}

write_access_config_contents() {
  local target_file=$1

  {
    printf '# Per-machine SWUBASE worktree access profile. Do not commit.\n'
    printf '# {frontend_port} is replaced with the isolated worktree frontend port.\n'
    printf 'SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE=%s\n' "${CONFIGURED_ACCESS_ORIGIN_TEMPLATE}"
    printf 'SWUBASE_WORKTREE_ACCESS_TAILSCALE_SERVE=%s\n' "${CONFIGURED_ACCESS_TAILSCALE_SERVE}"
  } > "${target_file}"
}

print_access_profile() {
  local origin_template=$1
  local tailscale_serve=$2
  local frontend_port resolved_profile public_origin public_host public_protocol

  printf 'Access configuration: %s\n' "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}"
  printf 'Public origin template: %s\n' "${origin_template}"
  printf 'Tailscale Serve: %s\n' "${tailscale_serve}"
  printf 'Google OAuth callbacks to register (Google does not support wildcard callback URIs):\n'
  for ((frontend_port = SWUBASE_WORKTREE_FRONTEND_PORT_START; frontend_port <= SWUBASE_WORKTREE_FRONTEND_PORT_END; frontend_port += 1)); do
    resolved_profile=$(resolve_public_origin "${origin_template}" "${frontend_port}") \
      || fail "Could not resolve the configured public-origin template."
    IFS=$'\t' read -r public_origin public_host public_protocol <<< "${resolved_profile}"
    printf '  %s/api/auth/callback/google\n' "${public_origin}"
  done
}

configure_access() {
  local origin_template tailscale_serve option show_only=false resolved_profile public_origin public_host public_protocol

  origin_template=$(stored_access_config_value \
    SWUBASE_WORKTREE_PUBLIC_ORIGIN_TEMPLATE \
    "${SWUBASE_WORKTREE_DEFAULT_PUBLIC_ORIGIN_TEMPLATE}")
  tailscale_serve=$(stored_access_config_value SWUBASE_WORKTREE_ACCESS_TAILSCALE_SERVE false)

  while [[ $# -gt 0 ]]; do
    option=$1
    case "${option}" in
      --origin-template)
        [[ $# -ge 2 ]] || fail "--origin-template requires a URL template."
        origin_template=$2
        shift 2
        ;;
      --tailscale-serve)
        tailscale_serve=true
        shift
        ;;
      --no-tailscale-serve)
        tailscale_serve=false
        shift
        ;;
      --localhost)
        origin_template="${SWUBASE_WORKTREE_DEFAULT_PUBLIC_ORIGIN_TEMPLATE}"
        tailscale_serve=false
        shift
        ;;
      --show)
        show_only=true
        shift
        ;;
      -h|--help)
        cat <<EOF
Usage:
  scripts/worktree-dev/swubase-worktree-dev configure-access [options]

Options:
  --localhost                    Restore the default localhost-only profile.
  --origin-template URL          http(s) origin with exactly one {frontend_port} placeholder.
  --tailscale-serve              Map each started frontend privately with Tailscale Serve.
  --no-tailscale-serve           Do not manage Tailscale Serve; use an external proxy instead.
  --show                         Print the configured profile and Google callback URIs.
EOF
        return 0
        ;;
      *)
        fail "Unknown configure-access option: ${option}"
        ;;
    esac
  done

  case "${tailscale_serve}" in
    true|false)
      ;;
    *)
      fail "Tailscale Serve must be true or false."
      ;;
  esac
  resolved_profile=$(resolve_public_origin "${origin_template}" "${SWUBASE_WORKTREE_FRONTEND_PORT_START}") \
    || fail "--origin-template must be an http(s) origin with exactly one {frontend_port} placeholder and no path."
  IFS=$'\t' read -r public_origin public_host public_protocol <<< "${resolved_profile}"
  if [[ "${tailscale_serve}" == true && "${public_protocol}" != https: ]]; then
    fail "Tailscale Serve requires an HTTPS public-origin template."
  fi

  if [[ "${show_only}" == true ]]; then
    print_access_profile "${origin_template}" "${tailscale_serve}"
    return 0
  fi

  if [[ "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}" == "${SWUBASE_WORKTREE_CONFIG_DIR}/"* ]]; then
    mkdir -p "${SWUBASE_WORKTREE_CONFIG_DIR}"
    chmod 700 "${SWUBASE_WORKTREE_CONFIG_DIR}"
  else
    mkdir -p "$(dirname -- "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}")"
  fi
  CONFIGURED_ACCESS_ORIGIN_TEMPLATE="${origin_template}"
  CONFIGURED_ACCESS_TAILSCALE_SERVE="${tailscale_serve}"
  write_file_atomically "${SWUBASE_WORKTREE_ACCESS_CONFIG_FILE}" write_access_config_contents
  printf 'Saved per-machine worktree access profile. Existing running worktrees keep their current profile until restarted.\n'
  print_access_profile "${origin_template}" "${tailscale_serve}"
}

write_local_state_contents() {
  local target_file=$1

  {
    printf '# Generated by scripts/worktree-dev/swubase-worktree-dev. Do not commit.\n'
    write_assignment SWUBASE_WORKTREE_ID "${SWUBASE_WORKTREE_ID}"
    write_assignment SWUBASE_WORKTREE_PATH "${SWUBASE_WORKTREE_PATH}"
    write_assignment SWUBASE_WORKTREE_BRANCH "${SWUBASE_WORKTREE_BRANCH}"
    write_assignment SWUBASE_WORKTREE_REVISION "${SWUBASE_WORKTREE_REVISION}"
    write_assignment SWUBASE_WORKTREE_PATH_HASH "${SWUBASE_WORKTREE_PATH_HASH}"
    write_assignment SWUBASE_DB_CONTAINER "${SWUBASE_DB_CONTAINER}"
    write_assignment SWUBASE_DB_VOLUME "${SWUBASE_DB_VOLUME}"
    write_assignment SWUBASE_DB_NAME "${SWUBASE_DB_NAME}"
    write_assignment SWUBASE_DB_PORT "${SWUBASE_DB_PORT}"
    write_assignment SWUBASE_BACKEND_PORT "${SWUBASE_BACKEND_PORT}"
    write_assignment SWUBASE_FRONTEND_PORT "${SWUBASE_FRONTEND_PORT}"
    write_assignment SWUBASE_WORKTREE_PUBLIC_ORIGIN "${SWUBASE_WORKTREE_PUBLIC_ORIGIN}"
    write_assignment SWUBASE_WORKTREE_PUBLIC_HOST "${SWUBASE_WORKTREE_PUBLIC_HOST}"
    write_assignment SWUBASE_WORKTREE_TAILSCALE_SERVE "${SWUBASE_WORKTREE_TAILSCALE_SERVE}"
    write_assignment SWUBASE_AUTH_SECRET "${SWUBASE_AUTH_SECRET}"
    write_assignment SWUBASE_DUMP_SHA256 "${SWUBASE_DUMP_SHA256:-}"
    write_assignment SWUBASE_DUMP_SOURCE "${SWUBASE_DUMP_SOURCE:-}"
  } > "${target_file}"
}

write_registry_contents() {
  local target_file=$1

  {
    printf '# Generated machine-wide worktree registry. No application secrets.\n'
    write_assignment SWUBASE_WORKTREE_ID "${SWUBASE_WORKTREE_ID}"
    write_assignment SWUBASE_WORKTREE_PATH "${SWUBASE_WORKTREE_PATH}"
    write_assignment SWUBASE_WORKTREE_BRANCH "${SWUBASE_WORKTREE_BRANCH}"
    write_assignment SWUBASE_WORKTREE_REVISION "${SWUBASE_WORKTREE_REVISION}"
    write_assignment SWUBASE_WORKTREE_PATH_HASH "${SWUBASE_WORKTREE_PATH_HASH}"
    write_assignment SWUBASE_DB_CONTAINER "${SWUBASE_DB_CONTAINER}"
    write_assignment SWUBASE_DB_VOLUME "${SWUBASE_DB_VOLUME}"
    write_assignment SWUBASE_DB_NAME "${SWUBASE_DB_NAME}"
    write_assignment SWUBASE_DB_PORT "${SWUBASE_DB_PORT}"
    write_assignment SWUBASE_BACKEND_PORT "${SWUBASE_BACKEND_PORT}"
    write_assignment SWUBASE_FRONTEND_PORT "${SWUBASE_FRONTEND_PORT}"
    write_assignment SWUBASE_WORKTREE_PUBLIC_ORIGIN "${SWUBASE_WORKTREE_PUBLIC_ORIGIN}"
    write_assignment SWUBASE_WORKTREE_PUBLIC_HOST "${SWUBASE_WORKTREE_PUBLIC_HOST}"
    write_assignment SWUBASE_WORKTREE_TAILSCALE_SERVE "${SWUBASE_WORKTREE_TAILSCALE_SERVE}"
  } > "${target_file}"
}

write_worktree_env_contents() {
  local target_file=$1
  local frontend_url="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}"
  local frontend_local_url="http://localhost:${SWUBASE_FRONTEND_PORT}"
  local backend_url="http://127.0.0.1:${SWUBASE_BACKEND_PORT}"

  {
    printf '# Generated by scripts/worktree-dev/swubase-worktree-dev. Do not commit.\n'
    write_assignment ENVIRONMENT local
    write_assignment DATABASE_URL "postgresql://postgres:${SWUBASE_WORKTREE_DB_PASSWORD}@127.0.0.1:${SWUBASE_DB_PORT}/${SWUBASE_DB_NAME}"
    write_assignment HOST 127.0.0.1
    write_assignment PORT "${SWUBASE_BACKEND_PORT}"
    write_assignment BETTER_AUTH_SECRET "${SWUBASE_AUTH_SECRET}"
    write_assignment BETTER_AUTH_URL "${frontend_url}"
    write_assignment BETTER_AUTH_COOKIE_PREFIX "swubase-${SWUBASE_WORKTREE_ID}"
    write_assignment VITE_BETTER_AUTH_URL "${frontend_url}"
    write_assignment VITE_BACKEND_URL "${backend_url}"
    write_assignment VITE_GAME_RESULTS_WS_URL "/api/ws/game-results"
    write_assignment VITE_LIVE_TOURNAMENT_WS_URL "/api/ws/live-tournaments/:weekendId"
    write_assignment SCREENSHOTTER_APP_BASE_URL "${frontend_local_url}"
    write_assignment DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL "${frontend_url}"
  } > "${target_file}"
}

write_frontend_env_contents() {
  local target_file=$1
  local frontend_url="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}"
  local backend_url="http://127.0.0.1:${SWUBASE_BACKEND_PORT}"

  {
    printf '# Generated by scripts/worktree-dev/swubase-worktree-dev. Do not commit.\n'
    write_assignment VITE_BETTER_AUTH_URL "${frontend_url}"
    write_assignment VITE_BACKEND_URL "${backend_url}"
    write_assignment VITE_GAME_RESULTS_WS_URL "/api/ws/game-results"
    write_assignment VITE_LIVE_TOURNAMENT_WS_URL "/api/ws/live-tournaments/:weekendId"
  } > "${target_file}"
}

jetbrains_datasource_uuid() {
  local digest

  digest=$(sha256_string "${SWUBASE_WORKTREE_ID}")
  # A deterministic, UUID-shaped identifier lets repeated setup calls replace
  # only this worktree's generated entry rather than adding duplicates.
  printf '%s-%s-5%s-a%s-%s\n' \
    "${digest:0:8}" \
    "${digest:8:4}" \
    "${digest:12:3}" \
    "${digest:16:3}" \
    "${digest:19:12}"
}

jetbrains_datasource_name() {
  printf 'SWUBASE local (%s)\n' "${SWUBASE_WORKTREE_ID}"
}

jetbrains_datasource_entry() {
  local datasource_uuid

  datasource_uuid=$(jetbrains_datasource_uuid)
  cat <<EOF
    <data-source source="LOCAL" name="$(jetbrains_datasource_name)" uuid="${datasource_uuid}">
      <driver-ref>postgresql</driver-ref>
      <synchronize>true</synchronize>
      <jdbc-driver>org.postgresql.Driver</jdbc-driver>
      <jdbc-url>jdbc:postgresql://127.0.0.1:${SWUBASE_DB_PORT}/${SWUBASE_DB_NAME}?user=postgres&amp;password=${SWUBASE_WORKTREE_DB_PASSWORD}</jdbc-url>
      <remarks>Generated for this isolated SWUBASE worktree. Do not edit; run setup to refresh it.</remarks>
      <working-dir>\$PROJECT_DIR\$</working-dir>
    </data-source>
EOF
}

jetbrains_datasource_local_entry() {
  local datasource_uuid

  datasource_uuid=$(jetbrains_datasource_uuid)
  cat <<EOF
    <data-source name="$(jetbrains_datasource_name)" uuid="${datasource_uuid}">
      <auth-provider>no-auth</auth-provider>
      <user-name>postgres</user-name>
      <schema-mapping />
    </data-source>
EOF
}

write_jetbrains_datasource_contents() {
  local target_file=$1
  local datasource_uuid

  if [[ ! -f "${JETBRAINS_DATASOURCE_TARGET_FILE}" ]]; then
    {
      printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>'
      printf '%s\n' '<project version="4">'
      printf '  %s\n' "${JETBRAINS_DATASOURCE_COMPONENT_OPEN}"
      printf '%s\n' "${JETBRAINS_DATASOURCE_ENTRY}"
      printf '%s\n' '  </component>'
      printf '%s\n' '</project>'
    } > "${target_file}"
    return 0
  fi

  datasource_uuid=$(jetbrains_datasource_uuid)
  SWUBASE_JETBRAINS_SOURCE_FILE="${JETBRAINS_DATASOURCE_TARGET_FILE}" \
    SWUBASE_JETBRAINS_DATASOURCE_UUID="${datasource_uuid}" \
    SWUBASE_JETBRAINS_DATASOURCE_ENTRY="${JETBRAINS_DATASOURCE_ENTRY}" \
    SWUBASE_JETBRAINS_DATASOURCE_COMPONENT_NAME="${JETBRAINS_DATASOURCE_COMPONENT_NAME}" \
    bun -e '
const sourceFile = process.env.SWUBASE_JETBRAINS_SOURCE_FILE;
const uuid = process.env.SWUBASE_JETBRAINS_DATASOURCE_UUID;
const entry = process.env.SWUBASE_JETBRAINS_DATASOURCE_ENTRY;
const componentName = process.env.SWUBASE_JETBRAINS_DATASOURCE_COMPONENT_NAME;
const xml = await Bun.file(sourceFile).text();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uuidPattern = escapeRegExp(uuid);
const componentNamePattern = escapeRegExp(componentName);
const dataSourcePattern = new RegExp(
  `<data-source\\b(?=[^>]*\\buuid=["\\x27]${uuidPattern}["\\x27])[^>]*(?:/>|>[\\s\\S]*?</data-source>)`,
  "g",
);
const matches = [...xml.matchAll(dataSourcePattern)];
if (matches.length > 1) {
  throw new Error(`Refusing to update ${sourceFile}: found multiple data sources with the generated UUID.`);
}

let updated;
if (matches.length === 1) {
  updated = xml.replace(dataSourcePattern, entry);
} else {
  const componentPattern = new RegExp(
    `<component\\b(?=[^>]*\\bname=["\\x27]${componentNamePattern}["\\x27])[^>]*>`,
    "g",
  );
  const components = [...xml.matchAll(componentPattern)];
  if (components.length !== 1) {
    throw new Error(
      `Refusing to update ${sourceFile}: expected exactly one ${componentName} component and found ${components.length}.`,
    );
  }
  const componentStart = components[0].index + components[0][0].length;
  const componentEnd = xml.indexOf("</component>", componentStart);
  if (componentEnd === -1) {
    throw new Error(`Refusing to update ${sourceFile}: ${componentName} has no closing tag.`);
  }
  updated = `${xml.slice(0, componentEnd)}\n${entry}\n  ${xml.slice(componentEnd)}`;
}

process.stdout.write(updated);
' > "${target_file}"
}

sync_jetbrains_datasource_file() {
  local target_file=$1
  local component_name=$2
  local component_open=$3
  local datasource_entry=$4
  local JETBRAINS_DATASOURCE_TARGET_FILE
  local JETBRAINS_DATASOURCE_COMPONENT_NAME
  local JETBRAINS_DATASOURCE_COMPONENT_OPEN
  local JETBRAINS_DATASOURCE_ENTRY

  JETBRAINS_DATASOURCE_TARGET_FILE="${target_file}"
  JETBRAINS_DATASOURCE_COMPONENT_NAME="${component_name}"
  JETBRAINS_DATASOURCE_COMPONENT_OPEN="${component_open}"
  JETBRAINS_DATASOURCE_ENTRY="${datasource_entry}"
  if ! write_file_atomically \
    "${target_file}" \
    write_jetbrains_datasource_contents; then
    log_warning "JetBrains datasource was not changed because ${target_file} could not be safely updated."
    return 0
  fi
}

sync_jetbrains_datasource() {
  require_command bun

  sync_jetbrains_datasource_file \
    "${SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_FILE}" \
    DataSourceManagerImpl \
    '<component name="DataSourceManagerImpl" format="xml" multifile-model="true">' \
    "$(jetbrains_datasource_entry)"
  sync_jetbrains_datasource_file \
    "${SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_LOCAL_FILE}" \
    dataSourceStorageLocal \
    '<component name="dataSourceStorageLocal">' \
    "$(jetbrains_datasource_local_entry)"
}

remove_jetbrains_datasource_contents() {
  local target_file=$1
  local datasource_uuid

  datasource_uuid=$(jetbrains_datasource_uuid)
  SWUBASE_JETBRAINS_SOURCE_FILE="${JETBRAINS_DATASOURCE_TARGET_FILE}" \
    SWUBASE_JETBRAINS_DATASOURCE_UUID="${datasource_uuid}" \
    bun -e '
const sourceFile = process.env.SWUBASE_JETBRAINS_SOURCE_FILE;
const uuid = process.env.SWUBASE_JETBRAINS_DATASOURCE_UUID;
const xml = await Bun.file(sourceFile).text();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uuidPattern = escapeRegExp(uuid);
const dataSourcePattern = new RegExp(
  `\\n?\\s*<data-source\\b(?=[^>]*\\buuid=["\\x27]${uuidPattern}["\\x27])[^>]*(?:/>|>[\\s\\S]*?</data-source>)\\s*`,
  "g",
);
const matches = [...xml.matchAll(dataSourcePattern)];
if (matches.length > 1) {
  throw new Error(`Refusing to remove from ${sourceFile}: found multiple data sources with the generated UUID.`);
}
process.stdout.write(matches.length === 1 ? xml.replace(dataSourcePattern, "\n  ") : xml);
' > "${target_file}"
}

remove_jetbrains_datasource_file() {
  local target_file=$1
  local JETBRAINS_DATASOURCE_TARGET_FILE

  [[ -f "${target_file}" ]] || return 0
  if ! command -v bun >/dev/null 2>&1; then
    log_warning "Bun is unavailable, so the generated JetBrains datasource was left unchanged."
    return 0
  fi
  JETBRAINS_DATASOURCE_TARGET_FILE="${target_file}"
  if ! write_file_atomically \
    "${target_file}" \
    remove_jetbrains_datasource_contents; then
    log_warning "The generated JetBrains datasource was left unchanged because ${target_file} could not be safely updated."
  fi
}

remove_jetbrains_datasource() {
  remove_jetbrains_datasource_file "${SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_FILE}"
  remove_jetbrains_datasource_file "${SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_LOCAL_FILE}"
}

write_current_state() {
  write_file_atomically "${SWUBASE_WORKTREE_LOCAL_STATE_FILE}" write_local_state_contents
  write_file_atomically "${SWUBASE_WORKTREE_REGISTRY_DIR}/${SWUBASE_WORKTREE_ID}.env" write_registry_contents
  write_file_atomically "${SWUBASE_WORKTREE_ENV_FILE}" write_worktree_env_contents
  write_file_atomically "${SWUBASE_WORKTREE_FRONTEND_ENV_FILE}" write_frontend_env_contents
  sync_jetbrains_datasource
}

validate_loaded_state() {
  local required_variable

  for required_variable in \
    SWUBASE_WORKTREE_ID \
    SWUBASE_WORKTREE_PATH \
    SWUBASE_WORKTREE_BRANCH \
    SWUBASE_WORKTREE_PATH_HASH \
    SWUBASE_DB_CONTAINER \
    SWUBASE_DB_VOLUME \
    SWUBASE_DB_NAME \
    SWUBASE_DB_PORT \
    SWUBASE_BACKEND_PORT \
    SWUBASE_FRONTEND_PORT \
    SWUBASE_AUTH_SECRET; do
    [[ -n "${!required_variable:-}" ]] || fail "State file is missing ${required_variable}: ${SWUBASE_WORKTREE_LOCAL_STATE_FILE}"
  done

  [[ "${SWUBASE_WORKTREE_PATH}" == "${SWUBASE_WORKTREE_REPOSITORY_DIR}" ]] \
    || fail "State file belongs to a different worktree: ${SWUBASE_WORKTREE_PATH}"

  hydrate_legacy_access_profile
}

load_current_state() {
  [[ -f "${SWUBASE_WORKTREE_LOCAL_STATE_FILE}" ]] || return 1
  # State is generated with bash %q escaping and stored mode 600.
  # shellcheck disable=SC1090
  source "${SWUBASE_WORKTREE_LOCAL_STATE_FILE}"
  validate_loaded_state
}

registry_record_is_live() (
  set -Eeuo pipefail
  local worktree_id=$1
  local registry_file="${SWUBASE_WORKTREE_REGISTRY_DIR}/${worktree_id}.env"

  [[ -f "${registry_file}" ]] || exit 1
  # shellcheck disable=SC1090
  source "${registry_file}"
  [[ -d "${SWUBASE_WORKTREE_PATH}" ]] || exit 1
  git -C "${SWUBASE_WORKTREE_PATH}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 1
  [[ "$(identity_for_path "${SWUBASE_WORKTREE_PATH}")" == "${SWUBASE_WORKTREE_ID}" ]]
)

port_is_in_use() {
  local port=$1

  ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .
}

claim_port() {
  local port_kind=$1
  local start_port=$2
  local end_port=$3
  local port owner_file owner_id

  for ((port = start_port; port <= end_port; port += 1)); do
    owner_file="${SWUBASE_WORKTREE_PORT_REGISTRY_DIR}/${port}"

    if [[ -f "${owner_file}" ]]; then
      owner_id=$(<"${owner_file}")
      if [[ "${owner_id}" == "${SWUBASE_WORKTREE_ID}" ]]; then
        printf '%s\n' "${port}"
        return 0
      fi

      if registry_record_is_live "${owner_id}"; then
        continue
      fi

      # Keep the stale record and its reservation until the user explicitly
      # confirms prune. Removing it here would orphan its labelled container
      # and volume after a branch change at the same worktree path.
      continue
    fi

    if port_is_in_use "${port}"; then
      continue
    fi

    printf '%s\n' "${SWUBASE_WORKTREE_ID}" > "${owner_file}"
    printf '%s\n' "${port}"
    return 0
  done

  fail "No free ${port_kind} port is available in ${start_port}-${end_port}. Run 'prune --yes' for stale worktrees or free a port."
}

release_current_ports() {
  local port owner_file owner_id

  for port in \
    "${SWUBASE_DB_PORT}" \
    "${SWUBASE_BACKEND_PORT}" \
    "${SWUBASE_FRONTEND_PORT}"; do
    owner_file="${SWUBASE_WORKTREE_PORT_REGISTRY_DIR}/${port}"
    [[ -f "${owner_file}" ]] || continue
    owner_id=$(<"${owner_file}")
    [[ "${owner_id}" == "${SWUBASE_WORKTREE_ID}" ]] && rm -f -- "${owner_file}"
  done
}

generate_auth_secret() {
  head -c 32 /dev/urandom | sha256sum | awk '{print $1}'
}

create_current_state() {
  require_command sha256sum
  require_command ss

  SWUBASE_WORKTREE_ID="${EXPECTED_WORKTREE_ID}"
  SWUBASE_WORKTREE_PATH="${EXPECTED_WORKTREE_PATH}"
  SWUBASE_WORKTREE_BRANCH="${EXPECTED_WORKTREE_BRANCH}"
  SWUBASE_WORKTREE_REVISION="${EXPECTED_WORKTREE_REVISION}"
  SWUBASE_WORKTREE_PATH_HASH="${EXPECTED_WORKTREE_PATH_HASH}"
  SWUBASE_DB_CONTAINER="${EXPECTED_DB_CONTAINER}"
  SWUBASE_DB_VOLUME="${EXPECTED_DB_VOLUME}"
  SWUBASE_DB_NAME="${EXPECTED_DB_NAME}"
  SWUBASE_DB_PORT=$(claim_port database "${SWUBASE_WORKTREE_DB_PORT_START}" "${SWUBASE_WORKTREE_DB_PORT_END}")
  SWUBASE_BACKEND_PORT=$(claim_port backend "${SWUBASE_WORKTREE_BACKEND_PORT_START}" "${SWUBASE_WORKTREE_BACKEND_PORT_END}")
  SWUBASE_FRONTEND_PORT=$(claim_port frontend/OAuth "${SWUBASE_WORKTREE_FRONTEND_PORT_START}" "${SWUBASE_WORKTREE_FRONTEND_PORT_END}")
  load_requested_access_profile
  apply_requested_access_profile
  SWUBASE_AUTH_SECRET=$(generate_auth_secret)
  SWUBASE_DUMP_SHA256=""
  SWUBASE_DUMP_SOURCE=""
  write_current_state
}

ensure_current_state() {
  derive_current_identity

  if load_current_state; then
    if [[ "${SWUBASE_WORKTREE_ID}" == "${EXPECTED_WORKTREE_ID}" ]]; then
      load_requested_access_profile
      if [[ "${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" != "${REQUESTED_SWUBASE_WORKTREE_PUBLIC_ORIGIN}" \
        || "${SWUBASE_WORKTREE_TAILSCALE_SERVE}" != "${REQUESTED_SWUBASE_WORKTREE_TAILSCALE_SERVE}" ]]; then
        if service_is_running backend || service_is_running frontend; then
          fail "The machine access profile changed. Run 'down', then 'up' to restart this worktree with the new public origin."
        fi
        apply_requested_access_profile
      fi
      SWUBASE_WORKTREE_BRANCH="${EXPECTED_WORKTREE_BRANCH}"
      SWUBASE_WORKTREE_REVISION="${EXPECTED_WORKTREE_REVISION}"
      write_current_state
      return 0
    fi

    log_warning "The current worktree identity changed from '${SWUBASE_WORKTREE_ID}' to '${EXPECTED_WORKTREE_ID}'. The old labelled resources are retained until 'prune --yes' removes them."
  fi

  create_current_state
}

docker_label() {
  local resource_type=$1
  local resource_name=$2
  local label_name=$3

  case "${resource_type}" in
    container)
      docker container inspect --format "{{ index .Config.Labels \"${label_name}\" }}" "${resource_name}" 2>/dev/null
      ;;
    volume)
      docker volume inspect --format "{{ index .Labels \"${label_name}\" }}" "${resource_name}" 2>/dev/null
      ;;
    *)
      fail "Unsupported Docker resource type: ${resource_type}"
      ;;
  esac
}

assert_current_container_ownership() {
  docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1 || return 0

  [[ "$(docker_label container "${SWUBASE_DB_CONTAINER}" com.swubase.worktree-id)" == "${SWUBASE_WORKTREE_ID}" ]] \
    || fail "Refusing to manage container '${SWUBASE_DB_CONTAINER}' because it is not labelled for this worktree."
  [[ "$(docker_label container "${SWUBASE_DB_CONTAINER}" com.swubase.worktree-path-hash)" == "${SWUBASE_WORKTREE_PATH_HASH}" ]] \
    || fail "Refusing to manage container '${SWUBASE_DB_CONTAINER}' because its worktree path label differs."
}

assert_current_volume_ownership() {
  docker volume inspect "${SWUBASE_DB_VOLUME}" >/dev/null 2>&1 || return 0

  [[ "$(docker_label volume "${SWUBASE_DB_VOLUME}" com.swubase.worktree-id)" == "${SWUBASE_WORKTREE_ID}" ]] \
    || fail "Refusing to manage volume '${SWUBASE_DB_VOLUME}' because it is not labelled for this worktree."
}

wait_for_database() {
  local attempt

  for attempt in {1..60}; do
    if docker exec "${SWUBASE_DB_CONTAINER}" pg_isready -U postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  docker logs "${SWUBASE_DB_CONTAINER}" >&2 || true
  fail "PostgreSQL did not become ready in '${SWUBASE_DB_CONTAINER}'."
}

database_exists() {
  docker exec "${SWUBASE_DB_CONTAINER}" psql -U postgres -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '${SWUBASE_DB_NAME}'" \
    | grep -qx 1
}

start_database_container() {
  require_command docker
  assert_current_container_ownership
  assert_current_volume_ownership

  if docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1; then
    if [[ "$(docker inspect --format '{{.State.Running}}' "${SWUBASE_DB_CONTAINER}")" != true ]]; then
      log_info "Starting PostgreSQL container '${SWUBASE_DB_CONTAINER}'."
      docker start "${SWUBASE_DB_CONTAINER}" >/dev/null
    fi
    wait_for_database
    return 0
  fi

  if ! docker volume inspect "${SWUBASE_DB_VOLUME}" >/dev/null 2>&1; then
    docker volume create \
      --label "com.swubase.worktree-id=${SWUBASE_WORKTREE_ID}" \
      --label "com.swubase.worktree-path-hash=${SWUBASE_WORKTREE_PATH_HASH}" \
      --label "com.swubase.feature=remote-dev-setup" \
      "${SWUBASE_DB_VOLUME}" >/dev/null
  fi

  log_info "Starting PostgreSQL container '${SWUBASE_DB_CONTAINER}' on 127.0.0.1:${SWUBASE_DB_PORT}."
  docker run -d \
    --name "${SWUBASE_DB_CONTAINER}" \
    --label "com.swubase.worktree-id=${SWUBASE_WORKTREE_ID}" \
    --label "com.swubase.worktree-path-hash=${SWUBASE_WORKTREE_PATH_HASH}" \
    --label "com.swubase.feature=remote-dev-setup" \
    -e "POSTGRES_PASSWORD=${SWUBASE_WORKTREE_DB_PASSWORD}" \
    -v "${SWUBASE_DB_VOLUME}:/var/lib/postgresql/data" \
    -p "127.0.0.1:${SWUBASE_DB_PORT}:5432" \
    "${SWUBASE_WORKTREE_POSTGRES_IMAGE}" >/dev/null
  wait_for_database
}

configuration_value() {
  local key=$1
  local default_value=$2
  local dotenv_file="${SWUBASE_WORKTREE_REPOSITORY_DIR}/.env"
  local value="${!key:-}"

  if [[ -z "${value}" ]]; then
    value=$(dotenv_value "${dotenv_file}" "${key}" || true)
  fi
  printf '%s\n' "${value:-${default_value}}"
}

manifest_value() {
  local manifest_file=$1
  local key=$2

  MANIFEST_FILE="${manifest_file}" MANIFEST_KEY="${key}" bun -e '
const manifest = JSON.parse(await Bun.file(process.env.MANIFEST_FILE).text());
const value = manifest[process.env.MANIFEST_KEY];
if (typeof value !== "string" && typeof value !== "number") process.exit(2);
process.stdout.write(String(value));
'
}

assert_same_url_origin() {
  local expected_base_url=$1
  local actual_url=$2

  EXPECTED_BASE_URL="${expected_base_url}" ACTUAL_URL="${actual_url}" bun -e '
const expected = new URL(process.env.EXPECTED_BASE_URL);
const actual = new URL(process.env.ACTUAL_URL);
if (expected.protocol !== "https:" || actual.protocol !== "https:" || expected.origin !== actual.origin) process.exit(1);
'
}

download_url_to_file() {
  local url=$1
  local target_file=$2
  local expected_base_url=$3
  local effective_url

  effective_url=$(curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --proto '=https' \
    --proto-redir '=https' \
    --output "${target_file}" \
    --write-out '%{url_effective}' \
    "${url}")
  assert_same_url_origin "${expected_base_url}" "${effective_url}" \
    || fail "Refusing redirect outside the configured sanitized-dump public origin."
}

download_sanitized_dump() (
  set -Eeuo pipefail
  require_command bun
  require_command curl
  require_command sha256sum

  local public_base_url manifest_key manifest_url manifest_file
  local artifact_url artifact_sha256 artifact_size manifest_format_version postgres_major cache_file temporary_file

  public_base_url=$(configuration_value REMOTE_DEV_SANITIZED_PUBLIC_BASE_URL "https://images.swubase.com")
  manifest_key=$(configuration_value REMOTE_DEV_SANITIZED_MANIFEST_R2_KEY "data/development/sanitized/swubase-clean-db.manifest.json")
  public_base_url=${public_base_url%/}
  manifest_key=${manifest_key#/}
  manifest_url="${public_base_url}/${manifest_key}"
  manifest_file=$(mktemp "${SWUBASE_WORKTREE_DUMP_CACHE_DIR}/manifest.XXXXXX.json")
  trap 'rm -f -- "${manifest_file:-}" "${temporary_file:-}"' EXIT

  log_info "Downloading sanitized dump manifest."
  download_url_to_file "${manifest_url}" "${manifest_file}" "${public_base_url}"
  artifact_url=$(manifest_value "${manifest_file}" artifactUrl) \
    || fail "Sanitized dump manifest does not contain artifactUrl."
  artifact_sha256=$(manifest_value "${manifest_file}" sha256) \
    || fail "Sanitized dump manifest does not contain sha256."
  artifact_size=$(manifest_value "${manifest_file}" sizeBytes) \
    || fail "Sanitized dump manifest does not contain sizeBytes."
  manifest_format_version=$(manifest_value "${manifest_file}" formatVersion) \
    || fail "Sanitized dump manifest does not contain formatVersion."
  postgres_major=$(manifest_value "${manifest_file}" postgresMajor) \
    || fail "Sanitized dump manifest does not contain postgresMajor."

  [[ "${artifact_sha256}" =~ ^[0-9a-f]{64}$ ]] \
    || fail "Sanitized dump manifest contains an invalid SHA-256 checksum."
  [[ "${artifact_size}" =~ ^[0-9]+$ ]] \
    || fail "Sanitized dump manifest contains an invalid sizeBytes value."
  [[ "${manifest_format_version}" == 1 ]] \
    || fail "Sanitized dump manifest format is not supported."
  [[ "${postgres_major}" == "${SWUBASE_WORKTREE_POSTGRES_MAJOR}" ]] \
    || fail "Sanitized dump requires PostgreSQL ${postgres_major}, but this worktree uses ${SWUBASE_WORKTREE_POSTGRES_MAJOR}."
  assert_same_url_origin "${public_base_url}" "${artifact_url}" \
    || fail "Sanitized dump manifest points outside the configured public origin."

  cache_file="${SWUBASE_WORKTREE_DUMP_CACHE_DIR}/${artifact_sha256}.dmp"
  if [[ -f "${cache_file}" && "$(sha256_file "${cache_file}")" == "${artifact_sha256}" ]]; then
    printf '%s\n' "${cache_file}"
    return 0
  fi

  temporary_file=$(mktemp "${SWUBASE_WORKTREE_DUMP_CACHE_DIR}/dump.XXXXXX.dmp")
  log_info "Downloading verified sanitized database dump."
  download_url_to_file "${artifact_url}" "${temporary_file}" "${public_base_url}"
  [[ "$(wc -c < "${temporary_file}" | tr -d ' ')" == "${artifact_size}" ]] \
    || fail "Downloaded sanitized dump size does not match its manifest."
  [[ "$(sha256_file "${temporary_file}")" == "${artifact_sha256}" ]] \
    || fail "Downloaded sanitized dump checksum does not match its manifest."

  mv -- "${temporary_file}" "${cache_file}"
  temporary_file=""
  printf '%s\n' "${cache_file}"
)

resolve_dump_file() {
  local requested_dump=${1:-}
  local resolved_dump

  if [[ -n "${requested_dump}" ]]; then
    [[ -f "${requested_dump}" ]] || fail "Requested dump was not found: ${requested_dump}"
    resolved_dump=$(cd -- "$(dirname -- "${requested_dump}")" && pwd -P)/$(basename -- "${requested_dump}")
    printf '%s\n' "${resolved_dump}"
    return 0
  fi

  if [[ -n "${SWUBASE_DEV_DUMP_PATH:-}" ]]; then
    resolve_dump_file "${SWUBASE_DEV_DUMP_PATH}"
    return 0
  fi

  if [[ -f "${SWUBASE_WORKTREE_REPOSITORY_DIR}/pg-dump.dmp" ]]; then
    printf '%s\n' "${SWUBASE_WORKTREE_REPOSITORY_DIR}/pg-dump.dmp"
    return 0
  fi

  download_sanitized_dump
}

restore_database() {
  local dump_file=$1

  [[ -f "${dump_file}" ]] || fail "Dump file was not found: ${dump_file}"
  log_info "Restoring '${dump_file}' into '${SWUBASE_DB_NAME}'."
  docker cp "${dump_file}" "${SWUBASE_DB_CONTAINER}:/tmp/swubase-worktree.dmp"
  docker exec "${SWUBASE_DB_CONTAINER}" pg_restore --list /tmp/swubase-worktree.dmp >/dev/null \
    || fail "The selected dump is not a valid PostgreSQL custom-format dump."
  docker exec "${SWUBASE_DB_CONTAINER}" dropdb -U postgres --if-exists "${SWUBASE_DB_NAME}"
  docker exec "${SWUBASE_DB_CONTAINER}" createdb -U postgres "${SWUBASE_DB_NAME}"
  docker exec "${SWUBASE_DB_CONTAINER}" pg_restore \
    -U postgres \
    -d "${SWUBASE_DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    /tmp/swubase-worktree.dmp
  docker exec "${SWUBASE_DB_CONTAINER}" rm -f /tmp/swubase-worktree.dmp
}

database_url() {
  printf 'postgresql://postgres:%s@127.0.0.1:%s/%s\n' \
    "${SWUBASE_WORKTREE_DB_PASSWORD}" \
    "${SWUBASE_DB_PORT}" \
    "${SWUBASE_DB_NAME}"
}

run_database_migrations() {
  require_command bun
  log_info "Applying database migrations."
  DATABASE_URL="$(database_url)" bun run db-migrate
}

setup_database() {
  local requested_dump=${1:-}
  local refresh_database=${2:-false}
  local dump_file

  start_database_container

  if [[ "${refresh_database}" == true ]] || ! database_exists; then
    dump_file=$(resolve_dump_file "${requested_dump}")
    restore_database "${dump_file}"
    SWUBASE_DUMP_SHA256=$(sha256_file "${dump_file}")
    SWUBASE_DUMP_SOURCE="${dump_file}"
    write_current_state
  else
    log_info "Database '${SWUBASE_DB_NAME}' already exists; keeping it unchanged. Use refresh-db to restore a new dump."
  fi

  run_database_migrations
}

pid_file_for_service() {
  printf '%s/%s.pid\n' "${SWUBASE_WORKTREE_LOCAL_STATE_DIR}" "$1"
}

log_file_for_service() {
  printf '%s/%s.log\n' "${SWUBASE_WORKTREE_LOCAL_STATE_DIR}" "$1"
}

service_is_running() {
  local service_name=$1
  local pid_file pid process_directory

  pid_file=$(pid_file_for_service "${service_name}")
  [[ -f "${pid_file}" ]] || return 1
  pid=$(<"${pid_file}")
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  process_directory=$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)
  [[ "${process_directory}" == "${SWUBASE_WORKTREE_REPOSITORY_DIR}" || "${process_directory}" == "${SWUBASE_WORKTREE_REPOSITORY_DIR}/frontend" ]]
}

start_backend_service() {
  local pid_file log_file

  service_is_running backend && return 0
  pid_file=$(pid_file_for_service backend)
  log_file=$(log_file_for_service backend)
  rm -f -- "${pid_file}"
  log_info "Starting backend on http://127.0.0.1:${SWUBASE_BACKEND_PORT} for ${SWUBASE_WORKTREE_PUBLIC_ORIGIN}."
  (
    cd -- "${SWUBASE_WORKTREE_REPOSITORY_DIR}"
    exec setsid nohup env \
      ENVIRONMENT=local \
      DATABASE_URL="$(database_url)" \
      HOST=127.0.0.1 \
      PORT="${SWUBASE_BACKEND_PORT}" \
      BETTER_AUTH_SECRET="${SWUBASE_AUTH_SECRET}" \
      BETTER_AUTH_URL="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" \
      VITE_BETTER_AUTH_URL="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" \
      BETTER_AUTH_COOKIE_PREFIX="swubase-${SWUBASE_WORKTREE_ID}" \
      SCREENSHOTTER_APP_BASE_URL="http://localhost:${SWUBASE_FRONTEND_PORT}" \
      DISCORD_TOURNAMENT_RESULTS_APP_BASE_URL="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" \
      bun run dev
  ) >"${log_file}" 2>&1 &
  printf '%s\n' "$!" > "${pid_file}"
}

start_frontend_service() {
  local pid_file log_file

  service_is_running frontend && return 0
  pid_file=$(pid_file_for_service frontend)
  log_file=$(log_file_for_service frontend)
  rm -f -- "${pid_file}"
  log_info "Starting frontend on ${SWUBASE_WORKTREE_PUBLIC_ORIGIN} (bound to 127.0.0.1:${SWUBASE_FRONTEND_PORT})."
  (
    cd -- "${SWUBASE_WORKTREE_REPOSITORY_DIR}/frontend"
    exec setsid nohup env \
      VITE_BETTER_AUTH_URL="${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" \
      VITE_BACKEND_URL="http://127.0.0.1:${SWUBASE_BACKEND_PORT}" \
      VITE_GAME_RESULTS_WS_URL="/api/ws/game-results" \
      VITE_LIVE_TOURNAMENT_WS_URL="/api/ws/live-tournaments/:weekendId" \
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="${SWUBASE_WORKTREE_PUBLIC_HOST}" \
      node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port "${SWUBASE_FRONTEND_PORT}" --strictPort
  ) >"${log_file}" 2>&1 &
  printf '%s\n' "$!" > "${pid_file}"
}

wait_for_http_service() {
  local url=$1
  local description=$2
  local attempt response_code

  for attempt in {1..30}; do
    response_code=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 1 "${url}" || true)
    if [[ "${response_code}" != 000 && -n "${response_code}" ]]; then
      return 0
    fi
    sleep 1
  done

  fail "${description} did not become reachable. See $(log_file_for_service "${description,,}")."
}

tailscale_serve_expected_proxy() {
  printf 'http://127.0.0.1:%s\n' "${SWUBASE_FRONTEND_PORT}"
}

tailscale_self_dns_name() {
  require_command tailscale
  tailscale status --json | bun -e '
const input = await Bun.stdin.text();
const dnsName = JSON.parse(input).Self?.DNSName;
if (typeof dnsName !== "string" || dnsName.length === 0) process.exit(2);
process.stdout.write(dnsName.replace(/\.$/, "").toLowerCase());
'
}

tailscale_serve_mapping_state() {
  local expected_host=$1
  local expected_port=$2

  require_command tailscale
  tailscale serve status --json | \
    TAILSCALE_EXPECTED_HOST="${expected_host}" TAILSCALE_EXPECTED_PORT="${expected_port}" bun -e '
const input = await Bun.stdin.text();
const config = JSON.parse(input);
const host = process.env.TAILSCALE_EXPECTED_HOST.toLowerCase();
const port = process.env.TAILSCALE_EXPECTED_PORT;
const expectedKey = `${host}:${port}`;
const web = config.Web ?? {};
const matchingEntries = Object.entries(web)
  .filter(([key]) => key.toLowerCase().endsWith(`:${port}`));
const expectedEntry = Object.entries(web)
  .find(([key]) => key.toLowerCase() === expectedKey)?.[1];
const proxy = expectedEntry?.Handlers?.["/"]?.Proxy;

if (typeof proxy === "string") {
  process.stdout.write(`proxy\t${proxy}\n`);
} else if (!config.TCP?.[port] && matchingEntries.length === 0) {
  process.stdout.write("missing\t\n");
} else {
  process.stdout.write("other\t\n");
}
'
}

validate_tailscale_serve_profile() {
  local tailscale_dns_name mapping_state mapping_proxy

  [[ "${SWUBASE_WORKTREE_TAILSCALE_SERVE}" == true ]] || return 0
  [[ "${SWUBASE_WORKTREE_PUBLIC_ORIGIN}" == https://* ]] \
    || fail "Tailscale Serve requires an HTTPS public origin."

  tailscale_dns_name=$(tailscale_self_dns_name) \
    || fail "Could not determine this machine's Tailscale DNS name."
  [[ "${SWUBASE_WORKTREE_PUBLIC_HOST}" == "${tailscale_dns_name}" ]] \
    || fail "Tailscale Serve on this machine is available as '${tailscale_dns_name}', not '${SWUBASE_WORKTREE_PUBLIC_HOST}'. Use that hostname in the access profile or disable Tailscale Serve."

  IFS=$'\t' read -r mapping_state mapping_proxy < <(
    tailscale_serve_mapping_state "${SWUBASE_WORKTREE_PUBLIC_HOST}" "${SWUBASE_FRONTEND_PORT}"
  )
  case "${mapping_state}" in
    missing)
      ;;
    proxy)
      [[ "${mapping_proxy}" == "$(tailscale_serve_expected_proxy)" ]] \
        || fail "Tailscale Serve HTTPS port ${SWUBASE_FRONTEND_PORT} already proxies '${mapping_proxy}', not this worktree's loopback frontend."
      ;;
    *)
      fail "Tailscale Serve HTTPS port ${SWUBASE_FRONTEND_PORT} already has an unrelated configuration; refusing to replace it."
      ;;
  esac
}

ensure_tailscale_serve_mapping() {
  local mapping_state mapping_proxy expected_proxy

  [[ "${SWUBASE_WORKTREE_TAILSCALE_SERVE}" == true ]] || return 0
  validate_tailscale_serve_profile
  expected_proxy=$(tailscale_serve_expected_proxy)
  IFS=$'\t' read -r mapping_state mapping_proxy < <(
    tailscale_serve_mapping_state "${SWUBASE_WORKTREE_PUBLIC_HOST}" "${SWUBASE_FRONTEND_PORT}"
  )

  if [[ "${mapping_state}" == proxy && "${mapping_proxy}" == "${expected_proxy}" ]]; then
    return 0
  fi

  log_info "Publishing ${SWUBASE_WORKTREE_PUBLIC_ORIGIN} privately through Tailscale Serve."
  tailscale serve --https="${SWUBASE_FRONTEND_PORT}" --bg "${expected_proxy}"
}

disable_tailscale_serve_mapping() {
  local mapping_state mapping_proxy expected_proxy

  [[ "${SWUBASE_WORKTREE_TAILSCALE_SERVE:-false}" == true ]] || return 0
  if ! command -v tailscale >/dev/null 2>&1; then
    log_warning "Tailscale is unavailable, so this worktree's Serve mapping was left unchanged."
    return 0
  fi

  expected_proxy=$(tailscale_serve_expected_proxy)
  if ! IFS=$'\t' read -r mapping_state mapping_proxy < <(
    tailscale_serve_mapping_state "${SWUBASE_WORKTREE_PUBLIC_HOST}" "${SWUBASE_FRONTEND_PORT}"
  ); then
    log_warning "Could not inspect Tailscale Serve, so this worktree's mapping was left unchanged."
    return 0
  fi

  case "${mapping_state}" in
    missing)
      return 0
      ;;
    proxy)
      if [[ "${mapping_proxy}" != "${expected_proxy}" ]]; then
        log_warning "Tailscale Serve HTTPS port ${SWUBASE_FRONTEND_PORT} no longer points at this worktree; leaving it unchanged."
        return 0
      fi
      log_info "Removing this worktree's private Tailscale Serve mapping on HTTPS port ${SWUBASE_FRONTEND_PORT}."
      tailscale serve --https="${SWUBASE_FRONTEND_PORT}" off
      ;;
    *)
      log_warning "Tailscale Serve HTTPS port ${SWUBASE_FRONTEND_PORT} has an unrelated configuration; leaving it unchanged."
      ;;
  esac
}

start_application_services() {
  require_command bun
  require_command curl
  require_command node
  require_command setsid
  [[ -f "${SWUBASE_WORKTREE_REPOSITORY_DIR}/.env" ]] \
    || fail "Create a development-only .env file before starting the app. See .env.example; do not copy production credentials into a worktree."

  start_database_container
  start_backend_service
  wait_for_http_service "http://127.0.0.1:${SWUBASE_BACKEND_PORT}/api" backend
  start_frontend_service
  wait_for_http_service "http://127.0.0.1:${SWUBASE_FRONTEND_PORT}" frontend
  ensure_tailscale_serve_mapping
}

stop_service() {
  local service_name=$1
  local pid_file pid

  pid_file=$(pid_file_for_service "${service_name}")
  [[ -f "${pid_file}" ]] || return 0
  pid=$(<"${pid_file}")

  if service_is_running "${service_name}"; then
    log_info "Stopping ${service_name}."
    kill "${pid}" 2>/dev/null || true
    for _ in {1..10}; do
      kill -0 "${pid}" 2>/dev/null || break
      sleep 1
    done
    kill -9 "${pid}" 2>/dev/null || true
  fi
  rm -f -- "${pid_file}"
}

stop_current_worktree() {
  local purge_data=${1:-false}

  disable_tailscale_serve_mapping
  stop_service frontend
  stop_service backend

  if docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1; then
    assert_current_container_ownership
    log_info "Stopping PostgreSQL container '${SWUBASE_DB_CONTAINER}'."
    docker stop "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1 || true
  fi

  if [[ "${purge_data}" == true ]]; then
    log_info "Purging this worktree's PostgreSQL container, volume, and generated state."
    if docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1; then
      assert_current_container_ownership
      docker rm -f "${SWUBASE_DB_CONTAINER}" >/dev/null
    fi
    if docker volume inspect "${SWUBASE_DB_VOLUME}" >/dev/null 2>&1; then
      assert_current_volume_ownership
      docker volume rm "${SWUBASE_DB_VOLUME}" >/dev/null
    fi
    release_current_ports
    remove_jetbrains_datasource
    rm -f -- \
      "${SWUBASE_WORKTREE_LOCAL_STATE_FILE}" \
      "${SWUBASE_WORKTREE_ENV_FILE}" \
      "${SWUBASE_WORKTREE_FRONTEND_ENV_FILE}" \
      "${SWUBASE_WORKTREE_REGISTRY_DIR}/${SWUBASE_WORKTREE_ID}.env"
  fi
}

print_status() {
  local container_status="missing"
  local database_health="unavailable"
  local backend_status="stopped"
  local frontend_status="stopped"
  local tailscale_serve_status="not configured"
  local mapping_state mapping_proxy

  if docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1; then
    assert_current_container_ownership
    container_status=$(docker inspect --format '{{.State.Status}}' "${SWUBASE_DB_CONTAINER}")
    if [[ "${container_status}" == running ]] && docker exec "${SWUBASE_DB_CONTAINER}" pg_isready -U postgres >/dev/null 2>&1; then
      database_health="ready"
    fi
  fi
  service_is_running backend && backend_status="running"
  service_is_running frontend && frontend_status="running"

  if [[ "${SWUBASE_WORKTREE_TAILSCALE_SERVE}" == true ]]; then
    if command -v tailscale >/dev/null 2>&1 \
      && IFS=$'\t' read -r mapping_state mapping_proxy < <(
        tailscale_serve_mapping_state "${SWUBASE_WORKTREE_PUBLIC_HOST}" "${SWUBASE_FRONTEND_PORT}"
      ); then
      if [[ "${mapping_state}" == proxy && "${mapping_proxy}" == "$(tailscale_serve_expected_proxy)" ]]; then
        tailscale_serve_status="mapped privately to ${mapping_proxy}"
      elif [[ "${mapping_state}" == missing ]]; then
        tailscale_serve_status="enabled in profile, but not currently mapped"
      else
        tailscale_serve_status="enabled in profile, but occupied by another Serve configuration"
      fi
    else
      tailscale_serve_status="enabled in profile, but Tailscale status is unavailable"
    fi
  fi

  cat <<EOF
Worktree: ${SWUBASE_WORKTREE_PATH}
Identity: ${SWUBASE_WORKTREE_ID}
Branch: ${SWUBASE_WORKTREE_BRANCH} (${SWUBASE_WORKTREE_REVISION})
Database: ${SWUBASE_DB_CONTAINER} (${container_status}; ${database_health})
Database URL: $(database_url)
JetBrains data source: SWUBASE local (${SWUBASE_WORKTREE_ID}) (${SWUBASE_WORKTREE_JETBRAINS_DATASOURCE_FILE})
Backend: http://127.0.0.1:${SWUBASE_BACKEND_PORT} (${backend_status})
Frontend (public): ${SWUBASE_WORKTREE_PUBLIC_ORIGIN} (${frontend_status})
Frontend (loopback): http://localhost:${SWUBASE_FRONTEND_PORT}
Google OAuth callback: ${SWUBASE_WORKTREE_PUBLIC_ORIGIN}/api/auth/callback/google
Tailscale Serve: ${tailscale_serve_status}
Logs: ${SWUBASE_WORKTREE_LOCAL_STATE_DIR}
EOF
}

print_logs() {
  local service_name=${1:-all}

  case "${service_name}" in
    database)
      assert_current_container_ownership
      exec docker logs --tail 200 "${SWUBASE_DB_CONTAINER}"
      ;;
    backend|frontend)
      local log_file
      log_file=$(log_file_for_service "${service_name}")
      [[ -f "${log_file}" ]] || fail "No ${service_name} log exists yet: ${log_file}"
      exec tail -n 200 "${log_file}"
      ;;
    all)
      for service_name in backend frontend; do
        local log_file
        log_file=$(log_file_for_service "${service_name}")
        if [[ -f "${log_file}" ]]; then
          printf '\n=== %s ===\n' "${service_name}"
          tail -n 100 "${log_file}"
        fi
      done
      ;;
    *)
      fail "Unknown log target '${service_name}'. Use database, backend, frontend, or all."
      ;;
  esac
}

remove_stale_worktree() {
  local worktree_id=$1
  local registry_file="${SWUBASE_WORKTREE_REGISTRY_DIR}/${worktree_id}.env"

  [[ -f "${registry_file}" ]] || return 0
  # shellcheck disable=SC1090
  source "${registry_file}"

  disable_tailscale_serve_mapping

  if docker container inspect "${SWUBASE_DB_CONTAINER}" >/dev/null 2>&1; then
    [[ "$(docker_label container "${SWUBASE_DB_CONTAINER}" com.swubase.worktree-id)" == "${SWUBASE_WORKTREE_ID}" ]] \
      || fail "Refusing to prune unowned container '${SWUBASE_DB_CONTAINER}'."
    docker rm -f "${SWUBASE_DB_CONTAINER}" >/dev/null
  fi
  if docker volume inspect "${SWUBASE_DB_VOLUME}" >/dev/null 2>&1; then
    [[ "$(docker_label volume "${SWUBASE_DB_VOLUME}" com.swubase.worktree-id)" == "${SWUBASE_WORKTREE_ID}" ]] \
      || fail "Refusing to prune unowned volume '${SWUBASE_DB_VOLUME}'."
    docker volume rm "${SWUBASE_DB_VOLUME}" >/dev/null
  fi

  release_current_ports
  rm -f -- "${registry_file}"
}

prune_stale_worktrees() {
  local confirmed=${1:-false}
  local registry_file worktree_id stale_ids=()

  shopt -s nullglob
  for registry_file in "${SWUBASE_WORKTREE_REGISTRY_DIR}"/*.env; do
    worktree_id=$(basename -- "${registry_file}" .env)
    registry_record_is_live "${worktree_id}" || stale_ids+=("${worktree_id}")
  done
  shopt -u nullglob

  if (( ${#stale_ids[@]} == 0 )); then
    log_info "No stale SWUBASE worktree resources were found."
    return 0
  fi

  printf '%s\n' "Stale worktree resources:"
  printf '  %s\n' "${stale_ids[@]}"
  if [[ "${confirmed}" != true ]]; then
    printf '%s\n' "Run 'scripts/worktree-dev/swubase-worktree-dev prune --yes' to remove only these labelled resources."
    return 0
  fi

  for worktree_id in "${stale_ids[@]}"; do
    log_info "Pruning stale worktree '${worktree_id}'."
    remove_stale_worktree "${worktree_id}"
  done
}
