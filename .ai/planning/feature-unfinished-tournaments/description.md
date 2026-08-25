# Admin correction workflow for unfinished Melee tournaments

## Request

Melee.gg tournaments are occasionally left unfinished, so their final standings are unavailable or incorrect. The import must then use standings from a previous round and an administrator has to correct the imported result data manually.

Add an admin-only tournament-results page, opened from the existing **Admin** menu in a tournament's detail header. It has two subpages:

1. **Standings** — show every `tournament_deck` row for the tournament and edit one row at a time.
2. **Rounds** — select a tournament round, inspect every `tournament_match` row in that round, and apply that round's recorded results to the tournament standings.

The only editable standing fields are:

- `placement`
- `recordWin`
- `recordLose` (shown to the administrator as **Losses**; the requested name `recordLost` does not exist in the schema)
- `recordDraw`
- `points`

Duplicate placements are explicitly valid. This supports shared finishing positions and corrections based on incomplete source data.

## Current implementation findings

### Existing Melee fallback

`runTournamentImport()` already attempts a previous round automatically: it first asks Melee for the final round standings and, if that response has no standings, walks backward through earlier rounds until it finds a non-empty result. That protects against a completely empty final-round response.

It does not solve every real-world case: Melee can expose an incomplete or unsuitable final standing set, and the import cannot infer the administrator's intended final placements. The proposed page is therefore a **post-import correction tool**, not a replacement for the existing importer or its fallback behavior.

### Data model and identity

`tournament_deck` has a composite primary key of `(tournament_id, deck_id)`.

| Column                                                                         | Current nullability | Role in this feature                                          |
| ------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------- |
| `placement`                                                                    | nullable integer    | Editable; an empty value represents `null`/unknown placement. |
| `record_win`                                                                   | required integer    | Editable.                                                     |
| `record_lose`                                                                  | required integer    | Editable; display label is **Losses**.                        |
| `record_draw`                                                                  | required integer    | Editable.                                                     |
| `points`                                                                       | required integer    | Editable.                                                     |
| `melee_player_username`, `melee_decklist_guid`, `top_relative_to_player_count` | stored metadata     | Read-only in this feature.                                    |

The linked `deck` row is valuable context when finding the right standing, but it is not editable here. The update endpoint must identify a row by both URL tournament ID and URL deck ID, never by player name or placement.

