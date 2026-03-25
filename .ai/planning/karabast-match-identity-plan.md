# Karabast Match Identity Plan

## Problem

- Karabast imports currently write `game_result.match_id = integration_game_data.lobby_id`.
- That is visible in [transformKarabastGameDataToGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/lib/game-results/transformKarabastGameDataToGameResults.ts): `matchId` is assigned directly from `integrationData.lobbyId`.
- The frontend groups match history entirely by `matchId`, so multiple logical matches played in one lobby get merged together.
- That grouping happens in [useGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/frontend/src/components/app/statistics/useGameResults.ts), where games are collected into `matchesObject[matchId]`.

## Recommendation

- Keep `game_result.match_id` as the frontend-facing logical match identifier.
- Stop treating Karabast `lobby_id` as that logical match identifier.
- Introduce a Karabast-specific mapping table that resolves:
  - `lobby_id`
  - `user_id`
  - `deck_id`
  - `opponent_leader_card_id`
  - `opponent_base_card_key`
  into one generated logical `match_id`.

This is the right layer for the fix because the frontend already assumes `matchId` means "these games belong to one match series", not "these games came from one lobby".

## Recommended table shape

I would slightly adjust the proposed schema.

### Suggested table name

- `karabast_lobby_match`

That keeps the table scoped to the integration that actually needs it.

### Suggested columns

- `match_id uuid not null`
- `lobby_id text not null`
- `user_id text not null`
- `deck_id uuid null`
- `opponent_leader_card_id text null`
- `opponent_base_card_key text null`
- `created_at timestamp not null default now()`
- `updated_at timestamp not null default now()`

### Keys and constraints

- Do not use `(match_id, lobby_id, user_id)` as the only primary key.
- Preferred:
  - primary key or unique key on `(match_id, user_id)`
  - unique lookup key on `(lobby_id, user_id, deck_id, opponent_leader_card_id, opponent_base_card_key)`

Why:

- `(match_id, user_id)` models the actual row identity better. One logical match can have up to one row per linked user.
- The lookup uniqueness is what prevents accidentally generating multiple match IDs for the same user/deck/opponent tuple inside one lobby.

### Important null-handling rule

Postgres unique constraints allow multiple `NULL`s, so the lookup key needs a clear normalization strategy.

Recommended behavior:

- normalize non-UUID or `"unknown"` Karabast deck ids to `null`
- normalize missing opponent leader/base to `null`
- either:
  - use an expression unique index with `coalesce(...)`, or
  - store a separate not-null lookup fingerprint column

I prefer a fingerprint column because it makes the get-or-create flow simpler and race-safe.

## Recommended import behavior

For each linked player in one incoming Karabast payload:

1. Build a normalized lookup identity from:
   - `lobbyId`
   - `userId`
   - normalized `deckId`
   - normalized opponent leader card id
   - normalized opponent base card key
2. Look for an existing `karabast_lobby_match` row for that identity.
3. If one exists, reuse its `matchId`.
4. If none exist:
   - generate one new `matchId`
   - create one mapping row for each linked user in the payload using that same `matchId`

That last point is important: if both players are linked in the same payload, both rows should be inserted together with the same `matchId`.

## Why this is better than the current behavior

- Same lobby + same deck + same opponent deck identity stays one match.
- Same lobby + deck change becomes a new match.
- Same lobby + opponent leader/base change becomes a new match.
- Team views still work because both linked players can still share the same logical `matchId`.

## Risks and edge cases to handle

### 1. Race conditions

Two imports for the same lobby can arrive close together. The mapping creation must be transactional and backed by a unique lookup constraint, otherwise two different `matchId`s can be generated for the same logical match.

### 2. Invalid Karabast deck ids

The sample payload already shows `deck.id = "unknown"` in some cases. Right now [transformKarabastGameDataToGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/lib/game-results/transformKarabastGameDataToGameResults.ts) reads that value directly into `deckId`, while [game_result.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/db/schema/game_result.ts) defines `deck_id` as a UUID FK.

Before using deck id in the new mapping key:

- validate it as UUID
- store `null` when it is missing or invalid
- skip the deck lookup query when it is not a valid UUID

### 3. Backfill

Existing Karabast `game_result` rows already have the wrong `matchId`. If you only fix future imports, old stats stay broken.

The nice part is that [upsertGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/lib/game-results/upsertGameResults.ts) already updates `matchId` on conflict by `(userId, gameId)`, so a backfill script can safely recompute and re-upsert historical rows.

### 4. Debugging visibility

After this change, `matchId` will no longer equal `lobbyId`. That is correct, but it may make debugging a bit less obvious.

Recommended small addition:

- store `karabastLobbyId` in `game_result.otherData`, or
- add a dedicated source-lobby column later if you need to query it often

This is optional because raw `lobbyId` already exists in `integration_game_data`.

## Implementation plan

## Phase 1: Add schema and migration

### Goal

Create a persistent, race-safe mapping from Karabast lobby/player identity to logical match IDs.

### What to change

