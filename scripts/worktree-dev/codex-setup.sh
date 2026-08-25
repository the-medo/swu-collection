#!/usr/bin/env bash

# Intended for the Linux/WSL setup-script field of a Codex Desktop local
# environment. It is also safe to run manually in a freshly created worktree.

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
exec "${SCRIPT_DIR}/swubase-worktree-dev" setup
