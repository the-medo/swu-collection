# Deck Versioning - Implementation Plan

## Implementation Strategy

Implement versioning as a delta chain with two version states:

- **sealed**: saved metadata plus an initial full card state or a delta from the previous sealed version
- **open head**: the highest version number, `sealed_at = null`, and no `deck_version_card` rows; it represents current unsaved changes

Build reconstruction and the global version resolver before adapting routes. Every consumer must share one definition of version identity and one board-3 exclusion rule.

## Phase 1: Define invariants and shared types

### Goal

Make the open/sealed lifecycle, delta semantics, returned decklist, and maybeboard exclusion explicit.

### Shared types

Add/update:

- `types/Deck.ts`
  - `DeckReference`
  - `DeckPermissions`
  - `DeckVersionSummary`
  - `DeckVersionState = 'sealed' | 'open'`
  - `ResolvedDeckVersion`
  - history/diff response types
- new `types/ZDeckVersion.ts`
  - save request (`changeNote?`, `expectedUpdatedAt?`)
  - history pagination
  - diff parameters
- game-result types with nullable `deckVersionId`

Canonical resolver result:

```ts
type ResolvedDeckVersion = {
  deckId: string;
  deckVersionId: string;
  decklist: DeckCard[]; // board 1 and 2 only
};
```

Internally, include version state/number and effective metadata to avoid repeated lookups, even if the public helper exposes only the requested three fields.

### Versioned-state definitions

Define two normalization modes:

- `normalizeVersionDecklist`
  - card ID
  - board 1/2 only
  - positive quantity
  - deterministic `(board, cardId)` ordering
  - optional note preservation for history
- `normalizePlayableDeckState`
  - leader(s), base, format
  - card ID, board, quantity for boards 1/2
  - excludes notes, maybeboard, name/description, visibility, favorites, team state

The playable form decides which version ID Karabast/current statistics should use. The richer version form can preserve UI history fields.

### Verification

- Unit fixtures prove board 3 is removed in both modes.
- Ordering differences do not change equality/hash results.
- Note/name changes do not change playable identity, while leader/base/format/main/side changes do.

## Phase 2: Add database schema and migration

### Goal

Create an enforceable delta chain with one empty open head and exact-version references.

### Schema changes

Update `server/db/schema/deck.ts`:

- `versionCount` -> `version_count integer not null default 0`

Add `server/db/schema/deck_version.ts`:

- `id uuid primary key defaultRandom()`
- `deckId uuid not null` FK to `deck`, cascade delete
- `versionNumber integer not null`
- nullable `sealedByUserId text` FK to `user`
- nullable sealed metadata:
  - name
  - description
  - format
  - leaderCardId1
  - leaderCardId2
  - baseCardId
- `changeNote`
- nullable `contentHash`
- nullable `sourceDeckUpdatedAt`
- `createdAt not null defaultNow()`
- nullable `sealedAt`

Add `deckVersionCard` in the same or a separate schema file:

- `deckVersionId uuid not null` FK to `deck_version`, cascade delete
- `cardId varchar not null`
- `board integer not null`
- `note varchar not null default ''` if notes are retained
- `quantity integer not null`
- PK `(deck_version_id, card_id, board)`

Update:

- `server/db/schema/team_member.ts`
  - `allowTeamDeckEdits boolean not null default false`
- `server/db/schema/game_result.ts`
  - nullable `deckVersionId` FK with `onDelete: 'set null'`
  - index `(user_id, deck_version_id)`
- `server/db/schema/integration.ts`
  - nullable `karabastLobbyMatch.deckVersionId` FK with `onDelete: 'set null'`

### Constraints/indexes

- unique `(deck_id, version_number)`
- check `version_number > 0`
- partial unique index on `deck_version(deck_id) WHERE sealed_at IS NULL`
- check `deck_version_card.board IN (1, 2)`
- check `deck_version_card.quantity >= 0`
- index `deck_version_card.card_id`
- short names such as:
  - `dv_deck_no_uidx`
  - `dv_open_uidx`
  - `dv_sealer_idx`
  - `dvc_card_idx`
  - `gr_user_dv_idx`
  - `klm_dv_idx`

The partial index may require reviewed custom SQL if Drizzle does not generate the desired predicate cleanly.

### Migration behavior

