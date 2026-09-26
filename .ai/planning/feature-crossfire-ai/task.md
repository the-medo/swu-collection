# Feature task: Crossfire AI opponents

Status: headless training, specialist models, the training dashboard, adding decks,
leader release tooling and consented game export are implemented. The approved
Krennic curriculum passed its practice-learning gate; a separate 100,000-game
experiment now measures full-game progress. Original training runs stay stopped.
Production qualification/deployment and the playable AI opponent remain pending.
See the [curriculum guide](../../../docs/crossfire/ai-krennic-curriculum.md) and
[experiment guide](../../../docs/crossfire/ai-experiment.md).
Created: 2026-09-18.

Implementation sequence and acceptance gates: [plan.md](plan.md).

User-selected training targets and strategy notes:
[six-deck roster](training-roster.md), with [pinned inputs](selected-decks.json).

Training constraint: never exceed **9 logical CPUs or 100 GB of disk**. The user
raised the original three-CPU allowance to nine logical CPUs on 2026-09-21. The
[full-game training guide](../../../docs/crossfire/ai-full-game-training.md)
documents enforced affinity, bounded artifact writes and run controls.
The collector now reuses private state snapshots, resolves forced choices
automatically, schedules workers independently, caches seat views/identifiers,
and consumes appended visible events. Periodic evaluation also runs in parallel.
The latest matched nine-CPU benchmark improved from 230.0 to 277.0 games/minute;
see the guide for measurement scope and remaining training limitations.
The continuous league expands the latest learned Greef/Dedra weights to all six
pinned decks. It rotates every 1,000 completed matches through 21 unordered
pairings including mirrors, alternates seats, and has no total-game or wall-clock
limit. An independent five-minute disk monitor and per-write checks enforce the
100 GB allowance. Permanent batch results, nonmirror win-rate history and fixed
anchor evaluations measure progress. Immutable frozen models are retained for
later online integration; no playing-strength qualification is claimed.

That continuous run was subsequently retired. Its description above records the
existing league capability, not an instruction to resume it. The current
specialist work and expandable rosters are described in the full-game guide.

## Goal

Let a SWUBASE user play Crossfire against a trained computer opponent that learns
when to attack, trade units, develop its board, resource cards, use abilities,
and take initiative. Its decisions should reflect the position and its chances
of winning, with measurable improvement over a reasonable scripted opponent.

The user requested a learned opponent comparable in purpose to a chess bot.
The selected planning direction is a neural policy trained offline through
self-play using the existing Crossfire engine. Algorithm and infrastructure
choices below are proposed starting points, subject to the experiments in the
plan; they are not claims of achieved playing strength.

## Player experience

1. The user selects **Play against AI** from Crossfire, chooses an available bot
   deck and difficulty, and selects a compatible deck of their own.
2. The game uses the existing board, prompts, rules, animations, and game log.
   The opponent is clearly identified as AI. The bot handles setup, mulligans,
   resourcing, actions, and every intermediate choice its supported decks need.
3. The bot sees the information available to its seat and remembers legitimate
   observations. It cannot inspect the opponent's hidden cards or future draws.
4. The user can concede, reconnect, finish the game, and inspect an authorized
   replay. Bot games are identified as practice and do not inflate human-match
   statistics. Rematch creates a fresh game with an explicit model/deck pin.
5. The board indicates when the bot is thinking or temporarily unavailable.
   Inference failure must not silently turn a trained opponent into a random bot.

The first playable release uses single games and a small, explicitly evaluated
deck roster. Only advertise difficulty levels that show a measured strength
difference. Do not present an internal rating as a human-equivalent Elo rating.

## Leader releases and live-game learning — 2026-09-24

The following user requirements replace the initial proposal of activating one
whole-roster model globally. They are accepted requirements, not implemented
production capabilities. Implementation gates are in M5, M7 and M8 of the plan.

- **Release one leader independently.** A training run may focus on Krennic
  against a varied opponent pool, then publish and activate only Krennic's new
  release. Other leaders retain their current production releases. A release
  covers explicitly evaluated deck lists/archetype assignments; knowing a leader
  does not automatically qualify every list using that leader. A suggested
  100,000 games is an experiment size, not a strength guarantee or a new default
  cap on continuous training.
- **Pin all dependencies of that leader.** The release includes immutable
  references to the shared encoder, selected leader expert, eligible strategy
  experts, matchup adapter, scorer and required value/inference configuration.
  Initially a per-leader release may reference an existing complete frozen
  bundle, restricting its advertised routing to that leader. This allows
  independent activation without changing the model's tensor format. Fine-tuning
  a copy of shared weights for Krennic must not mutate the dependencies used by
  Vader's release. Removing unused modules is a later packaging optimization
  requiring inference-parity checks.
- **Support multiple tested engine versions.** Separate the trained-on contract
  from a versioned serving observation/action interface and certified runtime
  compatibility. The same weights may serve several explicitly tested engine
  and card-release combinations. Engine semantic version numbers or matching
  tensor dimensions alone are insufficient. Changed rules require behavioral
  evaluation; new feature/action semantics may require an adapter, runtime
  deployment and retraining. Preserve exact historical training/replay pins.
