# Live Tournament Details Plan

## Summary

Improve the live tournament experience in two connected areas:

1. Make the live top 8 bracket dialog feel like the existing imported tournament bracket/detail UI:
   - wider dialog
   - bracket on the left
   - current top 8 standings panel on the right
   - shared player/deck visual style with leader/base background decoration
   - click a bracket player or top 8 standing to open that player's decklist detail when an imported decklist is available

2. Add a global URL-driven tournament detail dialog:
   - imported live tournament cards get a new `Detail` action beside the `Top 8 bracket` action
   - the action sets `dialogTournamentId`
   - any route can open the same dialog when `dialogTournamentId` is present
   - the dialog is nearly full-screen while still clearly reading as a dialog
   - the dialog renders `TournamentDetailContent`

The work should be frontend-heavy, with one targeted backend/API DTO extension for the live bracket endpoint so the bracket dialog can render top standings and know which players have decklists.

## Current Repo Baseline

- The live homepage route is `frontend/src/routes/index.tsx`; it renders `LiveTournamentHome` when `homeMode=live`.
- Live tournament cards are rendered by `frontend/src/components/app/home/live-tournaments/components/TournamentCard.tsx`.
- The current top 8 bracket action is `BracketPreview`:
  - `frontend/src/components/app/home/live-tournaments/components/BracketPreview.tsx`
  - It renders a small ghost button and a Radix `Dialog`.
  - It lazy-loads `useLiveTournamentBracket(weekendId, tournamentId, open && hasBracketMatches)`.
  - The dialog is currently `w-[1200px] max-w-[96vw]` and scales the bracket down with `scale-70/-m`.
- Live bracket rendering is split across:
  - `LiveBracketRounds.tsx`
  - `LiveBracketRoundColumn.tsx`
  - `LiveBracketMatch.tsx`
  - `LiveBracketPlayer.tsx`
- `LiveBracketPlayer` already renders leader/base decoration through `DeckBackgroundDecoration` and `BaseAvatar`, but it does not know about imported deck ids.
- The existing imported tournament bracket/detail pattern lives in:
  - `frontend/src/components/app/tournaments/TournamentTabs/DetailAndBracketTab.tsx`
  - `frontend/src/components/app/tournaments/TournamentTopBracket/TournamentTopBracket.tsx`
  - `frontend/src/components/app/tournaments/TournamentTopBracket/components/BracketRounds.tsx`
  - `frontend/src/components/app/tournaments/TournamentTopBracket/components/TournamentPlacements.tsx`
  - `frontend/src/components/app/tournaments/TournamentTopBracket/components/DeckViewer.tsx`
- `TournamentTopBracket` already has the desired interaction model:
  - shared highlighted player state
  - a right-side placement list
  - a selected deck state
  - selecting a player replaces the bracket area with `DeckViewer`
- The live bracket API already has a dedicated backend read model:
  - `server/routes/tournament-weekends/_id/tournament/_tournamentId/bracket/get.ts`
  - `server/lib/live-tournaments/tournamentWeekendLiveHome.ts#getLiveTournamentBracket`
  - `types/TournamentWeekend.ts#LiveTournamentBracketDetail`
- The current `LiveTournamentBracketDetail` only returns `weekendId`, `tournamentId`, and `rounds`.
- Live tournament card entries already include `entry.tournament.imported`, so the frontend can decide whether to show the new `Detail` action without another request.
- Existing global URL-driven dialog pattern:
  - `frontend/src/routes/__root.tsx` defines global search params.
  - `CardDetailDialog` is mounted in the root component.
  - `frontend/src/components/app/cards/CardDetailDialog/CardDetailDialog.tsx` opens when `modalCardId` is present and clears the param on close.
- `TournamentDetailContent` currently exists at:
  - `frontend/src/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx`
  - It receives `maTournamentId`.
  - Its close button currently clears `maTournamentId`.
  - Its tab state currently reads/writes the generic `page` search param through `TournamentTabs` in `search-params` mode.

## Target UX

### Bracket Dialog

