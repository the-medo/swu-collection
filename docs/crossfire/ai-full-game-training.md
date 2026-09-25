# Crossfire AI: full-game training

The prepared specialist policy can train across all six user-selected decks:
Greef Aggression, Vader Cunning, Mandalorian Colossus, Dedra Colossus, Aurra Data
Vault and Krennic ramp. The original Crossfire engine supplies legal choices and
seat-visible observations; there is no database or web-server dependency. This
is an offline learning experiment, not an online bot or evidence of competitive
strength. Strategy-specific qualification remains in the
[six-deck roster](../../.ai/planning/feature-crossfire-ai/training-roster.md).

## Specialist model and focused experiments

The approved [Krennic curriculum experiment](ai-krennic-curriculum.md) uses an
independent fork, a practice-learning gate and a 100,000-game budget with larger
fixed-opponent evaluations every 10,000 games. The original runs below remain
stopped/ready.

The original `league-run-01` was stopped at the user's request on 2026-09-24,
at **1,200,000 completed games / 64,875 updates**. Its immutable final model,
recoverable checkpoints, and historical reports remain available. This run is a
comparison baseline, not a qualified shared foundation. Its weights are not
imported into the replacement model.

`specialists-run-01` contains a freshly initialized **353,726-parameter** model,
with zero training games. The architecture `crossfire-specialists-v1` includes:

- A shared context/candidate encoder initialized from scratch.
- Six leader experts, each with dedicated action features and a value adjustment.
  A general fallback handles unknown own-leader features; it does not qualify
  new decks for admission or play.
- Five strategy experts: aggro, space aggro, control, midrange, and ramp.
- A learned router selecting a mix among each pinned list's assigned strategies.
  For example, Krennic activates ramp/control and Vader activates aggro/space aggro.
- A matchup adapter combining shared features with an explicit slice of visible
  opponent aggregates and card identities. It is one conditional module, not a
  separate policy for each opposing deck. It receives no private opponent deck
  index, hidden hand, or deck order.
- A learned action scorer combining shared, leader, strategy and matchup features,
  plus shared and leader-specific value estimation for training.

The [specialist roster](../../play/ai/specialists/roster.json) records the initial
strategy assignments from the user's six lists. These are list-specific routing
constraints, not universal labels for every build of a leader. Strategy weights
within the eligible set are learned from context. Inactive experts have no
gradient for that minibatch, including no Adam momentum update. The model is
trained jointly by the existing full-game PPO optimizer; specialization is not
evidence that difficult lines have been learned. Krennic practice training now
has a passing initial learning check; full-game strength qualification remains
necessary.

To prepare a **new, empty** run without starting training:

```bash
taskset -c 0-8 bun run play:ai:specialists:prepare --output .swubase/crossfire-ai/specialists-run-01 --baseline-run .swubase/crossfire-ai/league-run-01 --cpus 9 --workers 9
```

Preparation saves a fresh frozen bundle and recoverable checkpoint, pins a copy
of the legacy frozen opponent, checks export/reload parity, writes `ready`
status, and exits. It never overwrites an existing run. To deliberately start
training that prepared run later:

```bash
taskset -c 0-8 bun run play:ai:specialists:train --output .swubase/crossfire-ai/specialists-run-01 --resume --cpus 9 --workers 9
```

This retains the 1,000-game deck rotation, all pairings and mirrors, both-side
self-play learning, the shared nine-CPU/100 GB limits, and five-minute disk
monitor while running. There is no continuous run game/time cap. The 20-game
evaluation per learner deck now uses the pinned **retired league model**, not a
random initial specialist. These reused small samples remain development
signals, not a qualification benchmark. The opponent pool used in the 250
snapshot training games contains previous specialist policies.

`load_frozen` dispatches by the artifact architecture and validates the pinned
engine/encoding/deck contract plus exact specialist routing specification.
The same file contains all component weights, router and scorer. Legacy artifacts
remain loadable as opponents. Legacy and specialist training checkpoints cannot
silently resume into one another. Changing specialist routing requires a new
version/migration rather than relabeling existing weights.

The dashboard defaults to the specialist run and displays initialization,
component parameter counts, training-decision exposure, update counts and the
planned human-replay workflow. The run selector keeps the legacy archive and
its win rates separate. Leader counters count routed decisions; strategy counters
count eligible decisions and updates, not router weight or contribution. The
unknown-leader fallback has its own visible counters. Component exposure counts
are not strength ratings.
Opening the page never starts training. Disk-check age remains visible while a
run is stopped, without presenting an inactive monitor as overdue.

Human replay upload is **not implemented**. The scorer is compatible with the
optimizer's imitation objective, verified on synthetic/engine observations;
no human data was imported. A future importer must validate provenance, consent,
engine versions, event-time player visibility, legal choices, and train/test
separation. It must not train from an omniscient replay projection.

Validation on 2026-09-24: 32 Python tests (including real six-deck games,
specialist update isolation, frozen parity, checkpoint recovery and invalid-resume
preservation), 54 existing engine/AI adapter tests, 11 dashboard tests, focused
TypeScript/ESLint checks and the frontend build passed. Browser checks covered
desktop/mobile, run isolation, history navigation and refresh failures. A separate
validation run resumed, saved and stopped twice, finishing at 24 games / 4 updates;
`specialists-run-01` remained at zero. Every prepared tensor matched a freshly
seeded initialization. These checks verify implementation, not playing strength.
The independent read-only Claude review completed; its actionable findings were
addressed and locally rechecked. The focused follow-up timed out after five
minutes without a result, so it did not provide a clean follow-up verdict.

