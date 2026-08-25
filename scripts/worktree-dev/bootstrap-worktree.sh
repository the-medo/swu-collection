#!/usr/bin/env bash

# Agent-neutral first-time setup for a Linux/WSL SWUBASE Git worktree.
#
# It installs the repository dependencies and provisions this worktree's
# isolated database. It deliberately does not copy development configuration or
# start application processes: each agent or developer must supply an explicit,
# development-only .env before running `swubase-worktree-dev up`.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly REPOSITORY_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd -P)"

command -v bun >/dev/null 2>&1 || {
  echo "Error: Bun is required for SWUBASE worktree setup." >&2
  exit 1
}

cd -- "${REPOSITORY_DIR}"
bun install
bun install --cwd frontend
exec "${SCRIPT_DIR}/swubase-worktree-dev" setup "$@"
