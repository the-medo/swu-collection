# App notifications and realtime events

Signed-in browser tabs use one main-app connection, `/api/ws/events`. The root
`AppRealtimeProvider` owns it across navigation. Crossfire gameplay and replay
connections remain on the dedicated game worker. Legacy main-app socket routes
remain available for previously loaded clients during rollout.

[Direct user messaging](messaging.md) also uses this connection for private
recipient-scoped invalidations. Its conversations and unread-message count are
separate from the notification inbox.

The server validates the Better Auth session and exact configured origin before
registration, then rechecks the session on messages and deliveries. Heartbeats,
connection limits, bounded queues and buffered bytes constrain idle or slow
clients. Reconnects use capped exponential delay with jitter; authentication
rejections stop retrying. Normal WebSocket upgrades are counted in a bounded
one-minute request-log summary; failed HTTP requests remain individually logged.
Authorization requests awaiting the same turn share a bounded database batch;
decisions are not cached across deliveries. Large event bursts collapse into one
HTTP resync instead of disconnecting healthy viewers. Capacity rejections retry
after one minute or on focus; malformed protocol messages require a reload.

## Saved inbox

`user_notification` has one row per recipient, with type, actor, target, versioned
data, deduplication key and created/read/first-read/archived timestamps. User IDs
reference Better Auth users; target IDs are soft references. Inbox reads check current
target access and omit deleted or transferred decks, deleted invitations, and
teams the recipient no longer belongs to. Actor display names, deck names and
team names are resolved when reading. No private deck snapshot is copied into a notification.

- Directed Crossfire invites create a mandatory `crossfire.invitation` row in the
  lobby transaction. Expired, declined, accepted and cancelled invitations remain
  in the inbox as ended invitations until archived.
- A new deck favorite creates `deck.favorite` for the owner in the favorite
  transaction, unless it is a self-favorite or the owner disabled that type.
  Unfavoriting retracts an untouched notification; favoriting again can create a
  fresh one. Once read or archived, the row and its deduplication key stay, so
  repeated toggles do not produce more notifications for the same actor and deck.
- Approving a team join request creates `team.member.joined` for all existing
  members, including the approving owner, except those who disabled that type.
  The joining member gets no notification about their own join. Approval, member
  insertion and notification creation commit together. Duplicate approvals or
  requests for an existing member do not create another event; a real rejoin does.
  Removing a member retracts their untouched join notifications. Former recipients
  lose access to that team's notification history and receive a cache invalidation.
  If they rejoin, their retained history becomes visible again.
- A comment or reply on a deck creates `deck.comment` for its owner. A reply
  also creates `comment.reply` for the parent comment's author. Authors receive
  no notification about their own action. If the owner is also the parent author,
  one entry is saved, preferring the reply type when that preference is enabled.
  Both rows commit with the comment. Links open the Article/Comments subpage,
  expand the ancestor threads and focus the comment, including older pages.
  Reads hide entries after source-comment deletion or loss of deck access; no
  comment prose is copied into notifications. Mentions alone do not notify users.
- No historical favorites are backfilled. Disabling a preference stops new rows;
  it does not delete existing rows. Re-enabling does not replay missed activity.

Authenticated HTTP endpoints under `/api/notifications` provide the inbox,
`/summary`, `/unread` (the latest five visible unread entries), `/read-all`, and
`PATCH /:id` for read/unread/archive. Pagination uses
`(created_at, id)` and preserves PostgreSQL timestamp precision. Read state is
shared across devices. Archived rows retain their deduplication keys.

The sidebar bell opens an unread preview with Mark all as read and View all.
The preview loads when opened and shares the account's realtime invalidations;
it filters unread rows on the server, including entries older than the first
inbox page. The full inbox loads older pages as its scroll sentinel becomes
visible. A failed page request pauses automatic loading until Retry. Existing
loaded pages are refreshed on notification changes to keep cursors and read
state consistent without discarding the user's visible history.

