# Deck Card Variants Plan

## Goal

Let deck owners choose cosmetic card-art variants for cards displayed while browsing a deck. The chosen variant changes only `CardImage` rendering. It must not affect saved card IDs, quantities, boards, deck information, deck exports, card prices, collection ownership, legality, or statistics.

## Current Repo Baseline

- The active worktree is on branch `feature/deck-card-variants`.
- Database schema files live in `server/db/schema/*`, and migrations are generated with `bun db-generate`.
- Normal deck contents are stored in `deck_card` with primary key `(deck_id, card_id, board)`.
- Leaders and bases live directly on `deck`: `leader_card_id_1`, `leader_card_id_2`, and `base_card_id`.
- Deck cards are fetched from `GET /api/deck/:id/card` in `server/routes/decks/_id/card/get.ts`.
- Card add/update/delete routes live in:
  - `server/routes/decks/_id/card/post.ts`
  - `server/routes/decks/_id/card/put.ts`
  - `server/routes/decks/_id/card/delete.ts`
- The frontend reads deck cards through `frontend/src/api/decks/useGetDeckCards.ts`.
- `useDeckData()` in `frontend/src/components/app/decks/DeckContents/useDeckData.ts` builds the shared deck layout data and already includes leaders and base in `usedCards`.
- Visual deck layouts currently call `selectDefaultVariant(card)` and pass that variant to `CardImage`.
- Text layouts show image previews through `DeckCardHoverImage`, which also resolves `selectDefaultVariant(card)`.
- Leaders and bases are shown through `DeckLeaderBase`, `LeaderSelector`, and `BaseSelector`, which currently use default variants.
- `selectDefaultVariant()` currently reads from the card JSON shape, not from the database. The repo also has a `card_standard_variant` table used elsewhere, but this feature can keep display fallback behavior aligned with the existing helper.
- `getMergedCardList()` is exported from `server/lib/cards/cardListProvider.ts` and should be used for validation so official and preview card variants both work.
- There is an existing deck-image-only variant picker under `DeckImageCustomization/DeckImageCardVariants`. It is user-setting backed and can inspire the UI, but it should not be reused as-is because this feature needs server-side deck overrides and default seeding when adding cards.
- The card list shape already has variants as `card.variants[variantId]`, and `CardImage` already accepts `cardVariantId`.

## Product Decisions

- Store overrides per `deck_id + card_id`, not per board. If the same card appears in multiple boards, it uses the same cosmetic variant everywhere in that deck.
- Include leaders and bases in the same override table. They are deck cards for display purposes even though they are not rows in `deck_card`.
- Interpret `deck_card_variant_user_default.show_everywhere` as:
  - `false`: seed future deck-specific rows when this user adds that card to a deck, but do not live-override existing decks.
  - `true`: seed future rows and also act as a fallback display preference in any of the user's decks where no deck-specific override exists.
- When resolving display variants, precedence is:
  1. deck-specific `deck_card_variant`
  2. logged-in deck owner's `deck_card_variant_user_default` rows with `show_everywhere = true`
  3. normal `selectDefaultVariant(card)`
- The route should skip variant resolution for decks owned by the default `swubase` user. The code should use the canonical owner field used in the app, likely `user.name` or `user.displayName`, and keep the check explicit and easy to change.
- Public viewers should see the deck owner's deck-specific overrides and `show_everywhere` defaults because this is part of how that deck is presented.
- Users may only mutate variants on decks they own, with the same admin override behavior used by deck-card mutation routes if admin editing is intended to apply.
- Validate that `variant_id` belongs to the selected `card_id` using the merged card list. Never trust a client-sent variant ID blindly.
- If a saved variant no longer exists in the card list, omit it from the returned map and log or tolerate it. Broken cosmetic preferences should not break deck loading.

## Data Model

Add two Drizzle schema files or one focused schema file, for example:

```txt
server/db/schema/deck_card_variant.ts
```

Recommended tables:

```ts
deckCardVariant
```

