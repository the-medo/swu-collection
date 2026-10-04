# Direct user messaging

Signed-in users can open `/messages`, choose a conversation, and send plain-text
messages. Profile pages offer **Send message**, linking to
`/messages?with=<user ID>` without creating an empty conversation. The sidebar
shows an open envelope when there are no unread messages and a closed envelope
with a badge otherwise. Its avatar links to the current user's profile; account
settings and sign-out remain under the user-and-gear account menu. The account,
notification and message controls are grouped together beside the avatar.

The layout shows conversations and their latest-message snippets on the left,
with the selected conversation on the right. On narrow screens it shows one
pane at a time. Recent messages appear at the bottom, above the composer. Older
messages load in pages while retaining the scroll position. New messages follow
the bottom when the reader is there; reading older history does not jump down.
Enter sends, Shift+Enter inserts a line break, and composition input is respected.
Drafts live in React memory for the current account while switching conversations;
reload/navigation away clears them. Failed sends retain the draft and retry ID.

Message bubbles use muted greys and compact spacing. Consecutive messages from
the same sender show an avatar only on the first message. A small timestamp in
the avatar column appears when the sender or minute changes, including on the
first visible message. Hovering the timestamp shows its full date/time.
HTTP(S) and `www.` links are detected in message text; markup remains escaped.
Links to recognized app pages use client-side navigation; same-origin files and
API resources use normal browser navigation. Other destinations
show a confirmation with the host and full URL before opening a separate tab
without an opener or referrer. Unsafe schemes, credentials and malformed URLs
remain plain text.

## Storage and authorization

Migration `0065_direct_messages` adds two tables after `0064_user_notifications`:

- `direct_conversation`: a unique, canonically ordered pair of Better Auth user
  IDs, the latest message sequence/time, and one read-through sequence per user.
- `direct_message`: conversation, committed sequence, sender, client retry UUID,
  plain-text body and creation timestamp. The unique conversation/sequence index
  supports history paging; a sender/retry UUID index prevents duplicate sends.

A conversation is created only when the first message is sent. Forward and
reverse participants resolve to the same pair (UTF-8 byte order, matching the
PostgreSQL `C` collation constraint). A transaction locks the conversation before
assigning its next sequence, inserting the message, and advancing the summary.
Opposite-direction simultaneous sends therefore have a committed order.

Only the two participants can read conversation history or change their own read
cursor. Peer information includes public display name/avatar, never email or
private account fields. Self-messaging and messaging to/from the `swubase` system
account are unavailable. Deleting either account cascades through the
conversation and its messages.

Each message is at most 5,000 characters and must contain non-whitespace text.
The API rejects oversized request bodies and NUL characters. Sends are limited
to 60 per minute per sender, using a PostgreSQL advisory transaction lock and an
indexed count shared by API instances. Retrying an already committed request
returns the same message before checking the rate limit. Reusing its retry ID
with another recipient or body returns a conflict.

## Reading and realtime

The envelope badge counts individual unread incoming messages, not conversations.
The client advances a read cursor only while the selected conversation is at the
bottom in a visible, focused tab, up to the newest incoming sequence it actually
rendered. Sending an outgoing message does not advance that cursor. Cursors only
move forward. A later-arriving message stays unread until its sequence is
acknowledged. Reading older history or keeping the tab in the background does
not automatically mark new messages read.

Messages use the existing `/api/ws/events` connection. Transactions publish
recipient-scoped `messages.changed` signals through the existing PostgreSQL
channel. These contain only the recipient's conversation/peer IDs and latest
message/read sequences, never message text. The server still binds the socket
to the authenticated account and checks its session before each delivery.

An ordinary event makes one authenticated HTTP request for the affected
conversation: its current list row, the total unread count, and only messages
after the last locally loaded sequence. When that conversation is closed, the
request omits message history. Read acknowledgements update the same metadata
without downloading old messages. The client patches its existing queries,
coalesces duplicate socket/POST acknowledgements, and serializes updates so
older account snapshots cannot overtake newer ones. The response uses one
repeatable-read database snapshot; deltas are bounded to 30 messages per request.

Initial loads, reconnect/resync, legacy unscoped events and delta errors use the
full HTTP queries. A sequence gap also triggers that recovery. Pagination is
allowed to finish before patching its pages, preserving the reader's position;
the unread badge updates while an older page is still loading. History responses
include the caller's read cursor so opening an already-read conversation does
not send redundant read updates. Session changes abort pending delta requests
and prevent late responses from recreating private caches. No extra socket,
SignalR server or database migration is required for incremental delivery.

When upgrading an environment already running the earlier bare-signal messaging
build, replace its API instances together. That build's strict PostgreSQL signal
decoder ignores the new conversation metadata during a mixed-version rollout.
Replacing the old instances closes their sockets and reconnect recovery loads
current data. Older browser tabs still work with the new API.

All queries are scoped to the signed-in session. Logout/session replacement
cancels and removes their caches and unmounts drafts. HTTP responses use
`Cache-Control: private, no-store`. Message endpoints are excluded from backend
Sentry request/error transactions so request bodies and SQL error details cannot
include private message text in telemetry. This deliberately limits remote error
diagnostics; the server access log still records endpoint paths and status codes.
Contributor-dump sanitization always truncates both messaging tables, including
conversations between opted-in users, and asserts that no rows remain.

## API and verification

Authenticated endpoints under `/api/messages`:

- `GET /summary`: total unread incoming messages.
- `GET /conversations?cursor=...`: up to 30 conversations ordered by latest
  message time and ID, with timestamp precision preserved in the cursor.
- `GET /with/:userId?before=...`: latest 30 messages, or older sequences in
  batches of 30, returned in chronological order; an unsent conversation has a null ID.
- `GET /with/:userId/updates?after=...`: up to 30 newer messages, the affected
  conversation row and total unread count. Omit `after` for metadata only.
  Ownership is derived from the signed-in user and peer, as for history.
- `POST /with/:userId`: `{ body, clientMessageId }`, returning the persisted
  message and conversation ID.
- `POST /conversations/:id/read`: `{ throughSequence }`, updating only the
  caller's monotonic read cursor.

Run against an isolated worktree database after `bun run db-migrate`:

```bash
MESSAGES_DB_TEST=1 NOTIFICATIONS_DB_TEST=1 bun --env-file=.env.worktree test \
  server/lib/messages/messages.integration.test.ts \
  server/lib/ws/appRealtime.integration.test.ts
bun test frontend/src/api/messages/messageSync.test.ts
bun run --cwd frontend build
```
