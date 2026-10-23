# MCP article authoring plan

Approved and implemented 2026-10-21 on `feature/mcp-intro`.
See [the authoring guide](mcp-articles.md) for the delivered tools and workflows.

## Scope

Support personal articles and articles belonging to creators the authenticated
user currently manages. Preserve the existing distinction between saved drafts
and published snapshots. All writes use the authenticated identity, current
ownership and membership, and optimistic content/ownership revisions.

Users can:

- Discover personal and creator publishing identities and permitted actions.
- Search/list accessible articles by workspace, publication state and metadata;
  read drafts, publications and retained revisions.
- Create blank or templated drafts, duplicate articles and import/export the
  native document. Offer readable output with explicit widget fallbacks.
- Edit title, summary, cover, language, tags, associated subjects, original URL,
  relevance, freshness, season, series/order, sponsorship and creator pinning.
- Replace content or atomically insert, update, move and remove blocks while
  preserving untouched formatting, IDs, nested content and widgets.
- Use every native editor block and SWUBASE insertion: card images, card links,
  card groups, decklists, pools, albums, mentions, matchups, meta analysis and
  callouts, including all their settings.
- Prepare deck-guide, tournament-report, limited-guide and meta-report templates
  using real accessible data; preview/select sections before creating, appending
  or explicitly replacing content. Preserve author-written metadata.
- Find cards/variants, decks, pools, albums, users, sets, tournaments and groups;
  report unavailable/private references without disclosing inaccessible data.
- Browse existing images and upload images through the existing validation,
  optimization, storage and quota pipeline; use covers and body images.
- Validate without saving, inspect a readable outline and open the draft in the
  existing editor for visual preview.
- Publish an explicit saved revision, update a publication and unpublish while
  retaining its draft/history.
- Inspect retained revisions/differences and restore one as a new draft.
- Preview and explicitly perform the existing owner-only transfer of all personal
  articles to an owned creator profile.

Missing Melee data produces warnings and writing prompts, never invented results.
Templates, saves and history restores never publish automatically. Conflicts
require rereading/reconciling rather than silently overwriting browser changes.

## Permissions and operations

Add `articles:read`, `articles:write`, and `articles:publish` consent, with explicit
additional image and private Melee permissions. Keep `decks:read` for private
deck contents. Existing card-only connections remain card-only. Recheck live
consent, session, bans and creator membership. Meter tools by user/client/outcome
without storing prose, credentials or image payloads in telemetry. Make mutation
retries safe and keep request/result sizes bounded.

MCP retains its own Drizzle client. Reuse the application's transactional domain
services through explicit dependencies and narrow database grants. No Better Auth
package upgrade is planned. Preserve image quotas and external-service controls.

## Delivery sequence

1. Shared input/output contracts, authoring discovery, scopes and consent labels.
2. Reusable article services with explicit database/catalog dependencies.
3. Reading, draft creation/duplication, metadata and atomic content editing.
4. Template preparation/application, reference lookup and image upload/library.
5. Publication, revision history/restoration and previewed personal transfers.
6. Integration/browser validation, migrations/sanitization where needed, runtime
   packaging, deployment documentation and independent review.

Required repository skills: `swubase-backend-endpoints`,
`swubase-frontend-api`, `swubase-auth-permissions`, `swubase-architecture`,
`swubase-documentation`, `swubase-validation`, `swubase-change-review`;
`swubase-frontend-components` for consent UI;
`swubase-card-catalog` and `swubase-preview-cards` for catalog provider changes;
`swubase-database-migrations` and `swubase-development-data` for persisted state;
`swubase-worktree-dev` for isolated database/app validation.

## Acceptance

- All four templates and all widget settings produce documents accepted by the
  same schema and editable/renderable in the browser.
- Cross-user reads/writes, revoked membership/consent, stale revisions and changed
  ownership fail safely, including history and retries.
- Draft edits never change the publication until explicitly published.
- Private embedded resources keep their own visibility and aren't copied into
  public documents; public subjects satisfy existing publication rules.
- Image quotas, failed uploads and duplicate retries behave correctly.
- Existing card/deck tools, OAuth flows and the normal article editor still pass.
- Any new user data is covered by sanitized-backup cleanup; restricted-role
  integration tests and independent Claude review pass before handoff.

## Deferred product extensions

Article deletion/trash, archiving, scheduled publication, selected-article
ownership transfers, creator-profile administration and member management.
