# Feature Matchup Filters Plan

## Summary

Improve the tournament `Matchups` page in two connected layers:

1. Add a top-level match filter for matches involving top 8 players. This should behave like the existing match filters and affect the input match set before the matchup matrix is computed.

2. Replace the table's row-only text filter with a richer row/column filtering control:
   - keep the fast text input in the current table header location
   - add a filter icon that opens a popover
   - support separate row and column filters by default
   - support a lock/mirror mode that applies one filter config to both rows and columns
   - support text and aspect filters for each dimension
   - show active-filter styling and a clear button in the header cell
   - for signed-in users, allow saving the current table filter config and loading saved configs for the current format

The matchup matrix should remain frontend-computed for v1. The backend work is only for persisting saved table filter configurations.

## Current Repo Baseline

- The matchup page entry point is:
  - `frontend/src/components/app/tournaments/TournamentTabs/MatchupsTab.tsx`
- `MatchupsTab` reads already-loaded tournament analyzer data from `useTournamentMetaStore`:
  - `decks`
  - `tournaments`
  - `matches`
- Main matchup rendering lives in:
  - `frontend/src/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx`
- `TournamentMatchups` currently reads these URL search params:
  - `maMatchFilter`
  - `maMinRound`
  - `maMinPoints`
  - `maMetaInfo`
  - `maDisplayMode`
- The root search schema is in `frontend/src/routes/__root.tsx`.
- Existing top-level controls are wrapped in `MobileCard` and use small, dense selectors:
  - `DisplayModeSelector`
  - `MatchFilterSelector`
  - `MetaInfoSelector`
- `MatchFilterSelector` currently supports:
  - `all`
  - `day2`
  - `custom`
- `useFilteredMatches` applies the top-level match filter before matchup computation:
  - `day2` keeps matches where either player's tournament deck placement is within `dayTwoPlayerCount`
  - `custom` keeps matches by minimum round and/or points
  - it then derives `filteredDecks` from deck ids present in the filtered matches
- `useMatchupData` computes:
  - all unique matchup keys from the filtered matches and decks
  - a square `matchups` map
  - `totalStats`
  - one sorted key list currently reused for both rows and columns
- `MatchupTable` currently owns table-local state:
  - `filterText`
  - `debouncedFilterText`
  - `showAllData`
  - column hover refs
- The current table text filter only filters rows:
  - `filteredKeys` is passed as `rowKeys`
  - columns still use `matchupData.colKeys`
- `MatchupTableContent` renders the sticky table header and the current text input in the second header cell.
- Row clicks call `setTournamentDeckKey` from `useTournamentMetaActions`, which powers `TournamentDeckKeyFloater`.
- Aspect UI already exists:
  - `frontend/src/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx`
  - it uses `SwuAspect` and `ToggleGroup`
- Tournament deck aspect extraction already exists:
  - `frontend/src/components/app/tournaments/lib/getAspectsFromDeckInformation.ts`
- Existing deck filtering treats selected aspects as an AND filter in `server/routes/decks/get.ts`.
- User identity is available through:
  - `frontend/src/hooks/useUser.ts`
  - `c.get('user')` on Hono routes through `AuthExtension`
- API calls use the typed Hono client:
  - `frontend/src/lib/api.ts`
- Database schema uses Drizzle Postgres schema files under:
  - `server/db/schema/*`
- Migrations are generated into `drizzle/` through:
  - `bun db-generate`

## Key Decisions

