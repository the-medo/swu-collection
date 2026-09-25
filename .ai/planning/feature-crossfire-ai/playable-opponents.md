# Playable frozen AI opponents

Skills: swubase-online-play, swubase-architecture, swubase-backend-endpoints,
swubase-frontend-api, swubase-frontend-components, swubase-frontend-routing,
swubase-database-migrations, swubase-development-data, swubase-worktree-dev,
swubase-documentation, swubase-validation, swubase-change-review.

- Extend evaluated leader releases with immutable, validated deck snapshots.
  Package a chosen continuous-rotation bundle and support admin file import.
- Admit authenticated human-vs-AI games with one human account and a private
  immutable bot pin. Never create synthetic Better Auth accounts for bots.
- Run bounded inference through projected legal choices and the durable game
  owner. Serialize committed bot commands, preserve recovery, and notify viewers.
- Exclude AI games at the statistics writer, including retries. Keep history
  summaries with an AI filter and explicit labels.
- Keep latest five completed AI replays per account. Global default plus private
  per-account overrides support higher limits or unlimited retention. Expiry
  removes replay payloads and revokes cached/ticket access, preserving summaries.
- Add Crossfire opponent selection, show inference/release availability and
  validate a complete game, reconnect, model pinning, replay, quota, auth and
  statistics exclusion in the isolated worktree.
- Keep current training running during development. If release packaging needs
  its exclusive artifact lock, checkpoint-stop it briefly, package, and resume.

## Completed

- Added immutable playable deck snapshots, rotation-deck packaging, and admin
  manifest/weight upload. Activated eight local evaluated releases independently.
- Added authenticated, idempotent AI admission, pinned durable bot turns, private
  player projections, reconnect/retry behavior, and opponent selection.
- Added permanent AI history labels/filtering, central statistics exclusion, and
  finalizer retention with account overrides. Latest five completed AI replays are
  retained by default; expired summaries survive and replay access is revoked.
- Packaging briefly checkpoint-stopped training, evaluated 160 replay-verified
  games for each of eight releases, then resumed the continuous rotation. CPU
  affinity remains 0–8; the 100 GB monitor samples every 300 seconds.

## Verification

- PR integration uses current main and its existing migrations 0060/0061. A fresh
  generated `0062_crossfire_ai` creates the complete AI schema. The original
  training worktree retains its already-applied local migration chain; its
  database must not be reused with this integration branch. The integrated
  branch has its own bootstrapped database and preserves main's MatchupCard
  history layout and practice-statistics behavior.
- Integrated branch checks: 526 AI/frontend/route tests, 45 database tests,
  Crossfire typechecks and import boundaries, frontend build and focused lint.
  All 58 Python tests passed in the training worktree. A real-model browser
  run against the integrated branch verified all eight opponents, eight Vader
  commands, reconnect, history filtering, mobile layout, replay and no player
  statistics. The final read-only Claude review attempt timed out without
  findings; no independent review is claimed.

- Applied generated migration 0062 to the isolated worktree; Drizzle check passed.
- 27 focused unit/route tests, seven AI integration tests and 30 human
  history/lobby/match/statistics regression tests passed; six Python release and
  inference tests passed.
- Crossfire typechecks/import boundaries, frontend build and focused ESLint passed.
- Real browser acceptance: eight opponents; frozen Vader turns; reconnect;
  concession, finalization and replay; AI history filter; no player result rows;
  desktop/mobile layouts. Admin upload validated an actual packaged release while
  leaving active selections unchanged. Existing release-review/consent UI passed.
- Full frontend typecheck still reports 313 pre-existing repository diagnostics;
  the only affected-file diagnostic is the pre-existing `RowList.at` in matches.ts.
- Independent read-only Claude CLI review was attempted and returned
  `Execution error` without findings. Local review completed; no independent
  review is claimed. Task-only baseline and validation logs are local under
  `.swubase/crossfire-ai/play-ai-*`.
