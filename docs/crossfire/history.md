# Crossfire game history

Crossfire keeps its private gameplay in the existing PostgreSQL `play` schema.
Migration `0057_crossfire` creates the live journal, recovery snapshots,
completed archives and lifecycle metadata. The initial setup
snapshot precedes the initiative command; that command records the initial deck
shuffles. Restart and replay use those recorded random inputs.

## Live and completed storage

| Data | While running | After verified finalization |
| --- | --- | --- |
| `play.games` | Head, executable versions, lease | Head, result/round summary, end timestamp, lifecycle |
| `play.journal_live` | One row per accepted command, including random inputs, facts and retry receipt | Rows removed atomically with archive publication |
| `play.checkpoints` | Initial and latest recovery snapshot, normally every 20 commands | Rows removed; initial encoding lives in the archive |
| `play.journal_history` | Absent | One gzip `bytea` payload, format/checksum/size/head metadata |

The lifecycle is `running` → `ended` → `finalized`. The terminal command saves the
summary and terminal checkpoint in its normal transaction. An ended game accepts
known retries but no new gameplay. Result lists can use `games.summary` and
`ended_at` without reconstructing the board. The old development-only terminal
checkpoint backfill is covered by the [migration consolidation audit](migration-baseline.md);
incompatible engine encodings remain retained and fail verification explicitly.

[The archive codec](../../play/history/archive.ts) stores the exact initial
checkpoint encoding, all command entries and receipts, generated action metadata,
server random inputs, facts and terminal summary. It includes abandoned branches.
Its format is independent of the pinned engine/state/card versions. During
prerelease development only the current engine is supported.

## Actions, branches and recovery

[Timeline metadata](../../play/history/timeline.ts) distinguishes durable steps
from root actions. Payment choices, searches, free plays and their triggers stay
inside their originating action. Setup/regroup choices remain addressable steps.
An action ID is its first durable step; its start points to the previous position.

A trusted undo control record has a new global sequence and branch identity,
points to the restored position, and records the approver, target hash, ID allocator
and disclosure settings. Reconstruction restores mechanical state while advancing
the revision and preserving the current allocator and disclosure policy. It does
not invert card effects or delete the previous continuation. Timeline verification
checks that the requester owns the eligible action and the approver is the other
seat. This is the storage foundation; user-facing request/approval is a later step.

[History verification](../../play/history/records.ts) re-executes every branch in
audit order and checks inputs, facts, hashes, action metadata and command identity
uniqueness. Legacy rows without action metadata receive it through verified replay.
Only the earlier states actually referenced by undo records need retention during
a full verification. The general recovery reader supports archived undo histories;
live undo records require an atomic checkpoint at the restored position.

## Background finalization

[The worker supervisor](../../play/history/finalizer.ts) starts at most one child
at a time, checking every 30 seconds. Each child handles at most four pending games
and has a 60-second timeout. Engine reconstruction, JSON processing and compression
run in that separate process. Pending jobs are database rows, so worker restart
or termination cannot forget them. Failed games retain their source data and move
to the back of the queue; failures log no private inputs or state.

The finalizer reads a consistent history, verifies and compresses it. Publication
validates the payload again, locks the game and rechecks its sealed head, summary
and versions. Archive insertion, live-row/checkpoint deletion and the finalized
status commit together. Racing finalizers are idempotent. An interrupted or failed
transaction leaves the previous recoverable representation intact.

Readers select the live or archived representation in one repeatable-read
transaction. Retry lookup also checks archived receipts, so an old command can be
acknowledged without executing it again. Neither the compressed journal nor its
initial checkpoint is a public API payload.

Limits are 8 MiB compressed, 64 MiB decompressed, 10,000 journal entries and 128 MiB
of retained undo targets during verification. Oversized histories stay in live
storage and fail finalization; they are never truncated. These bounds are not a
production capacity claim. The process currently retries deferred games each
sweep; operational measurements and tuning follow in the implementation plan.

The existing contributor sanitizer truncates every `play` table, including
`journal_history`, and both sanitized export paths exclude `play.*` table data.
Production backups must include the private schema. Database deletion makes pages
reusable; it does not immediately shrink PostgreSQL files or remove backup/WAL cost.

## Validation

