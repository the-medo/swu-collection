# User albums implementation plan

Status: approved plan, implemented on branch `feature/user-gallery`.
Renamed throughout the feature from galleries to albums, with compatibility for
existing page links. The release uses one migration, `0087_user_albums`, which
creates the final schema directly.
Prepared against `107be85f`. See [user-files.md](user-files.md#user-albums)
for the maintained behavior and validation commands.

Implementation refinement: album lists use an immutable creation-time/ID
cursor and matching indexes, instead of paging by mutable update time. This
keeps edits and deletions between pages from skipping or duplicating albums.

The album screens now follow the homepage's visual style, with uploads visible
by default, a share control beside the title, and compact image controls. Removing
an image requires confirmation and offers an unchecked option to delete the
uploaded file everywhere. See the maintained behavior linked above.

## Outcome and proposed scope

Users can create named albums from their existing image library, upload new
images into an album, arrange them, and share selected albums from their
profile or by link. All uploads continue to use the account's existing storage
allowance, normally **100,000,000 bytes (100 MB)**.

Confirmed sharing choice: owners can choose **private, unlisted, or public**
visibility for each album, with **unlisted as the default** for new albums.
The existing account quota is preserved. The following scope was approved for
implementation:

- An album has a title, optional plain-text description, cover image, and
  ordered images. Images can have an album-specific caption and alt text.
- One image can belong to multiple albums without another upload or another
  quota charge. Images can also remain outside every album.
- Albums start unlisted. Owners can make them private or public.
- Private albums are readable only by their owner. Unlisted albums are
  readable by anyone with their link but absent from profile listings. Public
  albums are readable by everyone and listed on the owner's profile.
- Album deletion removes organization and captions, preserving uploaded files.
  Removing an image from one album also preserves the file and other albums.
- Deleting the underlying upload removes it from every album and frees its
  storage once. This is a separate, explicitly labelled destructive action.

The first release covers images already accepted by the upload library.
Collaboration, nested albums, comments/likes, global album discovery,
videos/documents, quota purchases, and article embeds are outside this plan.

## Verified starting point

| Existing behavior                                                                                                                      | Source                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The account default is 100 MB; each input image is limited to 10 MB.                                                                   | [`types/UserFile.ts`](../types/UserFile.ts)                                                        |
| `user_file_storage` owns the account entitlement; `user_file` owns image metadata and saved object keys.                               | [`server/db/schema/user_file.ts`](../server/db/schema/user_file.ts)                                |
| Quota usage sums optimized image and thumbnail bytes. Uploads and deletions lock the account entitlement to serialize storage changes. | [`server/lib/user-files/service.ts`](../server/lib/user-files/service.ts)                          |
| Library management requires authentication and ownership. Image links themselves are public.                                           | [`server/routes/user-files.ts`](../server/routes/user-files.ts)                                    |
| Uploads settings supports selection, drops, paste, sequential uploads, and batches of 12 images.                                       | [`UploadsSettings.tsx`](../frontend/src/components/app/pages/settings/uploads/UploadsSettings.tsx) |
| The existing `image_gallery` is public artwork maintained by admins.                                                                   | [`docs/user-files.md`](user-files.md)                                                              |
| User profile sections use the `userTab` search parameter.                                                                              | [`users/$userId/index.tsx`](../frontend/src/routes/users/$userId/index.tsx)                        |
| Contributor dumps remove all user uploads and storage entitlements, regardless of opt-in.                                              | [`001-core-data.sql`](../scripts/remote-dev/sql/001-core-data.sql)                                 |

User albums should reference `user_file`. The admin artwork gallery remains
a separate resource. No existing upload needs to move, be copied, or become
publicly listed during migration.

**Privacy boundary:** private/unlisted controls access to album metadata and
discovery, not access to the stored image bytes. Anyone who already has a direct
image URL can still view it. Explain that beside visibility controls. Genuine
private image delivery would require a separate storage/access design and is
not provided by this proposal.

## User experience

1. Keep `/settings?page=uploads` as the entry point. Rename its existing image
   grid to **All images** and add a **My albums** view, with the account-wide
   usage meter visible in both. Use validated settings search parameters for
   the selected view and album so reload/back navigation preserve context.
2. **Create album** asks for a title and optional description, defaulting to
   unlisted. Open the album editor after creation.
3. **Add existing images** opens a paginated multi-select picker of the owner's
   uploads. Mark images already included. **Upload images** reuses the existing
   dropzone, paste rules, formats, optimization, progress, and quota errors.
4. Let owners rename the album, edit its description, choose a cover, edit
   captions/alt text, and reorder images. Provide keyboard move controls as
   well as drag-and-drop. The first image is the fallback cover; an empty
   album uses a placeholder.
5. Provide a responsive image grid and accessible full-image viewer with
   previous/next controls, captions, Escape-to-close, and focus restoration.
   Load thumbnails first and full images on demand.
6. Add **Albums** to the user profile using `userTab=albums`. Visitors see
   public albums only; owners get a link to manage all their albums.
   Each album has a stable `/albums/$albumId` view URL. Private view URLs
   require the owner; unlisted/public URLs work without signing in.
7. Keep **Remove from album**, **Delete album**, and **Delete uploaded image**
   distinct. The last confirmation identifies the affected album count.
   Deleted covers fall back gracefully; the account quota remains visible even
   when uploads are full or unavailable.

## Data and integrity

Add declarative schemas under `server/db/schema/` and shared DTO/Zod contracts
under `types/UserAlbum.ts`.

| Table               | Proposed fields and constraints                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_album`      | UUID `id`, `user_id` FK with account-delete cascade, title, description, visibility (`private`, `unlisted`, `public`; default unlisted), nullable `cover_file_id`, creation/update timestamps, integer revision. Index owner + creation time + ID; support public-owner listings. |
| `user_album_item` | `album_id` and `file_id` FKs with delete cascades; composite primary key prevents duplicate membership; nonnegative position, optional caption and alt text. Index album + position + file ID for reading and file ID for deletion/reference lookup.                         |

Keep the cover FK nullable with `ON DELETE SET NULL`; enforce that an explicit
cover is a current album member. Removing the cover membership clears the
choice in the same transaction. Use position plus file ID as deterministic
ordering, allowing gaps after deletion.

All membership and cover mutations verify that the authenticated user owns both
the album and every referenced file. Reject a mixed-owner batch atomically;
do not accept arbitrary URLs, client-supplied owner IDs, or admin-gallery IDs.
Enforce these checks inside the write transaction, with a consistent lock order
compatible with the existing account quota/file deletion locks. Exercise
concurrent deletion, membership changes, and reordering in database tests.

Use an album revision to reject stale edits/reorders with 409 and refetch rather
than silently overwriting changes from another tab. Underlying file deletion
must also update revisions/timestamps of affected albums in its transaction.
Reorder requests must contain exactly the current members, once each; a
paginated editor submits a bounded move operation instead of treating its loaded
page as the whole album.

Usage remains calculated from `user_file`, never from album joins. Organization
remains available when the account is at or above quota. No new R2 objects are
needed for album creation, covers, reordering, or sharing.

Generate an additive migration with `bun run db-generate`; review its SQL,
snapshot, and journal together following [`docs/migrations.md`](migrations.md).
Existing uploads remain unassigned. Preserve per-user quota overrides.

## Backend and API

Create a `user-albums` route family registered in `server/app.ts`, backed by
`server/lib/user-albums/`. Proposed endpoints:

| Endpoint                                        | Access and behavior                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/user-albums`                       | Authenticated owner; paginated list of all their albums, counts, and covers. |
| `POST /api/user-albums`                      | Authenticated owner; create an unlisted album by default.                     |
| `GET /api/user-albums/by-user/:userId`       | Public; paginated public albums only.                                        |
| `GET /api/user-albums/:id`                   | Visibility-aware album metadata and one image page.                           |
| `PATCH /api/user-albums/:id`                 | Owner; edit metadata, visibility, and cover with expected revision.             |
| `DELETE /api/user-albums/:id`                | Owner; delete album and membership records only.                              |
| `POST /api/user-albums/:id/images`           | Owner; bounded batch of existing file IDs, idempotent membership addition.      |
| `PATCH /api/user-albums/:id/images/:fileId`  | Owner; edit caption/alt text or move relative to another member.                |
| `DELETE /api/user-albums/:id/images/:fileId` | Owner; remove membership only.                                                  |

Validate UUIDs, lengths, pagination, batch sizes, visibility, and revision using
shared Zod contracts. Suggested text bounds are 120 characters for titles,
2,000 for descriptions, 500 for captions, and 300 for alt text. Return safe
errors using the existing `{ data: ... }` convention for successes. Require the
existing mutation request-origin header and server-side ownership checks.
Conceal inaccessible private albums with 404; reject unauthenticated owner
mutations with 401.

Public responses contain only album display data, owner public identity, image
URLs, dimensions, and captions/alt text. Do not reuse the complete private
`UserFile` DTO: filenames, storage usage, entitlements, and object-key fields
must not be included. Do not derive public captions from private filenames.

Start album JSON responses with `Cache-Control: private, no-store` and
`Vary: Cookie`, including errors, so visibility changes cannot leave public API
cache entries serving private metadata. Exclude unlisted/private albums from
discovery and indexing; `noindex` is supplementary and never authorization.
Raw image URLs retain their current delivery and cache behavior.

For upload into an album, use the existing upload endpoint followed by the
membership endpoint. If uploading succeeds but attachment fails, keep the image
in All images, explain the partial success, and retry attachment by file ID.
Do not upload the same image again merely to retry membership. For mixed batches,
report completed images and the failed step accurately.

Extend the existing file-delete flow for album cleanup/reference reporting
while preserving its storage-error retry behavior. A failed object deletion
must not commit membership removal or release quota prematurely.

## Frontend state and compatibility

- Add typed hooks and a query-key factory under
  `frontend/src/api/user-albums/`. Keys include viewer identity, owner/album
  IDs, and page/order inputs as applicable. Keep owner/private results out of
  anonymous query keys; clear inaccessible data on sign-out and visibility change.
- Album edits refresh the editor, album cards, and public profile listing.
  File deletion also invalidates album membership, counts, covers, and detail
  views alongside existing upload/usage queries. Refresh loaded pages after
  reordering or membership changes, with retry and keyboard-accessible Load more.
- Extract only the upload/grid/picker behavior needed by both screens. The
  existing avatar/header pickers continue selecting `user_file` records; adding
  album filters to those pickers can be a later improvement.
- Keep server data in TanStack Query; this feature does not need a Dexie schema
  or localStorage cache. Keep view selection in route search state.
- Use existing forms, dialogs, semantic theme tokens, and loading/error/empty
  states. Let the router plugin regenerate `routeTree.gen.ts` during build.

## Contributor data and delivery order

1. **Contracts, schema, migration, sanitizer:** create the two tables and update
   `scripts/remote-dev/sql/001-core-data.sql` in the same delivery. All album
   titles, captions, visibility, and memberships are removed, even for public
   albums and opted-in users. Include every referencing table in the same
   explicit `TRUNCATE` statement as `user_file`; truncating child tables first
   does not satisfy PostgreSQL's FK requirement. Support older dumps without
   the new tables and add post-sanitization assertions. Update the existing
   upload sanitizer test that matches the old truncate statement exactly.
2. **Backend:** implement owner CRUD, visibility-aware reads, membership,
   ordering/cover invariants, and file-deletion integration. Preserve the upload
   service's quota accounting and failure recovery.
3. **Owner UI:** implement management, existing-image selection, uploads,
   caption/alt-text editing, cover choice, and accessible ordering.
4. **Sharing and profile:** implement album viewing, the profile tab, visibility
   controls, and copy-link behavior. Private albums have no share action.
5. **Verification and documentation:** run the checks below, review the source
   changes independently, and update `docs/user-files.md` with the shipped
   behavior. Apply the migration before deploying code that queries the tables.

Implementation skills to load: `swubase-database-migrations`,
`swubase-development-data`, `swubase-backend-endpoints`, `swubase-frontend-api`,
`swubase-frontend-components`, `swubase-frontend-routing`, `swubase-validation`,
and `swubase-change-review`. Use `swubase-worktree-dev` for the local app/database
and `swubase-documentation` for the behavior guide. Existing ownership checks
are sufficient; add `swubase-auth-permissions` only if auth policy/helpers change.

## Acceptance and verification

- Creating an album without an explicit visibility produces an unlisted
  album in the form, API, and database. It is accessible by link and absent
  from public profile listings.
- A user creates two albums and adds the same upload to both; usage is
  unchanged. Reuploading a separate file still consumes storage normally.
- Album removal and membership removal preserve files and quota usage.
  File deletion removes all memberships, repairs covers, and frees storage once.
  Failed storage deletion preserves retriable metadata and accounting.
- Users cannot read another user's private album or mutate their albums,
  images, cover, ordering, or captions, including mixed-owner batch requests.
- Anonymous visitors can read public/unlisted links, but public profile listings
  contain only public albums. Visibility changes remove access on subsequent
  requests and do not leave cached owner-only data exposed.
- Uploading respects quota overrides, full-account behavior, format/size limits,
  and simultaneous requests. A failed membership step can be retried without
  reuploading or increasing usage.
- Ordering and covers survive refresh. Stale writes receive a recoverable
  conflict; concurrent deletion cannot create dangling references.
- Public DTOs contain no filenames, quota information, or private library data.
  Sanitizer fixtures remove all albums/uploads and work with older schemas.
- Mobile/desktop, light/dark, keyboard interaction, lightbox focus, direct links,
  back/forward navigation, pagination, and empty/error states work. Existing
  upload, avatar, header, and admin-artwork flows remain compatible.

Run new focused service/route and browser tests using the existing upload test
patterns and in-memory/mock image storage, without external R2 writes. Rerun
`server/lib/user-files` and `server/routes/user-files-client.test.ts` checks for
changed upload/delete behavior. Run `bunx drizzle-kit check
--config=drizzle.config.ts`, `bun run db-migrate` against this worktree database,
`bun run --cwd frontend build`, focused frontend ESLint, and `git diff --check`.
Before implementation handoff, complete the read-only local Claude Code review
required by `swubase-change-review`, or report why it could not run.
