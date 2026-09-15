# Crossfire implementation plan

The [history, replays, undo and bookmarks phase](history-replay-and-undo.md) is
implemented and validated as of 2026-09-11: compact completed journals, initial/
latest live snapshots, bounded replay caching/navigation, approved action undo,
bookmarks and consented practice forks. The broader milestones below retain
separate work such as scenario editing, production compatibility and deployment.
See [operations](../../../docs/crossfire/architecture-and-operations.md) and
[measurements](../../../docs/crossfire/history-benchmark.md) for current behavior.

Current pre-release decision: keep only the newest engine executable. Do not
retain/rebuild earlier experimental versions as part of routine development.
Keep strict version checks and current-version recovery tests. Historical game
compatibility and executable retention below are future release requirements,
to revisit before real user games are collected.

Milestones 0 and 1 pass their representative core-practice gates as of
2026-09-09. Milestone 2 is in progress; milestones 2–7 retain the work listed below.
This does not claim complete rules or catalog coverage; that remains milestone 6.
The [working engine guide](../../../docs/crossfire/engine-core.md) documents actual
APIs, commands, coverage, and limitations. Product decisions are listed in
[description.md](description.md), and the broader design is in
[architecture.md](architecture.md).

## 0. Build Crossfire's original engine core

Status: **complete for the core-practice slice**. `bun run play:check` validates
types, engine/browser boundaries, and conformance scenarios. `bun run play:demo`
completes a game through projected player choices and checks every accepted
position against its private recording. Ten dedicated card files, immutable
candidate transitions, strict scenarios/checkpoints, scoped views, and
fresh-process continuation are implemented. This is same-version input replay;
durable historical playback, complex effect recovery, and live services retain
their later milestone gates.

Engine origin is decided: author the engine, card implementations, and
conformance tests in SWUBASE from official SWU rules and card text. Establish the
`play/` TypeScript package with Bun checks and explicit server/browser boundaries.
The core runs headlessly with no account, network, database, or UI dependencies.

Build the first executable slice around:

1. Versioned plain state, canonical card registry, exact-copy references, and
   validated scenario input using SWUBASE catalog IDs.
2. A deterministic transition contract with serializable execution frames,
   explicit decision ownership, and injectable server randomness. The previously
   committed state stays unchanged while computing a candidate transition.
3. Setup, initiative, mulligan, resourcing, alternating actions, playing a unit,
   attacks, passing, regroup, concession, and base defeat. Use an explicitly
   supported small card set with original per-card definition files.
4. Basic player/spectator projections and structured exact-copy events, so
   hidden-state boundaries are exercised before any frontend is connected.
5. Independently authored rule cases for costs, legal targets, exhaustion,
   simultaneous combat damage, and turn progression, with official rule sources.

Gate: complete a small game through the headless command interface; reject
illegal actions; reproduce its accepted transitions from recorded inputs; prove
that two games and duplicate card copies remain independent. Every supported
card has its own definition. This establishes a runnable foundation, not a claim
of complete rules or card support.

Skills: `swubase-architecture`, `swubase-online-play`,
`swubase-card-implementator`, `swubase-card-catalog`, `swubase-decks`,
`swubase-validation`, `swubase-change-review`.

## 1. Prove complex resolution, durable state, and scenarios

Completed step 1a: nested trigger batches with player/ability ordering, source
snapshots, simultaneous-defeat observers, unique-copy maintenance, and v8 Ambush.
Five additional dedicated cards exercise these paths. Mid-action fresh-process
recovery and every-input replay pass for the new continuations. The engine/state/
card/protocol versions were advanced; older bundles are explicitly rejected.
See [card priorities](../../../docs/crossfire/card-priorities.md) for the local
aggregate data behind implementation order. The subsequent steps below prove
representative replacement, hidden-zone and delayed-effect continuations; other
rule families remain tracked by coverage rather than implicitly supported.

Completed step 1b: immutable retained executables built from committed sources
and locked dependencies, checksum/version validation, current/previous engine
recovery and replay, a coverage CLI, and a hardware-identified initial runtime
baseline. See [retained bundles](../../../docs/crossfire/retained-bundles.md).
The measured fixture covers the implemented trigger slice; broaden it when the
remaining milestone mechanics exist.

