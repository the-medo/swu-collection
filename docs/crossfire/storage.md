# Crossfire durable storage

The private adapter in [play/storage](../../play/storage/postgres.ts) uses an
injected PostgreSQL connection pool. It imports neither the main web app nor its
credentials. The root Drizzle migration `0057_crossfire` creates the complete
gameplay schema, including [completed histories](history.md), and `0058` adds
aggregate worker telemetry.
There is no public storage endpoint or browser export.

| Table                  | Stored responsibility                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `play.card_bundles`    | Immutable JSON card data, required engine, checksum and publication source                                                                |
| `play.games`           | Immutable engine/card pins, committed head sequence/revision/hash and worker lease/fence                                                  |
| `play.journal_live`    | Accepted command identity/hash, revision interval, ordered engine inputs including random outcomes, resulting facts and state hash        |
| `play.journal_history` | Verified compressed completed histories, including original branches and receipts                                                         |
| `play.checkpoints`     | Complete private serialized state at a committed sequence, including pending choices, hidden cards and history                            |
| `play.worker_metrics`  | Seven days of aggregate worker/container resources, actor pressure, connections and game lifecycle counts; no game or account identifiers |

The journal's unique `(game_id, actor_id, command_id)` index is also the durable
command receipt. Retrying an identical request returns its original committed
sequence/revision; reusing its identity with a different request hash fails.
`append` also distinguishes a new write from a duplicate, so a host never
promotes speculative random outcomes when an earlier commit won a retry race.
These internal IDs, hashes and revisions are not viewer protocol fields.

`create` atomically stores a trusted initial checkpoint and game metadata.
`claim` assigns an unowned or expired game a strictly newer fence; PostgreSQL's
clock governs expiry. `renew` requires the current unexpired owner. `release`
cannot clear a replacement owner's lease. A caller must renew long-running
ownership deliberately; the adapter starts no background timer.

`append` locks the game row, verifies its owner/fence and expected head, appends
the journal/receipt and optional checkpoint, then checks the lease again while
advancing the head. All writes share one transaction. An error rolls back every
part. A duplicate command is looked up before the expected-head check so a retry
after a lost acknowledgment can recover its receipt. A displaced owner cannot
use this path. Success means the transaction committed; publication belongs to
the host after that return. The consolidated migration creates `journal_live`
directly; checkpoint retention is enforced by the storage adapter.
Each new checkpoint replaces older non-initial checkpoints in the same transaction;
sequence zero and the newest checkpoint remain. A failed replacement restores
the previous checkpoint along with the previous head.

Recovery reads the head, latest checkpoint and subsequent journal in one
repeatable-read transaction. [recoverGame](../../play/storage/recover.ts) requires
a compatible runtime and the game's pinned card data, replays recorded inputs without generating new
randomness, and checks every revision, sequence, emitted fact and resulting
state digest. The digest canonicalizes JSON object member order, preserving
array order. It is private integrity metadata, not an authentication mechanism.
Checkpoints retain their executable's text encoding rather than JSONB's object
normalization. Card releases are retained separately in `play.card_bundles`; compatible older
minor recordings use their original catalogs through the current runtime. See
[card release compatibility](card-releases.md). Recovery never casts
its objects to the current state type.

The adapter trusts its server caller to validate engine transitions and the
acting seat. The durable host below supplies this engine boundary;
[lobbies](lobbies.md) persist accepted deck snapshots and disclosure consent, and
[connections](connections.md) bind authenticated commands to their owned seats.
HTTP/WS admission and bounded service pools are implemented. Production
retention/deletion policy and separate database grants remain operational work. Deleting an account or deck does not cascade into the game history. Only explicit game deletion cascades to its
own checkpoints and journals. No public deletion API exists.

## Contributor data

[000-crossfire.sql](../../scripts/remote-dev/sql/000-crossfire.sql) truncates every
ordinary table in the `play` schema before other contributor sanitization and
asserts that no rows remain. This includes future gameplay tables and ignores
all sharing opt-ins. It preserves empty DDL so the migration journal still
matches a restored dump. Both producer export paths also use
`--exclude-table-data='play.*'`. A future cross-schema foreign key must be
reviewed: truncation deliberately does not cascade into unrelated domains.

## Verification

Run `bun run play:check` for the headless suite. Run the opt-in database suite
with an explicitly selected, migrated local worktree database:

```bash
CROSSFIRE_TEST_DATABASE_URL='<local worktree PostgreSQL URL>' bun run play:storage:test
```

The suite refuses a non-loopback host or a database outside the `swubase_`
worktree naming family. It creates uniquely named synthetic games and deletes
only those fixtures. Its sanitizer check rolls back after verifying empty
current/future tables. Fresh-process recovery requires the current executable
in the worktree's ignored `.swubase/crossfire-bundles` archive.

