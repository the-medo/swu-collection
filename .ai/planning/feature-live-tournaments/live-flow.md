# Live Tournament Flow

This document describes the current live tournament import/check flow and the cron flow that should be added next. The important split is:

- Live checks keep the homepage current while a tournament is upcoming or running.
- Finished imports use the existing Melee tournament import workflow and remain the source of truth for final deck, leader/base, match, and statistics data.

## Current Live Check Flow

### Entry point

The main live entry point is `liveTournamentCheck({ weekendId, tournamentId })`.

It does this:

1. Load the `tournament_weekend_tournament` row and its `tournament`.
2. Skip if the weekend tournament row does not exist.
3. Skip if the tournament has no `meleeId`.
4. Call `fetchLiveTournamentDetailFromMelee`.
5. Update the main `tournament.attendance` when Melee returns a player count.
6. Update `tournament_weekend_tournament` with:
   - `status`
   - `exact_start`
   - `has_decklists`
   - merged `additional_data`
   - `last_updated_at`
7. If the tournament is running, call `liveTournamentProgressCheck`.
8. If the tournament is finished and decklists are detected, insert a pending `tournament_import` row with `onConflictDoNothing`.
9. Recompute weekend status counters.
10. Publish a live tournament event. The current event publisher is still a no-op until the WebSocket route is implemented.

### Melee detail check

`fetchLiveTournamentDetailFromMelee` calls:

- `GET https://melee.gg/Tournament/GetTournamentDetails?id=${meleeId}`

The detail response is used as follows:

- `Status` is mapped to `upcoming`, `running`, `finished`, or `unknown`.
- `StartDate` is saved to `tournament_weekend_tournament.exact_start`.
- `ParticipationCount` or `ParticipatorCount` is saved to `tournament.attendance`.
- The detail object is saved to `additional_data` after removing:
  - `ID`
  - `BrandImageSource`
  - `OrganizationId`

When the mapped status is `finished`, the checker also calls `fetchTournamentView`, then fetches the final round standings to detect decklists. It first checks `standing.Decklists`, then checks the first few player hover details through `GetPlayerDetails`, matching the existing finished import fallback.

## Current Progress Flow

### Entry point

`liveTournamentProgressCheck({ weekendId, tournamentId })` runs only after a tournament detail check says the tournament is running, or when called manually.

It does this:

1. Load the weekend tournament row and tournament.
2. Skip if either the row or Melee id is missing.
3. Call `fetchLiveTournamentProgressFromMelee`.
4. Upsert all players seen in standings and matches into `player`.
5. Upsert standings into `tournament_standing` for the current live round.
6. Upsert live matches into `tournament_weekend_match`.
7. Update the weekend tournament row with:
   - `round_number`
   - `round_name`
   - `matches_total`
   - `matches_remaining`
   - merged `additional_data`
   - `last_updated_at`
8. Derive undefeated players for round 4+ from standings where match losses are zero.
9. Derive bracket rounds from live match objects whose round name is `Quarterfinals`, `Semifinals`, or `Finals`.
10. Publish a progress event. This is also currently a no-op until WebSockets are added.

### Melee progress calls

`fetchLiveTournamentProgressFromMelee` calls:

- `GET https://melee.gg/Tournament/View/${meleeId}`
- `POST https://melee.gg/Standing/GetRoundStandings`
- `POST https://melee.gg/Match/GetRoundMatches/${roundId}`

The View page is parsed from two button containers:

- `#standings-round-selector-container`
- `#pairings-round-selector-container`

Both sets are merged into ordered round objects:

```ts
{
  number: number;
  id: number;
  name: string;
  started: boolean;
  completed: boolean;
}
```

The round number is the display order from Melee. For example, if the buttons are `Round 1` through `Round 5`, then `Quarterfinals`, `Semifinals`, and `Finals`, the top cut rounds are numbered 6, 7, and 8.

The current round is selected as:

1. First round that is started and not completed.
2. Otherwise latest started or completed round.
3. Otherwise the first round in the View page.

Standings are fetched for the current round. Matches are fetched for the current round and for already-started top cut rounds, so bracket data can be refreshed while a cut is in progress.

## Finished Tournament Import Flow

The finished import remains in `runTournamentImport`. Live code should not duplicate this workflow or write final deck data directly.

The workflow currently does this:

1. Load the `tournament` by id and require `tournament.meleeId`.
2. Call `fetchTournamentView(meleeTournamentId)`.
3. Select the final round id, unless a forced round id was supplied.
4. Fetch standings for that final/forced round.
5. Try to read decklists from standings.
6. If standings do not include decklists, call `GetPlayerDetails` for early standings rows to find decklists exposed on hover.
7. Load existing `tournament_deck` rows.
8. Parse standings into `tournament_deck` rows.
9. Create missing `deck` rows.
10. Add deck resources for the tournament and Melee links.
11. Fetch decklist text from Melee decklist pages.
12. Parse deck text into Swubase cards.
13. Update deck leader/base and deck card rows.
14. Fetch match history through decklist data.
15. If decklist match history is unavailable, fall back to raw round matches for every Melee round id.
16. Delete existing imported `tournament_match` rows, optionally bounded by min/max round.
17. Insert the newly built `tournament_match` rows in batches.
18. Mark imported decks public.

The future import cron should wrap this workflow with queue state and post-import statistics work. It should not change the internals of `runTournamentImport` unless a bug is found there.

