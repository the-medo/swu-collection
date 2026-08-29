---
name: swubase-discord-notifications
description: Add or change SWUBASE Discord bot messages, announcement-channel crossposts, duplicate suppression, dry runs, triggers, configuration, and retry behavior.
---

# SWUBASE Discord notifications

Use this skill for `server/lib/discord/`, Discord-triggering endpoints/imports,
the `discord_notification` table, or Discord environment configuration.

## Delivery pipeline

Follow the existing separation:

1. Parse and validate optional/required environment values in `config.ts`.
2. Load domain data and validate whether a message can be built.
3. Build a pure, typed Discord payload with explicit `allowed_mentions`.
4. Derive a stable `(notificationType, scopeKey)` identity.
5. Return a dry-run payload before claiming or sending anything.
6. Claim the row with `claimNotificationForSend`, send/crosspost, and mark it
   success or failed. Use `force` only as an explicit operator action.
7. Trigger delivery after the authoritative database operation succeeds and
   decide whether it is best-effort or request-failing.

`sendDiscordChannelMessage()` currently creates a message and always crossposts
it. It is therefore announcement-channel-only despite its generic name. The bot
needs send and publish permissions. A crosspost failure preserves the created
message ID; retry code crossposts that existing message instead of sending a
duplicate. If a normal text-channel use case is added, refactor the low-level
client to make publishing explicit and update its tests—do not silently reuse
the current helper.

Keep roles/channels/app URLs in `.env` and document new names in `.env.example`.
Do not log bot tokens or enable a production channel implicitly. Local database
isolation does not isolate Discord side effects.

Use payload limits and truncation helpers, restrict mention parsing, and keep
result unions explicit (`skipped`, `dry-run`, `sent`, `failed`).

The unique insert safely suppresses concurrent first sends, but delivery is not
exactly once. Reclaiming an existing failed row is not an atomic status
transition, and a row left in `sending` has no lease recovery. Before adding
automatic or concurrent retry workers, implement an atomic claim/lease; do not
present the current log as a complete queue.

Load `swubase-cron-jobs` if delivery is scheduled and
`swubase-database-migrations` if notification identity/state changes.

## Validation

Run `bun test server/lib/discord/client.test.ts`, exercise a dry run first, and
inspect the payload and notification identity. A real send requires explicit
development channel configuration and must verify both creation and
announcement publish.