The suite covers 358 complex continuations, receipt retries, revision races,
lease takeover and expired owners, an injected database failure after journal
insertion, exact state/fact recovery, independent games and sanitized table data.
The durable host suite also kills a separate worker before commit and after
commit before acknowledgment, then waits for lease expiry and restores under a
new fence. Network admission/transport and production load retain later gates.

## Durable host

[DurableGame](../../play/host/durable-game.ts) is an in-process game owner backed
by the store. It accepts an already acquired lease and an explicitly configured
checkpoint interval/lease duration. The command queue defaults to 32 entries
including the running command and rejects overflow. Each game owns its own
queue; a held database write does not block a different game.

`initializeDurableGame` validates core-practice input, resolves initial server
randomness and persists the first checkpoint. Subsequent player choices and all
server random outcomes they request are committed as one journal entry. This
initializer accepts trusted configuration. The lobby service uses its checkpoint
builder inside the same transaction as accepted seats and frozen SWUBASE decks.

`restore` loads the pinned card catalog, checks runtime compatibility and
reconstructs committed state without changing its version tuple.
`submit` takes a trusted engine seat and retry ID, detaches and validates the
input, checks the seat and game, and rejects player-supplied randomness. It
renews ownership and checks durable receipts before executing. Legal inputs
advance into a separate candidate state. Only a successful new commit promotes
that candidate and returns a result; duplicate commits reload the authoritative
outcome, including its original random draws. Returned states are detached
server-only values; a service must project them before sending anything to users.
The connected command adapter supplies authorization callbacks for the start of
queued work and the journal transaction. The latter holds live auth/seat locks
through commit, rejecting commands from replaced or revoked connections.

Any storage failure during submission pauses the actor and leaves its last
known committed state intact. Queued commands fail while paused. `reload`
resolves uncertain writes from the database before clearing the pause. It never
re-executes a submitted command automatically. A retry with the same identity
can then return its existing receipt or execute once if no commit occurred.
Invalid game inputs and expected authorization denial do not pause an otherwise
healthy actor. A denied append writes no journal, checkpoint or game head.

The game worker calls `heartbeat` before lease expiry when idle. The caller must provide a checkpoint interval rather
than inheriting an unmeasured production default. Terminal positions always get
a checkpoint and a terminal result summary. The background finalizer verifies
and compacts completed games, as described in [game history](history.md). The host accepts compatible historical engine versions with their original
installed card data. The generated executable archive retains only the newest
smoke artifact; it does not prune historical JSON releases. See
[card releases](card-releases.md) for compatibility and installation.

## Retained space and database maintenance

[The reproducible history benchmark](history-benchmark.md) compares initial/latest
snapshot retention and finalized archives using PostgreSQL table, TOAST and index
allocation. Finalization reduces retained rows; it does not undo WAL already
written or remove those rows from older backups. Deleted live tuples become
reusable through autovacuum. PostgreSQL generally retains allocated relation
files, so disk size need not shrink immediately after compaction. Monitor dead
tuples, autovacuum, checkpoint latency, WAL/replication and backup growth separately
from the archive payload. No automatic `VACUUM FULL`, database-wide cleanup or
finished-game deletion is introduced.

### Leaving a match

`POST /api/crossfire/lobbies/:lobbyId/leave` authenticates the current account and
requires the configured Origin. It works without a game WebSocket. A participant
can leave the whole match, including during BO3 sideboarding. The match row
serializes this decision with next-game readiness. An already completed match
is unchanged; repeated requests return the first accepted exit.

`play.match_exits` stores one durable request per match. A compatible running
game gets a `pending` request. The worker consumes requests in bounded maintenance
passes through the existing game queue; the normal `concede` engine command,
terminal checkpoint, journal receipt and `forfeit` exit commit atomically.
Ordinary commands cannot pass an accepted pending exit. A pending undo does not
prevent concession. The opponent wins the match without adding artificial games
to its score. Conceding just the current BO3 game uses the authenticated game
connection and does not create a match exit.

A permanently incompatible game is marked `abandoned`, with no winner. No old
engine or codec is loaded: its existing snapshots, hashes and journal remain
untouched. Clearing its lease and incrementing its fence prevents an old host
from committing again. Abandoned games cannot be claimed or connected to, and
are excluded from finalization. Their raw data remains available for diagnosis;
replay still requires the matching engine. A pending exit also becomes abandoned
if a version deployment makes its game incompatible before it is processed.

Game lifecycle invalidations use the existing account WebSocket's PostgreSQL
notification channel, addressed to both participants and delivered after commit.
The worker publishes the normal viewer delta to connected players and signals
live replays. No private game state travels over the account notification channel.
