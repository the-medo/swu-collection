---
name: swubase-development-data
description: Work safely with SWUBASE contributor database sanitization, public sanitized dumps, and development-data retention rules.
---

# SWUBASE development data

Use this skill for changes to database sanitization, contributor dump publishing,
or local restoration of development data.

The server-only producer is
`scripts/remote-dev/create-sanitized-db-backup.sh`. It may access raw Coolify
backups and R2 write credentials from the server's untracked `.env`. Do not put
those paths or credentials in tracked files, local worktree state, or agent
instructions.

Worktrees may consume only the public sanitized manifest and its immutable,
checksum-verified dump generation. A fixed latest dump key is compatibility
output, not a safe restore source. Preserve the producer order: upload and
verify the immutable dump, update any compatibility copy, then publish the
latest manifest last.

Changes that retain contributor data must preserve explicit opt-in semantics.
Local database isolation does not stop outbound service side effects: use only
deliberately configured development endpoints and do not silently fall back to
production values.