- Keep matchup data filtering frontend-only. The app already loads tournament decks and matches into the frontend analyzer store, and the requested table filters only change which computed rows/columns are visible.
- Add `top8` to the existing `MatchFilter` union and URL param instead of adding a separate boolean. This keeps top-level match filtering consistent with `all`, `day2`, and `custom`.
- Define "Top 8 matches" as matches where either participating deck has `tournamentDeck.placement <= 8`.
- Use the same placement semantics already used by tournament meta analysis for top 8 decks.
- Keep the visible fast input as the row text filter when row/column filters are unlocked.
- When filters are locked, the visible fast input updates the shared filter and therefore filters both rows and columns.
- The lock checkbox should be unlocked by default.
- Turning lock on should copy the current row filter config to the column filter config.
- Turning lock off should leave the row and column configs equal until the user edits either side.
- The lock state alone should not count as an active filter. Active state should mean at least one text or aspect filter is selected.
- Keep table filter state local to `MatchupTable` in v1. Do not add URL params for row/column filters unless a later feature needs shareable filtered matchup URLs.
- Save saved filter configs per user and format, not per tournament. This matches the request and makes configs reusable across tournament groups using the same format.
- If the current analyzer contains mixed formats and no global `formatId` can be resolved, saving/loading saved table filters should be disabled with a small muted state in the saved-filters popover.
- Add a display name column for saved configs even though the initial table sketch did not mention one. A saved-filter list needs a stable human-readable label; the UI can generate one automatically in v1 if no naming input is added.
- Include timestamps in the saved-filter table for sorting and future cleanup.
- Include a `DELETE` endpoint if implementation time allows. It is not required for the core request, but it prevents the saved-filter list from becoming permanent clutter.

## Target UX

### Top-Level Match Filter

- Add a `Top 8` option to the existing `MatchFilterSelector`.
- The selector should continue using `ToggleGroup`.
- Recommended labels:
  - `All matches`
  - `Advancing player matches`
  - `Top 8 matches`
  - `Custom filter`
- The `Top 8 matches` option should be available whenever matchup data is available.
- If no top 8 deck placements exist, selecting it should simply produce no matchup data and reuse the existing "No data available for the selected filters" state.
- The selected top-level filter should remain URL-driven through `maMatchFilter=top8`.

### Table Header Cell

The second sticky header cell currently contains the fast text input. It should become a compact filter control cell:

- It keeps the visible text input.
- It adds an icon button with `Filter` from `lucide-react`.
- If signed in, it adds a small icon button with `ChevronDown` from `lucide-react` for saved filters.
- When any table filter is active:
  - the header cell gets an active visual treatment, for example `bg-accent/60 ring-1 ring-primary/40`
  - an icon-only clear button with `X` appears
  - clearing resets row/column text and aspect filters and returns lock state to the default unlocked state
- Icon-only buttons should have tooltips.
- The controls must keep stable dimensions so the sticky table header does not resize when filters become active.

### Filter Popover

The filter popover opens from the `Filter` icon.

Unlocked default:

- Show two compact columns:
  - `Rows`
  - `Columns`
- Each column contains:
  - text input
  - `MultiAspectFilter`
- The row text input mirrors the visible fast input.
- The column text input filters visible columns only.

Locked mode:

- A checkbox/switch labeled around the concept of locking rows and columns toggles mirror mode.
- When locked, show one filter column.
- The single text input mirrors the visible fast input.
- The same text/aspect config applies to both rows and columns.

Signed-in save behavior:

- Show a `Save` button in the popover only when `useUser()` returns a user and a format can be resolved.
- Disable save when there are no active table filters.
- Saving persists the current normalized filter config.
- On success, show a toast and invalidate the saved-filters query for the current format.

### Saved Filters Popover

The saved-filters popover opens from the signed-in `ChevronDown` icon.

- The saved filters should be fetched only when this popover opens.
- The query should be scoped to the resolved format id.
- Show loading, empty, and error states inside the popover.
- Each saved filter row should show:
  - name or generated summary
  - whether it is locked/mirrored
  - row/column summary chips where useful
  - updated date in a compact muted style
- Clicking a saved filter applies it immediately to the table state.
- If a delete endpoint is implemented, include a small `Trash2` icon button per row and invalidate the query after deletion.

## Filter Semantics

### Top-Level Match Filter

`top8` should filter the raw `matches` list before `useMatchupData` computes the matrix.

A match qualifies if:

```ts
const p1InTop8 = p1Deck?.tournamentDeck.placement != null && p1Deck.tournamentDeck.placement <= 8;
const p2InTop8 = p2Deck?.tournamentDeck.placement != null && p2Deck.tournamentDeck.placement <= 8;
return p1InTop8 || p2InTop8;
```

Notes:

- This mirrors the existing `day2` filter style.
- BYE matches can pass this top-level filter if the player is top 8, but `useMatchupData` already skips BYE matches when counting pairings.
- Build a `deckById` map once in `useFilteredMatches` so `day2` and `top8` do not repeatedly scan `decks`.

### Table Text Filter

Text filters should match against both:

- the raw matchup key
- the resolved display text for the key when available

This is better than the current raw-key-only behavior for leader/base keys.

Recommended helper:

```ts
type MatchupKeyInfo = {
  rawKey: string;
  searchText: string;
  sourceDeckAspects: SwuAspect[][];
};
```

`searchText` can be built from:

- `labelRenderer(key, metaInfo, 'text')` when it returns a string
- the raw key as a fallback

### Table Aspect Filter

Aspect filters should keep a row or column key when at least one source deck for that key contains all selected aspects.

Use AND semantics for selected aspects, matching the existing deck filter API.

Important detail:

- Do not use a simple union of all aspects across all source decks for a key.
- A union can create false positives when one deck contributes `Command` and another contributes `Cunning`, but no source deck actually has both.
- Store per-source-deck aspect arrays for each key, then test selected aspects against each source deck.

For keys that are themselves aspect-based:

- `aspects` can test directly against the key.
- `aspectsDetailed` can split the key by `-`.
- `aspectsBase` can test the key/base aspect plus source deck aspects if available.

### Row And Column Filtering

`MatchupTable` should compute filtered row and column keys separately:

```ts
const filteredRowKeys = filterKeys(matchupData.rowKeys, rowFilters, matchupData.keyInfo);
const filteredColKeys = filterKeys(matchupData.colKeys, columnFilters, matchupData.keyInfo);
```

Then pass both lists explicitly into `MatchupTableContent`.

The table body maps:

- rows from `rowKeys`
- columns from `colKeys`

This avoids the current limitation where only rows can be filtered.

### Display Limit

Preserve `MAX_DISPLAY_ITEMS = 30`, but apply it after row/column filtering.

Recommended behavior:

- If no table filters are active and `showAllData` is false, cap rows and columns to 30.
- If table filters are active, show all filtered rows and columns. Users expect filtered results to be complete.
- Keep the existing "show all/show less" row for the unfiltered capped state.
- Update the text in that row to report row and column counts separately.

## Data Model

Add shared types and validation under a new file such as:

```txt
types/TournamentMatchupFilters.ts
```

Recommended shared types:

```ts
export type MatchupDimensionFilterConfig = {
  text: string;
  aspects: SwuAspect[];
};

export type MatchupTableFilterConfig = {
  isMirrored: boolean;
  rowFilters: MatchupDimensionFilterConfig;
  columnFilters: MatchupDimensionFilterConfig;
};

export type SavedTournamentMatchupFilter = {
  id: string;
  userId: string;
  format: number;
  name: string | null;
  isMirrored: boolean;
  rowFilters: MatchupDimensionFilterConfig | null;
  columnFilters: MatchupDimensionFilterConfig | null;
  createdAt: string;
  updatedAt: string;
};
```

Recommended Zod schemas:

```ts
const matchupDimensionFilterConfigSchema = z.object({
  text: z.string().max(200).default(''),
  aspects: z.array(z.enum(SwuAspect)).default([]),
});

const savedTournamentMatchupFilterCreateSchema = z.object({
  format: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
  isMirrored: z.boolean().default(false),
  rowFilters: matchupDimensionFilterConfigSchema.nullable(),
  columnFilters: matchupDimensionFilterConfigSchema.nullable(),
});
```

Normalization rules:

- Empty text should be stored as `''`, not `undefined`.
- Empty aspects should be stored as `[]`.
- If `isMirrored` is true, store `rowFilters` and allow `columnFilters` to be `null`.
- On read, the frontend should hydrate mirrored filters by copying `rowFilters` into the effective column filters.
- If both `rowFilters` and `columnFilters` are empty, the save button should be disabled.

## Database Plan

Add a new Drizzle schema file:

```txt
server/db/schema/tournament_matchup_filter.ts
```

Recommended table name:

```txt
tournament_matchup_filter
```

Suggested columns:

```txt
id uuid primary key default random
user_id text not null references user(id) on delete cascade
format integer not null references format(id)
name varchar(120)
is_mirrored boolean not null default false
row_filters jsonb
column_filters jsonb
created_at timestamp/string not null default now
updated_at timestamp/string not null default now
```

Suggested indexes:

- `(user_id, format)`
- `(user_id, format, updated_at)`

No unique constraint is required for v1 because users may intentionally save multiple similar configs.

Generate a migration after adding the schema:

```txt
bun db-generate
```

If `server/db/schema.dbml` is still maintained manually, update it in the same change.

## API Plan

Create a focused route family:

```txt
server/routes/tournament-matchup-filters.ts
server/routes/tournament-matchup-filters/get.ts
server/routes/tournament-matchup-filters/post.ts
server/routes/tournament-matchup-filters/_id/delete.ts
```

Mount it in `server/app.ts`:

```ts
.route('/tournament-matchup-filters', tournamentMatchupFiltersRoute)
```

### List Saved Filters

Route:

```txt
GET /api/tournament-matchup-filters?format={formatId}
```

Behavior:

- require logged-in user
- validate `format` as positive integer
- return only rows owned by `user.id`
- filter by `format`
- sort newest first, preferably `updatedAt DESC, createdAt DESC`

Response:

```ts
{
  data: SavedTournamentMatchupFilter[];
}
```

### Save Filter

Route:

```txt
POST /api/tournament-matchup-filters
```

Behavior:

- require logged-in user
- validate request body with the shared schema
- normalize filters before insert
- set `userId` from the session, never from the request body
- return the created row

Request:

```ts
{
  format: number;
  name?: string;
  isMirrored: boolean;
  rowFilters: MatchupDimensionFilterConfig | null;
  columnFilters: MatchupDimensionFilterConfig | null;
}
```

Response:

```ts
{
  data: SavedTournamentMatchupFilter;
}
```

### Delete Saved Filter

Route:

```txt
DELETE /api/tournament-matchup-filters/:id
```

Behavior:

- require logged-in user
- delete only when `id` belongs to `user.id`
- return `404` when the row does not exist or belongs to another user

This is optional for the first implementation but recommended.

## Frontend API Hooks

Add a new API folder:

```txt
frontend/src/api/tournament-matchup-filters/
  index.ts
  useGetTournamentMatchupFilters.ts
  useSaveTournamentMatchupFilter.ts
  useDeleteTournamentMatchupFilter.ts
```

Recommended query keys:

```ts
['tournament-matchup-filters', formatId]
```

`useGetTournamentMatchupFilters(formatId, enabled)`:

- uses `skipToken` or `enabled`
- calls `api['tournament-matchup-filters'].$get({ query: { format: String(formatId) } })`
- returns `{ data: SavedTournamentMatchupFilter[] }`

`useSaveTournamentMatchupFilter()`:

- posts the normalized payload
- invalidates `['tournament-matchup-filters', formatId]`
- shows a success/error toast

`useDeleteTournamentMatchupFilter()`:

- deletes the row
- invalidates `['tournament-matchup-filters', formatId]`
- shows a success/error toast

## Frontend Implementation Plan

### 1. Extend Match Filter Types And Search Params

Touchpoints:

- `frontend/src/components/app/tournaments/TournamentMatchups/types.ts`
- `frontend/src/routes/__root.tsx`

Changes:

- update `MatchFilter` to:

```ts
export type MatchFilter = 'all' | 'day2' | 'top8' | 'custom';
```

- update `maMatchFilter` in the root search schema:

```ts
maMatchFilter: z.enum(['all', 'day2', 'top8', 'custom']).optional(),
```

### 2. Add Top 8 Option To MatchFilterSelector

Touchpoint:

- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchFilterSelector.tsx`

Changes:

- add a `ToggleGroupItem value="top8"`
- keep the same no-deselection behavior
- optional tooltip copy should explain that it keeps matches where at least one player finished in the top 8
- keep the existing custom min round/points UI unchanged

### 3. Update useFilteredMatches

Touchpoint:

- `frontend/src/components/app/tournaments/TournamentMatchups/hooks/useFilteredMatches.ts`

Changes:

- create a memoized `deckById` map
- reuse it for `day2` and `top8`
- add the `top8` switch case
- keep `filteredDecks` derived from filtered match deck ids

Suggested helpers:

```ts
const hasPlacementAtMost = (deck: TournamentDeckResponse | undefined | null, placement: number) =>
  deck?.tournamentDeck.placement != null && deck.tournamentDeck.placement <= placement;
```

### 4. Extend MatchupTableData With Key Info

Touchpoints:

- `frontend/src/components/app/tournaments/TournamentMatchups/types.ts`
- `frontend/src/components/app/tournaments/TournamentMatchups/hooks/useMatchupData.ts`

Add:

```ts
export type MatchupKeyInfo = {
  rawKey: string;
  sourceDeckAspects: SwuAspect[][];
};

export type MatchupTableData = {
  rowKeys: string[];
  colKeys: string[];
  matchups: MatchupDataMap;
  totalStats?: Map<string, MatchupTotalData>;
  keyInfo: Record<string, MatchupKeyInfo>;
};
```

Implementation notes:

- As `useMatchupData` computes keys for each deck, also append the deck's aspect array to `keyInfo[key].sourceDeckAspects`.
- Use `getAspectsFromDeckInformation(deck.deckInformation)`.
- Deduplicate identical source aspect arrays only if simple; correctness matters more than micro-optimization here.
- For `metaInfo === 'aspects'`, remember that one deck can contribute multiple keys.

### 5. Add Table Filter State Helpers

Create helper file:

```txt
frontend/src/components/app/tournaments/TournamentMatchups/utils/matchupTableFilters.ts
```

Responsibilities:

- default filter state
- `hasActiveMatchupTableFilters`
- `normalizeMatchupTableFilterConfig`
- `hydrateSavedMatchupTableFilter`
- `filterMatchupKeys`
- `summarizeMatchupTableFilter`

Recommended state shape:

```ts
type MatchupTableFilterState = {
  isMirrored: boolean;
  rowFilters: MatchupDimensionFilterConfig;
  columnFilters: MatchupDimensionFilterConfig;
};
```

`filterMatchupKeys` should:

- trim and lowercase text
- test raw key and resolved label text
- test selected aspects with AND semantics
- return all keys when there is no active filter

### 6. Resolve Current Format For Saved Filters

Touchpoint:

- `frontend/src/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx`

Add a small resolver:

```ts
function resolveMatchupFilterFormat(
  searchFormatId: number | undefined,
  tournaments: TournamentInfoMap,
): number | undefined
```

Resolution order:

1. Use `search.formatId` when present.
2. If all loaded tournaments share the same `tournament.format`, use that format.
3. Otherwise return `undefined`.

Pass the resolved format id into `MatchupTable`.

### 7. Rework MatchupTable Filtering

Touchpoint:

- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx`

Changes:

- replace `filterText` with the structured table filter state
- keep a debounced row text value and column text value, or debounce the full filter object
- compute effective filters:
  - if `isMirrored`, use row filters for both rows and columns
  - otherwise use separate row and column filters
- build label/search text for keys using `labelRenderer(key, metaInfo, 'text')`
- compute `filteredRowKeys` and `filteredColKeys` separately
- apply `MAX_DISPLAY_ITEMS` after filtering
- pass explicit `rowKeys` and `colKeys` to `MatchupTableContent`
- preserve column hover behavior and row click behavior

Important:

- `showAllData` should operate on the post-filter key lists.
- If active filters reduce the table to zero rows or columns, keep the header/filter controls visible and show a muted empty state row/body.

### 8. Create MatchupTableFilterControl

Create:

```txt
frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableFilterControl.tsx
```

Responsibilities:

- render the visible fast input
- render filter icon popover
- render clear button when active
- render saved filters button/popover when signed in
- own popover open states
- call save/load hooks
- call parent state setters

Props:

```ts
type MatchupTableFilterControlProps = {
  value: MatchupTableFilterState;
  onChange: (value: MatchupTableFilterState) => void;
  formatId?: number;
  active: boolean;
};
```

Recommended child components:

```txt
MatchupTableFilterPanel.tsx
SavedMatchupFiltersPopover.tsx
```

Keep these components small. `MatchupTableContent` should remain focused on rendering table structure.

### 9. Update MatchupTableContent

Touchpoint:

- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableContent.tsx`

Changes:

- replace the direct `<Input>` in the second header cell with `MatchupTableFilterControl`
- accept `colKeys` as a prop
- use `colKeys` for header cells and row cells
- update show-all row `colSpan` calculations to use filtered/visible column count
- remove the old `filterText` and `setFilterText` props
- keep stable `labelWidth` and `labelHeight` handling

### 10. Saved Filter Persistence UI

Create:

```txt
frontend/src/components/app/tournaments/TournamentMatchups/components/SavedMatchupFiltersPopover.tsx
```

Behavior:

- visible only when signed in
- disabled when no format id is available
- fetches list only when open
- selecting a config calls `onApply(hydratedConfig)`
- optional delete icon calls delete mutation and stops event propagation

Saved row summary should be compact. Avoid long instructional text in the app UI.

### 11. Styling Details

Use existing UI primitives:

- `Button`
- `Input`
- `Checkbox` or `Switch`
- `Popover`
- `Tooltip`
- `MultiAspectFilter`
- `Badge` if chips are useful

Use lucide icons:

- `Filter`
- `X`
- `ChevronDown`
- `Save`
- `Trash2` if delete is implemented

Layout recommendations:

- popover width around `w-[min(92vw,520px)]` for two columns
- in locked mode, narrower content is fine
- use `grid gap-3 sm:grid-cols-2` for unlocked row/column panels
- keep `MultiAspectFilter` labels off or compact to avoid bloating the table header interaction
- ensure mobile popover content fits within viewport width

## Primary Touchpoints

Backend:

- `types/TournamentMatchupFilters.ts`
- `server/db/schema/tournament_matchup_filter.ts`
- generated migration under `drizzle/`
- `server/routes/tournament-matchup-filters.ts`
- `server/routes/tournament-matchup-filters/get.ts`
- `server/routes/tournament-matchup-filters/post.ts`
- optional `server/routes/tournament-matchup-filters/_id/delete.ts`
- `server/app.ts`

Frontend API:

- `frontend/src/api/tournament-matchup-filters/index.ts`
- `frontend/src/api/tournament-matchup-filters/useGetTournamentMatchupFilters.ts`
- `frontend/src/api/tournament-matchup-filters/useSaveTournamentMatchupFilter.ts`
- optional `frontend/src/api/tournament-matchup-filters/useDeleteTournamentMatchupFilter.ts`

Frontend UI:

- `frontend/src/routes/__root.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/types.ts`
- `frontend/src/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/hooks/useFilteredMatches.ts`
- `frontend/src/components/app/tournaments/TournamentMatchups/hooks/useMatchupData.ts`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchFilterSelector.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx`
- `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableContent.tsx`
- new `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableFilterControl.tsx`
- optional new `frontend/src/components/app/tournaments/TournamentMatchups/components/MatchupTableFilterPanel.tsx`
- optional new `frontend/src/components/app/tournaments/TournamentMatchups/components/SavedMatchupFiltersPopover.tsx`
- new `frontend/src/components/app/tournaments/TournamentMatchups/utils/matchupTableFilters.ts`

## Implementation Order

1. Add shared saved-filter types and Zod schemas.
2. Add Drizzle schema for `tournament_matchup_filter`.
3. Generate the migration with `bun db-generate`.
4. Add list/save routes and mount the new route family in `server/app.ts`.
5. Add optional delete route.
6. Add frontend API hooks for list/save/delete.
7. Extend `MatchFilter` and root search params with `top8`.
8. Add `Top 8 matches` to `MatchFilterSelector`.
9. Update `useFilteredMatches` to support `top8` and optimize deck lookup with a map.
10. Extend `useMatchupData` to return `keyInfo` with source deck aspect arrays.
11. Add table filter helper utilities.
12. Add current-format resolution in `TournamentMatchups` and pass it to `MatchupTable`.
13. Rework `MatchupTable` to manage structured row/column filter state.
14. Add `MatchupTableFilterControl` and wire the visible fast input, filter popover, active styling, and clear button.
15. Add signed-in save/load UI and connect it to the new hooks.
16. Update `MatchupTableContent` to accept explicit `colKeys`.
17. Run automated checks.
18. Manually test match filtering, table filtering, and saved config flows.

