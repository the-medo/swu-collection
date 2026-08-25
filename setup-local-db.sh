#!/usr/bin/env bash

# Backwards-compatible Linux/WSL entry point. The worktree-aware command keeps
# each checkout's PostgreSQL container, volume, ports, and generated state
# separate instead of recreating a fixed shared container.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

exec "${SCRIPT_DIR}/scripts/worktree-dev/swubase-worktree-dev" setup "$@"
