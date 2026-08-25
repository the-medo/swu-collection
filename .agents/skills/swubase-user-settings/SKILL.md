---
name: swubase-user-settings
description: Add or change SWUBASE account-synced user preferences, shared defaults, key/value persistence, settings UI, browser synchronization, or development-data opt-ins.
---

# SWUBASE user settings

Use this skill for the account-synced preferences defined in
`shared/lib/userSettings.ts`. Do not treat every setting-looking value as this
domain: display name, country, state, and currency are Better Auth `user`
fields; small browser-only UI preferences use namespaced localStorage; large or
queryable caches use their Dexie domain tables.

## Sources and flow

- `shared/lib/userSettings.ts` contains the manually maintained
  `UserSettings` interface and Zod schema. Schema defaults are application
  defaults and must remain backward-compatible when no database/browser row
  exists.
- `server/db/schema/user_settings.ts` stores text values keyed by
  `(user_id, key)`. A new key needs no database migration unless table shape
  changes.
- `server/routes/user-settings.ts` and `server/routes/user-settings/` own
  authenticated full GET and partial POST. `server/routes/user-setup/get.ts` is
  a second full reader; keep its parsing behavior aligned.
- `frontend/src/dexie/userSettings.ts`,
  `frontend/src/api/user/useGetUserSetting.ts`, and
  `frontend/src/api/user/useSetUserSetting.ts` own the local copy and
  `['user-setting', key]` Query cache. Logged-in writes are server first, then
  Dexie/cache; anonymous writes are intentionally local only.
- `frontend/src/components/app/auth/SignIn.tsx` marks
  `sessionStorage.needsSettingsSync`; the root-mounted
  `frontend/src/components/app/users/UserSettingsLoader.tsx` calls
  `frontend/src/lib/userSettings.ts` for that conditional full
  server-to-browser sync. It is not a general session-change sync.
- The settings page/tab contract spans
  `frontend/src/routes/_authenticated/settings/index.tsx` and
  `frontend/src/components/app/pages/settings/SettingsPage.tsx`.

## Add or change a setting

1. Decide the persistence class first. Use this contract only for a genuine
   cross-device/account preference.
2. Update both the TypeScript interface and Zod schema with the same key/type
   and an intentional default. Test text serialization for booleans, numbers,
   enums, strings, and nullable values through both server readers and Dexie.
3. Make partial writes preserve every omitted key. Do not blindly copy the
   current `userSettingsSchema.partial()` behavior: defaults can be materialized
   for omitted properties and a one-key request can overwrite unrelated stored
   settings. Add a regression test before changing this path.
4. Keep mutation order and Query keys consistent. Avoid duplicate success/error
   toasts between the hook and component.
5. When adding a tab, update the route's validated search values and the tab
   list/content together so deep links remain valid.
6. Perform a privacy review. The sanitized-development SQL currently retains
   all settings for opted-in users, not an allowlist. A future personal or
   secret setting requires a cleanup-policy change.

Development sharing has an extra invariant: match sharing is effective only
when both `share_development_data` and `share_development_data_matches` are
true. Keep UI copy/disable behavior and `scripts/remote-dev/sql/001-core-data.sql`
aligned.

## Existing hazards

- The interface and inferred schema type can drift because both are declared.
- `saveUserSetting()` calls validation but currently ignores its boolean result.
- Browser settings and Query keys are origin-scoped, not user-scoped, and
  logout does not clear them. With infinite stale time, account switching can
  expose stale preferences unless explicitly handled.
- POST writes keys one by one without a transaction; coupled updates can
  partially persist.
- Better Auth fields and account-synced preferences appear together in some UI,
  but must keep their separate persistence mechanisms.

Load `swubase-browser-storage` for Dexie behavior,
`swubase-auth-permissions` for Better Auth user fields,
`swubase-development-data` for privacy/retention settings, and the frontend/API
skills for changed screens or routes.

## Validation

Test anonymous GET/POST rejection, authenticated defaults, one-key and
multi-key partial updates, malformed input, each serialized type, and the
`user-setup` result. Prove that changing one key leaves every other stored key
unchanged. In a browser, cover anonymous use, authenticated save, fresh sync,
refresh, logout, and login as another user. For development opt-ins, test all
four boolean combinations and rerun sanitizer assertions when SQL or policy
changes. Run the focused frontend lint/build checks and `git diff --check`.
