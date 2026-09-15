# Crossfire next implementation plan: history, replays, undo and bookmarks

Status: **implemented and validated** (2026-09-11).
Prepared 2026-09-11 against `f96e8bd1`, engine `crossfire-0.123.0`, state 107,
card bundle `crossfire-core-122`. The user authorized implementation on 2026-09-11.
Commit each completed implementation step, as requested.

Implementation progress:

- Step 1: private timeline contracts and validated action-state restoration are
  implemented and tested with Kelleran's nested search/play and a new continuation.
  Steps 2–6 connect them to durable storage and user-facing undo.
- Step 2: the journal is renamed to `journal_live`; checkpoint replacement retains
  initial + latest atomically, including for migrated games. Database tests cover
  failed replacement, recovery and retained receipts.
- Step 3: completed history codecs, branch verification, archived receipt/recovery
  readers and an atomic finalizer are implemented. Background reconstruction runs
  in a bounded child process with database-backed discovery. Race, corruption,
  cleanup rollback and fresh-process checks cover the archive boundary.
- Step 4: separate replay tickets, isolated shared state cache and authorized
  WebSocket seeks are implemented. Five-action warming, four-minute idle eviction,
  stable positions, branch reconstruction, stale-response rejection and permission
  changes have focused cache/socket checks.
- Step 5: account history and replay board controls are implemented, with step/action
  navigation, branches, playback, perspectives and a bounded permitted-view buffer.
  Browser checks cover archived history, backwards steps, reload and mobile; client
  tests cover obsolete responses and permission/reconnect invalidation.
- Step 6: persisted undo requests, expiry/decline/cancel, transactional opponent
  approval, branch restoration and fresh viewer handles are implemented. Kelleran
  nested damage, recovery/compaction, reconnect and stale-command checks pass.
- Step 7: account-owned bookmarks, labels, deletion and board/replay controls are
  implemented. A pre-undo bookmark reopens the same state after archive compaction
  and a fresh replay worker; ownership and browser CRUD/navigation checks pass.
- Step 8: finalized-position practice invitations require both original players.
  Independent forks preserve pending choices, hidden zones and payment rollback
  state, retain provenance and use fresh tickets. Database and browser consent/
  creation checks pass; source deletion does not prevent fork recovery.
- Step 9: reproducible PostgreSQL/storage/latency measurements, validated cache
  settings, a dedicated worker image and Coolify Compose reference are delivered.
  The local container recovers live and archived games, runs replay/finalization
  and drains on shutdown. All 123 focused history/database/socket/client tests,
  type/boundary checks, frontend build, migrations and current-engine replay/
  fresh-process continuation checks pass. Browser flows and the eight-image
  history gallery cover replay, undo, bookmarks and practice. Local review is
  complete; the required Claude review was attempted but failed to run. Existing
  repository-wide type errors remain outside this phase. Production deployment
  and capacity certification were not performed. See the [measurements](../../../docs/crossfire/history-benchmark.md).

This is the next phase of [the delivery plan](plan.md). It refines the storage
and replay parts of the [original proposal](architecture.md), covering the
decisions agreed in the storage/replay discussion. The
[architecture and operations guide](../../../docs/crossfire/architecture-and-operations.md)
describes the current system. The requirements below are the implemented scope;
explicit production and broader-feature exclusions remain applicable.

## Outcome and agreed decisions

Players can review a game forwards or backwards, request an opponent-approved
undo of a complete action, bookmark an exact position, and start a separate
practice game from an authorized bookmark. Finished games use compact storage.