## Add a training deck

Open `/tools/crossfire-training` in this development worktree and select
**Add training deck**. Paste a SWUBASE deck link or ID, select **Check deck**,
then choose one or more archetypes: aggro, space aggro, control, midrange, ramp.
The selector describes that list, not every list with the same leader.
Public/unlisted lists can be read anonymously; private lists require their
owner's authenticated session. The same deck-admission reader handles normal
and limited lists, including both limited visibility records. Unsupported
leaders/cards are reported before preparation; no vanilla fallback is used.

**Add deck and prepare run** reads and validates the deck again, then creates
a new `specialists-<request UUID>` run. The old run is never edited. Adding a
list always extends the registry's active specialist run, even when viewing an
older archive. The browser switches to the prepared run; opening the dashboard
without a run parameter selects the current active run. Training stays stopped.
The original `specialists` and `legacy` bookmarks retain their original meaning.

The workflow supports up to 32 lists. Existing leaders share their expert across
lists; new leaders receive a new expert. Each list has its own explicit archetype
mask and own-list indicator, so two lists with the same leader may use different
strategy combinations. Only the acting player's list indicator is encoded.
Opponent adaptation continues to use seat-visible information. Every run pins a
validated `roster.json`; live SWUBASE edits cannot change an admitted list.
Duplicate playable lists (same engine versions, leader, base and main deck) are
rejected even when metadata, sideboards or source IDs differ.

Expanded models use `crossfire-specialists-v2` and `roster-full-game-v2`.
Migration copies existing leader/strategy/scorer/value weights, remaps old card
columns by identity, and initializes added encoder columns to zero. New leader
modules retain fresh initialization. It refuses changed engine semantics,
removed cards/lists or relabeled existing archetypes. Tests verify preservation
of previous logits and value estimates on existing real observations, including
the frozen legacy opponent. The legacy opponent receives the same input-column
expansion; it has no learned knowledge of newly introduced identities.

The new run starts at zero games/updates with a fresh Adam optimizer and a
frozen copy of its expanded starting policy in the opponent pool. Provenance
records the parent checksum and counters; module exposure counters are carried
forward, and new modules start at zero. This is an explicit migration into a new
run, not a byte-identical optimizer continuation. Existing v1 checkpoints remain
loadable. Subsequent v2 additions preserve learned own-list columns too.

The global artifact lock excludes concurrent training or preparations. A roster
revision rejects stale submissions; successful retries with the same request ID
are idempotent. The run registry advances atomically only after the frozen model,
checkpoint, roster and ready status have been saved. A failed preparation leaves
the prior active run intact; retrying after another **Check deck** uses a new
request ID. An interrupted attempt's unpublished directory may remain for local
inspection and counts toward the disk budget.

The development-only `GET /__crossfire-training/runs` supplies the active run,
registry revision and a per-server mutation token. `POST
/__crossfire-training/decks/inspect` checks the source deck; `POST
/__crossfire-training/decks/add` prepares it. Writes require a matching browser
origin, JSON and the mutation token. The backend validates the session cookie
itself; no browser-supplied user ID or snapshot is trusted. A completed request
is recognized before reading the source deck again, so a lost-response retry
still works if that deck subsequently changes or becomes unavailable.

Preparation and its subprocesses are limited to logical CPUs 0–8. Artifact writes
use the existing 100,000,000,000-byte global budget and five-minute monitor.
Preparation has an HTTP operation timeout; continuous training still has no
game/time cap. To deliberately resume an expanded run later, use its ID and the
seed recorded in its `status.json`:

```bash
taskset -c 0-8 bun run play:ai:specialists:train --output .swubase/crossfire-ai/specialists-<request-UUID> --resume --seed <recorded-seed> --cpus 9 --workers 9
```

The trainer detects `roster.json` and covers every unordered pair including
mirrors in 1,000-completed-game blocks, balancing seats. A roster of N lists has
N × (N + 1) / 2 blocks per cycle. Six-list schedules preserve their historical
ordering; other sizes use lexicographic pair order. Histories and evaluation
deck indices are interpreted using each run's own roster.

Validation on 2026-09-24: 38 Python tests, 13 dashboard tests and six PostgreSQL
deck-admission tests passed. `bun run play:check` passed type checking, import
boundaries and all 3,325 engine tests, including the 56 AI adapter tests;
`bun run play:demo` reproduced its final state. Frontend and dev-middleware
type checks, focused ESLint and the frontend build also passed.
The browser workflow admitted an existing public Lando deck into an isolated
seven-list roster with user-selected Aggro/Midrange tags. It checked unsupported
cards, duplicate lists, required archetypes, reload, old/new run isolation and
mobile layout. A separate lifecycle check resumed, saved and stopped that v2
run twice, reaching 24 games / 4 updates; the actual legacy and specialist runs
were unchanged. These checks establish workflow correctness, not playing strength.
The task-only local review completed. The independent read-only Claude attempt
ended at its 15-minute timeout without findings or a review verdict; it is not
recorded as a successful independent review.

## Continuous six-deck league

Use the Python environment from the [tactical experiment](ai-experiment.md).
From the worktree root, initialize a **new** run from the latest finished
Greef/Dedra checkpoint:

```bash
taskset -c 0-8 bun run play:ai:league:train --output .swubase/crossfire-ai/league-run-01 --initialize-from .swubase/crossfire-ai/projection-smoke-01 --cpus 9 --workers 9
```

This command runs until an operator stops it, a failure occurs, or the disk
budget refuses another write. There is **no total game count, wall-clock or
per-game command limit**. The process and all nine Bun workers share logical
CPUs 0–8. It inherits the same 100,000,000,000-byte artifact budget described
below. An independent monitor checks allocated disk blocks every **300 seconds**,
even while a game is waiting; writes also check available budget. Monitor failure
stops new games and leaves the last valid checkpoints available. The accounting
includes the virtual environment, all old runs, models, test logs and reports.
Reserved headroom allows reporting a disk refusal before reaching the ceiling.

`league_schedule.py` repeats **21 unordered pairings**, including six mirrors.
Every block contains exactly **1,000 completed training matches**, with seats
balanced 500/500 for nonmirrors. This covers all 36 ordered deck pairings. A full
cycle contains 21,000 training matches. Interrupted matches do not advance the
block; they are tracked as cutoffs and use visible-value bootstrapping. Each
collection window is limited to the remaining matches in its current block.
The first three pairings are Greef/Krennic, Vader/Aurra and Mandalorian/Dedra,
followed by the Greef mirror; the round-robin then continues.

Three quarters of training games use the current policy on both sides, and both
sides' nontrivial choices contribute learning rows. One quarter uses a recent
frozen opponent, and only the current learner's choices contribute rows. Seats
and learner ownership alternate within these groups. The opponent pool retains
three snapshots, adding the current policy every ten PPO updates. Updates use
the original terminal win/loss/draw reward and no deck-style heuristics.

The six snapshots in `play/ai/full-game/league-decks.json` reproduce the pinned
user inputs and hashes in `selected-decks.json`. Sideboards stay inactive.
The larger vocabulary preserves the old feature meanings and learned weights
by remapping existing identity columns and initializing new identity columns to
zero. **Adam starts fresh for this expansion**; subsequent league resumes
restore Adam and random-number states. The original two-deck model contract
and bounded training commands remain usable.

### Results and progress comparisons

Open **Tools → Crossfire Training** (`/tools/crossfire-training`) in this
worktree's development app. Find its private URL with
`scripts/worktree-dev/swubase-worktree-dev status`. The dashboard refreshes every
five seconds and shows live game/update counts, current batch progress, CPU
allowance, disk-monitor timestamps and the latest saved model's game count.
Opening it does not start, stop or restart the trainer.

The default **Training · 1,000 games** view shows nonmirror batch win rates,
cycle-to-cycle changes and a clickable matchup history chart. **Frozen opponent
· 20 / deck** shows the separate, smaller progress checks described below.
Training win rates describe matchups while both decks' policies evolve; use the
unchanged frozen opponent view to compare against a fixed reference. Neither
measurement alone establishes competitive playing strength.

Select a run to browse its reports independently. The latest 210 completed reports load first. **Load earlier cycles** retrieves
older reports without limiting training or deleting history. Deck, opponent,
measurement, run and cycle are saved in the page URL; bookmarked older cycles load
their reports automatically. CSV export includes all loaded nonmirror training
batches. Mirrors contribute to training totals but have no comparison win rate.
If a refresh fails, the page retains the last results and reports the failure.

The read-only `/__crossfire-training/status` and `/__crossfire-training/history`
endpoints are Vite development middleware for registered local directories:
`league-run-01` (`run=legacy`), `specialists-run-01` (`run=specialists`), and
explicitly published `specialists-<UUID>` runs beneath
`.swubase/crossfire-ai`. Omitting `run` retains the legacy API default; the UI
explicitly requests its selected run. They return validated aggregate
metadata, with no model weights or filesystem paths. Keep the development app
on the supported localhost/private access profile. These endpoints and the
dashboard are unavailable in production builds.

Within the selected run directory:

- `status.json`: live PID, worker PIDs, affinity, completed games, updates,
  current pair, partial block results, timing and recent optimizer history.
- `disk-usage.json`: independently refreshed allocation and check timestamp.
- `batches/00000000.json`, etc.: permanent report for each 1,000-match block,
  seat counts, wins, draws, cutoffs, opponent-mode breakdown and model identity.
- `winrates.json`: the latest 100 **nonmirror** reports, with changes in
  percentage points when the same pair returns. All older reports remain in
  `batches/`; the history length does not limit training.
- `latest-model.json`: checksum, immutable model filename, full engine/deck/
  encoding contract, parameter count and training counters.
- `anchor-model.json`: the fixed initial model used for progress measurement.
- `checkpoints.json`: current and previous recoverable training checkpoints.
- `failure.json`: a persisted failure, if one has occurred. Compare its timestamp
  with the current status after a successful restart.

Win rate is wins divided by completed matches **including draws**. Score rate
counts a draw as half a win; cutoffs never count as draws. Mirrors train normally
and have reports, but no deck-vs-itself win rate or comparison-history entry.

Self-play win rates measure matchup balance between moving policies; they do
not establish that either policy became stronger. After each nonmirror block,
40 extra evaluation games compare the latest model to the **unchanged initial
anchor** on fixed seeds and both seat/learner orientations. Each deck has 20
evaluation games. These games are greedy, produce no training rows, do not
consume training RNG, and do not advance the 1,000-match rotation. The evaluation
finishes before admitting the next training pair. Reports separate these rates
from training results. This small, repeatedly used sample is a progress signal,
not a held-out strength qualification.

