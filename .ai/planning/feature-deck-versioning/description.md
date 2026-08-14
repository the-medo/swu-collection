# Deck Versioning - Feature Description

## Summary

Deck versioning should turn one deck into a stable lineage with:

- one mutable current deck in `deck` + `deck_card`
- numbered versions stored as a delta chain
- exactly one latest, open version whose `deck_version_card` delta is empty
- sealed historical versions whose IDs reconstruct a saved deck state
- an ID for the current working state even when it contains unsaved experiments
- a history view showing changes between versions
- optional team collaboration on team-linked decks
- Karabast records containing both the parent deck ID and the best matching version ID

The important distinction is that the latest version is an **open head**, not an immutable snapshot. Its ID represents the current mutable deck until the user saves that version. When saved, the open head is sealed with the current diff and a new empty head is created.

Users are expected to save the versions they care about. Games played with small unsaved changes may point to the open head, whose final contents are established when that head is eventually saved. Per-card game metrics remain the source for what was actually drawn/played in individual games.

## User Problem

The current workflow uses `Duplicate` for every iteration. That preserves the old list, but every copy becomes an unrelated deck:

- versions are scattered through deck lists
- there is no reliable previous/next navigation
- changes must be compared manually
- Karabast games point at unrelated deck IDs rather than one deck lineage
- a teammate's iteration becomes their own deck instead of an attributed version

The desired experience is a lightweight rolling history: keep editing one current deck, save versions worth keeping, and retain links to both sealed versions and the current open version.

## Repository Findings

### Current deck storage

- `server/db/schema/deck.ts` stores owner, format, name, description, leader(s), base, visibility, card-pool link, and timestamps.
- `server/db/schema/deck_card.ts` stores normal constructed-deck contents with `(deck_id, card_id, board)` as the primary key.
- `deck_card.board = 1` is the main deck, `2` is the sideboard, and `3` is the maybeboard.
- Card mutation routes currently do not update `deck.updated_at`. Version comparison, price invalidation, stale-client checks, and concurrent sealing require every relevant mutation to update a shared content timestamp.

### Global maybeboard rule

Board 3 is never part of version history.

It must be excluded from:

- the initial full version
- every saved delta
- current-vs-saved comparison
- version reconstruction
- version content hashes
- history diff summaries/details
- the decklist returned by the global version resolver
- Karabast JSON export and version selection

Maybeboard changes must not create an unsaved-version state, must not cause a new version to be saved, and must never insert `deck_version_card` rows.

The current parent deck page may continue showing/editing board 3 from `deck_card`; historical/version decklists contain boards 1 and 2 only.

### Duplicate behavior

- `POST /api/deck/:id/duplicate` creates a new `deck` owned by the caller and copies either normal cards or limited/card-pool state.
- Duplicate should remain available as a true fork. Versioning should not replace independent ownership or divergent history.

### Read and page flow

- `/decks/$deckId` and `/decks/$deckId/edit` pass the route UUID through `useGetDeck()` and `useGetDeckCards()`.
- Detail, cards, JSON export, bulk/comparer, meta tags, tournament, favorite, duplicate, and price paths currently assume the UUID exists in `deck`.
- `useDeckInfoStore.ts` derives editability from ownership/admin mode rather than server-returned capabilities.
- React Query already caches metadata/cards by the requested route ID, which can also be a version ID after central reference resolution is introduced.

### Team behavior

- `team_deck` associates a parent deck with a team; `team_member` stores membership.
- Any team member can currently add a public/unlisted deck even when its owner is not a member. Collaboration authorization must therefore verify actor membership, owner membership, explicit team-deck association, and the owner's collaboration opt-in.
- Existing deck write authorization is duplicated and inconsistent across mutation routes. Versioning should introduce a shared policy.

### Limited/card-pool decks

- A deck with `card_pool_id` does not use `deck_card` as its editable source; it uses `card_pool_deck_cards` resolved through `card_pool_cards`.
- The limited editor and mutations are separate.

For a safe first release, versioning remains limited to normal decks (`card_pool_id IS NULL`). Supporting limited decks later requires a separate definition of current state and board/location deltas.

### Karabast flow

Karabast currently:

1. fetches `GET /api/deck/:id/json` from a SWUBase link
2. returns the same UUID in `players[].data.deck.id`
3. SWUBase normalizes it as a UUID
4. SWUBase stores it in `karabast_lobby_match.deck_id` and `game_result.deck_id`

A submitted UUID may become either a parent deck ID or a version ID. Karabast processing needs to resolve the canonical pair and the correct reconstructed decklist:

```ts
{
  deckId: string;
  deckVersionId: string;
  decklist: ResolvedDeckCard[];
}
```