`play/testing/history-archive.test.ts` covers branch preservation, metadata
derivation, tampering, format rejection and decompression limits.
`play/integration/history.test.ts` covers racing publication, rollback during
cleanup, archived retry recovery and a fresh finalizer process. Run database tests
with `CROSSFIRE_TEST_DATABASE_URL` pointing at the migrated local worktree database.
The broader storage test uses `bun test --timeout 60000` for its 358 continuations.

The replay service/cache and WebSocket navigation are described below. Browser
controls, player-approved undo, bookmarks and practice forks are the next steps.

## Replay service and cache

A ticket now has a `live` or `replay` purpose. Replay admission checks the same
session, seat, spectator policy and executable versions, but does not increment
the playing connection epoch or acquire the authoritative game lease. It cannot
submit gameplay commands. Opening replay tabs therefore leaves the playing tab
connected. Ticket purposes and per-game private history keys are included in
`0057_crossfire`.

[ReplayService](../../play/history/replay-service.ts) runs reconstruction and its
shared cache in a separate worker thread. A private IPC response carries state to
the socket service, which projects it for that viewer. The browser receives only
that permitted view or its delta, plus opaque position/branch handles. The game
key stays in PostgreSQL and makes these handles stable across cache/process
restarts. A handle never grants authorization.

The cache starts at the initial state and warms the requested ancestry. It saves
states every five completed root actions, after 20 commands in a long action,
and at requested positions. It can restore an undo branch directly from its
parent and verifies the recorded target/outcome hashes; full finalization also
validates the abandoned continuation and approval eligibility. Earlier branches
remain selectable. Returning to a previous position still advances the viewer's
transport revision.

Default bounds: 32 games, 256 MiB total encoded payload/index budget, 64 MiB per
game, 128 cached states per game, four simultaneous history loads, 32 pending
worker requests and a ten-second request deadline. These byte budgets estimate
serialized data, not exact JavaScript heap/RSS. Timeout or worker failure rejects
pending requests and permits a fresh worker on a later request. State caches are
shared; viewer projections and cursors are kept separately per socket.

Entries expire after 240 seconds without a seek/open or accepted gameplay.
Heartbeats, connection revalidation, periodic eviction and idle tabs do not touch
this clock. Accepted commands invalidate a loaded live history and refresh its
activity; commits during a load are not lost. The next seek reads committed
progress. Compaction and eviction cannot invalidate a logical position.

The `replay-seek` envelope accepts step ±1/5, previous/next action, start/end,
a fractional seek, an opaque position or an opaque branch. Responses echo a
request ID. Socket ingress coalesces obsolete seeks and rejects a late result
before projection/publication. A `replay-live` notification announces new committed
progress without moving an independent replay cursor. Follow playback should
seek in response to those notifications, not poll to keep idle caches alive.

Current policy is checked after reconstruction. Historical hand disclosure is
intersected with current entitlement. A participant can use their own view or a
public view without revealed hands; they cannot impersonate the opposing seat.
Spectators retain only the explicitly permitted spectator view. Perspective,
branch and disclosure-policy changes replace the projection epoch. Large seeks
may send a permitted snapshot when it is smaller than the delta. Leaving a
private top-deck inspection explicitly clears it in view deltas.

## Replay UI

The Crossfire home page lists the signed-in account's games using keyset-paginated
summary reads. `/crossfire/replay/:lobbyId` opens the existing board in inspection
mode. Controls provide step/5-step/action navigation, a timeline, playback speed,
branch, authorized perspective and board orientation. Arrow keys move one step;
Shift+arrow moves five. Following a live game reacts to accepted gameplay notices,
without polling or extending the cache lifetime for idle tabs.

Copy position links contain only opaque position/branch handles. Reconnect restores
the selected position. The browser retains at most twelve permitted positions in
component memory, scoped to projection epoch, branch and perspective. Obsolete
responses update only its transport base, preventing gaps during rapid seeks.

Run `play/browser/history-smoke.ts` with the same explicit local database opt-in as
the game browser smoke. It exercises real auth/API/worker/archived replay and writes
`.swubase/crossfire-gallery/history.html`, served from the frontend's ignored
development gallery directory. No private checkpoint is sent to the browser.

## Agreed undo

A live player can request undo of their current root action or their immediately
preceding action before another root action starts. `play.undo_requests` records
the requester, requested head/hash, target/hash and a 60-second expiry. A pending
request blocks new journal appends even after reconnect/restart. Reads, sessions,
leases and replay access continue. Expiry, cancellation or the opponent's decline
resumes the unchanged game. At most 100 requests are retained per live game.

