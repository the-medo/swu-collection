# Crossfire game worker

[GameWorker](../../play/worker/games.ts) manages the lifecycle of many durable
games in one process. Its callers authenticate before acquiring a binding.
Concurrent bindings for the same game share one restore and one database lease;
another process cannot host that game until ownership is released or expires.
Bindings and callbacks are server-private and contain no transport contract.

The defaults are 128 loaded/loading games, 32 queued operations per game,
15-second leases, checkpoints every 20 commands, and two minutes of retention
after the last binding is released. These are bounded development defaults,
not measured production capacity. Each game's operation queue is independent.
The existing durable host continues to validate and commit engine progress.

The process scheduler must call `maintain()` more frequently than lease expiry.
Concurrent ticks coalesce. Idle actors release their leases and memory; attached
actors receive heartbeats. Busy actors renew through their commands without an
accumulating heartbeat queue. If the durable host pauses after losing ownership
or an uncertain storage write, its bindings are retired and queued callbacks
cannot continue using that actor. New admission restores committed state.

`stop()` refuses new bindings/operations, drains the already running operation,
rejects pending callbacks, and releases owned leases. A restore that finishes
after shutdown cannot resurrect a game. Lease fences make repeated release safe
even if a replacement worker has already acquired ownership.

The [listener](../../play/worker/server.ts) binds this lifecycle to authenticated
sockets and viewer-only publication; see [transport](transport.md). The separate
entrypoint is `bun run play:serve`, with `CROSSFIRE_ENABLED=1`, `DATABASE_URL`,
the exact `BETTER_AUTH_URL` origin and an explicit `CROSSFIRE_PORT`.
`CROSSFIRE_HOST` defaults to `127.0.0.1`. It uses a native PostgreSQL pool of eight
connections, not the main HTTP app or its Drizzle-mutated client. It does not
run migrations; apply the application's migrations before launching it.

The default scheduler ticks every second, coalesces overlapping work and prunes
expired tickets at most once per minute. `/health` reports listener availability
without game/auth metadata; it is not a database health or capacity guarantee.
SIGTERM/SIGINT stop admission, close clients, drain already-running operations,
release leases and close the database pool. The process has a ten-second shutdown
deadline. A killed process leaves ownership to expire through the existing fence.

Bun 1.3.14 can leave its `stop()` promise pending after server-initiated socket
closure while its listener has already stopped. The service invokes forced stop
and unrefs the listener, then awaits its own tracked operations and game leases
instead of depending on Bun's socket counter. The fresh-process network test
checks successful SIGTERM exit.

## Operational telemetry

The worker samples aggregate operational telemetry every 15 seconds and keeps
seven days of detailed samples in `play.worker_metrics`. Older samples are
compacted into `play.worker_metric_rollups`: 10-minute buckets through day 30,
then hourly buckets with no expiry. In a container it reads Linux cgroup v2 (or
v1) memory and cumulative CPU counters. The displayed memory working set removes
reclaimable inactive-file cache while still including the replay thread,
finalizer child and other processes in the worker container. CPU follows common
container-tooling semantics: one fully occupied core is 100%. Host development
deliberately reports process RSS/CPU instead of mislabeling a broader host cgroup
as the Crossfire container. The supported worker image sets `CONTAINER=true` so
compatible runtimes without Docker's `/.dockerenv` marker still use cgroup counters;
custom container deployments must set the same variable.

Each sample also records process RSS/heap, event-loop scheduling lag, total
running games, games whose last accepted action was within two minutes, loaded/
loading/attached/busy actors, queued actor operations, worker capacity, live and
replay connections, rooms, ended games awaiting archival and finalized games
awaiting statistics publication. Samples contain no game IDs, account data,
commands, card data or authoritative state. The contributor-data sanitizer
removes both telemetry tables with every other `play` table.

No cron or Coolify scheduled task is required. Maintenance runs after the first
successful sample at startup and approximately hourly afterward. Only complete
aged buckets are compacted, so the detailed tiers may retain slightly more than
their nominal duration. Downtime pauses maintenance; the next worker start
catches up. Both promotions happen in one transaction under an advisory lock,
preserve sampled maxima and worker identity, and remove source rows only as part
of committing their summaries. Failed maintenance is retried with the next sample.
Hourly summaries retain peaks rather than averages; they cannot reconstruct the
original 15-second sequence or outages shorter than their bucket.

Admins can inspect the latest sample and 1/6/24-hour, 7/30-day, 1-year or all-time charts under
**Administration → Crossfire → Operations**. The page refreshes every ten
seconds and marks the worker offline when the newest sample is more than 45
seconds old. It shows the current worker identity and breaks chart lines across
worker restarts or missing samples; longer ranges further group the retained
history into roughly 720 display buckets and retain each metric's highest value.
This is a
process-liveness signal, not proof that PostgreSQL or every recoverable game is
healthy. The dashboard follows the currently supported single-worker deployment;
concurrent workers and routing between them remain unsupported.
Migration `0059` adds the rollup table and must be applied before deploying this
worker. Data already removed by the earlier seven-day-only retention cannot be recovered.

The [worktree launcher](../../scripts/worktree-dev/README.md) now allocates a
separate loopback worker port and includes Crossfire in up/start/down/status/logs
when enabled. Vite routes `/api/ws/crossfire/:gameId` to that process through the
same frontend origin, preserving existing HTTPS/WSS access. Generated worktree
environment remains local. Production process supervision and reverse-proxy
configuration are not supplied by this development launcher.

`bun run play:storage:test` against the explicit local test URL covers shared
loads, competing ownership, independent games, queue/game limits, idle recovery,
shutdown during a command, ownership loss and shutdown during restoration.

## Runtime configuration

The dedicated [worker image](../../Dockerfile.crossfire) and
[Compose reference](../../play/deploy/compose.example.yml) are described in the
[operations guide](architecture-and-operations.md#recommended-coolify-deployment).
Configuration is validated before the listener starts:

| Environment variable                  | Default | Allowed range                            |
| ------------------------------------- | ------- | ---------------------------------------- |
| `CROSSFIRE_MAX_GAMES`                 | 128     | 1–1000 loaded/loading live games         |
| `CROSSFIRE_REPLAY_IDLE_MS`            | 240000  | 180000–240000 ms                         |
| `CROSSFIRE_REPLAY_CHECKPOINT_ACTIONS` | 5       | 5–10 actions                             |
| `CROSSFIRE_REPLAY_MAX_GAMES`          | 32      | 1–128 cached histories                   |
| `CROSSFIRE_REPLAY_MAX_MIB`            | 256     | 8–1024 MiB encoded cache budget          |
| `CROSSFIRE_REPLAY_GAME_MIB`           | 64      | 1–256 MiB per game, no larger than total |

These cache byte limits cover encoded payloads and indexes, not an exact bound on
process RSS. A lower total budget also requires a compatible per-game budget.
Other bounds remain in code: 128 cached states per game, four simultaneous history
loads and 32 pending replay requests. The replay thread uses its own pool of two
connections; one finalizer child uses up to two more. Both stop with the worker.

The finalizer checks for ended games at startup and every 30 seconds, handles up
to four per invocation, and has a 60-second deadline. Failed verification leaves
source rows intact for retry; no persistent filesystem or extra service is needed.
Run the worker with a shutdown grace longer than its ten-second drain deadline
(the Compose example uses 20 seconds). Inspect finalization deferrals and ended-game
backlog through server logs/database monitoring; `/health` alone does not detect
a backlog, incompatible games or database failure.
