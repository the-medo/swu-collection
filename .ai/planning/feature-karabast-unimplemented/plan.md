# Karabast Unimplemented Cards - Implementation Plan

## Goal

Expose Karabast's unimplemented-card list in SWUBase so deckbuilder/deck viewer users can see which cards will not work in Karabast before they export or play a deck.

The feature should:

- periodically fetch `https://api.karabast.net/api/get-unimplemented`
- store the latest raw rows and their best SWUBase `cardId` match
- expose a transient `Record<cardId, true>` from the card-list API
- add an optional `karabast_unimplemented` flag to cards in `useCardList`
- show warnings in text/image deck list layouts, leader/base selectors, and separate deck-card vs leader/base summary alerts
- avoid any IndexedDB schema change and avoid persisting this transient flag in the cached official/preview card lists

## Repo Findings

- The public card-list endpoint is currently `POST /api/cards`, implemented in `server/routes/cards.ts`. It returns separate `official` and `preview` sections, not a flat `GET /cards` payload.
- `frontend/src/api/lists/useCardList.ts` loads official and preview card-list sections from IndexedDB, calls `api.cards.$post`, stores only stale official/preview sections, merges them in memory, and has the TODO where this flag should be applied.
- `server/lib/cards/cardListProvider.ts` already owns official/preview card-list cache/version logic. This is the right place to add the unimplemented-card cache helper or to colocate it with a new `karabastUnimplementedCardsProvider`.
- Official cards are indexed by UID and set/number in `server/db/lists.ts`, but those indexes are official-only. The cron should use `getMergedCardList()` when preview cards should be matchable too.
- Preview card Karabast mapping already exists for game-result imports in `server/lib/game-results/resolveKarabastCardId.ts`. This feature needs a new resolver because its desired priority is `setId`/`number`, then external ID, then transformed title, but it should still reuse `buildKarabastPreviewIdMap()` for preview inbound IDs.
- DB schema files live under `server/db/schema/*`, migrations are generated into `drizzle/` with snapshots in `drizzle/meta/`, and `docs/migrations.md` documents `bun db-generate` / `bun db-migrate`.
- `drizzle.config.ts` uses the schema glob `./server/db/schema/*`, so a new schema file is picked up automatically; no schema index export is needed.
- Existing crons live under `server/crons/*`, usually wrapping a library function and `SentryCron`.
- Deck display surfaces are mainly:
  - `frontend/src/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckCardTextRow.tsx`
  - `frontend/src/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutVisualGrid/DeckCardVisualItem.tsx`
  - `frontend/src/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutWithWording/DeckLayoutWithWording.tsx`
  - `frontend/src/components/app/decks/DeckContents/DeckContents.tsx`
  - `frontend/src/components/app/global/LeaderSelector/LeaderSelector.tsx`
  - `frontend/src/components/app/global/BaseSelector/BaseSelector.tsx`
- `CardImage` accepts children and renders them inside a relative container, so selector overlays can be implemented without changing the image component API.

## Data Contract

### Karabast response shape

Create a server-side Zod schema for the response rows:

```ts
{
  id: string;
  setId?: {
    set: string;
    number: number;
  };
  types?: string;
  titleAndSubtitle: string;
}
```

Allow defensive optionality for `setId` and `types` even though the example includes them, because this is an external endpoint.

### Database

Add schema file:

- `server/db/schema/karabast_unimplemented_card.ts`

Table:

- `title text primary key`
- `card_id text null`
- `data jsonb not null`, typed in Drizzle as `jsonb('data').$type<KarabastUnimplementedApiRow>()`

Consider indexes:

- `card_id` index for faster cache construction/filtering

Add the configuration seed row:

- key: `karabast_unimplemented_datetime`
- value: ISO UTC datetime string

Important implementation detail: if Drizzle can generate the table migration, add the configuration row either in that migration manually or as a separate custom seed migration. Use `ON CONFLICT (key) DO NOTHING`.

This configuration key is internal tracking for the cron. It does not need to be added to `getDefaultApplicationConfiguration()` because `server/routes/application-configuration/get.ts` intentionally hides DB keys that are not part of the public app configuration schema.

### API

Extend `POST /api/cards` response with a top-level field:

