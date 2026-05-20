# Preview / Spoiler Cards Plan

## Goal

Add a way to temporarily expose spoiled cards before they land in the official SWU card database, mainly so users can build and export decks with upcoming cards while keeping SWUBase's client-first card-list caching model.

The feature should support:

- Admin-managed preview cards without requiring a deploy for every individual spoiler.
- A narrow DB table with the card data stored as JSON, not 20-30 property columns.
- An admin JSON textarea pre-filled with a valid card payload template.
- A preview-specific `karabast_id` in the JSON payload, because preview images may not reveal readable set/card numbers and Karabast may use its own temporary IDs.
- Card images stored in the existing Cloudflare R2 image bucket.
- Separate client/server versioning for official card data and dynamic preview cards.
- A clean migration path once the official database catches up.
- Clear UX around preview cards, especially for Karabast/export expectations.

The current codebase still has a hard `SwuSet` enum and `setInfo` map. A brand-new set likely needs one setup deploy before admins can safely expose preview cards from that set. Avoiding that one-time set deploy would require a larger refactor to make sets runtime-configurable.

## Current Findings

### Official Card Data Pipeline

- Official cards are fetched from the SWU admin API in `lib/swu-resources/raw-data-parser.ts`.
- Per-card files are merged by `lib/swu-resources/card-merger.ts`.
- The final generated file is `server/db/json/card-list.json`.
- `server/db/lists.ts` imports that JSON at server startup as `cardList` and builds derived lookup maps such as `cardsBySetAndNumber` and `cardsByUid`.
- `/api/cards` is implemented in `server/routes/cards.ts` and currently returns the full card list when the client's stored version is older than the server version.

### Frontend Card List Cache

- `frontend/src/api/lists/useCardList.ts` is the central frontend card-list hook.
- It reads `cardListCache` from IndexedDB via `frontend/src/dexie/cardList.ts`.
- It only calls `/api/cards` to check whether the cached version is stale.
- It enriches the raw card list with derived structures:
  - `cardIds`
  - `cardsByCardNo`
  - `cardsByCardType`
  - `allTraits`
  - `allKeywords`
  - `allVariants`
- React Query uses `staleTime: Infinity`, so the current model is intentionally client-first and reload-driven.

### Deckbuilder / Search Behavior

- Advanced card search lives in `frontend/src/components/app/cards/AdvancedCardSearch/searchService.ts`.
- Deck input command search also flows through `useCardList()` and `searchForCommandOptions()`.
- Filters already depend on the normal `CardDataWithVariants` shape: set, rarity, type, aspects, arenas, traits, keywords, cost, power, hp, text, and variants.
- Therefore preview cards should be transformed into the same `CardList` shape and merged before reaching existing consumers.

### Server Paths That Also Need Preview Awareness

Preview cards cannot be client-only because saved decks and exports touch server code:

- `server/routes/decks/_id/json/get.ts` uses `cardList` for public JSON exports, including the Karabast-facing endpoint.
- `server/lib/decks/deckExport.ts` converts internal card IDs to `SET_###` using the card's default variant.
- `server/lib/decks/updateDeckInformation.ts` computes leader/base aspect metadata from `cardList`.
- `server/lib/decks/generateDeckThumbnail.ts` fetches leader/base images from `cardList`.
- `server/lib/card-pools/validate-card-ids.ts` validates custom card pool card IDs against `cardList`.

If preview cards are merged only in the frontend, adding them to a deck would mostly save, because deck card IDs are plain strings, but server exports, thumbnails, metadata, and validation would miss them.

### Internal ID Detail

The repo's internal `cardId` is a slug generated from the card name, e.g. `ahsoka-tano--i-have-an-idea`, not `TS26_008`.

`SET_###` is the external export format produced by `server/lib/decks/deckExport.ts`.

Preview cards should use the same slug generation as official cards (`lib/swu-resources/lib/transformToId.ts`) whenever the title/subtitle are known. The set/card number should live on the preview card's Standard variant so exports can still produce `SET_###`.

### Set Handling Constraint

Many frontend paths assume `variant.set` exists in `setInfo`, for example `useCardList()` checks `setInfo[v.set].sortValue`. A preview card for a set that is not in `types/enums.ts` and `lib/swu-resources/set-info.ts` can crash those paths.