- The `Top 8 bracket` action remains lazy: do not fetch bracket detail until the dialog opens.
- The dialog should be substantially wider than the current one and should not rely on scaling the bracket down as the primary layout strategy.
- Recommended layout:
  - desktop: two-column grid, `bracket/deck viewer` left and `current top 8` right
  - mobile/tablet: stacked layout with bracket first, top 8 panel second
  - max height around `90vh` to `92vh`, with inner scroll areas where needed
- The dialog title should remain simple, for example `Top 8 bracket`.
- The right panel should show current top 8 standings sorted by rank:
  - rank
  - player display name
  - match record and/or points when available
  - leader/base decoration where available
  - deck name when an imported deck can be matched
- The panel should visually match bracket players: same leader/base background decoration, compact avatar treatment, highlighted state, winner/selected affordances where relevant.
- Hovering a player in the bracket should highlight the same player in the right panel, and hovering a top 8 row should highlight matching bracket appearances.
- Clicking a player in the bracket or right panel opens decklist detail only when a deck id is available.
- Players without available decklists should still render normally but should not show a click cursor or open empty deck detail.
- When a deck is selected, use the same behavior as `TournamentTopBracket`:
  - render `DeckViewer` in the main left area
  - keep the top 8 side panel visible
  - include a close button inside `DeckViewer` to return to the bracket
- Loading, error, and empty states should still be visible inside the dialog.

### Tournament Detail Dialog

- Imported live tournament cards get a `Detail` button beside `Top 8 bracket`.
- Use a pie graph style icon from `lucide-react`, likely `ChartPie` after confirming the export name.
- Button styling should match `Top 8 bracket`:
  - `variant="ghost"`
  - `size="xs"`
  - uppercase muted label
  - compact icon + text
- The detail action should set `dialogTournamentId` in the URL using `useNavigate` or `Link`.
- The detail button should be independent from bracket availability:
  - if a tournament is imported and has no bracket matches, `Detail` should still appear
  - if a tournament is not imported, `Detail` should not appear
- A global dialog opens anywhere in the app if `dialogTournamentId` is present.
- Closing the dialog clears `dialogTournamentId` and any dialog-only tab param, without disturbing the host page's unrelated search params.
- Dialog sizing should cover almost all of the viewport while leaving visible margin around it:
  - examples: `w-[calc(100vw-1.5rem)] h-[calc(100vh-1.5rem)]` on mobile, `w-[calc(100vw-3rem)] h-[calc(100vh-3rem)]` on larger screens
  - avoid full `w-screen h-screen`, because the task explicitly wants users to see that it is a dialog
- The dialog body renders `TournamentDetailContent`.

## Data And API Plan

### Extend Live Bracket DTO

Update `types/TournamentWeekend.ts` so `LiveTournamentBracketDetail` can carry the top 8 side panel data and deck click metadata.

Suggested additions:

```ts
export type LiveTournamentBracketDeckSummary = {
  deckId: string;
  name: string | null;
  leaderCardId1: string | null;
  baseCardId: string | null;
  placement: number | null;
};

export type LiveTournamentBracketStanding = {
  standing: Pick<
    TournamentStanding,
    | 'tournamentId'
    | 'playerDisplayName'
    | 'roundNumber'
    | 'rank'
    | 'points'
    | 'gameRecord'
    | 'matchRecord'
    | 'updatedAt'
  >;
  player: LiveTournamentBracketPlayer;
  tournamentPlayer: LiveTournamentBracketTournamentPlayer | null;
  deck: LiveTournamentBracketDeckSummary | null;
};

export type LiveTournamentBracketDetail = {
  weekendId: string;
  tournamentId: string;
  rounds: LiveTournamentBracketRound[];
  topStandings: LiveTournamentBracketStanding[];
};
```

Also consider adding `deck: LiveTournamentBracketDeckSummary | null` to each `LiveTournamentBracketMatch` player side if it keeps the frontend simpler. If added there, use separate `deck1` and `deck2` fields or nested player-side objects rather than overloading `player1`.

### Backend Read Model Changes