```ts
karabast_unimplemented: Record<string, true>
```

This should be returned on every card-list response, independent of whether `official.needsUpdate` or `preview.needsUpdate` is true. The client needs the latest transient state even when the long-lived card-list sections are unchanged.

Confirmed product decision: implement this on the existing `POST /api/cards` route. Do not add a `GET /cards` alias for this feature.

## Backend Plan

1. Add the DB schema and migration.
   - Add `karabastUnimplementedCard` schema with JSONB typed data.
   - Generate migration with `bun db-generate`.
   - Review generated SQL and snapshot.
   - Add or generate a custom seed for `application_configuration.key = 'karabast_unimplemented_datetime'`.

2. Add shared server types/helpers for Karabast unimplemented rows.
   - New file suggestion: `server/lib/karabast/unimplementedCards.ts`.
   - Define the Zod response schema.
   - Export `KarabastUnimplementedCardRow` and `KarabastUnimplementedMap = Record<string, true>`.

3. Implement mapping priority.
   - Build a set/number index from `getMergedCardList()` variants:
     - compare `row.setId.set` to `variant.set`
     - compare `row.setId.number` to `variant.cardNo`
     - return only the parent `card.cardId`
   - Build/consult external ID indexes:
     - official cards: match `row.id` against `card.cardUid`, or reuse `cardsByUid` where official-only matching is sufficient
     - preview cards: use `buildKarabastPreviewIdMap(await getPreviewCardList())` and match `row.id` against `karabast_id_to_swubase_id`
     - if a preview card also has `cardUid` values, the merged card UID index may consider those too, but do not rely on preview `cardUid` as the only preview path
   - Transform `row.titleAndSubtitle` with `transformToId`.
     - Only accept the transformed ID if it exists in the merged card list.
   - If no match exists, store `cardId: null`.

4. Add the in-memory cache.
   - Cache shape: `{ loadedAtMs: number; map: Record<string, true> }`.
   - TTL: 15 minutes.
   - Loader: select rows where `card_id IS NOT NULL`, reduce to `{ [cardId]: true }`.
   - Deduplicate naturally by object key.
   - Export:
     - `getKarabastUnimplementedMap()`
     - `invalidateKarabastUnimplementedCache()` or `setKarabastUnimplementedCacheFromRows(rows)`
   - Keep a single in-flight promise to avoid duplicate DB loads under concurrent `/api/cards` requests.

5. Extend `server/routes/cards.ts`.
   - Import `getKarabastUnimplementedMap`.
   - Include `karabast_unimplemented: await getKarabastUnimplementedMap()` in the existing `c.json(...)` return alongside `official` and `preview`; this updates the Hono RPC-inferred type consumed by `api.cards.$post()` in the frontend.
   - Handle cache load errors deliberately:
     - preferred: log and return `{}` so card-list loading still works
     - capture/report via existing Sentry error handling if appropriate

6. Implement the cron library function.
   - Fetch `https://api.karabast.net/api/get-unimplemented` with an explicit timeout, for example `AbortSignal.timeout(30_000)`.
   - Validate the response as an array.
   - Transform each row to `{ title, cardId, data }`.
   - Deduplicate rows by `titleAndSubtitle` before insert, or use `ON CONFLICT (title) DO UPDATE`, so duplicate API rows do not fail the whole refresh.
   - On successful fetch/validation, run one transaction:
     - delete all rows from `karabast_unimplemented_cards`
     - insert transformed rows, if any
     - upsert `application_configuration.karabast_unimplemented_datetime` to `new Date().toISOString()`
   - Refresh/invalidate the in-memory map after the transaction succeeds.
   - Do not clear the table if fetch or validation fails.

7. Add the cron script.
   - New file suggestion: `server/crons/fetch-karabast-unimplemented.ts`.
   - Follow existing cron style:
     - instantiate `SentryCron`
     - `started()`, `finished()`, `crashed(error)`
     - `process.exit(0/1)`
   - Add a slug to `server/crons/cron-sentry/sentry-init.ts`, for example:
     - key: `'fetch-karabast-unimplemented'`
     - slug: `'cron-fetch-karabast-unimplemented'`
   - No package script is strictly required if Coolify will run `bun server/crons/fetch-karabast-unimplemented.ts`, but adding one could improve discoverability.