Practical phase-1 rule:

- Register each upcoming set once in `SwuSet` and `setInfo` before publishing preview cards for that set.
- Store set values inside the preview JSON payload, but only expose active preview rows whose payload set has a known `setInfo` entry.
- Treat fully dynamic preview sets as a future refactor, not part of the first implementation.

## Recommendation

Use a DB-backed preview card table with a JSON payload column, cache preview cards in memory on the server, return official and preview sections separately from `/api/cards`, and keep a server-side merged card-list provider for backend code.

This gives us the best of both worlds:

- Clients do not re-download the large official `card-list.json` when only preview cards changed.
- The frontend still gets one merged `CardListResponse` from `useCardList()`, so deckbuilder/search consumers stay mostly unchanged.
- Backend helpers can call `getMergedCardList()` when they need official + preview data for exports, thumbnails, metadata, or validation.
- The DB schema remains flexible because almost all card properties live in the JSON payload.

## Product Decisions

- Preview cards should be usable in collection/wantlist flows as long as the server has the in-memory merged card list. If implementation shows that a specific collection/wantlist path cannot cheaply use the merged list, filter preview cards out of that path for phase 1.
- One-time set registration via deploy is acceptable. Sets do not need to become runtime-configurable for this feature.
- Preview cards become public immediately when saved as `active`; no separate draft workflow is needed.
- The JSON textarea is the primary editing surface for phase 1 and beyond. Validate that the textarea contains valid JSON before sending it to the server, then validate the parsed payload with the server-side Zod schema.
- `card.preview === true` is enough for UI warnings and badges. `/api/cards` does not need a separate `previewCardIds` array.

## Data Model

Create a new schema file, probably `server/db/schema/preview_card.ts`.

Suggested table: `preview_card`

- `id`: uuid primary key
- `cardId`: text unique not null, derived from `payload.cardId` or `transformToId(payload.name)`; stored as a real column for fast dedupe/migration
- `status`: text or enum, `active | migrated | archived`
- `officialCardId`: text nullable, filled when the card has been matched to official data
- `payload`: jsonb not null, containing the full `CardDataWithVariants<CardListVariants>`-shaped preview card
- `createdAt`: timestamp
- `updatedAt`: timestamp

Everything card-specific stays inside `payload`: title, subtitle, name, type, rarity, cost, power, hp, text, rules, aspects, traits, keywords, set, card number, variant IDs, image paths, front/back orientation, and preview metadata.

The payload should also include preview-only integration metadata that does not exist in the official card list. The first required extension is `karabast_id`, stored separately from `cardId`, `cardNo`, and variant data. This lets SWUBase export or communicate the ID Karabast expects for preview cards even when the spoiled image is too low quality to read a reliable card number, or when Karabast deliberately uses different temporary IDs during preview season.

Add optional preview metadata to `lib/swu-resources/types.ts`:

- `CardDataWithVariants.preview?: boolean`
- `CardDataWithVariants.previewStatus?: 'active'`
- `CardDataWithVariants.karabast_id?: string`
- `CardVariant.preview?: boolean`

Keep `karabast_id` snake_case in the stored payload and in the TypeScript extension. This is an intentional convention break because it is preview integration metadata, not an official card-list field, and it matches the field admins need to reason about. Avoid also introducing `karabastId`; one canonical field is less error-prone.

Only active preview rows are returned to normal clients, so public card-list payloads should only ever contain `previewStatus: 'active'`. Migrated/archived status remains a row-level admin concept.

Validation is mandatory because the database will not enforce the nested card shape. Add a Zod schema for the preview payload, ideally derived from or kept close to `CardDataWithVariants<CardListVariants>`, and validate on every admin create/update/migrate operation before saving.

## Preview Payload Shape

The admin JSON should already be close to the final card-list shape. A phase-1 template can look like this:

