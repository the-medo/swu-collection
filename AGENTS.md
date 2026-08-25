# SWUBASE agent guide

## Worktree development

For Linux/WSL worktrees, use the supported lifecycle command rather than
creating ad-hoc PostgreSQL containers:

```bash
scripts/worktree-dev/swubase-worktree-dev setup
scripts/worktree-dev/swubase-worktree-dev up
scripts/worktree-dev/swubase-worktree-dev status
scripts/worktree-dev/swubase-worktree-dev down
```

Use `refresh-db` only when replacing local development data is intentional.
Use `down --purge-data` or `prune --yes` only after checking the exact labelled
resources the command reports. Never remove unlabelled Docker resources.

Generated `.swubase/`, `.env.worktree`, and `frontend/.env.worktree` files are
local state. Do not commit or copy them between worktrees.

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
For frontend/backend changes, run the focused build or test commands relevant to
the changed area before handing off work.
