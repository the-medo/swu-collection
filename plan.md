# Creator hub refactor

The historical migration numbers in completed entries below refer to the original
development sequence. The branch now consolidates that sequence into the single
`0085_creator_hub.sql` migration; see the consolidation checklist at the end.

Implement the seven agreed refactors in `feature/creator-hub`. Preserve existing
creator profiles, videos, decks, permissions, publication history, taxonomy and
the current public layouts. Work from the existing uncommitted feature.

## Skills and sources

Use `swubase-architecture`, `swubase-backend-endpoints`, `swubase-frontend-api`,
`swubase-frontend-components`, `swubase-frontend-routing`,
`swubase-auth-permissions`, `swubase-decks`, `swubase-cron-jobs`,
`swubase-database-migrations`, `swubase-development-data`,
`swubase-worktree-dev`, `swubase-documentation`, `swubase-validation`, and
`swubase-change-review` for their respective boundaries. Follow
`docs/migrations.md`; generate new migration artifacts and apply them only to
this worktree's isolated database. Review the task diff independently with the
local read-only Claude CLI before handoff.

## Implementation checklist

- [x] **Precise query invalidation.** Introduce named query keys and operation
      hooks. Draft saves refresh draft/history/studio data; publication changes
      refresh public discovery/detail/collections. Keep private caches scoped to
      the signed-in user and isolate profile, member, and channel changes.
- [x] **Backend responsibilities.** Extract permissions, profile operations,
      reference resolution, discovery, draft/history operations and publication
      writing from the creator service. Retain a small service facade for routes.
      Separate worker queue, spending, publication and reporting operations while
      preserving claim fencing, locking and atomic publication.
- [x] **Video descriptions and shared mapping.** Store the full description
      separately from the short summary. Share metadata conversion across OAuth
      imports and the worker, retain language/chapters behavior, and backfill saved
      documents conservatively from existing worker metadata or their old summary.
      Render/edit the description separately and preserve line breaks.
- [x] **Canonical YouTube channels.** Add channel identities and creator/channel
      associations independently of OAuth credentials. Backfill curated IDs,
      cached handles, and connected channels without assigning ownership or
      inventing credentials. Preserve conflicting-channel exclusion, multiple
      channels, owner-only OAuth management, and curated-versus-verified trust.
      Move eligibility to these records and keep contributor sanitization complete.
- [x] **Compact list responses.** Return only card/studio-list fields from list
      endpoints. Keep rich documents on detail/draft endpoints. Add a validated,
      bounded page size and fetch only three related creations. Preserve filters,
      language facets, ordering and pagination.
- [x] **Worker failure policy.** Centralize typed failure/issue decisions for
      skipping a deck, retrying a job, waiting, and stopping a batch. Preserve
      spending safeguards and ensure rejected decks do not block valid videos.
- [x] **Editor lifecycle.** Extract autosave, revision/conflict recovery,
      publication state and navigation protection into `useCreationDraft`.
      Extract chapter, classification and publication controls without changing
      saved drafts or the preview/player behavior.

## Verification and completion

- [x] Focused unit/API and isolated database tests for changed behavior,
      including migration backfill, channel trust/conflicts/disconnect, long
      descriptions, bounded compact lists and failure outcomes.
- [x] Frontend build, focused lint/type checks and browser regressions for
      autosave invalidation, conflict recovery, publishing, descriptions and video
      timestamps; retain private/public cache separation.
- [x] Drizzle check, schema consistency and `db-migrate`; compare existing
      profile/creation/deck identities and publication state before/after.
- [x] Update `docs/creator-hub.md`, inspect the task-only diff, complete the
      independent review and address substantiated findings.
- [x] Mark this checklist with results and report remaining limitations.

No paid worker runs are needed for this refactor. Subscriber-count collection,
media processing and creator claiming remain separate product work.

### Validation recorded

- 134 focused tests passed, including six isolated database scenarios, channel
  migration/trust/conflicts, description/history backfill, compact pagination,
  OAuth, publication, import moderation, claim fencing and spending limits.
- Creator authoring and video browser regressions passed. Autosave refreshes the
  studio without reloading profiles/selectors; publication/conflict recovery,
  full descriptions with late links, timestamp seeking and responsive layouts pass.
