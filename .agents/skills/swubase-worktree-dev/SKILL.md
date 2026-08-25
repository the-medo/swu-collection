---
name: swubase-worktree-dev
description: Set up, run, inspect, or safely clean a Linux/WSL SWUBASE development worktree with its isolated PostgreSQL container.
---

# SWUBASE worktree development

Use this skill when a task needs a local SWUBASE app/database environment in a
Git worktree, or when it changes the worktree setup tooling.

Run the lifecycle command from the worktree root:

```bash
scripts/worktree-dev/swubase-worktree-dev setup
scripts/worktree-dev/swubase-worktree-dev up
scripts/worktree-dev/swubase-worktree-dev status
```

`setup` is idempotent and preserves an existing healthy database. Use
`refresh-db` only when the user intends to replace the development data.
`down` stops the worktree services but preserves its volume. `down --purge-data`
and `prune --yes` are destructive and may operate only on the exact labelled
resources reported by the command.

Do not create fixed-name PostgreSQL containers or reuse another worktree's
database URL. Generated `.swubase/` and `.env.worktree` files are local state;
never commit or manually copy them.
