# Crossfire lobbies and persisted admission

[CrossfireLobbies](../../server/lib/crossfire/lobbies.ts) is the private main-API
service for creating, reading, joining and cancelling development lobbies. Root
migration `0057_crossfire` creates `play.lobbies` and `play.participants`. The
[HTTP admission routes](http-admission.md) expose this service when explicitly
enabled; the WebSocket game service remains separate work.
The [connection service](connections.md) issues single-use tickets for accepted
players and permitted spectators after the game starts.

The caller supplies the user ID and session ID from Better Auth's authenticated
context. The service verifies their association, session expiration and account
ban state and explicit `crossfire` role in PostgreSQL. Session tokens/OAuth credentials are never copied into
Crossfire. A session ID is a soft reference: deleting/signing out a session
revokes admission without coupling the auth table's lifecycle to game history.

The creator selects a permitted SWUBASE deck and immutable spectator/hand-reveal
settings. A repeatable-read transaction reads the deck and persists its complete
validated snapshot with seat `p1`. The opaque lobby ID can be shared as a link;
there is no public discovery or exclusive named-user invitation yet. Any signed-
in Crossfire member with that ID can inspect the small lobby view and attempt the open seat.
The view contains status, settings, seat count, their own seat and the initialized
game ID. It omits account/session IDs, source deck links and deck contents.

Joining requires explicit acceptance of the exact proposed disclosure settings,
a different authenticated user and a permitted supported deck. The service locks
the lobby, rechecks the creator's original session, validates the stored snapshot
against the current bundle and prepares the second deck. Seat `p2`, the game's
initial checkpoint and the lobby's started status commit in one transaction.
Concurrent joiners cannot create extra seats/games. A repeated successful join
with the same user/source deck returns its existing result without replacing the
accepted snapshot. Cancelling is restricted to the creator of a waiting lobby.

Existing source deck edits, privacy changes or deletion do not rewrite a deck
already accepted with permission. The frozen snapshot includes its private
source identifier, executable pins and content hash. Incompatible or corrupted
stored snapshots fail explicitly under the current development-only engine
policy. Lobby settings cannot yet be edited; later disclosure changes need their
own consent and viewer-reset flow.

Deleting an account nulls its lobby/participant ownership references, preserving
game history. A lobby without its creator cannot admit new players. No account
or deck cascade deletes authoritative games. Explicit game deletion cascades to
its lobby and participants. Full production retention/anonymization and cleanup
of abandoned lobbies remain release work; no production gameplay is collected.

All lobby rows and private deck snapshots are excluded by the existing whole-
`play` contributor sanitizer and dump filters. Keeping session IDs as soft
references lets auth-session truncation run independently after gameplay data
has been cleared.

The isolated DB suite exercises consent mismatches, session/user mismatch,
expiration, sign-out, bans, stale creator readiness, private decks, concurrent
joins, cancelled/incompatible lobbies, saved input through source edits, and an
injected failure after game insertion but before the second seat. Run
`bun run play:storage:test` with the explicit local test URL described in
[storage.md](storage.md).

## Three-minute invitations and teammate delivery

Waiting lobbies expire three minutes after creation. Migration
`0057_crossfire` includes the deadline, a default-on `show_leader`
setting, and `play.invitations`, which binds a lobby to one invited teammate.
Direct link invitations remain available. Directed invitations require current
shared team membership when sent and only their recipient can take the second
seat. A deleted recipient retains the directed marker, never opening the seat
to other accounts. Creation is serializable, with up to three attempts for transaction conflicts; duplicate pending invitations to
the same teammate and more than ten pending invitations per sender are rejected.

The API projects the host's leader/base identities only when `show_leader` is
true (the host can always see their own). Neither invitation summaries nor
socket events contain deck lists, source deck IDs, or private game state.
`GET /api/crossfire/invitations` returns the account's pending incoming/outgoing
invitations; `/teammates` lists current teammates; deleting
`/invitations/:lobbyId` declines an incoming invitation.

`/api/ws/invitations/crossfire` uses the existing main API origin and Better Auth
session. It is separate from the game-worker socket. Transactional PostgreSQL
NOTIFY sends lobby invalidations to account-scoped socket rooms across API
instances. Clients refetch on connection/reconnection; notifications are not a
durable message queue. Heartbeats revalidate sessions, idle sockets close, and
connections are bounded per account and instance.

Each enabled API instance runs a bounded two-second sweep over the indexed
waiting-lobby deadline; SKIP LOCKED supports multiple instances. Expiry emits
the same invalidation as creation, cancellation, decline and acceptance.
Admission also checks the deadline when committing the second seat, so a stale
client cannot join during sweep delays. Started games never expire this way.
No scheduled job, new database, port, or environment variable is required.
The whole `play.*` schema remains excluded from contributor dump data, including
invitation recipient IDs.