## Validation

Automated checks:

```txt
cd frontend && bun run lint
cd frontend && bun run build
```

Database/codegen checks:

```txt
bun db-generate
```

Only run migration locally if the environment is configured for it:

```txt
bun server/db/migrate.ts
```

Manual scenarios:

- `maMatchFilter=all` keeps current behavior.
- `maMatchFilter=day2` keeps current behavior.
- `maMatchFilter=custom` keeps current min round/min points behavior.
- `maMatchFilter=top8` keeps only matches where at least one player finished top 8.
- Top 8 filter produces an empty state when no placement data exists.
- The visible table input still filters rows when row/column filters are unlocked.
- Opening the filter popover shows separate row and column filter columns by default.
- Row text filter affects rows only.
- Column text filter affects columns only.
- Row aspect filter affects rows only.
- Column aspect filter affects columns only.
- Locking filters copies row filters to columns and applies one shared config to both dimensions.
- Unlocking filters allows rows and columns to diverge again.
- Active filters highlight the header cell and show a clear button.
- Clear button removes all table text/aspect filters and unlocks the config.
- Filtering does not recompute matchup win/loss data; it only hides rows/columns from the computed matrix.
- `show all` behavior still works for large unfiltered matrices.
- Filtered results are not unexpectedly capped to 30.
- Row clicks still open the correct deck-key floater.
- Column hover highlighting still works after column filtering.
- Signed-out users do not see save/load controls.
- Signed-in users see save/load controls.
- Saved filter list is fetched only when opening the saved filters popover.
- Saving a filter creates a database row for the current user and format.
- Saved filters are listed only for the current format.
- Selecting a saved filter applies it to the table.
- Deleting a saved filter removes it from the list if the optional delete route is implemented.
- Mixed-format analyzer state disables saved filters instead of saving under the wrong format.
- Reloading the page does not automatically apply a saved config unless the user chooses it.

## Risks And Notes

- Top 8 filtering depends on imported `tournamentDeck.placement`. If placement data is missing or incomplete, the filter will omit those matches.
- Current `day2` logic scans deck arrays per match. This feature is a good moment to move both `day2` and `top8` to a shared `deckById` map.
- Text filtering against raw keys is not very useful for leader/base keys. Use resolved label text where possible.
- Aspect filtering aggregated matchup keys can create false positives if implemented with a simple union of all aspects. Store per-source-deck aspect arrays and test against each source deck.
- The matchup matrix can be wide. Keep filter controls compact and avoid layout shifts in the sticky header.
- Saved configs should not trust `userId` from the client. Always derive it from the session.
- The saved-filter JSON shape may evolve. Centralize normalization/hydration helpers so old rows can be adapted later if needed.
- If saved filters become a larger feature, add update/rename support later. V1 only needs save and load.

## Acceptance Criteria

- The top-level match filter selector includes `Top 8 matches`.
- `maMatchFilter=top8` is valid in the global search schema.
- Top 8 match filtering is applied before matchup data is computed.
- The visible matchup table input remains in the same header location.
- The table supports separate row and column text filters.
- The table supports separate row and column aspect filters.
- The table supports locked/mirrored filters that apply one config to both rows and columns.
- Active table filters visibly highlight the filter/input cell and provide a one-click clear action.
- Signed-in users can save the current table filter config for the current format.
- Signed-in users can open a saved-filter popover and load saved configs for the current format.
- Saved filter persistence is backed by a Drizzle table and authenticated Hono endpoints.
- Existing matchup display modes, meta info selection, row click behavior, and column hover behavior continue to work.
