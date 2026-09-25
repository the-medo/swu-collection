# Eight-deck specialist training and practice rotation

User-approved scope (2026-09-25): add the provided Chewbacca Alliance Outpost
(aggro) and Luke Hero of Yavin Data Vault (space aggro) lists; create twelve
thoughtful scenarios for every deck; train each for 500 initial practice epochs;
cycle one learner deck through all eight opponents for 1,000 completed games each,
then rehearse it for 50 epochs and compare before moving to the next learner.
Repeat without a game/time cap. Keep <=9 logical CPUs, <=100 GB total AI artifacts,
with independent disk checks every 300 seconds and guarded artifact writes.

Skills: swubase-online-play, swubase-architecture, swubase-decks,
swubase-frontend-components, swubase-frontend-api, swubase-backend-endpoints,
swubase-documentation, swubase-validation, swubase-change-review.

## Implementation and acceptance

- [x] Read and admit both exact lists against the local implemented card catalog.
- [x] Preserve the six-deck contracts and historical runs; add a pinned eight-deck roster.
- [x] Generalize the legal projected practice adapter to arbitrary own-deck encoding,
      pilot/deployment/Plot choices and explicit training/evaluation family splits.
- [x] Author 12 distinct tactical/strategic scenarios per deck, with explicit
      assumptions and outcome assertions. Ten train and two are held out per deck.
- [x] Validate all lines through engine commands, checkpoint recovery and replay;
      generate a readable review of all 96 scenarios.
- [x] Prepare one recoverable learner per deck, including its shared dependencies
      and optimizer. Opponents use the latest frozen bundle belonging to their
      actual deck; never a Krennic snapshot pretending to be a trained Vader.
- [x] Complete exactly 500 initial practice epochs for each learner before matches.
- [x] Implement eight 1,000-completed-game blocks per learner, including mirrors;
      save training statistics by exact opponent model and balanced seats.
- [x] Implement the post-8,000-game phase: measure practice/full-game performance,
      rehearse exactly 50 epochs and repeat the same comparison. Preserve an
      immutable baseline opponent bank for longitudinal evaluation.
- [x] Resume from interruption without resetting completed games, epochs, deck
      position, opponent pins or the latest completed comparison.
- [x] Update the dashboard for all-deck phases, per-deck practice and comparisons,
      clear training-versus-evaluation labels and the 64,000-game full rotation.
- [x] Focused tests, full training suite, frontend build/lint and browser checks;
      start and verify continuous training.
- [x] Attempt independent read-only Claude review; report its unavailability.

No production activation or R2 publication is part of this request. Practice
agreement is teacher-forced choice matching, separate from actual full-game wins.
Held-out examples never enter practice optimization; exact epoch counts replace
the old warm-up early-stopping gate for this explicitly requested schedule.

## Runtime evidence, 2026-09-25

- Running output: `.swubase/crossfire-ai/specialists-32518a76-59b8-4a2c-beee-5dd5e124edd8`.
  Process metadata: `.swubase/crossfire-ai/rotation-process.json`.
- Separate fresh per-deck bundles; previous Krennic experiment preserved and
  stopped cleanly at 92,368 games. No inherited legacy/shared-policy weights.
- All eight initial warmups completed exactly 500 epochs. The first Krennic→Greef
  batch completed 1,000 games with seat counts `[500,500]`; the run continued
  automatically into Krennic→Mandalorian. Greef’s opponent hash matches its
  saved post-practice specialist. Training remains running without a total cap.
- The real trainer and all nine Bun workers have CPU affinity `0-8`. The independent
  300-second disk monitor reports roughly 2.71 GB including earlier artifacts.
- 384 scenario variations pass engine/projection/checkpoint/replay assertions.
  Original Krennic practice/curriculum regression tests pass. Python tests cover
  exact epoch counts, all directed matchups and mirrors, per-deck optimizer
  restoration, interruption accounting, and the complete evaluate→50 epochs→
  evaluate→next-learner transition. Six full-game new-deck/mirror probes also
  reached terminal outcomes and replayed successfully.
- Typechecks, engine boundaries, frontend build, focused ESLint, and dashboard
  reader tests pass. Desktop/mobile browser checks show no page errors or mobile
  document overflow. The human-export test fixture was isolated from the live
  trainer’s artifact lock; its tests pass without stopping training.
- Independent Claude Code review timed out after 180 seconds with no output.
  Local source review was completed; no independent approval is claimed.
- First 8,000-game turn and its measured refresher comparison are still in the
  future; the continuing process will create them automatically. This is a
  development training run, not a production-strength qualification.