The version ID is normally non-null for a known, versionable deck because the resolver lazily initializes version history when needed. Unknown IDs and excluded limited decks remain explicit exceptional cases.

Both `game_result` and `karabast_lobby_match` need `deck_version_id`. The lobby-match identity must include the version ID so two versions of the same parent are distinguishable.

### Preview-card migration

`server/lib/cards/previewCardMigration.ts` rewrites preview IDs in current decks when a preview card becomes official. It must also normalize version deltas. Otherwise reconstructed sealed versions can reference cards omitted from the active merged card list and history can show false preview-removal/official-addition changes.

## Recommended Domain Model

### Parent deck

The existing `deck` row is the mutable lineage and source of truth for the current state. `deck_card` remains the complete current card list, including the maybeboard.

### Sealed version

A sealed `deck_version` has:

- a stable UUID
- a stable version number within its parent
- complete versioned metadata
- a `sealed_at` timestamp and sealing user
- version-card rows describing either the initial full state or a delta from the previous sealed version

Once sealed, its logical contents do not change except administrative reference normalization such as preview-to-official card migration.

### Open head

Every initialized deck has exactly one open head:

- it is the highest version number
- `sealed_at` is null
- it has no `deck_version_card` rows
- it resolves to the current `deck` + `deck_card` state when explicitly forced
- it represents unsaved current changes when the current playable deck differs from the last sealed version

This means the open version ID is intentionally mutable. When the user saves it, that same ID becomes sealed and stable, and a new empty open head receives the next number.

### Example lifecycle

Initial version creation for deck state A:

- v1: sealed, contains full A contents
- v2: open head, empty delta
- current `deck_card`: A

Automatic version selection returns v1 because current A equals the latest sealed state.

After unsaved edits to state B:

- v1: sealed A
- v2: open head, no stored rows
- current `deck_card`: B

Automatic version selection returns v2 with current decklist B.

When the user saves:

- v2 is filled with the A -> B delta and sealed
- v3 is created as the new empty open head
- current `deck_card` remains B

Automatic selection returns v2 because current B equals the latest sealed state.

After another unsaved edit to C, automatic selection returns v3 with current C.

## Delta Semantics

### First sealed version

v1 stores the full normalized deck contents for boards 1 and 2. It is the reconstruction checkpoint for the chain.

### Later sealed versions

Each later sealed version stores only keys changed from the previous sealed state.

Use `(card_id, board)` as the key. Store **absolute target values**, not additive arithmetic deltas:

- new card: target positive quantity
- quantity change: new absolute quantity
- note change, if notes are versioned: same quantity with target note
- removal: target quantity `0` as a tombstone
- board move: quantity `0` for the old board plus a positive target row for the new board

Applying a version row is idempotent:

- `quantity = 0` deletes that key from reconstructed state
- `quantity > 0` sets/replaces that key with the row's target values

The open head has no rows. Empty rows on a sealed version are allowed only when the explicitly saved change concerns versioned metadata but not cards. A completely unchanged save should be rejected to avoid meaningless versions.

### Reconstruction

To reconstruct sealed vN:

1. start with an empty map
2. load `deck_version_card` rows from v1 through vN ordered by version number
3. apply absolute set/tombstone operations in order
4. return positive-quantity rows only

All reconstruction paths enforce `board IN (1, 2)` even though valid persisted version rows should already satisfy that constraint.

## Proposed Data Model

### `deck`

Add:

- `version_count integer not null default 0`

It stores the highest assigned version number, including the open head. Initialization sets it to `2`; sealing v2 and creating v3 sets it to `3`.

Do not update `deck.updated_at` merely because a version was sealed. It should represent current deck content changes. Version lifecycle timestamps live on `deck_version`.

### `deck_version`

- `id uuid primary key default gen_random_uuid()`
- `deck_id uuid not null references deck(id) on delete cascade`
- `version_number integer not null`
- `sealed_by_user_id text null references user(id)`
- `name varchar null`
- `description varchar null`
- `format integer null references format(id)`
- `leader_card_id_1 varchar null`
- `leader_card_id_2 varchar null`
- `base_card_id varchar null`
- `change_note varchar null`
- `content_hash text null`
- `source_deck_updated_at timestamp null`
- `created_at timestamp not null default now()`
- `sealed_at timestamp null`

Rules:

- unique `(deck_id, version_number)`
- at most one row with `sealed_at IS NULL` per deck, enforced with a partial unique index
- the open row must be the highest version number
- sealed metadata/hash fields are populated when the head is sealed
- open metadata may remain null because its effective metadata comes from the current parent
- `sealed_by_user_id` records the owner or collaborator who saved the version

The actual user ID type is `text`, not UUID, in this repository.

### `deck_version_card`

