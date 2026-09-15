# Crossfire connection admission

[CrossfireConnections](../../server/lib/crossfire/connections.ts) provides the
private ticket issuer/redemption service. Migration `0057_crossfire` includes hashed tickets
and a connection counter per accepted seat. The [HTTP issuer](http-admission.md)
is available when explicitly enabled. The [separate WebSocket worker](worker.md)
uses this service as its admission boundary.

The main API must derive `Principal` from its Better Auth context. `issue`
requires an exact configured HTTP(S) Origin, a live session on an unbanned
account, a started lobby and the current engine pins. Player tickets require
an owned seat. Spectators require the lobby's permission and cannot own either
seat, even when spectator hand visibility is more permissive than player hand
visibility. Lobby metadata alone grants no game-view access.

Issuance returns a cryptographically random 256-bit opaque ticket, game ID and
expiry. Only its SHA-256 hash is stored; neither auth tokens nor the raw ticket
are persisted. The default lifetime is 30 seconds, configurable from 1 to 60
seconds. HTTP responses are uncached and tickets must be kept out of
URLs, logs, telemetry and browser persistence. The worker should accept the
ticket in its initial authenticated connection message, with a short timeout
and no game output before redemption.

`redeem` checks Origin, the exact game, current permissions, ticket expiry and
single use inside a transaction. Invalid Origin/game requests do not consume
the ticket. PostgreSQL row locks prevent concurrent redemption. A successful
player redemption increments that seat's connection counter and returns a
server-owned `ConnectionGrant`. A newly signed-in session of the same user can
reconnect without the original admission session. Older counters lose access;
the opponent's counter is independent. Spectators have no command seat.

Never accept a `ConnectionGrant`, user ID, session ID, role or connection counter
from client input. The worker retains the grant returned by redemption.
`revalidate` checks it against live sessions, bans, ownership, counters, spectator
permission and current engine pins. Ticket expiry limits redemption; an accepted
connection remains subject to its session and permissions after the ticket is
expired or pruned. Account deletion removes ownership and invalidates tickets
without deleting games.

For command writes, call `requireConnection(tx, grant, true)` **inside the same
transaction as the journal append**, then enforce the player role and matching
game/actor seat. Checking only when a socket opens or before a command is queued
leaves a reconnection race. The locked check holds session/user, lobby and seat
rows until commit, so a reconnect or revocation is ordered before or after that
command. Session expiry is checked again after lock waits. The
[connected command adapter](../../server/lib/crossfire/commands.ts) now connects
this check to the durable host: it binds game/actor to the redeemed player grant,
checks authorization when queued work starts, and rechecks under locks before
the journal write. Spectators cannot submit commands. A new connection of the
same seat can retry its prior command ID without generating new randomness.

Expected admission denial leaves the committed position unchanged and does not
pause the game. An unexpected error during the append still pauses the host
until committed recovery. Direct `DurableGame.submit` without authorization is
for trusted headless callers; the network worker must use
`submitConnectedViewCommand`, which checks receipts before translating opaque
handles so retries survive reconnects. See [transport](transport.md). Engine state and
checkpoints never contain grants or auth identities.

The worker must revalidate before handling queued input and sending projected
output, periodically revalidate idle connections, and close revoked sockets.
The listener now performs these checks, bounds connection/messages and replaces
the projection when a viewer changes hand-display preferences. The game's agreed
disclosure policy remains immutable. In-game policy changes with fresh consent
remain later work; a display preference cannot alter that policy.

`pruneExpired(limit)` materializes a bounded batch of expired ticket rows before
deletion, skipping locked redemptions. The worker schedules it; issuance does not run
global cleanup. Tickets and seat counters are excluded by the whole-`play`
contributor sanitizer and dump filters.

The local integration suite covers token storage, single use and concurrent
redemption, concurrent same-seat reconnects, wrong/missing Origin, wrong game,
expiry, spectators, sign-out, session replacement, bans, current-bundle checks,
transactional seat locking, account deletion, pruning and contributor exclusion.
Host integration tests cover reconnect/ban between the queue check and commit,
session expiry during a lock wait, old queued commands, denied roles/game/seat,
and a replacement connection retrying a committed command.
Run `bun run play:storage:test` with the explicit local URL in
[storage.md](storage.md).