```json
{
  "cardId": "",
  "cardUid": [],
  "updatedAt": "",
  "title": "",
  "subtitle": "",
  "name": "",
  "hp": null,
  "power": null,
  "upgradeHp": null,
  "upgradePower": null,
  "text": null,
  "rules": null,
  "deployBox": null,
  "epicAction": null,
  "front": {
    "horizontal": false
  },
  "back": null,
  "aspects": [],
  "type": "Unit",
  "cost": null,
  "traits": [],
  "keywords": [],
  "arenas": [],
  "rarity": "Common",
  "set": "law",
  "preview": true,
  "previewStatus": "active",
  "karabast_id": "",
  "variants": {
    "example-card-preview-standard": {
      "variantId": "example-card-preview-standard",
      "swuId": 0,
      "set": "law",
      "fullSetName": "A Lawless Time",
      "cardNo": 0,
      "baseSet": true,
      "hasNonfoil": true,
      "hasFoil": false,
      "variantName": "Standard",
      "artist": "",
      "preview": true,
      "image": {
        "front": "preview/example-card-front.webp",
        "back": null
      },
      "front": {
        "horizontal": false
      }
    }
  }
}
```

Admin save behavior:

- If `payload.cardId` is blank, derive it from `payload.name`.
- If `payload.updatedAt` is blank, set it server-side.
- Force or verify `preview: true` and `previewStatus` matches the row status.
- Preserve `karabast_id` as optional preview integration metadata. It may be blank, but when present it should be a string and should not be derived from `cardNo`.
- Validate that every active preview variant's `set` exists in `setInfo`.
- Validate `back: null` for non-transform cards, or `back: { type, horizontal }` when a back side exists.
- Validate variant IDs are stable and globally unique enough to avoid collisions with official variant IDs.
- Leave `cardUid` empty for preview cards unless a real official UID is known. `cardsByUid` should remain official-only; preview-aware code should resolve cards by SWUBase `cardId` or by `karabast_id` for Karabast export.

## Server Caching and Merge Strategy

Keep the official `cardList` from `server/db/lists.ts` as the static official source.

Add a provider, for example `server/lib/cards/cardListProvider.ts`, with:

- `getOfficialCardListVersion()`
- `getPreviewCardListVersion()`
- `getPreviewCardList()`
- `getMergedCardList()`
- `getCardFromMergedList(cardId)`
- `invalidatePreviewCardCache()`

Server cache shape:

- `officialCardList`: existing static module import
- `previewCardCache`: `{ version: string; cards: CardList } | null`
- `mergedCardListCache`: `{ version: string; cards: CardList } | null`

Behavior:

- On cold start, preview cache is empty.
- First preview or merged-card access loads active preview rows from DB, validates/transforms payloads, and stores them in memory.
- If a DB row fails current payload validation during cache load, skip that row from the public preview cache, log the error, and expose the validation problem in the admin list so it can be fixed. Do not let one bad preview payload break `/api/cards` for every user.
- Admin create/update/archive/migrate invalidates `previewCardCache` and `mergedCardListCache`.
- Official cards win on `cardId` collision.
- Migrated and archived preview rows are omitted from the active preview cache.
- `server/db/lists.ts` remains official-only for UID mapping and other places where preview cards should not participate.

This avoids a DB query on every card-list request or deck export while still making admin edits visible after cache invalidation.

## API Plan

Keep the same `/api/cards` endpoint, but change it from one version check to two independent version checks. Because the current route already uses `POST /api/cards`, keep that style unless there is a larger API cleanup.

Suggested request:

```json
{
  "officialLastUpdated": "2026-05-20T12:00:00.000Z",
  "previewLastUpdated": "2026-05-20T12:05:00.000Z"
}
```

Suggested response:

```json
{
  "official": {
    "needsUpdate": false,
    "lastUpdated": "2026-05-20T12:00:00.000Z"
  },
  "preview": {
    "needsUpdate": true,
    "lastUpdated": "2026-05-20T12:10:00.000Z",
    "cards": {}
  }
}
```

If both are stale, both sections include `cards`. If neither is stale, neither section includes `cards`. A new client sends no versions and receives both official and preview card lists.

Important distinction:

- The API returns official and preview cards separately.
- `useCardList()` merges them in memory before returning data to components.
- Server helpers use `getMergedCardList()` when backend code needs one map.

Current official behavior uses `cardListLastUpdated`, regenerated on every server restart. This is not a content hash; it already forces a client refresh after deploys/restarts. Preview version should use `MAX(updated_at)` from preview rows so admin-only preview changes do not force re-download of the official card list.