- `deck_version_id uuid not null references deck_version(id) on delete cascade`
- `card_id varchar not null`
- `board integer not null`
- `note varchar not null default ''` if notes are included in history
- `quantity integer not null`
- primary key `(deck_version_id, card_id, board)`
- check `board IN (1, 2)`
- check `quantity >= 0`
- index `card_id`

Quantity zero is valid here because it is a removal tombstone; it remains deleted/invalid in the live `deck_card` table.

### Team collaboration

Add `team_member.allow_team_deck_edits boolean not null default false`.

Recommended meaning:

- label: “Allow teammates to edit and save versions of my team decks”
- the setting belongs to the deck owner's team membership
- collaboration applies only when both users are current members and the deck is linked to that team
- the member can change their own opt-in; a team owner may disable but should not silently enable it for somebody else
- collaborator writes can change cards, leader/base, format, name, and description
- only owner/admin can change visibility, delete the deck, or change ownership/team association

### Karabast-related columns

Add nullable `deck_version_id` foreign keys to:

- `game_result` with `ON DELETE SET NULL`
- `karabast_lobby_match` with `ON DELETE SET NULL`

Keep `deck_id` as the canonical parent ID. Team membership and aggregate statistics continue using the parent; exact-version links use `deck_version_id`.

No version column is needed in:

- `team_deck`: it associates a lineage
- `integration_game_data`: raw payload already preserves the submitted UUID
- `tournament_deck`: tournament imports remain separate deck rows
- `user_event`: it can remain parent-level until an event feature explicitly pins versions

## Global Version Resolver

Create one global server function. The requested name can be `getDeckVersionId`, although `resolveDeckVersion` better reflects that it returns more than an ID.

Signature direction:

```ts
async function getDeckVersionId(params: {
  deckId: string;
  deckVersionId?: string | null;
}): Promise<{
  deckId: string;
  deckVersionId: string;
  decklist: ResolvedDeckCard[];
}>;
```

The returned decklist always contains boards 1 and 2 only.

### Initialization

If the deck has no version rows, initialize it transactionally:

1. lock the parent deck
2. read current metadata and `deck_card` boards 1/2
3. create v1 as a sealed full version
4. insert all normalized current board 1/2 cards into v1
5. create v2 as the empty open head
6. set `deck.version_count = 2`

This can happen on the first explicit save or lazily when the global resolver is first needed. New/existing decks therefore do not require an eager bulk snapshot migration.

### Forced version

When `deckVersionId` is present:

1. verify that the version belongs to `deckId`
2. if it is sealed, reconstruct through that version and return it
3. if it is the current open head, return that ID with the current normalized `deck_card` decklist
4. reject an open version that is not the latest head as an invariant violation

“Forced” means the caller selected that ID; it does not mean skipping parent validation.

### Automatic version selection

When `deckVersionId` is null:

1. lock or consistently read the parent/version state
2. load current `deck_card` rows for boards 1/2 only
3. identify the latest open head and the second-latest row, which must be sealed
4. reconstruct the latest sealed decklist from version deltas
5. compare the current playable state with the reconstructed sealed state
6. if they match, return the sealed second-latest version ID and reconstructed decklist
7. if they differ, return the latest open version ID and current normalized decklist

Playable-state comparison must include:

- leader(s)
- base
- format
- `(card_id, board, quantity)` for boards 1 and 2

It must ignore:

- maybeboard rows
- visibility/team/favorite state
- display-only metadata that does not affect a played list
- card notes for Karabast identity, even if notes are preserved for UI history

The function should return a canonical, deterministically sorted decklist so hashes, comparisons, exports, and tests all use the same representation.

## Product Flows

### First save or first resolver use

- Create sealed v1 with full current playable contents.
- Create empty open v2.
- If current still equals v1, automatic resolution returns v1.
- The UI shows v2 as `Current changes`/open head, not as a saved historical version.

### Save another version

1. User clicks `Save current version` from the parent/current deck.
2. Server locks the parent and open head.
3. Server reconstructs the previous sealed version.
4. Server compares it with current metadata and boards 1/2.
5. Server writes the absolute delta/tombstones into the current open version.
6. Server fills snapshot metadata, hash, creator, note, and `sealed_at` on that version.
7. Server creates the next numbered empty open head.
8. `deck_card` remains unchanged.

Board-3-only changes produce no version delta and should not enable/complete a save.

### View versions

- Parent deck ID opens the full current deck, including maybeboard for normal editing.
- Sealed version ID reconstructs that historical main/side deck and is read-only.
- Open-head version ID resolves to current boards 1/2 and is intentionally mutable.
- A banner distinguishes `Saved vN` from `Current changes vN`.
- Previous/next/current navigation is based on version numbers.
- Copying a sealed ID produces a stable historical link.
- Copying the open-head ID produces a current-working-version link whose eventual sealed contents may change until saved.

