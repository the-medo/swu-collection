# Resource submission notifications

The main backend starts delivery to the `resource-submission` Discord forum after saving a
YouTube link or Melee ID submitted through **Submit Stream or Melee ID**. Each
resource gets its own post; submitting both creates two posts. Posts ping only
the configured dev role and include the submitter's display name and user ID,
tournament and weekend, submission time, approval status, optional title/notes,
resource link, and admin review link. YouTube posts include a video preview image.
To limit bursts of dev-role pings, the submission endpoint accepts up to 20
submissions per user per 10 minutes per backend process, then returns HTTP 429
with `Retry-After`. A submission containing both links counts as two resources.
The submission response does not wait for Discord. Only authenticated requests
with valid JSON consume quota; a missing weekend tournament still consumes an
attempt. The limiter tracks at most 10,000 users, rejecting new users while full
until expired entries are swept, and resets on process restart.

Set these on the **main backend** and restart/redeploy it:

```dotenv
DISCORD_RESOURCE_SUBMISSIONS_ENABLED=true
DISCORD_RESOURCE_SUBMISSIONS_CHANNEL_ID=1555341906811027546
DISCORD_RESOURCE_SUBMISSIONS_ROLE_ID=1350878582532214784
DISCORD_APP_BASE_URL=https://swubase.com
```

`DISCORD_APP_BASE_URL` also sets the app-link origin for results and streams.
Reuse the existing `DISCORD_BOT_TOKEN`. The bot needs View Channel, Send Messages,
and Embed Links in the forum. The dev role must be mentionable or the bot must
have permission to mention it. The forum must allow posts without required tags.
The notification uses Discord's [forum thread endpoint](https://docs.discord.com/developers/resources/channel#start-thread-in-forum-or-media-channel).
It does not publish an announcement or change resource approval. Review the
submission under **Admin → Resource submissions**, where all submissions appear
newest first with search, status filters, video thumbnails and review actions.
Each submission appears once, including those whose tournament is no longer
assigned to a weekend. Approval and deletion update every associated live weekend;
deletion requires confirmation.

Notifications are disabled by default, and no production channel or role is
selected implicitly. Use a development forum, role and app origin when testing
real delivery locally. The automated tests use fake Discord responses.

The existing `discord_notification` log uses notification type
`resource-submission` and scope key `tournament-weekend-resource:<resource-id>`.
Repeated submissions of the same tournament/type/normalized URL reuse the
resource and suppress notifications already marked successful or sending.
Discord errors leave the submission saved and mark the notification failed.
Re-submitting can retry a failed notification; there is no scheduled retry worker.
When an accepted post's starter-message ID was retained after a database failure,
a subsequent attempt records success without sending another post.

Delivery is best effort, not exactly once: the shared log has no lease recovery
for interrupted `sending` rows or atomic reclaim of failed rows. A lost Discord
response can leave delivery uncertain. Inspect the notification row and forum
before manually retrying an uncertain send. These limits are the reason this
feature does not add a concurrent retry worker.

`runResourceSubmissionDiscordAfterSave(data, { config, dryRun: true })` returns
the payload and identity without claiming a row or contacting Discord. The
configuration must include a role and app origin to render the preview.

Focused verification:

```bash
bun test server/lib/discord/client.test.ts server/lib/discord/resourceSubmissions.test.ts server/lib/live-tournaments/resourceSubmissionRateLimit.test.ts
```
