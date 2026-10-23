# User image library

Authenticated users manage images at `/settings?page=uploads`. The image library is
private to its owner; image and thumbnail links are public so they can be reused.
The All images tab contains Upload and All images sections; My albums manages
named albums built from these uploads. The image grid starts with the latest 12
images and loads another 12 as the user scrolls, keeping earlier images visible.
A Load more control supports keyboard access, and failed loads have an explicit
retry without clearing the image grid. Uploads and deletions refresh loaded batches.
The upload box accepts file selection and dropped images. Pasting an image while
the Uploads page is open also uploads it; text fields and open dialogs keep their
normal paste behavior. All three methods share validation and sequential uploads.
Profile settings offers Cards and Images tabs for avatar creation. Images can
be selected from this library or uploaded directly from the avatar picker, with
the same optimization and quota enforcement. Header and article editors can
use copied links. Profile headers also have dedicated upload and gallery selectors;
article editors currently use copied links.

## User albums

At `/settings?page=uploads&uploadView=albums`, users create albums with a
title, optional description, cover, and ordered images. A selected album is
stored in the `album` search parameter, so reload and back/forward navigation
preserve the editor. Add existing images uses a paginated multi-select picker;
uploads use the same formats, optimization, quota, drop, and paste behavior as
All images. One upload can appear in several albums and counts toward
storage only once. The upload area is open by default in the editor; the file
picker accepts multiple images. Album screens use the homepage's green palette and rounded panels. My albums
uses a compact header and image-led cards with a Copy link button on every card.
Owners can change privacy directly on these cards and in either album header;
failed changes keep the saved value visible and allow retry. A compact album-link control beside the title opens a
copyable share URL, and image tiles expose labelled icon controls with tooltips.

New albums are **unlisted** by default in the form, API, and database:

- **Unlisted:** anyone with `/albums/<album-id>` can view the album; it is
  absent from profile listings and has `noindex, nofollow` metadata.
- **Private:** only the owner can read the album. Other users and anonymous
  requests receive 404. Copying a private album link does not grant access.
- **Public:** anyone can view it, and it appears in the owner's profile
  Albums tab (`/users/<user-id>?userTab=albums`).

Visibility protects album metadata and discovery. Uploaded image URLs remain
public, including images used in private albums. Changing visibility does
not revoke a previously copied image URL.

The album editor's Event section links an album to one tournament. Search by
name or exact country code (such as `CZ`), or paste a tournament page URL. Linking a private or unlisted
album first asks the owner to **Make public and link**; cancelling changes
nothing. The confirmed update publishes and links the album atomically, subject
to the usual owner and revision checks. All current and future photos in the
album become public. Public albums can be linked directly.

Tournament details show a compact Event photos panel beside the tournament
attributes and event information. It previews the four newest nonempty, public
albums as small cards, two per row, with a cover thumbnail, photographer profile
link, photo count, and a link to the complete album and its image viewer.
View all in the detail panel opens `/tournaments/<tournament-id>/photos`, where
larger album cards include descriptions and load in batches of 12, newest first.
The Photos page is available even before tournament results are imported.
Create album is available in both views, even when no photos have
been shared. It prompts signed-out visitors to sign in, then offers a form
prefilled with the event name. **Create public album** explicitly confirms
public visibility and creates the tournament link in the same transaction,
then opens the album editor to add photos. Ordinary albums still default to
unlisted.
Unlinking preserves the album's photos and public visibility. Choosing Private
or Unlisted automatically removes the tournament link; making it public again
does not relink it. Deleting a tournament clears its album links without
deleting albums or photos. Migration `0087_user_albums` includes the nullable
foreign key, public-only constraint, and tournament listing index.

Owners can edit captions and alt text separately for each album, drag images
into order or use Move earlier/later buttons, and choose a cover. The first image
is the fallback cover; empty albums have a placeholder. The full-image viewer
supports previous/next, arrow keys, Escape, and return focus. Images and album
lists load in batches of 12. Album lists use a creation-time/ID cursor, newest
first, so editing or deleting albums between pages does not shift the remaining
results. New albums ahead of the cursor appear on refresh.

Remove from album asks for confirmation and, by default, deletes only membership
and its caption/alt text. An unchecked “Also delete the uploaded file” option
lets the owner delete the file everywhere instead, with the affected album
count and a warning about broken links and permanent deletion. This option uses
the existing file-deletion operation, so a failed storage deletion preserves the
album membership for retry. Delete album preserves all uploaded images and
their other memberships. Deleting an
upload through All images shows its album count, removes it from every album,
clears explicit cover references, and frees storage once. Storage errors retain
the existing retry behavior. Saved avatar/header copies remain independent.