Approval rechecks the other seat, current session, exact head and target under the
game lock. It consumes approval in the same transaction as the undo control record
and retained checkpoint. Restoring state preserves current disclosure, increments
the revision and preserves the ID allocator. All live viewers receive fresh opaque
handles. The UI warns about information already seen and random effects. No shuffle
is introduced. The abandoned branch remains replayable. Finalization removes
request coordination rows; accepted undos remain permanently in the archive.

The database/host acceptance covers Kelleran's search, free Desert Sharpshooter play
and nested targeted damage, followed by an alternative action, restart recovery,
compaction and abandoned-branch replay. Socket tests cover reconnect, duplicate
approval, pause and rejection of abandoned view handles. Set
`CROSSFIRE_HISTORY_LIVE=1` for the history browser smoke to capture the approval UI.

## Bookmarks

`play.bookmarks` stores account ownership, the game, opaque position/branch handles,
a label and timestamps. It has no journal-row foreign key or payload offset.
Compaction and undo preserve the handles. Current replay authorization still applies
on every open. Losing spectator access makes a saved bookmark unavailable; it does
not turn the bookmark into a permission grant. Deleting the owning account or
explicitly deleting the source game cascades to its bookmarks. Compaction does neither.

Creation runs in the game worker, anchoring the displayed committed position after
validating its viewer epoch/revision. The account API lists, renames and removes
bookmarks without reconstructing state. An account can retain 300 bookmarks. Labels
are limited to 120 characters. The board/replay header creates bookmarks; the
Crossfire home page offers rename/delete and exact-position links. Browser caches
are session-scoped and cleared on session unmount. Contributor exports remove the
entire private `play` schema's contents, including bookmarks.

## Practice from a bookmark

A participant can invite the original opponent to practice from an earlier
position in a finalized game. Terminal positions and ongoing games cannot be used.
`play.practice_requests` stores the frozen position, both account IDs, a reserved
new game/lobby identity and 24-hour consent expiry. An account can have ten active
outgoing invitations. The home page lists invitations; the opponent reviews the
requested position in replay and explicitly accepts. Both keep their original seats.
Broader opponent replacement and omniscient practice sharing are outside this scope.

The isolated replay executor builds an exact compatible checkpoint, including
pending choices and any embedded payment cancellation checkpoint. It changes the
game identity and starts with hands concealed and spectators disabled. Card
instances, deck order, attachments, rule history and the ID allocator are retained.
Approval revalidates entitlement and seals one independent game transactionally;
duplicate acceptance returns the same lobby. New tickets establish the new seats'
sessions. Source session IDs, tickets, connections and leases are not copied.

The new game's `provenance` identifies the source position/hash but its own initial
checkpoint provides complete recovery. Explicit source deletion can remove the
invitation and source bookmarks without deleting or breaking the practice game.
Undo cannot reach before a practice game's starting position; if that position is
inside a nested action, its earlier root action is outside the new history.

The history browser smoke's default archived mode covers invitation, opponent
approval and opening the new practice board. The live mode covers undo; both
exercise bookmark creation, rename and exact-position navigation.

## Operations and measured limits

The [operations guide](architecture-and-operations.md) covers the dedicated
worker container, Coolify proxy/network reference, ordered migrations and local
`.env.worktree` startup. No separate database or replay service is required.
[Worker settings](worker.md#runtime-configuration) expose replay cache capacity,
spacing and three-to-four-minute idle expiry with validated bounds.

[The reproducible benchmark](history-benchmark.md) measures physical PostgreSQL
allocation, compressed payloads, cold/warm seeks, permitted JSON updates, cache
expiry and live commands during replay/finalization. Its synthetic 6–10-round
games averaged 23.4 kB of finalized core storage and 3.3 ms warm five-step seeks;
production traffic, WAL/backups and sustained capacity need separate measurement.

## Player statistics

After archiving, the same bounded finalizer publishes each participant's result
and card/round metrics into the account statistics tables. A separate durable
receipt keeps failed exports retryable without changing the archive. See
[player and deck statistics](statistics.md) for match identity, undo/cancellation
accounting, BO3 completion, privacy and realtime delivery.
