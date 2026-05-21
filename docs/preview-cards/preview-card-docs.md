# Preview Cards

Preview cards are temporary, admin-managed SWU cards for spoiler season. They let users search, deckbuild, save decks, and export decks with cards that are not in the official generated card list yet.

The key rule is:

- Official cards stay in the generated `server/db/json/card-list.json`.
- Preview cards live in the database as JSON payloads.
- Runtime consumers usually see one merged card list: active preview cards plus official cards, with official cards winning on `cardId` collisions.

## Data Model

Preview rows are stored in the `preview_card` table, defined in `server/db/schema/preview_card.ts` and created by `drizzle/0053_long_squadron_supreme.sql`.

Columns:

- `id`: UUID primary key.
- `card_id`: internal SWUBase card slug, unique and indexed.
- `status`: `active`, `migrated`, or `archived`; defaults to `active`.
- `official_card_id`: filled when a preview row is migrated to an official card.
- `payload`: JSONB card payload.
- `created_at` / `updated_at`: timestamps; `updated_at` is indexed and drives preview cache versioning.

The JSON payload is shaped like `CardDataWithVariants<CardListVariants>`, with preview extensions:

- `preview: true`
- `previewStatus: "active"`
- `karabast_id?: string`
- variants may also contain `preview: true`

`cardId` is the internal SWUBase slug, usually derived with `transformToId(payload.name)`. It is not `SET_###`. Set/card-number data belongs on the default/Standard variant, and `karabast_id` is external preview metadata used for Karabast exports when Karabast has its own temporary ID.

Preview payload validation lives in `server/lib/cards/previewCardPayload.ts`. It requires a usable `cardId` or `name`, at least one variant, known `SwuSet` values from `setInfo`, matching variant keys/`variantId`s, and the normal card-list fields that the UI expects. `cardNo: 0` is allowed for early spoilers where the printed number is unreadable.

Because sets are still compile-time data, a brand-new set must be added to `types/enums.ts` and `lib/swu-resources/set-info.ts` before admins can publish preview cards from that set.

## Backend Flow

`server/lib/cards/cardListProvider.ts` is the central runtime provider.

It exposes:

- `getOfficialCardList()` and `getOfficialCardListVersion()`
- `getPreviewCardList()` and `getPreviewCardListVersion()`
- `getMergedCardList()`
- `getCardFromMergedList(cardId)`
- `invalidatePreviewCardCache()`

The official list is the existing static import from `server/db/lists.ts`. The preview list is loaded from `preview_card` on first access, cached in memory, and invalidated after admin create/update/archive/migrate actions. Only `active` rows are exposed publicly. Invalid active rows are skipped during public cache loading, logged, and surfaced in the admin table as validation errors.

Merge precedence is intentional:

```ts
{ ...previewCards, ...officialCards }
```

This means official data replaces preview data as soon as the official card list contains the same `cardId`.

The official card-list version is generated on server startup. The preview version comes from the newest `updated_at` among preview rows, or `1970-01-01T00:00:00.000Z` when there are no rows.

## `/api/cards`

The public card-list endpoint returns official and preview sections separately:

```json
{
  "officialLastUpdated": "...",
  "previewLastUpdated": "..."
}
```

Response:

```json
{
  "official": {
    "needsUpdate": false,
    "lastUpdated": "..."
  },
  "preview": {
    "needsUpdate": true,
    "lastUpdated": "...",
    "cards": {}
  }
}
```

Each section includes `cards` only when that section is stale. The legacy `lastUpdated` request field still maps to the official version for older clients.

## Backend Consumers

Preview cards are not only frontend data. Server paths that need card metadata use the merged provider:

- `/api/decks/:id/json` loads `getMergedCardList()` before building public JSON exports.
- `server/lib/decks/deckExport.ts` formats preview cards with `karabast_id` first, then `SET_###`, then the internal `cardId` fallback.
- `server/lib/decks/updateDeckInformation.ts` uses merged cards for preview leaders and bases.
- `server/lib/decks/generateDeckThumbnail.ts` uses merged cards for leader/base images.
- `server/routes/card-pools/_id/cards/put.ts` validates custom card-pool card IDs against the merged list.
- `server/routes/collection/_id/import/post.ts` validates imported collection `cardId`/`variantId` pairs against the merged list.

`server/db/lists.ts` remains official-only. Use the provider when preview cards should participate.

## Admin API and UI

Admin routes live under `server/routes/admin/preview-cards` and all require `requireAdmin`.

Endpoints:

- `GET /api/admin/preview-cards`: list all rows and return the JSON template.
- `POST /api/admin/preview-cards`: create a row.
- `PATCH /api/admin/preview-cards/:id`: update `cardId`, `status`, `officialCardId`, or payload.
- `DELETE /api/admin/preview-cards/:id`: archive the row by setting `status = "archived"`.
- `POST /api/admin/preview-cards/:id/image`: upload an image to R2.
- `POST /api/admin/preview-cards/:id/migrate`: migrate saved references to an official card.

The admin page is the `Preview Cards` tab in `frontend/src/components/app/admin/PreviewCardsPage.tsx`.

The editing surface is a JSON textarea prefilled from `createPreviewCardPayloadTemplate()`. The frontend parses JSON before sending it, then the server performs full Zod validation. The page also has row selection, duplicate, status, `cardId`, `officialCardId`, archive, migrate, image upload, and `CardImage` preview controls.

Image upload accepts PNG/JPEG/WebP, converts to WebP, stores under `cards/preview/...` in R2, and returns the relative `preview/...webp` path plus orientation. The UI injects that path into the textarea, but the preview row is not updated until the admin saves the JSON.

Successful preview mutations invalidate the admin query and the `['cardList']` React Query cache. Migration also invalidates deck, card-pool, and collection query families because saved references may have been rewritten.

## Frontend Flow

Frontend card-list caching is split in `frontend/src/dexie/cardList.ts`:

- `official-card-list`
- `official-card-list-version`
- `preview-card-list`
- `preview-card-list-version`

`frontend/src/api/lists/useCardList.ts` reads both caches, POSTs both versions to `/api/cards`, updates only stale sections, merges preview and official cards in memory, and rebuilds the existing derived data:

- `cardIds`
- `cardsByCardNo`
- `cardsByCardType`
- `allTraits`
- `allKeywords`
- `allVariants`

`allTraits`, `allKeywords`, and `allVariants` remain `Set<string>` values for fast lookup.

Most screens automatically see preview cards because they already consume `useCardList()`. Preview badges are currently shown in advanced search results, card detail, deck input results, and deck card layouts. Deck and export areas also show warnings when preview cards are present.

Collections and card pools consume preview cards where they already use the merged card list. There is no separate preview-card collection UI; preview-card pricing should be expected to be missing until official pricing data exists.

## Exports and Karabast

Deck JSON export uses this ID priority:

1. For preview cards, `karabast_id` when present.
2. The default variant's `SET_###` value when `cardNo > 0`.
3. The internal SWUBase `cardId` as a last fallback.

Text export uses card names from the merged card list.

Frontend export menus and deck pages use `frontend/src/lib/cards/previewCardWarnings.ts` to warn when a deck contains preview cards, when Karabast IDs will be used, when provisional set/card numbers are used, or when a preview card has no reliable export ID.

Karabast still needs to know the preview card on its side. `karabast_id` only helps SWUBase export the ID Karabast expects.

## Migration to Official Cards

When official data arrives, the preferred path is that the official `cardId` matches the preview `cardId`. In that case, official data wins automatically in the merged list, and migration mainly marks the preview row as `migrated`.

When the IDs differ, admins use the migrate action with the official `cardId`. `server/lib/cards/previewCardMigration.ts` performs the migration transaction:

- rewrites `deck.leaderCardId1`, `deck.leaderCardId2`, and `deck.baseCardId`
- merges `deck_card` rows by deck/card/board
- updates `card_pool_cards.cardId`
- rewrites comma-separated `card_pools.leaders`
- migrates `collection_card.cardId` and maps preview variant IDs to official variant IDs
- marks the preview row as `migrated` and stores `officialCardId`

Variant mapping prefers matching `variantName`. If no match is found, the variant is mapped to the official default variant when one exists. That fallback applies to all unmatched preview variants, not only the preview default variant; the original preview variant ID is kept only when there is no official default variant.

After the transaction, affected deck information is refreshed best-effort with `updateDeckInformation()`. A failure there is logged but does not roll back the reference migration.

The same file also contains a reconciliation runner. Without `--apply`, it reports active preview rows that match official cards by `cardId` or default variant `set + cardNo`; with `--apply`, it migrates matched rows.

## Operating Checklist

1. Add the upcoming set to `SwuSet` and `setInfo` before publishing previews for it.
2. Open Admin -> Preview Cards and start from the generated JSON template.
3. Fill the card payload, including `karabast_id` when Karabast uses a temporary preview ID.
4. Upload images if needed, then save the JSON after the returned paths are injected.
5. Verify the card appears in search/deckbuilder and that deck export warnings make sense.
6. When official data lands, migrate the preview row to the official card.
7. Check the admin table for validation errors after card-list type or set metadata changes.
