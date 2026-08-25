# Implementation plan — admin tournament results correction

## 1. Establish the admin route and entry point

1. Extend `frontend/src/routes/_authenticated.admin.tsx`:
   - add `tournament-results` to the accepted `page` values;
   - validate optional `tournamentId` as a UUID;
   - validate `view` as `standings | rounds`, defaulting to `standings`;
   - validate optional `round` as a non-negative integer search value.
2. Extend `frontend/src/components/app/admin/AdminPage.tsx` with a `TournamentResultsPage` content branch.
   - When no `tournamentId` is supplied, render a compact instruction/empty state rather than querying all tournaments.
   - Preserve existing admin tabs and their behavior.
3. Add **Tournament results** to `frontend/src/components/app/tournaments/TournamentDetail/TournamentDetail.tsx`'s existing Admin dropdown.
   - Use a TanStack `Link` or router navigation to `/admin` with `page: 'tournament-results'`, this tournament ID, and `view: 'standings'`.
   - Gate the menu entry with the existing `canAccessAdmin` check. Do not depend on `tournament.imported`; an administrator should be able to inspect the page and receive the proper no-standing state.
4. Create a focused page/component folder, for example `frontend/src/components/app/admin/TournamentResultsPage/`, containing the page shell and its two tab panels. Keep all navigation state in the route search parameters rather than a private component-only state.

## 2. Define the protected admin API

Add a focused route group below `/api/admin/tournaments/:tournamentId` and register it in `server/routes/admin.ts`. Follow the existing Hono and `requireAdmin()` conventions used by the preview-card endpoints.

| Endpoint                                                                | Purpose                                | Response / mutation rules                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/tournaments/:tournamentId/standings`                    | Load all standings for the page.       | Verify admin and tournament existence. Return each `tournament_deck` row plus minimal read-only linked-deck context. Order by placement ascending with nulls last, then points descending and player name. |
| `PATCH /api/admin/tournaments/:tournamentId/standings/:deckId`          | Correct one standing.                  | Verify admin, UUID parameters, and that the composite-key row belongs to the URL tournament. Accept only the five editable fields.                                                                         |
| `GET /api/admin/tournaments/:tournamentId/matches`                      | Load rows for the round inspector.     | Verify admin and tournament existence. Return all rows ordered by round and a stable in-round order. No mutation endpoint is added.                                                                        |
| `POST /api/admin/tournaments/:tournamentId/rounds/:round/apply-matches` | Apply one selected round to standings. | Verify admin, integer round, tournament, and all referenced standings. Atomically increment W/L/D/points and leave placement untouched.                                                                    |
| `POST /api/admin/tournaments/:tournamentId/standings/:deckId/move`      | Swap one adjacent placement.           | Verify admin, the composite-key row, an `up` or `down` direction, and that both positions are uniquely occupied before swapping.                                                                           |

Suggested server layout:

```text
server/routes/admin/tournaments/_id/standings/get.ts
server/routes/admin/tournaments/_id/standings/_deckId/patch.ts
server/routes/admin/tournaments/_id/matches/get.ts
server/routes/admin/tournaments/lib.ts
```

The exact folder names may follow the repository's established parameter naming convention, but route registration must expose the three URLs above.

### Server validation and query rules

1. Put the PATCH schema in the new admin tournament route helper module:
   - `placement: z.number().int().min(1).nullable()`;
   - `recordWin`, `recordLose`, `recordDraw`, and `points`: `z.number().int().min(0)`.
2. Require all five keys in the PATCH request. This makes the dialog submit a complete, understandable standing rather than accidentally retaining a stale partial field.
3. Do not query or validate for duplicate placement. Do not calculate points or records server-side.
4. Use `where(and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)))` for the update. A row that does not exist under that exact tournament returns 404; it must never update a row from another tournament.
5. Select only the linked-deck fields needed for context (for example ID, name, leader/base IDs) rather than pulling all deck-card data.
6. Return clear `401`, `403`, `404`, and validation `400` responses. The frontend should display the API message when it is safe to do so.
7. The new round-application endpoint uses `tournament_match.p1DeckId` and `p2DeckId`, not player names. For result `3 | 1 | 0`, player one receives win/draw/loss and player two receives loss/draw/win. The transaction rejects the complete request with a conflict when a required linked standing is absent; it never makes a partial application.
8. The new placement-move endpoint accepts a `direction` of `up` or `down`. It must not renumber a range of rows. It swaps exactly two rows and returns a conflict when the source placement is null/duplicated, the target placement is missing, or the target placement is duplicated.
9. Extract a small helper that replaces only the leading `#<decimal>` prefix of an imported decklist name. Use it in the manual standing update and placement-swap transactions so all numerically changed placements keep their decklist names in sync; leaving placement blank keeps the existing name.