- Existing decks remain `version_count = 0`.
- Do not eagerly create versions for every existing deck.
- Existing team members default collaboration off.
- Existing game/lobby rows get null version references.
- Do not rewrite current Karabast lookup keys in the migration.
- Version history is initialized lazily for normal decks on first save/resolver use.
- Update `server/db/schema.dbml` if maintained.

Generate/review/apply according to `docs/migrations.md`:

- `bun db-generate`
- inspect SQL and snapshot
- `bun db-migrate`

### Verification

- DB rejects board 3 version rows.
- DB permits quantity-zero tombstones.
- DB rejects two open rows for one deck.
- Parent deletion cascades version/delta rows and nulls game/lobby references.

## Phase 3: Build canonical delta and reconstruction services

### Goal

Make version reconstruction deterministic, testable, and independent of routes.

### New files

Add under `server/lib/decks`, for example:

- `versionedDeckState.ts`
- `deckVersionDelta.ts`
- `reconstructDeckVersion.ts`
- `initializeDeckVersions.ts`

### Delta representation

Use `(cardId, board)` keys and absolute targets:

- unchanged key -> no row
- add/change -> positive target quantity and target note
- remove -> quantity `0`
- board move -> old-board tombstone plus new-board positive row

Never produce or accept board 3.

`createDeckVersionDelta(previous, current)` should:

1. normalize both lists to boards 1/2
2. compare union of keys
3. emit absolute changed targets/tombstones
4. sort deterministically

### Reconstruction

`reconstructDeckVersion(deckId, targetVersionNumber)` should:

1. load sealed versions from v1 through target
2. load their version-card rows in one ordered query
3. start with an empty map
4. apply positive targets/tombstones in version order
5. return positive rows sorted canonically

Validation:

- target belongs to parent
- target is sealed
- v1 exists and is sealed
- no version-card row is board 3
- version numbers are continuous enough for reconstruction
- only the latest row may be open

### Initialization

`initializeDeckVersions(tx, deck, actorId)`:

1. lock `deck`
2. recheck that version count/history is absent
3. reject `cardPoolId !== null` in v1
4. load current `deck_card` with `board IN (1, 2)`
5. create sealed v1 with full metadata/hash/current rows
6. create empty open v2
7. set `deck.versionCount = 2`
8. return v1, v2, and normalized current decklist

The helper must be idempotent under races: after acquiring the lock, an already initialized deck returns existing state rather than creating duplicates.

### Hashes

- Sealed `contentHash` covers versioned metadata and normalized boards 1/2.
- It never includes board 3.
- Maintain a separate playable equality/hash view for automatic version selection so notes/display-only metadata do not cause a Karabast version change.

### Tests

- v1 full reconstruction
- added/removed/quantity/note delta
- board move
- several chained versions
- quantity-zero tombstone behavior
- board-3 input ignored and board-3 persisted row rejected
- deterministic hash/order
- initialization race/idempotency

## Phase 4: Implement the global version resolver

### Goal

Provide the one function every Karabast/reference consumer uses to obtain parent, selected version, and resolved boards-1/2 decklist.

### New helper

Add `server/lib/decks/getDeckVersionId.ts` (or `resolveDeckVersion.ts`).

Signature:

```ts
getDeckVersionId({
  deckId,
  deckVersionId,
}): Promise<{
  deckId: string;
  deckVersionId: string;
  decklist: DeckCard[];
}>;
```

### Common setup

1. Validate/load parent deck.
2. Reject/handle card-pool decks explicitly.
3. Lazily initialize v1/v2 if no history exists.
4. Load current normalized boards-1/2 cards.
5. Load ordered version metadata/deltas needed for reconstruction.

### Forced version algorithm

When `deckVersionId` is non-null:

1. Load version by ID.
2. Verify `version.deckId === deckId`.
3. If sealed, reconstruct through its number and return it.
4. If open, verify it is the latest/highest version and has zero delta rows.
5. Return the open ID with the current normalized boards-1/2 list.

Do not silently accept a version from another parent. “Forced” bypasses automatic selection, not integrity validation.

### Automatic algorithm

When `deckVersionId` is null:

1. Identify latest row as open head vN.
2. Identify vN-1 as latest sealed version.
3. Reconstruct vN-1.
4. Build playable states for reconstructed and current decks.
5. Compare leaders/base/format and board-1/2 card IDs/boards/quantities.
6. If equal, return vN-1 and reconstructed decklist.
7. If different, return open vN and current normalized decklist.

At no point compare board 3.

### Consistency and performance

