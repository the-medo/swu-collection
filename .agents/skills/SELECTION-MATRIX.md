# SWUBASE skill selection matrix

Select skills from the workflow being changed, not from broad words in the
request. Start with the primary skill and add companions only when the task
crosses their boundary. For implementation or code review, also use
`swubase-validation` to choose the final checks.

## Local development and contributor data

| Task pattern | Primary skill | Companion skills |
| --- | --- | --- |
| Bootstrap, start, inspect, stop, refresh, or safely clean a Linux/WSL worktree and its PostgreSQL container | `swubase-worktree-dev` | `swubase-validation` when tooling or isolation is changed |
| Change worktree ports, Docker labels/ownership, cookies, generated env, dump restore, or lifecycle scripts | `swubase-worktree-dev` | `swubase-development-data` for public dump consumption; `swubase-validation` |
| Change server-side sanitization SQL/job, retention opt-ins, Coolify compose, R2 generations/manifest, or privacy assertions | `swubase-development-data` | `swubase-database-migrations` for new tables; `swubase-validation` |
| Change how worktrees download, checksum, cache, or restore contributor data | `swubase-development-data` | `swubase-worktree-dev`, `swubase-validation` |

## Backend and database

| Task pattern | Primary skill | Companion skills |
| --- | --- | --- |
| Add/change a Hono HTTP endpoint, validation, route composition, response, ownership check, or request handler | `swubase-backend-endpoints` | `swubase-frontend-api` when consumed by the app; domain skill; `swubase-validation` |
| Change Better Auth, OAuth/session/cookies, user fields, roles, permission policy/helpers, or frontend auth affordances | `swubase-auth-permissions` | `swubase-database-migrations` for persisted fields; `swubase-development-data` for personal data; `swubase-validation` |
| Change a Drizzle schema, generated SQL/snapshot/journal, or custom data migration | `swubase-database-migrations` | `swubase-development-data` for user/personal/domain retention; `swubase-validation` |
| Change a shared API DTO or Zod wire contract under `types/` or `shared/` | `swubase-backend-endpoints` + `swubase-frontend-api` | Relevant domain skill; `swubase-validation` |
| Change the persisted user-settings contract/defaults | `swubase-browser-storage` | Affected API/UI/domain skills; `swubase-validation` |

## Frontend

| Task pattern | Primary skill | Companion skills |
| --- | --- | --- |
| Add/change typed frontend API hooks, Query keys, errors, freshness, mutations, or invalidation | `swubase-frontend-api` | `swubase-backend-endpoints` for the server contract; `swubase-browser-storage` for persistence; `swubase-validation` |
| Build/refactor React components, controls, forms, dialogs, responsive UI, or feature state | `swubase-frontend-components` | `swubase-frontend-routing` for URL state; `swubase-frontend-api` for server data; `swubase-validation` |
| Add/change pages, layouts, redirects, navigation, path params, search params, or URL-controlled overlays | `swubase-frontend-routing` | `swubase-frontend-components` when screen UI changes; `swubase-auth-permissions` when auth policy/layout behavior changes; `swubase-validation` |
| Change Dexie tables/versions/indexes, IndexedDB/localStorage, cached fallback, sync cursors, or persisted user settings | `swubase-browser-storage` | `swubase-frontend-api` when server-synced; relevant domain skill; `swubase-validation` |

## Integrations and background workflows

| Task pattern | Primary skill | Companion skills |
| --- | --- | --- |
| Add/change Discord payloads, announcement publishing, notification identity, retries, dry runs, or triggers | `swubase-discord-notifications` | `swubase-screenshotter` for result media; `swubase-cron-jobs` if scheduled; `swubase-validation` |
| Add/change a one-shot Bun cron, Coolify scheduled command, Sentry monitor, queue claim, or overlap safety | `swubase-cron-jobs` | Domain/integration skill for its effects; `swubase-validation` |
| Add/change authenticated WebSocket routes, rooms, event DTOs, publishers, reconnect, or Query patch/refetch logic | `swubase-websockets` | `swubase-auth-permissions` for session/origin policy; `swubase-frontend-api` for Query cache changes; relevant domain skill; `swubase-worktree-dev` for generated URLs/ports; `swubase-validation` |
| Change Karabast linking, encrypted tokens, credentials, ingestion, lobby/match IDs, mocks, or card-ID resolution | `swubase-karabast-integration` | `swubase-preview-cards`, `swubase-websockets`, `swubase-development-data`, `swubase-validation` as applicable |
| Change preview-card admin/data, merged card lists, browser cache, exports/images, Karabast mapping, or official migration | `swubase-preview-cards` | `swubase-browser-storage`, `swubase-karabast-integration`, `swubase-database-migrations`, `swubase-validation` as applicable |
| Change live weekends, Melee polling/progress, import queue, live-home cache/patches, resources, or watched players | `swubase-live-tournaments` | `swubase-websockets`, `swubase-cron-jobs`, `swubase-discord-notifications`, `swubase-screenshotter`, `swubase-validation` as applicable |
| Change Playwright screenshot targets/readiness, R2 upload/manifest, persisted screenshots, CLI/admin trigger, or after-import capture | `swubase-screenshotter` | `swubase-frontend-components`/`swubase-frontend-routing` for target UI/URL state; `swubase-live-tournaments` for after-import; `swubase-discord-notifications` for result media; `swubase-validation` |

## Common combinations

- New screen requiring a schema change:
  `swubase-database-migrations` + `swubase-backend-endpoints` +
  `swubase-frontend-api` + `swubase-frontend-components` +
  `swubase-validation`; add routing only for a new/changed URL.
- New page whose filters are shareable:
  `swubase-frontend-routing` + `swubase-frontend-components` +
  `swubase-validation`.
- Cached API resource:
  `swubase-frontend-api` + `swubase-browser-storage` +
  `swubase-validation`.
- Authenticated/admin feature: use the backend/frontend skills for its changed
  surface plus `swubase-validation`; add `swubase-auth-permissions` only when
  session behavior, roles, permission policy, or auth helpers change.
- Live tournament change:
  `swubase-live-tournaments` plus only the transport/cron/Discord/screenshotter
  skills actually crossed.
- Public sanitized-dump consumer:
  `swubase-development-data` + `swubase-worktree-dev` +
  `swubase-validation`.

## Detailed source documents

The matching skill requires these documents to be read completely before work:

| Workflow | Source document |
| --- | --- |
| Drizzle schema and custom migrations | `docs/migrations.md` |
| Karabast linking/tokens/game results | `docs/karabast-integration/integration-workflow.md` and `docs/karabast-integration/notes-and-improvements.md` |
| Preview-card lifecycle and migration | `docs/preview-cards/preview-card-docs.md` |

## Fast rule

If no specialized row matches, use `swubase-validation` and inspect the nearest
working implementation. Do not load every skill “just in case,” and do not use
an operational skill merely because a request mentions an agent, Docker, or a
database without changing that workflow.