## Frontend Plan

1. Extend card types.
   - Add optional `karabast_unimplemented?: true` to `CardDataWithVariants` in `lib/swu-resources/types.ts`.
   - Keep snake_case to match the API field and existing preview Karabast fields.

2. Apply the transient flag in `useCardList`.
   - Read `data.karabast_unimplemented ?? {}` from the API response.
   - Do not write it to `setOfficialCardListData` or `setPreviewCardListData`.
   - After merging official/preview cards, clone only flagged cards:

```ts
for (const cardId of Object.keys(karabastUnimplemented)) {
  const card = cardListData[cardId];
  if (card) cardListData[cardId] = { ...card, karabast_unimplemented: true };
}
```

   - If the API call fails and IndexedDB fallback is used, the flag map will be empty/stale-missing for that session. That is acceptable unless we decide to persist a separate transient cache, which the requirement currently rules out.

3. Consider frontend refetch behavior.
   - `useCardList` currently has `staleTime: Infinity`, which would leave already-open sessions with stale unimplemented status until a full reload.
   - Implement a periodic refresh for `['cardList']`, preferably `staleTime: 15 * 60 * 1000` plus `refetchInterval: 15 * 60 * 1000`.
   - This does not require a new IndexedDB schema and does not usually refetch the full card payload from the network: the client still posts official/preview versions, so unchanged sections return `needsUpdate: false` while the top-level `karabast_unimplemented` map refreshes.

4. Add a reusable UI warning indicator.
   - New component suggestion:
     - `frontend/src/components/app/decks/KarabastUnimplementedWarningIcon.tsx`
   - Use `CircleAlert` or `TriangleAlert` from `lucide-react`.
   - Use red/destructive styling and an accessible label/title like `Not implemented in Karabast`.
   - Optional tooltip via existing `Tooltip` components.

5. Text deck layout.
   - In `DeckCardTextRow`, render the small red warning icon just before/next to the card name when `card?.karabast_unimplemented`.
   - Ensure truncation still works by wrapping icon + text in a flex row with a shrinking text span.

6. Image deck layouts.
   - In `DeckCardVisualItem`, render the small warning icon in the existing top-right quantity/dropdown badge row next to `x{quantity}` when `card?.karabast_unimplemented`.
   - This covers visual grid and visual stacks because both use `DeckCardVisualItem`.
   - Ensure the warning still renders when both `displayDropdown` and `displayQuantity` are false. The current badge block is conditional on those props, so the icon may need its own small overlay or the wrapper condition must include `card?.karabast_unimplemented`.

7. Wording layout.
   - Leave `DeckLayoutWithWording` unchanged for this implementation.
   - Do not add unimplemented warning icons to wording rows.

8. Leader/Base selectors.
   - In `LeaderSelector` and `BaseSelector`, overlay the warning icon in the bottom-left corner of the `CardImage` for:
     - selected trigger card
     - cards in the selection dialog grid
     - footer selected preview card
   - Because `CardImage` renders children inside a relative container, pass the overlay icon as children.

9. Summary alerts.
   - In `useDeckData`, compute two separate summaries:
     - deck cards: unique unimplemented card IDs in board 1 and board 2 only
     - leader/base: unique unimplemented card IDs among `leaderCardId1`, `leaderCardId2`, and `baseCardId`
   - Exclude maybeboard (`board === 3`) from all summary alerts because maybeboard is not exported to or used in Karabast.
   - Count unique different cards, not quantities/copies.
   - Suggested return fields:

```ts
karabastUnimplementedDeckCardsSummary: {
  uniqueCardIds: string[];
};
karabastUnimplementedLeaderBaseSummary: {
  uniqueCardIds: string[];
};
```

   - In `DeckContents`, render one `Alert variant="destructive"` or `warning` for deck cards when `karabastUnimplementedDeckCardsSummary.uniqueCardIds.length > 0`.
   - Render a separate alert for leader/base when `karabastUnimplementedLeaderBaseSummary.uniqueCardIds.length > 0`.
   - If both summaries are non-empty, display both alerts.
   - The deck-card alert message must make clear it counts different cards, for example:
     - `3 different main deck/sideboard cards are not implemented in Karabast.`
   - The leader/base alert should be separate, for example:
     - `1 leader/base card is not implemented in Karabast.`

