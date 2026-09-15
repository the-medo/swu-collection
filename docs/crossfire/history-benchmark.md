# Crossfire history storage and latency measurements

Measured on 2026-09-11 using Bun 1.3.14, PostgreSQL 16.15 (`pglz` TOAST
compression), Linux, an AMD Custom CPU 1772 with 12 logical threads and 16.36 GB
system RAM. [Raw aggregate results](benchmarks/2026-09-11-history.json) retain the
sample counts, percentiles, table allocation and runtime measurements.

## Workload and scope

[The sampler](../../play/scripts/history-samples.ts) plays tracked tournament
Top 8 decks with a deterministic synthetic policy that favors attacking bases.
All 24 attempted games completed; 15 ended within the requested 6–10 rounds and
are included. They averaged 87.2 accepted commands and 52 root actions (maximum
120 commands). A command includes a submitted choice inside an action. This is
not a sample of human games and does not represent every deck or long-game state.

[The runner](../../play/scripts/history-benchmark.ts) persists and verifies those
histories through the real PostgreSQL adapter. Physical retention models use TEMP
tables with the current core schema and indexes, including TOAST allocation.
Five copies of each sample amortize relation pages across 75 games; these copies
are not independent matches. Each model receives the same payloads. The baseline
keeps every 20-command checkpoint, the live model keeps initial/latest, and the
finalized model keeps one archive containing the initial checkpoint and journal.

## Storage

Sizes below use decimal kB (1,000 bytes). Physical averages cover `games`, journal
and checkpoint tables only, including their indexes and TOAST. They exclude
lobbies, participants, auth, bookmarks, invitations, WAL, replication and backups.

| Measurement | Average | Largest measured |
| --- | ---: | ---: |
| Initial full snapshot, uncompressed JSON | 29.3 kB | 32.9 kB |
| Final full snapshot, uncompressed JSON | 81.7 kB | 108.1 kB |
| Completed gzip archive payload | 19.3 kB | 24.8 kB |
| Physical core allocation, keeping every recovery checkpoint | 171.0 kB/game | — |
| Physical core allocation, initial/latest checkpoints | 135.4 kB/game | — |
| Physical core allocation, finalized archive | 23.4 kB/game | — |

The finalized model uses about 83% less retained core allocation than the live
model and 86% less than retaining every checkpoint in this workload. That is not
a database disk-shrink guarantee: this benchmark measures separately populated
relations. Deletes create reusable space after vacuum; existing relation files,
WAL already generated and old backups have their own lifecycles. No whole-
database cleanup or production retention policy is inferred from these results.

## Replay and live commands

Cold seeks include loading/decoding a history and reconstructing its final state
in the replay worker. Warm measurements alternate five steps backward/forward
within one game. Exact state hashes and application of projected deltas are
checked. Latency excludes browser/network rendering. Wire sizes serialize the
real replay envelope and choose the smaller permitted update, excluding TLS and
WebSocket framing, independently cached artwork and connection setup.

| Measurement | Average | p95 |
| --- | ---: | ---: |
| Cold final-position seek (15) | 381.2 ms | 575.1 ms |
| Warm five-step seek (180) | 3.3 ms | 16.6 ms |
| Permitted replay update (180) | 9.6 kB | 17.0 kB |
| Replacement permitted view of the same positions (180) | 62.6 kB | 84.7 kB |
| Durable pass command, no replay readers (30) | 3.5 ms | 5.8 ms |
| Durable pass command, three replay readers (30) | 4.6 ms | 6.0 ms |
| Durable pass command, three readers plus finalizer child (30) | 5.7 ms | 8.4 ms |

Replay load alternates positions across games with a four-game/16 MiB cache to
exercise eviction. The finalizer uses a separately generated ended game and its
real child-process entrypoint. Commands continue while these background jobs
are running. This is a short local overlap test with a cheap pass action, not
sustained multiplayer capacity, a throughput SLA or a projection-heavy workload.

The final measured cache held four histories and 23 states at 1.57 MB of encoded
payload/index accounting. Process RSS was 376 MB after sample generation,
reconstruction and temporary allocations; it is not the cache's retained heap.
The finalizer child and PostgreSQL are excluded from that process measurement.
Idle eviction and reload pass with an accelerated 40 ms threshold; controlled-
clock tests separately verify the actual four-minute boundary and that maintenance
and idle tabs do not extend it.

Defaults remain five-action checkpoints, four-minute idle expiry, 32 histories,
256 MiB total and 64 MiB per game. These leave room above the measured samples
without asserting that 32 large histories or 128 active games fit a particular
container. Configure them using [the worker settings](worker.md#runtime-configuration)
and monitor actual RSS, command latency, database load and archive backlog.

## Reproduce locally

Use this feature's migrated managed worktree database. The benchmark requires an
explicit local test URL that exactly matches `DATABASE_URL`; it refuses other
hosts/database names. This wrapper loads `.env` and `.env.worktree` without
printing credentials:

```bash
bun --env-file=.env --env-file=.env.worktree -e '
  const task = Bun.spawn(["bun", "run", "play:history:benchmark"], {
    env: { ...process.env, CROSSFIRE_TEST_DATABASE_URL: process.env.DATABASE_URL },
    stdout: "inherit", stderr: "inherit"
  });
  process.exit(await task.exited);
'
```

`CROSSFIRE_BENCH_SAMPLES` accepts 4–80 (default 24). Results are written to ignored
`.swubase/history-benchmark.json`. The runner removes only its generated durable
game IDs; allocation tables are temporary. Run on an otherwise quiet machine for
useful comparisons. A killed benchmark can leave its own fixtures for deliberate
cleanup; it never scans/deletes unrelated histories.

With the managed services running, the same wrapper can invoke
`play:history:browser` for replay/bookmarks/practice and set
`CROSSFIRE_HISTORY_LIVE=1` for the undo approval flow. Captures are served at
`/.swubase/crossfire-gallery/history.html` on the development frontend. The index
links to this page and both runs preserve one another's screenshots. These are
local synthetic screenshots, not deployed production assets.