### Checkpoints, stopping and resuming

`kill -TERM <pid>` using the trainer PID in `status.json` stops gracefully.
Active games become explicit cutoffs, collected rows are optimized, and a final
checkpoint and frozen model are saved. Models are also published at initialization
and after every block, under immutable `models/<sha256>.pt` paths. Old batch
models are retained for comparisons and future serving until the disk budget
requires stopping; there is no automatic deletion of previous runs.

Resume **in the same league output directory**, with the original seed (default
20260921):

```bash
taskset -c 0-8 bun run play:ai:league:train --output .swubase/crossfire-ai/league-run-01 --resume --cpus 9 --workers 9
```

Checkpointing occurs after complete optimized windows, without pending games
or rollout rows. The model, optimizer, opponent pool, counters, partial block,
fixed anchor identity, and Python/PyTorch RNG states are saved together.
Alternating slots and atomic checksummed manifests keep a previous checkpoint
recoverable if the newest slot is damaged. A failed process may lose the most
recent uncheckpointed window; resuming repeats from the committed checkpoint.
A completed block with interrupted evaluation resumes that evaluation before
starting another pair. Worker-count changes can change future floating-point
batching; exact continuation across different worker counts is not promised.

For unattended operation, launch the command in a persistent terminal or detached
process. The current local launch uses null standard streams and bounded status/
failure files, so stdout logs cannot grow without bound. There is no automatic
restart after a reboot or software failure; use the resume command deliberately.

### Reusing the model later

A batch manifest pins an inference-only PyTorch model, with no optimizer or
training trajectories. Verify its SHA-256 with `league_artifacts.checked_bytes`,
then load it through `full_model.load_frozen(path, expected_contract)` and use
`act(..., greedy=True)` on the same compact, seat-visible encoding and legal
candidate set. The loader checks the engine/deck/encoding contract and finite
weights and disables gradients. Preserve the immutable file and manifest when
selecting a model for online play; do not silently follow `latest-model.json`
in a running match. Online worker integration and playing-strength qualification
are still separate implementation tasks.

## Six-deck validation — 2026-09-21

- `bun run play:check`: **3,323 tests, 88,230 assertions, 155 files**, all passed
  in 626.28 seconds, including type checks and import boundaries.
- Python training checks: **23 passed**, covering feature migration on real
  observations, frozen inference parity, optimizer/RNG recovery, corruption
  fallback, schedule/rate calculations and independent disk-monitor failure.
- The six-deck TypeScript checks completed **72 scripted/sampled games and exact
  replays**, covering all 36 ordered pairings. A separate expanded learned-policy
  probe completed and replayed **36 further games**, one per ordered pair.
- Graceful stop/resume and a boundary fixture exercised exactly 1,000 completed
  matches, 500/500 seats, 40 anchor games, result publication and next-pair
  admission. The first 990 fixture counters were synthetic and confined to
  `league-smoke-01`; production initializes from `projection-smoke-01` instead.
- `bun run play:demo`, local documentation links and `git diff --check` passed.
  Local source review completed. The required independent Claude review was
  attempted but could not authenticate because its OAuth session had expired.

`league-run-01` starts from the real 5,108-game / 296-update checkpoint on Bun
1.4.2. New league counters start at zero; initialization provenance retains the
prior training counters. The expanded model has **248,770 parameters** and its
inference artifact is approximately **1 MB**. All observed trainer/worker threads
inherit CPUs 0–8. Read the run's status/results files for current progress;
execution and learning updates do not establish improved playing strength.

The first live league block completed 1,000 Greef/Krennic games with 500 games
per seat arrangement, no draws and no cutoffs: Greef won 891 (89.1%) and Krennic
109 (10.9%). Its 40 anchor evaluation games completed, its immutable model was
published and checksummed, and training advanced automatically to Vader/Aurra.
These are initial matchup measurements, not a claim of strength improvement.
The authoritative result is `league-run-01/batches/00000000.json`.
The independent monitor also completed its next real five-minute check at
12:56:09 UTC: 1,107,300,352 allocated bytes, below the 100 GB ceiling.

## Original bounded two-deck experiment

The sections below document the earlier Greef/Dedra trainer and its historical
runs. Their game/time limits and opponent mix do **not** apply to the continuous
six-deck command above.

## Run and monitor

Use the Python environment from the [tactical experiment](ai-experiment.md).
From the worktree root, choose a new output directory:

```bash
taskset -c 0-8 bun run play:ai:full:train --output .swubase/crossfire-ai/new-run --games 5000 --seconds 7200 --warmup 24 --seed 17 --cpus 9 --workers 9
cat .swubase/crossfire-ai/full-run-05/status.json
cat .swubase/crossfire-ai/full-run-05/latest.json
```

The trainer also sets its own Linux CPU affinity before importing PyTorch or
starting Bun: `--cpus` selects at most nine logical CPUs from its inherited
allowed set. The default remains three unless explicitly increased. It never
widens an inherited affinity mask; `taskset -c 0,1,2 ... --cpus 9` still allows
only CPUs 0–2. Status records both the requested and effective CPU limits.
Child processes and numerical-library threads inherit that same CPU set.
PyTorch uses one compute thread and one interop thread. Up to nine persistent
Bun workers simulate independent games concurrently; the Python coordinator
batches their model inputs. All processes and their threads share the same
allowed CPU set. Worker count does not grant additional CPU capacity.
No GPU is used.

