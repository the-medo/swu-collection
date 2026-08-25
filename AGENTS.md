# SWUBASE agent guide

## Repository overview

| Area | Location | Stack |
| --- | --- | --- |
| Backend/API | `server/` | Hono, TypeScript, PostgreSQL, Drizzle |
| Frontend | `frontend/` | React, TypeScript, Vite, TanStack |
| Shared contracts | `types/`, `shared/` | Zod and TypeScript domain contracts |
| Browser persistence | `frontend/src/dexie/` | Dexie/IndexedDB and cache synchronization |
| Database schema/migrations | `server/db/schema/`, `drizzle/` | Drizzle, PostgreSQL |
| Integrations/background work | `server/lib/`, `server/crons/`, `server/screenshotter/` | Discord, Karabast, WebSockets, Coolify jobs, Playwright |
| Local worktree tooling | `scripts/worktree-dev/` | Bash, Docker, PostgreSQL 16 |
| Server-only contributor-data producer | `scripts/remote-dev/` | Bash, PostgreSQL, R2/Coolify |

## Instruction routing

- Before implementing, reviewing, or validating a task, read
  [`.agents/skills/SELECTION-MATRIX.md`](.agents/skills/SELECTION-MATRIX.md)
  and load every repository skill that matches the changed workflow or files.
  Do not load unrelated skills just because they are available.
- Follow the matching skill's required source documents before changing a
  covered workflow. The matrix routes migrations, Karabast, and preview-card
  work to their detailed documentation.
- When writing an implementation plan, name the matching repository skills so
  the implementing agent can load them deliberately.

## Worktree development

For a newly created Linux/WSL worktree, use the agent-neutral bootstrap:

```bash
scripts/worktree-dev/bootstrap-worktree.sh
```

For lifecycle operations, use the supported command rather than creating
ad-hoc PostgreSQL containers:

```bash
scripts/worktree-dev/swubase-worktree-dev setup
scripts/worktree-dev/swubase-worktree-dev up
scripts/worktree-dev/swubase-worktree-dev status
scripts/worktree-dev/swubase-worktree-dev down
```

`setup` is idempotent. Use `refresh-db` only when replacing development data is
intentional. Use `down --purge-data` or `prune --yes` only after checking the
exact labelled resources reported by the command. Never remove unlabelled
Docker resources.

Generated `.swubase/`, `.env.worktree`, and `frontend/.env.worktree` files are
local state. Do not commit or copy them between worktrees. The bootstrap does
not copy `.env` or start the app; each agent/developer must deliberately provide
a development-only `.env` before running `up`.

## Development data and external configuration

Only the public sanitized-dump manifest may be downloaded by a worktree. Raw
Coolify backups, their server paths, and R2 write credentials are server-only.

Development `.env` values may intentionally point to development external
services such as Discord. Do not add silent production fallbacks or invent
credentials. Local PostgreSQL isolation does not prevent external webhooks,
emails, OAuth traffic, or uploads.

## Validation

For changes to worktree tooling, run Bash syntax checks, exercise `status`, and
verify that any Docker resource touched has the current `com.swubase.*` labels.
Run `scripts/worktree-dev/test-concurrent-worktrees.sh` only for worktree
lifecycle, resource-ownership, restore, port, or cleanup changes.

Use `swubase-validation` plus the changed workflow's specialized skill to pick
checks. For backend database changes, run `bun run db-migrate` against the
intended local database. For frontend changes, run
`bun run --cwd frontend build` in addition to focused checks relevant to the
changed behavior.
