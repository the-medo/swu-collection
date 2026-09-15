# Crossfire report notifications

Each bug report creates a new post in the configured Discord forum immediately
after the database save. Submission uses the authenticated game WebSocket's
`bookmark` message with a report note; the game worker captures the current
position. There is no separate HTTP submission endpoint or scheduled delivery task.

The report, snapshot and `play.report_notifications` row commit together. The
worker acknowledges the saved report, releases the game's action queue, then
awaits delivery for that report ID. Discord cannot hold a game database transaction
or delay the opponent's actions. The submitting socket waits for delivery (up to
the 15-second HTTP timeout) before processing its next message. Shutdown tracks
the request through the normal worker drain. A delivery failure never turns a
successfully saved report into a failed submission.

Only the title/note and authenticated report URL leave SWUBASE. Game checkpoints,
hands, deck order, chat and credentials stay on the server. The link opens the
saved position for its reporter or a SWUBASE admin, using the reporter's permitted
perspective. A Discord link alone grants no access. Mentions are disabled and
there is no announcement crosspost.

## Configuration

1. Create a private **Forum** channel and give the existing SWUBASE bot **View
   Channel**, **Send Messages / Create Posts**, and **Embed Links** there. The
   forum must allow posts without a mandatory tag; automatic tagging is not
   configured by this integration.
2. Enable Discord **User Settings → Advanced → Developer Mode**, then right-click
   the forum and choose **Copy Channel ID**. See
   [Discord's ID instructions](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID).
3. Configure the **Crossfire game worker container**, or its development-only
   `.env` locally:

   ```dotenv
   DISCORD_CROSSFIRE_REPORTS_ENABLED=true
   DISCORD_CROSSFIRE_REPORTS_CHANNEL_ID=your_forum_channel_id
   DISCORD_CROSSFIRE_REPORTS_APP_BASE_URL=https://your-swubase-origin
   DISCORD_BOT_TOKEN=your_existing_bot_token
   ```

   The URL must be an exact origin, without a path or trailing slash. The existing
   bot token can be reused; keep it in the secret environment, never Git or chat.
   Sending defaults to disabled, with no fallback to other channels or app URLs.
4. Restart the worker after changing its environment. In a managed worktree use
   `scripts/worktree-dev/swubase-worktree-dev down` followed by `up`. Do not add
   a Coolify scheduled task; remove the old Crossfire report schedule if one was
   configured. The previous report cron entrypoint has been removed.

Posts use Discord's
[Start Thread in Forum endpoint](https://docs.discord.com/developers/resources/channel#start-thread-in-forum-or-media-channel),
which creates the post and first message together. The report label becomes the
post name (at most 100 characters), with the note and saved-position link in an
embed. The returned thread parent and starter-message channel are validated.

## Delivery state and recovery

A short atomic `FOR UPDATE SKIP LOCKED` claim gives one submission/retry a
60-second lease. A saved message ID suppresses delivery after success; competing
requests cannot own the same lease. Destination channel and app origin are pinned
on first claim. Failed attempts retain a bounded error code and exponential retry
delay, honoring a longer Discord `retry_after`. An expired lease is reclaimable.
The handler sends only its own report, never drains other pending reports.

There is **no automatic retry timer**. Failed, disabled or interrupted deliveries
remain in the database. A retried identical submission can attempt delivery when
due; an operator can also inspect or recover retained reports explicitly:

```bash
bun run play/scripts/send-reports.ts --dry-run --report-id REPORT_UUID
bun run play/scripts/send-reports.ts --report-id REPORT_UUID
```

Locally prefix the command with `bun --env-file=.env --env-file=.env.worktree run`
instead of `bun run`. Omitting `--report-id` processes up to 20 retained reports.
Dry runs output proposed post bodies without claims or network sends; normal
runs output counts only. This is an operator tool, not a scheduled job.

Forum creation does not support Create Message's nonce deduplication. If Discord
accepts a post but the response or database acknowledgment is lost, a later retry
can create a duplicate. The database lease and success record suppress confirmed
duplicates; they do not provide exactly-once delivery across Discord and PostgreSQL.

Deleting the report/game/account cascades the delivery record and saved snapshot.
Both remain excluded from public contributor dumps by the schema-wide `play.*`
rules. Tests cover forum payloads, response validation, commit-before-send,
opponent progress during delayed delivery, failure isolation, authorization,
rate limits and concurrent claims using fake Discord HTTP.