Update `server/lib/live-tournaments/tournamentWeekendLiveHome.ts#getLiveTournamentBracket`.

1. Keep the existing weekend membership guard:
   - return `null` if `tournamentWeekendTournament` does not contain the requested `(weekendId, tournamentId)`

2. Determine the current standings round:
   - prefer `weekendTournament.roundNumber`
   - otherwise use `MAX(tournament_standing.round_number)` for that tournament

3. Select top 8 current standings:
   - `WHERE tournament_id = tournamentId`
   - `AND round_number = displayRound`
   - `ORDER BY rank ASC, player_display_name ASC`
   - `LIMIT 8`

4. Build the set of player display names from:
   - bracket match player names
   - top 8 standing player names

5. Select tournament player data for those names from `tournament_weekend_player`.
   - This powers leader/base art for both bracket and side panel.

6. For imported decklist availability, join imported tournament deck rows:
   - select from `tournament_deck`
   - left join `deck`
   - filter by `tournament_id = tournamentId`
   - match player by `tournament_deck.melee_player_username`
   - include at least `deck.id`, `deck.name`, `deck.leaderCardId1`, `deck.baseCardId`, and placement

7. Use exact display-name matching first. If there are known Melee/import naming inconsistencies, add a small normalized fallback map:
   - trim whitespace
   - compare case-insensitively
   - keep exact match precedence to avoid accidental collisions

8. If no current live standings exist but the tournament is imported, optionally fall back to imported top placements for the side panel:
   - this is not required for the live "current standing" requirement, but it makes the dialog useful after imports when live standings are missing
   - label behavior should still read as top standings; do not invent rank values unless placement is present

9. Keep the existing bracket round filtering:
   - `Quarterfinals`
   - `Semifinals`
   - `Finals`

10. Keep the response light:
   - do not return full `DeckInformation`
   - do not return complete match history
   - do not return all standings

No database migration should be needed; this uses existing tables and columns.

### Frontend Hook

`frontend/src/api/tournament-weekends/useLiveTournamentBracket.ts` can keep the same hook signature. It should only need type updates after the backend response changes.

`queryKeys.ts` does not need a new key because the detail remains scoped by `weekendId` and `tournamentId`.

## Frontend Implementation Plan

### 1. Refactor Live Bracket Player Presentation

Touchpoints:
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketPlayer.tsx`
- new optional shared component, for example:
  - `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveTournamentPlayerCard.tsx`

Recommended approach:
- Extract the reusable decorated player row/card from `LiveBracketPlayer`.
- Support these props:
  - `playerDisplayName`
  - `leaderCardId`
  - `baseCardKey` or resolved `baseCardId`
  - `deckName`
  - `rank`
  - `matchRecord`
  - `points`
  - `gameWins`
  - `isWinner`
  - `isLoser`
  - `isHighlighted`
  - `isSelected`
  - `onClick`
  - `onMouseEnter`
  - `onMouseLeave`
- Preserve the current bracket row height and score treatment for bracket matches.
- Add a compact side-panel variant for top standings.
- Use button semantics when clickable, and non-clickable `div` semantics when no deck is available.
- Keep `DeckBackgroundDecoration` and `BaseAvatar` behavior.

### 2. Add Top 8 Side Panel

Create a focused component:
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketTopStandings.tsx`

Props:
- `topStandings`
- `highlightedPlayerDisplayName`
- `selectedDeckId`
- `setHighlightedPlayerDisplayName`
- `setSelectedDeckId`

Behavior:
- Render a panel title such as `Current top 8`.
- Show rows ordered as returned by the API.
- Use rank as the primary numeric marker.
- Use match record and points as compact secondary metadata.
- Show deck name only when `standing.deck?.name` is present.
- Click row only when `standing.deck?.deckId` is present.
- Highlight row when:
  - hovered player matches `highlightedPlayerDisplayName`
  - selected deck id matches the row deck id
- Empty state:
  - if bracket exists but standings are unavailable, show a small muted message rather than hiding the entire panel

### 3. Wire Deck Selection Into Live Bracket Components

