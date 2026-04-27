# Live Tournaments Data And Websockets Plan

## Summary
The current `GET /api/tournament-weekends/live` endpoint reuses the full tournament weekend detail graph. That is useful for admin/detail pages, but it is too heavy for the live homepage: standings, matches, players, and tournament players are repeatedly nested across every tournament and watched player. For a 32 tournament weekend this can reach megabytes, and the same oversized shape would be awkward to send or patch through websockets.

Create a dedicated live-home read model, keep the existing admin/detail route available, cache the public live-home response until live data changes, and use websockets primarily as a query invalidation/update signal for logged-in users.

## Current Findings
- `server/routes/tournament-weekends/live/get.ts` only finds the active weekend and calls `getTournamentWeekendDetail(liveWeekend.id, user?.id)`.
- `getTournamentWeekendDetail` returns a broad object: weekend, tournament groups, tournaments, approved resources, watchlist, watched player names, and watched player detail.
- Each tournament currently contains `standings`, `matches`, and `players`.
- Each match currently nests `match`, `player1`, `player2`, `tournamentPlayer1`, and `tournamentPlayer2`, duplicating player and leader/base data across rounds.
- `watchedPlayers` repeats filtered standings, matches, and tournament player rows for every watched player.
- The live homepage uses only a smaller subset:
  - status counters from `weekend`
  - tournament card fields from `weekendTournament`, `tournament`, `tournamentType`, `winningDeck`, current standings rank 1, undefeated players, bracket availability, and approved resources
  - top 8 match data only inside the bracket dialog
  - watched player watchlist, latest standing, and latest match summaries
  - approved stream resources
  - tournament group leader/base rows for the meta chart
- The admin weekend detail panel uses mostly settings, attached groups, resource counts, and tournament status rows. It does not need full nested match graphs either.

## Target Shape
Add a new live-home response type instead of returning `LiveTournamentWeekendDetail` from the public live endpoint.

Recommended top-level shape:

```ts
type LiveTournamentHomeResponse = {
  data: LiveTournamentHome | null;
  meta: {
    cacheKey: string;
    generatedAt: string;
    version: number;
  };
};

type LiveTournamentHome = {
  weekend: LiveWeekendSummary;
  tournamentGroups: LiveWeekendMetaGroup[];
  tournaments: LiveWeekendTournamentSummary[];
  resources: TournamentWeekendResource[];
  watchlist: PlayerWatchSummary[];
  watchedPlayers: LiveWatchedPlayerSummary[];
};
```

Tournament summary should include only what homepage cards render:
- weekend tournament status fields: status, current round, match counters, start/update timestamps, live check flag, additional data needed for round names
- tournament summary: id, name, date, location, format, attendance, melee id, imported flag
- tournament type label
- winning deck summary for finished tournaments
- current display standings needed for champion fallback and undefeated badges, without nested `player`
- resource ids or approved resources for that tournament if useful for menus
- a bracket hint, such as `hasBracketMatches`, so the UI can show the dialog trigger without preloading all matches

Watched player summary should include:
- display name
- watched row metadata if needed for remove/manage actions
- per active tournament latest standing: tournament id, rank, match record, round number
- per active tournament latest match: tournament id, round number, opponent display name, game score, outcome, updated timestamp

Do not include generic `player` objects in standings or matches unless a screen actually renders `userId`, `createdAt`, or `updatedAt`. Most views only need `displayName`, which already exists on standings and matches.

## Backend Data Work
1. Add dedicated read-model functions in `server/lib/live-tournaments`.
   - `getLiveTournamentHome(weekendId, userId?)`
   - `getLiveTournamentBracket(weekendId, tournamentId)`
   - optional `getLiveTournamentWatchedPlayers(weekendId, userId)` if separating user-specific data makes the cache cleaner

2. Keep `getTournamentWeekendDetail` for admin/detail compatibility at first.
   - After the live endpoint is migrated, consider trimming admin detail too because the admin panel currently does not render full standings or matches.

3. Replace broad joins in the live-home path.
   - Standings: fetch only the display/current round per tournament, and select only standing fields used by the UI.
   - Undefeated players: derive from current standings for round 4+ in the query/read model.
   - Champion fallback: include only rank 1 current standing when no winning deck name is available.
   - Matches: do not include all matches in the live-home response.
   - Bracket: fetch top cut rounds only from a separate endpoint, or include only top cut matches if a separate endpoint proves annoying. Prefer separate endpoint because the dialog is lazy.
   - Watched players: fetch the latest standing and latest match per watched player/tournament with SQL ranking/window logic or grouped post-processing from narrow selected rows.
   - Tournament players: fetch only for bracket players, since leader/base art is only rendered there.