`notifications_deck_favorites`, `notifications_deck_comments`,
`notifications_comment_replies` and `notifications_team_members` use the existing
account user-settings table and default to true. Mandatory invitations have no
disable key. The settings UI uses account-scoped Query data rather than the
legacy browser-wide settings cache.
The `swubase` system account is excluded from all notification creation, including
mandatory invites, and inbox reads. The policy is shared by both transaction
adapters. All inbox rows are removed from sanitized contributor dumps, regardless
of opt-in.

## Reversing source actions

Use `createNotifications(tx, events)` for Drizzle producers; it applies recipient
policy, preferences and deduplication, then publishes one invalidation per affected
recipient. The raw Postgres Crossfire adapter uses the same recipient policy.

Use `retractUnseenNotifications(tx, { type, entityType, entityId, actorUserId })`
inside the transaction that reverses an action. It deletes matching rows only
when `first_read_at`, `read_at` and `archived_at` are all null, and invalidates only
recipients whose rows changed. Reading sets `first_read_at` permanently; marking
unread clears only `read_at`. Merely rendering a notification does not mark it
read. Archived rows are also protected. The initial `0064_user_notifications`
migration creates the table with first-read tracking already included; no
historical activity is backfilled.

Forward and reverse source operations must serialize together. Favorites take a
transaction advisory lock scoped to deck and actor, including when no favorite
exists yet. Team joins, removals, role changes and deletion lock the team row,
then hold the acting member's membership stable until commit. These locks prevent
racing reversals from removing a newer event or sending notifications for
uncommitted membership.

## Delivery and page subscriptions

Transactions emit recipient-scoped `pg_notify` messages on `user_notifications`.
Every connected API instance listens and tells only that account's clients to
refresh. Direct-message signals include recipient-specific conversation and
sequence metadata so the client can request only the affected row and new
messages; see [messaging](messaging.md). The existing `crossfire_invitations`
channel also feeds this connection.
WebSocket reconnect and PostgreSQL LISTEN reconnect both cause HTTP resync; the
database is authoritative and NOTIFY is not a durable message queue.

Client commands are versioned (`v: 1`): `ping`, `subscribe`, `unsubscribe`.
Optional page subscriptions are `game-results` (own account or an authorized
team) and `live-tournaments` (one weekend). Each topic has one current scope;
consumers release their subscription on unmount. Team access is rechecked before
delivery, and queued events cannot cross a scope replacement. Existing feature
events and live-tournament patch/version-gap handling are retained.
If nested consumers select different scopes for one topic, the most recently
added scope is active; releasing it restores the previous scope. Live-home
subscription acknowledgments intentionally refetch even at the same version:
account-specific watched-player updates can occur without a public version bump.

Game-result invalidations use the existing PostgreSQL channel. Live tournament
patch publishers still use process-local registries; before operating multiple
API replicas, add shared fan-out for those patches. HTTP/focus refresh remains
the fallback. No Redis, separate notification process or browser database is
required for this implementation.

To add a type, extend the shared contracts, create its notification in the source
transaction through the shared creation helper, add target-access/label handling
in the inbox service and UI, and add a preference only if the type is optional. Do not persist generic cache
invalidations as inbox entries.

## Local verification

Use an isolated, migrated worktree database:

```bash
DECK_DISCUSSION_DB_TEST=1 NOTIFICATIONS_DB_TEST=1 bun --env-file=.env.worktree test \
  server/lib/notifications/notifications.integration.test.ts \
  server/lib/notifications/lifecycle.integration.test.ts \
  server/routes/discussions.db.test.ts \
  server/lib/ws/appRealtime.integration.test.ts \
  server/lib/ws/requestLogger.test.ts frontend/src/lib/appRealtime.test.ts
bun run --cwd frontend build
```

The existing `play/integration/lobbies.test.ts` also checks that directed lobby
creation creates the recipient's notification.