- Frontend production build and scoped ESLint passed. Broad TypeScript checks
  retain repository baseline errors (including the unchanged taxonomy SQL test);
  changed creator implementation files have no reported diagnostics.
- Drizzle check and schema consistency passed; migrations 0094–0096 applied to the
  isolated worktree database. The 18 pre-existing migration artifacts are intact.
- Before/after comparison retained 30 profiles, 3 creations, 1 imported deck,
  31 eligible channels, all existing revision numbers and publication timestamps.
- The development app is running again at the existing worktree URL. No live
  provider processing or paid classification requests were made.

### Independent review follow-up

The initial Claude review identified description normalization and empty-field
fallback regressions. Both are fixed: append-only migration 0096 handles the
legacy UTF-16 prefix and JS whitespace rules, and a blank description displays the
summary. Regression fixtures cover emoji, leading/trailing Unicode whitespace,
edited shorter summaries, revision history, reruns, and manual video display.

Curated link corrections intentionally synchronize at the next worker invocation;
this timing is now explicit in the operations documentation. Owner assignment,
OAuth disconnection and profile deletion still revoke their respective import
access immediately. The focused independent Claude follow-up found no remaining actionable issues.
The migration regressions, video browser check, frontend build and scoped lint
passed again after the fixes. Historical videos without stored source metadata
retain their existing summary; this refactor does not fetch missing descriptions.

## Automatic publication and non-SWU reports

Use swubase-cron-jobs, swubase-backend-endpoints, swubase-frontend-api,
swubase-frontend-components, swubase-frontend-routing, swubase-auth-permissions,
swubase-database-migrations, swubase-development-data, swubase-documentation,
swubase-worktree-dev, swubase-validation and swubase-change-review.

- [x] Publish uncertain video classifications while retaining validated tags,
      existing content moderation and clear non-SWU exclusions.
- [x] Add private, deduplicated non-SWU reports and an admin review/unpublish queue.
- [x] Cover concurrency, authorization, publication and contributor-data cleanup;
      apply the new migration locally, build/lint, and exercise the browser flow.
- [x] Update operator/privacy documentation and complete independent review.

Validation: 29 focused tests passed (557 assertions), including concurrent reports,
rate limits, admin-only moderation, stale decisions, retry receipts after resolution,
re-reporting after republication, and sanitized-dump cleanup. The reporting browser
flow passed for signed-out and signed-in visitors, admin decisions, keyboard focus,
mobile/desktop layouts and light/dark themes. Frontend build, scoped ESLint,
Prettier, Drizzle check and diff checks passed. Migrations 0097–0098 were applied to
the isolated worktree database; snapshots preserve every existing table. The broad
TypeScript check retains unrelated repository errors; changed files have no errors.
The independent Claude review and focused follow-up are complete: the re-reporting
edge case and test formatting were fixed, with no remaining actionable findings.
No paid provider runs or production scheduling changes were made.

## Channel import controls and manual edits

Use swubase-backend-endpoints, swubase-cron-jobs, swubase-database-migrations,
swubase-development-data, swubase-frontend-api, swubase-frontend-components,
swubase-frontend-routing, swubase-documentation, swubase-validation and
swubase-change-review.

- [x] Add owner-only, channel-scoped fetching with a cooldown and background processing.
- [x] Persist auto-import preferences and enforce them during discovery, claiming and publication; allow explicit manual fetches while paused.
- [x] Persist per-field manual edit protection, including conservative protection for previously edited imports.
- [x] Hide creator hub links from the sidebar while keeping direct routes available.
- [x] Apply migrations, verify authorization/concurrency/pause/edit behavior, build and check the UI, update docs, and complete independent review.

Validation: all 31 creator/worker tests passed (612 assertions), including owner-only
channel controls, concurrent fetch cooldowns, channel scoping, pausing queued and
in-flight jobs, manual fetching while paused, sticky per-field edits, stale saves,
historical backfill, provider failures and bounded discovery. Browser checks passed
for both channels independently, keyboard toggles, persisted settings/cooldowns,
fetch feedback/errors, mobile/desktop light/dark layouts, hidden navigation and
edit flags. Opening an imported video leaves its revision/flags unchanged; editing
only the title protects exactly that field.

