---
name: swubase-worktree-dev
description: Set up, run, inspect, or safely clean a Linux/WSL SWUBASE development worktree with its isolated PostgreSQL container.
---

# SWUBASE worktree development

Use this skill when a task needs a local SWUBASE app/database environment in a
Git worktree, or when it changes the worktree setup tooling. It is
agent-neutral: it applies to Codex, Claude Code, terminal sessions, and remote
machines running the repository.

For a newly created worktree, use the standard bootstrap first:

```bash
scripts/worktree-dev/bootstrap-worktree.sh
```

It installs root/frontend dependencies and provisions this worktree's database,
but deliberately does not copy `.env` or start the app. Provide a reviewed,
development-only `.env` through the calling tool's explicit configuration
mechanism before starting application services. Codex Desktop can use
`.worktreeinclude` for that input in its managed worktrees; that is a Codex
adapter, not the shared workflow.

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

The default access profile is `http://localhost:{frontend_port}`. A developer
can configure a machine-local public-origin template, optionally with private
Tailscale Serve, using:

```bash
scripts/worktree-dev/swubase-worktree-dev configure-access \
  --origin-template 'https://machine.tailnet.ts.net:{frontend_port}' \
  --tailscale-serve
```

This profile belongs under the developer's config directory, never in Git or
the shared `.env`. It controls Better Auth's trusted origin, frontend auth
client URL, Vite's allowed host, and same-origin WebSocket proxying while the
backend/database remain loopback-only. Tailscale Serve requires the actual
machine DNS name and HTTPS; the launcher must only create/remove a mapping when
it matches that worktree's exact loopback frontend. Do not use Funnel. Google
callback URIs are exact rather than wildcard; `configure-access --show` prints
the eight possible values. Existing running worktrees need `down` then `up` to
adopt a changed profile.

`up` requires Node as well as Bun: Vite is launched with Node so same-origin
WebSocket proxying works reliably. Do not replace that worktree launcher with
the Bun Vite runtime without revalidating remote WSS behavior.

Do not create fixed-name PostgreSQL containers or reuse another worktree's
database URL. Generated `.swubase/` and `.env.worktree` files are local state;
never commit or manually copy them. Worktrees may restore only from a supplied
safe development dump or the checksum-verified public sanitized manifest;
never use raw production/Coolify backups. Use `swubase-development-data` when
changing that restore or sanitization boundary, and `swubase-validation` when
validating tooling changes.

Each successful `setup`, `up`, or `refresh-db` also manages one deterministic
project-local JetBrains PostgreSQL data source in `.idea/dataSources.xml` plus
its authentication state in `.idea/dataSources.local.xml`, named `SWUBASE local
(<worktree identity>)`. It always connects to the current worktree database over
`127.0.0.1`; under JetBrains Gateway that loopback address belongs to the remote
IDE backend machine, which is exactly where the database container is published.
Its fixed local-only credential is `postgres` / `password`, stored in the
ignored per-worktree datasource URL. The generated local entry uses JetBrains
URL-only (`no-auth`) authentication so it must not create a Password Safe
prompt; do not redirect it through Tailscale or overwrite other data sources.
Repeated setup replaces only the generated entry, and
`down --purge-data` removes only that entry after checking its deterministic
identity. JetBrains may need to download its PostgreSQL JDBC driver once on the
development machine.