## Frontend Cache Plan

Update `frontend/src/dexie/cardList.ts` and `frontend/src/dexie/db.ts` so official and preview card lists have independent IndexedDB cache entries.

This can be either:

- one key-value store with separate keys: `official-card-list`, `official-card-list-version`, `preview-card-list`, `preview-card-list-version`
- or two explicit stores: `officialCardListCache` and `previewCardListCache`

The one-store keyed approach is probably enough and minimizes Dexie surface area, but the names should make the two versions impossible to mix up.

`useCardList()` should:

1. Read official cards/version and preview cards/version from IndexedDB.
2. POST both versions to `/api/cards`.
3. Update only the official cache if `response.official.needsUpdate`.
4. Update only the preview cache if `response.preview.needsUpdate`.
5. Merge official + preview cards in memory, with official cards winning on collision.
6. Build the existing derived data (`cardIds`, `cardsByCardNo`, `cardsByCardType`, `allTraits`, `allKeywords`, `allVariants`) from the merged card list.

This is a Dexie schema/version migration. It is acceptable to clear or ignore the old single `cardListCache` data and let clients re-download once after deploy.

## Admin UI Plan

Add a new admin tab:

- Update `frontend/src/routes/_authenticated.admin.tsx` to include `preview-cards`.
- Update `frontend/src/components/app/admin/AdminPage.tsx` with a `Preview Cards` tab.
- Create `frontend/src/components/app/admin/PreviewCardsPage`.

Admin page capabilities:

- Table of active, archived, and migrated preview cards.
- Status selector outside the JSON payload.
- Read-only or editable `cardId` field outside the JSON payload.
- Large JSON textarea pre-filled with the template above.
- Server-side Zod validation with readable field errors.
- Image upload controls for front/back images.
- Uploading an image stores it in R2 and injects the returned `preview/...webp` path into the JSON textarea.
- Preview using existing `CardImage`.
- Duplicate action that copies a row's JSON payload for quick entry.
- Migrate/archive actions.
- On save, invalidate React Query `['cardList']` so the admin immediately sees the merged result.

The JSON textarea should be the primary phase-1 editing surface. A later ergonomic improvement could add quick fields for title, set, type, rarity, aspects, cost, power, hp, and card number that write into the textarea, but the source of truth should remain the JSON payload.

Before any save request, the admin UI should parse the textarea locally and show a JSON syntax error if parsing fails. The server still remains authoritative and must re-run full Zod validation after receiving the parsed payload.

## Admin API Routes

Add routes under `server/routes/admin/preview-cards`, following the repo's nested route convention.

Suggested endpoints:

- `GET /api/admin/preview-cards` list preview rows
- `POST /api/admin/preview-cards` create
- `PATCH /api/admin/preview-cards/:id` update status/cardId/payload
- `DELETE /api/admin/preview-cards/:id` archive, not hard delete
- `POST /api/admin/preview-cards/:id/image` upload front/back image to R2 and return the relative image path
- `POST /api/admin/preview-cards/:id/migrate` map to an official card ID and optionally rewrite saved references

Suggested file layout:

- `server/routes/admin/preview-cards/get.ts`
- `server/routes/admin/preview-cards/post.ts`
- `server/routes/admin/preview-cards/_id/patch.ts`
- `server/routes/admin/preview-cards/_id/delete.ts`
- `server/routes/admin/preview-cards/_id/image/post.ts`
- `server/routes/admin/preview-cards/_id/migrate/post.ts`

All admin routes should check server-side admin permission, preferably through `server/auth/requireAdmin.ts`.

Every successful mutation should call `invalidatePreviewCardCache()` after the DB transaction commits.

## R2 Image Upload Plan

Reuse the existing R2 pattern from `server/routes/teams/_id/logo/post.ts` and the image bucket used by `lib/swu-resources/upload-images.ts`.

Implementation details:

- Accept `multipart/form-data`.
- Allow PNG, JPEG, and WebP input.
- Convert to WebP with `sharp` for consistency.
- Store under `cards/preview/`.
- Return only the relative value, for example `preview/law-042-example-card-front.webp`.
- Existing frontend code builds URLs with `https://images.swubase.com/cards/${imageName}`, so `preview/...` works without changing `CardImage`.

