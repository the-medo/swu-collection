# Continuous eight-deck specialist training

The pinned roster adds the user’s exact Chewbacca Alliance Outpost (`aggro`)
and Luke Hero of Yavin Data Vault (`space-aggro`) lists to Greef, Vader,
Mandalorian, Dedra, Aurra and Krennic. Source: `play/ai/full-game/eight-decks.json`.
Deck admission verified every card against the current engine. Historical
six-deck runs and contracts are preserved.

## Learning schedule

`play/ai/training/rotation_train.py` runs this schedule without a total game or
time limit:

1. Initialize eight independent specialist bundles. Each contains the compatible
   shared encoders, the selected leader/strategy experts, visible-matchup adapter,
   learned action scorer, and critic. No retired shared-model weights are imported.
2. Give every deck **exactly 500 practice epochs**. Ten scenario families train;
   two whole families stay out of the optimizer. Four variations per family
   exercise ordering, draws and the existing Krennic variants. Agreement never
   shortens the requested epoch count. No full games start before all eight finish.
3. Choose Krennic, then Chewbacca, Luke, Greef, Vader, Mandalorian, Dedra, Aurra.
   Preserve a separate optimizer and model bundle for each learner.
4. For the selected learner, play **1,000 completed games against each deck**,
   mirrors included, with 500 completed games from each seat. Opponents alternate
   Greef, Mandalorian, Vader, Dedra, Chewbacca, Aurra, Luke, Krennic. Each uses its
   own latest frozen bundle, pinned at the beginning of the learner’s turn.
   The frozen opponent does not learn during this turn. Its own turn comes later.
5. After the learner’s **8,000 games**, evaluate it, give it **exactly 50 refresher
   practice epochs**, and evaluate again. Save its new frozen bundle and optimizer.
6. Move to the next learner. Repeat indefinitely: **64,000 training games per full
   rotation**, plus evaluation games and practice epochs.

Practice uses reference-action likelihood, with equal weight per case, and does
not assign invented win/loss labels to unfinished scenarios or update the critic.
Full games use terminal-return PPO; only the selected learner’s choices update
its bundle. Interrupted games are excluded from the 1,000-game count and their
partial trajectories are not optimized. Games have no command-count cutoff.

The [96 practice scenarios](ai-eight-deck-practice.md) document the positions,
assumptions, reference decisions, held-out families and verified outcomes. They
are synthetic demonstrations, not human replays or proof of optimal play.

## Three different measurements

- **Practice-choice agreement** compares choices on a supplied reference sequence.
  It is neither autonomous scenario completion nor a full-game win rate.
- **Training win rate** comes from stochastic games against the opposing deck’s
  pinned, practiced specialist. Weights change during a block. The dashboard
  treats learner→opponent and opponent→learner as separate batches and omits
  deck-vs-itself win rates. The current mirror can show learner-vs-frozen policy
  results explicitly. Draws remain in the denominator; cutoffs do not.
- **Refresher evaluation** runs 100 games per opponent before and after the 50
  epochs: 50 fixed seeds from both seats, greedy choices, no learning. The eight
  opponents remain the original post-500-epoch bundles throughout this run, so
  later turns can also be compared against the same reference policies. This
  adds 1,600 evaluation games to each learner turn, excluded from training totals.
  Reused development seeds and synthetic-practice opponents do not qualify a
  production release. Production qualification still needs untouched opponents
  and seeds, alongside the existing compatibility checks.

The dashboard shows per-deck warmup, practice results, games, refresher epochs,
model hashes, the directed matchup matrix, and before/after refresher results.
All batches and turn reports are retained; the compact status includes the most
recent sixteen completed learner turns. Older batch pages can be loaded.

## Persistence and resource limits

All artifacts live under `.swubase/crossfire-ai`. `ArtifactBudget` counts allocated
bytes for that entire tree, including historical runs and the Python environment.
It enforces a **100,000,000,000-byte** cap, reserves replacement/checkpoint space,
guards every write, and permits only one training writer. `DiskMonitor` performs
an independent check **every 300 seconds**, including while a simulator waits.
The process and its child workers inherit affinity to at most **nine logical
CPUs**, with numerical thread pools restricted to one thread each.

- `checkpoints.json` selects checksummed alternating active checkpoints. They
  contain the active weights, optimizer, RNG states, exact phase/epoch/game
  counters, and references to the other saved banks.
- `banks/<sha256>.pt` retains each inactive learner’s own model and optimizer.
  Eight optimizers are deliberately not packed into one oversized checkpoint.
- `models/<sha256>.pt` is a clean frozen inference artifact; `latest-model.json`
  describes the currently published learner with `focusLeader`. Per-deck frozen
  model and bank references are pinned in the recoverable rotation state.
- `batches/*.json` records the exact learner and opponent model hash for each
  1,000-game block. `turns/*.json` records each complete before/after comparison.

Resume restores completed epochs, games, seat counts, opponent pins, optimizer
state and the schedule. The active uncommitted collection may be replayed after
a crash. SIGTERM/SIGINT request a graceful checkpoint. A resource refusal or
unexpected engine error stops the run and preserves its last valid checkpoint;
there is no silent restart loop.

Example for a new UUID output (the directory must not exist):

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python \
  play/ai/training/rotation_train.py \
  --output .swubase/crossfire-ai/specialists-<uuid> --cpus 9 --workers 9
```

Add `--resume` for an existing output. `--prepare-only` creates or loads a
recoverable setup without starting practice or games; it is not a training cap.
The roster and curriculum hash must match on resume. Changing the pinned eight
decks requires a new curriculum run; the earlier single-bundle add-deck workflow
cannot safely expand a running multi-bundle rotation and refuses that operation.

Frozen artifacts keep the existing engine/encoding/card compatibility contract.
They are saved for later per-leader qualification and release; this training
command does not upload to R2 or activate a production model. Engine-version
portability requires the existing explicit compatibility validation.

## Validation

```bash
taskset -c 0-8 bun test play/testing/ai/rotation-practice.test.ts
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python -m unittest discover \
  -s play/ai/training -p test_rotation.py -v
taskset -c 0-8 bun run --cwd play typecheck
taskset -c 0-8 bun run --cwd play boundaries
taskset -c 0-8 bun run --cwd frontend build
```