Frontend build, scoped ESLint, Prettier, Drizzle check, cron bundling and diff checks
passed. Migrations 0099–0100 applied to the isolated creator-hub database; snapshot
comparison confirms only the four intended columns changed. The broad TypeScript
check retains unrelated repository errors with no diagnostics in changed files.
Independent read-only Claude review found no correctness bugs; its one test-coverage
recommendation was implemented and the strengthened browser check passed. No live
YouTube/Gemini requests or production scheduling changes were made.

## Migration and commit consolidation

Use swubase-database-migrations, swubase-development-data,
swubase-worktree-dev, swubase-documentation, swubase-validation and
swubase-change-review. The user explicitly requested consolidation of the
feature's already-shared migrations and commits, authorizing this exception to
the normal append-only migration rule.

- [x] Replace the 16 branch migrations with one ordered SQL migration and one
      freshly generated final snapshot, preserving every migration on origin/main.
- [x] Update migration regression tests and operator documentation for the new file.
- [x] Compare clean old/new installations, reconcile only this local database's
      migration ledger, and verify existing creator data is unchanged.
- [x] Run focused checks and independent review, restore the dev app, squash the
      three feature commits into one, and update the PR with a guarded force-push.

Validation: the full old migration chain and consolidated chain were installed
into two temporary databases within this worktree's existing isolated PostgreSQL
container. All 134 installed tables' columns (including order), constraints and indexes
matched, along with the creator profile/tag/channel seeds. A second migrate was
a no-op for both. Both temporary databases were removed. The final generated
snapshot matches the former final snapshot, and every original SQL section is
preserved byte-for-byte inside the new migration.

The local database's 16 exact creator migration ledger records were replaced
transactionally with the new migration's hash/timestamp after checking its
schema and backing up the ledger. Main history and every row in all 16 creator
tables remained unchanged. All 31 creator/worker tests passed (612 assertions),
along with Drizzle check, formatting and diff checks. The dev app is running again;
the directory and Google sign-in initiation returned 200 with the expected callback.

Independent read-only Claude review found no correctness or equivalence issues.
Its checklist note is resolved. There are no GitHub deployment records for this
branch, and deployment jobs on its last push were skipped; the documented ledger
reconciliation requirement remains relevant to any separately maintained database
that applied the old branch history. No production database was changed. The
pre-squash Git history is retained in a local backup ref for recovery.

# Admin creator imports

Skills: `swubase-backend-endpoints`, `swubase-frontend-api`,
`swubase-frontend-components`, `swubase-frontend-routing`,
`swubase-database-migrations`, `swubase-cron-jobs`, `swubase-documentation`,
`swubase-worktree-dev`, `skill-creator`, `swubase-validation`, and
`swubase-change-review`.

- [x] Replace embedded directory data with a versioned JSON import contract.
- [x] Add an admin-only preview/import page for profiles and video queue entries.
- [x] Preserve duplicates and edited/owned profiles; reject conflicting identities.
- [x] Archive researched inputs in R2 and remove actual creator/video data from Git.
- [x] Document the import workflow and add a discoverable agent preparation skill.
- [x] Validate fresh migration, importer authorization/transactions, and browser flow.
- [x] Complete independent Claude review and update the feature PR.

The feature migration now installs schema, taxonomy, and generic backfills only;
there is no directory seed. Administrators import portable JSON through
`/admin?page=creator-imports`; video IDs enqueue normal worker jobs without provider
calls in the HTTP request. Research artifacts are stored outside Git. Tests use
synthetic creators, channel/video IDs, and deck references.

Validation: 33 creator/worker tests passed (564 assertions), covering real admin
authorization, body limits, read-only preview, atomic imports, concurrency,
idempotence, ownership, pause controls, and stale previews. The importer browser
check passed for real upload/preview/apply, duplicate/conflict/error states,
keyboard use, direct reload, and mobile/desktop in both themes. The video browser
regression passed after replacing its live references with synthetic fixtures.
Frontend build and scoped ESLint passed. Broad TypeScript checks still have
existing errors; the frontend TypeScript check has no diagnostics in the new
importer modules. Root checking cannot resolve the existing frontend aliases.

