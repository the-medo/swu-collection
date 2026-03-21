# Deckbuilder Improvements Plan

## Goals

- Make deck building faster for newer users, especially when increasing maindeck counts.
- Make name search feel smarter and more relevant.
- Make deckbuilder search aware of the current deck context by default.
- Add a QR code to exported deck images so image sharing also drives people back to the live deck page.
- Keep deckbuilder-specific behavior out of the global card database search unless the change is clearly beneficial everywhere.

## Current touch points

- Quick add flow: `frontend/src/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx`
- Quick add search state: `frontend/src/components/app/decks/DeckContents/DeckInputCommand/useDeckInputCommandStore.tsx`
- Shared name/search helpers: `frontend/src/components/app/cards/AdvancedCardSearch/searchService.ts`
- Deckbuilder shell: `frontend/src/components/app/decks/Deckbuilder/Deckbuilder.tsx`
- Shared advanced search UI: `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx`
- Shared advanced search filters/store: `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx`, `frontend/src/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts`
- Shared advanced search result layout/sorting: `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SearchCardLayout.tsx`, `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/useSearchCardTableColumns.tsx`
- Deck row actions: `frontend/src/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckCardTextRow.tsx`
- Board move UI: `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardBoardMoveButtons.tsx`
- Deckbuilder search result actions: `frontend/src/components/app/decks/Deckbuilder/DeckbuilderCardMenu.tsx`
- Dropdown quantity editor: `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardActions.tsx`, `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx`
- Deck image export: `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImage.tsx`, `frontend/src/components/app/decks/DeckContents/DeckImage/deckImageLib.ts`
- Set metadata already exists in: `lib/swu-resources/set-info.ts`

## Guiding rules

- Deckbuilder-only defaults must not leak into `/cards/search`.
- Auto-defaults should only apply when the deckbuilder route opens without explicit URL filters for that field.
- Leader/base exclusion must be enforced in the search logic, not only in the filter UI.
- Do not hardcode "Premier = 4 legal sets". That number changes over time. Compute legal sets from shared metadata and format rules.
- Keep full board editing available, but make the primary action the most common one: add/remove maindeck copies.

## Phase 1: Add a deckbuilder search context

### Goal

Give the shared advanced search components an opt-in way to behave differently inside deckbuilder without forking the whole feature.

### What to change

- Add a deckbuilder-specific search config in `Deckbuilder.tsx`.
- Pass that config through `AdvancedCardSearch.tsx` into the shared filters/store/result components.
- Support context options such as:
  - default aspects
  - default sets
  - allowed or excluded card types
  - hidden or locked filters
  - preferred default sort when a name query is active
- Keep `SearchFrom.DECKBUILDER` as the route identity, but do not rely on it alone for everything. Deck-specific defaults need deck data.

### Likely files

- `frontend/src/components/app/decks/Deckbuilder/Deckbuilder.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts`

### Notes

- The search store is shared, so initialization logic is the biggest risk area.
- While touching the store, also wire `resultsLayout`, `sort`, and `order` from URL params into state. The schema already supports them, but the initializer currently ignores them.
- A small helper such as `useDeckbuilderSearchDefaults.ts` would keep `Deckbuilder.tsx` from becoming too large.

## Phase 2: Make maindeck quantity changes obvious and fast

### Goal

Let users add or remove maindeck copies with one obvious action from both the search side and the decklist side.

### What to change

- Replace or augment the current deckbuilder overlay in `DeckbuilderCardMenu.tsx` with quick maindeck controls.
- Preferred first-pass behavior:
  - `+1 Main`
  - `-1 Main`
  - keep the dropdown for exact board quantities and secondary actions
- Rework the hover-only controls in `DeckCardTextRow.tsx` so the primary inline action is quantity change, not only "Move to".
- Keep board transfer actions, but label them more clearly with `Main`, `Side`, and `Maybe` instead of leaning on `MD` and `MB`.
- Consider extracting a shared quick-stepper component so deck rows and deckbuilder result cards use the same update logic.

### Likely files

- `frontend/src/components/app/decks/Deckbuilder/DeckbuilderCardMenu.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckCardTextRow.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardBoardMoveButtons.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardActions.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx`
- Optional new shared component: `frontend/src/components/app/decks/DeckContents/DeckCards/DeckCardQuickQuantity.tsx`

### Notes

- `DeckCardTextRow.tsx` already allows direct numeric editing for the current board via `DebouncedInput`, so the real gap is discoverability and quick +/- behavior.
- The current deckbuilder result overlay only shows `xN` plus a dropdown, which makes "add one more" too indirect.
- Keep whole-card click reserved for preview/details. Add-to-deck should stay explicit.
- Optional follow-up only: add a "repeat add" or "keep search open" mode to `DeckInputCommand.tsx`. That should not block the main pass because experienced users may prefer the current clear-on-select flow.

## Phase 3: Improve name relevance and result ordering

### Goal

When users type a name, obvious matches should come first instead of being buried behind weaker substring matches.

### What to change

- Introduce a shared relevance scorer in `searchService.ts`.
- Use that scorer in both:
  - `searchForCommandOptions()` for the quick add dropdown
  - deckbuilder advanced search ordering when the `name` filter is populated