| Area | Agreed direction |
| --- | --- |
| Database | Keep the existing PostgreSQL database and private `play` schema, with the existing separate game worker and SWUBASE login |
| Live journal | `play.journal_live`: one durable row per accepted command, including its resulting events and server random inputs |
| Completed journal | `play.journal_history`: one compressed history record per finalized game, initially in a PostgreSQL `bytea` column |
| Live snapshots | Retain the immutable initial snapshot and only the latest recovery snapshot |
| Completed snapshots | Retain the initial snapshot inside the verified history payload; remove the final and intermediate recovery snapshots |
| Replay reconstruction | Run the matching engine on the backend; restore an earlier state and replay forwards, including for backwards navigation |
| Replay cache | Keep loaded histories and full states every 5–10 actions in backend memory; share the state cache between viewers of the same game/branch/version |
| Cache expiry | Clear an idle replay cache after 3–4 minutes; use a configurable **four-minute default** |
| Browser traffic | Send permitted views and their deltas; keep only a small buffer of permitted positions in the browser |
| Undo | Request, pause, opponent approval, restore the start of the action, then continue on a new branch |
| Bookmarks | Persist stable position references that survive compaction and undo; offer viewing and a separate practice fork |

Compaction changes physical storage, not logical history. Keep every command,
decision, random outcome, event, receipt and accepted undo, including abandoned
branches. Do not flatten a game into only its final board or final branch.

## Current implementation and measurement baseline

- [The store](../../../play/storage/postgres.ts) writes one accepted command per
  `play.journal` row. The same row provides retry deduplication. Game ownership,
  journal append, optional checkpoint and game-head checks already protect
  committed progress.
- [The durable host](../../../play/host/durable-game.ts) currently stores a
  checkpoint initially, every 20 accepted commands and at game end. All remain
  in the database. It encodes and hashes state on every command even when it
  does not store that checkpoint.
- [Recovery](../../../play/storage/recover.ts) restores a checkpoint and verifies
  subsequent inputs, facts and hashes. [The engine](../../../play/engine/advance.ts)
  already has root action/finish-action frames and serializable nested choices.
  Its `actionHistory` is rules bookkeeping, not a durable replay action index.
- [Projection](../../../play/projection/projector.ts) and
  [view deltas](../../../play/view/delta.ts) already separate private state from
  browser updates. General undo, replay navigation, bookmarks, practice forks,
  cache management and history compaction are not implemented.

Local measurements on 2026-09-11 used 160 completed simulations from the tracked
Top 8 deck fixture; 120 finished in 6–10 rounds. The simple policy favors base
attacks and declines optional effects. These are not human-play averages or a
production capacity test. Units below use 1 kB = 1,000 bytes.

| Measurement | Observed result |
| --- | --- |
| Current PostgreSQL allocation per game, by round cohort | About 153 / 176 / 197 / 215 / 225 kB for rounds 6 / 7 / 8 / 9 / 10 |
| Initial snapshot, average | 29.0 kB JSON; 3.8 kB compressed column payload |
| Intermediate snapshot, average | 55.7 kB JSON; 7.6 kB compressed column payload |
| Final snapshot, average | 73.9 kB JSON; 9.7 kB compressed column payload |
| Recovery from initial snapshot, median | 291 ms, replaying 77 commands |
| Recovery from latest checkpoint, median | 56 ms, replaying 9 commands |
| Proposed initial snapshot + full journal + result summary, gzip level 6 | 16.3 kB average; 12.8–20.8 kB payload range |

PostgreSQL 16.15 used pglz compression. The database allocation measurement
included table/index/TOAST storage for game heads, journals, checkpoints, lobbies
and participants. Snapshot and gzip figures are payload-only. They exclude WAL,
backups and update/delete churn. The gzip prototype has no undo branches or the
new action index yet. The 9- and 10-round cohorts contain only four and two games.
Recovery timing uses a warm engine, includes integrity checks, excludes database
reads/process startup, and compares the same position before the terminal command.
Do not treat fewer journal rows or these measurements as proof of production latency.

## History positions and action boundaries

Define three separate concepts in shared server contracts:

- **Step:** a committed command/decision and its settled result. One step may
  include multiple automatic effects and server random inputs.
- **Action:** a root play, attack or other player action and all nested effects,
  including free plays and their triggers. Its starting position is before costs
  and effects. Setup/regroup decisions remain addressable steps even when outside
  a player action. Extra root actions get separate action identities.