- `deckId`: `uuid('deck_id')`, references `deck.id` with `onDelete: 'cascade'`
- `cardId`: `text('card_id')`
- `variantId`: `text('variant_id')`
- `createdAt`: follow the deck-table timestamp pattern, `timestamp('created_at').notNull().defaultNow()`
- `updatedAt`: follow the deck-table timestamp pattern, `timestamp('updated_at').notNull().defaultNow()`, plus `.$onUpdateFn(() => new Date())` or the repo's preferred update mechanism if string timestamps are needed
- primary key: `(deck_id, card_id)`
- indexes: the primary key covers reads by `deck_id`; add no separate `(card_id)` or `(variant_id)` index unless an admin/reconciliation query later needs it

```ts
deckCardVariantUserDefault
```

- `userId`: `text('user_id')`, references `user.id` with `onDelete: 'cascade'`
- `cardId`: `text('card_id')`
- `variantId`: `text('variant_id')`
- `showEverywhere`: `boolean('show_everywhere').notNull().default(false)`
- `createdAt`: `timestamp('created_at').notNull().defaultNow()`
- `updatedAt`: `timestamp('updated_at').notNull().defaultNow()` plus an update hook
- primary key: `(user_id, card_id)`
- indexes: primary key covers reads by `user_id`; add `(user_id, show_everywhere)` only if the implementation queries all visible defaults without a card-id list

Do not add a foreign key to card IDs or variant IDs because the card list is JSON-backed rather than a relational table.

Generate a migration after schema changes:

```txt
bun db-generate
```

Then inspect the generated SQL and snapshot. If `schema.dbml` is not actively maintained for newer tables, do not spend time hand-syncing it unless the implementation branch establishes that expectation.

Apply the migration locally only when the environment is configured:

```txt
bun db-migrate
```

## Shared Types And Validation

Create a shared type/validation file, for example:

```txt
types/DeckCardVariant.ts
```

Suggested Zod schemas:

```ts
zDeckCardVariantMap = z.record(z.string(), z.string())

zDeckCardVariantMutation = z.object({
  cardId: z.string().min(1),
  variantId: z.string().min(1),
})

zDeckCardVariantDefaultMutation = zDeckCardVariantMutation.extend({
  showEverywhere: z.boolean().default(false),
})
```

The API should return a map:

```ts
type DeckCardVariantMap = Record<string, string>
```

Use a small server helper to validate:

```ts
assertCardVariantExists(cardId, variantId)
```

It should call `getMergedCardList()` and verify both the card and `card.variants[variantId]` exist.

## Server Helper Plan

Add a focused helper, for example:

```txt
server/lib/decks/deckCardVariants.ts
```

Responsibilities:

- `getDeckCardVariantMaps(deckId, viewerUser?)`
- `getDeckVariantOwner(deckId)` or reuse deck queries that already join owner data
- `setDeckCardVariant(deckId, cardId, variantId, user)`
- `clearDeckCardVariant(deckId, cardId, user)`
- `getDeckCardVariantUserDefaults(userId)`
- `setDeckCardVariantUserDefault(userId, cardId, variantId, showEverywhere)`
- `deleteDeckCardVariantUserDefault(userId, cardId)`
- `seedDeckCardVariantFromUserDefault(tx, deckId, userId, cardId)`
- `deleteDeckCardVariantsForDeck(tx, deckId)`
- `copyDeckCardVariants(tx, sourceDeckId, targetDeckId)`

Resolution details:

1. Load the deck and owner.
2. If owner is the default `swubase` user, return `{}` and avoid querying both variant tables.
3. Collect card IDs used by the deck:
   - leader 1
   - leader 2
   - base
   - normal `deck_card.card_id` rows for normal decks
   - transformed card-pool rows for card-pool decks if the feature should display variants there
4. Load deck-specific rows for those card IDs.
5. Load owner defaults with `show_everywhere = true` for those card IDs.
6. Merge with deck-specific rows taking precedence.
7. Validate each resolved variant against `getMergedCardList()` and omit invalid entries.

Keep this helper side-effect-free for reads so it can be reused by the existing deck-card endpoint and, if needed later, any separate endpoint.

Recommended return shape:

```ts
type DeckCardVariantMaps = {
  deckOverrides: Record<string, string>;
  showEverywhereDefaults: Record<string, string>;
  cardVariants: Record<string, string>;
};
```

