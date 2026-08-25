---
name: swubase-card-catalog
description: Change SWUBASE card, variant, or set identity; backend official-versus-preview card access; frontend card-list loading, indexes, caching, or version behavior.
---

# SWUBASE card catalog

Use this skill when work chooses or changes a card source, card/set/variant
identity, resolution, derived indexes, merge behavior, or card-list
cache/version protocol. Incidental rendering through an established domain API
does not need this skill. Adding/updating official upstream cards is the
separate `swubase-official-card-import` workflow.

The official catalog is the tracked static file
`server/db/json/card-list.json`; it is not a PostgreSQL card table. Shared card
shapes live in `lib/swu-resources/types.ts`, playable set identities in
`types/enums.ts`, and set/rotation metadata in
`lib/swu-resources/set-info.ts`.

## Choose the correct runtime boundary

| Consumer | Canonical access | Important behavior |
| --- | --- | --- |
| Backend, intentionally official-only | `server/db/lists.ts` | Synchronous catalog plus official-only UID and set/number indexes |
| Backend, previews/spoilers allowed | `server/lib/cards/cardListProvider.ts` | Await the merged list; active previews load from PostgreSQL and official cards win collisions |
| Frontend | `frontend/src/api/lists/useCardList.ts` | Loads separate official/preview Dexie sections, merges them, and builds frontend indexes |

Do not import the large server JSON into frontend code. Do not copy the current
backend import of a frontend index type; move a genuinely shared pure type to an
appropriate shared module if that boundary is touched.

The backend and frontend set/number indexes are deliberately different.
`server/db/lists.ts` is official-only and accepts a narrow base-variant set.
`useCardList()` includes previews, ignores Token card types in its number index,
supports Prestige variants, and has newer-set rules. Deck import code may build
another index from a caller-supplied list. Reuse the index belonging to the
consumer instead of assuming the maps are interchangeable.

## Preserve identity and cache invariants

- A `cardId` identifies the logical card and is persisted across decks, card
  pools, collections, tournament-derived data, routes, and integrations. A
  `variantId` identifies a printing and is persisted primarily in collections,
  prices/default-variant rows, and user/browser image overrides. Neither has a
  card-table foreign key; changing either requires a scoped reference audit and
  data migration.
- The top-level JSON key must equal `card.cardId`; each variant key must equal
  `variant.variantId`. `cardUid` is the upstream/Karabast lookup identity, not a
  substitute for either ID.
- Official cards must win preview `cardId` collisions via
  `{ ...previewCards, ...officialCards }`. A collision hides a preview but does
  not migrate saved preview references.
- `CardVariant.set` also contains auxiliary promo codes that need not have a
  `setInfo` row. Do not blindly index `setInfo[variant.set]`. Core `card.set`
  values must be known playable sets.
- `/api/cards` returns independently versioned official and preview sections.
  The official version is created at server start; the preview version comes
  from preview-row timestamps. Restart/redeploy after changing static data.
- Dexie keeps official and preview payload/version pairs independently.
  `['cardList']` has infinite stale time, so catalog/preview mutations must
  explicitly invalidate it or update the versioned storage protocol.
- Image fields are relative object names served from
  `https://images.swubase.com/cards/`; do not store credentials or private
  object URLs in card data.

Load `swubase-preview-cards` when previews or migration are involved,
`swubase-browser-storage` for the Dexie protocol,
`swubase-karabast-integration` for UID/mapping behavior, and the deck or
collection skill for those consumers. Load `swubase-backend-endpoints` for
`server/routes/cards.ts` and `swubase-frontend-api` for
`frontend/src/api/lists/useCardList.ts` changes.

## Validation

Validate changed catalog entries semantically: JSON parses; keys match IDs;
variants are nonempty; new generated cards have intentional UID arrays; IDs of
existing cards remain stable; set/card number/base/foil/image fields are
expected. Report existing legacy exceptions separately instead of normalizing
unrelated catalog data.

Run `bun test server/lib/cards/previewCardPayload.test.ts` when preview/merge
behavior changes and
`bun test server/lib/game-results/resolveKarabastCardId.test.ts` when UID
resolution changes, plus `bun run --cwd frontend build`. Smoke both an
official-only backend path and a merged backend path. For `/api/cards`, empty
versions should return both payloads and current versions should omit unchanged
payloads; verify cached offline frontend loading as well.