4. Add a bracket endpoint.
   - Suggested route: `GET /api/tournament-weekends/:weekendId/tournaments/:tournamentId/bracket`
   - Response includes only Quarterfinals, Semifinals, and Finals matches, plus the two players' display names, game wins, and leader/base ids.
   - Validate that the tournament belongs to the weekend.
   - Reuse the existing round-name logic from `additionalData.liveRounds`.

5. Add payload measurement during development.
   - Log or locally inspect `Buffer.byteLength(JSON.stringify(data), 'utf8')` for the old and new live responses.
   - Keep a realistic acceptance target: the 32 tournament weekend live payload should drop from about 2 MB to a few hundred KB or less before gzip, excluding lazy bracket requests.

## API And Types
Update `types/TournamentWeekend.ts` or add a sibling type file with clearer public DTOs:
- `LiveTournamentHomeResponse`
- `LiveTournamentHome`
- `LiveWeekendTournamentSummary`
- `LiveTournamentBracketResponse`
- `LiveTournamentBracketMatch`
- `LiveWatchedPlayerSummary`

Frontend hooks:
- Change `useLiveTournamentWeekend` to return `LiveTournamentHomeResponse`.
- Add `useLiveTournamentBracket(weekendId, tournamentId, enabled)`.
- Keep `useGetTournamentWeekend` on the admin/detail shape until that route is intentionally migrated.

Query keys:
- `tournamentWeekendQueryKeys.live()`
- `tournamentWeekendQueryKeys.liveBracket(weekendId, tournamentId)`
- existing `detail(id)` and resource keys remain as they are.

## Frontend Changes
1. Update `LiveTournamentHome` and live homepage sections to consume the lean DTO.
   - Tournament cards should read summary fields directly instead of `entry.standings`, `entry.matches`, and `entry.players`.
   - `getUndefeatedPlayers` should use precomputed undefeated summaries or current standing summaries.
   - `getChampionName` should use winning deck first, then rank 1 standing summary.

2. Lazy-load bracket matches.
   - `BracketPreview` should receive `weekendId`, `tournamentId`, and `hasBracketMatches`.
   - Open the dialog, then run `useLiveTournamentBracket`.
   - Render loading, empty, and error states inside the dialog.

3. Update watched players.
   - `WatchedPlayersSection` should consume `LiveWatchedPlayerSummary[]`.
   - Remove client-side scans over all standings and matches.
   - Keep the existing management dialog and `WatchedPlayersManager` behavior.

4. Update streams and meta sections only as needed.
   - Streams can keep using approved `resources`.
   - Meta can keep using `tournamentGroups[].leaderBase`, but the read model should select only fields needed by the chart.

5. Preserve guest behavior.
   - Guests should continue to use periodic refetch.
   - Logged-in users should eventually rely on websocket invalidation plus stale-time/refetch fallback.

## Caching Plan
Use process-local cache first. Do not introduce Redis or a distributed cache unless deployment requires it later.

Cache entries:
- `live-home:weekend:{weekendId}:public`
- `live-home:weekend:{weekendId}:user:{userId}` only for the personalized watch overlay, or keep the user overlay uncached if it is already cheap after narrowing queries
- `live-bracket:weekend:{weekendId}:tournament:{tournamentId}` with a short TTL

Invalidation triggers:
- live tournament check completes
- live tournament progress check completes
- tournament import finishes
- weekend maintenance changes membership or live weekend state
- resource create/update/delete changes approved resources
- player watch add/remove changes that user's personalized overlay
- tournament weekend group add/remove changes meta chart data

Recommended behavior:
- Cache public live-home data until an invalidation bump occurs, with a safety TTL around 30 seconds.
- Store a per-weekend `version` number in memory. Increment it on invalidation and include it in `meta.version`.
- On a cache miss, build the lean DTO and cache `{ value, version, generatedAt, expiresAt }`.
- If multiple requests miss at once, dedupe the in-flight build promise for the same cache key.
- If there is no live weekend, cache `{ data: null }` briefly, such as 15 to 30 seconds.

Multi-instance note:
- Process-local invalidation is enough for local/simple deployments.
- If production runs multiple app instances, websocket and cache invalidation will need a shared pub/sub or shorter TTL safety net. Keep the API contract compatible with that later.

## Websocket Plan
Add live tournament sockets in the same style as `server/routes/ws/game-results.ts`.

Route:
- `GET /api/ws/live-tournaments/:weekendId`
- Require logged-in user.
- Validate `Origin` against `BETTER_AUTH_URL`, matching the existing game-results socket behavior.
- Validate that the weekend exists.
- Register the socket in a weekend room and a user room.
- Support `ping` and respond with `pong`.
- Send `live_weekend.connected` on open.