Completed step 1c: exact-instance attachment relationships, ordinary upgrade play,
cumulative modifiers, token lifecycle, Shield replacement choices, Shielded and
Sentinel. Five dedicated definitions include two popular units and the token/
ordinary upgrade foundations. Both players' replacement decisions survive fresh-
process recovery with simultaneous damage still pending. See
[attachment resolution](../../../docs/crossfire/attachments.md). This implements
the Shield replacement path, not the remaining replacement or delayed mechanics.

Completed step 1d: Latts Razzi's mandatory token choice, damage based on current
power, and per-incarnation departure statistics for abilities whose source has
left play. Fresh-process and recording tests include token selection, nested
Shield replacement, uniqueness, and retained modified power across reentry.

Completed step 1e: events resolve from discard, modified attacks have recoverable
duration scopes, and power bonuses expire before post-combat triggers. Dedicated
Aggressive Negotiations, Surprise Strike and Open Fire definitions exercise the
new paths. See [event execution](../../../docs/crossfire/events-and-search.md).

Completed step 1f: private top-deck inspection, filtered exact-copy selection,
fail-to-find, public reveal/private draw facts, randomized bottom-of-deck
remainders, and recoverable search/shuffle suspensions. Recruit, Remnant Reserves
and Greef Karga use the shared primitive. Privacy checks include hand-reveal
policies, hidden handles and spectator payloads.

Completed step 1g: Sneak Attack uses discounted nested unit play and ready entry,
with exact-incarnation delayed defeat at regroup. Both-player batch ordering,
source departure, target reentry, nested uniqueness/defeat triggers, opaque
scheduled-effect views and fresh-process recovery pass conformance tests.

Completed step 1h: non-leader Piloting has alternate costs, explicit printed
traits and upgrade profiles, Vehicle eligibility in either arena, upgrade-only
triggers, granted Sentinel, role-aware damage/removal/search behavior, scenarios,
projected play modes and fresh-process continuation. Clone Pilot, Academy
Graduate, Astromech Pilot and Skyhopper Canyon Runner are admitted. Pilot leaders
and conversion of an already-in-play unit remain separate work.

Completed step 1i: Support lends ability origins for a single attack, including
last known abilities after source departure. Raid and Restore stack correctly;
borrowed triggers retain their holder and definition origin through choices,
Shield replacement and recovery. Remnant Interceptor, Honorable Nite Owl and Migs
Mayfeld are admitted. Views distinguish duplicate printed ability IDs by their
granting card, without exposing internal runtime prefixes.

Completed step 1j: nine shared continuation fixtures now verify exact decoded
transitions and all three views. Retained executable checks resume each current
fixture in a fresh process alongside every-input replay for older versions. The
expanded benchmark measures command/checkpoint/projection costs and includes a
round-40 history and 100 retained mixed game states. Clean committed measurements
and all ten retained-version results are linked from
[the retained-bundle guide](../../../docs/crossfire/retained-bundles.md). This closes
the representative core-practice gate; service/database/concurrency costs and
the remaining card and rules coverage have their later gates.

Leader-contract correction: explicit printed faces, active-face action/trigger
lookup, deployment as an effect, separate activation costs/conditions, and
per-ability use history replace the first leader-specific assumptions. See
[leader cases](../../../docs/crossfire/leader-abilities.md) before adding another
leader. Only Sabine is admitted; the referenced exceptional leaders remain
unsupported until their complete mechanics pass conformance tests.

Extend the core with nested trigger batches, replacement and delayed effects,
rule maintenance, last known information, and richer scenario/checkpoint codecs.
Exercise hidden search, Piloting, v8 Ambush, and Support with independently
derived expected outcomes. Implement coverage reporting and retained bundle
versions. Keep a convenient scenario builder separate from an exact recovery
checkpoint while both use the same rules runtime.

Gate: an exact-copy fixture survives serialize/deserialize and fresh-process
resume at a choice; replay and subsequent decisions match. Include independent
games using identical card names and no shared mutable state. Include randomness,
attachments, delayed effects, and an intermediate card appearance/removal.
Compare both players' and a spectator's projections, including reveal/revoke and
hidden-zone handle changes. Changes to the engine/card bundle cannot silently
reinterpret an existing game. Record Bun memory, command latency, checkpoint
cost, and recovery time on identified hardware before adding service overhead.

Skills: `swubase-online-play`, `swubase-card-implementator`,
`swubase-card-catalog`, `swubase-validation`, `swubase-change-review`.

