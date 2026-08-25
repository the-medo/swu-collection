---
name: swubase-validation
description: Validate SWUBASE backend, frontend, database, and worktree-environment changes with the repository's relevant commands.
---

# SWUBASE validation

Use this skill when implementing or reviewing SWUBASE changes that need local
verification.

Choose the narrowest meaningful checks first:

- Every change: `git diff --check` and inspect `git status --short` for generated
  or untracked artifacts that belong to the workflow.
- Shell tooling: `bash -n` on changed scripts and `git diff --check`.
- Worktree tooling: `scripts/worktree-dev/swubase-worktree-dev status`, plus a
  labelled-container/database smoke check when Docker behavior changed.
- Concurrent-worktree Docker integration: after changes to the worktree
  lifecycle, port registry, Docker ownership labels, restoration, or cleanup,
  run `scripts/worktree-dev/test-concurrent-worktrees.sh`. This is opt-in: it
  creates two temporary Git worktrees and labelled PostgreSQL containers, so do
  not run it for unrelated application changes. It uses an empty local fixture
  dump only; never provide a raw backup or R2 credentials.
- Backend libraries/routes: run focused `bun test` files; use
  `bun test server/lib` when the touched domain has no smaller reliable target.
  Smoke-import `server/app.ts` when route composition changed.
- Drizzle schema/migrations: `bunx drizzle-kit check
  --config=drizzle.config.ts`, then `bun run db-migrate` against the intended
  local database.
- Frontend changes: `bun run --cwd frontend build`, plus focused ESLint for the
  changed feature when practical.
- Repository skills/instructions: parse every changed `SKILL.md` frontmatter,
  verify referenced paths exist, and inspect the selection matrix for missing
  or contradictory routing.

For concurrent-worktree behavior, verify distinct container names, volumes,
ports, database URLs, and browser origins. Never test cleanup against an
unlabelled Docker resource or a raw production backup.

Do not use a noisy repository-wide typecheck as a substitute for focused
evidence when it is known to fail on unrelated baseline issues. Report any
unrelated failure separately and still run the closest passing checks.