## 3. Preserve cache validity and statistics integrity

Implement a small server helper for the correction side effects, rather than duplicating the existing import route's sequence inside a route handler.

1. In one database transaction:
   - update the exact `tournament_deck` row with the five allowlisted fields;
   - update the parent `tournament.updatedAt` to `NOW()`;
   - return the corrected standing and parent tournament information needed for follow-up work.
2. After the source-data transaction commits, run the existing refreshes in this order:
   - `computeAndSaveTournamentStatistics(tournamentId)` because W/L drives card statistics;
   - `computeAndSaveMetaStatistics(metaId)` when the tournament has a meta;
   - `updateTournamentGroupsStatisticsForTournament(tournamentId)` because group winner/top-8 results use placement.
3. Do not try to derive standings from `tournament_match`; the explicit correction is authoritative.
4. If a refresh fails after the data transaction, retain the saved correction, log the failure with the tournament and deck ID, and return a structured `warnings` array. The UI must say **Standing saved, but derived statistics could not be fully refreshed** instead of reporting a complete success. This avoids hiding partial operational failure while keeping a retry safe and idempotent.
5. In the client mutation success handler:
   - invalidate the admin standings query;
   - invalidate `['tournament', tournamentId]`, `['tournament-decks', tournamentId]`, `['tournament-matches', tournamentId]`, and `['tournaments']`;
   - remove or overwrite the corresponding Dexie `tournamentDecks` and `tournamentMatches` records, rather than allowing a previously fetched record to survive until an unrelated refresh;
   - show a normal success toast only when `warnings` is empty, otherwise a warning/destructive toast with the server's actionable message.

The parent timestamp update is essential: normal tournament deck/match hooks use it to judge their IndexedDB entries stale. Query invalidation alone would not reliably bypass a still-valid local entry.

## 4. Build the standings panel

1. Add a direct React Query hook for the admin standings endpoint; do not reuse `useGetTournamentDecks()` because it is intended for public display and persistent caching.
2. Render a simple data table containing all returned rows. Use the following columns:
   - Placement;
   - Player;
   - Deck (read-only name/label, with a deck-ID fallback);
   - Record (W–L–D);
   - Points;
   - Actions.
3. Implement the default ordering on the server and retain it after each refresh. Client sorting is optional polish, not a substitute for predictable returned order.
4. Implement an `EditTournamentStandingDialog` (or equivalently named component):
   - launch from the selected row's edit action;
   - prefill from that exact row;
   - use number inputs and show the player's name/deck as immutable context;
   - let the placement field be blank to write `null`;
   - disable Save while the PATCH is pending;
   - retain the dialog and show field/API errors if saving fails;
   - close it only after the server confirms that source data was saved.
5. Do not add duplicate-placement warnings. A duplicate value should round-trip through the form and appear in the refreshed table unchanged.
6. Render distinct loading, empty, and error states. An empty table should state that the tournament has no imported standings rather than implying an unknown server failure.

## 5. Build the rounds panel

