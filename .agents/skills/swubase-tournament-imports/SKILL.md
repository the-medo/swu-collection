---
name: swubase-tournament-imports
description: Change SWUBASE Melee or R2 tournament imports, queue processing, imported decks/matches, repair/clear flows, derived statistics, or post-import side effects.
---

# SWUBASE tournament imports

Use this skill for the destructive final-tournament-data workflow. Live
weekend membership, polling, temporary standings/progress, and homepage patches
belong to `swubase-live-tournaments`; load both skills where a finished live
tournament is enqueued for final import.

Primary sources are `server/lib/imports/`,
`server/lib/live-tournaments/tournamentImportQueue.ts`,
`server/crons/process-tournament-import.ts`, and the import/fix/blob/clear
handlers under `server/routes/tournaments/_id/`. Frontend triggers are under
`frontend/src/api/tournaments/` and the corresponding import/export/clear
dialogs. Queue schema and shared realtime contracts live in
`server/db/schema/tournament_weekend.ts` and `types/TournamentWeekend.ts`.

## Import modes and invariants

- Final imported `deck`, `deck_card`, `tournament_deck`, and
  `tournament_match` rows are authoritative. Temporary live-home standings and
  matches must not replace them.
- Automatic enqueue requires a finished, supported-format tournament with
  detected decklists that is not already imported. One queue row exists per
  tournament; a conditional `pending -> running` update claims it against
  competing workers. Failed rows stay failed; current code has no automatic
  retry or lease recovery for stuck running rows.
- Melee decklist GUID is the practical rerun identity. Imported decks belong to
  the seeded `swubase` user. Missing GUIDs or system-user absence weaken
  idempotency and must fail or be handled deliberately.
- Full imports rebuild deck cards/resources and tournament matches. A selected-
  round import replaces only those match rounds and preserves content/resources
  for existing linked decks, while newly encountered decks can still be created
  and populated. Keep those paths distinct.
- The manual Melee POST is fire-and-forget: HTTP success means “started,” not
  “completed.” UI toasts and cache behavior must not report completed import at
  that point.
- Manual Melee import requires the tournament import permission and ownership;
  blob import/export requires the import permission; clear-data is admin-only.
  Keep those server-side gates with their current concealment policy.
- Fix mode repairs opponent links/reversed duplicates; it is not a full import.
  Blob import/export is a separate five-file R2 clone path retaining deck IDs
  and remapping tournament IDs.
- Clear-data must refuse pending/running jobs, preserve the tournament, remove
  final and live derived rows transactionally, delete only unshared `swubase`
  decks, and mark the tournament unimported.
- `tournament.updatedAt` is the browser/Dexie freshness boundary. Completion,
  fix, blob import, and clear flows must update it when their result changes
  visible data and invalidate detail, deck, match, list/statistics, live, and
  applicable IndexedDB caches.

Successful queued processing is ordered: import data; mark imported/update the
tournament; compute tournament, meta, and tournament-group statistics; generate
deck thumbnails; run daily snapshot, screenshotter, and Discord publication;
mark the queue finished; then publish the realtime finished event. The three
post-import side effects return isolated failure results and must not roll back
authoritative imported data.

## Safety and existing gaps

Melee helpers use `TOURNAMENT_COOKIE` and `TOURNAMENT_ORIGIN`. Blob storage,
thumbnail/image uploads, screenshot targets, and Discord remain external
effects even with a local database; daily snapshots are consequential derived
database mutations. Mock them or verify development-only configuration and do
not casually run the import cron as a test.

The current main import has no encompassing transaction, manual imports can run
concurrently without durable job state, failed/stuck queue rows have no recovery
path, some insert errors are logged and swallowed, stale tournament-deck links
can survive, and manual/blob frontend hooks under-invalidate. Blob payloads also
lack strong runtime schemas. Treat each as a consistency boundary when touched.

Final deck parsing currently uses the bundled official catalog. Preview support
must be an explicit decision using `swubase-card-catalog`, not an accidental
change copied from another deck path.

Load `swubase-decks` for imported deck invariants,
`swubase-live-tournaments` for enqueue/realtime behavior,
`swubase-cron-jobs` for the worker, and the screenshotter/Discord skills for
their side effects. Load `swubase-card-catalog` and `swubase-preview-cards` when
introducing preview-card support.

## Validation

Prefer fixed Melee HTML/JSON fixtures and mocked fetch/external effects. Cover
round parsing/fallback, decklist discovery and format selection, byes/draws/
forfeits, unknown cards, full rerun, partial-round preservation, two competing
claims, already-imported/failed/stuck states, isolated side-effect failures,
blob cloning with shared decks, clear-data preservation, and Query/Dexie
freshness. Database tests need an isolated worktree seeded with `swubase`.
Compile the workflow and cron entrypoint, build the frontend, and finish with
`git diff --check`; do not use live Melee/R2/Discord traffic as routine proof.
