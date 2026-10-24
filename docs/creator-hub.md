# Creator hub

The hub brings creator profiles, articles and linked media into SWUBASE discovery.
The implementation starts with the shared vocabulary in
[`shared/creators/taxonomy.ts`](../shared/creators/taxonomy.ts). Stable term IDs,
labels, explanations and display order are seeded into `creator_tag`. Each term
has a `dimension`; `creation_tag` relates published creations to those terms.
There are 47 terms across six dimensions, including two format group shortcuts.

## Classification decisions

| Dimension         | Choices                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium            | Article, video, podcast/audio, external resource.                                                                                                                                                                          |
| Content type (13) | Deck guide, meta report, gameplay, match analysis, tournament coverage, review, spoiler/preview, news, tutorial/rules, strategy, limited guide, discussion/interview, opening/unboxing.                                    |
| Format            | Constructed selects Premier + Eternal; Limited selects Draft + Sealed. Twin Suns and Custom are independent. Only individual formats are persisted.                                                                        |
| Experience        | Beginner, advanced, competitive, casual, organizer/judge, collector.                                                                                                                                                       |
| Topics (14)       | Deckbuilding, play decisions, sideboarding, matchups, archetypes, budget, playtesting/preparation, statistics/data, rules/interactions, draft/sealed strategy, multiplayer, collecting, tools/accessories, organized play. |
| Play environment  | Tabletop, online (including webcam and all online platforms).                                                                                                                                                              |

The `creator_taxonomy_simplified` section of `0085_creator_hub.sql` merges retired tags in profile
specialties, drafts, published documents, revision history, and publication
indexes. It preserves publication state, revision numbers, and dates. Legacy IDs
are accepted and normalized in old discovery URLs and editor submissions. The
mapping lives alongside the vocabulary; retired IDs must never be reused.

Discovery's subject chooser offers sets, tournaments, and leaders. Sets sort by
release date, newest first, with logos. Tournaments include the rolling last
calendar month and future events whose `tournament_type.major` is 1, ordered by
proximity to today; search narrows the first 50 matches. Leaders use the shared
visual leader selector. Authoring still supports card/base/deck relationships and
historical events so existing connected content remains accessible.

Language displays and pickers use SWUBASE-hosted country flag images with accessible
language names, including regional variants. They do not depend on emoji flag support.
An unavailable flag falls back to a language icon with the same accessible name. Content discovery,
creator directories, and creator content tabs return available languages from
all matching public rows, before pagination and excluding the language filter
itself. A creator's declared languages describe their profile; published content
facets describe the content in the selected area. Authoring offers searchable
ISO 639-1 languages and retains existing BCP 47 regional variants.

The TypeScript vocabulary is the authoritative, complete list. Unknown is the
absence of a tag, not a fabricated classification. Filters OR terms within one
dimension and AND across dimensions. Terms are curated, rather than accepting
arbitrary user-created spellings. Additions need a seed migration as well as the
shared vocabulary update; never recycle an existing ID.

Context does not belong in a generic tag table: language is a BCP 47 field;
publication/update dates are timestamps; relevance and freshness are explicit
fields; season is optional explanatory text. A creation relates to actual card,
leader, base, deck, set and tournament IDs through entity references. References
may include a video timestamp. Matchups use references to both leaders/bases and
the existing rich matchup widget. New cards and tournaments do not require new
taxonomy terms. Source URLs and verified provider identities are integration
metadata, not classifications.

## Delivery scope

Discovery lives at `/content`, the directory at `/creators`, creator profiles at
`/creators/:slug`, publications at `/content/:creationId`, and the authenticated
workspace at `/creator-studio`. The API is mounted at `/api/creator-hub`.
The creator hub, directory and studio links are hidden from the left sidebar
during monitoring. Their direct routes remain available.
Related content appears on existing card, deck and tournament pages. Articles
reuse the current rich editor and public entity views.
Creator profiles support branding, introductions, specialties, languages, social
and support links, pinned publications, series, and owner-managed editors.
Profile addresses are fixed after creation; display names and branding remain
editable. The directory and global discovery retain pagination. Creator profiles
use shareable subpages: `/creators/:slug` for all content, then `/videos`,
`/articles`, `/podcasts`, `/decks`, `/series`, and `/about`. Language, tag,
search and series choices live in URL search parameters; refresh and browser
back/forward restore them. Selecting a primary language includes regional variants.
Section tabs show total eligible published content (`Videos (20)`, `Articles (5)`)
independently of the current filters and page. Deck counts include distinct public
decks linked by eligible publications; series counts include distinct nonempty
series names. Empty sections are hidden unless opened directly, while All content
and About remain visible without counts. `GET /api/creator-hub/creators/:id/counts`
provides these totals and shares cache invalidation with creator collections.
While totals load, only All content, About and the current section are shown. If
the request fails, every section remains accessible without a count.

Creator content loads six publications at a time, preserving server-side pinned
and series ordering. Scrolling loads another batch, with a keyboard-accessible
Load more button and explicit retry on failure. Cards show publication dates;
channel-imported videos use their original upload dates. Used classification tags
appear with counts across all eligible publications in the current media tab,
language, search and series, before classification-tag selections and pagination.
Tag matching keeps discovery's existing OR-within / AND-across dimension semantics.
Counts and results exclude drafts and unavailable/expired provider metadata.

