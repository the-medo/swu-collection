---
name: swubase-live-tournaments
description: Change SWUBASE live tournament weekends, Melee polling/progress, import queues, live-home caches/patches, streams/resources, or watched-player behavior.
---

# SWUBASE live tournaments

Use this skill for `server/lib/live-tournaments/`,
`server/routes/tournament-weekends/`, the live tournament schema/frontend, or
the polling/import/reconciliation jobs.

## Domain invariants

- `tournament_weekend.date` is a Saturday. Membership covers tournaments that
  overlap Saturday or Sunday. Reconciliation reports drift; explicit sync is
  what inserts and deletes membership rows.
- A partial unique index permits only one `is_live = true` weekend. Preserve the
  transaction that clears another live weekend before setting a new one.
- Poll only eligible membership rows with live checks enabled and a Melee ID.
  Recompute weekend status counters after membership/status changes.
- A finished supported-format tournament with decklists may enqueue one import.
  The unique tournament import row and conditional `pending -> running` update
  prevent duplicate workers. Failed imports remain failed until explicitly
  handled; do not silently requeue them.
- Keep the core import and derived steps ordered. Current imported side effects
  are isolated results and run daily snapshot, screenshotter, then Discord.
- Live-home cache mutation and WebSocket event creation belong together. Public
  patches bump the weekend version; user-specific watched-player patches do not
  advance the shared public version.
- Every mutation affecting live-home data must call the matching
  `createLive*PatchEvent` helper after persistence succeeds.
- A stream resource's transition from unapproved to approved is the Discord
  stream-notification boundary. Re-saving an already approved row must not
  create a duplicate announcement.

Keep shared response, patch, status, and event contracts in
`types/TournamentWeekend.ts`. Put Melee/API polling logic in the domain library,
not directly in routes or cron entrypoints.

Load `swubase-websockets` for patch transport, `swubase-cron-jobs` for polling
or import workers, `swubase-discord-notifications` for announcements,
`swubase-screenshotter` for import media, and the API/frontend skills for route
or screen changes.

## Validation

Against an isolated worktree database, test Saturday validation, overlap
membership sync/reconciliation, only-one-live enforcement, eligible/no-op
polling, two competing import claims, failed import state, cache version gaps,
watched-player scoping, and resource approval transitions. Run the frontend
build when shared contracts or live-home UI change. Database isolation alone is
not enough for polling/import tests: mock the domain calls or explicitly review
development-only Melee, R2, screenshotter, and Discord configuration and disable
optional side effects that are outside the test.