## 2. Persist games and integrate SWUBASE admission

Completed step 2a: the consolidated migration `0057_crossfire` creates private `play` game heads,
command journals/receipts and checkpoints. The PostgreSQL adapter has atomic
append/checkpoint writes, durable retry identity, expiring ownership fences,
consistent recovery reads and pinned-executable reconstruction. The isolated
local DB suite covers complex recovery, racing commands, owner replacement,
injected rollback and contributor sanitization. See
[durable storage](../../../docs/crossfire/storage.md). Admission, permissions and production retention remain outstanding.

Completed step 2b: the durable host serializes bounded per-game queues, validates
trusted seats, resolves server randomness, commits before returning progress,
and pauses on uncertain storage writes until explicit recovery. Retry races
restore the committed random outcome. Process-kill tests cover before-commit
and after-commit/before-acknowledgment failure under replacement ownership.
Heartbeat/checkpoint policy is explicit; online admission and worker routing
remain to be implemented.

Completed step 2c: an access-controlled, consistent SWUBASE reader handles
ordinary and limited deck models. Canonical immutable snapshots preserve
mainboard/sideboard/reserve separately, pin official identities and executable
versions, and report unsupported live cards before initialization. Local tests
cover access, zero/maybeboard/trash exclusions, limited metadata consistency and
source edits. See [deck admission](../../../docs/crossfire/deck-admission.md).
Snapshot persistence and authenticated ticket/seat admission remain outstanding.

Completed step 2d: the consolidated migration `0057_crossfire` persists link-based lobbies, frozen decks and
seats. Existing sessions, creator readiness, deck access and explicit disclosure
consent are checked before the second seat and initial game commit atomically.
Concurrent joins, lost join responses, rollback and sanitizer integration are
covered locally. See [lobbies](../../../docs/crossfire/lobbies.md). Connection
tickets, HTTP/WS wiring and production lifecycle policy remain outstanding.

Completed step 2e: the consolidated migration `0057_crossfire` and the private connection service add hashed,
short-lived, single-use tickets bound to game/session/role; exact Origin checks;
spectator admission; and same-seat connection counters. Live authorization can
hold auth/policy/seat locks inside a command transaction. Local tests cover
concurrent redemption/reconnect, expired tickets/sessions, sign-out, bans,
account deletion, spectator escalation and contributor exclusion. See
[connections](../../../docs/crossfire/connections.md). Host commit integration,
HTTP/WS handlers and worker lifecycle are next; these helpers expose no network
game service yet.

Completed step 2f: the connected command adapter binds game/seat to a redeemed
grant, validates queued work and holds live authorization locks inside the
journal append. Reconnects, bans and expiry during lock waits cannot commit old
commands. Expected denial preserves the committed position without pausing the
opponent; uncertain writes still pause. Replacement connections reuse durable
command receipts. The local suite also caught a ticket-pruning batch limit
failure; cleanup now materializes its selected batch before deleting it.
HTTP/WS handlers, viewer publication and worker lifecycle remain next.

Completed step 2g: the main API exposes typed create/get/join/cancel/ticket
routes under `/api/crossfire`, disabled unless deliberately enabled. Existing
Better Auth identity, exact mutation Origin, bounded bodies, no-store responses,
safe errors and per-process mutation limits protect admission. A bounded native
PostgreSQL pool preserves the adapters' serialization contract. Focused route
tests, frontend build and the running local app's real session/sign-out flow
pass. See [HTTP admission](../../../docs/crossfire/http-admission.md). WebSocket
game hosting and viewer publication remain milestone 3 work.

Implement the proposed storage responsibilities and access roles; generate
schema/migrations through the existing root workflow. Define supported formats
and immutable deck snapshots for ordinary and limited decks. Integrate Better
Auth admission tickets, invitations, seat ownership, and policy consent.
Implement actor ownership, journal commits, command receipts, and restart
reconstruction before treating memory as the active runtime.

Exclude private gameplay tables and the new schema from contributor dumps and
verify it explicitly. Define retention, participant deletion/anonymization,
replay sharing and revocation before production data is collected. Game-result
integration uses an idempotent outbox; the existing per-user result table remains
a downstream read model, with the source enum/consumers extended deliberately.