The user raised the CPU allowance to **9 logical CPUs** on 2026-09-21; the
**100 GB disk maximum** is unchanged. The disk limit is
100,000,000,000 bytes, using the stricter decimal interpretation. Before each
artifact write, the trainer counts allocated blocks under
`.swubase/crossfire-ai`, including the virtual environment and previous runs,
and reserves space for the entire temporary replacement plus 256 MiB for logs
and metadata. Files are capped at 64 MiB through both the artifact writer and
the inherited Linux file-size limit. One exclusive lock prevents simultaneous
trainers using this budget. Two rotating checkpoint slots and a bounded status
history prevent per-game artifact growth. Writes are refused before exhausting
the budget; existing runs are preserved. These are application write limits,
not a filesystem quota against unrelated external writers.

Stop gracefully with `kill -TERM <pid>` using the PID recorded in `status.json`.
Any active games become explicit cutoffs; the trainer saves its final
checkpoint and frozen model. The wall budget is checked between decisions;
finishing an in-progress engine request, optimization and saving can add time.
The first long run is bounded by 5,000 games or two hours, whichever comes first.

Resume a gracefully stopped or finished run into a **new** output directory:

```bash
taskset -c 0-8 bun run play:ai:full:train --resume .swubase/crossfire-ai/full-run-03 --output .swubase/crossfire-ai/resumed-run --games 5000 --seconds 3600 --warmup 24 --seed 17 --cpus 9 --workers 9
```

`--games` is the cumulative limit, including the source run. `--seconds` is the
new segment's time budget; choose the remaining allowance when retaining an
earlier deadline. Resume checks the saved checksum, engine/feature contract,
seed, warm-up configuration and final counters, then restores weights, Adam
state, frozen opponents and Python/PyTorch RNG states. Active, failed and
unfinished checkpoints are rejected. Graceful stop flushes collected training
data before saving a checkpoint eligible for resume. Changing worker count
changes batching and sampling order, so future training is not bitwise identical
to continuing with the old worker count.

Status reports cumulative `games`/`elapsedSeconds` alongside
`segmentGames`/`segmentElapsedSeconds`, worker PIDs and recent collection timing.
Use segment counters to measure the newly selected worker configuration.

## What learns

The first 24 games imitate a modest visible-information reference policy.
After that, clipped PPO updates the network from sampled full-game results:
+1 for the winning seat, -1 for the losing seat and zero for a genuine draw.
There are no base-damage or deck-style reward bonuses. Interrupted games use
the seat-visible value estimate for bootstrapping and are counted separately.

Opponent blocks cover all four learner seat/deck combinations. Half use the
reference policy, a quarter use older frozen checkpoints, and a quarter use
the current policy on both sides. The opponent pool retains three snapshots.
Weights stay fixed until every admitted game in a collection window completes.
Each PPO window queues up to twice the worker count (18 games for nine workers).
Ready workers advance independently and immediately take another queued game
after completion and any requested replay check. At the deadline or a stop
signal, queued games are not started, active games are drained/truncated, and
only admitted games count toward progress. Results retain admission order.
Only IPC runs in the thread pool; the main thread owns inference, sampling and
updates. Each game has its own engine, projected views, memories and rollout
rows. Per-game sampling streams are seeded from the saved global PyTorch RNG
in admission order, so response arrival order does not select the random draws.
The 24 imitation warm-up games retain per-game updates. Development evaluation
uses the same worker pool with fixed weights and greedy choices, retains no
training rows, and does not consume the learner's random-number streams.
Command components with multiple legal candidates
are policy decisions with their own PPO probability ratios. Single-candidate
components resolve automatically through the same command builder, projector
and engine, with both seats' memories updated after every submitted command.
Automatic chains are bounded to 64 components per bridge request; a remaining
singleton is continued by the collector without a neural call. Forced choices
do not produce actor or critic training rows. Returns are undiscounted, so
omitting those rows does not introduce time discounting, but does change the
critic's sampled-state distribution. Terminal summaries retain the full
`microsteps`/`commands` counts and report `forcedChoices` separately. Training
`decisions` now count only nontrivial choices, so compare that metric with care
across older runs.
Only actions generated by the current learner are used for its PPO update.

The training wrapper holds one private defensive state snapshot until its next
accepted submission, reusing the copy returned by `LocalGame.submit`. It does
not change the host's defensive-copy contract or the original engine. The
existing model/feature contract remains compatible with saved checkpoints;
the scheduler and forced-choice changes do alter future training trajectories.

Each training seat opts into `Projector`'s `{ training: true }` constructor mode.
It caches the view for the identical immutable snapshot, so command validation
reuses the already projected position. A per-projector, 4,096-entry FIFO cache
retains HMAC identifiers with their original game/viewer/incarnation/visibility
scope. After the first projection, it visits only appended facts and emits only
new events visible to that seat, preserving public event ordering. Both seat
memories still observe events after every submitted command. Snapshots and
returned views must remain immutable and belong to one forward-only game;
revision rollback, shortened history and obvious snapshot mutation are rejected.
The default projector still supports mutable/reconstructed snapshots, complete
event histories and refreshed historical hover links for browser/replay use.
Incremental training views must not be published to those consumers.

