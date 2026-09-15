# Crossfire playtesting tools

Player chat is a separate tab alongside the game log. The two players can write
and read it through their authenticated live game connections, including after a
game ends. Spectators and replay connections receive no chat and cannot send it.
Messages are plain text, never interpreted as HTML. Chat does not enter the rules
queue or command journal, advance gameplay, or keep a replay cache alive.

`play.chat_messages` retains at most 500 messages per game. Each is limited to
1,000 characters; each seat may send five new messages in ten seconds. Separate
advisory locking serializes sequence assignment and rate checks across connections.
A client-generated message ID is a durable receipt: an identical retry returns
the original message, while a changed body/seat is rejected. Reconnects load the
latest 100 messages and deduplicate pending sends. Revocation clears client chat.
Messages committed while initial catch-up is loading are buffered for that socket.

“Report a problem” is available on the live and replay boards. Submitting creates
an account-owned bookmark and a report in one transaction, anchored by the worker
to the current committed position and branch. Reports contain a short title and a
10–3,000-character description. The worker also saves a gzipped authoritative
checkpoint and SHA-256 checksum, plus the separately permitted view actually shown
to the reporter. The browser never uploads a checkpoint. A revision check prevents
attaching a newer game state to an older displayed view. This captures the position
at submission, not when the note dialog was opened.

The home page lists the current account's reports and can reopen their positions
or mark them resolved. `/crossfire/reports/:reportId` opens the frozen board and
note for its reporter or an account with the existing `admin:access` permission.
Both see the reporter's permitted perspective; the complete checkpoint never
appears in this API response or Discord. This read-only board supports card/pile
inspection without joining a game or opening a game socket. Its permission does
not grant access to the rest of the game's replay. Older reports without a
snapshot remain listed. An incompatible display format shows a clear fallback.
A report remains intact if its associated bookmark is renamed/deleted.
Replay authorization still applies to its separate replay link. Explicit game/account
deletion cascades to its reports; normal journal compaction does not.

Migration `0057_crossfire` creates these tables in the existing database.
Both are excluded from contributor dumps by the existing `play.*` exclusion and
schema-wide sanitizer. Report creation is bounded to 100 per account and shares
the bookmark ownership lock, so failed limits/duplicate conflicts roll back both
writes. Chat and report content stay out of operational logs and public telemetry.

The same consolidated migration includes snapshot storage, the private
notification outbox and the final constraint requiring a hash for every saved
checkpoint. No report backfill is needed. New snapshots are limited to 8 MiB
before compression and are kept only for reports, not every game action.

The report and `play.report_notifications` row commit together. The
[submission handler](report-notifications.md) immediately creates a Discord forum
post with the note and authenticated report link. A Discord outage cannot
roll back the report. No GitHub issue is created.

Run the focused socket, undo/report, client and HTTP router tests against the
explicit migrated worktree database. `CROSSFIRE_HISTORY_LIVE=1` with
`play:history:browser` additionally checks player chat, reload catch-up, reporting
and exact replay navigation, and updates the local screenshot gallery.
