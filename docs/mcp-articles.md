# Article authoring through MCP

The [approved plan](mcp-articles-plan.md) extends the separate MCP service with
22 tools. Articles use the same native document, permissions, publication rules,
templates and image pipeline as Creator Studio. MCP has its own Drizzle pool;
shared services receive that connection explicitly.

## Tools and permissions

Every connection still needs `cards:read`. Additional scopes must exist in both
the access token and live consent. Existing card-only clients keep working; a
scope challenge requests the permissions needed for the attempted operation.

| Tools                                                                             | Additional scopes                                                                                    | Behaviour                                                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `get_article_workspace`, `get_article_authoring_guide`                            | `articles:read`                                                                                      | Discover identity, managed creators, native schemas, classifications and examples.                                   |
| `list_articles`, `get_article`                                                    | `articles:read`                                                                                      | Search accessible workspaces; read draft, publication or retained revision as native JSON, readable text or outline. |
| `create_article`                                                                  | `articles:read`, `articles:write`                                                                    | Create a draft; optionally duplicate an accessible article or import its native document.                            |
| `update_article`, `edit_article_blocks`                                           | `articles:read`, `articles:write`                                                                    | Patch metadata, explicitly replace the body, or atomically insert/replace/move/remove blocks.                        |
| `list_article_revisions`, `compare_article_revisions`                             | `articles:read`                                                                                      | Inspect retained history, changed metadata keys and block outlines. Read individual versions for exact differences.  |
| `restore_article_revision`                                                        | `articles:read`, `articles:write`                                                                    | Save an old version as a new draft.                                                                                  |
| `validate_article`                                                                | `articles:read`                                                                                      | Validate proposed fields or a saved draft without writing; return publication blockers and widget warnings.          |
| `publish_article`, `unpublish_article`                                            | `articles:read`, `articles:publish`                                                                  | Explicitly publish the saved revision or remove its public snapshot.                                                 |
| `preview_article_transfer`, `transfer_personal_articles`                          | Read; transfer also needs write                                                                      | Preview then move **all** personal articles to a creator owned by the user.                                          |
| `search_article_assets`                                                           | `articles:read`; own private deck lookup also needs `decks:read`                                     | Find cards/variants, deck/pool/album summaries, users, sets, tournaments and groups.                                 |
| `list_article_templates`, `get_article_template_meta`, `prepare_article_template` | `articles:read`; deck contents also need `decks:read`; personal tournament reports need `melee:read` | Preview templates and source data without saving.                                                                    |
| `list_article_tournaments`                                                        | `articles:read`, `melee:read`                                                                        | Read connected Melee history; explicit refresh respects the existing cooldown.                                       |
| `list_article_images`                                                             | `images:read`                                                                                        | Browse the user's image library and quota.                                                                           |
| `upload_article_image`                                                            | `images:write`                                                                                       | Upload, optimize and store an image within the user's quota.                                                         |

The authenticated user and OAuth client come from the verified request, never
tool arguments. Creator membership is checked on every access, including retry
receipts. Personal articles belong to their author. Creator articles follow the
existing owner/member policy; transferring personal articles requires ownership
of the destination creator.

## Authoring workflow

1. Read `get_article_workspace` and `get_article_authoring_guide`.
2. Find the source deck/event/cards with the discovery tools. Choose a blank or
   data-filled `deck-guide`, `tournament-report`, `limited-guide` or `meta-report`
   using `prepare_article_template`. It returns suggested title, references,
   content and selectable section IDs; unknown Melee data remains writing prompts.
3. Pass the prepared body/title/references to `create_article.fields`. Choose
   `creatorId: null` for a personal draft, or a managed creator UUID.
4. Use `get_article` to read the saved draft and its current `revision` and
   `ownershipRevision`. Every edit/publish/restore supplies these as
   `expectedRevision` and `expectedOwnershipRevision`.
5. Save metadata patches or atomic block operations, then `validate_article`.
   Follow the returned `editorUrl` to review the article visually in Creator Studio.
6. Call `publish_article` only when the user requests publication, using the saved
   revision. Draft saves and restores leave the published snapshot unchanged.

