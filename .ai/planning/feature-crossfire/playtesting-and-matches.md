# Crossfire playtesting and matches

Approved 2026-09-13. Review base: `6a36d026`, branch `codex/crossfire`.
Commit each completed step. Implementation is authorized. The user removed point 4 on 2026-09-13: no
Coolify playtest or separate operational load milestone. Local validation and
screenshot updates remain part of each source step.

## Scope

1. Player chat alongside the game log; same-deck rematches; private problem
   reports anchored to committed bookmarks, with descriptions and account access.
2. Complete missing IBH card implementations. Do not expand SOR, SHD, TWI or
   TS26 coverage in this phase; preserve cards already implemented from them.
3. Best-of-three match coordination, scores and private between-game sideboarding.
   Each game remains independently journaled/replayable. Both players must be ready
   before the next game begins; the submitted pool and leader/base stay frozen.
4. Removed at the user's request; no Coolify work in this phase.

## Delivery steps and acceptance

| Step | Work and acceptance | Skills |
| --- | --- | --- |
| 1 | Durable bounded player chat with reconnect catch-up and no spectator/replay injection. Reports capture an exact committed position, remain private, and never upload authoritative state from a browser. | `swubase-online-play`, `swubase-websockets`, `swubase-backend-endpoints`, `swubase-auth-permissions`, `swubase-database-migrations`, `swubase-development-data`, `swubase-frontend-api`, `swubase-frontend-components` |
| 2 | Mutual rematch consent; fresh game from frozen accepted decks. Best-of-three lobby option, durable match score, private validated sideboards and atomic two-player readiness. Reconnect/retry/race tests preserve one next game and correct scores. | Same domain skills plus `swubase-decks`, `swubase-frontend-routing` |
| 3 | All remaining IBH mechanics implemented in individual card files, using official text/rulings and existing engine primitives. Meaningful card outcomes, visibility and continuation/recovery checks pass; archive only the newest committed engine. | `swubase-online-play`, `swubase-card-implementator`, `swubase-card-catalog` |

Load `swubase-validation` and `swubase-change-review` for all source steps;
`swubase-documentation` for guides. Use existing native SQL adapters and append-only
Drizzle migrations, apply locally, verify contributor-data exclusion and run the
frontend build. Attempt the required independent read-only Claude review per step.

## Boundaries

Chat and reports are application metadata, never engine inputs or journal entries.
Chat is for the two players; spectators cannot send messages to influence live play.
Opening a report/bookmark does not expand replay permissions. Reports remain in
SWUBASE; no automatic external issue creation or notifications are authorized.

Match coordination belongs outside the rules engine. A new game's state, random
inputs, tickets and history are independent; a rematch does not reuse a finished
state. Sideboard edits use only the original submitted pool, preserve card counts,
and reveal readiness rather than selections to the opponent. Apply the chosen
format's validated rules and clearly retain the distinction from a certified
competitive tournament implementation. Do not silently introduce rotation-based
rejections into existing unrestricted practice lobbies.

Progress: steps 1–3 implemented, committed and verified; step 4 removed by the user.

Step 1 validation: migrated the isolated database; chat ordering/rate/retention,
WebSocket disclosure/reconnect, atomic reports, client and route tests passed.
Crossfire typechecking, frontend build, focused lint and migration checks passed.
The live two-player browser flow verified chat catch-up and exact report replay
navigation; the local history gallery includes both screens. Local diff review
completed. The required Claude review attempt failed with “Execution error”.


Step 2 validation: match tables (now part of `0057_crossfire`) applied and checked;
25 focused integration/route tests passed, including private sideboards, consent,
concurrent/duplicate starts, session revocation, scoring, draw initiative and
same-deck rematches. All 351 continuation fixtures preserve transitions and viewer
projections. Crossfire typechecking, frontend build and focused lint passed.
The two-player browser flow covers sideboarding, mobile, reload and rematches;
`matches.html` is linked from the local gallery. Repository-wide frontend types
still contain baseline errors outside this feature. Local review completed;
Claude review again failed with “Execution error”.


Step 3 adds all 44 missing IBH identities (34 units and 10 events), with all 51
IBH printings now supported. All official detail responses were checked, including
Han's defending-unit erratum. The engine remains original and uses existing
primitives. The full engine check passed 3,079 tests; the final IBH/continuation
checks passed 67 tests, including seven fresh-process cases and 358 shared
continuations. The browser gallery passed 63 captures and 14 engine commands,
including on-board selection of both IBH damage targets. A gallery focus click
was corrected to avoid the new Match button. Existing positional storage fixtures
retain their original ordering when the new initiative case is appended.

Local review completed; the Claude card review attempt failed with “Execution
error”. A separate reviewed match request-limit fix permits the complete supported
sideboard size while preserving bounded bodies (12 route tests passed).

Final validation after source commit `14c33f85`: retained only engine
`crossfire-0.125.0` with card bundle `crossfire-core-123` and state version 107.
Its recorded game replay and all 358 continuation fixtures recover identically in
fresh processes. All 87 database integration tests passed (3,107 assertions),
including the retained executable and database recovery paths. The restarted local
API and worker passed real browser checks for history, backwards seeking, branches,
perspectives, reload, mobile, private sideboards, mutual readiness, one next game
and rematch consent. The full gallery, history gallery and match gallery all return
HTTP 200 from the configured worktree HTTPS origin. No Coolify work was performed.

Source commits: `31f27f7d` (chat/reports), `4fb7029a` (matches/sideboarding),
`d37f0836` (complete sideboard request size), `14c33f85` (remaining IBH cards).