- **Operate releases from Administration → Crossfire → AI.** List published
  releases, inspect per-leader/deck evaluation and compatibility, validate and
  preload a candidate, activate it, and roll back one leader independently.
  Uploading does not activate a release. Each game pins its selected model and
  dependencies for its lifetime. An initial application deployment installs
  this feature; subsequent compatible model releases use R2 and the durable
  release registry without a normal application deployment.
- **Use live Crossfire games for offline learning.** Export a separate private
  training dataset containing decision histories plus outcomes, with original
  engine/card pins and provenance. A win/loss summary alone is insufficient.
  The training server imports validated immutable dataset batches from R2;
  training and release qualification remain separate from live gameplay.
- **Require both players' training opt-in.** The user confirmed this policy on
  2026-09-24. For human-vs-human games both players must explicitly opt in;
  human-vs-bot games require the human participant's opt-in and server-owned bot
  provenance. Replay visibility is not training permission. Remove account IDs,
  names, sessions, chat and other unrelated metadata; use export-specific seat
  labels. Only event-time permitted observations enter policy features, with
  both seats/branches of a game kept in the same dataset split. Dataset retention,
  withdrawal and future-training exclusion must be defined before enabling
  production export; do not claim removal from already-trained weights.

This release design uses per-leader immutable dependencies rather than one
mutable production shared encoder. Shared knowledge can seed or improve future
leader training runs, while each published leader remains reproducible.

## Existing foundation

Verified at starting commit `85ca9568`; follow the code if historical milestone
descriptions in older Crossfire documents disagree with current implementation.

| Existing component                                                                                                                                               | Reuse for this feature                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Engine entrypoint](../../../play/engine/index.ts) and [advance](../../../play/engine/advance.ts)                                                                | Create games and resolve validated inputs through the original rules engine.                                              |
| [LocalGame and replay](../../../play/host/session.ts)                                                                                                            | In-memory execution, injectable random source, and replayable accepted inputs.                                            |
| [Projector](../../../play/projection/projector.ts) and [view contracts](../../../play/view/types.ts)                                                             | Seat-visible information, scoped handles, available options, and selection constraints.                                   |
| [Demo](../../../play/testing/demo.ts)                                                                                                                            | Example of driving projected choices; its fixed priority policy and replay-after-every-command loop are a smoke harness.  |
| [Scenarios](../../../play/testing/scenario.ts) and [conformance tests](../../../play/testing)                                                                    | Tactical positions, exact-copy mechanics, and regression coverage.                                                        |
| [Existing benchmark](../../../play/scripts/benchmark.ts)                                                                                                         | Transition/projection/checkpoint measurements; complete-game training throughput still needs measurement.                 |
| [Durable host](../../../play/host/durable-game.ts), [game worker](../../../play/worker/games.ts), and [storage](../../../play/storage/postgres.ts)               | Serialized commands, ownership fences, durable receipts, recovery, and committed publication.                             |
| [Lobby service](../../../server/lib/crossfire/lobbies.ts) and [schema](../../../server/db/schema/crossfire.ts)                                                   | Existing admission and participant storage, currently coupled to human account/session semantics. A bot seat is new work. |
| [Crossfire home](../../../frontend/src/components/app/crossfire/CrossfireHome.tsx) and [board](../../../frontend/src/components/app/crossfire/BoardPosition.tsx) | Existing UI surfaces for admission and play.                                                                              |

Current operation and compatibility references:
[engine guide](../../../docs/crossfire/engine-core.md),
[architecture and operations](../../../docs/crossfire/architecture-and-operations.md),
[card releases](../../../docs/crossfire/card-releases.md),
[regroup/resource preparation](../../../docs/crossfire/regroup.md), and
[statistics](../../../docs/crossfire/statistics.md).

## Scope and delivery stages

### Learning experiment

- Initially Greef Aggression and Dedra Colossus from the pinned roster; exercise
  both orientations and opening setups, then add the other four selected decks.
- Headless training/evaluation without browser, database, or production services.
- A versioned observation and action contract covering the selected deck pool.
- Random and scripted baselines, reproducible tactical cases, and an independent
  evaluation set.
- A small neural policy/value model, initially recurrent PPO with legal choices
  constrained by the engine and own-deck composition as input from the outset,
  trained against a pool of opponents.
- A report showing learning curves, held-out results, failures, and measured
  compute requirements. Failure to improve is a valid experimental finding,
  not completion of the trained-opponent objective.

### First playable release

- A qualified frozen checkpoint, model compatibility manifest, and bounded
  inference outside the authoritative game worker's execution path.
- Server-owned bot seats, durable game creation, bot scheduling, and recovery.
- Crossfire admission/UI, replay and practice-statistics behavior, operational
  controls, and end-to-end validation.
- A documented supported deck/matchup envelope. The initial experiment does not
  establish strong play against arbitrary decks, even if the engine supports them.