Admins can remove an album from events on `/tournaments/<id>/photos`. After
confirmation, removal clears its tournament link and persistently blocks that
album from linking to any event. Its privacy, images, and owner access remain
unchanged. Only owner responses include the moderation flag; public album views
do not expose it. The owner's editor explains the restriction; changing privacy or
renaming the album does not clear it. Admin → Tournaments → Album moderation
lists blocked albums and can restore event linking. Restoration does not publish
or relink the album; the owner must choose an event again, with public consent.

`/api/admin/user-albums/blocked` provides a cursor-paginated list with only album
ID, title, revision, creation time, and owner identity, including albums whose
owners have since made them private. It does not expose private album photos.
`POST /api/admin/user-albums/:id/event-link` accepts `{ revision, blocked }` and
requires the existing admin-access permission and `X-Requested-With: swubase`.
Moderation uses the same account/album lock order and revision checks as owner
writes. Migration `0090_album_event_moderation` adds `event_link_blocked` and a
constraint preventing a blocked album from retaining a tournament link. Apply
it before deploying the follow-up API. Album moderation state is removed by the
existing contributor-dump album truncation.

All images and the album editor share `useUserImageUploadQueue` for batch
validation, sequential uploads, progress, overlapping-batch protection, and
cancellation on leaving. Each screen keeps its own success/error presentation.

Uploads into an album use two steps: upload the file, then add its ID to the
album. If the second step fails, the image stays in All images and Retry adding
saved image retries membership without uploading or charging storage again.
The batch stops at that failure and reports how many images were added. Keep in
All images dismisses the pending attachment and allows more uploads. New uploads
wait while another album change or refresh is in progress.
Uploads tabs are disabled during a batch; leaving through another route asks
before stopping it. Once an upload response provides a file ID, the active
album operation finishes its attachment attempt even after confirmed navigation.

`user_album` and `user_album_item` store metadata and memberships. All album
writes take the account's `user_file_storage` row lock before other rows, matching
upload/deletion serialization. Album writes carry an expected revision; stale
edits return 409. File deletion also advances affected album revisions. Next
image pages carry the revision to detect ordering/content changes between pages.
Edit dialogs retain entered text on conflict and offer an explicit action to use
the latest revision before saving again. This refresh updates untouched fields
(including visibility) to values changed in another tab while retaining local
edits. Saving sends only fields changed from that refreshed version. An image
removed or moved beyond the loaded pages keeps its open dialog and unsaved text,
with recovery instructions. Temporary refresh
errors stay inline without discarding open forms or uploads; access-loss responses
still remove the album view.
All JSON responses use `private, no-store` and vary by cookie. Public DTOs omit
private filenames, storage usage, quota, and raw object-key fields. Frontend
queries are scoped by viewer, and album/file mutations invalidate affected
lists, counts, covers, and detail views.

The API is `/api/user-albums`: owner list/create at `/`, public profile listing
at `/by-user/:userId`, visibility-aware read and owner update/delete at `/:id`,
batch attachment at `/:id/images`, and item edit/move/removal at
`/:id/images/:fileId`. Owner-only `/membership` accepts up to 100 comma-separated
file IDs and an optional album ID for picker/deletion information. Mutations
require `X-Requested-With: swubase`. Each attached file must belong to the album
owner; a mixed-owner batch is rejected atomically. Album organization continues
to work when uploads are disabled or the storage quota is exhausted.

Apply `0087_user_albums` with `bun run db-migrate` before deploying the album
API. This single migration creates the final album tables, constraints, cursor
indexes, and tournament link directly. Existing uploads and quota overrides are
unchanged.

The unreleased branch's intermediate migrations `0087_cheerful_nocturne`
through `0090_powerful_luke_cage` were consolidated before release. Development
databases that already applied them need their migration ledger reconciled only
after verifying the final schema matches, or must be recreated from development
data. Do not replay the new table-creation migration over those existing tables.

The canonical page is `/albums/<album-id>`. Existing `/galleries/<gallery-id>`
links redirect to it; older `uploadView=galleries&gallery=<id>` settings links and
`userTab=galleries` profile links still resolve to the Albums views. New navigation
and copied links use the album names. The API contract is `/api/user-albums`, with
`album`, `albums`, and `albumId` fields replacing the former gallery names.
The contributor sanitizer removes all album metadata and memberships, including
public albums and opted-in accounts, together with the upload tables. Its
conditional truncate also supports older dumps with gallery tables or without either feature table.

Both avatar sources use the square crop editor and save a separate 256 × 256
WebP to the existing per-user avatar object in R2. The API accepts either the
existing card/variant/side fields or an owned upload ID, plus crop coordinates;
it never accepts an arbitrary source URL. Avatars require an image of at least
100 × 100 pixels. Switching sources clears the previous source metadata.
`user_avatar.file_id` records provenance without a foreign key so deleting an
upload preserves the saved avatar. The avatar copy is outside the image-library
quota, as with card avatars; an image uploaded in the picker counts normally.
The contributor sanitizer clears all avatar metadata.