- **Position:** a stable game/branch/step reference, independent of database row
  location, compression offsets, visible log indexes or WebSocket revisions.

Give journal records stable IDs and explicit parent/action/branch relationships.
The durable sequence must remain monotonic through undo; do not truncate history
or reuse command IDs. Accepted undo is a new control record referencing a prior
position. Preserve both the original continuation and the new active branch.
Recovery must interpret these records deterministically rather than concatenating
commands from incompatible branches. Historical card/log references must remain
unambiguous when restored instances appear again on another branch.

Expose authorized opaque position handles to clients. Keep private journal
sequence counts/internal IDs out of otherwise public views. A replay cursor can
move backwards while its transport revision keeps increasing. Each viewer has an
independent cursor; stepping a replay never advances or rewinds the live game.
For an ongoing game, authorize only positions in its committed history. Following
new live progress updates the replay cache; reconstruction never invents future
draws or choices. Preserve access to already committed positions during compaction.

## Storage and finalization

Rename/migrate the current journal into `journal_live` through the existing
Drizzle migration owner. Preserve journal constraints and receipt behavior.
For compatible legacy journals, derive action/position metadata from verified
replay without changing the original inputs, facts or integrity hashes.
Add `journal_history`, lifecycle/result metadata, and bookmark storage through
reviewed migrations. No new database, external queue or R2 credentials are needed
for this phase. Exclude all new private data from contributor dumps.

During play, keep committing every command before acknowledging it. Keep the
existing 20-command durable checkpoint interval initially, but replace obsolete
non-initial checkpoints transactionally after storing the new one. This interval
is separate from the replay cache's 5–10-action spacing. A target earlier than
the latest checkpoint can always be rebuilt from the initial one and history.

Distinguish **running**, **ended/pending finalization**, and **finalized** games.
Save a small terminal summary with result, ending round, timestamp, head/branch
identity and final integrity hash. Result lists must not need engine replay.

Finalization must be durable, retryable and bounded:

1. After the terminal command is committed, make the game discoverable for
   background finalization. Resolve any existing undo request and seal gameplay
   before publishing a completed archive. Retried commands remain recognizable.
2. Read a consistent history and build a versioned compressed payload containing
   the original initial checkpoint encoding, all branches/entries, action index,
   receipts, random outcomes and result summary.
3. Bound compressed/decompressed sizes, verify checksums, and replay the relevant
   branches to verify integrity, including the active branch's final state.
4. Under a final transaction, recheck the exact sealed head/version, persist the
   verified archive and metadata, and remove obsolete live rows/checkpoints.
   Retain the initial snapshot canonically in the archive; no second permanent
   copy is needed in the live checkpoint table.
5. On interruption or verification failure, retain recoverable source data and
   retry. Duplicate finalizers must not publish conflicting histories or delete
   unarchived progress.

Implement the history reader before enabling deletion. It must serve completed
positions and resolve archived receipts so late retries never re-execute an old
command or move the current branch. Finalization should survive worker restart;
it must not depend solely on an in-memory queue. Run compression/reconstruction
with bounded background execution that does not block live command handling;
an `async` function alone does not isolate synchronous engine CPU work.

R2 archival remains a later storage-adapter option. Physical database space reuse
after deletion, vacuum behavior, backups and write load still need measurement.

## Backend replay cache and browser navigation

Load/decompress a history once per cached game/version. Cache complete states at
action boundaries, initially every **five actions**, configurable within the
agreed 5–10 range. Add intermediate checkpoints for unusually long actions or
frequently requested positions when justified by measured reconstruction work.
Warm progressively so requesting one position does not require eagerly rendering
every view or replaying every abandoned branch.

For a seek, find the nearest cached state on the target branch's ancestry at or
before that position, then execute only the missing recorded steps. Reconstruction
uses original random outcomes. Do not implement per-card inverse effects.