- Add `karabast_lobby_match` to the server schema, likely near the existing integration tables in [integration.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/db/schema/integration.ts).
- Add a Drizzle migration after `0043_ambitious_the_call.sql`.
- Add indexes for:
  - `lobby_id`
  - `(lobby_id, user_id)`
  - lookup uniqueness
  - `(match_id, user_id)` if not the PK

### Decisions

- Normalize `deck_id` to nullable UUID.
- Use either:
  - a dedicated `lookup_key` text column, or
  - a unique expression index over normalized columns.

Recommended: add `lookup_key text not null unique`.

## Phase 2: Add a match-resolution helper

### Goal

Centralize the logic that decides which logical `matchId` each linked player row should receive.

### What to change

- Add a helper such as:
  - `server/lib/game-results/resolveKarabastLobbyMatchIds.ts`
- Input:
  - `integrationGameData`
  - linked user ids
  - normalized player/opponent identity per linked player
- Output:
  - a map like `Record<number, string>` from player index to resolved `matchId`

### Required behavior

- If any linked player identity already has a mapping row, reuse that `matchId`.
- If none exist, generate one `matchId`.
- Insert missing mapping rows for all linked players in the payload using that `matchId`.
- Run the whole lookup/create flow in a transaction.
- Use conflict-safe insert logic so retries do not create divergent mappings.

## Phase 3: Update Karabast transform code

### Goal

Have `game_result.match_id` come from the resolver instead of the raw lobby id.

### What to change

- Update [transformKarabastGameDataToGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/lib/game-results/transformKarabastGameDataToGameResults.ts) so it accepts resolved match ids.
- Replace:
  - `matchId: integrationData.lobbyId`
- With:
  - `matchId: resolvedMatchIds[index]`
- Add a small normalization helper for Karabast deck ids before:
  - reading deck metadata
  - writing `deckId`
  - building the mapping lookup key

### Extra cleanup worth doing in the same pass

- Do not query the `deck` table unless the Karabast deck id is a valid UUID.
- Consider writing `otherData.karabastLobbyId = integrationData.lobbyId`.

## Phase 4: Update the Karabast POST route

### Goal

Resolve match ids as part of the import flow before upserting `game_result` rows.

### What to change

- In [post.ts](C:/Users/marti/Desktop/Projects/swu-collection/server/routes/integration/karabast/game-result/post.ts):
  - keep saving the raw payload into `integration_game_data`
  - after insert, call the new resolver
  - pass the resolved ids into the transform function
  - upsert the transformed results

### Notes

- The current flow already has all the needed data:
  - `lobbyId`
  - linked user ids
  - player deck/opponent identity
- This is the best place to keep the new logic because all imports already flow through this route.

## Phase 5: Backfill historical Karabast rows

### Goal

Repair existing statistics, not just future imports.

### What to change

- Add a one-off backfill script, for example under:
  - `server/lib/game-results/backfillKarabastMatchIds.ts`
- Iterate historical `integration_game_data` rows for the Karabast integration in chronological order.
- For each row:
  - resolve or create mapping rows
  - re-run the transform with resolved `matchId`s
  - call `upsertGameResults`

### Why chronological order matters

- It makes the mapping table evolve in the same order as the real imports.
- It reduces surprises if any lobby had multiple logical matches over time.

## Phase 6: Verify frontend behavior

### Goal

Confirm the existing frontend grouping now produces correct match history without special-case data fixes.

### What to verify

- [useGameResults.ts](C:/Users/marti/Desktop/Projects/swu-collection/frontend/src/components/app/statistics/useGameResults.ts) should now group the correct game sets into one match.
- Team statistics should still mark in-team matches correctly because both linked users still share the same logical `matchId`.
- Deck history should no longer merge games from different deck/opponent configurations played in the same lobby.

### Follow-up note

The current `inTeam-${matchId}` split logic is still a bit awkward, but it is not the root cause here. I would leave that untouched in the first pass and only simplify it after the import fix is live.

## Manual QA checklist

- Same lobby, same deck, same opponent leader/base, multiple games:
  - all games land under one `matchId`
- Same lobby, user switches decks:
  - a new `matchId` is created
- Same lobby, same deck, opponent switches leader or base:
  - a new `matchId` is created
- Only one linked SWUBase user in the lobby:
  - imports still work
  - repeated games of the same pairing reuse the same `matchId`
- Both players linked:
  - both users get the same `matchId` for the same logical match
- Re-import or webhook retry of the same game:
  - no duplicate `game_result` rows
  - `matchId` remains stable
- Payload with `deck.id = "unknown"`:
  - import does not fail
  - deck lookup is skipped
  - match mapping still resolves deterministically
- Team stats:
  - in-team matches still appear for both users
  - deck-filtered team queries still behave as expected

## Recommended implementation order

1. Add the new schema and migration.
2. Add the transactional match-resolution helper.
3. Update the Karabast transform and POST route.
4. Write and run the backfill script.
5. Manually verify frontend match history and team statistics.

## Final recommendation

Your core idea is solid. I would implement it, but with these adjustments:

- make the table explicitly Karabast-specific
- use a lookup uniqueness constraint in addition to the per-row identity key
- normalize invalid deck ids before they touch either the mapping table or `game_result`
- plan for backfill from day one

That version solves the current frontend bug without overloading `lobbyId` with meaning it does not actually have.