- Use a transaction/repeatable snapshot where selection consistency matters.
- Version sealing and normal deck mutations must lock/update the same parent row.
- Initially, reconstruct in one ordered DB read; deck histories are expected to be small.
- Add a bounded in-memory reconstruction cache keyed by `(deckId, sealedVersionNumber, contentHash)` only if profiling shows a need.
- A later optimization may store periodic full checkpoints, but it must preserve the same resolver contract.

### Tests

- absent history initializes and returns v1
- unchanged current returns second-latest sealed ID
- unsaved playable edit returns latest open ID/current list
- maybeboard-only edit still returns sealed ID
- forced sealed returns reconstructed target
- forced open returns current list
- forced wrong-parent version fails
- leader/base/format change selects open ID
- note/name-only differences follow documented playable-identity behavior

## Phase 5: Centralize reference resolution and read flows

### Goal

Allow an incoming UUID to resolve as parent deck, sealed version, or open version without duplicating SQL logic.

### Helpers

Add:

- `resolveDeckReference(referenceId)`
  - check `deck.id` first
  - otherwise check `deck_version.id` joined to parent
  - return parent plus reference state/number
- `resolveDeckReferences(referenceIds)` for bulk loading
- `getEffectiveDeckMetadata(reference)`
  - parent -> current metadata
  - sealed -> saved metadata
  - open -> current metadata
- `getEffectiveDeckCards(reference)`
  - parent -> all current rows (including board 3 for the normal editor/detail page)
  - sealed -> reconstructed boards 1/2
  - open -> current boards 1/2

The global Karabast/version resolver always excludes board 3. Parent detail may still include it intentionally.

### Refactor reads

- `server/routes/decks/_id/get.ts`
- `server/routes/decks/_id/card/get.ts`
- `server/routes/decks/_id/json/get.ts`
- `server/routes/decks/bulk.ts`
- `server/lib/utils/metaTagsFetchers.ts#getDeckMetaTags`

Rules:

- parent visibility/ownership controls all version reads
- sealed/open version pages are read-only references
- JSON export contains boards 1/2 only
- bulk results remain keyed by requested IDs and support mixed parent/sealed/open references without N+1 queries
- preserve Karabast's 32-character UUID normalization for parent and version IDs

### Response metadata

Add:

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

Keep `deck.id` canonical to the parent; use `reference.id` for exact navigation/cache identity.

### Verification

- Sealed page reconstructs old cards.
- Open page tracks current boards 1/2.
- Parent page still displays current maybeboard.
- Version page never displays historical/current maybeboard.
- Private parent hides all versions from anonymous users.

## Phase 6: Centralize authorization and mutation ordering

### Goal

Safely allow team collaboration and guarantee that sealing observes one complete current state.

### Permission helper

Add `server/lib/decks/getDeckPermissions.ts` evaluating:

- owner
- admin
- current/open/sealed reference
- limited exclusion
- qualifying team collaboration

Team query requires one team with:

- parent in `team_deck`
- actor membership
- deck-owner membership
- owner's `allow_team_deck_edits = true`

Capabilities:

- `canEditContent`
- `canSaveVersion`
- `canEditMetadata`
- `canChangeVisibility`
- `canDelete`

Collaborators can edit current cards/playable metadata and seal the open head. They cannot change visibility/delete/ownership/team links.

### Refactor mutations

Use the helper in:

- `server/routes/decks/_id/put.ts`
- `server/routes/decks/_id/delete.ts`
- `server/routes/decks/_id/card/post.ts`
- `server/routes/decks/_id/card/put.ts`
- `server/routes/decks/_id/card/delete.ts`

Mutations accept parent IDs only. Passing a sealed/open version ID must not silently mutate the parent.

### Locking and timestamps

- Wrap each normal deck content mutation in a transaction.
- Lock the parent deck row before writing.
- Update `deck.updated_at` for cards on all boards, including maybeboard changes.
- Although board-3 writes update general deck activity, they are ignored by version comparison/hash/diff.
- Return the new deck timestamp from card mutations.
- Version sealing obtains the same parent lock.

This prevents metadata/cards from changing while the server calculates and stores a version delta.

### Team setting plumbing

- Extend team-member GET response.
- Extend member PATCH validation.
- Member can toggle their own opt-in.
- Recommended: owner may disable another member's opt-in but cannot enable it.
- Add frontend hook and switch/tooltip beside auto-add.

### Verification

- outsider cannot edit public deck
- unrelated public team deck does not become collaborative
- qualifying teammate can edit/seal
- collaborator cannot change visibility/delete
- revocation takes effect immediately
- current admin behavior is made consistent across card mutation routes