`tournament_match` already has all required read-only information: round, both player names and deck IDs, both pre-match point totals, game W/L/D, normalized result (`0` loss, `1` draw, `3` win from player one's perspective), and the BYE flag.

### Existing access and navigation

The tournament detail header already provides an **Admin** dropdown. It uses `hasPermission('admin', 'access')` for admin-only tools, so it is the natural context menu for the new entry.

The general administration screen is currently a single `/admin` route controlled by a `page` search parameter. This feature will use a new context-aware admin page state instead of adding a public tournament tab or a general tournament picker:

```text
/admin?page=tournament-results&tournamentId=<uuid>&view=standings
/admin?page=tournament-results&tournamentId=<uuid>&view=rounds&round=<number>
```

The **Tournament results** item in the tournament Admin menu navigates directly to the first URL. The admin dashboard may also expose a `Tournament Results` tab, but it shows an instruction to open a tournament from its detail page when no `tournamentId` is present. This keeps the first release tightly scoped to correcting a known tournament.

Client-side role checks only improve navigation. Every new server endpoint must also call the existing `requireAdmin()` helper, which checks the authenticated user and server-side `admin.access` permission.

### Cache and derived-data consequences

Tournament deck and match queries are cached in React Query and IndexedDB. Their freshness depends on `tournament.updatedAt`. A direct `tournament_deck` update without touching the parent tournament would leave normal tournament pages using their old local cache.

Corrected fields also feed existing derived data:

- tournament card statistics multiply card usage by `recordWin` and `recordLose`;
- meta statistics aggregate the affected tournament statistics;
- tournament-group leader/base statistics use placement for winner and top-8 counts;
- tournament detail pages, brackets, champion cards, screenshots, and Discord results use placement-driven data.

Each successful correction must therefore update `tournament.updatedAt`, invalidate client tournament/deck/match queries, and refresh affected derived statistics. The source `tournament_deck` change is authoritative even if a later derived refresh fails; the admin must receive an explicit warning rather than a misleading all-success message.

## Product behavior

### Entry and page shell

- Add **Tournament results** to the detail-header Admin dropdown for users with `admin.access`.
- The page header identifies the tournament and offers a link back to its normal detail page.
- Page-level tabs (the requested subpages) are **Standings** and **Rounds**. Their selected state is represented in the `view` search parameter so an admin can refresh or share the exact admin view.
- The page loads its data directly from admin endpoints. It must not rely on the normal public hooks' IndexedDB cache.
- A missing tournament, a tournament with no imported rows, no matches, malformed URL parameters, loading states, and authorization failures all receive intentional empty/error states.

### Standings subpage

Display every standing row for the selected tournament in a straightforward, sortable table. Default order is ascending placement with `null` placements last, then descending points and player name for a stable result.

Read-only context columns should make a row unambiguous without widening scope:

- placement;
- Melee player name;
- deck name or a clear deck-ID fallback;
- record shown as W–L–D;
- points;
- an **Edit** action.

Choosing **Edit** opens a dialog/form for that one exact `(tournamentId, deckId)` row. It contains only the five requested fields. The page must not offer inline/bulk editing, editing of deck data, changes to Melee identifiers, or row insertion/deletion.

Validation policy:

- placement is an integer greater than or equal to 1, or may be cleared to `null`;
- wins, losses, draws, and points are required non-negative integers;
- no upper bounds, score-formula checks, total-record checks, or uniqueness checks are imposed in this feature. Tournament formats and manually reconstructed standings can be non-standard, and duplicate placement is intentionally supported.

On a successful save, close the dialog, refresh the admin table, update/evict the relevant normal tournament caches, and show an exact success or partial-success message.

Each placement cell also has small **up** and **down** controls. Moving a standing swaps its placement with the standing at the immediately adjacent numeric placement; it does not renumber the rest of the table.

- Moving placement 3 down swaps it with the unique standing at placement 4.
- Moving placement 3 up swaps it with the unique standing at placement 2.
- A placement of 1 has no up control; `null`, missing-adjacent, and ambiguous duplicate placements cannot be moved with arrows.
- Duplicate placements remain valid for manual editing. The arrow control is intentionally unavailable when either side of the proposed swap is not unique, because there is no deterministic single row to exchange.

Whenever a numeric placement changes—whether through the editor or a swap—the linked decklist name is updated in the same transaction. Imported names begin with `#<placement>`, so the system replaces only that leading decimal prefix and preserves the tournament name and the remaining deck name. Clearing a placement to `null` leaves the decklist name unchanged because an unknown placement has no valid prefix.

### Rounds subpage

Load all matches for this one tournament from the protected admin endpoint, derive the distinct round numbers, and render a single-select toggle group ordered numerically. The newest/highest round is selected by default; `round` in the URL keeps an explicit selected round after refresh. If it is absent or no longer valid, use the highest available round.

For the selected round, show a read-only match table with enough raw information to verify the imported data:

- player one and pre-match points;
- player two and pre-match points (or a BYE marker);
- game W–L–D;
- normalized result in a human-readable form (player-one win, draw, or player-two win);
- BYE state.

The selected round also has an **Apply all matches** action. It applies each match result to its linked `tournament_deck` row in one server transaction; it never alters the `tournament_match` rows or the placement column.

For each player in the selected round:

| Match result | Standing update                    |
| ------------ | ---------------------------------- |
| Win          | `recordWin + 1`, `points + 3`      |
| Draw         | `recordDraw + 1`, `points + 1`     |
| Loss         | `recordLose + 1`, points unchanged |

The stored result is from player one's perspective (`3` win, `1` draw, `0` loss); player two receives the inverse result. A BYE has only player one, so only that standing is changed. The operation is additive and must be confirmed in the UI because applying the same round again intentionally adds the round a second time; this first release does not introduce a round-application history or an undo workflow.

The server verifies that every player referenced by the selected round has a matching `tournament_deck` row for this tournament before writing any changes. If the import is incomplete, it rejects the request rather than partially applying a round.

No match edits, match deletion, manual round creation, or recalculation of `tournament_match` data are part of this release.

## Boundaries and explicit non-goals

- No database migration is required: the requested columns and composite key already exist.
- No importer redesign, final-round selection UI, or change to Melee API fetching is included.
- No automatic attempt to manufacture missing `tournament_deck` rows. The page only edits rows already produced by import.
- No reconciliation between manually corrected standings and match results. An unfinished event can legitimately have final standings that do not follow the last recorded match data.
- No audit-history table, bulk editor, CSV import/export, or rollback UI in this first version.
- No mutations to `tournament_match` rows in the rounds view; **Apply all matches** updates only linked standings.
- No persistent round-application history, automatic de-duplication, or undo workflow. The confirmation dialog makes the additive behavior explicit.

## Completion criteria

The feature is complete when an administrator can open any tournament from its detail Admin menu, inspect every imported standing, correct the five allowed statistics for exactly one standing (including a duplicate placement), swap unambiguous adjacent placements with arrows, apply one selected round's match results to standings, and see the correction reflected in regular tournament views and affected derived statistics.