The 146,850-parameter network scores visible command candidates using the
position and its own deck composition. Its frozen artifact is about 594 KB.
Selections are constructed one choice at a time, retaining only prefixes with
a legal completion. The original engine validates submitted commands. The
adapter supports selection budgets, disclosure, allocation quanta, card naming
and number entry; unsupported combined constraints fail explicitly.

Inputs contain visible cards, statistics, decision details and an approximate
summary of authorized events. Both seats' memories update after every command,
including events observed during the other seat's turn. Hidden identities,
opaque handles, game seeds and raw engine states are absent from model inputs.
This is a lossy feature representation with decaying event hashes, not an exact
hand tracker or recurrent belief model. Ordered selections and attachments are
not represented with a complete relational encoder. Those are known learning
limitations to assess before expanding deck coverage.

## Saved artifacts and qualification

- `status.json`: PID, CPU set, disk use, compatibility and source hashes,
  game/update counts, recent losses, observed choice inventory and validation.
- `untrained.pt`: initial weights for a new model, or `starting.pt`: restored
  starting weights for a resumed run.
- `checkpoint-0.pt`, `checkpoint-1.pt`: rotating model, optimizer, opponent pool,
  Python/PyTorch RNG states and counters. `latest.json` and `previous.json`
  identify slots and SHA-256 checksums.
- `frozen.pt`: final inference-only payload, with model weights and compatibility.
- `failure.json`: bounded seed/orientation/action-index trace if a simulation
  fails. A failure is not counted as a win or draw.

Each checkpoint is reloaded with `weights_only=True`, checked for exact
compatibility and finite tensors, and compared against the in-memory network
on a real engine observation. This loader disables gradients. Graceful-run
resume also verifies the checksum and optimizer state. Recovery after a crash
with unfinished collection data remains unsupported. The inference loader
verifies structure and contract; consumers must separately verify the checksum
in `latest.json` before promoting artifacts.

Every 100 training games, eight greedy development games run concurrently against
the reference on a reused fixed schedule. Larger requested evaluations use
bounded windows, retaining that schedule and reporting only admitted games
when interrupted. These are progress measurements, not an
untouched test set or a qualified strength gate. The baseline itself remains
rudimentary. No model is promoted to live play by this script. See the
[implementation plan](../../.ai/planning/feature-crossfire-ai/plan.md) for the
independent evaluation and live-hosting work still required.

## Evidence

### Bun runtime upgrade — 2026-09-21

The local mise-managed Bun was upgraded from **1.3.14** to **1.4.2**
(`1.4.2+744846f84`); its global selection remains `latest`. The older binary
was retained for comparison. With the unchanged final `full-run-05` checkpoint,
each runtime played the same 18 greedy games twice, using nine workers on
CPUs 0–8. All 72 games completed with matching seeded outcomes and
command/component counts, including one replay check per pass.

| Runtime    | Games/minute |
| ---------- | ------------ |
| Bun 1.3.14 | 280.1        |
| Bun 1.4.2  | 392.2        |

This is **40.0% more collection throughput**, excluding startup, first inference,
optimizer updates and periodic evaluation. Reports with exact runtime revisions
are `.swubase/crossfire-ai/bun-1.3.14-benchmark.json` and
`bun-1.4.2-benchmark.json`. On Bun 1.4.2, all 23 focused AI/projection tests and
16 Python tests passed, along with package type checks, import boundaries and
the replay demo. The prior full-suite result below was measured on Bun 1.3.14.

### Projection caching, incremental events and parallel evaluation — 2026-09-21

The original long run, `full-run-05`, finished at 5,000 games and 293 updates.
Its unchanged final checkpoint was used for a fresh before/after comparison:
18 identical greedy games, twice per version, nine workers on CPUs 0–8. Startup
and first inference were excluded; one replay per pass was included. All 72
games completed with matching outcomes and command/component counts.

| Collector | Games/minute | Seconds per completed game |
| --------- | ------------ | -------------------------- |
| Before    | 230.0        | 0.261                      |
| After     | 277.0        | 0.217                      |

The combined projection changes increased collection throughput by **20.4%**.
Each pass still used 1,306 bridge requests and resolved 647 forced components.
This measures collection only, excluding optimizer updates and periodic
evaluation; it does not establish stronger play or the same gain for every
checkpoint. Reports: `.swubase/crossfire-ai/projection-before.json` and
`projection-after.json`.

Separately, the same eight development games took **4.91 seconds sequentially
versus 3.07 seconds in parallel**, averaging two passes in reverse order. Both
used the optimized simulator; every outcome and command/component count
matched. Parallel evaluation reduces that pause by about **37.5%** and leaves
model weights, Python RNG and PyTorch RNG unchanged. Evaluation does not retain
PPO rows or compute cutoff critic values that have no training consumer.
Report: `.swubase/crossfire-ai/projection-evaluation-ipc.json`.

The isolated `projection-smoke-01` resume added 108 terminal games, three PPO
updates, eight parallel evaluation games, verified checkpoint reloads and a
frozen artifact in 35.9 seconds. It finished at cumulative game 5,108/update
296; the original 5,000-game run remains preserved. No long training run was
restarted. Allocated AI artifacts, including the environment, occupied about
1.08 GB, within the unchanged 100 GB limit.

