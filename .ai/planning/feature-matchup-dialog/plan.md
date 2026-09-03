# Feature Matchup Dialog Plan

## Summary

Implement a near-full-screen, tournament-only matchup detail dialog opened from populated matchup matrix cells. It will derive the contributing raw matches on the client from the same filtered data used to build the aggregate matrix, list both players and their deck information in a wide left-side table, and display a selected decklist on the right.

The implementation is frontend-only. It intentionally adds an optional interaction contract to the shared `MatchupTable` rather than making all consumers interactive.

## Current repository baseline

### Matchup data flow

1. `frontend/src/components/app/tournaments/TournamentTabs/MatchupsTab.tsx` reads `decks`, `tournaments`, and `matches` from `useTournamentMetaStore()` and passes them to `TournamentMatchups`.
2. `TournamentDataLoader` and `TournamentsDataLoader` load the same source data through `useGetTournamentDecks`, `useGetTournamentMatches`, and `useGetBulkTournaments`.
3. The frontend stores fetched matches/decks in Dexie by tournament id. A cache entry is reused until its fetch date precedes the tournament `updatedAt` value.
4. `TournamentMatchups.tsx` reads URL-driven analysis controls and calls:
   - `useFilteredMatches` for All / Advancing Players / Top 8 / Custom input filtering;
   - `useMatchupData` to aggregate the filtered raw matches under the selected `MetaInfo`.
5. `MatchupTable` renders the aggregate cells through `MatchupTableContent` and `MatchupTableCell`.

The dialog should receive `filteredMatches`, `filteredDecks`, `tournaments`, `metaInfo`, and `cardListData` from `TournamentMatchups`, so it never recomputes from a broader or stale data set.

### Existing reusable UI patterns

- `CardDecksDialog` has the desired two-pane outcome: a large dialog, a table on the left, and deck detail on the right via `TournamentDeckTable`/`TournamentDeckDetail`.
- `DeckMatches` supplies the desired compact result colors and existing tournament link pattern.
- `TournamentDetailDialog` uses raw `Dialog`, `DialogContent`, and `DialogTitle` primitives to create a true large viewport dialog; this is the best sizing pattern for the requested full-width layout.
- `TournamentTopBracket/components/DeckViewer.tsx` performs the required `useSetDeckInfo(deckId, false)` initialization before rendering `DeckContents` and owns a local selected deck id.
- `TournamentDeckTable`/`TournamentDeckDetail` are not a direct fit for the left side: their columns describe decks, they are much narrower, and their `maDeckId`/`csDeckId` URL state would collide with existing tournament page state.

### Shared-component constraint

`frontend/src/components/app/statistics/StatisticsMatchups/StatisticsMatchupsTable/StatisticsMatchupsTable.tsx` also uses `MatchupTable`, but it supplies personal `MatchResult` records without tournament data. The new callback must be optional. That caller should receive no callback and keep its current non-clickable behavior.

### Relevant data model

`TournamentMatch` already has every match-table field:

```ts
{
  id, tournamentId, round,
  p1Username, p1DeckId, p1Points,
  p2Username, p2DeckId, p2Points,
  gameWin, gameLose, gameDraw, result, isBye
}
```

`TournamentDeckResponse` is tournament-scoped and contains `tournamentDeck`, `deck`, and `deckInformation`. Its lookup must use the composite key `tournamentId:deckId`; deck ids alone should not become the identity contract for analysis joins. `TournamentInfoMap[tournamentId].tournament` supplies name, date, attendance, etc.

## Key decisions

1. Keep all filtering and match selection client-side. All necessary data is already loaded and cached; a new endpoint would duplicate current transport and add latency.
2. Keep dialog state local to `TournamentMatchups`:
   - `activeMatchup: { rowKey: string; colKey: string } | null`
   - `selectedDeckId: string | undefined`