### History and diffs

Add `Versions` under Deckbuilder and deck pricing.

Show:

- the current open head
- sealed versions newest first
- saver/date/change note
- stored delta summary
- whether current boards 1/2 differ from the latest sealed version
- open/copy/compare actions

For the open head, compute the current delta dynamically from `deck_card` versus the reconstructed latest sealed state. For sealed versions, `deck_version_card` already contains the direct delta from the prior version and can be rendered without recomputing adjacent changes.

Board 3 never appears in any history summary or detailed diff.

### Team collaboration

- Owner links a normal deck to a team and opts in.
- A teammate edits the shared current parent deck; this is not a branch.
- A teammate can seal the current open version and becomes `sealed_by_user_id`.
- The parent owner remains unchanged.
- Team removal, membership removal, or disabling the owner's opt-in revokes access immediately.

### Karabast

Incoming parent ID:

- call the global resolver with `{ deckId, deckVersionId: null }`
- unchanged current deck resolves to the latest sealed ID
- unsaved current changes resolve to the open-head ID

Incoming version ID:

- resolve its parent
- call the global resolver with both IDs
- return the forced sealed reconstruction or current open-head decklist

Persist:

- `game_result.deck_id = resolved parent`
- `game_result.deck_version_id = selected/forced version`
- the same pair on `karabast_lobby_match`

Team auto-add still inserts only the parent ID. Existing statistics aggregate by parent while exact links use the version ID.

The open-head mutability is intentional: games with unsaved experiments can share that head until it is sealed. Per-card metrics continue describing individual game usage.

Existing non-version lobby lookup keys need backward compatibility. Normal deck imports must not split ongoing logical matches merely because `deck_version_id` becomes populated.

## API Direction

New endpoints:

- `GET /api/deck/:id/versions?limit=&offset=`
- `POST /api/deck/:id/versions` to initialize or seal the current head
- `GET /api/deck/:id/versions/:versionId/diff`

Existing reference-aware reads:

- `GET /api/deck/:id`
- `GET /api/deck/:id/card`
- `GET /api/deck/:id/json`
- `GET /api/deck/bulk/data?ids=...`
- meta tags
- duplicate from a sealed/open version

Response metadata must make state explicit:

```ts
reference: {
  id: string;
  deckId: string;
  deckVersionId: string | null;
  versionNumber: number | null;
  kind: 'parent' | 'sealed-version' | 'open-version';
  latestVersionNumber: number;
}
```

Mutation routes must not silently redirect a sealed/open version ID to its parent. Editing happens through the parent deck route. Version links are read references; sealing is an explicit parent-deck action.

## Scope for v1

Included:

- delta-chain version history for normal decks
- sealed initial full version plus one empty open head
- lazy version initialization
- stored adjacent deltas with tombstones
- dynamic current/open diff
- central `{ deckId, deckVersionId, decklist }` resolver
- strict board-3 exclusion
- history navigation and links
- team-authorized editing/sealing
- reference-aware exports, comparer, and duplication
- Karabast parent + version persistence
- preview-card reference normalization

Not included:

- branches/merges
- editing a sealed version
- deleting/renumbering individual versions
- restoring a sealed version over current
- limited/card-pool versioning
- maybeboard history
- version-specific favorites/team associations/tournament imports
- version-specific background pricing

## Acceptance Criteria

- First initialization creates sealed v1 with complete boards 1/2 and empty open v2.
- No `deck_version_card` row ever has board 3.
- Maybeboard-only changes do not affect hashes, automatic version selection, history diffs, or save eligibility.
- Saving an edited deck seals the current head with an absolute delta/tombstones and creates exactly one new empty head.
- Exactly one open head exists per initialized deck and it is always the highest version number.
- A sealed ID reconstructs the same main/side deck regardless of later current edits.
- An open-head ID resolves to current boards 1/2 and is explicitly presented as mutable.
- With no forced version, unchanged current state selects the second-latest sealed version; unsaved playable changes select the latest open version.
- With a forced version, the resolver returns that version after verifying parent ownership of the version ID.
- The resolver always returns parent deck ID, selected version ID, and canonical boards-1/2 decklist.
- History shows the dynamic current diff and stored prior deltas.
- A team collaborator can edit/seal only a qualifying team-linked normal deck.
- Karabast stores the canonical parent and selected/forced version ID.
- Team auto-add and aggregate statistics continue using the parent deck ID.
- Preview-to-official migration preserves reconstructability and does not introduce false history changes.
- Concurrent edits/seals cannot create duplicate heads, duplicate version numbers, or a partially written delta.
