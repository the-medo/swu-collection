---
name: swubase-decks
description: Change SWUBASE deck persistence, normal and card-pool contents, boards, visibility, imports/exports, derived information, pricing, thumbnails, or frontend caches.
---

# SWUBASE decks

Use this skill for deck behavior under `server/routes/deck.ts`,
`server/routes/decks/`, `server/routes/card-pools/_id/decks/`,
`server/lib/decks/`, `frontend/src/api/decks/`, or
`frontend/src/components/app/decks/`. Shared contracts include `types/Deck.ts`,
`types/ZDeck.ts`, `types/ZDeckCard.ts`, and `shared/types/visibility.ts`.

## Two persistence models

Normal decks have no `cardPoolId`. Their content is `deck_card`, keyed by
`(deckId, cardId, board)`, where board 1 is main, 2 is sideboard, and 3 is
maybeboard. PUT treats quantity zero as removal; POST can currently persist a
zero row, so new mutation work must enforce one consistent zero-quantity rule.

Limited/card-pool decks use `card_pool_decks`, `card_pool_deck_cards`, physical
`card_pool_number` identities, and `deck`/`pool`/`trash` locations. Shared reads
adapt those rows to `DeckCard[]`; current conversion maps `deck` to board 1 and
other locations to board 2. Edit them through card-pool routes. The normal
deckbuilder intentionally treats them as non-editable, and bulk loaders that
read only `deck_card` do not cover them.

## Preserve deck invariants

- Visibility values are `0/private`, `1/public`, and `2/unlisted`. Unlisted is
  direct-link visible but excluded from public discovery. Keep duplicated
  card-pool deck visibility synchronized.
- Card IDs are logical catalog IDs, not foreign keys. Import/export code must
  deliberately choose official-only or merged official-plus-preview data.
- `deck_information` is required by list/statistics inner joins. Recompute it
  after creation, duplication, leader/base changes, imports, and card-ID
  migration without resetting favorites, comments, or score.
- Content changes should bump `deck.updatedAt`; it affects ordering and price
  freshness. Keep derived prices/thumbnails and dependent tournament/team/game
  views consistent.
- Tournament-imported decks use the seeded system user ID `swubase` and become
  public. Do not copy GUID-only user validation into flows that must support
  that text system ID.
- Multi-table creation, duplication, import, and deletion should be
  transactional. Check restrictive, cascading, and set-null references across
  favorites, teams, tournaments, game results, resources, and card pools before
  removing a deck.
- Query families for detail, content, lists, favorites, teams, and tournaments
  are distinct. With infinite stale time, mutations must update/invalidate all
  affected views. Optimistic card mutations need a snapshot plus rollback or a
  guaranteed refetch on failure.
- Text/JSON exports intentionally omit maybeboard (board 3). Preserve or change
  that contract explicitly rather than accidentally dropping a board.

Current code has known gaps: ordinary card mutations do not consistently bump
`updatedAt`; `usePutDeckCard` has no optimistic rollback; deck deletion does
not invalidate every list; normal bulk loading misses card-pool decks; and the
two deletion paths clean dependencies differently. POST can also retain zero
quantity rows. Treat these as audit points, not conventions to copy.

Load `swubase-card-catalog` for card resolution, `swubase-preview-cards` for
preview import/export mappings, `swubase-collections` for ownership/missing-card
features, and `swubase-tournament-imports` for imported tournament decks.

## Validation

Use an isolated worktree database. Cover normal versus card-pool reads, boards
1/2/3, zero removal, owner/admin policy, private/public/unlisted detail and
listing, SWUDB/text parsing with unknown cards, duplication/deletion
dependencies, derived information, timestamps, and cache success/rollback.
Build and focused-lint the frontend. Do not use
`server/lib/decks/testDeckThumbnail.ts` as a unit test: it performs network and
R2 writes. Thumbnail generation requires deliberate development-only external
configuration.
