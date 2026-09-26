# Crossfire AI: first learning experiment

This local experiment trains a small neural network to choose between winning
immediately and removing a unit that would otherwise defeat its base on the
next action. Crossfire's original engine resolves every attempted move and
opponent reply. The model is saved to disk and evaluated in a fresh process.

It is a tactical learning demonstration, not yet an opponent available through
the Crossfire website. A separate [bounded full-game trainer](ai-full-game-training.md)
now supports the selected Greef/Dedra matchup. Recurrent memory, qualified bot
accounts/seats and live serving remain in the
[feature plan](../../.ai/planning/feature-crossfire-ai/plan.md).

## Run locally

Use the existing worktree's installed Bun dependencies. The experiment requires
no database, `.env`, web server, external AI API, or GPU. Its separately pinned
Python environment was tested with Python 3.13 on Linux x86_64.

From the repository root, provision the Python environment once:

```bash
python3 -m venv .swubase/crossfire-ai/venv
.swubase/crossfire-ai/venv/bin/python -m pip install -r play/ai/training/requirements.txt
```

Measure the existing engine with synthetic practice decks:

```bash
bun run play:ai:benchmark 10
```

Train a model in a new output directory:

```bash
bun run play:ai:train --output .swubase/crossfire-ai/my-first-run
```

The default budget is 1,200 updates of 64 puzzles, with a 300-second training
limit. Validation, saved-weight parity checks, and final evaluation run after
training; they take additional time. A time-limited run still saves its model
and reports its actual update count. Existing output directories are never
overwritten. Use a different name for each experiment.

Useful explicit controls:

```bash
bun run play:ai:train --output .swubase/crossfire-ai/another-run --updates 1200 --seconds 360 --seed 17 --count 512
bun run play:ai:evaluate --output .swubase/crossfire-ai/another-run --count 512
```

Evaluation is a separate process that loads frozen weights, runs the real Bun
engine, and writes a report. The training command invokes this automatically.
The exit code is nonzero if the tactical acceptance gate fails; inspect the
report even when the command exits unsuccessfully.

## What gets saved

```text
my-first-run/
  untrained/
    manifest.json
    weights.pt
  model/
    manifest.json
    weights.pt
  report.json
  report.html
```

Open `report.html` in a browser for the comparison table and example decisions.
`report.json` contains detailed outcomes. Each manifest records compatibility,
parameter count, file size, checksum, and training configuration. The trained
manifest also records learning progress, validation results, source revision,
and hashes of the experiment source files, including uncommitted code.

`weights.pt` contains learned tensors, not games, hidden hands, or engine code.
The inference loader checks the checksum and exact contract, loads tensors with
`weights_only=True`, and disables gradients. It refuses mismatched engine/card,
feature, protocol, and generator versions. The initial network has 5,441 learned
parameters; its weight file is approximately 24 KB in this environment.

These are inference snapshots. Optimizer-state checkpoints and interrupted
training resume are future work. Generated artifacts and the virtual environment
stay under ignored `.swubase/`; they are not committed or publicly uploaded.

## Learning exercise

Each scenario has a ready friendly ground unit, an enemy ground unit capable of
defeating the friendly base, exhausted enemy distractors, and sometimes a ready
friendly fighter. Identities, damage, base HP, initiative, seat, and candidate
order vary. Leaders are exhausted with deployment already spent, and there are
no ready resources, so these positions offer attacks, passing, and initiative.

- **Win now:** at least one legal attack immediately defeats the enemy base.
- **Stop lethal:** the enemy base cannot be defeated in one attack. The bot must
  remove the ready enemy attacker to survive its next action.

The policy gets 18 numeric features for each offered choice, derived solely
from the seat's projected view: base HP, maximum ready unit power, action/arena
indicators, and attacker/target combat statistics. It receives no raw state,
seed, puzzle category, answer key, hidden card identities, or simulated outcomes.
Candidate rows are scored by the same small two-hidden-layer neural network,
so changing candidate order cannot change their individual scores. Padded
choices are masked out.

The learner samples one action and submits it to Crossfire. If the game remains
ongoing, a fixed opponent attacks the base with its remaining ready unit when
possible. The return is +1 for an engine-confirmed win, -1 for a loss, and zero
otherwise. One-step policy-gradient training (REINFORCE) increases or decreases
the preference for the sampled move based on that return. No alternative-move
outcomes or scripted correct-action labels are supplied to the learner.