A fresh temporary database applied the complete migration history twice, with
zero creator profiles or video jobs and the expected taxonomy. Importing the
archived profiles and video queue into that isolated database succeeded, and a
repeat profile import skipped existing records. It was removed afterward. The
local worktree's single migration hash was reconciled after removing seed data;
all rows in its 16 creator tables and all main migration records were preserved.
Drizzle checks and local `db-migrate` passed. R2 uploads and public download
checksums were verified. Skill validation and relative links passed. A tracked
source scan found no researched creator/channel/video identity references.

Independent read-only Claude review and focused follow-up completed. Resolved
handle-cache collision detection and normalized upload-size limits, with regression
tests. Research artifacts and browser screenshots use separate ignored folders.
The final obsolete migration comment was corrected and its local ledger hash
reconciled; `db-migrate` remained a no-op. The feature stays one commit and one
migration, with the researched data absent from the branch commit.

# YouTube metadata and authorization lifecycle

Skills: `swubase-auth-permissions`, `swubase-cron-jobs`,
`swubase-database-migrations`, `swubase-development-data`,
`swubase-backend-endpoints`, `swubase-frontend-api`,
`swubase-frontend-components`, `swubase-worktree-dev`,
`swubase-documentation`, `swubase-validation`, `swubase-change-review`.

- [x] Track public/OAuth provenance and last metadata refresh separately from edits.
- [x] Refresh public video/channel metadata in bounded, repeatable worker batches;
      preserve manual edits and publication intent, remove unavailable/expired data
      from publications, drafts, historical revisions and job payloads.
- [x] Recheck OAuth access, distinguish revocation from temporary provider failures,
      remove credentials and consent-derived data without stopping independent
      public imports or changing the creator's auto-import preference.
- [x] Show disconnected/reconnect state and retain owner-only channel controls.
- [x] Update migration/backfills, sanitization coverage, privacy and operations docs.
- [x] Test provider failures, deadline cleanup, concurrency, provenance, edited
      drafts, public discovery and OAuth reconnection; build and independent review.
- [x] Preserve the requested single feature migration/commit and update PR #176.

The earlier explicit consolidation instruction still applies to this unreleased
feature. Generate changes normally, then fold the generated SQL/snapshot into
the feature migration after validating both fresh and existing local installs.
No production schedule, Google configuration, or tagging policy is changed here.


Maintenance refreshes public metadata weekly, retries temporary failures hourly,
checks OAuth daily and clears expired provider copies after 28 days. Google access
is separate from the public-import association and channel pause preference.
Manual fields are protected per draft, publication and historical version. Removal
scrubs provider fields and their obsolete protections; explicit reconnect permits
fresh draft recovery without republication. Public refresh establishes public
provenance. Unchanged refreshes do not create revision conflicts.

Validation: 37 creator/worker tests passed (645 assertions) against a disposable
local database with mocked providers, including legacy protection reconstruction,
reconnect/recovery, report-title cleanup and cron failure reporting. Creator Studio
browser checks passed, including disconnected controls and mobile layout. Frontend
production build, scoped ESLint, formatting, Drizzle checks, local migrations,
worker bundling, dry-run and diff checks passed. Broad type checks retain baseline
errors; no new backend lifecycle or frontend creator diagnostics remain in their
appropriate checks (root TypeScript still cannot resolve frontend aliases).

The generated schema changes were folded into migration 0085. A fresh database
applied the complete history twice without creator/video seeds; its creator schema
matched the existing worktree. Local reconciliation preserved all pre-existing
values across 16 creator tables, including 31 profiles and one real credential,
and preserved every main migration record. Only lifecycle provenance/protection
columns and the feature ledger were updated. The dev app is running again.

Independent Claude review found recovery, placeholder protection, provider-error,
no-op revision and duplicated-retention issues; these were addressed with focused
regressions. Self-service channel transfer/removal is consciously deferred: public
associations retain routing and conflicts, and transfers require staff action as
documented. The focused follow-up review confirmed those fixes. Its final minor findings
were also resolved: legacy connections get an immediate check rather than expiry
based on their original connect date, and denied first-time permissions have the
correct user-facing error. Focused tests and local migration checks passed again.