Focused tests cover complete-game observation, both-seat memory and replay
parity against uncached/full-history projections; private-event ordering,
hidden-zone handle changes, cache eviction and forged/stale command rejection;
serial/parallel evaluation parity, row omission, RNG isolation, stopping and
multi-window evaluation schedules. All 23 focused Bun tests and 16 Python
tests passed. The full `play:check` passed all **3,286 tests** (76,130 assertions),
package type checks and import boundaries; `play:demo` verified its replay.
Local review found no outstanding issue. The independent Claude review was
attempted but could not authenticate because its OAuth session expired.

Reproduce the matched collector measurement:

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python play/ai/training/parallel_benchmark.py --cpus 9 --configs 9:9 --run .swubase/crossfire-ai/full-run-05 --output .swubase/crossfire-ai/new-projection-report.json --compare .swubase/crossfire-ai/projection-before.json --games 18
```

### Next communication experiment

An instrumented 36-game collection using the final `full-run-05` checkpoint and
the reference/past/self opponent mixture completed in 7.68 seconds, with 1,700
learner rows and no cutoffs. Python used 3.24 CPU seconds in total; IPC worker
threads used 0.89 CPU seconds, including **0.58 seconds of JSON parsing**.
Converting observations to NumPy added 0.30 CPU seconds on the main thread.
CPU times overlap simulator work and must not be added directly to wall time.
This small instrumented sample is a diagnostic, not another throughput result.

There were 2,799 responses / 18.19 MB of JSON, including **690 `reference`
requests**. The first proposed change is to let Bun execute a configured
scripted opponent until the next learner decision, terminal state or bounded
yield. Those scripted decisions currently return feature arrays that Python
does not need for inference or training. This could remove many round trips,
feature encodings and parses together. Apply it only to the reference opponent;
imitation warm-up still needs teacher examples, and self/past games still need
their neural decisions. Preserve both seats' memory updates, original command
validation, replay, generation/ticket checks and bounded shutdown latency.
Qualify it with exact trajectories and learner-row parity before enabling it.

Next, measure sending invariant own-deck features once per game instead of with
every observation. Only then compare a versioned, length-prefixed binary
numeric payload with the reduced JSON path. Float32 buffers could avoid Python
number-list construction and feed NumPy directly, but dense arrays for this
sample alone would occupy **27.97 MB**, before framing: about 54% more than the
entire existing JSON stream, which represents many zeros compactly. Binary
transport therefore needs a measured encoding choice, not an assumed bandwidth
win. Require bounded frame sizes, complete reads/writes, timeout/error handling,
stale-response rejection and the existing exact-buffer-boundary regression.
No wire-protocol change is implemented in this pass.

### Simulator and collector throughput — 2026-09-21

`full-run-04` stopped gracefully at 2,560 collected games and 217 updates
(2,547 terminal games and 13 cumulative shutdown cutoffs). A fresh comparison
used that exact checkpoint before and after snapshot reuse, automatic forced
choices and asynchronous worker scheduling. Both versions ran the same 18
fixed greedy games twice, with nine workers on CPUs 0–8. All 72 games finished
with matching seeded outcomes and command/component counts. Startup and first
inference were excluded; each pass included one replay check.

| Collector | Games/minute | Seconds per completed game |
| --------- | ------------ | -------------------------- |
| Before    | 115.9        | 0.517                      |
| After     | 214.0        | 0.280                      |

This is **1.85× collection throughput** on the matched schedule, excluding
optimizer updates and periodic evaluation. It is not a playing-strength result
or a promise of the same gain during stochastic training. The earlier 92.8
games/minute result used a different checkpoint; the fresh 115.9 baseline is
the appropriate comparison. Each optimized pass resolved 745 forced components
inside the simulator and made 1,409 bridge requests, including resets/replay.
Reports: `.swubase/crossfire-ai/throughput-before.json` and `throughput-after.json`.

Recheck the optimized collector against that saved baseline:

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python play/ai/training/parallel_benchmark.py --cpus 9 --configs 9:9 --run .swubase/crossfire-ai/full-run-04 --output .swubase/crossfire-ai/new-throughput-report.json --compare .swubase/crossfire-ai/throughput-before.json --games 18
```

Focused checks cover exact strategic-observation/memory/recording parity with
and without forced-choice resolution, replay, command cutoffs, worker progress
while another request is blocked, queued-game admission at shutdown, per-game
sampling across worker counts, and unchanged model weights during collection.
All 14 Python tests and the complete `play:check` passed: 3,282 Bun tests,
package type checks and import boundaries. `play:demo` also completed and
verified its replay. Local review found no outstanding issue; the
independent Claude review could not run because OAuth authentication expired.

`full-run-05` resumed the preserved game-2,560/update-217 checkpoint with the
optimized collector, CPUs 0–8 and nine workers. It finished at the original
5,000 cumulative-game cap, with the 100 GB artifact limit retained.

### Nine logical CPUs — 2026-09-21

Using the final `full-run-03` checkpoint, a second comparison measured CPU and
worker counts independently. Each configuration played the same 18 fixed greedy
games twice, reversing configuration order for the second pass. Startup and
first inference were excluded; one replay per pass was included. All 144 games
finished with matching seeded outcomes and command/component counts.

