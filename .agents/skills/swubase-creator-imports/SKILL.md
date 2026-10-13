---
name: swubase-creator-imports
description: Research public YouTube creators and prepare JSON files for SWUBASE admin creator imports, including branding, social links, and optional video inventories. Use when asked to parse or prepare creators/channels to add; not for OAuth or media analysis.
---

# Creator import preparation

Prepare a portable JSON file for **Administration → Creator imports**
(`/admin?page=creator-imports`). Read the [import format](../../../docs/creator-imports.md)
and the current [validation contract](../../../shared/creators/imports.ts).

## Research and identity

- Read each requested channel's public YouTube About page or official Data API
  response. Resolve handles to the stable `UC…` channel ID; verify the channel
  name and SWU relevance. Do not guess IDs from names or similar handles.
- Capture the public display name, avatar, available banner, and links the
  creator actually publishes. Follow YouTube redirect links to their HTTPS
  destinations. Do not infer a social username, email, banner, or language.
- Group multiple channels under one creator only when the relationship is
  established by the supplied request or their public pages. Add one canonical
  YouTube link per channel. Handles alone cannot authorize imports.
- Use a short editorial tagline/bio grounded in the research. `bio` is plain
  text, not editor JSON or HTML. Leave absent optional text/images empty.
- Select specialties from the current
  [taxonomy](../../../shared/creators/taxonomy.ts). Prefer a few supported
  classifications over speculative coverage. Confirm a required spoken language
  from available evidence; ask if it cannot be established.

## Produce the artifact

Write `kind: "swubase-creator-import"`, `schemaVersion: 1`, and `creators` and/or
`videos` arrays. Use the documented fields only. Never include database UUIDs,
owner/user IDs, OAuth credentials, or publication state. The importer creates
unowned creator profiles, not user accounts, and never modifies existing profiles.

Store real research and import files outside tracked source, normally under
`.swubase/creator-imports/`. Never embed real creator rosters, video inventories,
or channel-specific samples in migrations, docs, tests, skills, or committed JSON.
Code examples and tests use synthetic fixtures.

If videos are requested, honor the requested date window and include only the
`videoId` and canonical `channelId` for each upload. Check title/description for
SWU relevance; include uncertainty for the worker to classify but exclude clearly
unrelated uploads. Do not fetch video inventories or run paid analysis just to
prepare creator profiles. The worker independently verifies current metadata.

Validate locally without database writes or provider calls:

```bash
bun scripts/validate-creator-import.ts .swubase/creator-imports/creators.json
```

Deliver the file, counts, sources checked, and any unresolved omissions. The
admin uploads it, previews it, and imports it. When database import is requested,
use this admin workflow and its normal authorization; do not replace it with SQL
seeds or assign ownership. Import creator profiles before a separate video file.
Investigate conflicts rather than inventing new slugs to duplicate a channel.

## Optional archival

For reusable research that needs archiving, use the configured SWUBASE R2 bucket
(currently `swu-images`) under `creator-imports/<date>-<unique-id>/`. Inspect the
actual bucket before uploading; use the configured integration rather than
copying credentials. Archive prepared imports and, if useful, separate source
notes/raw inventories. Verify uploaded bytes/checksum before removing the local
source, and return download links or bucket/object keys to the user.

Only public researched metadata belongs in these archives; the bucket may be
public. Never upload sessions, credentials, private creator drafts, database
dumps, or `.env` files. Archiving does not import data or start the worker. Do
not add a checked-in index of specific creators or videos afterward.