## Frontend Behavior

Since preview cards are merged inside `useCardList()`, most screens should work automatically.

Add small UI indicators rather than a parallel experience:

- Badge/tint on preview cards in card search results.
- Badge/tint in deck card layouts.
- Badge in card detail.
- Deck warning when a deck contains preview cards.
- Export warning if any preview card lacks a known set/card number.

Potential components/files:

- `frontend/src/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/*`
- `frontend/src/components/app/decks/DeckContents/DeckCards/*`
- `frontend/src/components/app/cards/CardDetail/CardDetail.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckActionsMenu/components/ExportOptionsMenu.tsx`

Collection and pricing screens will also see preview cards because they use `useCardList()`. The phase-1 policy is:

- With the server-side merged card list in place, allow preview cards to flow through collection/wantlist screens and badge them.
- If a specific collection/wantlist path cannot cheaply consume the merged list or needs too many guardrails around preview cards, filter preview cards out of that path for phase 1 and revisit later.
- Price lookups should tolerate missing preview-card prices.

## Deck Export / Karabast

Preview cards can only export cleanly when they have a set and card number in their Standard variant.

Existing export behavior already converts a card's default variant into `SET_###`, so preview payloads should include a Standard variant with:

- `set`
- `cardNo`
- `variantName: 'Standard'`
- `baseSet: true`

Then JSON export can produce the same shape as official cards.

Preview payloads should also include `karabast_id`. For the Karabast-compatible JSON export, preview cards should substitute `karabast_id` into the exported card entry's `id` field when present. If `karabast_id` is blank, fall back to the normal `SET_###` export derived from the Standard variant, then warn if neither is reliable. Do not use `karabast_id` as the internal SWUBase `cardId`; it is only external integration metadata.

Important caveat:

- Karabast can only play preview cards if Karabast also knows those cards.
- If Karabast has not added the preview card data, SWUBase cannot make the card playable just by exporting it.

UX:

- Warn users when a deck contains preview cards.
- If preview cards have `karabast_id`, say Karabast export will use those preview IDs.
- If all preview cards have set/card numbers but no `karabast_id`, say the export will include their provisional `SET_###` IDs.
- If some preview cards lack both `karabast_id` and card numbers, warn that those cards may not import/play correctly.

Server-side public JSON export at `/api/decks/:id/json` should use `getMergedCardList()` so Karabast receives the same IDs as the frontend export.

## Migration Once Official Cards Arrive

Preferred path:

1. Preview card uses the same `cardId` slug the official parser will generate.
2. Official `card-list.json` arrives.
3. Merge policy lets the official card win.
4. Admin marks preview row as migrated or a reconciliation script marks it automatically.
5. No saved deck rewrite is needed because the internal card ID stayed the same.

Fallback path when the preview ID differs:

1. Admin uses `Migrate` and selects/pastes the official `cardId`.
2. Server transaction rewrites references:
   - `deck.leaderCardId1`
   - `deck.leaderCardId2`
   - `deck.baseCardId`
   - `deck_card.cardId`
   - `card_pool_cards.cardId`
   - `collection_card.cardId` for any collection/wantlist paths that allow preview cards
3. Mark preview row as `migrated`.
4. Invalidate preview and merged card-list caches so clients refresh preview data.

Add an optional reconciliation script after `lib/swu-resources/card-merger.ts`:

- Match active previews by `cardId`.
- If no `cardId` match, match by Standard variant `set + cardNo`.
- Mark exact matches as migrated.
- Print mismatches that need manual review.

## Phased Implementation

### Phase 1: Data, Caches, and API