`cardVariants` is the merged display map used by layout rendering. The separate maps let the dialog render accurate badges without guessing whether the active variant came from the deck or from a default.

## API Plan

Prefer enriching the existing deck-card endpoint:

```txt
GET /api/deck/:id/card
```

Response:

```ts
{
  data: DeckCard[]
  deckOverrides?: Record<string, string>
  showEverywhereDefaults?: Record<string, string>
  cardVariants?: Record<string, string>
}
```

Behavior:

- Keep the existing `data: DeckCard[]` field unchanged.
- Add the variant maps as optional top-level fields, not nested under `data`.
- Older clients remain compatible because they can continue reading only `data`.
- Omit these fields, or return empty maps, for default `swubase` user decks without querying variant tables.
- Return deck overrides plus owner `show_everywhere` defaults for all visible deck cards, leaders, and bases on non-`swubase` decks.
- Include variant maps on both normal-deck and card-pool deck responses when applicable.
- If implementation or generated Hono client typing shows a blocker, fall back to a separate `GET /api/deck/:id/card-variants` endpoint with the same map shape. That should be a fallback, not the default plan.

Mutations:

```txt
PUT /api/deck/:id/card-variants
DELETE /api/deck/:id/card-variants/:cardId
GET /api/deck-card-variant-defaults
PUT /api/deck-card-variant-defaults
DELETE /api/deck-card-variant-defaults/:cardId
```

Suggested request/response:

```ts
PUT /api/deck/:id/card-variants
{ cardId: string, variantId: string }
=> { data: { cardId, variantId } }

DELETE /api/deck/:id/card-variants/:cardId
=> { data: { cardId } }

GET /api/deck-card-variant-defaults
=> { data: Record<string, { variantId: string, showEverywhere: boolean }> }

PUT /api/deck-card-variant-defaults
{ cardId: string, variantId: string, showEverywhere: boolean }
=> { data: { cardId, variantId, showEverywhere } }

DELETE /api/deck-card-variant-defaults/:cardId
=> { data: { cardId } }
```

Alternative route shape:

- Put defaults under `/api/user/card-variant-defaults` if the app prefers user-owned resources there.
- Put all deck variant mutations under `/api/deck/:id/card-variants` to keep deck access checks local.
- A separate `GET /api/deck/:id/card-variants` read route is only needed if enriching `GET /api/deck/:id/card` turns out not to work cleanly.

Mutation rules:

- Deck override routes require logged-in owner of the deck, or admin if matching existing deck-card admin behavior.
- User default route requires logged-in user and always writes `user_id` from the session.
- All mutation routes validate `cardId + variantId` against the merged card list.
- Explicit save/update routes must upsert by rewriting existing rows with the submitted data:
  - `PUT /api/deck/:id/card-variants` should insert or update `deck_card_variant.variant_id`.
  - `PUT /api/deck-card-variant-defaults` should insert or update both `variant_id` and `show_everywhere`.
- Frontend mutation hooks should patch relevant React Query cache entries where possible instead of refetching the whole deck card list.

## Card Add / Update / Delete Behavior

Normal decks:

- In `server/routes/decks/_id/card/post.ts`, after the `deck_card` upsert succeeds, call `seedDeckCardVariantFromUserDefault()` for `data.cardId`.
- Do not seed defaults from `server/routes/decks/_id/card/put.ts` unless implementation confirms a real new-card path is used through that route. The current route is an upsert by board, so blind seeding there can be surprising.
- Automatic default seeding must not overwrite an existing `deck_card_variant` row. Use `onConflictDoNothing` only in the seeding helper, because an existing deck-specific override is more intentional than a default.
- This non-overwrite rule does not apply to explicit user actions in the variant dialog. `Save for this deck`, `Save as default`, and `Show everywhere` should rewrite existing rows with the newly submitted values.
- If a deck card is removed, only delete its deck-specific variant row after confirming there are zero remaining positive-quantity `deck_card` rows for the same `(deck_id, card_id)` across all boards. The delete and zero-quantity update routes are board-specific, while the variant override is shared by the card across the deck.
- Leaders and bases are updated in `server/routes/decks/_id/put.ts`, not deck-card routes. If users expect defaults to apply when selecting a leader/base, seed defaults there too when `leaderCardId1`, `leaderCardId2`, or `baseCardId` changes.