## Testing And Validation

Backend:

- Unit-test the mapping helper with:
  - set/number match wins over UID
  - UID match works when set/number is absent or not found
  - transformed title match only succeeds when the card exists
  - unmatched row stores `null`
  - duplicate matched IDs reduce to one `Record<cardId, true>` entry
- Unit-test the cache helper if it is pure enough to inject DB rows.
- Run targeted Bun tests:

```bash
bun test server/lib/karabast/unimplementedCards.test.ts
bun test server/lib/game-results/resolveKarabastCardId.test.ts
bun test server/lib/cards/previewCardPayload.test.ts
```

Frontend:

- Run TypeScript/build:

```bash
cd frontend
bun run build
```

- Manually verify:
  - card list loads when `official` and `preview` both return `needsUpdate: false`
  - flags appear without writing to IndexedDB
  - text layout icon placement
  - visual layout icon near quantity
  - wording layout remains unchanged
  - leader/base selector overlays
  - deck-card summary alert counts unique different cards from boards 1 and 2 only
  - leader/base summary alert is separate from the deck-card summary alert
  - maybeboard does not affect either summary alert

Operational:

- Run the cron locally against the real endpoint once, or with a mocked fetch fixture if avoiding live dependency.
- Confirm the table is not cleared on failed fetch/invalid response.
- Confirm duplicate `titleAndSubtitle` rows from the API do not fail the refresh.
- Confirm the external fetch times out and fails safely.
- Confirm `application_configuration.karabast_unimplemented_datetime` updates only after successful refresh.

## Rollout Steps

1. Implement backend schema, migration, provider/cache, API field, cron library, cron script.
2. Add backend mapping/cache tests.
3. Implement frontend type, `useCardList` transient flag application, warning icon component, text/image deck layouts, selectors, and the two summary alerts.
4. Run backend tests and frontend build.
5. Run the cron once in local/staging.
6. Configure Coolify to run the cron every 60 minutes.
7. Monitor logs/Sentry for fetch failures and mapping misses.

## Claude Code Validation

Validated with Claude Code `2.1.123` after the first draft. Its findings were incorporated into this plan, especially:

- preview inbound Karabast IDs should use `karabast_id_to_swubase_id` / `buildKarabastPreviewIdMap()`, not only `cardUid`
- duplicate `titleAndSubtitle` rows must not fail the cron refresh
- the external fetch needs an explicit timeout
- the Hono route response must include the new field so frontend RPC types update
- `useCardList` needs periodic refetch behavior because `staleTime: Infinity` would keep transient status stale in open sessions
- `DeckCardVisualItem` needs to render the warning even when quantity/dropdown chrome is hidden

## Product Decisions

- Extend `POST /api/cards`; the earlier `GET /cards` wording was shorthand and no GET alias is needed.
- Summary alerts count unique different cards, not quantities/copies.
- Use two separate alerts when needed:
  - one for unimplemented main deck/sideboard cards
  - one for unimplemented leader/base cards
- Exclude maybeboard from summary alerts.
- For transformed-title fallback, store `card_id = null` unless the transformed card ID exists in the merged card list.
- Keep unmatched rows in the database with `NULL` `card_id`; do not return them from `/api/cards` and do not build an admin/debug surface for them in this implementation.
- Leave wording layout unchanged.

## Known Risks

- External response shape may change. Zod validation and "do not clear DB on failure" protects users from losing the last known-good list.
- New SWU sets must exist in `SwuSet` / `setInfo` for set-number mapping and preview card handling to work cleanly.
- `titleAndSubtitle` to `transformToId` should match official IDs when Karabast formats title/subtitle exactly like SWUBase does, but any punctuation, spacing, or subtitle divergence can make this fallback miss. It should remain the last fallback.
- The backend cache can refresh every 15 minutes, and the frontend should refetch the card-list query on the same cadence; otherwise already-open sessions can still hide updates.
- If official and preview cards share a `cardId`, official cards win during merge; this matches existing app behavior.