Gate: private/unlisted/public deck access, zero quantities, boards 1/2/3,
card-pool conversion, unsupported cards and formats, ticket replay, wrong Origin,
wrong game/seat, sign-out, ban/session expiry, and duplicate commands behave
correctly. Kill the process before commit, after commit, and before acknowledgment;
each recovery produces only the committed result. A database outage must not
silently acknowledge unsaved progress.

Skills: `swubase-online-play`, `swubase-decks`, `swubase-card-catalog`,
`swubase-auth-permissions`, `swubase-backend-endpoints`,
`swubase-database-migrations`, `swubase-development-data`,
`swubase-validation`, `swubase-change-review`. Read `docs/migrations.md` fully.
Load `swubase-preview-cards` and its required documentation only if adding the
preview lifecycle boundary in this milestone.

## 3. Implement transport, views, and concurrent game hosting

Completed step 3a: the worker lifecycle registry shares one leased durable actor
between concurrent bindings, bounds loaded games and per-game work, renews idle
actors, evicts disconnected games, and drains shutdown safely. Local database
tests cover competing workers, independent games, capacity, idle recovery,
ownership loss and late restoration during shutdown. See
[worker lifecycle](../../../docs/crossfire/worker.md).

Completed step 3b: strict browser intent, viewer-only modular deltas and durable
opaque-command retries. Deltas round-trip both player views and spectators,
hide private-only progress and update exact-copy log references. Reconnecting
players can retry an acknowledged-lost command without translating obsolete
handles or executing again. See [transport](../../../docs/crossfire/transport.md).

Completed step 3c: a separate Bun WebSocket process admits tickets, serves
viewer snapshots/deltas, commits opaque commands, replaces old seat sockets and
revalidates idle sessions. It bounds frames/connections/queues, supports resync
and viewer hand preferences, and drains leases on shutdown. Real network tests
cover privacy, spectators, isolated rooms, reconnect deduplication, revocation,
overload and recovery in a fresh process after a worker kill. Multi-worker
routing remains deferred.

Completed step 3d: the worktree launcher reserves a separate loopback game port,
upgrades older local state, starts/stops the enabled worker and exposes its
status/log. The existing Vite origin proxies game sockets separately from the
main API. The two-worktree integration test checks worker and database isolation,
legacy upgrade and owned cleanup. A real Chromium check through the existing
private HTTPS/WSS origin verified HTTP admission, both players, a spectator,
committed updates, hand visibility/preferences and live sign-out.

Completed step 3e: disconnected sockets keep their process capacity reservation
until pending authentication/commands drain. A regression test blocks database
admission, closes the clients and verifies that new upgrades stay bounded until
the old work finishes.

Build WebSocket admission, viewer projection, typed modular patches, semantic
log/animation events, epoch/revision continuity, resync and bounded queues.
Implement same-seat reconnect and duplicate connection fencing. Run the game
service independently from the ordinary API and update local/reverse-proxy
routing. Add viewer permission changes and spectator admission using the same
projection policy as snapshot and replay reads.

Gate: snapshots plus contiguous deltas equal fresh projection; all private
channels pass differential disclosure tests; dropped/duplicated/stale messages
recover; spectator/participant roles cannot escalate. Multiple simultaneous games
and one slow spectator do not cross-talk or stall each other. Before adding
replicas, prove reconnect routing and fenced ownership during worker failure.

Skills: `swubase-online-play`, `swubase-websockets`,
`swubase-auth-permissions`, `swubase-backend-endpoints`,
`swubase-worktree-dev`, `swubase-validation`, `swubase-change-review`.

## 4. Deliver a playable frontend slice

Completed step 4a: the browser's in-memory connection controller validates server
messages, applies permitted deltas, scopes cleanup to the mounted session, and
retries original intent after reconnect. It blocks stale/pending choices, resets
views on resync/disclosure preferences and bounds automatic retry loops. Focused
controller tests and engine-produced DTO validation pass. See
[browser client](../../../docs/crossfire/frontend.md).

Completed step 4b: authenticated deck readiness, invitation creation/join with
explicit disclosure consent, sidebar/deck entry points and a lazy playable board.
The board uses projected legal choices, exact-copy highlighting, private hand
counts, card inspection, resources/discard, attachments/tokens and reduced-motion
layout transitions. Session cleanup and spectator preferences use replacement
views. `play:browser:test` supplies a repeatable local three-browser acceptance.
Full-game browser play and mid-resource-prompt reload pass. Chat, concession,
replay controls and more card-specific browser scenarios remain follow-ups.