Video thumbnail badges include duration when available (`Video · 12:34`, or
`Video · 1:05:20` for hour-long videos). Imports retain `durationSeconds` in the
video document; metadata refresh/removal updates or scrubs it alongside the other
provider fields. Older videos can use unexpired import-queue metadata until their
next refresh populates the document. Missing durations leave the badge as `Video`.
Duration is provider-owned and cannot be overridden by an editor. The first refresh
that adds duration to an older video advances its revision and update timestamps,
like other metadata changes; feed ordering still uses the publication date.

The Decks subpage reuses the global public deck table, including artwork, prices,
owner, format and updated date. `GET /api/creator-hub/creators/:id/decks` loads
12 rows at a time, newest update first with an ID tie-breaker. A deck is included
once when referenced by at least one eligible publication of this creator and
currently public; private and unlisted decks are excluded even for their owner.
This endpoint paginates independently of the older collections summary's 200-row
bound. Search and classification filters apply to publications, not this deck table.

Owner and editor access is enforced on the
server; editors can author and publish but cannot manage the profile or its
connected accounts.

The directory also supports curated profiles with no user owner. Administrators
add public profiles through **Administration → Creator imports**. The
[JSON import guide](creator-imports.md) covers preparation, validation, preview,
duplicate handling, and optional video queue entries. Migrations contain no
creator roster or video inventory. Public channel images remain hosted by their
providers and may need refreshing when a creator changes their branding.

These records create no user profiles, login accounts, memberships, or YouTube
credentials. Public YouTube links are ordinary profile links, not verified
connections. An unowned profile is readable in discovery. Signed-in users can verify their
YouTube channel to claim it before managing its content. If someone tries to
register an occupied directory address, the API directs them to the YouTube
claim flow without duplicating or changing the profile's owner.

Drafts and published versions are separate. Saving a draft never changes the
public article. Publishing is explicit and revision-checked. Public decks and
unlisted decks owned by the creator can be explicitly associated with creator
publications; personal articles require public deck connections. Publishing never
changes a referenced deck's visibility. Existing embedded deck widgets remain
live views and apply their own access checks. Immutable deck versions are being
developed separately and are not claimed by this feature.

The Connect to SWUBASE picker reuses card search, leader/base selectors and the
Crossfire deck row with its decklist preview. Its deck choices are restricted on
the server to the signed-in user's public decks, plus their unlisted decks when
they own the selected creator profile; existing public associations
and imported video references are preserved regardless of ownership. Tournament
choices start with My tournaments (the same Saved, Maybe and Going list as the
map/calendar). All tournaments includes future local events and loads 12 at a
time, newest first. Connection boxes fit three across on wide layouts, open
card/leader/base details in a local dialog, and open deck/tournament details in a
new tab without leaving the draft. Selected and
published connections show live public metadata (artwork, names, dates and
locations) rather than storing display snapshots in the document. Private decks
are omitted. Unlisted decks require the creator scope described in the ownership
section; authoring lookups verify access to that profile. Video previews retain
each connection's timestamp.

Articles autosave valid drafts, offer private previews and four starter templates,
and support cards, live decklists, matchup widgets and tournament analysis through
the existing rich editor. Optimistic revision checks prevent stale writes. The
editor retains unsaved changes on errors and offers explicit conflict recovery,
revision restore, and JSON export. The latest 30 prior saves and current published
revision are retained. Publication dates remain stable across updates; public
update timestamps advance on publication and public metadata refresh. Unpublishing clears public content
and discovery associations while preserving drafts and history.

Imported creations store sticky `manually_edited_fields` separately from their
documents. Each successful manual save compares the previous draft and marks
only changed fields (including tags, subjects and chapters). Restoring an old
value does not clear its protection. These flags are returned only with the
authorized draft DTO. The migration's `protect_existing_video_edits` section
conservatively protects every saved field
of previously edited imports because retained revision history can be incomplete.
Refreshes preserve these fields. Published documents and historical revisions have
their own protection snapshots, so a draft-only edit cannot freeze an older public
value or accidentally become published during maintenance.

Profile text and every creation publication use the site's profanity checks,
including rich text, descriptions, chapters and link labels. Private drafts remain
editable so a creator can correct rejected wording before publishing. Automatic
imports with rejected text become review drafts and do not import decks.

## Module and cache boundaries

`server/lib/creators/service.ts` is a facade over profile, discovery and creation
operations. Permissions, reference resolution, DTOs and atomic publication writing
have separate modules. `worker/store.ts` composes queue, spending, publication and
reporting stores; `worker/policy.ts` decides deck issues, retries, bounded waits and
batch stops. Keep claim fencing and publication/deck changes in their existing
transactions when extending these modules.

List endpoints return `CreationSummary`, selecting only the card/studio fields in
SQL; article bodies, descriptions, references and chapters are loaded by detail,
draft and history endpoints. Discovery accepts `limit` from 1 to 24 (default 24),
with page offsets using that size. Related cards request three. Language facets
still describe the full filtered area, not the current page.

Frontend `api/creators/keys.ts` separates public and private query keys; private
queries additionally include the signed-in user ID. Operation hooks invalidate
only affected caches. Autosave refreshes the saved draft, its revision history and
that creator's studio list. Publishing also refreshes public detail, discovery and
collections. Profile, membership and channel mutations have their own scopes.
`useCreationDraft` owns autosave snapshots, optimistic revisions, conflict recovery,
publication and navigation protection. Chapter/classification fields, publication
controls and revision history render independently of that lifecycle.

## Personal articles and creator transfers