Server modules:
- Add `server/routes/ws/live-tournaments.ts`.
- Register it from `server/routes/ws.ts`.
- Add `server/lib/ws/liveTournamentRealtime.ts` for room bookkeeping and safe sends.
- Wire `server/lib/live-tournaments/liveTournamentEvents.ts` to publish through the realtime module instead of TODO stubs.

Rooms:
- `live-weekend:{weekendId}` for all viewers of the active weekend
- `live-user:{userId}` for user-specific watchlist updates when needed

Event strategy:
- Keep events small.
- Prefer sending affected query keys and compact metadata, then let TanStack Query invalidate/refetch the lean endpoint.
- Patch the cache directly only for tiny, obvious changes later.

Suggested event envelope:

```ts
type LiveTournamentSocketEvent = {
  type:
    | 'live_weekend.connected'
    | 'live_weekend.invalidated'
    | 'live_tournament.updated'
    | 'live_tournament.progress_updated'
    | 'live_resource.updated'
    | 'player_watch.updated'
    | 'tournament_import.finished';
  data: {
    weekendId: string;
    tournamentId?: string;
    userId?: string;
    reason?: string;
  };
  queryKeys: readonly unknown[][];
  at: string;
};
```

Event mappings:
- `publishLiveTournamentChecked`: invalidate `live()` and `detail(weekendId)`; include tournament id and status.
- `publishLiveTournamentProgressChecked`: invalidate `live()`, `liveBracket(weekendId, tournamentId)`, and `detail(weekendId)`.
- `publishTournamentImportFinished`: invalidate `live()`, `detail(weekendId)`, tournament detail/deck queries if they exist.
- resource approval/update: invalidate `live()`, `resources(weekendId, ...)`, and `detail(weekendId)`.
- watchlist mutations: invalidate `live()` for that user and player watch queries.

Frontend websocket hook:
- Add `useLiveTournamentSocket(weekendId)` and call it from `LiveTournamentHome` only when logged in and a weekend id exists.
- Build URL similarly to `getGameResultsWsUrl`, for example `getLiveTournamentWsUrl(weekendId)`.
- Reconnect with bounded exponential backoff like `GameResultsProvider`.
- On socket events, loop through `queryKeys` and call `queryClient.invalidateQueries({ queryKey })`.
- Keep guest `refetchInterval`; for logged-in users, add a fallback refetch interval only when the socket is disconnected for a while.

## Implementation Order
1. Baseline the current payload size for `/api/tournament-weekends/live`.
2. Add lean DTO types and read-model helpers.
3. Switch `GET /api/tournament-weekends/live` to the lean read model.
4. Update live homepage components and utilities to consume the lean shape.
5. Add lazy bracket endpoint, hook, and dialog loading flow.
6. Add process-local cache and invalidation helpers.
7. Wire cache invalidation into live checks, progress checks, resource mutations, weekend mutations, group mutations, imports, and watchlist mutations.
8. Add websocket route, realtime room module, and event publishing.
9. Add frontend live websocket hook and query invalidation behavior.
10. Re-measure payload size and run validation.

## Validation
Automated checks:
- Root TypeScript check passes.
- `cd frontend && bun run build` passes.
- Any existing backend tests or lint commands for the repo pass.
- Add focused tests or fixture checks for:
  - current standing selection
  - top cut bracket filtering
  - watched player latest standing/latest match selection
  - cache invalidation key generation

Manual scenarios:
- Live homepage loads for guests and logged-in users.
- Guest live homepage refetches periodically.
- Logged-in live homepage connects to websocket and invalidates/refetches after a simulated live check event.
- A 32 tournament live weekend payload is much smaller than the current response.
- Tournament cards still show status, country, player count, round, match progress, Melee link, undefeated badges, and champion fallback.
- Opening a top 8 bracket dialog fetches bracket data lazily and renders leader/base art.
- Watched players show latest standing and latest match without needing all matches in the live payload.
- Approved streams render on the homepage; pending resources remain admin-only.
- Admin tournament weekend detail still works.
- No live weekend returns `{ data: null }` and keeps the empty state.

## Risks And Notes
- The full detail type is shared by public and admin code today. Split public DTOs carefully to avoid breaking admin screens mid-change.
- User-specific watch data makes caching less straightforward. Keep the public portion cacheable and the watch overlay narrow.
- Websocket payloads should not try to mirror the whole endpoint. Query invalidation is simpler and robust enough for v1.
- If production runs more than one server process, process-local cache invalidation can briefly diverge. The TTL safety net limits the damage; shared pub/sub can be added later.
- There is a small cleanup opportunity in `liveTournamentCheck`: the `wasCheckedFinished` update should be awaited when that implementation area is touched.