Profile settings also offers Battlefield, My images, and Gallery for headers.
Battlefield retains the basic planet display. Images use a rectangular crop with
a minimum 4:1 width-to-height ratio. The height limit is the crop width divided by
four, rounded down: 1500 × 375, 1500 × 300, and 2000 × 500 are all valid. Crops can
be up to 8192 pixels wide. A width of 1500 pixels is recommended; smaller uploads,
gallery images, and crops can be selected and saved with a low-resolution warning.
Sources need at least four pixels of width to form a one-pixel-high 4:1 crop.
Images are never enlarged to meet the recommendation.

Avatars and profile/team headers share `ImageCropCanvas` for framing and corner
resizing. The corner keeps the selected ratio and top-left position while resizing
within the image. Header width and height sliders allow wider ratios; avatar crops
remain square. Controls also support dragging, keyboard sliders, and touch input.
Reducing a header's width automatically reduces an oversized crop height, and older
selections are adjusted to the same ratio when reopened. The API and image processor
enforce that ratio. The initial header selection suggests 1600 × 400 when the source
is large enough. Settings and the public profile display the same complete crop,
scaled to fit their header area. Very short crops are centered in a cover area at
least 96 pixels tall; the displayed area remains at most 400 pixels tall.

Header crop and source policies are validated by the API and image processor.
The database stores header metadata without policy CHECK constraints, so tightening
these rules does not block existing headers or unrelated profile updates. Existing
images remain readable; the crop editor adjusts older selections to current rules
when reopened, and subsequent saves must satisfy the current validation.

Header uploads submit `purpose=header` to preserve 1500 pixels of width in portrait
images that already have it. Smaller sources are accepted and optimized without
enlargement, and existing small library images can also be selected for a header.

Admins manage the shared artwork gallery at `/admin?page=image-gallery`. The
`/api/image-gallery` list is public; uploads and deletion require admin access.
Artwork of any positive dimensions can be uploaded. Its public title is prefilled
from the selected filename without the extension and can be edited before uploading;
successful uploads clear both title and file. Artwork has a public thumbnail, keeps
high-resolution pixels up to 8192 pixels wide, and preserves header-ready width
for tall sources that already have it. Images narrower than 1500 pixels can be
selected for profile or team headers with a low-resolution warning. The gallery uses the
same input formats, metadata removal and 40 MP limit as personal uploads.
The contributor sanitizer removes production gallery references so a local admin
cannot delete production artwork from the shared bucket.

Saved headers are separate WebP objects at
`user-data/<user-id>/headers/<random-uuid>.webp`, outside the library quota.
The API accepts an owned upload ID or gallery image ID plus crop coordinates;
it never accepts an arbitrary source URL. `user_profile` records the source and
crop without foreign keys to the originals, so deleting an original preserves
the header. Replacements and Battlefield resets remove the previous cropped
object after the database update; failed or skipped cleanup logs its exact key
for operator reconciliation. Public header responses contain only source kind,
image URL and dimensions. Private settings include the original choice and crop.
All header metadata is removed by the existing `user_profile` sanitizer.

Team owners can choose My images or Gallery in their team's Settings tab, using
the same ratio, resolution recommendation, and crop controls. Teams have no Battlefield choice;
without a saved image, the existing planet header is displayed. Remove header
image clears the saved crop and restores that default. Owners can select only
their own personal uploads; another owner's original upload is not exposed in
settings. The cropped team header remains visible even if its original is deleted
or its uploader leaves the team.

Team crops are separate WebP objects at `teams/headers/<team-id>/<random-uuid>.webp`,
outside the uploader's library quota. Private source and crop metadata lives in
`team_header`; public responses expose only source kind, image URL and dimensions.
Saves recheck team ownership inside the transaction that publishes the crop.
Replacing or removing an image and deleting a team clean up the cropped object
after the database commit, logging any failed cleanup. The contributor sanitizer
clears team headers and supports older backups without the table.
Team header saves allow five admitted processing attempts per account per minute.
Processing failures count toward that bound; requests rejected because another
image operation is busy do not. Team deletion is independent of image admission.

The server decodes JPEG, PNG, WebP, and still GIF uploads of at most 10,000,000
bytes and 40 million pixels. Animated images and SVG are rejected. It applies
orientation, strips embedded metadata (including EXIF/GPS), resizes within
2560 × 2560 without enlargement, and encodes WebP at quality 82. Header-purpose
uploads may keep a taller result to preserve their recommended width, and their
processed source must also fit within 10 MB. Image previews
fit within 400 × 400 at quality 75. Originals are not retained. Each server process allows two uploads and two deletions at once, with at most
one mutation per account; additional requests receive HTTP 429. Upload bodies
have a 60-second deadline, after which the input stream is cancelled (HTTP 408).