3. Do not add root URL params and do not reuse `maDeckId`. The dialog is an ephemeral inspection surface, and a URL containing only aggregate keys is not enough to faithfully restore its active filter/meta context. This also protects the existing deck-table/floater state.
4. Pass an optional `onMatchupCellClick(rowKey, colKey)` through the generic matrix components. Only `TournamentMatchups` supplies it.
5. Treat pairing membership symmetrically for inclusion, but retain native player order for display.
6. Use `leadersAndBase` labels for the players’ exact deck buttons, regardless of the grouping that produced the aggregate cell. The header still uses the current grouping. This makes a set/aspect/base aggregate understandable at the decklist level.
7. Use native `gameWin-gameLose` values for the dialog score and show `gameDraw` when nonzero. Do not apply the aggregate-only `gameDraw === 3 ? 1 : gameWin/gameLose` normalization to the raw-match display.
8. The dialog initially has no selected deck. A deliberate player-deck click is required to open the right pane.

## Proposed component structure

Create a focused directory next to the matchup components:

```text
frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupDialog/
  MatchupDialog.tsx
  MatchupMatchesTable.tsx
  MatchupDeckViewer.tsx
```

Add a pure match-selection utility:

```text
frontend/src/components/app/tournaments/TournamentMatchups/utils/getMatchesForMatchup.ts
```

The exact filenames can be adjusted to the local naming convention during implementation, but the responsibilities should stay split this way:

- `MatchupDialog` owns controlled open/close behavior, derives selected raw matches, creates the full-viewport layout, and owns `selectedDeckId`.
- `MatchupMatchesTable` converts raw matches to display rows and renders the wide table. It owns no global/navigation state.
- `MatchupDeckViewer` is a neutral extraction of the logic currently present in top-bracket `DeckViewer`: initialize deck info, render `DeckContents` in compact mode, and provide an in-pane close button. If extracting it would broaden refactoring, duplicate only that minimal, established logic inside the new dialog and leave the existing bracket component untouched.
- `getMatchesForMatchup` is pure/testable and contains pairing semantics only.

## Match selection algorithm

### Inputs

```ts
type GetMatchesForMatchupInput = {
  matches: TournamentMatch[];                 // already top-level-filtered
  decks: TournamentDeckResponse[];            // derived from those matches
  rowKey: string;
  colKey: string;
  metaInfo: MetaInfo;
  cardListData: CardListResponse | undefined;
};
```

### Steps

1. Return an empty list until `cardListData` is available.
2. Build `Map<`${tournamentId}:${deckId}`, TournamentDeckResponse>` from the provided tournament decks.
3. For every raw match:
   - skip `isBye`, missing `p2DeckId`, or a missing P1/P2 tournament deck record;
   - resolve P1 and P2 keys using the existing `getDeckKeys(deck, metaInfo, cardListData)` function;
   - include the match when `(p1 has row && p2 has col) || (p1 has col && p2 has row)`;
   - deduplicate using `match.id`.
4. Return rows ordered by tournament date descending, then round ascending, with stable original ordering as the final tie-breaker. This makes recent events easy to inspect without rearranging rounds within an event.

This exactly follows `useMatchupData`'s tournament-scoped lookup and key generation. It needs the symmetric condition because the matrix deliberately stores statistics in both directions, while raw match data has one imported P1/P2 orientation.

### Important edge cases

- A visible cell can be a percentage, match score, or game score; all point to the same match list.
- A draw-only match may appear in a game view even though the aggregate match W/L view does not count draws. Do not modify existing aggregate accounting in this feature.
- A multi-key grouping such as `aspects` can make one raw match relevant to more than one aggregate cell. Within one selected cell it must still render once.
- Table cells already return a non-interactive dash when their displayed total is zero or they are diagonal. Preserve this behavior.
- An unavailable/deleted deck should render text but must not call the deck viewer.

## Detailed implementation steps

### 1. Add the optional cell interaction contract

Files:

- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableContent.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableCell.tsx`

Changes:

- Add optional `onMatchupCellClick?: (rowKey: string, colKey: string) => void` to `MatchupTableProps` and forward it through the content component.
- Add the same optional callback to `MatchupTableCell`.
- For a populated, non-diagonal cell with a callback, render its existing text inside a full-cell `<button type="button">` instead of a click handler on `<td>`.
- Keep the `td` column ref and mouse-enter behavior untouched so column highlighting continues to work.
- Add `cursor-pointer`, a subtle hover/focus-visible treatment, and a descriptive `aria-label` such as `View matches for {row label} versus {column label}`. Build that label where the label renderer is available, or pass the already-resolved text down rather than placing inaccessible raw ids in the label.
- Do not make `RowTotalCell`, header cells, blank cells, or mirror cells interactive.
- Do not add this callback to `StatisticsMatchupsTable`.

### 2. Lift only the active matchup selection into `TournamentMatchups`

File:

- `frontend/src/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx`

Changes:

- Add local `activeMatchup` state with `rowKey` and `colKey`.
- Pass the open handler to `MatchupTable` as `onMatchupCellClick`.
- Render a single controlled `MatchupDialog` beside the matrix when an active matchup exists (or render it always with a nullable active selection).
- Pass `filteredMatches`, `filteredDecks`, `tournaments`, `metaInfo`, `cardListData`, `labelRenderer`, and the active key pair.
- On dialog close, set `activeMatchup` to `null`; the dialog component also clears its local selected deck id.
- Do not modify `useFilteredMatches`, `useMatchupData`, saved filters, root search validation, or global meta-store state.

### 3. Implement the pure matching utility

File:

- new `frontend/src/components/app/tournaments/TournamentMatchups/utils/getMatchesForMatchup.ts`

Changes:

- Centralize the existing `tournamentId:deckId` map-key construction in this utility or extract a small shared helper used by both it and `useMatchupData`/`useFilteredMatches`. Avoid maintaining subtly different composite-key strings.
- Implement the input/algorithm described above.
- Return a typed row-friendly result that keeps the raw match plus resolved P1/P2 `TournamentDeckResponse` values. Keeping the joins here prevents each table cell from looking them up again.
- Preserve native P1/P2 values and include the tournament id for lookup in `TournamentInfoMap`.

### 4. Create the full-width dialog shell

File:

- new `.../components/MatchupDialog/MatchupDialog.tsx`

Changes:

- Use `Dialog`, `DialogContent`, and `DialogTitle` from `@/components/ui/dialog.tsx`, controlled by `open={Boolean(activeMatchup)}`.
- Use the full-viewport content classes from the tournament-detail pattern:

```tsx
className="h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-hidden p-3 sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:p-4"
```

- Use a visible header containing the active grouping labels and an individual match count. Add a compact subtitle that the result respects the current matchup filters.
- Beneath the header, use `min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] gap-3` (or an equivalent ratio). Both panels need `min-h-0`/`overflow-auto` to avoid the browser page rather than the pane owning scrolling.
- On smaller viewports, stack the result list over the deck pane. Preserve full-width dialog behavior and horizontal scrolling for the table.

### 5. Build the matchup match table

File:

- new `.../components/MatchupDialog/MatchupMatchesTable.tsx`

Changes:

- Use a compact semantic `<table>` inside a bordered `overflow-auto` wrapper with a sticky header. A bespoke table is preferable to `DataTable`: it has fixed, match-specific columns and player-deck buttons rather than generic deck rows.
- Render five columns in this order: Tournament, Match, Player 1, Score, Player 2.
- Tournament cell:
  - use the existing TanStack `Link` to `/tournaments/$tournamentId` and `ExternalLink` icon, following `DeckMatches`;
  - render a compact date below it when available.
- Match cell: `Round {round}` and, when helpful, muted `P1 {p1Points} pts / P2 {p2Points} pts` only if that does not duplicate the player cells. The final presentation should keep points next to their player as the primary display.
- Player cells:
  - player name;
  - exact `leadersAndBase` compact label resolved through `getDeckLeadersAndBaseKey`/`useLabel`;
  - `Points: {points}`;
  - a button only when a viewable exact deck is present, otherwise a muted unavailable deck label.
- Score cell:
  - show the recorded P1–P2 score in a prominent W–L–D form when `gameDraw > 0`, otherwise W–L;
  - use winner/loser/draw color classes derived from `match.result`, modeled after `DeckMatches`;
  - do not decide a winner merely from game score, because imported `result` is the authoritative match result.
- Use compact table typography, borders, light/dark green/red/amber styles, and hover styles consistent with `DeckMatches` and existing matchup colors.
- Display a well-defined empty state if the active selection becomes invalid after a filter/meta data refresh.

### 6. Render the selected deck panel

File:

- new `.../components/MatchupDialog/MatchupDeckViewer.tsx`

Changes:

- Accept `deckId` and `onClose`.
- Call `useSetDeckInfo(deckId, false)` before rendering `DeckContents`.
- Render `DeckContents deckId={deckId} setDeckId={onClose} compact` inside the panel, with an absolute `X` button aligned with existing `DeckViewer`/`TournamentDeckDetail` behavior.
- When no deck is selected, `MatchupDialog` renders the centered instructional empty state instead. Avoid calling deck hooks with an absent id.

### 7. Preserve existing behavior and clean up state safely

- Retain matrix row click behavior (`setTournamentDeckKey`) and column hover refs/classes.
- A click on the new matrix button must not change the row selection/floater.
- Closing with the X button, overlay click, or Escape only closes the matchup dialog and clears its internal selected deck. It must not mutate `maDeckId`, `csDeckId`, filters, or saved table configuration.
- Opening another matrix cell should replace the active pair and clear the previous selected deck so the right pane never shows a deck from the wrong matchup.

## Files expected to change

Existing files:

- `frontend/src/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableContent.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableCell.tsx`
- optionally `frontend/src/components/app/tournaments/TournamentMatchups/hooks/useMatchupData.ts` and `hooks/useFilteredMatches.ts` only to share the existing composite deck-map-key helper; no behavioral change to aggregation/filtering.

New files:

- `frontend/src/components/app/tournaments/TournamentMatchups/utils/getMatchesForMatchup.ts`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupDialog/MatchupDialog.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupDialog/MatchupMatchesTable.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupDialog/MatchupDeckViewer.tsx`

