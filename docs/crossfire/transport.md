# Crossfire transport contract

The browser-safe `@swubase/crossfire/view` export includes the transport envelope
(wire version 1), view types, strict incoming-message validation and modular delta
helpers. This envelope version is independent of the current engine/view version.
The [separate worker](worker.md) serves `/api/ws/crossfire/:gameId`. The main
API continues to issue tickets through the existing authenticated HTTP routes.

The first socket message is `authenticate` with the HTTP-issued ticket and wire
version. Tickets never belong in URLs. `command` carries a UUID command ID and
the current view's game ID, epoch, visible revision, opaque decision/option IDs
and optional selected card handles. It cannot supply a seat, engine revision,
private card IDs or arbitrary state. `resync` requests a fresh connection epoch
and snapshot. `preferences` changes only that viewer's `showRevealedHands` flag;
the game's disclosure policy still determines which hands may be revealed.

A snapshot supplies the viewer's role/seat and complete permitted `GameView`.
Subsequent deltas contain game/epoch/version continuity, the previous and next
**visible** revisions, changed modules and card/event upserts/removals. Collection
ordering is sent only when removal followed by upsert would not reproduce it.
Historical log entries can change: their hover reference loses its current-card
link when that exact copy becomes hidden, so events also support upserts.

Always project before diffing, separately for every viewer. Private-only changes
produce neither a delta nor a visible revision increment. `applyViewDelta`
rejects gaps, repeated revisions and different game/epoch/version combinations;
the client must request a snapshot instead of guessing missing changes. The
helpers consume public view data, never checkpoints or an authoritative patch.

`submitConnectedViewCommand` computes a canonical hash of the validated wire
command. The durable host checks authorization and looks up its receipt **before**
translating opaque handles. A reconnect gets new handles, but can retry the exact
old payload with its original command ID and receive a duplicate acknowledgment
without executing or shuffling again. Reusing the ID with a different payload
is a conflict. If the old request never committed, obsolete handles are rejected
and the user needs a choice from the new snapshot. Raw engine and wire command
hashes have distinct domains. No viewer handles need to enter the private journal.

Acknowledgments carry only the command ID and duplicate flag. They do not expose
the private journal sequence or engine revision. All state publication must
follow durable commit and live authorization. This contract adds no compatibility
promise for older development engines.

`bun run play:check` covers delta reconstruction across setup/actions for both
players and spectators, private-only changes, log-reference updates, ordering,
continuity rejection and strict wire validation. `play:storage:test` covers
opaque-command retries after connection replacement, conflicts and uncommitted
obsolete commands alongside existing transactional authorization/recovery tests.

The listener accepts an exact configured Origin, enforces a five-second first
message deadline, and never publishes before successful ticket redemption and
live authorization. It revalidates before queued work, projected output and
acknowledgment, and periodically while idle. Seat replacement closes the older
local socket with 4409; the database counter also fences commands in flight.
Spectators cannot submit commands or gain access beyond the agreed hand policy.

Incoming frames are text JSON, at most 16 KiB. Each connection has eight queued
messages and a token bucket (burst 30, refill 15/second). The default limits are
512 total connections, including unauthenticated sockets, and 64 per game.
Two game slots are reserved for the players so spectators cannot fill their seats.
Closed sockets retain their capacity reservation until already-queued work has
finished. Repeated disconnects cannot create an unbounded backlog of database
authentication requests outside the connection limit.
Messages plus buffered output exceeding 1 MiB close the slow/oversized connection;
there is no unbounded publication queue. These are development bounds, not load
test results. Long-game log pagination and production capacity remain later work.

Close codes: 4400 malformed protocol, 4401 missing/expired authentication,
4403 denied Origin/access, 4408 overload/backpressure, 4409 replaced seat,
1012 service shutdown, 1013 temporary worker unavailability. A reconnect obtains
a new ticket and snapshot. It must stop automatic retries for denied/replaced
access and bound retries for temporary outages. Do not treat every close as an
invitation to reconnect forever.

Real local WebSocket tests cover admission failures, private views/deltas,
spectator preferences, room isolation, replacement/retry/resync, sign-out,
message floods, frame limits, graceful process shutdown and committed recovery
after killing a worker and expiring its lease. Cross-process routing is not
implemented: a game owned by another worker is temporarily unavailable here.