The authenticated `/creator-studio` is the writing studio. With no `creatorId`
search parameter it lists the user's personal articles. **Publish as** always
includes Personal alongside owned creator profiles and profiles where the user
is an editor. Personal publishing supports articles; linked media and YouTube
imports continue to belong to creator profiles.

`creation.owner_user_id` and `creation.creator_id` are mutually exclusive owners.
`author_id` retains original authorship and grants no creator editing permission.
Personal articles require their owner's session for drafts, revisions, edits and
publication. Creator content continues to use the existing owner/editor policy.
Public author projections include only ID, display name and avatar, never the
account's private name or email. Lists, discovery and detail queries support both
ownership types. Personal content links to the user's public profile; creator
articles transferred from personal ownership show the creator publisher and the
original author when available. Creator-native content retains its existing
creator-only attribution; `ownership_revision > 1` identifies a personal transfer.

**Create creator profile** prefills the user's public name and avatar, asks for
a profile address, and leaves additional branding optional. When personal
articles exist, the form offers a selected **Move all personal articles** option
and shows total/draft counts. `POST /api/creator-hub/creators/onboard` accepts a
request UUID, profile and `transferPersonalArticles` flag. Profile creation and
the optional transfer are one transaction. The selected creator becomes the
studio's publishing identity; Personal remains available.

For existing owned profiles, including profiles assigned by staff after a claim,
**Move all personal articles** calls
`POST /api/creator-hub/creators/:id/transfer-articles` with a request UUID.
Claiming alone never transfers content. Ownership verification/staff assignment
remains the existing process; there is no new automated claim flow. Editor
membership alone cannot receive a personal-article transfer.

Transfers move all of the caller's saved personal articles at the transaction's
cutoff, including unpublished drafts. They never move another user's articles or
content already owned by a creator. They update ownership in place: IDs, public
URLs, draft and published documents, revision history, tags, references and
publication timestamps remain unchanged. Drafts remain private but become
accessible to the destination creator's editors. Future personal articles remain
personal until another explicit transfer.

A user-row lock serializes personal saves and transfers. Creator authorization
and ownership changes are checked inside the transaction. Transfer increments
`ownership_revision` independently of content revisions; stale edits/publication
requests return 409 without publishing or discarding unsaved text. The editor's
conflict recovery reloads ownership before saving the user's local version.
`creator_publishing_request` stores request hashes and results, so repeating a
successful onboarding/transfer request cannot create duplicate profiles or move
articles written later. A reused request with different input is rejected. After a network/5xx error,
the onboarding form locks its submitted fields and retries the original payload
before accepting changes. Receipts contain only a request hash and result, are
indexed by user/creator, and remain for the lifetime of the user/profile to keep
old requests idempotent; their foreign keys delete them with either owner.

Deleting a personal owner deletes their personal articles. Transferred articles
follow the creator's existing deletion behavior; losing the original author sets
attribution to null. Contributor sanitization removes personal articles and
publishing request receipts together with other creator data.

Focused acceptance checks:

```bash
CREATOR_HUB_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/creators/personal-articles.db.test.ts
PERSONAL_ARTICLES_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/personal-articles.browser.ts
```

## YouTube setup and behavior

The connection is separate from Google sign-in. It requests only
`https://www.googleapis.com/auth/youtube.readonly`. The callback verifies a
single-use, expiring state against the signed-in user and exact session, uses PKCE,
and obtains the channel identity from `channels.list(mine=true)`. A channel can be
connected to only one creator profile. Access and refresh tokens, pending profile confirmations and PKCE
verifiers are encrypted with AES-256-GCM; API responses never return them.

Configure the following server values through the deployment's secret store or a
development-only `.env`, never tracked files:

| Variable                                     | Meaning                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | Google Web application OAuth credentials. If absent, the existing explicitly configured `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used. |
| `YOUTUBE_TOKEN_ENCRYPTION_KEY`               | A separately generated 32-byte key encoded as 64 hexadecimal characters. Keep it stable; losing it requires reconnecting channels.              |
| `BETTER_AUTH_URL`                            | The instance's public origin, also used to construct the YouTube callback.                                                                      |

Enable YouTube Data API v3 in that Google project, configure its consent screen
and permitted test users, and register the exact redirect URL
`{BETTER_AUTH_URL origin}/api/creator-hub/youtube/callback`. This differs from the
Google sign-in callback `/api/auth/callback/google`. See Google's
[web server OAuth guide](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps).
In a worktree, use the origin reported by `scripts/worktree-dev/swubase-worktree-dev status`.
Restart through the supported launcher after changing local environment values.
Connection controls are disabled when required configuration is missing; manually
linked video content still works.

The owner can import a public video by URL from a connected channel. Ownership and
public status are verified upstream; duplicate imports return the existing draft.
Imported video sources are fixed, and their channel provenance is identified on
publications. Manually linked media is labelled as a shared resource. Imports suggest title, short summary, full description, thumbnail, audio language (falling back to the creator’s primary language
when unavailable), and increasing description timestamps as editable chapters.
Classification and SWU references are selected by the creator. Importing does not
publish automatically. Channel credentials are refreshed when necessary during
imports. Video details are fetched with the public API key, separately from
account authorization. Disconnecting removes stored credentials, pending connection
states and consent-derived metadata, while independently imported public creations
remain. The channel association and auto-import preference survive. The studio
shows **Reconnect YouTube**, retains fetch/pause controls, and links to Google's
access-management page for revoking consent there.

The connection panel explains read-only access, automatic public imports and
text classification, and links the privacy policy and terms before redirecting
to Google. A successful callback includes the verified channel ID as
`youtubeChannelId`; the studio opens its connections panel and confirms that
channel only after it appears in the owner's authenticated status response.
Channel cards include canonical avatars with a fallback, and the newly connected
channel is selected for manual import. An OAuth return URL alone is not proof of
a stored connection.

Each connected channel has owner-only auto-import and **Fetch new videos**
controls. The fetch endpoint calls the same discovery function for exactly that
channel, without resolving other creators' handles. It checks the previous seven
days, bounds the interactive scan to 150 uploads and eight seconds of provider
time, and queues metadata jobs for the scheduled worker. It never calls Gemini
from the HTTP request. An incomplete scan is reported explicitly; provider
failures preserve already queued pages. A database-locked five-minute cooldown
per channel also applies to failed attempts. Fetching requires the worker's
YouTube and Gemini configuration; it does not install or start a schedule.

`creator_youtube_channel.auto_import_enabled` defaults to true and survives
OAuth reconnection and curated-association synchronization. Paused channels are
excluded from automatic discovery and inventory enqueueing; their pending
automatic jobs remain unclaimed. Publication rechecks the preference under the
same profile lock as settings changes, so pausing an in-flight automatic job
prevents publication without exhausting its retries. Existing creations remain
visible. An explicit fetch marks only its returned uploads as manually requested,
allowing that batch to proceed while the channel remains paused. Existing pending
automatic jobs can be promoted to manual; published/skipped/review jobs and
exhausted failures are not reset. Owner/editor authorization remains unchanged:
editors can author content but cannot manage channels or request fetches.

`prompt=consent` remains limited to an explicit Connect action. Normal use does
not restart authorization; expired access tokens are refreshed on the server.
Retaining the consent prompt helps obtain a fresh refresh token when reconnecting
after SWUBASE has deleted credentials. Removing it would need a recovery flow for
a successful authorization that returns no refresh token. Google may still
require reconnection after revocation or token expiry.

### Google consent branding

The configured OAuth client belongs to project `swubase-447323`. The worktree
currently reuses the Google sign-in client, so the project's branding is shared
by both flows. The public branding settings are managed in
[Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding?project=swubase-447323).
Prepare these values for that screen:

| Field                        | Value                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App name                     | SWUBASE                                                                                                                                                       |
| Homepage                     | `https://swubase.com`                                                                                                                                         |
| Privacy policy               | `https://swubase.com/privacy`                                                                                                                                 |
| Terms                        | `https://swubase.com/terms`                                                                                                                                   |
| Authorized production domain | `swubase.com`                                                                                                                                                 |
| Support contact              | Select a monitored address Google permits; `info@swubase.com` is the site's published contact and must be eligible in Google's selector before using it here. |
| Logo                         | Use the existing SWUBASE artwork as a square PNG, within Google's upload limits.                                                                              |