Files explicitly not expected to change:

- `server/db/schema/*`
- `server/routes/*`
- `drizzle/*`
- `frontend/src/routes/__root.tsx`
- `frontend/src/components/app/statistics/StatisticsMatchups/StatisticsMatchupsTable/StatisticsMatchupsTable.tsx`

## Verification plan

The frontend currently exposes `lint` and `build` scripts but has no existing frontend test suite/framework configured. Implement verification in proportion to that baseline:

1. Run `bun run lint` from `frontend`.
2. Run `bun run build` from `frontend`.
3. Manual functional checks against imported tournament data:
   - open a populated match W/L cell and confirm every displayed row belongs to the selected pair;
   - switch between all four display modes and confirm the dialog row set stays identical for that cell;
   - use a row/column pair whose raw matches occur in both P1/P2 orientations and verify both are included while their imported display order stays unchanged;
   - use a non-leader grouping (base, aspects, detailed aspects, and set) and verify the matching utility follows the actual grouping;
   - change top-level filters, then open a cell and verify excluded matches do not appear;
   - click P1 then P2 deck labels and verify the right pane updates with the exact decklist;
   - verify a missing deck is non-clickable and does not crash the dialog;
   - close by dialog X/overlay/Escape and verify existing URL search values and the matchup floater remain unchanged;
   - check desktop split layout, small-screen stacking, header/table scrolling, keyboard focus, and dark mode.

## Acceptance criteria

- A populated tournament matchup matrix cell opens a large dialog.
- The dialog lists all and only the raw matches contributing to that selected, currently filtered aggregate matchup.
- The match table shows tournament name, round, both player names, exact decks, points, and recorded score.
- Clicking either displayed deck opens its decklist in the right panel.
- Styling clearly conveys winner/loss/draw and matches the compact visual language of `DeckMatches`.
- Existing tournament matrix filters, row click/floater behavior, and Statistics matchup table behavior are unchanged.
- The feature requires no data migration, API addition, or persisted UI state.