## Storage and configuration

All environments, including local development, use the existing `swu-images`
R2 bucket and `https://images.swubase.com` public domain. There is no local
storage mode or environment-dependent delivery path. Configure the existing
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` values for uploads
and deletion. Missing credentials disable those mutations; public image links
still work.

New objects use `user-files/<user-id>/<random-uuid>.webp` and
`user-files/<user-id>/<random-uuid>-thumb.webp`. The user ID is encoded as one
path segment; generated file IDs prevent filename collisions. The original
filename stays in the database for display. Image bytes contain only re-encoded
pixels, with no embedded user ID or original filename. Upload and image-library
responses include direct bucket URLs for both sizes. Viewing images and copying their links involves
no per-image API request or database lookup. Uploading, listing metadata/usage,
and deleting still use the authenticated API.

`user_file.image_key` and `thumbnail_key` store the actual R2 object keys.
Image-library links, compatibility redirects, avatar source lookup, and deletion all
use these saved keys, including any legacy flat `user-files/<uuid>` paths already
stored in development databases. Migration `0069_user_files` creates the upload
tables with required keys and extends avatar metadata to accept uploaded images.
Apply it when deploying the updated backend. The sanitizer removes these paths
along with the rest of each upload record.

Previously copied API image URLs remain compatible: they check the record and
redirect to the bucket. Cloudflare supports caching on a
[custom domain connected to R2](https://developers.cloudflare.com/r2/buckets/public-buckets/#caching).
Cache lifetime is five minutes; copies already fetched can remain visible after
deletion. Development uploads use the same public bucket, under unique image
IDs; worktree database isolation does not isolate these objects.

Back up the database and object storage together. Account deletion cascades the
metadata; operators must remove corresponding objects when deleting an account
outside the library. Failed upload cleanup is logged with the generated image ID
for operator reconciliation; a process crash during an upload can also leave an
unreferenced object. Normal image deletion retains the record on storage errors
so the owner can retry; a partially completed deletion can leave a missing preview
or image until that retry succeeds.

## Quotas

`user_file_storage` persists an entitlement per account, provisioned on first
library use with a database default of **100,000,000 bytes (100 MB)**. Users
cannot edit it through the settings API. Increase an individual user's quota
using an operator database change, for example:

```sql
INSERT INTO user_file_storage (user_id, quota_bytes)
VALUES ('<user-id>', 500000000)
ON CONFLICT (user_id) DO UPDATE SET quota_bytes = EXCLUDED.quota_bytes;
```

Usage is computed from the optimized image plus its stored preview in
`user_file`; original size is informational. Uploads lock the entitlement row
through the usage check, object writes, and metadata insert to prevent
concurrent overspending. Deletions take the same lock. Lowering a quota below
usage stops new uploads but keeps existing images readable and deletable.
The quota is independent of private tournament attachments.

The public contributor-dump sanitizer removes all image records, filenames,
and storage entitlements, including those belonging to opted-in accounts.

## Validation

Run against the isolated worktree database:

```bash
USER_FILES_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-files
USER_ALBUMS_DB_TEST=1 USER_FILES_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-albums server/lib/user-files server/routes/user-files-client.test.ts
USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-albums.browser.ts
USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/album-tournaments.browser.ts
USER_ALBUMS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/album-followup.browser.ts
USER_UPLOADS_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-uploads.browser.ts
USER_HEADER_DB_TEST=1 IMAGE_GALLERY_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/user-header server/lib/image-gallery server/routes/user/header.test.ts server/routes/image-gallery.test.ts
USER_HEADER_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/profile-header.browser.ts
TEAM_HEADER_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/team-header server/routes/teams/_id/header
TEAM_HEADER_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/team-header.browser.ts
bun run --cwd frontend build
bun test frontend/src/components/app/global/imageCropGeometry.test.ts
```

The integration tests use in-memory object storage and cover ownership,
public image access, quota races and overrides, upload/delete failures,
pagination, and the sanitizer's cleanup/assertion. No external bucket is used.
The browser test requires the worktree app to be running. It creates and cleans
up a temporary local account and mocks upload responses and image delivery. It
covers file selection, multi-file drops, native clipboard paste, busy/quota
guards, error recovery, page cleanup, and desktop/mobile layouts without R2 writes.
It also covers incremental gallery loading, later-batch failures, and refreshing
multiple loaded batches after uploads and deletions, plus initial-load recovery
and keyboard focus through loading and the final batch.