| Logical CPU limit | Workers | Games/minute | Seconds per completed game |
| ----------------- | ------- | ------------ | -------------------------- |
| 3                 | 3       | 54.6         | 1.099                      |
| 9                 | 3       | 58.4         | 1.027                      |
| 9                 | 6       | 81.3         | 0.738                      |
| 9                 | 9       | 92.8         | 0.647                      |

The selected nine-CPU, nine-worker setting delivered about **70% more games
per minute** than the three-CPU, three-worker baseline on this schedule. These
are collection-throughput measurements, excluding optimizer updates and
periodic evaluation; they are not individual game latencies or strength scores.
The report is `.swubase/crossfire-ai/cpu-benchmark-09.json`.

`full-run-03` stopped at 1,714 collected games and 169 updates: 1,710 terminal
games and four cumulative shutdown cutoffs. `full-run-04` resumes that model,
optimizer, opponent pool and RNG with CPUs 0–8 and nine workers. The original
11:20 UTC deadline, total 5,000-game cap and 100 GB artifact limit are retained.
All 12 Python tests passed, including child-process affinity inheritance,
refusal to widen a narrower launch mask and rejection of invalid CPU limits.
Independent Claude review was attempted but still failed authentication.

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python play/ai/training/parallel_benchmark.py --cpus 9 --configs 3:3 9:3 9:6 9:9 --run .swubase/crossfire-ai/full-run-03 --output .swubase/crossfire-ai/new-cpu-benchmark.json --games 18
```

### Parallel collection — 2026-09-21

The serial process used about 1.33 CPU cores during a six-second utilization
sample, leaving capacity within the three-CPU allowance. A paired benchmark
compared worker counts 1, 2, 3, then 3, 2, 1 using the same learned checkpoint
and 12 fixed greedy games per pass. Startup/first-inference overhead was excluded;
one replay per pass was included. All 72 games completed and the seeded results,
command counts and component counts matched across worker counts.

| Workers | Games/minute | Seconds per completed game | Mean individual game latency |
| ------- | ------------ | -------------------------- | ---------------------------- |
| 1       | 39.3         | 1.53                       | 1.51 s                       |
| 2       | 49.7         | 1.21                       | 2.09 s                       |
| 3       | 55.1         | 1.09                       | 2.63 s                       |

Three workers increased throughput by about 40% within the same CPU affinity.
Individual games take longer under contention, but more finish per minute.
This benchmark excludes optimization and periodic development evaluation; it
does not predict the complete stochastic training rate or playing strength.
The report is `.swubase/crossfire-ai/parallel-benchmark-01.json`.

`full-run-02` stopped at 1,111 collected games and 124 updates: 1,110 terminal
games and one explicit shutdown cutoff. The resumed three-worker smoke added
12 terminal games and an actual PPO update, preserving the model, optimizer and
opponent pool. `full-run-03` continues from that smoke checkpoint at game 1,123,
update 125, retaining the original 11:20 UTC deadline and 5,000-game total cap.
Ten Python tests passed, including serial/parallel trajectory parity, mixed
opponent ownership, stopping every active game, and optimizer/RNG recovery.
Independent Claude review was attempted again but authentication remained expired.

Reproduce the isolated comparison after gracefully stopping the trainer:

```bash
taskset -c 0,1,2 .swubase/crossfire-ai/venv/bin/python play/ai/training/parallel_benchmark.py --run .swubase/crossfire-ai/full-run-02 --output .swubase/crossfire-ai/new-benchmark.json --games 12
```

### Initial sequential runs

The initial `full-smoke-01` run completed eight games with no cutoffs or failures,
two imitation updates and one PPO update in 33.3 seconds, while other checks
shared the CPU set. It saved and reloaded the 594,431-byte frozen artifact.
Total AI-directory allocation was about 1.02 GB, including the Python environment
and earlier tactical runs. This smoke run establishes execution and learning
updates, not an improvement in playing strength.

The first longer attempt, `full-run-01`, stopped during game 17 on a bridge
timeout. Its exact seed 33 / ticket 43 response filled 4,096 bytes before the
newline; Bun's separate `console.log` newline was not flushed. A focused
regression reproduced the timeout with request ID 1000. Sending the JSON and
newline in one awaited stream write fixes that regression. The failure artifact
is preserved, and `full-run-02` starts fresh with the corrected bridge. All
seven Python tests pass, including this IPC regression and a real-game learning
update. Claude's independent review was attempted twice but could not run
because its OAuth session had expired.

Validation also passed type checking, import boundaries and the 11 focused
TypeScript AI tests (896 assertions). The full `play:check` run had 3,279 passes
and one existing Support replay test exceed its 15-second deadline while
training shared the three-CPU limit. That exact test passed in 12.05 seconds
with the training workers briefly suspended, then resumed. No engine-rule
source was changed to address this timing failure.

Focused checks cover real complete games and replay in both orientations,
sampled composite commands, hidden-information independence, constrained
selection feasibility, stale requests, cutoffs, terminal reward perspectives,
parameter updates, frozen-model parity and disk-budget refusal before mutation:

```bash
taskset -c 0,1,2 bun run play:ai:test
taskset -c 0,1,2 .swubase/crossfire-ai/venv/bin/python -m unittest discover -s play/ai/training -p 'test_*.py'
taskset -c 0,1,2 bun run play:check
```


For leader-scoped forks, version certification, the production AI admin page,
private R2 releases and consented human-game learning, see
[AI releases](ai-releases.md). The serving and dataset tools do not restart the
stopped training run automatically.
