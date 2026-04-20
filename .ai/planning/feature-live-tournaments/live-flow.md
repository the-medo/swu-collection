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
8. If the tournament is finished, the format expects Melee decklists, and decklists are detected or any progress field is missing, call `liveTournamentProgressCheck` to backfill the final live snapshot and capture leader/base data exposed in match rows.
9. If the tournament is finished, the format expects Melee decklists, decklists are detected, and `tournament.imported = false`, insert a pending `tournament_import` row with `onConflictDoNothing`.
10. Recompute weekend status counters.
11. Publish a live tournament event. The current event publisher is still a no-op until the WebSocket route is implemented.

### Format gate for decklists

The live flow only expects Melee decklists for these constructed tournament formats:

- `Premier`
- `Eternal`

Those are represented by `meleeDecklistFormatIds` in `server/lib/live-tournaments/tournamentFormat.ts`.

Limited formats, such as `Sealed play`, do not need the finished-tournament decklist/progress path. They can still run live progress checks while their status is `running`, but once they are `finished`, the cron should not keep polling them just because `has_decklists = false` or final progress fields are empty.

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

When the mapped status is `finished` and the tournament format expects decklists, the checker also calls `fetchTournamentView`, then fetches the final round standings to detect decklists. It first checks `standing.Decklists`, then checks the first few player hover details through `GetPlayerDetails`, matching the existing finished import fallback.

## Current Progress Flow

### Entry point

`liveTournamentProgressCheck({ weekendId, tournamentId })` runs after a tournament detail check says the tournament is running, when a finished decklist-expected tournament has newly detected decklists, when a finished decklist-expected tournament is missing its final progress fields, or when called manually.

It does this:

1. Load the weekend tournament row and tournament.
2. Skip if either the row or Melee id is missing.
3. Call `fetchLiveTournamentProgressFromMelee`.
4. Upsert all players seen in standings and matches into `player`.
5. Upsert tournament-player rows into `tournament_weekend_player`, preserving any already-known leader/base values.
6. Upsert standings into `tournament_standing` for the current live round.
7. Upsert live matches into `tournament_weekend_match`.
8. Recompute each tournament player's `match_score` and `game_score` from stored live match rows.
9. Update the weekend tournament row with:
   - `round_number`
   - `round_name`
   - `matches_total`
   - `matches_remaining`
   - merged `additional_data`
   - `last_updated_at`
10. Derive undefeated players for round 4+ from standings where match losses are zero.
11. Derive bracket rounds from live match objects whose round name is `Quarterfinals`, `Semifinals`, or `Finals`.
12. Publish a progress event. This is also currently a no-op until WebSockets are added.

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

Standings are fetched for the current round. Matches are fetched for every started round that still needs importing. A round needs importing when Melee has started it and either it is still running or there are no local `tournament_weekend_match` rows for that completed round yet.

Completed rounds that already have local match rows are skipped. For example, if round 7 is running and rounds 1-6 are completed with stored matches, only round 7 is fetched again.

When Melee includes a competitor decklist name in the match response, the live parser extracts leader and base without fetching the full decklist. The expected name shape is:

```ts
`${leaderCardName} - ${baseCardName}`;
```

Both names are converted through `transformToId` and must exist in `cardList`. The leader id is saved directly to `tournament_weekend_player.leader_card_id`. The base card id is converted to the stored base key through `getBaseKey`, so basic bases can be grouped by their shared special key from `baseSpecialNames`.

Because Melee usually keeps decklists hidden until late in the tournament, empty decklist names are normal. The player upsert preserves an already-known leader/base value when a later response omits decklist data.

Leader/base data lives in `tournament_weekend_player`, not `tournament_weekend_match`. The new table is keyed by `tournament_id` and `player_id`, and will hold the player's leader, base key, match score, and game score for the live weekend view. This keeps per-player identity and aggregate score data separate from per-round match rows.

During live progress import, every player seen in standings or matches is upserted into `tournament_weekend_player`. Leader/base values parsed from match `DecklistName` fields are written there with null-safe conflict updates, so a later empty Melee response does not erase previously detected deck information. Weekend detail endpoints return those rows under each tournament's `players` array and attach the matching rows to match entries as `tournamentPlayer1` and `tournamentPlayer2`.

