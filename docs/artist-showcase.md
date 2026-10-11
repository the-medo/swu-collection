# Artist showcases and profile transfers

`/artists` opens with a full-width collage of rotated, overlapping artwork from
ten artists, featuring recognizable characters and ships above the centered title
"The art of Star Wars: Unlimited". Exact printings are curated in
`artistDirectoryHelpers.ts`; their credits resolve to the canonical artist profiles.
Crops stay at or below their native size and wrap on smaller screens. Each
tile links to its artist and reveals the artist's name on hover or keyboard
focus; names remain visible on narrow/touch screens. The collage stays stable
while filtering or sorting the directory below it.

Directory sorting supports name A–Z, name Z–A, most distinct cards and most
printings, with names breaking count ties. `artistDirectorySearch` and
`artistSort` keep search/sort choices in the URL for refresh and Back/Forward.
Invalid sort values fall back to name A–Z.

`/artists` lists artists with cropped card-art previews; `/artists/$artistKey` displays
featured artwork, available biography and public links, and the complete gallery
for the artist's reviewed credits. Empty biography sections are hidden.
Galleries omit treatments whose
names contain `Foil`, `Hyperspace` or `Serialized` (case insensitive). Other
printings, including Showcase, Prestige and alternate-art promos, remain.
Artist-filtered card search selects a printing matching the artist, set and
treatment filters together.

Gallery search matches card names and titles. Set and treatment filters combine
on the same printing; their `artistSearch`, `artistSet` and `artistTreatment`
URL parameters survive refresh and browser navigation. Unknown set/treatment
values produce an empty result with a clear-filters action.

Click an artwork image to enlarge it. The viewer supports previous/next buttons,
Left/Right arrow keys, Escape to close, and flipping cards with a back image.
The card-name link and the viewer's "View card details" action open the exact
printing. `artistArtwork` identifies the selected card/variant pair, including
artwork beyond the first gallery page, so viewer links can be shared. Closing
restores focus to the launching button or the gallery heading for direct links.
Closing a viewer opened from the gallery goes back to that gallery history
entry; closing a shared viewer link stays on the current gallery. Back/Forward
also open and close the viewer, and refresh preserves that behavior.

## Data model

`artist` stores a stable normalized catalog-credit `key`, editable display
`name`, optional `biography`, and timestamps. `artist_link` stores ordered
label/URL pairs and cascades when its artist is deleted. These are public
editorial tables, without user/account relationships. They remain in sanitized
development dumps.

`artist_alias` maps an existing credit-profile key to a canonical profile key.
Both foreign keys cascade when their referenced profile is deleted. Transfers
reject self-links, cycles, chains, missing profiles and conflicting assignments.
No card or printing identity changes, and alias profiles and their editorial
data remain stored. The canonical page combines family links without duplicate
URLs and prefers the canonical biography, falling back to a family biography.

Keys normalize Unicode, case and whitespace, but preserve accents and punctuation.
Amélie Hutt redirects to the canonical Axel Hutt gallery.
Only explicitly reviewed aliases share a gallery; matching display names never
merge identities automatically. Old credit URLs redirect to the canonical page
while retaining filters and selected artwork. Original card credits remain on
each artwork and in the header's expandable credit list. Unreviewed associations
keep their separate profiles. Researched profiles use the explicit `name` in
their research entry. Directory search also matches original credits, including
aliases whose only printings are hidden. If profile metadata cannot be loaded,
the directory falls back to catalog names and separate credit galleries with
an error message and retry action. It waits for the initial identity request
before rendering tiles, so aliases do not briefly appear as separate artists.
The directory omits credits with no remaining artwork; their direct URLs still work.
The card catalog supplies artist/card relationships; profiles need
not be seeded for new catalog artists to have working showcase pages.

## Artist data and research archive

Artist profiles, biographies, links and alias mappings live in the database.
Portable snapshots live in R2; the application does not bundle an artist dataset.
The original research and generated profiles are archived outside Git:

- [Research notes and source citations](https://images.swubase.com/artist-research/2026-10-11T13-34-20-127Z-689b4265-d20d-4c76-8a31-ec594934a929/research.json)
- [Original generated profile export](https://images.swubase.com/artist-research/2026-10-11T13-34-20-127Z-689b4265-d20d-4c76-8a31-ec594934a929/profiles.json)

Both files are in the `swu-images` bucket under
`artist-research/2026-10-11T13-34-20-127Z-689b4265-d20d-4c76-8a31-ec594934a929/`.
Their downloaded contents were verified against the original files before removal.
Research SHA-256: `69a0ebca5c865804104f7cbd0cc407299df704cf03741205c2ffdfc88adbfdcc`.
Profile export SHA-256: `042d40e60ef96b0e98898990f7c416f9badd547d4f8504adf64493a974783d43`.

The research records the date, credit spellings, public sources, queries,
unresolved identities, and reviewed alias decisions. It is reference material,
not an importable profile snapshot. The archived profile export can be downloaded
and uploaded through **Upload JSON to R2** if needed. It preserves the original
seed values; the current database snapshot includes subsequent editorial choices.

To update artist metadata, **Download JSON** from the environment whose data you
want to edit. Edit names, biographies, ordered links or explicit aliases, then
**Upload JSON to R2**, preview the selected snapshot and apply it. There is no
profile editor in the app yet. Version 2 exports include aliases. Version 1
files remain importable and never change existing aliases, even in replacement
mode. Default merge preserves existing names, biographies, link labels and order,
adds new URLs, and fills missing biographies. Use replacement mode deliberately
to change or remove existing values.

The preview also lists alias additions, removals and changed targets. Merge adds
new reviewed mappings but refuses to reassign an existing alias. Version 2
replacement mode replaces aliases only for credit keys included in the file; an empty
alias list removes mappings for those included keys. References outside the file
remain and are validated together with the proposed mappings before any writes.
Reversing an older Amélie/Axel mapping requires both profiles in a scoped
replacement mode import, with only Amélie pointing to Axel in its alias list. Use the
current database export for those two profiles to preserve their editorial data.

To correct a name that was already imported (including an earlier research file),
preview a replacement mode import and apply it after checking the included profiles.
Merge deliberately preserves stored names. Export first if those profiles have
editorial changes you need to retain; replacement also replaces their links and
biographies.

## Administration and release to production

Open **Administration → Cards → Artist showcase** (`/admin?page=artists`).
All transfer endpoints require an administrator session. The page shows counts
for the current environment and provides:

- **Publish database to R2**: exports the current profiles, links and merged
  credits to a new snapshot.
- **Upload JSON to R2**: validates and uploads a locally edited JSON export.
- **Download JSON**: downloads the current database as an editable export.
- **Preview import**, then **Apply import**: imports a selected R2 snapshot
  into the current environment.

To initialize artist metadata in a fresh environment, run its migrations and
preview/apply an R2 snapshot in merge mode. R2 configuration is required for
imports; database JSON downloads remain available without it. The old transfer
CLI and research generator are removed; the isolated integration-test helper
remains under `scripts/artists/`.

### R2 configuration

Set these server environment variables in development and production:

```dotenv
ARTIST_EXPORT_BUCKET=swu-images
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

The current setup uses `swu-images/artist-profiles/`; use the same bucket in
development and production. This bucket is served publicly at `images.swubase.com`,
so snapshots and research archives are publicly downloadable by URL and contain
only public artist information. These R2 variables are shared with image uploads and other existing features: preserve their access
to existing buckets and grant access to the artist snapshot bucket as well.
Publishing requires read/write access; listing and importing require read access.
Do not replace the shared production token with one restricted to artist snapshots
or read-only access, because that would break other uploads. The page detects
missing configuration; permission failures are reported when an operation runs.
No credentials or bucket defaults are committed. Do not copy server-only backup
credentials into contributor worktrees. Restart the backend after configuration
changes.

Snapshots use unique timestamp/UUID keys under `artist-profiles/`. Uploads use
conditional writes and verify the stored size and SHA-256 metadata. The API can
only read snapshot keys under that prefix. The server follows all listing pages
and returns snapshots newest first.
Downloads verify size and SHA-256 before parsing. Exports are limited to 10 MiB;
invalid versions, duplicate identities/URLs, unsafe URL schemes and URLs with
credentials are rejected. Existing CLI snapshots outside this prefix can be
uploaded through **Upload JSON to R2** to create a compatible snapshot.

### Release workflow

1. In development, open the admin page and **Publish database to R2**. Record the
   snapshot key shown after upload.
2. Deploy the feature to production and run `bun run db-migrate` using the
   production environment. Migration `0081_artist_showcase` creates profiles,
   links and aliases; it does not seed data.
3. On the production admin page, select that snapshot and choose **Preview
   import**. Check new/changed profiles and merged-credit changes.
4. Choose **Apply import**. The transaction imports profiles, links and mappings,
   including Amélie Hutt → Axel Hutt and the Benjamin Paulus aliases.

The initial release snapshot is already published in `swu-images`:
`artist-profiles/2026-10-11T13-16-17-699Z-63c82dff-bcfd-4178-96c3-6b8380f5d727.json`.
It contains 179 profiles, 199 links and 37 aliases. Select it after deployment
and migration, then preview/apply in merge mode. The research archive is kept
under a separate prefix and does not appear in the snapshot picker.

Only public artist information is exported: no internal IDs, accounts,
credentials or other application data.

Merge preserves existing editorial values and adds missing links/mappings.
Use **Replace included profiles** deliberately to overwrite included names,
biographies, links and version-2 aliases. Other profiles remain untouched.
Download production JSON before replacement if you need its previous values.

Apply is bound to the preview's source checksum, import mode and database state.
If any of those change, preview again before applying. Every import is atomic
and repeated imports do not duplicate data. A successful import invalidates
artist queries in the current browser; other already-open clients can retain
cached artist data for up to five minutes.

## Validation

```bash
bun test shared/lib/artists.test.ts server/lib/artists/transfer.test.ts server/lib/artists/storage.test.ts server/routes/admin/artists/router.test.ts frontend/src/components/app/artists/artistGallery.test.ts frontend/src/components/app/artists/artistDirectoryHelpers.test.ts frontend/src/components/app/cards/AdvancedCardSearch/searchService.artist.test.ts
ARTIST_TRANSFER_TEST=1 bun --env-file=.env --env-file=.env.worktree scripts/artists/transfer.integration.ts
ARTIST_SHOWCASE_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artists.browser.ts
ARTIST_SHOWCASE_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artist-directory.browser.ts
ARTIST_ADMIN_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/artist-admin.browser.ts
bun run --cwd frontend build
```

The R2 storage test uses a local S3 fixture, not a real bucket. The admin browser
check uses real authentication/export and mocked cloud responses, including
unconfigured storage and an empty snapshot list.
Database and browser checks require the running isolated worktree and clean up
their temporary records. Researched public profiles remain in development.