Card-pool decks:

- `GET /api/deck/:id/card` already transforms card-pool rows into `DeckCard[]`.
- Card-pool card moves use `server/routes/card-pools/_id/decks/_deckId/card/patch.ts`, which receives card-pool numbers, not card IDs.
- Phase 1 can still display deck-specific and `show_everywhere` variants for card-pool decks by resolving card IDs on read.
- Automatic default seeding for card-pool decks requires joining `card_pool_cards` in the patch route and should be a deliberate implementation decision. Add it if limited deck browsing is a target for this feature.

Deck duplication/deletion/import/export:

- Update `server/routes/decks/_id/duplicate/post.ts` to copy `deck_card_variant` rows from the source deck to the duplicated deck.
- Update `server/routes/decks/_id/delete.ts` to delete variant rows if cascade is not enough or if cascade is not generated as expected.
- Tournament blob import/export currently deals with `deck_card`. Do not include cosmetic variants unless there is a product reason to preserve presentation across tournament data blobs.
- SWUDB/Karabast exports should not include cosmetic variant choices.

Existing deck-image customization:

- Leave `DeckImageCustomization/DeckImageCardVariants` independent in phase 1. It controls generated deck images through `deckImage_cardVariants` user settings, while this feature controls live deck browsing through server-backed preferences.
- Revisit convergence later if users expect deck-image exports to automatically reuse live deck-browsing variants. Do not silently change existing deck-image behavior in this feature.

## Frontend Data Flow

Add API hooks:

```txt
frontend/src/api/decks/useSetDeckCardVariant.ts
frontend/src/api/decks/useClearDeckCardVariant.ts
frontend/src/api/decks/useGetDeckCardVariantDefaults.ts
frontend/src/api/decks/useSetDeckCardVariantDefault.ts
frontend/src/api/decks/useDeleteDeckCardVariantDefault.ts
```

Update the existing hook:

```txt
frontend/src/api/decks/useGetDeckCards.ts
```

Recommended response type:

```ts
export interface DeckCardResponse {
  data: DeckCard[];
  deckOverrides?: Record<string, string>;
  showEverywhereDefaults?: Record<string, string>;
  cardVariants?: Record<string, string>;
}
```

Query keys:

```ts
['deck-content', deckId]
['deck-card-variant-defaults']
```

Cache updates after mutations:

- Prefer `queryClient.setQueryData<DeckCardResponse>(['deck-content', deckId], updater)` over invalidating/refetching the whole deck-content query.
- This matches the existing local pattern in `usePostDeckCard.ts` and `usePutDeckCard.ts`.
- For `Save for this deck`, patch `deckOverrides[cardId] = variantId`, then recompute `cardVariants[cardId]` from deck override precedence.
- For `Clear overrides`, remove `deckOverrides[cardId]`, then set `cardVariants[cardId]` to `showEverywhereDefaults[cardId]` if present or remove it from `cardVariants`.
- For `Show everywhere`, patch the relevant user-defaults cache, patch `showEverywhereDefaults[cardId] = variantId` in any loaded deck-content cache for that owner/deck, and update `cardVariants[cardId]` only when there is no deck override for that card.
- For `Save as default` with `show_everywhere = false`, patch the user-defaults cache but do not patch the current deck-content display maps unless the dialog needs a local badge update.
- If the target `['deck-content', deckId]` cache is missing or the mutation response does not contain enough data to patch safely, fall back to invalidating that one query.
- Avoid invalidating `['deck', deckId]` for variant-only mutations. Leader/base display should rerender from the variant maps returned with deck content, not from refetching deck metadata.

Add `deckCardVariantMap` to layout data or pass it beside layout data:

- Read the variant map from the existing `useGetDeckCards(deckId)` response inside `useDeckData(deckId)`.
- Return it from `useDeckData()` so leaders, bases, visual layouts, text hover previews, and wording layout can share one resolved map.
- Keep the map optional and fall back to `selectDefaultVariant(card)` when a card ID is missing.

Recommended helper:

```ts
function getDisplayVariantId(card, cardVariantMap, cardId) {
  return cardVariantMap?.[cardId] ?? selectDefaultVariant(card)
}
```