## Shared Melee Helpers

`tournamentImportLib.ts` is shared by finished imports and live checks.

Current shared pieces:

- `fetchTournamentView` still returns `finalRoundId` and `allRoundIds` for finished imports.
- `fetchTournamentView` now also returns parsed `rounds` for live progress checks.
- `fetchTournamentDetails` fetches the Melee tournament detail endpoint.
- `fetchRoundStandings` is reused by finished import and live progress.
- `fetchRoundMatches` returns raw Melee match rows and is reused by:
  - live progress parsing
  - the existing `fetchMatchesFromRound` finished-import fallback

This keeps the finished import behavior close to what already existed while avoiding a second implementation of the raw Melee round match request.

## Cron Scripts

The live flow has three standalone Bun cron entry points:

- `server/crons/reconcile-live-tournament-weekend.ts`
- `server/crons/check-live-tournaments.ts`
- `server/crons/process-tournament-import.ts`

Their Sentry monitor slugs are registered in `server/crons/cron-sentry/sentry-init.ts`.

### Hourly Weekend Reconcile

Purpose: catch stale weekend membership.

Flow:

1. Find the active `tournament_weekend` where `is_live = true`.
2. Compute the Saturday-Sunday tournament window with `getTournamentWeekendWindow`.
3. Compare existing `tournament_weekend_tournament` rows with tournaments whose `date` and `days` overlap the weekend.
4. Report mismatches to Sentry with enough data to fix them.

This job is intentionally read-only. Reconcile can delete extraneous rows, and live rows may contain useful progress data, so automatic mutation remains an explicit admin action through `syncTournamentWeekendTournaments`.

### Every 3 Minutes: Live Tournament Check

Purpose: keep active-weekend tournament status, round, standings, and match rows fresh.

Flow:

1. Find the active weekend.
2. Select weekend tournaments with non-empty Melee ids that still need checking.
3. Call `liveTournamentCheck` for each selected tournament.
4. Let `liveTournamentCheck` call `liveTournamentProgressCheck` for running tournaments.
5. Let `liveTournamentCheck` enqueue `tournament_import` when a tournament is finished and decklists are detected.
6. Capture individual tournament failures without stopping the whole weekend check.
7. Report failures to Sentry with `weekendId`, `tournamentId`, and `meleeId`.

Important selection detail: the script checks unfinished tournaments and finished tournaments where `has_decklists = false`. That avoids missing a pending import when Melee marks the tournament finished before decklists are visible.

### Every Minute: Tournament Import Queue

Purpose: process finished tournaments after decklists are available.

Flow:

1. Pick one `tournament_import` row with `status = pending`.
2. Mark it `running`, increment `attempts`, set `started_at`, clear old `last_error`, and set `updated_at`.
3. Run `runTournamentImport(tournamentId)`.
4. Mark `tournament.imported = true`.
5. Run tournament card statistics.
6. If the tournament has a meta, run meta statistics.
7. Update tournament group statistics for every group containing this tournament.
8. Generate deck thumbnails for the tournament.
9. Mark the import row `finished` and set `finished_at`.
10. Publish a no-op `tournament_import.finished` event hook that the future WebSocket implementation can fill in.

Failure flow:

1. Catch the error.
2. Mark the row `failed`.
3. Save a compact `last_error`.
4. Set `updated_at`.
5. Report to Sentry.

The queue worker should process one tournament at a time because the finished import deletes and rewrites imported decks, deck cards, resources, and matches for that tournament.

## Problems To Watch

Melee auth can expire. The live and import helpers rely on `TOURNAMENT_COOKIE` and `TOURNAMENT_ORIGIN`. A stale cookie can make HTML parsing fail or produce a login page instead of tournament markup.

Status strings are not a typed API contract. The status mapper is intentionally broad, but unknown status text will become `unknown`. Unknown statuses should be logged once real data is seen.

Decklists may appear after the tournament status becomes finished. The live check cron keeps checking finished rows while `has_decklists = false`, but a long-running live weekend could still benefit from a bounded cutoff later.

Round ids and round numbers are different. Melee endpoints use round ids, while display and database rows use round numbers. Top cut numbering is derived from View button order.

Standings freshness is not explicit. The current live progress check fetches current-round standings each run. Later, this can be optimized by checking `data-is-completed`, stored round ids, or a lightweight hash of standings rows.

Match rows do not currently store round names. The live result can derive bracket rounds from in-memory match objects, and `additional_data.liveRounds` stores a number-to-name map, but the table itself only stores `round_number`.

Partial writes are possible. Live progress upserts players, standings, and matches in separate operations. If one operation fails, the next cron should repair most data, but a WebSocket event could be missed until the next check.

The finished import is intentionally destructive for that tournament's imported data. It deletes and rebuilds tournament matches and can delete deck cards/resources for existing imported decks. Queue processing should avoid concurrent imports for the same tournament.

Melee match result timestamps can be missing. When `HasResult` is true but no result timestamp exists, the live parser uses other stable timestamps if present. Ongoing matches remain `updated_at = null`.

Time zones need care. Melee `StartDate` is UTC-like. The database column is a timestamp string. UI code should treat `exact_start` consistently and avoid reinterpreting it as local date-only data.

Rate limiting is possible. Current shared helpers use small delays, but the 3-minute live cron can still make multiple requests per tournament. The cron should catch per-tournament failures and should not fan out too aggressively.