Cache policy:

- Share private states by game, engine version and branch/position. Coalesce
  concurrent loads. Keep viewer permissions, cursors and projected buffers separate.
- Update idle activity on accepted gameplay affecting that cache or meaningful
  replay use: opening/seeking/stepping and playback progress. Heartbeats, polling,
  idle open sockets and background warm-up do not extend its lifetime.
- Evict after **240 seconds** without such activity, even if an idle replay tab
  remains open. Load again on the next request. Eviction removes memory, not
  journals, bookmarks or the saved game.
- Bound total/per-game bytes, cached games, pending loads and reconstruction work.
  Evict least recently used eligible entries under memory pressure. Protect
  in-flight work against eviction races without pinning idle connections forever.
- This policy applies to replay caches. Do not confuse it with the authoritative
  live worker's ownership/lease lifecycle or evict a resolving live game merely
  because no card was played for four minutes.

Build replay history access and controls for next/previous step, five steps
back/forward, previous/next action, seek, playback speed and permitted perspective.
Keep source position and selected branch visible without exposing private IDs.

For each request, project the target state under event-time visibility and current
viewer entitlement, then diff it against that viewer's displayed position. The
browser receives changed visible card/event records and changed modules. Initial
load, resync or permission changes use a replacement permitted view; large seeks
may use one when cheaper than a delta. Never send authoritative checkpoints,
hidden identities, execution frames or the compressed journal to the browser.

Keep a small browser memory buffer of already authorized nearby views for quick
repeated back/forward navigation. Scope it to game, branch, perspective and
permission epoch; invalidate on context changes. Coalesce rapid seeks and reject
outdated responses. Preserve exact-copy hover references and sensible animation
behavior when seeking. Card artwork uses existing independently cached assets.

## Opponent-approved undo

Undo targets the start of the current root action, or the most recently completed
action before another action has begun. A player cannot silently rewind only their
own earlier action while retaining intervening opponent actions. Larger rewinds
are outside the first implementation.

Kelleran acceptance example: play Kelleran, choose an eligible three-cost unit
that is free after the applicable costs, resolve its When Played target/effect,
then undo. After opponent approval, restore the position before Kelleran was
played, including resources, cards, damage, use limits, history and pending work.
The player can play Kelleran again, choose another eligible unit or take another
legal action. No card-specific undo implementation should be needed.

Persist request/target/current-head identity, requester and approval state. Pause
normal game commands while approval is pending. Approval must still match the
requested head/branch; denial, cancellation or expiry resumes the unchanged game.
Handle reconnects, duplicate requests, crashes and simultaneous requests. Keep
authentication and maintenance working while gameplay is paused.

On acceptance, reconstruct the target, append a durable undo/branch control
record, and publish only after commit. Preserve monotonic journal/receipt
identities and produce fresh viewer/decision handles so queued commands from the
abandoned continuation cannot apply. Reconcile restored mechanical state with
the current revision/ID allocator through an explicit validated engine/host
contract; do not bypass existing revision and integrity checks with an arbitrary
state assignment. Account access, disclosure consent, leases, bookmarks and
other non-gameplay metadata are not rewound.

Keep the abandoned branch addressable. Replay can distinguish the final line of
play from undone actions; existing bookmarks keep their original destination.
Restoring the board cannot erase information already seen. The approval prompt
must flag inspected/revealed information and random effects. Undo itself restores
the original deck order and does not introduce a shuffle.

## Bookmarks and practice forks

Store a small per-user bookmark with stable game/branch/position, optional label
and timestamps. Add create/list/rename/delete and open-at-position behavior to
the live board and replay UI. Bookmarking anchors a committed position, not an
unfinished animation or unsubmitted target selection, and does not advance play.

Bookmarks reference logical positions, never a live journal row or byte offset.
They remain valid after compaction, cache eviction and undo. Creating or sharing
a bookmark does not grant hidden-state access. Enforce replay authorization on
every open and invalidate cached views when entitlement changes. Keep all
referenced branches inside the archive. Future archive deletion rules must state
what happens to bookmarks; compaction alone never deletes their destination.