- Register the upcoming set in `SwuSet` and `setInfo` if it is not already present.
- Add `preview_card` schema with `payload jsonb`.
- Add the preview payload Zod validator.
- Add cached preview and merged card-list provider.
- Update `/api/cards` to accept two versions and return separate official/preview sections.
- Update Dexie card-list cache shape and migration.
- Update `useCardList()` to cache sections independently and return a merged card list.
- Add tests for payload validation, merge precedence, cache invalidation, and split-version responses.
- Update the Karabast-facing `/api/decks/:id/json` export and shared `createDeckJsonExport()` path to use the merged card list and substitute `karabast_id` for preview cards when present.
- Update `updateDeckInformation` and `generateDeckThumbnail` to use merged card data so preview leaders/bases work as soon as preview cards are usable.
- Update `server/lib/card-pools/validate-card-ids.ts` to use the merged card list if custom card pools should accept preview cards.
- Audit collection/wantlist card-input and pricing paths, then either let preview cards flow through with badges or filter them out of the specific paths that cannot cheaply handle preview data.

Deliverable: active preview rows can appear in the normal card list without forcing users to re-download official cards on every preview update.

### Phase 2: Admin Management

- Add admin API routes with `requireAdmin`.
- Add R2 image upload endpoint.
- Add `Preview Cards` admin tab.
- Add JSON textarea with predefined payload template.
- Add client-side JSON parse validation before submitting the textarea.
- Inject uploaded image paths into the JSON textarea.
- Invalidate `['cardList']` after create/update/archive/migrate.

Deliverable: admins can create and correct preview cards without deploys, using JSON as the source of truth.

### Phase 3: Deckbuilder UX and Exports

- Add preview badges in card search, card detail, and deck views.
- Add deck-level preview warning.
- Update frontend export menu warning behavior.

Deliverable: users can build decks with preview cards and understand export limitations.

### Phase 4: Migration Tooling

- Add admin migrate action.
- Add server transaction for ID rewrite when needed.
- Add optional reconciliation script after official card-list generation.
- Add cleanup/archive policy for migrated previews.

Deliverable: preview cards disappear cleanly once official data exists.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Preview payload JSON is invalid | Card list can fail to merge or UI can crash | Zod-validate on every admin save and reject bad payloads |
| Payload schema drifts from `CardDataWithVariants` | Old preview rows become stale | Keep validator near card-list types and revalidate rows after type changes |
| Existing preview row becomes invalid after a schema change | One bad row could break card-list loading | Skip invalid rows from public cache, log them, and show validation errors in admin |
| Admin JSON editing is error-prone | Slower data entry or accidental bad payloads | Pre-filled template, image-path injection, readable validation errors, optional quick-field helpers later |
| Preview-only fields differ from the final printed card | Filters/decks may be temporarily wrong | Admin edit flow; clear preview badge |
| Internal preview `cardId` does not match official `cardId` | Saved decks need migration | Derive with `transformToId(name)` and provide migrate action |
| Preview card has no card number | JSON export cannot produce reliable `SET_###` | Allow saving but warn in deck/export UI |
| Preview card uses a Karabast-specific temporary ID | Normal SWUBase export IDs may not match Karabast | Store `karabast_id` in payload and prefer it for Karabast preview exports |
| Preview set is not in `SwuSet` / `setInfo` | `useCardList()` and set filters can crash | Require one-time set registration or hide unknown-set preview rows |
| Split official/preview cache has bugs | Users see stale or missing cards | Keep response shape explicit and test both stale/current combinations |
| Preview cards in collections/wantlists need extra guardrails | Collection workflows may break on preview-only data | Use the merged card list where cheap; otherwise filter preview cards out of that specific path for phase 1 |
| Server helpers keep using official-only `cardList` | Export/thumbnail/metadata mismatch | Introduce `getMergedCardList()` and update the known server consumers |
| R2 image path collides with official images | Broken or overwritten images | Store under `cards/preview/` |
| Karabast does not know the preview card | Export imports may fail or cards may be unplayable | Warn clearly; export `SET_###` only when known |

## Claude Review Notes

Claude Code reviewed the original plan and the updated JSON-payload approach. It agreed that preview cards should still be transformed into the normal `CardList` shape so existing search and deckbuilder behavior can carry most of the feature.

Claude also agreed with the split official/preview versioning approach: preview card changes are more frequent than official card-list changes, so `/api/cards` should return separate official and preview sections instead of using one combined `lastUpdated` value that forces official re-downloads.

The one correction from my repo pass remains important: internal SWUBase card IDs are name slugs, not `SET_###`; `SET_###` is export-only. This plan uses slug-compatible preview IDs plus Standard variant set/card-number data to keep both internal storage and external export aligned.
