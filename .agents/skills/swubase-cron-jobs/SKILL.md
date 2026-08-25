---
name: swubase-cron-jobs
description: Add or change SWUBASE standalone Bun cron entrypoints, Coolify scheduled commands, Sentry monitor check-ins, queue/locking behavior, and scheduled side effects.
---

# SWUBASE cron jobs

Use this skill for scripts under `server/crons/` or for running them as Coolify
scheduled tasks.

Keep cron entrypoints thin and standalone. Put reusable/testable domain work in
`server/lib/`, then let the cron parse arguments, log a bounded summary, invoke
the library, report monitoring, and exit with `0` for success/intentional no-op
or nonzero for failure. Never import a self-executing cron entrypoint into the
web application.

For a monitored job:

1. Add a unique, descriptive entry to `CRON_SENTRY_MONITOR_SLUGS`.
2. Construct `SentryCron`, call `started()` before work, `finished()` on every
   successful/no-op path, and `crashed(error)` on failure.
3. Flush Sentry before an immediate `process.exit` when losing the final event
   is material.

Design each run to be idempotent or give it an explicit database claim,
advisory lock, or queue transition. Assume schedules can overlap, retry, or be
started manually. Do not keep an in-process scheduler inside the API server;
Coolify owns the schedule and invokes `bun run server/crons/<job>.ts`.

Configuration belongs in environment variables. Do not add silent production
fallbacks. Review every outbound effect—Discord, email, OAuth, R2, HTTP imports,
and uploads—because pointing `DATABASE_URL` at local PostgreSQL does not isolate
those services.

Load `swubase-discord-notifications` for Discord jobs and
`swubase-development-data` for the separate server-only sanitized-backup job.

## Validation

First resolve/import the entrypoint without executing its side effects:

```bash
bun build server/crons/check-live-tournaments.ts --target=bun --packages=external \
  --outfile /tmp/swubase-cron-check.js
```

Replace the example entrypoint with the changed cron. Then run the command
manually against an isolated worktree database and
deliberately configured development integrations. Verify success, no-work,
repeated/concurrent-run, and failure exit codes plus Sentry check-in paths. For
destructive cleanup, inspect the exact affected rows first.