### Expansion

- Expand the shared deck-conditioned policy through all six selected archetypes
  and eventually broader player deck choice, qualified with unseen matchup tests.
- Additional measured difficulty levels and consented live-Crossfire datasets
  for offline demonstration learning, followed by fresh self-play evaluation.
- An optional search experiment that accounts for hidden information, only
  after measuring the learned policy and its inference budget.

Autonomous deck building, learned sideboarding/BO3 strategy, multiplayer bots,
live learning from every user game, conversational personalities, and a promise
of competitive strength across the entire catalog are outside this release.
The engine remains the only rules implementation; do not replace it with a
Python port or another project's card engine.

## Required behavior and boundaries

- **Seat knowledge:** train and serve from the same observation semantics. Full
  states, private recordings, hidden-zone identifiers, opponent memory, RNG
  state, and future information must not enter the policy. Use a seat-visible
  critic for the first experiment as well.
- **Memory:** retain legitimately observed events and reveals. Do not track a
  physical card through a hidden shuffle using stable internal IDs. Scope
  recurrent state to one game, seat, model, and history branch.
- **Decision ownership:** follow the engine's current chooser, including nested
  opponent choices and repeated choices by one seat. Do not assume strict
  player alternation. Waiting for the normal resource step is sufficient; the
  bot need not submit optional early resource plans.
- **Complete commands:** option selection alone is insufficient. Handle selected
  cards, ordering, budgeted subsets, allocations, named cards, chosen numbers,
  and applicable optional effects. Unsupported cases must be detected before
  admitting an advertised deck pool, not silently skipped during play.
- **Learning objective:** begin with terminal win/loss/draw reward. Do not
  directly reward base damage or resource spending. A step limit or simulator
  failure is not a rules-level draw.
- **Authority:** the learner and inference worker propose intent. The existing
  engine and durable host validate and commit live progress. Preserve human
  authorization, retry deduplication, ownership fencing, and viewer projection.
- **Versioning:** pin model, feature/action schemas, engine/rules/card release,
  deck snapshots, and inference configuration. Freeze a model within a game;
  a new card release does not automatically qualify an old model.
- **Data:** bootstrap with synthetic self-play. Human replay availability or
  viewing permission alone does not authorize training export; define that
  workflow separately if demonstrations become useful. Keep private training
  artifacts out of Git, browser payloads, and public contributor dumps.
- **Operations:** training has explicit CPU/disk limits, no default total-game
  or wall-clock cap, and runs separately
  from live games. Model failure, overload, restart, and rollback must have
  bounded, visible behavior.

## Success criteria

The initial experiment is successful when a reproducible trained checkpoint
outperforms the declared scripted baseline on held-out games, handles its whole
decision contract, passes tactical and information-boundary checks, and fits a
measured compute budget. See the numeric proposed gate in [plan.md](plan.md).

The playable feature is complete when a user can start, play, reconnect to,
finish, and replay a game against that qualified model in Crossfire; the bot
retains correct knowledge and behavior through recovery; and bot games remain
separate from human-match statistics. A simulator, training script, or random
opponent by itself does not satisfy the feature.

## Decisions to resolve during implementation

| Decision                               | Planning default / point of resolution                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial decks                          | Select two supported fixed lists with contrasting play patterns in M0; add a control-heavy deck later.                                                                 |
| Training hardware, storage, and budget | Measure available hardware and simulation throughput in M0; set a bounded experiment before a long run. No rented compute is assumed.                                  |
| Algorithm                              | Recurrent PPO with candidate-action scoring; retain only if the learning and throughput experiments justify it.                                                        |
| Opponent deck knowledge                | Own decklist and legitimately public opponent information; exact opposing list only in an explicitly open-list mode. Fixed-pool training limits generalization claims. |
| First live roster                      | Restrict admission to tested deck configurations initially; qualify broader human decks in M8.                                                                         |
| Serving runtime                        | Start with a persistent Python inference process; consider an exported runtime only after feature/memory parity and latency measurements.                              |
| Latency and difficulty                 | Adopt measured per-decision limits before live admission; expose only validated difficulty choices.                                                                    |
| Bot participant persistence            | Design in M6 against current account/session, lobby, history, and statistics contracts. No fabricated human OAuth session.                                             |
| Human demonstrations                   | Live-Crossfire export/import is requested, with both players' explicit opt-in and versioned data provenance; manual replay upload remains a later separate UI.         |


### Production release and dataset implementation (2026-09-24)

Implemented in this worktree using `swubase-online-play`, backend/frontend API,
frontend components/routing, database migrations, development-data, documentation,
validation and change-review skills. See `docs/crossfire/ai-releases.md` for the
operator workflow and exact limitations. Leader-scoped training, immutable R2
publication, tested-target manifests, admin preload/activation/rollback, a private
frozen inference service and per-game two-human consent/export/import/imitation
learning are implemented. Bot-seat admission remains the separate M6 integration.
No production release or live-game R2 upload has been performed. Continuous
training remains stopped; validation uses bounded synthetic fixtures.
