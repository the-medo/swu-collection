# Krennic practice training

The approved [practice positions](ai-krennic-practice.md) now supply synthetic
action demonstrations to the specialist trainer. This is a development
experiment: copying a good choice in a prepared position does not establish
full-game strength or qualify a production release.

## What enters learning

`play/ai/practice/curriculum.ts` defines four variations of each of the twelve
scenario families. Variations change safe combinations of base damage,
initiative, hand order, extra cards/resources and unseen deck order. Every
variant executes legal commands and retains the original outcome assertions.

Ten families (40 cases, 140 decision points) enter practice training. The entire
Galen Credit-suppression and too-late-to-sacrifice families (8 cases, 12 decision
points) remain held out. Negative comparison lines, scripted passes and regroup
scaffolding never become teacher labels. Only the learner's seat-visible
observation and legal candidate features reach the model. Feature-identical
choices are treated as equivalent because the policy cannot distinguish them.

The warm-up minimizes action imitation loss, with equal weight per case. It
does not invent terminal rewards or train the critic on unfinished positions.
Shared encoders can still change, so unchanged critic weights do not imply
unchanged value predictions. The warm-up runs at most 200 epochs; early stopping
uses training agreement only. The gate requires at least 85% training agreement,
a ten-percentage-point improvement (capped at 97%) and no held-out regression.
Held-out results decide whether to proceed, so they are a development validation
set, not an untouched final qualification set.

Practice agreement is measured at each **reference-sequence position**. A correct
choice does not advance an autonomous puzzle attempt. The dashboard reports
correct/total choices, exact reference lines and per-family results explicitly.

## Full-game experiment

After the gate passes, the trainer evaluates the pre-practice and post-practice
models in full games against the same immutable retired league model. Each
benchmark has 600 games: 100 against each registered deck, including the Krennic
mirror, using 50 fixed seeds with both learner seats. Seeds are separate from
the experiment's training seeds. Benchmark games produce no optimizer rows.

The approved experiment then trains Krennic for 100,000 completed games, rotating
opponents every 1,000 games. Only Krennic turns enter learning; opponents use
frozen snapshots or the retired anchor. The 600-game benchmark and practice
agreement repeat every 10,000 training games. Existing smaller batch evaluations
remain separate. Draws count in win-rate denominators; interrupted games do not.
Mirror results compare policies rather than measuring deck balance.

The initial two benchmarks account for 1,200 evaluation games; they do not count
toward the 100,000 training games. All comparisons reuse their seeds and opponent,
so progress is reproducible but is not final release qualification. Qualification
still needs new seeds, diverse opponents and human review.

## Run and resume

Create an independent leader fork using [the release workflow](ai-releases.md).
The curriculum currently requires the original six-deck encoding contract;
expanded rosters must have their own compatible curriculum.

Run the practice-only check on that fork first, replacing `RUN` with its registered
run ID:

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python play/ai/training/league_train.py \
  --resume --specialists --leader krennic --curriculum --practice-only \
  --experiment-games 100000 --cpus 9 --workers 9 \
  --output .swubase/crossfire-ai/RUN
```

After a passing check, omit `--practice-only` to run the initial benchmarks and
continue learning. Use the same command to resume after interruption:

```bash
taskset -c 0-8 .swubase/crossfire-ai/venv/bin/python play/ai/training/league_train.py \
  --resume --specialists --leader krennic --curriculum \
  --experiment-games 100000 --cpus 9 --workers 9 \
  --output .swubase/crossfire-ai/RUN
```

Resume preserves the original experiment start/count, curriculum version/hash,
optimizer, opponent pool and completed reports. It does not repeat a completed
warm-up or extend the game budget. Interrupted benchmarks rerun before advancing;
the final benchmark must finish before the experiment is marked complete. An
interrupted or failed warm-up remains stopped: diagnose it and prepare a new
independent fork rather than silently retrying against the same held-out gate.

The explicit budget applies only to this experiment. Ordinary league training
still defaults to no game cap. CPU affinity and all worker children stay within
nine logical CPUs. The shared AI artifact root, including previous runs and the
Python environment, is limited to 100,000,000,000 allocated bytes. An independent
disk monitor checks every 300 seconds; every artifact write also checks space.

`status.json` and checkpoints retain aggregate practice/benchmark history. Frozen
exports record the curriculum hash, version, epochs and gate result. The dev
dashboard's selected run shows agreement, frozen-opponent win rates and checkpoint
history without exposing teacher tensors or private model paths.

## First learning check — 2026-09-24

The independent `Krennic curriculum experiment` fork completed 200 practice epochs:

| Set | Before | After |
| --- | --- | --- |
| Training reference choices | 28/140 (20.0%) | 128/140 (91.4%) |
| Held-out reference choices | 0/12 (0.0%) | 12/12 (100.0%) |

This passes the learning gate. The held-out sample is small and related to the
same deck/mechanics; it is not evidence of improved Vader win rate. Both initial
full-game benchmarks completed with **0 wins in 600 games** against the retired
1.2M-game model. Practice agreement therefore has not yet translated into wins.
The 100,000-game training experiment is running to measure subsequent progress.
The retired league and untrained specialist source remain unchanged. No model
is published or activated in production by these commands.