An ongoing position at the exercise horizon is **not a draw or a full-game
success**. The report counts it separately. Surviving this one reply satisfies
the defensive puzzle, but does not establish that the bot can win the game.
The separate full-game trainer uses PPO with approximate visible-event memory;
the recurrent system remains later work.

## Evaluation contract

Observable candidate-feature sets are canonicalized independently of their order
and assigned by hash to train (80%), validation (10%), or test (10%). This prevents
an equivalent model input from crossing those partitions even with another seed,
card label, seat, or candidate shuffle. Evaluation also skips duplicate inputs
within its own schedule. These are held-out positions from the same constrained
generator, not evidence of generalization to new cards or strategies.

All compared policies use the same test schedule:

- Seeded random legal choices.
- A fixed reference that always attacks the base with the strongest attacker.
- The original untrained network with greedy action selection.
- The trained, reloaded network with greedy action selection.

Tactical qualification requires at least 90% overall success, at least 85% in
each puzzle family, and improvement of at least 15 percentage points over the
untrained network. Scores are puzzle success rates, not game win rates. The
displayed action probabilities are model preferences, not calibrated win odds.
The final checkpoint is evaluated; this implementation does not select a best
checkpoint using test scores. When repeating experiments against the same test
schedule, disclose that reuse alongside results.

## Recorded experiment — 2026-09-21

Run `run-02` used seed 17, 1,200 updates, batch size 64, a 360-second budget,
and 512 evaluation puzzles. It sampled 76,800 training puzzles in about
271 seconds on CPU, using two PyTorch threads. Validation scored 255/256.
The saved weights contain 5,441 parameters in 24,533 bytes. Reloading preserved
the action scores exactly on a validation probe; a separate evaluator process
then loaded the weights to produce these results.

| Policy             | Overall         | Win now        | Stop lethal     |
| ------------------ | --------------- | -------------- | --------------- |
| Random             | 95/512 (18.6%)  | 49/235 (20.9%) | 46/277 (16.6%)  |
| Always attack base | 235/512 (45.9%) | 235/235 (100%) | 0/277 (0%)      |
| Untrained, greedy  | 0/512 (0%)      | 0/235 (0%)     | 0/277 (0%)      |
| Trained, frozen    | 509/512 (99.4%) | 235/235 (100%) | 274/277 (98.9%) |

The tactical gate passed. These positions were excluded from gradient training,
but the test schedule was reused: the earlier 600-update `run-01` scored
468/512 (91.4%) overall and 233/277 (84.1%) on defense, missing the 85% defensive
gate. That result prompted the longer training run with the same architecture,
features, and reward. Treat these as development results, not an untouched final
assessment of playing strength. A future full-game qualification needs its own
reserved schedule.

The model checksum is
`cf163eae673fe415b3579f5dd13a70c37d078f434c87a6c104d56438d2be6b71`.
Local artifacts are in `.swubase/crossfire-ai/run-02/`; they remain ignored.
The manifest records the source hashes and base revision
`85ca95683a343a9a62d6864e45c252f087ef60f9` plus the uncommitted experiment code.

A separate 10-game scripted benchmark completed all games with no cutoffs:
544 decisions in 3.06 seconds, approximately 3.27 games/second and 178
decisions/second, with two successful replay checks. It ran on an AMD Custom
CPU 1772 system reporting 12 logical CPUs, alongside training and regression
tests; this is a local observation, not an isolated capacity benchmark.

## Code and validation

- [Arena](../../play/ai/arena.ts): seeded complete games with projected commands,
  controlled synthetic decks, and a simple scripted harness policy.
- [Tactics](../../play/ai/tactics.ts): original scenario generation, observation
  encoding, data partitions, and engine-resolved tactical outcomes.
- [Bridge](../../play/ai/bridge.ts): bounded local JSON-lines reset/step protocol
  with generation checks. It is not a network or live-game API.
- [Learner/evaluator](../../play/ai/training/experiment.py) and
  [model persistence](../../play/ai/training/model.py).

```bash
bun run play:ai:test
.swubase/crossfire-ai/venv/bin/python -m unittest discover -s play/ai/training -p 'test_*.py'
bun run play:check
```

Tests cover legal engine outcomes, complete-game replay, tactical replay after
checkpoint decoding, stale/duplicate commands, hidden-information independence,
data partition separation, action masking/permutation, immutable model outputs,
checksum/contract rejection, and actual Python-to-Bun communication.

The benchmark uses two synthetic 24-card practice decks and scripted policies,
with one process, no database, and no neural inference. It reports cutoffs
separately and replay-checks the first and last games. Its throughput does not
predict full-game neural training or production serving capacity.
