# Importing creator profiles and videos

An administrator opens `/admin?page=creator-imports`, selects a JSON file, and
chooses **Preview import**, then **Import profiles and queue videos**. This works
without R2 or provider credentials. Video processing later requires the existing
worker configuration and schedule.

The feature migration creates schema and taxonomy only. Creator rosters and video
inventories are operational data, never migration seeds or tracked examples.
Keep prepared files outside Git, for example `.swubase/creator-imports/`. Optional
public research archives live under `creator-imports/` in the configured R2 bucket.
The [agent preparation skill](../.agents/skills/swubase-creator-imports/SKILL.md)
describes research, validation, and archival.

## Version 1 format

```json
{
  "kind": "swubase-creator-import",
  "schemaVersion": 1,
  "creators": [
    {
      "slug": "example-creator",
      "name": "Example Creator",
      "tagline": "Star Wars Unlimited deck guides",
      "bio": "A short biography.\nLine breaks are preserved.",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bannerUrl": "",
      "languages": ["en"],
      "specialties": ["purpose:deck-guide", "format:premier"],
      "links": [
        {
          "label": "YouTube",
          "url": "https://www.youtube.com/channel/UC_REPLACE_WITH_REAL_CHANNEL_ID",
          "kind": "social"
        }
      ]
    }
  ],
  "videos": []
}
```

Replace the placeholder channel URL with a verified `UC` ID followed by 22
characters. The UI template deliberately contains this invalid placeholder so
it cannot be accidentally imported unchanged.

The [shared Zod schema](../shared/creators/imports.ts) is authoritative:

| Field                     | Rules                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`, `schemaVersion`   | Exactly `swubase-creator-import` and `1`.                                                                                                                                            |
| `creators`                | Optional array, at most 200 profiles.                                                                                                                                                |
| `slug`                    | Required, 3–60 lowercase letters/digits separated by hyphens; reserved addresses rejected. Fixed after creation.                                                                     |
| `name`                    | Required public display name, at most 100 characters.                                                                                                                                |
| `bio`                     | Optional plain text, at most 10,000 characters; no HTML/editor JSON.                                                                                                                 |
| `tagline`, `introduction` | Optional text, at most 240 and 2,000 characters respectively.                                                                                                                        |
| `avatarUrl`, `bannerUrl`  | Optional HTTPS URLs, or empty strings when unavailable.                                                                                                                              |
| `languages`               | Required 1–10 BCP 47 language codes, such as `en`, `fr`, or `pt-BR`.                                                                                                                 |
| `specialties`             | Required array of current taxonomy IDs, possibly empty, at most 22 after normalization.                                                                                              |
| `links`                   | Required array, at most 20. Each has `label`, HTTPS `url`, and optional `kind`: `social` (default), `website`, `support`, or `contact`. At least one canonical YouTube channel link. |
| `videos`                  | Optional array, at most 5,000 entries, each exactly `{ "videoId": "11-character ID", "channelId": "canonical UC ID" }`.                                                              |

The file and its normalized request are limited to 5 MiB and must contain a creator or video. Duplicate
slugs, channel IDs across profiles, and video IDs are rejected. Handles must be
resolved to canonical channel links before importing. A linked YouTube video
(for example a support promotion) is allowed but does not authorize a channel.
Use multiple channel links for creators with multiple YouTube accounts.

Do not include creator UUIDs, owner/user IDs, OAuth tokens, or publication flags.
Old research inventories containing additional fields must be converted to this
format; they are not directly accepted by the admin importer.

```bash
bun scripts/validate-creator-import.ts /path/to/import.json
```

## Preview and application

- Profiles are inserted with no owner, members, user account, or OAuth connection.
  Canonical channel identities and curated associations are created immediately.
- An existing matching slug/channel identity is skipped, preserving its branding,
  edits, ownership, and channel settings. Different channel ownership or a reused
  slug produces a conflict; imports never merge or update existing profiles.
- Videos resolve to a creator from the live directory or profiles in the same
  file. Owned profiles require a channel association established through OAuth; later loss of Google access does not stop public imports. Paused
  channels are skipped. Importing does not override auto-import settings.
- Existing video jobs/publications are skipped, including failed or skipped jobs.
  Retrying processing is a separate worker action. New jobs use the same durable
  queue as automatic discovery; they are not immediately published.
- Any conflict blocks the entire batch. Apply revalidates the preview fingerprint
  in a transaction; changes in the relevant directory/queue require a new preview.
  Concurrent imports cannot create duplicate profiles or jobs.

The endpoints are admin-only `POST /api/admin/creator-imports/preview` (payload)
and `/apply` (`{ payload, fingerprint }`), with `X-Requested-With: swubase`.
Neither endpoint calls YouTube, Gemini, or R2. Creator/video data is omitted from
request logging and error telemetry. The UI invalidates creator caches after
application; normal worker polling/processing remains a separate operation.

After a sanitized development database restore, use this same importer to add
public directory data again. It needs no user-account export or seed migration.
Profile claiming/corrections remain the staff workflow described in
[creator-hub.md](creator-hub.md#staff-maintenance-of-unowned-profiles).