## Phase 7: Implement initialize/seal/history APIs

### Goal

Expose the rolling version lifecycle and stored/dynamic diffs.

### Save service

Add `server/lib/decks/saveDeckVersion.ts`.

If uninitialized:

1. initialize sealed v1 full state + open v2
2. return v1 as the newly saved version and v2 as current head

If initialized:

1. require parent/current ID
2. lock parent
3. recheck `canSaveVersion`
4. load latest open head and assert it has zero rows
5. reconstruct previous sealed version
6. load current boards 1/2 and versioned metadata
7. calculate card delta and metadata changes
8. reject a completely unchanged save; board-3-only changes count as unchanged
9. insert delta rows into the current open version
10. fill metadata/hash/sealer/change note/`sealed_at`
11. increment `deck.version_count`
12. create new empty open head
13. return sealed version, new head, and diff summary

### Routes

Mount from `server/routes/deck.ts`:

- `GET /api/deck/:id/versions`
- `POST /api/deck/:id/versions`
- `GET /api/deck/:id/versions/:versionId/diff`

List behavior:

- parent or version reference canonicalizes to parent
- return open head first and sealed versions newest-first
- include sealer/date/note/state/delta summary
- include dynamic open-head diff from latest sealed vs current boards 1/2
- board 3 absent everywhere

Diff behavior:

- open head -> computed current delta
- sealed vN -> stored `deck_version_card` delta plus metadata changes vs vN-1
- v1 -> initial full state
- optionally support arbitrary version comparison by reconstructing both

### Concurrency

- Parent lock serializes simultaneous saves and edits.
- Partial unique open-head index is the final invariant guard.
- `expectedUpdatedAt` may reject stale UI attempts with `409`.
- Two identical simultaneous saves result in one seal and one no-op/stale conflict, not two versions.

### Tests

- first save v1/v2
- second save seals v2/creates v3
- open head always empty
- exact version numbers under concurrency
- board-3-only save rejected
- remove/main-side move produces correct tombstones
- metadata-only saved version supported where intended

## Phase 8: Build the frontend history experience

### Goal

Show the open head, saved versions, dynamic/stored diffs, and collaboration attribution.

### API hooks

Add under `frontend/src/api/decks`:

- `useGetDeckVersions.ts`
- `useSaveDeckVersion.ts`
- `useGetDeckVersionDiff.ts`

Update:

- `useGetDeck.ts` for reference/permissions
- `useGetDeckCards.ts` for exact reference cache keys
- `useGetBulkDecks.ts` for mixed IDs
- card mutations to update parent timestamp and invalidate dynamic open diff only when relevant

Query keys:

- `['deck-versions', parentDeckId, pagination]`
- `['deck-version-diff', parentDeckId, versionId]`
- existing `['deck', referenceId]`
- existing `['deck-content', referenceId]`

### Components

Add `frontend/src/components/app/decks/DeckVersions`:

- `DeckVersions.tsx`
- `SaveDeckVersionButton.tsx`
- `DeckVersionBanner.tsx`
- `DeckVersionDiff.tsx`

Place `DeckVersions` below Deckbuilder and `DeckPricing` in the left detail column.

### UI behavior

Parent/current page:

- shows save button when permitted
- shows open head as `Current changes vN`
- indicates whether playable unsaved changes exist
- board-3-only edits do not produce a version-change badge
- after save, shows sealed vN and new open vN+1

Sealed page:

- `Saved vN` banner with sealer/date/note
- immutable boards 1/2
- previous/next/current links
- copy/export/comparer allowed
- edit controls disabled

Open page:

- `Current changes vN` banner explaining mutable contents
- current boards 1/2 only
- copy/export/comparer allowed with mutable-link warning
- editing still happens through parent link, not through version mutation endpoints

History diff:

- open row uses server-computed current diff
- sealed rows display stored deltas
- no maybeboard group/count/change appears

### Permission UI

- Update `useDeckInfoStore.ts` to use server capabilities.
- Preserve separate owner-only controls.
- Show collaborator notice on parent/current deck.
- Add team opt-in switch and tooltip explaining shared current state and saver attribution.

### Verification

- Parent, sealed, and open navigation keeps distinct caches.
- Comparer loads exact sealed state and current open state.
- Board-3 changes refresh parent content but not history status.
- No stale component can mutate parent through a version ID.