Pin this query key shape across all hooks. Mutation cache patches and fallback invalidations should use exactly these keys so variant changes repaint the deck immediately without refetching unnecessarily.

## Frontend Rendering Touchpoints

Update these places to accept/use `cardVariantMap`:

- `DeckContents.tsx`: pass map into `DeckLeaderBase` and `DeckCards`.
- `DeckLeaderBase.tsx`: pass variant IDs into `LeaderSelector` and `BaseSelector` trigger images, or introduce non-selector display wrappers if editing selection and variant display become tangled.
- `LeaderSelector.tsx` and `BaseSelector.tsx`: add optional `displayVariantId` for the selected trigger/footer image. Keep the card-selection dialog itself on default variants unless there is a follow-up request to pick leader/base art there.
- `DeckLayout.tsx`: pass `cardVariantMap` into all layouts.
- `DeckLayoutVisualGrid.tsx`, `DeckLayoutVisualStacks.tsx`, `DeckCardVisualItem.tsx`: render `CardImage` with the resolved display variant.
- `DeckLayoutText.tsx`, `DeckCardTextRow.tsx`, `DeckCardHoverImage.tsx`: pass resolved display variant into hover image.
- `DeckLayoutWithWording.tsx`: use resolved display variants for leader/base and deck card thumbnails.
- `DeckCardActions.tsx`: when copying image URL, use the resolved display variant if available; this makes the action match the visible card art.

Exact prop paths to plan for:

- Text layouts: `DeckCards` -> `DeckLayout` -> `DeckLayoutText` -> `DeckCardTextRow` -> `DeckCardHoverImage` and `DeckCardDropdownMenu` -> `DeckCardActions`.
- Visual grid: `DeckCards` -> `DeckLayout` -> `DeckLayoutVisualGrid` -> `DeckCardVisualItem` -> `DeckCardDropdownMenu` -> `DeckCardActions`.
- Visual stacks: `DeckCards` -> `DeckLayout` -> `DeckLayoutVisualStacks` -> `DeckCardVisualItem` -> `DeckCardDropdownMenu` -> `DeckCardActions`.
- Wording layout: `DeckCards` -> `DeckLayout` -> `DeckLayoutWithWording` -> `DeckLayoutWithWordingRow`.
- Leader/base: `DeckContents` -> `DeckLeaderBase` -> selected `LeaderSelector` / `BaseSelector` trigger rendering, plus the new leader/base variant-change affordance if included.

Prefer passing a resolved `displayVariantId` into leaf components where possible. This keeps `DeckCardActions` and `DeckCardHoverImage` simple and avoids every leaf needing the full map.

Important: The card detail modal should continue to open by `cardId`. Variant selection is cosmetic to deck browsing, not a different card detail identity.

## Variant Change Dialog

Create:

```txt
frontend/src/components/app/decks/DeckContents/DeckCards/CardVariantChangeDialog.tsx
```

or place it under a `DeckCardVariants` subfolder if it grows.

Trigger:

- Add `Change card variant` to `DeckCardActions` when `editable` is true.
- Use a suitable icon such as `Images` or `Palette` from `lucide-react`.
- Keep it in the existing arrow dropdown flow.

Dialog content:

- Header: card name and current effective variant.
- Top action: `Clear overrides`.
- Variant grid: one button/card per `Object.keys(card.variants)`, sorted by existing `variants()` / `variantNameSorter` logic.
- For each variant, show `CardImage` and three actions:
  - `Save for this deck`
  - `Save as default`
  - `Show everywhere`
- Show badges for:
  - current deck override
  - current global fallback/default
  - currently displayed variant
- After save, close or keep open based on UX. Keeping open is useful when trying variants, but saving a deck override can close with a toast if that matches current dialog patterns.

Mutation semantics:

- `Save for this deck`: upsert `deck_card_variant`, updating `variant_id` when the row already exists.
- `Save as default`: upsert `deck_card_variant_user_default`, updating `variant_id` and setting `show_everywhere = false`; do not update `deck_card_variant` and do not alter current display unless a current deck override already points to that variant.
- `Show everywhere`: upsert default, updating `variant_id` and setting `show_everywhere = true`; current deck display updates only if no deck-specific override exists for that card.
- `Clear overrides`: delete `deck_card_variant` for this `deck_id + card_id`. The visible variant then falls back to `show_everywhere` default or normal default.
- `Delete default` is not part of the original three actions, but the API should support it so the dialog or a later settings page can remove stale defaults cleanly.

The existing deck-image variant selector is a useful visual reference, but this dialog needs different buttons and server mutations.

## Leader And Base Variant Changes

The user request mentions displaying variants for leaders and bases, but the dropdown menu exists on deck-card rows. Recommended options:

1. Phase 1 display support only:
   - leaders/bases use any stored override/default in the map
   - users can create leader/base overrides indirectly only if a future UI exposes the dialog there

2. Full phase 1 support:
   - add a small variant-change affordance near leader/base images when the deck is editable
   - reuse `CardVariantChangeDialog`
   - same mutation endpoints because leaders/bases are just `card_id` overrides for the deck

I recommend full phase 1 support because otherwise leader/base display is supported technically but hard to configure. Keep the control compact, icon-only with tooltip, and do not interfere with existing leader/base selection dialogs.

Suggested mount point:

- Wrap each selected leader/base image in `DeckLeaderBase` with a small absolute icon button in the top-right only when `editable` is true and a card is selected.
- The icon opens the same `CardVariantChangeDialog` with that card ID.
- The existing click target for changing the leader/base card should remain intact; if overlap becomes awkward, put the variant button just outside the image container.

## Implementation Order

1. Add shared types and Zod schemas for variant maps and mutations.
2. Add Drizzle schemas for `deck_card_variant` and `deck_card_variant_user_default`.
3. Generate and inspect the migration with `bun db-generate`; apply locally with `bun db-migrate` only when the local DB is configured.
4. Add server helpers for access checks, variant validation, map resolution, default seeding, copying, and cleanup.
5. Enrich `GET /api/deck/:id/card` with optional variant maps.
6. Add deck-specific override mutation routes.
7. Add user default list, upsert, and delete routes.
8. Wire default seeding into the normal deck card add flow, and into leader/base updates if included in phase 1.
9. Wire leader/base default seeding into deck update if leader/base defaults should apply immediately.
10. Copy/delete deck variant rows on deck duplication/deletion as needed.
11. Add frontend API hooks.
12. Fetch `cardVariantMap` in `useDeckData()` or adjacent deck hooks.
13. Pass the map through `DeckContents`, `DeckLeaderBase`, and all `DeckLayout` variants.
14. Update card image renderers to use resolved display variants.
15. Add `CardVariantChangeDialog`.
16. Add `Change card variant` to the deck card dropdown for editable decks.
17. Add leader/base variant-change affordance if included in phase 1.
18. Run automated checks and focused manual testing.

## Tests And Validation

Automated checks:

```txt
bun db-generate
cd frontend && bun run lint
cd frontend && bun run build
```

Add backend tests if the repo's current test setup is available:

- variant validation rejects a variant ID that does not belong to the card
- map resolution prefers deck override over `show_everywhere` default
- `show_everywhere = false` does not live-override existing decks
- default seeding inserts a deck override when adding a card
- default seeding does not overwrite an existing deck override
- explicit deck-variant save updates an existing deck override with the newly submitted variant
- explicit default save updates an existing user default with the newly submitted variant and `show_everywhere`
- deleting a board entry does not delete the cosmetic variant while the card still exists in another board
- `GET /api/deck/:id/card` still returns `data: DeckCard[]` for old consumers
- variant mutation hooks update cached variant maps without refetching the entire deck-content query when enough cached data is available
- swubase-owned decks return an empty map without variant-table queries where practical

Manual scenarios:

- Open a `swubase` deck and confirm no variant map is requested or the response is empty.
- Open your own normal deck and confirm no overrides use default card art.
- Save a variant for one deck and confirm only that deck shows it.
- Save a variant for one deck and confirm the UI updates immediately without a deck-content refetch when the cache was already loaded.
- Save a default with `show_everywhere = false`; add that card to a new deck and confirm it seeds the deck override.
- Save a default with `show_everywhere = false`; confirm existing decks without a deck override do not change.
- Save `show_everywhere = true`; confirm existing decks without a deck override display that variant.
- Set a deck override, then set a different `show_everywhere` default; confirm the deck override wins.
- Clear a deck override and confirm the display falls back correctly.
- Confirm visual grid, visual stacks, text hover image, wording layout thumbnails, leaders, and bases use the resolved variant.
- Confirm deck exports, JSON export, pricing, collection missing-card logic, and statistics still use card IDs and do not change because of variants.
- Duplicate a deck and confirm deck-specific cosmetic overrides are copied if that behavior is implemented.
- Delete a deck and confirm no orphaned `deck_card_variant` rows remain.

## Risks And Notes

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `show_everywhere` semantics are misunderstood | Defaults may affect too many decks | Keep the implementation rule explicit and add tests |
| Invalid variant IDs are saved | Broken images or skeletons | Validate against `getMergedCardList()` on every mutation and filter stale rows on read |
| The default `swubase` check uses the wrong user field | Performance optimization misses common decks | Confirm whether `user.name` or `user.displayName` is canonical before implementation |
| Variant map query becomes expensive | Popular deck pages slow down | Skip `swubase` decks, query only used card IDs, and return a compact map |
| Leaders/bases are forgotten | Deck presentation feels inconsistent | Include leader/base IDs in map resolution and rendering |
| Text layout hover still uses default variant | Users see inconsistent art | Pass resolved variant into `DeckCardHoverImage` |
| Deck duplication misses overrides | Copied deck loses presentation | Copy `deck_card_variant` rows during duplicate |
| Card-pool decks have different storage | Defaults may not seed there | Decide phase 1 behavior and document if seeding is normal-deck only |
| Existing deck-image overrides confuse users | Two variant systems appear to conflict | Keep deck-image settings independent for phase 1 and label this feature around live deck browsing |
| Cosmetic preference leaks into exports/statistics | Functional behavior changes accidentally | Keep variant map separate from deck cards and never change `cardId` |

## Acceptance Criteria

- Branch `feature/deck-card-variants` contains the planning docs.
- New DB tables persist deck-specific and user-default variant preferences.
- A deck variant map can be fetched for non-`swubase` decks and returns `{ cardId: variantId }`.
- The map is returned as optional fields on `GET /api/deck/:id/card`, keeping the existing `data` array unchanged.
- The variant-map response also identifies deck overrides and `show_everywhere` defaults separately.
- Deck-specific overrides take precedence over `show_everywhere` defaults.
- Non-`show_everywhere` defaults seed future card additions but do not alter existing deck display by themselves.
- Editable deck card dropdowns include `Change card variant`.
- The variant dialog supports saving for this deck, saving as default, showing everywhere, and clearing deck overrides.
- Deck cards, hover previews, wording layout thumbnails, leaders, and bases render the resolved variant image.
- Cosmetic variant choices do not affect quantities, boards, exports, pricing, collection ownership, legality, or stats.

## Claude Review Notes

Claude Code reviewed the initial plan and recommended tightening several implementation details:

- Only clean up a card's deck override after confirming the card has no remaining positive-quantity rows in any board, because `deck_card_variant` is per card while `deck_card` is per board.
- Do not assume `put.ts` is the right place for default seeding; the normal add path is `post.ts`, and `put.ts` should only seed if implementation confirms it creates a truly new card entry.
- Return deck overrides and `show_everywhere` defaults separately from the merged display map so the dialog can show accurate badges.
- Add user-default list and delete endpoints, not just upsert.
- Keep `deck_card_variant` indexes minimal; the primary key covers the normal read path.
- Specify timestamp patterns and include `bun db-migrate` as the local migration-apply step.
- Pin the React Query keys and list the full prop-threading path through the deck layouts.
- Explicitly state that the existing deck-image variant customization remains independent in phase 1.

After user review, the API plan was adjusted to return the variant maps from the existing `GET /api/deck/:id/card` response as optional top-level fields. This is backwards-compatible for existing consumers that only read `data`, and it keeps the deck cards plus cosmetic display map in one request. A separate read endpoint remains only as a fallback if implementation finds a concrete Hono typing or routing blocker.
