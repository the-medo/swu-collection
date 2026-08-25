---
name: swubase-validation
description: Validate SWUBASE backend, frontend, database, and worktree-environment changes with the repository's relevant commands.
---

# SWUBASE validation

Use this skill when implementing or reviewing SWUBASE changes that need local
verification.

Choose the narrowest meaningful checks first:

- Shell tooling: `bash -n` on changed scripts and `git diff --check`.
- Worktree tooling: `scripts/worktree-dev/swubase-worktree-dev status`, plus a
  labelled-container/database smoke check when Docker behavior changed.
- Concurrent-worktree Docker integration: after changes to the worktree
  lifecycle, port registry, Docker ownership labels, restoration, or cleanup,
  run `scripts/worktree-dev/test-concurrent-worktrees.sh`. This is opt-in: it
  creates two temporary Git worktrees and labelled PostgreSQL containers, so do
  not run it for unrelated application changes. It uses an empty local fixture
  dump only; never provide a raw backup or R2 credentials.
- Backend database changes: run `bun run db-migrate` against the intended local
  database and ensure the migration process exits cleanly.
- Frontend changes: `bun run --cwd frontend build`.

For concurrent-worktree behavior, verify distinct container names, volumes,
ports, database URLs, and browser origins. Never test cleanup against an
unlabelled Docker resource or a raw production backup.