## Phase 9: Make secondary deck consumers version-safe

### Goal

Avoid silently substituting current contents for sealed/open references.

### Behaviors

- Duplicate:
  - sealed source -> reconstructed saved list
  - open source -> current boards 1/2
  - creates independent parent owned by caller
- Favorites:
  - remain parent-level
  - version UI targets canonical parent explicitly
- Tournament provenance:
  - remain parent-level or return null on version pages; never imply a saved version was submitted without evidence
- Pricing:
  - never display current-parent price for a sealed version
  - v1 recommendation: hide historical price refresh
  - optional future `entity_price.type = 'deck-version'`
- Meta tags/thumbnail inputs:
  - sealed metadata for sealed version
  - current metadata for open version
- Admin Karabast mock:
  - accept parent/sealed/open references for end-to-end testing

### Preview-card migration

Extend `server/lib/cards/previewCardMigration.ts`:

- rewrite preview IDs in sealed version metadata
- rewrite/merge delta rows, including zero tombstones
- preserve delta semantics when source and official rows collide
- recompute affected sealed hashes
- never create board 3 rows
- do not seal the open head or add rows to it
- invalidate history queries

### Verification

- duplicating sealed v2 after current reaches v5 matches v2
- duplicating open v6 matches current boards 1/2 and excludes maybeboard
- preview migration preserves reconstruction of every sealed version
- open head remains empty after administrative normalization

## Phase 10: Integrate Karabast through the global resolver

### Goal

Store canonical parent ID, selected/forced version ID, and use the resolver-returned decklist consistently.

### Resolve raw Karabast ID

For each player deck UUID:

- if it matches `deck.id`:
  - call `getDeckVersionId({ deckId, deckVersionId: null })`
- if it matches `deck_version.id`:
  - load parent ID
  - call `getDeckVersionId({ deckId: parentId, deckVersionId: rawId })`
- invalid/unknown:
  - retain null parent/version and raw payload for debugging

Resolve at most two player references once per incoming payload and pass the results to match resolution and transformation.

### `resolveKarabastLobbyMatchIds.ts`

- Extend identity with `deckVersionId`.
- Store both IDs.
- Include selected/forced version ID in version-aware match identity.
- Preserve legacy/current normal-deck lookup behavior through exact old serialization or alias lookup.
- Keep both linked players on one logical match ID.

Because automatic parent resolution may now select a version ID, define compatibility carefully:

- existing rows created with parent-only lookup keys must still resolve
- add the parent-only key as a legacy alias when checking an identity
- only insert a new version-aware mapping when no compatible existing mapping exists

### `transformKarabastGameDataToGameResults.ts`

- Accept resolved version objects per player.
- Write `deckId` and `deckVersionId`.
- Use effective metadata from sealed/open state for `otherData.deckInfo`.
- Optionally add version number/state for diagnostics.
- Use returned decklist when downstream validation/stat calculation needs the deck composition.

### `upsertGameResults.ts`

- Update `deckVersionId` on conflict.
- Continue team auto-add with parent `deckId` only.
- Realtime payload includes the new field.

### JSON export

- Parent URL exports current boards 1/2 as today.
- Sealed version URL exports reconstructed sealed decklist.
- Open version URL exports current boards 1/2.
- Never export board 3.
- If API-compatible, include SWUBase parent/version metadata in JSON for diagnostics, while preserving Karabast's expected format.

### Statistics/frontend cache

- Continue aggregating by parent `gameResult.deckId`.
- Navigate to `deckVersionId ?? deckId` for an exact game deck link.
- Open-head links are understood to be mutable until sealed.
- Dexie persists the added property; add an index/version only if direct version filtering is implemented.

### Tests

- parent ID, unchanged current -> sealed ID
- parent ID, unsaved main/side change -> open ID
- parent ID, maybeboard-only change -> sealed ID
- forced sealed ID -> exact reconstruction
- forced open ID -> current boards 1/2
- different open/sealed IDs affect match identity as designed
- parent-only legacy mapping still resolves
- retry does not create divergent match IDs
- team auto-add never inserts version ID
- unknown valid UUID does not violate a foreign key

## Phase 11: Regression coverage and rollout

### Automated checks

Add tests for:

- normalizers and strict board-3 exclusion
- delta creation/tombstones/reconstruction
- open-head invariants
- initialization and save concurrency
- global resolver forced/automatic branches
- reference resolution and visibility
- permission matrix
- mixed bulk/comparer loading
- preview migration
- Karabast integration and legacy keys