Frontend target: navigation/deck actions, create/join game, ready state, and a lazy board route.
Implement the per-game projected store and all zones required by the slice,
including visible attachments, captures, tokens and prompt ownership. Reuse
existing card imagery and Motion after inspecting their behavior. Provide exact
instance highlighting from logs and targeting prompts, keyboard/touch access,
responsive layout, and reduced motion.

Gate: two authenticated browser sessions complete a game; a third watches under
both permitted hand modes. Reconnect mid-prompt; replay duplicates of the same
card; view a card that enters and leaves within one action. Animations neither
delay server decisions nor leave stale clickable actions. Client network/asset
requests contain no unauthorized card identities. Run the frontend build.

Skills: `swubase-online-play`, `swubase-frontend-components`,
`swubase-frontend-routing`, `swubase-frontend-api`, `swubase-websockets`,
`swubase-backend-endpoints`, `swubase-decks`, `swubase-auth-permissions`,
`swubase-validation`, `swubase-change-review`. Add browser-storage/user-settings
skills only if changing persistence or account-synced preferences.

## 5. Deliver replay and scenario tools

The [history implementation phase](history-replay-and-undo.md) completes storage,
cache, navigation, undo, bookmarks and consented practice forks for this milestone
and the relevant persistence work from milestone 2. An arbitrary scenario editor,
broader replay sharing and cross-version production compatibility remain open.

Expose history and authorized replay reads with seek, step, speed, perspective,
and exact-copy references. Retain event-time visibility and version compatibility.
Build the scenario editor on the tested data builder, not on a separate sandbox
engine. Clearly identify practice forks and prevent replacement of active games.
Define restart, cleanup, backup/restore, and archive procedures.

Gate: replay survives deployments, original deck edits/deletion, and server
restart without exposing private perspectives. Seeking and starting late preserve
permitted log/highlight behavior. Sharing, revocation, export, and scenario
creation check authorization server-side. A changed card implementation does not
alter old playback; historical forks require a compatible engine bundle.

Skills: `swubase-online-play`, `swubase-card-implementator`,
`swubase-backend-endpoints`, `swubase-frontend-api`,
`swubase-frontend-components`, `swubase-frontend-routing`,
`swubase-development-data`, `swubase-validation`, `swubase-change-review`.

## 6. Complete the advertised rules and catalog

Maintain a machine-readable coverage matrix for every card and every keyword,
rule family, token, supported face/role, and format. Implement in mechanic-based
batches, keeping the dedicated per-card files. Prefer meaningful regression
scenarios for actual abilities over trivial constructor tests. Update rules
references and card clarifications alongside each behavior change.

A limited card pilot can launch only with clear admission restrictions and
coverage reporting. The “any deck” milestone requires coverage of all relevant
mechanical cards, including tokens and card-specific deck construction overrides.
Preview support needs explicit implementation/identity/version handling; merely
rendering a preview is not support. Trilogy, multiplayer and Twin Suns require
their own full completion gates before claiming the entire supplied rulebook.

Skills: `swubase-card-implementator`, `swubase-online-play`,
`swubase-card-catalog`, `swubase-validation`, `swubase-change-review`;
add preview/official-import skills only for their actual catalog workflows.

## 7. Operational release gate

Test a declared workload mixing live games, expensive legal resolutions,
spectators, chat, reconnect storms, and journal/replay reads. Record target and
observed command/commit latency, memory per game, bytes per viewer, recovery time,
and impact on ordinary SWUBASE requests. Agree the initial concurrent-game target
from this evidence; no production capacity is implied by this plan.

Prove graceful draining, old-bundle support, crash recovery, database-failure
behavior, worker fencing, output backpressure, idle abandonment, and cleanup.
Check private data exclusion in contributor dumps and operational telemetry.
Independent code review and focused validation are required at each source
handoff, including the local Claude Code review when available.

For frontend changes run `bun run --cwd frontend build`. For database changes run
the migration checks and `bun run db-migrate` against the intended local database.
For worktree lifecycle changes use the supported tooling and relevant Bash,
status, ownership and concurrent-worktree checks. Select the rest from
`swubase-validation`. The core currently supplies `bun run play:check` and
`bun run play:demo`; define additional package/service checks as those boundaries
are implemented.