Offer **View from here** and **Play from here**. The second creates a new practice
game after appropriate authorization, normally once the source game is finalized.
It needs consent/access to use the exact private state; do not allow live-game
forks that could be used to probe future draws or concealed cards.

Create the fork server-side using a compatible engine and an exact checkpoint,
including a pending choice, hidden zones, attachments and rule history. Assign a
new game identity and authorized seats; do not copy old session/ticket/lease data.
Give it its own initial checkpoint and history plus source-position provenance.
It must remain independently recoverable if the source cache is evicted. Keep
the original game/result unchanged and label the new game as practice.

## Implementation sequence and gates

Each row is a reviewable delivery step; split larger steps into smaller commits
when needed. Load `swubase-validation` and `swubase-change-review` for every code,
schema, test or tooling change, plus the relevant skills below. Use
`swubase-documentation` when updating the durable guides.

| Step | Deliverable and acceptance gate | Domain skills |
| --- | --- | --- |
| 1. History contracts | Stable steps/actions/positions/branches and a versioned control-record format. Nested free plays remain in their parent action; IDs survive serialization and a simulated branch restoration without collisions. | `swubase-online-play`, `swubase-architecture` |
| 2. Live storage | Migrate to `journal_live`; retain initial + latest checkpoint; preserve restart recovery and retry receipts. Failed checkpoint replacement leaves the prior committed state recoverable. | `swubase-online-play`, `swubase-database-migrations`, `swubase-development-data` |
| 3. Completed history | Add `journal_history`, lifecycle/result summaries, archive reader and bounded finalizer. Verify before atomic cleanup; restart/retry/racing finalizers cannot lose progress, and old receipts remain usable. Prove the branch-capable format before enabling deletion. | `swubase-online-play`, `swubase-database-migrations`, `swubase-development-data` |
| 4. Replay service/cache | Authorized seeks over live and archived history, shared bounded state cache, five-action spacing and four-minute idle expiry. Cached and uncached states/projections agree; a late response cannot overwrite a newer cursor. | `swubase-online-play`, `swubase-backend-endpoints`, `swubase-websockets`, `swubase-auth-permissions` |
| 5. Replay UI | History entrypoint, step/action navigation, seek, playback speed, perspective, branch indication and a small permitted-view buffer. Backwards navigation updates the board without full private payloads or stale log references. | `swubase-frontend-components`, `swubase-frontend-routing`, `swubase-frontend-api`, `swubase-websockets` |
| 6. Agreed undo | Persisted request/approval, gameplay pause and deterministic branch restoration. Prove the Kelleran chain plus declined/stale/duplicate approvals, reconnects, private information and recovery after accepted undo. Archive and replay the resulting branches. | `swubase-online-play`, `swubase-backend-endpoints`, `swubase-websockets`, `swubase-auth-permissions`, `swubase-frontend-components`, `swubase-database-migrations` |
| 7. Bookmarks | Account-owned bookmark persistence and board/replay controls. A bookmark on an undone branch opens the same position after finalization, cache eviction and restart. Unauthorized users cannot resolve it. | `swubase-database-migrations`, `swubase-development-data`, `swubase-backend-endpoints`, `swubase-frontend-api`, `swubase-frontend-components`, `swubase-frontend-routing` |
| 8. Practice forks | Authorized new games from bookmarked positions, including nested pending choices. Frozen private state and remapped seats are valid, provenance is retained, and source games/results remain unchanged. | `swubase-online-play`, `swubase-auth-permissions`, `swubase-decks`, `swubase-backend-endpoints`, `swubase-frontend-components`, `swubase-development-data` |
| 9. Operational proof | Maintainable before/after storage and replay benchmarks; bounded memory and CPU under multiple viewers and live games; cache/worker restart and finalization recovery; deployment and local setup documentation. | `swubase-online-play`, `swubase-architecture`, `swubase-worktree-dev`, `swubase-documentation` |

