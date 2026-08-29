---
name: swubase-collections
description: Change SWUBASE collections, wantlists, other/card lists, card rows, ownership/public access, source/apply relationships, imports, pricing, or frontend synchronization.
---

# SWUBASE collections

Use this skill for all three collection-backed domains. Their stable numeric
`CollectionType` values in `types/enums.ts` are `COLLECTION = 1`,
`WANTLIST = 2`, and `OTHER = 3`; user-facing text calls OTHER a “Card list.”
Do not change those persisted/wire values.

Core contracts live in `types/Collection.ts`, `types/CollectionCard.ts`,
`types/ZCollection.ts`, and `types/ZCollectionCard.ts`. Persistence lives in
`server/db/schema/collection.ts`, `collection_card.ts`, and
`collection_source_collection.ts`; routes are composed by
`server/routes/collection.ts`; user collection listing also lives in
`server/routes/user.ts`. Frontend APIs are under
`frontend/src/api/collections/`, with user listing in
`frontend/src/api/user/useGetUserCollections.ts`; incremental user sync is under
`frontend/src/api/collection/` and `frontend/src/dexie/collections.ts`.

## Domain invariants

- Only a normal collection uses `forSale` and `forDecks`. Current creation UI
  forces them off for wantlists/card lists. Type is not editable; duplication
  is the supported type-changing flow.
- A card row's identity is the complete tuple `(collectionId, cardId,
  variantId, foil, condition, language)`. `amount`, `amount2`, `note`, and
  `price` are payload. Preserve `amount2` without inventing or collapsing its
  semantics.
- Authoritative reads must allow only public data or the owner, and writes must
  require ownership. Public-source duplication and applying a public card list
  are explicit exceptions whose destination must still be owned. Audit the
  actual route rather than assuming every legacy path enforces this policy.
- Every card-content mutation must advance `collection.updatedAt` through
  `server/lib/updateCollectionUpdatedAt.ts`, including defined empty/no-op
  behavior. The authenticated bulk sync compares IDs/timestamps and returns
  changed rows plus removed collection IDs; Dexie freshness depends on it.
- Relationship naming is counterintuitive. In
  `collection_source_collection`, `collectionId` is the target (normally an
  OTHER/card list) and `sourceCollectionId` is the source (normally a
  collection/wantlist); `displayOnSource` controls reverse visibility. The
  apply operation has its own direction: a public OTHER list supplies card
  quantities to an owned destination collection/wantlist.
- Imports resolve cards on the frontend and must be revalidated by the server.
  Decide deliberately whether a path supports active preview cards; current
  import and bulk paths do not use the same card-list boundary.
- Collection/card rows may be retained for opted-in contributors, but
  descriptions and card notes are free text and must always be scrubbed. Keep
  `scripts/remote-dev/sql/001-core-data.sql` aligned with any new personal
  fields.

TanStack detail, content, listing (including `['collections', userId]`), sync,
source, price, and deck-ownership caches are separate consumers. Infinite stale
times require a mutation to update/invalidate every affected cache and
persistent Dexie row, not merely the visible detail query.

## Existing hazards

- Several type rules are enforced only in UI. New server work must validate
  type-specific flags and source/apply policy rather than trust the client.
- Some legacy listing routes interpolate raw sort input. Enumerate and map
  allowed fields; never copy arbitrary input into `sql.raw`.
- Several multi-step delete, duplicate, apply, and card operations lack one
  encompassing transaction and have inconsistent invalidation.
- Canonical detail currently uses `/collections/$collectionId` for all types.
  The wantlist/card-list detail routes are placeholders and are not examples.
- Dexie and `['user-collections-sync']` are not user-scoped. Account switching
  needs an explicit persistent and Query-cache policy.
- Source lookup, price recomputation, and some single/bulk card routes have
  inconsistent access or card validation. Audit the server boundary before
  extending them.

Load `swubase-card-catalog` for card identity/list behavior,
`swubase-preview-cards` when previews are supported,
`swubase-browser-storage` for sync/Dexie changes, `swubase-decks` for missing
card/ownership calculations, and `swubase-development-data` for retention.

## Validation

Against an isolated database, cover all three types with anonymous, owner, and
non-owner public/private access; composite-key upsert/move/removal; positive and
negative bulk quantities; updated timestamps; changed/unchanged/removed sync;
duplicate/source/display/apply rules; and official plus preview import cases.
In the frontend, exercise creation, canonical navigation, edit/duplicate/delete,
public lists, card input/import, prices, source/apply, Dexie refresh/deletion,
offline failure, and account switching. Run the focused frontend build/lint and
`git diff --check`.
