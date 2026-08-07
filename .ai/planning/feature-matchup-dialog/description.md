# Feature: Tournament Matchup Dialog

## Goal

Add a detail dialog to the tournament Matchups page. A populated cell in the matchup matrix becomes an interactive entry point to the individual tournament matches that produced that row-versus-column aggregate.

The dialog should let a user answer two questions without leaving the matchup analysis:

1. Which tournament matches are behind this aggregate matchup result?
2. What was the exact decklist used by either player in one of those matches?

This feature applies to the tournament matchup analysis. `MatchupTable` is also reused by the personal Statistics matchup page, but those records do not carry the tournament, player, or public tournament-deck context needed by this dialog. That second use remains non-interactive for this feature.

## Desired experience

### Opening the dialog

- Any populated, non-diagonal matchup cell is clickable in all four display modes:
  - match W/L
  - match win rate
  - game W/L
  - game win rate
- The existing count or percentage remains visually unchanged, but is rendered as a keyboard-accessible button with an explanatory accessible label and pointer/hover affordance.
- Empty cells and mirror/diagonal cells remain dashes and are not interactive.
- The dialog header identifies the selected aggregate matchup using the active meta grouping, for example `Sabine ECL vs Han2 Blue`, and includes the number of individual matches displayed.

### Dialog layout

The dialog is near-full-screen: `calc(100vw - 1rem)`/`calc(100vh - 1rem)` on small viewports and `calc(100vw - 3rem)`/`calc(100vh - 3rem)` from the `sm` breakpoint upward. It should use the direct Radix dialog primitives, as `TournamentDetailDialog` does, so the feature can reliably use the full available width rather than the normal `Dialog` max-width variant.

Desktop layout is a two-panel grid:

- Left: the wider, independently scrollable matchup list table (about 60–65% of usable width).
- Right: an independently scrollable deck detail panel (about 35–40%).

At narrower widths, stack the panels vertically. Keep the matchup table horizontally scrollable rather than compressing player/deck content to unreadable widths.

### Match list table

The left side lists exactly the raw tournament matches that contributed to the selected aggregate cell under the current filters and meta grouping. Its columns are:

| Column | Contents |
| --- | --- |
| Tournament | Tournament name (link to the tournament) and compact date where space permits. |
| Match | `Round {round}`. The schema has no separate match/table number, so do not invent one. |
| Player 1 | Player name, their exact leaders-and-base deck label, and their points at the start of the match. The deck label is a button. |
| Score | The recorded player-1-to-player-2 game score. Show game draws when present, and style the result semantically. |
| Player 2 | The symmetrical player 2 information and clickable deck label. |

The table should be visually aligned with `DeckMatches`:

- green/red result treatments indicate the winner and loser;
- draws use a neutral/amber treatment;
- table borders, compact typography, hover states, and dark-mode colors follow existing Tailwind conventions;
- a missing/deleted deck is visibly unavailable and is not clickable rather than attempting to open a broken deck panel.

The native player order and score must be preserved. Even if the selected matrix row corresponds to player 2 in a particular record, the dialog shows the imported match faithfully as `p1` versus `p2`; the row/column pairing determines inclusion, not a rewritten display orientation.

### Deck panel

- Initially show an empty-state instruction such as `Select a deck to view its decklist`.
- Clicking either player’s deck label selects that exact `deckId` and opens its details on the right.
- Reuse the existing `DeckContents` rendering so decklists, user preferences, card grouping, card-detail behavior, and the compact deck controls remain consistent with the rest of the app.
- Initialize the deck-info store before rendering `DeckContents`, following `TournamentTopBracket/components/DeckViewer.tsx`.
- Provide an in-panel close button that clears only the selected deck and returns to the empty state. Selecting the other player immediately replaces the right-hand deck.

## Match inclusion semantics

The matrix is keyed by an active `MetaInfo` dimension, not necessarily by an exact deck. A raw match can contribute to a cell if each participating deck resolves to the row/column grouping in either orientation:

```text
(p1 has rowKey AND p2 has colKey)
OR
(p1 has colKey AND p2 has rowKey)
```

The dialog must use the same `getDeckKeys(deck, metaInfo, cardListData)` mapping as `useMatchupData`; copying a simplified leader/base comparison would make aspect- and set-based tables incorrect. Match ids are deduplicated before rendering so a raw match appears once even when a grouping yields multiple keys.

The source match list is `filteredMatches`, not every match in the meta store. Therefore the dialog continues to honor the top-level All / Advancing Players / Top 8 / Custom round-and-points filters that generated the visible aggregate. It excludes BYEs and records without a second deck, matching the matrix calculation.

Changing only the display mode changes the figure in the matrix; it must not change the set of dialog rows. The selected pair remains a valid match pairing in all display modes.

## Data and persistence findings

No new server endpoint, database table, migration, or persisted dialog data is required.

- Raw `TournamentMatch` records already include tournament id, round, both player names, both deck ids, starting points, game score, result, draw count, and BYE status.
- `TournamentDeckResponse` already supplies the tournament-scoped deck record, exact deck cards/leader/base metadata, and placement/record metadata.
- `TournamentInfoMap` already maps a tournament id to its name and date.
- The Matchups tab receives these values from `useTournamentMetaStore`. Per-tournament data is loaded by `TournamentDataLoader` or `TournamentsDataLoader`, fetched through the single or bulk tournament APIs, and cached in IndexedDB (`tournamentMatches` and `tournamentDecks`) using `updatedAt` staleness checks.
- Selecting a deck then uses the existing deck APIs through `DeckContents`; it does not need an additional matchup-specific fetch.

The modal and selected deck are intentionally component-local, ephemeral state. Existing card/deck dialogs encode selection into root URL search parameters because they need to identify a particular trigger across the page and reuse `maDeckId`/`csDeckId` in a generic deck table. For this dialog, URL state would be incomplete unless it also captured the current filter/meta snapshot, and reusing `maDeckId` would interfere with the existing tournament-deck panels. A shareable/deep-linkable matchup detail URL is not requested, so this v1 should not add root search parameters or clear unrelated page selection state.

## Scope boundaries

Included:

- Tournament Matchups matrix cell interaction.
- Full-width match detail dialog.
- Match table and in-dialog deck detail viewer.
- Correct matching for every current meta grouping and top-level filter.
- Responsive, keyboard-accessible behavior.

Not included:

- Personal Statistics matchup-cell dialogs.
- Persisting or deep-linking the dialog selection.
- New mutation/API/database work.
- Editing a tournament match or deck from the dialog.
- Pagination, server-side filtering, or new table-sort controls. The complete already-loaded filtered result set is shown in a scrollable table.