- Ranking should prefer, roughly in this order:
  - exact name match
  - starts-with match
  - whole-word match in the visible name
  - contains match in the visible name
  - weaker matches in subtitle or secondary name text, if the dataset exposes them
- Preserve manual sorting when the user explicitly chooses a different sort.

### Likely files

- `frontend/src/components/app/cards/AdvancedCardSearch/searchService.ts`
- `frontend/src/components/app/decks/DeckContents/DeckInputCommand/useDeckInputCommandStore.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SearchCardLayout.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts`
- `frontend/src/components/app/cards/AdvancedCardSearch/advancedSearchLib.ts`
- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/useSearchCardTableColumns.tsx`
- Call sites that should keep existing defaults unless opted in:
  - `frontend/src/components/app/global/CardSearchCommand/useCardSearchCommandStore.tsx`
  - `frontend/src/components/app/collections/CollectionInput/CollectionInputName/useCollectionInputNameStore.tsx`

### Notes

- Right now `filterCards()` only decides inclusion, then `SearchCardLayout.tsx` applies a normal sort. Relevance needs to participate in ordering, not just filtering.
- `searchForCommandOptions()` currently returns the first 10 matching cards, which explains the odd novice-facing order.
- If adding a `relevance` sort option, make it URL-safe and route-safe from day one.

## Phase 4: Add deck-aware defaults to deckbuilder search

### Goal

Make the left side of deckbuilder feel preconfigured for the current deck instead of feeling like the full database search pasted into the page.

### What to change

- Preselect deck aspects in deckbuilder once leader/base are chosen.
- Preselect legal sets for the current deck format.
- Exclude leader and base cards from deckbuilder search because those are managed in `DeckLeaderBase.tsx`.
- Decide whether the card type filter should:
  - stay visible but only offer `Unit`, `Event`, and `Upgrade`
  - or be hidden entirely in deckbuilder
- Enforce the leader/base exclusion in the search function itself so stale URL state cannot reintroduce them.

### Likely files

- `frontend/src/components/app/decks/Deckbuilder/Deckbuilder.tsx`
- `frontend/src/components/app/decks/DeckContents/useDeckData.ts`
- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx`
- `frontend/src/components/app/cards/AdvancedCardSearch/searchService.ts`
- `frontend/src/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts`
- `frontend/src/components/app/decks/DeckContents/DeckLeaderBase.tsx`
- `lib/swu-resources/set-info.ts`
- Optional new helper: `lib/swu-resources/getLegalSetsForDeckFormat.ts`

### Notes

- Prefer deriving aspects from the selected leader/base cards already available via `useDeckData()` instead of inventing a second source of truth.
- Respect incomplete decks:
  - if no leader/base is selected yet, do not auto-lock aspects
  - if format has no meaningful set restriction, leave sets open
- Keep this pass focused on set defaults, not full deck legality validation. Full legality is a bigger problem.

## Phase 5: Add QR to exported deck images and improve preview fit

### Goal

Make exported images shareable in chat or social posts while still giving other players a fast way to open the live deck page.

### What to change

- Add a QR code that points to the canonical deck URL.
- Render the QR inside the same export canvas in `DeckImage.tsx`, ideally near the existing logo and `swubase.com` branding.
- Add a white background or quiet zone so the QR stays scannable over the textured export.
- Show the QR in both preview and downloaded/copied output.
- While touching this area, tighten the image preview sizing in the dialog so the export fits more comfortably on screen.

### Likely files

- `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImage.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckImage/deckImageLib.ts`
- `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImageCustomization/DeckImageCustomization.tsx` if a future toggle is desired
- `frontend/package.json` if a QR dependency is added

### Notes

- Best first pass: QR always on. It directly solves the sharing case from the feedback.
- If the QR feels too visually heavy later, expose it as a customization toggle after the base version works.
- Prefer generating the QR once per deck render and reusing it during export instead of recomputing it during every draw step.

## Recommended implementation order

1. Add the deckbuilder search context and default-initialization rules.
2. Add quick maindeck quantity controls.
3. Add relevance scoring and smarter ordering.
4. Add legal-set defaults plus leader/base exclusion.
5. Add QR export and preview-fit improvements.
6. Do a manual QA pass across both edit flows and the global card search flow.

## Manual QA checklist

- Normal `/cards/search` still shows all card types and behaves like the generic database search.
- Deckbuilder only applies auto-defaults when the URL does not already contain explicit filters.
- Changing leader/base or format does not wipe out user-chosen filters unexpectedly.
- Leader and base cards never appear in deckbuilder search results.
- Quick add dropdown puts obvious name matches first.
- Deckbuilder advanced search puts obvious name matches first by default.
- Manual sort controls still work after relevance ordering is added.
- Users can increase maindeck count with one clear click from the deck row and from deckbuilder result cards.
- Sideboard and maybeboard actions still work.
- Export preview fits better inside the dialog.
- Downloaded and copied images include a QR that scans successfully and opens the deck page.

## Open decisions before implementation

- Should deckbuilder still show the card type filter with only `Unit`, `Event`, and `Upgrade`, or hide that filter entirely?
- Should quick add keep clearing the search after selection, or should that become an explicit optional mode?
- Should QR be always on, or should it be a later customization toggle if users ask for it?