Touchpoints:
- `BracketPreview.tsx`
- `LiveBracketRounds.tsx`
- `LiveBracketRoundColumn.tsx`
- `LiveBracketMatch.tsx`
- `LiveBracketPlayer.tsx`

Add state in `BracketPreview`:

```ts
const [selectedDeckId, setSelectedDeckId] = useState<string>();
```

Pass `setSelectedDeckId` through the bracket component tree.

When rendering a match player:
- look up the deck summary for the player side
- pass `deckId` to the player card
- call `setSelectedDeckId(deckId)` only if present

Implementation detail:
- If deck summary is included directly on each match side, the match component is simple.
- If deck summary is only in `topStandings`, build a `deckByPlayerDisplayName` map in `BracketPreview` or `LiveBracketRounds` and pass it down.
- Prefer a helper function near the bracket preview components instead of duplicating player-name normalization on the client.

### 4. Rework Bracket Dialog Layout

Touchpoint:
- `frontend/src/components/app/home/live-tournaments/components/BracketPreview.tsx`

Recommended dialog content:
- `DialogContent className="w-[min(98vw,1600px)] max-w-[98vw] max-h-[92vh] p-4 sm:p-6 overflow-hidden"`
- Header remains fixed at top.
- Body uses a grid:
  - `grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]`
  - left area gets `min-w-0 overflow-auto`
  - right panel gets `lg:max-h-[calc(92vh-7rem)] overflow-y-auto`
- Remove the current `scale-70 -m-[10%]` strategy unless a small amount of scaling is still needed at very narrow widths.
- If `selectedDeckId` is set:
  - render `DeckViewer` in the left area
  - pass `compact`
  - pass `setSelectedDeckId`
- Otherwise render `LiveBracketRounds`.

Import and reuse:
- `frontend/src/components/app/tournaments/TournamentTopBracket/components/DeckViewer.tsx`

### 5. Add Detail Button To Live Tournament Cards

Touchpoint:
- `frontend/src/components/app/home/live-tournaments/components/TournamentCard.tsx`

Add a small action row:

```tsx
<div className="relative z-20 flex flex-wrap items-center gap-1">
  <BracketPreview ... />
  {entry.tournament.imported && (
    <TournamentDetailDialogButton tournamentId={entry.tournament.id} />
  )}
</div>
```

Create either:
- a small local button inside `TournamentCard.tsx`, or
- a reusable component:
  - `frontend/src/components/app/tournaments/TournamentDetailDialogButton.tsx`

Button behavior:
- `onClick` navigates to `.`
- `search: prev => ({ ...prev, dialogTournamentId: entry.tournament.id, dialogTournamentTab: 'details' })`
- keep existing search params intact
- do not use a local dialog state here; the global root dialog owns display

Use `ChartPie` or the correct lucide pie-chart icon export.

### 6. Add Global Search Params

Touchpoint:
- `frontend/src/routes/__root.tsx`

Add:

```ts
dialogTournamentId: z.string().optional(),
dialogTournamentTab: z
  .enum(['details', 'meta', 'matchups', 'decks', 'card-stats'])
  .optional(),
```

`dialogTournamentTab` is not explicitly requested, but it avoids a real conflict with the existing generic `page` search param used by admin/settings/meta/tournament sections. The required URL opener remains `dialogTournamentId`.

### 7. Create Global Tournament Detail Dialog

Create:
- `frontend/src/components/app/tournaments/TournamentDetailDialog/TournamentDetailDialog.tsx`

Pattern:
- mirror `CardDetailDialog`
- read `dialogTournamentId` and `dialogTournamentTab` via `useSearch({ strict: false })`
- open when `dialogTournamentId` exists
- use the app global `Dialog` wrapper or Radix dialog directly
- on close:
  - clear `dialogTournamentId`
  - clear `dialogTournamentTab`
  - leave all other search params intact

Render:

```tsx
<TournamentDetailContent
  tournamentId={dialogTournamentId}
  tabSearchParam="dialogTournamentTab"
  onClose={closeDialog}
/>
```