After match rows are upserted, `recomputeTournamentWeekendPlayerScores` recalculates `tournament_weekend_player.match_score` and `game_score` for that tournament. The score pass reads all local `tournament_weekend_match` rows, groups by `tournament_id` and `player_id`, and writes strings like `7-0-1` for matches and `13-3` for games.

Two-player matches count only when the live match row has `updated_at` and both game-win columns populated. This avoids treating in-progress `0-0` rows as draws. A bye (`player_id_2 IS NULL`) counts as a match win for player 1 and uses stored game wins/losses, with missing values treated as `0`.

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
4. Let `liveTournamentCheck` call `liveTournamentProgressCheck` for running tournaments, finished decklist-expected tournaments with newly detected decklists, and finished decklist-expected tournaments with missing progress fields.
5. Let `liveTournamentCheck` enqueue `tournament_import` when a tournament is finished, the format expects decklists, decklists are detected, and `tournament.imported = false`.
6. Capture individual tournament failures without stopping the whole weekend check.
7. Report failures to Sentry with `weekendId`, `tournamentId`, and `meleeId`.

Important selection detail: the script checks unfinished tournaments regardless of format. For finished tournaments, it only keeps selecting formats that expect Melee decklists, and only when `has_decklists = false` or a progress field is missing (`round_number`, `round_name`, `matches_total`, or `matches_remaining`). That avoids missing a pending import when Melee marks a constructed tournament finished before decklists are visible, and it lets an older detail-only check be backfilled later without repeatedly polling finished limited tournaments.

### Every Minute: Tournament Import Queue

Purpose: process finished tournaments after decklists are available.

Flow:

1. Pick one `tournament_import` row with `status = pending`.
2. Mark it `running`, increment `attempts`, set `started_at`, clear old `last_error`, and set `updated_at`.
3. If `tournament.imported = true`, mark the queue row `finished` and skip the destructive import.
4. Run `runTournamentImport(tournamentId)`.
5. Mark `tournament.imported = true`.
6. Run tournament card statistics.
7. If the tournament has a meta, run meta statistics.
8. Update tournament group statistics for every group containing this tournament.
9. Generate deck thumbnails for the tournament.
10. Mark the import row `finished` and set `finished_at`.
11. Publish a no-op `tournament_import.finished` event hook that the future WebSocket implementation can fill in.

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

Decklists may appear after the tournament status becomes finished. For formats that expect decklists, the live check cron keeps checking finished rows while `has_decklists = false` or progress fields are missing, but a long-running live weekend could still benefit from a bounded cutoff later.

Round ids and round numbers are different. Melee endpoints use round ids, while display and database rows use round numbers. Top cut numbering is derived from View button order.

Standings freshness is not explicit. The current live progress check fetches current-round standings each run. Later, this can be optimized by checking `data-is-completed`, stored round ids, or a lightweight hash of standings rows.

Match rows do not currently store round names. The live result can derive bracket rounds from in-memory match objects, and `additional_data.liveRounds` stores a number-to-name map, but the table itself only stores `round_number`.

Partial writes are possible. Live progress upserts players, standings, and matches in separate operations. If one operation fails, the next cron should repair most data, but a WebSocket event could be missed until the next check.

The finished import is intentionally destructive for that tournament's imported data. It deletes and rebuilds tournament matches and can delete deck cards/resources for existing imported decks. Queue processing should avoid concurrent imports for the same tournament.

Melee match result timestamps can be missing. When `HasResult` is true but no result timestamp exists, the live parser uses other stable timestamps if present. Ongoing matches remain `updated_at = null`.

Time zones need care. Melee `StartDate` is UTC-like. The database column is a timestamp string. UI code should treat `exact_start` consistently and avoid reinterpreting it as local date-only data.

Rate limiting is possible. Current shared helpers use small delays, but the 3-minute live cron can still make multiple requests per tournament. The cron should catch per-tournament failures and should not fan out too aggressively.