Each mutation requires a new UUID `requestId`. Retry a failed/lost response with
the **same UUID and identical arguments**. Reusing it with different arguments
returns a conflict. After a stale content/ownership conflict, reread, reconcile,
and submit the new operation with a new UUID. Receipts are scoped to user and
client and committed atomically with the database mutation.
See [tool errors](mcp.md#tool-results-and-errors) for structured error codes and
retry guidance. Conflicts require reconciliation; temporary failures allow
retrying the same operation.
Receipts retain only hashes and minimal result IDs/revisions until account
deletion; there is no time-based expiry that could turn a delayed retry into a
duplicate operation. Automatic receipt compaction is deferred.

Metadata patches preserve omitted fields. Supported fields include title,
summary, cover, language, tags, associated subjects, original URL, relevance,
freshness, season, series/order, sponsorship and creator pinning. The discovery
schema is the authoritative list and supplies valid limits/enums.

Native bodies use `{ "version": 1, "blocks": [...] }`. Agents may omit block IDs,
empty props/children and text styles. For SWUBASE blocks/inline insertions they may
use `widget: { "kind": "…", ...settings }`; the service encodes the native
`props.data` representation. All ten widget kinds and settings are supported:
card image/link/group, decklist, pool, album, mention, matchup, meta analysis and
callout. Matchup notes accept nested native content.

`edit_article_blocks` applies all operations together. Insertion accepts a
`parentId` (null for the root) and optional sibling `beforeId`. Replacement keeps
the target ID and preserves omitted children/props; explicitly supplied content
replaces that block's content. Moving into a descendant, duplicate IDs or invalid
anchors fail without a partial save. Whole-body replacement is explicit through
`update_article.fields.body`.

Native JSON exports can be supplied as `create_article.importDocument`. Readable
text has explicit widget fallbacks and is not a lossless import format. History
follows the application's existing retention policy, not an unlimited archive.

## Visibility, images and limits

Asset discovery includes active preview cards for authoring; existing
`search_cards`/`get_cards` retain their official-only contract. Unlisted assets are
discoverable only by exact ID. Own private deck summaries need deck consent;
private pools/albums expose summaries, not card contents. Embedded resources keep
their own access controls. Public associated subjects must satisfy the existing
publication rules; `validate_article` also warns about unavailable widget targets.
MCP caches the merged catalog for up to 30 seconds, coalescing concurrent refreshes;
the main app retains its existing explicitly invalidated catalog cache.

Image uploads accept standard base64 JPEG, PNG, WebP or still GIF, at most 10 MB
decoded. Use `purpose: "header"` for covers. The shared optimizer strips metadata,
checks actual image data and produces WebP plus a thumbnail. URLs are public;
quota belongs to the authenticated user. Failed uploads clean up object writes,
and retry receipts avoid duplicate images. Clients must support the resulting
base64 request size; uploading through the browser and using `list_article_images`
is also supported.

Article bodies are limited to 256 KB, 500 blocks and eight levels. Ordinary MCP
requests are limited to 350 KB; upload requests to 14 MB; tool output to 700 KB.
Lists are paginated, normally capped at 25. Oversized output fails explicitly;
use outline/readable output or narrower selections. Existing per-user admission
limits apply across tools and clients. Usage records contain tool, outcome,
duration and count, without article prose, image payloads or credentials.

## Rollout

Follow [MCP deployment](mcp.md). Deploy the updated sanitizer and main app first,
verify migration `0089_mcp`, then
reapply `mcp/deploy/grants.sql` before deploying MCP. Existing installations also
need these grants. The additive migration includes the receipt table and restricted
functions; existing account/article data is not rewritten. No packages or Better
Auth version change in this feature.

The restricted role can write article/history/image/cache/receipt records, but
cannot update account roles or storage allowances. Fixed-search-path functions
provide row locking and default quota initialization, with execution revoked from
PUBLIC and granted only to the MCP role. Sanitized backups remove receipts.
Optional R2 upload credentials belong on the separate MCP application; OAuth
provider credentials remain on the main app.

Deletion/trash, scheduling, archiving, selected-article transfers and creator/member
administration are outside this release.

## Verification

Run the focused typecheck/unit tests with `bun run mcp:check`. Against an isolated,
migrated worktree database, run:

```bash
SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test mcp/oauth.db.test.ts mcp/articles
SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test mcp/sanitization.db.test.ts
```

With the worktree app running, the browser checks cover consent and an MCP-created
article containing every widget, a Creator Studio edit, native document round-trip
and preservation of the published snapshot:

```bash
SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/scripts/mcp-auth-smoke.ts
MCP_ARTICLE_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/mcp-articles.browser.ts
```

These checks use synthetic users and remove their fixtures. Image integration
uses mock object storage plus the real optimizer; no production upload is needed.