Mount it in `frontend/src/routes/__root.tsx` beside `CardDetailDialog`.

Recommended placement:
- inside the same main app shell where `CardDetailDialog` is rendered, so it participates in root routing and search params globally.

### 8. Refactor TournamentDetailContent For Reuse

Touchpoint:
- `frontend/src/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx`

Problem to fix:
- The component currently takes `maTournamentId`.
- Its close button always clears `maTournamentId`.
- Its tabs read/write `page`.
- Reusing it directly for `dialogTournamentId` would leave the global dialog stuck open after pressing the content's `Close` button.

Recommended refactor:

```ts
export interface TournamentDetailContentProps {
  tournamentId: string;
  expanded?: boolean;
  setExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
  tabSearchParam?: 'page' | 'dialogTournamentTab';
}
```

Then:
- replace internal `maTournamentId` usage with `tournamentId`
- compute active tab from `search[tabSearchParam] ?? 'details'`
- call `onClose` from the close button when provided
- keep a default close behavior for existing daily snapshot usage if desired, or update existing callers to pass `onClose`

Update call sites:
- `TournamentDetailSection.tsx`
- `PQStatistics.tsx`
- any other `TournamentDetailContent maTournamentId={...}` call

### 9. Make TournamentTabs Search Param Configurable

Touchpoint:
- `frontend/src/components/app/tournaments/TournamentTabs/TournamentTabs.tsx`

Current search-param mode always writes `page`.

Add:

```ts
searchParamKey?: 'page' | 'dialogTournamentTab';
```

Default to `page` to avoid breaking existing meta/daily snapshot flows.

In search-param mode:

```tsx
<Link
  to="."
  search={prev => ({ ...prev, [searchParamKey]: tab.key })}
/>
```

Pass the chosen key from `TournamentDetailContent` into `TournamentDetail` and then into `TournamentTabs`, or pass it directly if that is cleaner.

This prevents the global dialog tabs from overwriting a host page's `page` param.

### 10. TournamentDetail And Tabs Plumbing

Touchpoints:
- `frontend/src/components/app/tournaments/TournamentDetail/TournamentDetail.tsx`
- `frontend/src/components/app/tournaments/TournamentTabs/TournamentTabs.tsx`

`TournamentDetail` currently accepts:
- `activeTab`
- `mode`

Add an optional `tabSearchParam` prop and forward it to `TournamentTabs`.

This keeps `TournamentDetailContent` as the only place that decides whether it is using `page` or `dialogTournamentTab`.

## Implementation Order

1. Extend `types/TournamentWeekend.ts` with bracket top standings and deck summary DTOs.
2. Update `getLiveTournamentBracket` to return `topStandings` and deck summaries.
3. Confirm `useLiveTournamentBracket` compiles against the new response shape.
4. Extract or introduce a reusable decorated live player card.
5. Add `LiveBracketTopStandings`.
6. Thread `selectedDeckId` and `setSelectedDeckId` through the live bracket components.
7. Rework `BracketPreview` dialog sizing and layout.
8. Add a live tournament detail button component or local button in `TournamentCard`.
9. Add `dialogTournamentId` and `dialogTournamentTab` to root search params.
10. Refactor `TournamentDetailContent` from `maTournamentId` to reusable `tournamentId` plus `onClose`.
11. Make `TournamentTabs` search-param key configurable.
12. Forward the configurable tab search param through `TournamentDetail`.
13. Add and mount the global `TournamentDetailDialog`.
14. Update existing `TournamentDetailContent` call sites.
15. Run automated checks and manual browser QA.

## Primary Touchpoints

Backend:
- `types/TournamentWeekend.ts`
- `server/lib/live-tournaments/tournamentWeekendLiveHome.ts`
- `server/routes/tournament-weekends/_id/tournament/_tournamentId/bracket/get.ts` only if response wrapping or error behavior needs adjustment