The CLI was used to identify the project, not to change branding. Google provides
these consent branding controls in the console; the old IAP OAuth Admin API was
[shut down on March 19, 2026](https://docs.cloud.google.com/iap/docs/programmatic-oauth-clients).
The similarly named IAM OAuth client commands configure a different service.
No branding changes, publication-status changes or verification submission were
performed by this feature update.

Deploy the revised public privacy/terms pages before submitting them for review.
Branding must be verified and published, and required YouTube scope verification
must also be completed to remove the unverified-app warning. A production-status
toggle alone does not complete either review. Keep development/testing OAuth in a
separate project for a future production verification submission. Google's
[branding guide](https://support.google.com/cloud/answer/15549049?hl=en) explains the
domain and public-page requirements.

The policy pages describe the metadata and authorization lifecycle below.
Deploy it and enable the scheduled worker before relying on automatic cleanup.
These controls do not constitute Google verification or approval of other API uses.
Use the staff removal procedure below for correction/deletion requests.

Video details use the full available page width, with chapters beside the player
when space permits and below it on narrow screens. Linked decks appear in a
dedicated **Decklists** panel above the chapters, including videos without chapters.
Deck links use the homepage's leader/base card artwork. Video descriptions sit
directly below the player and preserve the saved description's line breaks.
`videoDescription` retains the full provider text (up to 20,000 characters),
independently of the 1,000-character card summary. Both OAuth imports and the worker
use `server/lib/creators/video.ts` to normalize metadata, language and chapters.
The editor exposes these as separate fields. An empty video description displays
the summary on the public page; the editor labels that fallback explicitly.
The privacy-enhanced YouTube
embed loads directly with its native play button and contacts YouTube on page
load. Videos with chapters or timed subject references also load the
[YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
from `www.youtube.com`. Those timestamps seek and play the existing player without
reloading it. If the controls cannot connect, timestamps instead link to that
time on YouTube. Playback does not start automatically on page load.

### Metadata worker

`server/crons/creator-video-worker.ts` is a standalone Bun job. It uses YouTube's
public Data API for titles, descriptions, language, duration and upload dates,
and **text-only Gemini classification**. It never downloads or sends video,
audio, thumbnails, transcripts, or YouTube media URLs to Gemini. Speech/visual
analysis can be added later as a separate input path; there is no media fallback.

The worker discovers uploads from all connected channels, including secondary
channels. Ownerless, staff-curated directory profiles may also supply canonical
`youtube.com/channel/UC…` or `youtube.com/@handle` links. Handles are resolved
through YouTube and cached for up to 24 hours. Owned profiles require a channel
association established through OAuth or preserved when their curated profile is
claimed; loss of Google access does not remove that association or stop public imports. A self-entered social link is not proof of ownership. Conflicting
channel assignments are skipped and reported. `channels.ts` refreshes curated
associations once per run/discovery, then eligibility reads the canonical records;
video processing no longer reparses every profile's links. Corrections to curated
profile links take effect at the next `discover`, `enqueue`, or `run` invocation;
a running batch uses its synchronized associations. Stop ingestion before urgent
link corrections. Ownership changes and profile deletion take effect immediately. The claim transaction preserves existing curated channels as public import
associations and connects the verified channel. Assigning an owner directly with
SQL bypasses this step and must not be used for self-service claims. Imports recheck channel identity
and public/embed availability before processing; upcoming/live broadcasts wait
until they end. This is polling, not a YouTube webhook subscription.

Gemini receives the current taxonomy and matching catalog leader/set candidates.
Only current tags with confidence of at least 0.80 are retained. Videos publish
automatically even when SWU relevance is uncertain, confidence is low, or no
supported content type is identified. Only unrelated results with confidence of
at least 0.90 are skipped. Subject evidence validation still applies, and text
rejected by content moderation remains a review draft. These
confidence scores are model judgments, not calibrated accuracy guarantees.
Language uses YouTube metadata, then classification, then the profile default.
A character name does not choose between multiple leader printings: a subtitle
or an imported deck must identify the actual leader. No tournament association
is guessed. Public dates retain the original YouTube upload date.

Only creator-written description chapters are saved, bounded by video duration.
No chapter or timestamp is invented. Description URLs are parsed independently
of Gemini, deduplicated, and passed to the existing SWUDB, SWU Forge, Melee,
HoloScan and Protect the Pod importers (at most ten links per video). Complete
imports first stage unlisted decks under the profile owner, or the existing
`swubase` system user for unowned profiles. The source mapping and deck insertion
commit together. Untouched staged decks become public in the same transaction
as the video publication. A conflict or rollback leaves them unlisted. Existing
public imports can be reused. Claim-transferred imports with a per-deck claim record can
also be reused while remaining unlisted; private decks and edited staged decks
are never automatically promoted. Deleted or privatized worker imports stay suppressed on retry.
Unknown-card/partial decks, unavailable links, and deck text rejected by moderation
are omitted and reported without blocking video publication. A missing format defaults a new deck
to Premier and is reported; two leaders identify Twin Suns. Imported leaders and
decks become normal creation references, so existing deck/card discovery works.
The importer gives standard card numbers precedence over colliding promo numbers.

Each video has a persistent job and cached analysis. PostgreSQL row claims prevent
overlapping runs from processing the same job; a 15-minute lease recovers crashes,
with claim IDs fencing stale writes. Failed work retries with backoff, up to three
attempts. Deck-provider failures retain analysis and successful imports. A missing,
private or invalid deck becomes a per-link issue; transient deck errors become
per-link issues on the last attempt so a valid video can still publish. Review
drafts retain supported deck URLs as pending issues for staff inspection; they
do not import decks before review. Upcoming/stuck videos wait for up to 30 days,
then are skipped (an explicit reclassification can requeue them). Existing
creations, creator edits, deletions and unpublishing are never overwritten or
resurrected by a repeated import. Review drafts remain in Creator Studio for
owned profiles; unowned profiles can be claimed by connecting their YouTube channel
before editing. `status` lists review/failure items, deferred error codes and
creation IDs, newest first. It reports the total and whether more rows exist; use
`status --status review --page 2` to filter and page through 100 rows at a time.
It also counts pending staged decks and those older than seven days without a
draft or publication reference. These are reported for staff cleanup, not deleted
automatically; owner edits remain protected.

### Non-SWU reports

Every public video detail page offers **Report as non-SWU**. Reporting requires
sign-in, accepts an optional explanation of up to 1,000 characters, and does not
hide the video automatically. One open report per account/video is allowed;
concurrent requests return the existing open report. A client submission ID makes
retries return the original receipt even after a report is resolved. A fresh
submission can report a video again after dismissal or republication.
A database lock enforces a limit of
ten new video reports per account in a rolling 24 hours.

Administrators review `/admin?page=creation-reports`. They can dismiss a report or
unpublish a video, which resolves its open reports and removes its public tags and
subject links in the same transaction. A changed publication must be reviewed
again before unpublishing. Drafts and history remain available to the creator;
this action is unpublishing, not a permanent publishing ban. The import worker
preserves the existing creation and never republishes it on a repeat scan.

Reports are private, with no reporter information in public creation responses.
The existing creator API telemetry exclusion covers these endpoints. Contributor
dump sanitization removes every report, including those from opted-in users.
There are no email/Discord notifications or automatic report-count takedowns.
Existing drafts are preserved; the updated confidence policy applies to new imports.

### Running and spending controls

Run from the application root with backend-only `DATABASE_URL`, `YOUTUBE_API_KEY`
and `GEMINI_API_KEY`. For a development worktree use
`bun --env-file=.env --env-file=.env.worktree run …` so the intended isolated
database is selected. `status` and `--dry-run` make no provider requests or writes.

```bash
# Inspect the queue and proposed run without charging Gemini.
bun run server/crons/creator-video-worker.ts tick --dry-run

# Inspect or run metadata/access maintenance without any Gemini requests.
bun run server/crons/creator-video-worker.ts maintain --dry-run
bun run server/crons/creator-video-worker.ts maintain --limit 50

# Backfill the saved inventory (queue only; processing verifies current metadata).
bun run server/crons/creator-video-worker.ts enqueue --file /path/to/video-inventory.json

# Or discover a date window, including shorts and completed streams.
bun run server/crons/creator-video-worker.ts discover --since YYYY-MM-DD

# Process a small batch; uncertain SWU videos also become public.
bun run server/crons/creator-video-worker.ts run --limit 10
bun run server/crons/creator-video-worker.ts status
bun run server/crons/creator-video-worker.ts status --status review --page 1
bun run server/crons/creator-video-worker.ts retry --video VIDEO_ID
# Explicitly request fresh classification for a failed/skipped job without a creation.
bun run server/crons/creator-video-worker.ts retry --video VIDEO_ID --reclassify
```

Reviewed inventories enqueue only their `swuVideoIds`. Entries in
`excludedVideoIds` or `needsReviewVideoIds` are ignored even if also present in the
approved list; review those held entries separately before supplying a new inventory.
Unreviewed inventories without those lists still enqueue all eligible channel
videos for current metadata classification. Gemini HTTP 413 size rejections fail
the individual job and allow the batch to continue. Other Gemini errors stop the
batch; HTTP 400 is ambiguous and can indicate a shared configuration problem,
including billing or request schema (see [Google's error reference](https://ai.google.dev/gemini-api/docs/api-errors)).
Rejected provider requests release their spend reservation.

For ongoing ingestion, configure Coolify to invoke
`bun run server/crons/creator-video-worker.ts tick --limit 10`, for example every
30 minutes. The repository does not install a schedule or start an in-process
scheduler. `tick` runs maintenance first, then scans the previous seven days; after a longer outage, use
`discover --since` or enqueue the inventory to catch up. Discovery scans up to
20 pages of 50 uploads per channel and reports incomplete scans. A run is bounded
to 100 processed videos (10 by default). The Sentry monitor slug is
`creator-video-worker`; maintenance failures, processing failures and truncated discovery scans produce
a nonzero exit. Stale directory links are reported without failing the entire
tick. The process flushes
check-ins before exiting. Logs contain fixed error categories rather than keys,
provider error bodies or database query parameters.

`CREATOR_GEMINI_BUDGET_USD` defaults to **USD 5 total**, with a maximum allowed
setting of USD 40 to leave headroom under the requested USD 50 ceiling. This is
cumulative for this database, not a monthly budget, and it does not reset on
restart, retry or profile deletion. Each request reserves USD 0.05 atomically
before dispatch. The text request is limited to 64 KiB and 4,096 output tokens;
reported usage settles input, output and thinking costs. Missing usage, timeouts
and uncertain responses keep the full reservation. Definite Gemini HTTP 4xx
rejections release their reservation. Except for terminal per-job HTTP 413 size
rejections, they defer the job without consuming an attempt.
Rejections still present seven days after enqueue become visible failed
jobs instead of deferring forever. The run summary and monitor expose the fixed
error code that stopped the batch. All Gemini errors except HTTP 413 stop the
current batch so an outage cannot repeatedly reserve the allowance across the
rest of the queue. Exhaustion pauses new model
calls; it does not buy credits, switch models or reset the allowance. An anomalous
charge above its reservation also stops further admissions. `status` reports
charged and held microdollars (one dollar is 1,000,000 microdollars).

The pinned model is `gemini-3.5-flash-lite`, using the standard text rates checked
on 2026-10-12: USD 0.30 per million input tokens and USD 2.50 per million output
and thinking tokens. These are estimates for the ledger, not Google's invoice;
check [current Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite)
before changing the model/rates. Keep the Google project spend cap as an additional
backstop; this ledger covers this worker in one database, not other callers or
independent development databases. Sanitized contributor dumps remove its usage
and jobs, so do not use such a dump to reset a production spending ledger.

### Metadata and authorization maintenance

`maintain` needs the database and public YouTube API key. OAuth health checks also
need the configured client credentials and token encryption key. It does not use
Gemini, download media, or reclassify existing creations. It shares the worker's
Sentry monitor and returns a failing exit status for temporary provider errors.

- Public video/channel metadata is due after seven days. Each run refreshes up to
  50 videos, 50 channel records and 50 connections by default (CLI maximum 100;
  channel requests remain capped at 50). Oldest attempted work runs first.
- OAuth refresh tokens are checked daily. Only confirmed `invalid_grant` or loss
  of the required scope triggers immediate revocation cleanup. Configuration,
  quota and network failures retry after an hour without immediately deleting
  credentials. Connections unverified for 28 days are disconnected independently
  of the refresh batch limit.
- Missing, private or non-embeddable videos are unpublished and their provider
  text/images/chapters are removed from drafts, all saved revisions, report title
  snapshots and job payloads. Removed videos are checked again weekly. Temporary video errors retry
  after an hour; metadata remains until its retention deadline.
- Before provider calls, cleanup removes cached metadata older than 28 days,
  including worker analysis/evidence, issue URLs, handle resolutions and channel
  metadata. Cleanup is independent of provider availability and the refresh budget.
  Public queries exclude expired videos even before the cleanup run. The schedule
  must remain healthy to physically delete stored data on time.
- Refresh updates drafts and publications separately. It respects each version's
  manual field protections, preserves tags/references and original publication
  dates, and never publishes a draft. Unchanged refreshes do not create revisions or
  invalidate an editor's revision token. If a removed/expired video becomes available
  again, metadata can return to its draft; publication requires an explicit action.
  Removal clears protection flags for the scrubbed fields so restored metadata
  does not preserve an empty placeholder.
- A transaction advisory lock prevents overlapping maintenance runs. Profile/row
  locks and credential comparisons prevent a late failure from deleting a newly
  reconnected account. Pausing a channel stops new automatic imports; maintenance
  of already stored data continues.

`source_data_origin` distinguishes public imports from older OAuth imports.
Successful historical worker insertions establish public provenance; ambiguous
legacy imports are treated as OAuth-derived. Authorization removal scrubs those
copies, including historical snapshots, and does not automatically repopulate
those creations until an explicit reconnect. Reconnection makes them eligible for
fresh public metadata; they return as drafts and require explicit publication.
Successful public refresh records public provenance. New independent public imports
continue according to the saved channel setting. Canonical IDs/URLs remain for synchronization and deduplication;
SWUBASE-authored article bodies, tags and references remain separate. Explicit
channel/data removal requests need the staff removal procedure; this maintenance
path is not a substitute for honoring those requests.

Creator profile branding entered through the admin JSON importer is editorial
profile data, not the worker's channel cache. External research JSON/R2 archives
and database backups are outside this maintenance job; staff must handle their
retention and requested deletion separately. Do not retain archived API responses
indefinitely or treat a database cleanup as deleting those copies.

The lifecycle database regression is opt-in via `CREATOR_LIFECYCLE_DB_TEST=1` and
requires a disposable local database named `swubase_creator_lifecycle_*`. It scans
all rows; never run it against the normal worktree database with real connections.
It injects providers and covers retention, protected edits, draft isolation,
revocation, continued imports, outages, stale responses and overlapping schedulers.

## Persistence and development data

`creator_profile` owns profiles, `creator_member` grants editor access, `creation`
stores draft and published documents, and `creation_revision` stores draft
history. `creator_tag`, `creation_tag`, and `creation_reference` index discovery.
`creator_youtube_channel` stores public channel identity/metadata and
`creator_channel` associates one or more channels with each creator, recording
curated, OAuth, or previously verified public-import origin. A curated handle
association expires after 24 hours without a refreshed resolution; a direct channel ID is stable. Metadata does not
prove ownership. `creator_youtube` retains the creator-bound encrypted credentials;
`creator_oauth_state` contains pending private authorization state. OAuth connect
updates identity, association and credentials atomically. Disconnect changes the
association to public-import origin, records its reason/time, removes credentials
and scrubs consent-derived metadata. It preserves independently fetched public data.
`creator_video_job` stores processing state, metadata and classification evidence;
`creator_video_spend` tracks requests and reservations independently of profile
lifetime; `creator_imported_deck` preserves import identities and deletion tombstones.
`creator_claimed_deck` records which original deck IDs were transferred, independently
of the owner/source mapping, and cascades when a deck is deleted.

The original creator-hub schema, taxonomy seeds and generic backfills are in the single
`drizzle/0085_creator_hub.sql` migration, with one generated final snapshot and
one journal entry. Personal ownership and publishing request receipts are added by
`0086_personal_articles.sql`, with receipt indexes in
`0087_creator_publishing_request_indexes.sql`. Named SQL sections preserve the original development order.
The migration includes the resolution cache, staged deck publication marker,
report moderation and channel import controls. Public directory profiles and
video inventories are supplied through the admin importer. Canonical channel backfills preserve credentials and
derive curated associations only from ownerless profiles; they never assign owners.

Description backfills recover worker text only when the legacy generated summary
matches that version's saved summary, including JavaScript's UTF-16 prefix and
whitespace behavior. Otherwise they retain the saved summary. Separately edited
descriptions, revision numbers, publication state and timestamps are preserved.

This consolidation was explicitly requested before merging the feature. A
development database that already applied the former 16 migrations needs its
existing schema verified and its creator migration ledger reconciled before
running the consolidated file. Do not execute its CREATE statements against an
already migrated database or reset creator data to work around that history.
The creator-hub worktree was reconciled separately; normal new deployments apply
the single migration after the existing main-branch history.

Contributor sanitization removes all creator profiles, creations, revisions,
memberships, integration credentials, pending OAuth state, worker jobs, usage, channel identities/associations, channel-resolution cache, import mappings and deck claim records. Curated
taxonomy rows remain. Creator API and admin-import request logging and error telemetry exclude sensitive
payloads and OAuth query parameters. Unexpected errors emit only a fixed category,
method, route pattern, allowlisted error type and database SQLSTATE to server logs. Subject resolution is batched per response;
the legacy collections response bounds series and deck summaries at 200 entries.
The creator Decks subpage uses its dedicated paginated endpoint instead.
Public API responses remain uncached by intermediaries so access changes are checked
on each request.

Sanitized dumps also remove curated directory profiles. Use the
[admin JSON importer](creator-imports.md) to restore public directory data. New
deployments start with an empty creator directory; migrations never populate it.

### Staff maintenance of unowned profiles

Signed-in users can claim an ownerless directory profile from its page or connect
YouTube in the creator studio. Google OAuth uses PKCE and a single-use state bound
to the current SWUBASE session. Only Google's authenticated `channels?mine=true`
identity can select a profile. Known channel IDs take precedence; a current
handle cannot claim a profile if an existing handle resolution names another
channel. Explicit profile selections are never silently replaced by a match. A profile already owned by another user cannot be
claimed, even by another manager of the same YouTube channel. Disconnecting Google
does not release ownership. Owned profiles display a **Claimed** badge.

If no profile matches, a user with one owned profile connects that channel to it.
Users without a profile see an explicit create/cancel choice; users with multiple
profiles choose one. The pending connection is encrypted, bound to the same
session, and expires after ten minutes. Cancelling removes it; expired pending
states are removed by existing OAuth-state maintenance and contributor sanitization.

Claiming runs in one transaction with transferring the original normal decks
referenced by that profile's imported YouTube videos (published or draft).
Only decks owned by the `swubase` system user and public/unlisted are moved.
Untouched, unlisted decks already staged for unfinished video jobs are also
transferred, using supported deck links from their cached metadata. They
retain their IDs, cards and video links, become unlisted, and move into a private
root folder named **Youtube Connection Decklists** (reused if already present).
A shared original is transferred too; it is not copied. Any import already
running for the creator is fenced and requeued to use the new owner, retaining
its cached metadata and analysis. Decks owned by other users
are untouched. Import mappings move to the claimant; a separate `creator_claimed_deck` record
keeps each original’s provenance even if the claimant already has that source. Retries reuse
those unlisted decks without making them public. An existing mapping for the
claimant takes precedence on a source-key conflict. Other completed imports
unlisted by their owner remain excluded from future automatic references. Unlisted decks remain visible through their
explicit video links and stay out of public deck discovery. Creator-authorized studio
lookups resolve those links, and profile owners can choose their own unlisted
decks. Personal articles continue to require public deck connections.

MCP installations must apply the main-app migrations and reapply
`mcp/deploy/grants.sql` before deploying the updated MCP service. Its restricted
article publisher needs read access to the claim table's `deck_id` column; it
receives no claim or ownership mutation permissions.

Staff correction and removal requests still go through
[SWUBASE Discord](https://discord.gg/Stg45hRrZq). The following SQL accepts `psql`
variables against an explicitly selected instance and is limited to ownerless
profiles. Use the YouTube claim flow for ownership changes so decks and channel
associations move consistently.

For an avatar/banner correction, supply `creator_id`, `avatar_url`, and
`banner_url` (`''` for no banner). Use HTTPS URLs accepted by the profile contract:

```sql
UPDATE creator_profile
SET profile = profile || jsonb_build_object(
      'avatarUrl', :'avatar_url'::text, 'bannerUrl', :'banner_url'::text),
    revision = revision + 1, updated_at = now()
WHERE id = :'creator_id'::uuid AND owner_id IS NULL
RETURNING id, slug, revision;
```

For a removal request, delete only the chosen unowned profile (and dependent
creator records through existing cascades):

```sql
DELETE FROM creator_profile
WHERE id = :'creator_id'::uuid AND owner_id IS NULL
RETURNING id, slug;
```

## Verification

With a running isolated worktree and its development environment configured:

```bash
bun --env-file=.env --env-file=.env.worktree run db-migrate
bunx drizzle-kit check --config=drizzle.config.ts
CREATOR_HUB_DB_TEST=1 CREATOR_WORKER_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/creators
CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-hub.browser.ts
CREATOR_HUB_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/creator-claims.browser.ts
CREATOR_VIDEO_BROWSER_ORIGIN=https://your-worktree-origin bun frontend/tests/creator-video.browser.ts
# After building, without account/database writes:
CREATOR_BROWSING_BROWSER_TEST=1 bun frontend/tests/creator-browsing.browser.ts
bun run --cwd frontend build
```

The database tests mock Google's provider responses and exercise actual isolated
PostgreSQL transactions. The browser test uses temporary signed-in fixtures and
removes them afterwards; screenshots stay in ignored
`.swubase/creator-screenshots/`. It covers profile creation, SWU rich authoring,
private drafts, autosave cache isolation, conflicts, publishing, filters, series, connected deck content,
unpublishing and responsive layouts. Live Google/YouTube consent completion still
requires a real channel owner and the configured Google project.

The video browser regression uses a simulated YouTube player and a creation API
fixture, without database writes. It covers timestamp seeking, delayed readiness,
player disposal, unavailable controls, full descriptions with late links, and desktop/mobile layout. Also verify
playback and chapter seeking with a real YouTube video in the target browser.

Acceptance checks cover filter semantics, anonymous discovery, creator/editor
authorization, draft isolation, revision conflicts, publication/unpublication,
references and privacy, OAuth state/session binding and replay, import ownership,
unowned-profile access, admin import idempotence without account creation, and responsive
authoring. Validate using the isolated worktree database,
focused Bun tests, a frontend build and browser smoke checks, followed by the
required independent read-only Claude review.

Skills: swubase-worktree-dev, swubase-database-migrations,
swubase-development-data, swubase-auth-permissions, swubase-backend-endpoints,
swubase-frontend-api, swubase-frontend-components, swubase-frontend-routing,
swubase-decks, swubase-cron-jobs, swubase-documentation, swubase-validation, swubase-change-review.

The broader product backlog retains follows/bookmarks/digests, comment moderation,
AI-assisted tagging and timestamps, historical deck snapshots, analytics and
commercial features. Upload webhook subscriptions and renewal remain future work;
the existing scheduled polling performs discovery. Metadata refresh/deletion and
connection checks run through the maintenance phase described above.
