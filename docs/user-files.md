# User image library

Authenticated users manage images at `/settings?page=uploads`. The gallery is
private to its owner; image and thumbnail links are public so they can be reused.
Upload and Gallery are separate sections. The gallery starts with the latest 12
images and loads another 12 as the user scrolls, keeping earlier images visible.
A Load more control supports keyboard access, and failed loads have an explicit
retry without clearing the gallery. Uploads and deletions refresh loaded batches.
The upload box accepts file selection and dropped images. Pasting an image while
the Uploads page is open also uploads it; text fields and open dialogs keep their
normal paste behavior. All three methods share validation and sequential uploads.
Profile settings offers Cards and Images tabs for avatar creation. Images can
be selected from this library or uploaded directly from the avatar picker, with
the same optimization and quota enforcement. Header and article editors can
use copied links. Profile headers also have dedicated upload and gallery selectors;
article editors currently use copied links.

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
processed source must also fit within 10 MB. Gallery previews
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
pixels, with no embedded user ID or original filename. Upload and gallery
responses include direct bucket URLs for both sizes. Viewing images and copying their links involves
no per-image API request or database lookup. Uploading, listing metadata/usage,
and deleting still use the authenticated API.

`user_file.image_key` and `thumbnail_key` store the actual R2 object keys.
Gallery links, compatibility redirects, avatar source lookup, and deletion all
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
