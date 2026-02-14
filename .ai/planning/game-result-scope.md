# Game Result Scope - IndexedDB Overwrite Fix

## Problem

Old implementation of Game results in IndexedDB used `id` as the primary key. That was wrong - when the same game is fetched under different scopes (e.g., first as part of a team, then as a personal game), the `scopeId` field gets overwritten because `put()` matches on the primary key `id`. This means:

1. Fetch games for **team** → game `abc` stored with `scopeId = teamId`
2. Fetch games for **user** → game `abc` stored with `scopeId = userId`, **overwriting** the team entry
3. Team statistics now lose that game

## Old Schema

```ts
// db.ts v8
gameResults: 'id, [scopeId+updatedAt], [scopeId+deckId], [scopeId+format], [scopeId+leaderCardId], [scopeId+leaderCardId+baseCardKey]'
```

- Primary key: `[scopeId+id]` (the game result UUID from the server)
- `scopeId` is set on the client side — either `userId` or `teamId`
- All compound indexes use `scopeId` as the first component
- `storeGameResults()` uses `bulkPut()` which upserts by primary key

## Solution: Compound Primary Key `[scopeId+id]`

Dexie supports compound primary keys (outbound or inbound). Using `[scopeId+id]` as the primary key means each `(scopeId, id)` pair is a unique row.

### Schema Change (db.ts)

```ts
gameResults: '[scopeId+id], [scopeId+updatedAt], [scopeId+deckId], [scopeId+format], [scopeId+leaderCardId], [scopeId+leaderCardId+baseCardKey]'
```

### Pros
- **Clean & semantic**: The primary key directly represents the domain concept (a game result in a specific scope)
- **Native Dexie support**: Compound primary keys are a first-class feature in Dexie
- **No data transformation**: The `id` field stays as the original UUID from the server; `scopeId` stays as-is
- **Querying stays natural**: `db.gameResults.get({ scopeId, id })` works out of the box
- **All existing compound indexes continue to work** since they already use `scopeId`

### Cons
- **Dexie compound key behavior**: `db.gameResults.get(id)` no longer works with a single string — you must always provide `[scopeId, id]` or `{ scopeId, id }`
- **`getGameResultById(id)`** would need to either: (a) require `scopeId` as a parameter, (b) search across all scopes with an index on `id`, or (c) be removed if unused
- **`storeGameResults()`** currently checks existing records by `id` only — needs update to check by `[scopeId, id]`
- **`deleteGameResult(id)`** needs scopeId too
- **Migration**: Need a v9 migration. Since the primary key changes, Dexie will recreate the table (existing cached data is lost, but it's just a cache — it re-fetches)

---

## Implementation Plan

### 1. Update `gameResults.ts` functions
- [ ] `getGameResultById(id)` → change signature to `getGameResultById(scopeId, id)` and use `db.gameResults.get([scopeId, id])`
- [ ] `storeGameResults()` → update existing record lookup to use `[scopeId+id]` compound key instead of `id` only
- [ ] `storeGameResult()` → no changes needed (`put()` will use the new compound primary key automatically)
- [ ] `deleteGameResult(id)` → change signature to `deleteGameResult(scopeId, id)` and use `db.gameResults.delete([scopeId, id])`
- [ ] `deleteGameResultsByScope()` → update `bulkDelete` to use `[scopeId, id]` key pairs instead of plain `id` strings

### 2. Update consumers / hooks
- [ ] `useGetGameResults.ts` — verify no changes needed (already passes `scopeId` and uses scope-based queries)
- [ ] Check all other callers of `getGameResultById` and `deleteGameResult` — update to pass `scopeId`

### 3. Update exports (`index.ts`)
- [ ] Verify re-exports still match updated signatures (no breaking changes to export list)

### 4. Verify
- [ ] Confirm the app builds successfully
- [ ] Manual verification: fetch games for team, then for user — both scopes retain their games
