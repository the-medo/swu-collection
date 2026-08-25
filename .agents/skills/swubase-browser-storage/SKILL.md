---
name: swubase-browser-storage
description: Change SWUBASE Dexie or localStorage schemas, browser caches, offline fallbacks, sync cursors, persisted user settings, and Query-cache synchronization.
---

# SWUBASE browser storage

Use this skill for `frontend/src/dexie/`, browser persistence, or API hooks that
coordinate IndexedDB/localStorage with TanStack Query.

`DatabaseProvider` opens the shared `SwuBaseDB` once and gates the application.
Feature code must use that shared `db`, not create or close its own connection.

## Dexie schema changes

1. Add/update the typed `Table` property in `frontend/src/dexie/db.ts`.
2. Append a new Dexie version. Repeat the complete store schema in that version;
   never rewrite a version users may already have opened.
3. Add `upgrade()` only when existing rows or obsolete keys need transformation.
4. Design indexes from actual queries. Compound index field order must match the
   tuples passed to `.where()`, `.between()`, and `.equals()`.
5. Keep domain helpers and any `frontend/src/dexie/index.ts` exports in sync.
   Prefer bulk operations for batches.

Every cache needs an explicit freshness contract: its key/scope, server
`updatedAt` or version marker, local payload, fetch failure behavior, and Query
cache update/invalidation. Scope user/team data so one account cannot see
another account's cached records. When the active scope changes, handle both
the Query cache and persistent cache deliberately.

Use localStorage only for small browser-only UI preferences or sync cursors.
Namespace stable keys, parse defensively, catch unavailable-storage errors, and
remove obsolete keys. Cross-device/account preferences belong in
`shared/lib/userSettings.ts` with a default and should flow through the existing
user-setting hooks. Large or queryable structured data belongs in Dexie. Choose
the boundary deliberately instead of creating a parallel store for an existing
setting.

Browser storage is origin-scoped, so different worktree frontend ports have
separate IndexedDB and localStorage.

Load `swubase-frontend-api` for server synchronization and
`swubase-preview-cards` when changing the split official/preview card-list cache.

## Validation

Build the frontend. Test a fresh database and an upgrade from the previous
version, then verify refresh, mutation, scope/logout/login, cache deletion, and
offline/failure behavior promised by the feature. Inspect browser storage for
expected keys and absence of secrets or unnecessary personal data.