Run:

- `bun test`
- `bunx tsc -p tsconfig.json`
- `cd frontend && bun run build`
- `cd frontend && bun run lint`, separating pre-existing findings

### Manual QA

#### Lifecycle

- Initialize current A -> sealed v1 + open v2.
- Confirm resolver returns v1.
- Add board-1 card -> resolver returns open v2/current list.
- Change only board 3 -> resolver selection remains unchanged.
- Save -> v2 contains delta, v3 is empty, resolver returns sealed v2.
- Remove card/move board -> save and reconstruct accurately.

#### Links

- Sealed link remains stable after current edits.
- Open link tracks current boards 1/2 until sealed.
- Parent page includes maybeboard; both version page types exclude it.
- Sealed/open comparer entries load correct content.

#### Team

- Opt-in owner + linked deck allows teammate edit/seal.
- Saver attribution is teammate; parent owner unchanged.
- Visibility/delete remain owner-only.
- disabling opt-in/removing team deck/membership revokes access.
- unrelated public deck in team is not editable.

#### Karabast

- Parent unchanged saves sealed ID.
- Parent with unsaved main/side changes saves open ID.
- Parent with only maybeboard changes saves sealed ID.
- Forced version is respected.
- Both IDs persist to lobby/game rows.
- team statistics still match parent.
- existing lobby matches remain grouped.

#### Preview cards

- Initialize/save versions containing preview leader/base/cards.
- Migrate preview to official.
- Reconstruct every sealed version successfully.
- Confirm no false history diff and no open-head rows.

### Rollout

- Deploy additive schema and compatible nullable readers first/in the same release.
- Keep collaboration false for existing users.
- Initialize histories lazily instead of bulk backfill.
- Log/Sentry context:
  - parent/version/state/number
  - initialization and sealing
  - invariant failures (missing/multiple open head, non-empty open head, board 3 row)
  - automatic resolver decision (`sealed-match` vs `open-unsaved` vs `forced`)
  - Karabast unknown references and legacy-key reuse
- Monitor reconstruction time and total delta rows; add periodic checkpoints/cache only when justified.

## File Impact Checklist

### Database

- `server/db/schema/deck.ts`
- new `server/db/schema/deck_version.ts`
- optional separate `server/db/schema/deck_version_card.ts`
- `server/db/schema/team_member.ts`
- `server/db/schema/game_result.ts`
- `server/db/schema/integration.ts`
- generated migration/snapshot
- `server/db/schema.dbml`

### Core deck domain

- new normalization/delta/reconstruction/initialization helpers
- new `getDeckVersionId.ts` global resolver
- new reference and permission helpers
- new save/list/diff services
- `server/lib/cards/previewCardMigration.ts`

### Backend routes

- `server/routes/deck.ts`
- existing detail/card/metadata/delete/json/duplicate/favorite/price/tournament/bulk routes
- new routes under `server/routes/decks/_id/versions`
- `server/lib/utils/metaTagsFetchers.ts`

### Team

- member GET/PATCH routes and response types
- new frontend team setting hook
- member row/tab and tooltip

### Karabast/game results

- `server/lib/game-results/karabastGameData.ts`
- `server/lib/game-results/resolveKarabastLobbyMatchIds.ts`
- `server/lib/game-results/transformKarabastGameDataToGameResults.ts`
- `server/lib/game-results/upsertGameResults.ts`
- Karabast POST/mock routes
- tests and payload fixtures
- game-history exact version links

### Frontend deck experience

- shared deck/version types
- existing deck detail/card/bulk hooks
- new version hooks
- `DeckDetail.tsx`
- `DeckContents.tsx`
- `useDeckData.ts`
- `useDeckInfoStore.ts`
- action/compact menus
- new `DeckVersions` components

## Final Recommendation

The implementation should be built around four shared primitives:

1. normalize a versionable deck state while always excluding board 3
2. create/apply deterministic absolute deltas with quantity-zero tombstones
3. reconstruct any sealed version from the v1 checkpoint and subsequent deltas
4. globally resolve `{ deckId, optional deckVersionId }` into `{ deckId, selected deckVersionId, decklist }`

Once those are authoritative, the open-head lifecycle is straightforward: the current head remains empty, saving fills and seals it, and a new empty head is created. Automatic resolution chooses the latest sealed ID when current playable contents match it and the open ID only when real unsaved main/side/playable-metadata changes exist.