Steps 1–3 must account for undo branches and bookmark references even though their
UI arrives later. Do not ship a lossy archive format and redesign it when adding
undo. New wire/engine/archive versions must explicitly reject incompatible data.

## Validation, development and deployment

- Run relevant engine/host/storage conformance checks and current-version
  fresh-process recovery. Compare replay from the initial state with cached
  reconstruction at action boundaries and pending choices, across branches.
- Exercise migration and storage tests only against the intended local database.
  Follow [the migration workflow](../../../docs/migrations.md), run
  `bun run db-migrate`, and verify contributor-data exclusion for new tables.
  Existing compatible development games must migrate without silent deletion;
  reject unsupported historical encodings explicitly.
- Check duplicate command receipts before/after compaction, sealed-head races,
  corrupted/truncated archives, bounded decompression, and interrupted cleanup.
- Test cache expiry with a controlled clock: seeks/steps/playback refresh it;
  heartbeat-only traffic does not; simultaneous loads coalesce; evicted positions
  reload correctly; one viewer's permissions never leak into another's buffer.
- Exercise both player perspectives and spectators on forward/backwards seeks,
  undo, forks and permission changes. Check hidden-state exclusion in payloads,
  logs, errors, image requests and bookmark URLs. Use stable authorized position
  handles rather than exposing private journal sequence numbers.
- For frontend changes, run the focused browser checks and
  `bun run --cwd frontend build`. Extend the screenshot gallery with replay
  navigation, pending/accepted undo, bookmarks and practice-fork flows.
- Benchmark real retained PostgreSQL allocation separately from compressed
  payloads, WAL/update churn and backup needs. Measure cold/warm seek latency,
  bytes transmitted, cache memory/expiry and live command latency while replay
  reconstruction/finalization runs. Record hardware and sample limitations.
- Keep the existing worktree and managed database. Use the supported launcher
  and generated `.env.worktree` together with development `.env` settings. Do not
  copy local environment files or start ad-hoc containers. No production action
  or deployment is part of this plan-only change.
- The target Coolify layout keeps the application and game worker separate,
  with persistent PostgreSQL storage; this does not claim Crossfire is already
  deployed there. Complete/document the necessary container, proxy, startup and
  drain configuration alongside cache limits, finalization and memory budgets.
  A new game database or a dedicated replay service is not a prerequisite.
- Obtain the repository-required independent read-only review for implementation
  changes, resolve findings, update current-behavior documentation and commit
  each completed step. This planning-only commit needs link/diff checks, not the
  engine/browser suite or a code review.

## Defaults to review and explicit limits

The user agreed the overall design. These concrete defaults make the first
implementation bounded and remain adjustable during review:

- Replay checkpoints every five actions; idle expiry four minutes; global/per-game
  memory limits chosen from the new benchmark rather than asserted capacity.
- Undo is initially for a running game's current or immediately preceding action.
  No automatic postgame undo grace window is included. Finalized games can be
  continued through practice forks; reopening a result would need a separate
  lifecycle decision.
- Historical reconstruction always uses recorded randomness. A new continuation
  records new server random inputs when its newly accepted actions require them;
  it does not blindly replay the abandoned branch's future inputs. Undo approval
  calls out information/random effects and makes no promise to erase knowledge.
- Private bookmarks and authorized participant replay access come first. Wider
  replay sharing and omniscient disclosure require explicit permissions; a
  bookmarked position is not permission to copy both players' private state.
- Keep only the newest engine executable during unreleased development, as
  already requested. Do not silently reinterpret old states with changed card
  behavior. Durable production replays/bookmarks/forks require compatible readers
  and engine retention or a validated migration strategy before release.
- Chat, further card coverage, matchmaking, arbitrary scenario editing,
  multiplayer, distributed worker routing and R2 archive migration remain
  separate work. They are not implied by completing this phase.
