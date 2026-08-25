#!/usr/bin/env bash

# Backwards-compatible Codex Desktop adapter. The shared setup entry point is
# bootstrap-worktree.sh and is suitable for any agent or developer.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
exec "${SCRIPT_DIR}/bootstrap-worktree.sh" "$@"