Frontend:
- `frontend/src/routes/__root.tsx`
- `frontend/src/api/tournament-weekends/useLiveTournamentBracket.ts`
- `frontend/src/components/app/home/live-tournaments/components/TournamentCard.tsx`
- `frontend/src/components/app/home/live-tournaments/components/BracketPreview.tsx`
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketRounds.tsx`
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketRoundColumn.tsx`
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketMatch.tsx`
- `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketPlayer.tsx`
- new `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveBracketTopStandings.tsx`
- optional new `frontend/src/components/app/home/live-tournaments/components/bracket-preview/LiveTournamentPlayerCard.tsx`
- new `frontend/src/components/app/tournaments/TournamentDetailDialog/TournamentDetailDialog.tsx`
- optional new `frontend/src/components/app/tournaments/TournamentDetailDialogButton.tsx`
- `frontend/src/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx`
- `frontend/src/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailSection.tsx`
- `frontend/src/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQStatistics.tsx`
- `frontend/src/components/app/tournaments/TournamentDetail/TournamentDetail.tsx`
- `frontend/src/components/app/tournaments/TournamentTabs/TournamentTabs.tsx`

## Validation

Automated checks:
- `cd frontend && bun run lint`
- `cd frontend && bun run build`
- If backend type changes expose errors only in root build/type checking, run the repo's normal TypeScript check if available, or use the build failure output to catch shared type regressions.

Manual scenarios:
- Live tournament card with `imported=false` does not show `Detail`.
- Live tournament card with `imported=true` shows `Detail`.
- Clicking `Detail` updates the URL with `dialogTournamentId`.
- Loading a URL directly with `?dialogTournamentId=<id>` opens the dialog on first render.
- Closing the dialog clears `dialogTournamentId` and leaves unrelated search params intact.
- Dialog tabs inside the global dialog do not overwrite the host page's `page` param.
- Global dialog leaves visible page margin around it on desktop and mobile.
- `TournamentDetailContent` close button works correctly from both daily snapshot sections and the new global dialog.
- Opening `Top 8 bracket` fetches bracket data lazily.
- Bracket dialog is wider and does not visually squash the bracket.
- Top 8 side panel shows current standings in rank order.
- Hovering a player in the bracket highlights the corresponding top 8 row.
- Hovering a top 8 row highlights that player in the bracket.
- Clicking a bracket player with a decklist opens deck detail.
- Clicking a top 8 row with a decklist opens deck detail.
- Clicking or hovering players without decklists does not cause errors.
- Closing the deck detail returns to the bracket view.
- Bracket loading, empty, and error states still render.
- Existing imported tournament detail pages still work at `/tournaments/$tournamentId/details`.
- Existing daily snapshot tournament detail section still works with `maTournamentId`.

## Risks And Notes

- `TournamentDetailContent` is currently tied to `maTournamentId`; refactor this carefully because it is shared by daily snapshots and PQ statistics.
- The generic `page` search param is already used by multiple pages. The global dialog should avoid relying on it unless product explicitly accepts host-page tab interference.
- Matching live player display names to imported tournament deck rows may be imperfect if Melee names changed between live capture and import. Prefer exact matching, then a conservative normalized fallback.
- The bracket endpoint should stay lazy and lightweight. Avoid returning all tournament decks or all standings just to power the dialog.
- `DeckViewer` calls `useSetDeckInfo(selectedDeckId, false)`. Reusing it in the live bracket dialog should be fine, but verify it behaves correctly inside a nested scrollable dialog.
- Radix dialog nesting can matter if deck contents open card-detail dialogs. Verify card detail modals still open above the bracket/detail dialogs and that Escape key behavior is acceptable.
- No database migration is expected.

## Acceptance Criteria

- `plan.md` implementation produces a live bracket dialog with a bracket/deck-viewer area and a current top 8 panel.
- Player/deck visuals in the bracket and side panel share the same decorated style.
- Deck detail opens from both bracket and top 8 panel when a decklist exists.
- Imported live tournaments expose a `Detail` action.
- `dialogTournamentId` globally opens a nearly full-screen `TournamentDetailContent` dialog.
- Closing global tournament detail removes only its dialog search params.
- Existing tournament detail and daily snapshot flows are preserved.
