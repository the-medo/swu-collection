---
name: swubase-preview-cards
description: Change SWUBASE admin-managed preview cards, merged card-list caches, preview exports/images, Karabast mappings, or migration to official cards.
---

# SWUBASE preview cards

Use this skill for the `preview_card` model/admin UI, card-list provider,
official/preview cache protocol, exports, preview images, or saved-reference
migration. Before acting, read `docs/preview-cards/preview-card-docs.md`
completely; it is the detailed source of truth.

Preserve these invariants:

- Official cards remain in generated static card data. Preview rows live in
  PostgreSQL and only `active` rows enter the public preview list.
- Runtime consumers that should understand spoilers use
  `server/lib/cards/cardListProvider.ts`; do not import the official-only list
  directly for those paths.
- Merge as `{ ...previewCards, ...officialCards }` so official data wins a
  `cardId` collision.
- Mutations validate the complete payload and invalidate the in-memory preview
  cache. Frontend mutations invalidate both admin data and the `cardList` Query
  family; migrations also invalidate every saved-resource family rewritten.
- Dexie stores official and preview payloads/versions independently. Update only
  stale sections and merge in memory with the same precedence.
- `karabast_id` is outbound export metadata;
  `karabast_id_to_swubase_id` resolves inbound game-result IDs. Do not swap them.
- Migration to official cards is transactional across decks, deck cards, card
  pools, and collections. Preserve variant-name matching and official-default
  fallback, then refresh derived deck information best-effort after commit.
- A brand-new set must exist in `types/enums.ts` and
  `lib/swu-resources/set-info.ts` before preview payloads can use it.

Load `swubase-browser-storage` for cache schema/protocol work,
`swubase-card-catalog` for shared card identity and runtime-list behavior,
`swubase-karabast-integration` for mapping changes, and
`swubase-database-migrations` for persistence changes.

## Validation

Run `bun test server/lib/cards/previewCardPayload.test.ts` and the Karabast
resolver tests when mappings change, plus the frontend build. Manually verify
admin validation, cache refresh, search/deckbuilding, export warnings, and a
representative migration on an isolated database.

Run reconciliation in report-only mode first:

```bash
bun server/lib/cards/previewCardMigration.ts
```

`--apply` is explicitly mutating and belongs only on the intended isolated or
disposable database after the report is reviewed.