1. Add a direct React Query hook for the protected matches endpoint.
2. Derive distinct round numbers from the loaded matches and present them with the existing `ToggleGroup`/`ToggleGroupItem` UI primitives as a single-select control.
   - sort numerically;
   - default to the highest available round;
   - write selection to the route's `round` search parameter;
   - replace a missing/invalid selected value with the current highest round without making a mutation.
3. Filter the loaded matches to the selected round and render a read-only table with:
   - player one and P1 points before the match;
   - player two and P2 points, or a clear BYE label;
   - game W–L–D;
   - a human-readable result decoded from `0 | 1 | 3`;
   - a BYE badge/indicator.
4. Add an **Apply all matches** button for the currently selected round, with a confirmation dialog that states the operation is additive and leaves placement unchanged.
   - disable it while the request is pending;
   - show how many matches/standings were applied on success;
   - invalidate the same tournament, standings, and Dexie caches as a manual standing save;
   - show server-side data-integrity errors without making any optimistic changes.
5. Keep round, match ID, deck IDs, and raw result data available in row data/debugging but do not surface match-edit inputs, match save controls, or destructive match controls.
6. For a tournament without matches, render a no-rounds empty state and no disabled phantom toggles.

## 5a. Add placement movement controls

1. Add compact up/down buttons beside the standings placement text.
2. Determine button availability from the loaded standings: the current placement and the adjacent placement must each occur exactly once. Keep the server validation authoritative in case of stale data or concurrent requests.
3. Add an admin mutation calling the move endpoint. Disable both controls on the moving row while it is pending.
4. On success, use the existing standing-mutation cache invalidation and derived-stat refresh behavior. On conflict, reload/display the current table state and show the API message.

## 6. Type, migration, and generated-route work

1. Reuse the existing Drizzle schemas `tournament_deck.ts` and `tournament_match.ts`; do not create a migration.
2. Add explicit request/response TypeScript types alongside the new hooks or a shared API type module. Avoid exposing mutable `TournamentDeck` objects as arbitrary PATCH bodies.
3. Regenerate `frontend/src/routeTree.gen.ts` through the repository's normal TanStack Router workflow if route changes require it. Do not hand-edit generated route output.
4. Run formatter/type checks available in the repository and keep imports consistent with the existing `.ts`/`.tsx` conventions.

## 7. Verification plan

### Server coverage

- unauthenticated requests receive 401;
- authenticated non-admin requests receive 403;
- malformed tournament/deck IDs and missing tournament/standing receive appropriate 400/404 responses;
- standings GET returns only rows for the requested tournament in the documented order;
- PATCH changes exactly one composite-key row and does not change similarly named players or a matching `deckId` under another tournament;
- placement `null` and valid duplicate placements are accepted;
- negative values, fractions, invalid placement zero, omitted required fields, and unknown fields are rejected or ignored according to the strict request schema;
- matches GET returns only that tournament's matches and performs no writes;
- successful correction touches `tournament.updatedAt` and calls the three required derived-data refresh paths;
- a simulated derived refresh failure returns a clear warning while preserving the standing update.

### UI/manual acceptance

1. As an admin, open an imported tournament detail page, use **Admin → Tournament results**, and land on the standings view for that exact tournament.
2. Verify all standing rows are present, including `placement: null` rows, and no other tournament's rows appear.
3. Edit one row's record, points, and placement; save a placement already used by another row; verify both rows retain that placement after reload.
4. Verify the ordinary tournament detail/decks/bracket view shows the corrected result after navigation or refetch, not a stale IndexedDB entry.
5. Verify card-stat and group-derived data have refreshed, or intentionally exercise the warning path and confirm the UI communicates the partial refresh failure.
6. Switch to **Rounds**, select multiple round toggles, and verify each read-only table contains only that round's matches, handles byes clearly, and exposes no edit control.
7. Repeat as a non-admin and confirm neither the menu entry nor a directly entered URL/API request grants access.

## Delivery boundaries

Implementation ends after the read-only round inspector and single-standing correction flow work reliably. Future additions—bulk edits, match editing, audit history, manual standing creation, import-round choice, and automatic standing reconciliation—should be planned separately.
