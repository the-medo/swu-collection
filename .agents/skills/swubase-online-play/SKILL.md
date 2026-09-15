---
name: swubase-online-play
description: Design or change SWUBASE Crossfire engine state, game hosting, viewer projections, commands, spectators, recovery, replays, and scenario contracts. Excludes externally imported match results and unrelated realtime features.
---

# SWUBASE Crossfire online play

## Establish the current boundary

Read the [working engine guide](../../../docs/crossfire/engine-core.md) and
verify the corresponding code under `play/`. Consult the
[architecture proposal](../../../.ai/planning/feature-crossfire/architecture.md) and
[the delivery plan](../../../.ai/planning/feature-crossfire/plan.md) for milestone
scope and [the feature brief](../../../.ai/planning/feature-crossfire/description.md)
for product decisions. Milestone 0 has a headless core, ten card definitions,
scenario/checkpoint codecs, player/spectator projections, and an in-process host
with same-version input replay. Milestone 1 adds five cards, serializable nested
trigger batches, source snapshots, unique-copy maintenance and v8 Ambush.
The representative milestone 1 resolution/recovery gate now passes; complete
card/rule coverage, network service and frontend remain later work.
Exact-copy attachments, ordinary upgrade play, Shield/Experience tokens, Shielded,
Sentinel, upgrade removal and Latts Razzi's token choice/power-based damage are
implemented; read the
[attachment guide](../../../docs/crossfire/attachments.md). Events, scoped attack
modifiers and private top-deck search continuations are implemented in the
[event/search guide](../../../docs/crossfire/events-and-search.md). Sneak Attack
adds discounted nested unit play, ready entry and ordered regroup delays tied
to exact incarnations. Read [Piloting roles](../../../docs/crossfire/piloting.md)
for non-leader alternate play costs, traits, upgrade profiles and granted Sentinel.
[Support resolution](../../../docs/crossfire/support.md) adds attack-scoped ability
origins, Raid/Restore stacking and borrowed trigger snapshots.
[Executable retention](../../../docs/crossfire/retained-bundles.md) and an initial
runtime baseline are implemented; these are not durable game persistence. Proposed later contracts
are not existing APIs. The user selected Crossfire and an original SWUBASE engine.

Current entrypoints: `play/engine/index.ts`, `play/host/session.ts`,
`play/projection/projector.ts`, `play/view/types.ts`, and
`play/testing/scenario.ts`. Run `bun run play:check` and `bun run play:demo` from
the root. `bun run play:archive <commit>`, `bun run play:archive:verify`,
`bun run play:coverage`, and `bun run play:benchmark` cover version retention and
headless reporting. The [durable storage guide](../../../docs/crossfire/storage.md)
covers the PostgreSQL journal/checkpoints, ownership fences and private recovery
adapter and durable host. Use `bun run play:storage:test` with an explicit isolated local test URL
for DB/host changes. The actor commits before returning progress and pauses on
uncertain writes until reload. The API admits sessions to the dedicated game
worker; its runtime accepts supported historical engine versions with their
original installed card catalogs.
[Deck preparation](../../../docs/crossfire/deck-admission.md) provides consistent
SWUBASE reads and immutable core-practice input with unsupported-card reporting;
[lobby admission](../../../docs/crossfire/lobbies.md) persists those decks/seats
and atomically initializes games after session and disclosure-consent checks.
[Connection admission](../../../docs/crossfire/connections.md) adds short-lived
single-use tickets, live session/role checks and persistent seat connection
counters. The connected command adapter binds actor/game to the redeemed grant
and rechecks authorization inside the journal transaction. Expected denial does
not pause the game; uncertain writes still do. The
[HTTP admission routes](../../../docs/crossfire/http-admission.md) are mounted
behind `CROSSFIRE_ENABLED=1`; they derive identity from Better Auth and use a
bounded native PostgreSQL pool. Do not reuse the Drizzle-mutated `db.$client`
for native Crossfire adapters. The [worker lifecycle](../../../docs/crossfire/worker.md)
adds bounded, shared actor loading, heartbeats, idle eviction and shutdown.
The [transport contract](../../../docs/crossfire/transport.md) adds strict wire
intent, viewer-only modular deltas and receipt lookup before opaque-handle
translation for retries across reconnects. `bun run play:serve` runs the separate
ticket-authenticated WebSocket process with bounded queues, live revalidation,
viewer publication, resync and shutdown. The worktree launcher now manages its
separate port/process and same-origin proxy when `CROSSFIRE_ENABLED=1` is set.
The [browser client](../../../docs/crossfire/frontend.md) now supplies authenticated
invitation/deck-readiness UI and a lazy board using only the public view entrypoint.
Its memory-only connection/store handles current choices, private projections,
exact-copy log highlights, resync and reconnect. `bun run play:browser:test` is
opt-in against the explicitly selected running local worktree. Chat, concession
and replay browsing are implemented; distributed worker routing is not.
Card data now has independent immutable releases; read
[card releases and compatibility](../../../docs/crossfire/card-releases.md) when
changing versioning, catalogs, engine behavior or publication. New games pin the
active release; invitations and all games in one BO3 retain their original pins.
Minor engine releases preserve older-minor replay behavior within the same major.
Do not regenerate historical replay fixtures or bypass hash/fact checks to accept
a changed result. Card lookups require the state's catalog context. Keep prior
card data contracts and installed JSON bundles; executable archive tooling still
keeps only the newest committed runtime smoke artifact. The explicit pre-refactor
baseline remains compatible; older experimental builds are not promised support.
Archive only committed original engine code; bundle paths and
version selection are server-owned. Full state/recordings are server-only; the browser gets the view export.
Keep the distinction between the in-memory test host and authenticated durable
history services explicit when extending these contracts.

Author the engine, card implementations, and conformance scenarios from official
rules and SWUBASE requirements. Do not fork, vendor, port, or wrap another
project's game engine, or copy its card implementations/tests. Justify design
decisions against the feature requirements and actual SWUBASE code. External
project research stays outside committed feature files. General libraries and
existing SWUBASE components remain available.

Crossfire uses a separate game process with the existing frontend and Better
Auth identity, sharing PostgreSQL through the dedicated play schema. The engine
is original SWUBASE code. Do not confuse the existing `game_result` read
model with authoritative playable game state.

## Preserve the game authority

- Keep full state server-side, plain and versioned, including execution frames,
  pending decisions, random outcomes, last known information and effect history.
  A visible board snapshot is insufficient for recovery.
- Serialize commands per game under one owner. Validate authenticated seat/role,
  decision, revision, legal choices and targets; clients send intent, not state
  assignments. Deduplicate retries durably and fence displaced owners/sockets.
- Commit accepted progress before acknowledgment or publication. On failed
  persistence, pause/discard speculative progress and restore a known committed
  state before accepting another command. Timers/timeouts are server inputs.
- Keep engine behavior free of network/database/browser dependencies. Inject
  random outcomes through the game context; fixed seeds belong to fixtures, not
  production client commands. Do not serialize closures as a recovery strategy.

## Preserve viewer-specific information

Project each full state into what the viewer may know, then diff those views.
Project logs, animations, choices, errors and replay responses too. Do not redact
an already-created authoritative patch or send a full journal for client replay.

Distinguish catalog identity, physical instance, rules incarnation, and opaque
viewer handles. Avoid tracking a known card through a hidden shuffled group.
Resources may require authorized opaque selection handles; captured cards are
face down but their identities are public. A “face down means secret” shortcut
does not implement SWU information rules.

Keep view revision/epoch, reconnect buffers, and caches scoped to viewer and
permissions. Role/disclosure changes require a replacement projection. Reveal
hands to players, reveal hands to spectators, and replay disclosure are separate
policies. A viewer preference cannot grant permission; discretionary increases in
game-level disclosure require consent from affected players. Ordinary rule-mandated
reveals resolve through the engine without an extra consent step. Revocation cannot
erase knowledge already disclosed. Do not expose hidden resources/deck order under
a hand-reveal setting.

Card log references highlight the exact visible incarnation. Historical labels
can show what was legitimately known at the event, but must not link through to
a current hidden card or a different copy. Animations use committed semantic
events; they do not control turn progression or expose otherwise private assets.

## Persistence, scenarios and operations

Pin rules, card/catalog bundle, engine and storage/protocol versions. Persist
ordered facts and complete checkpoints, including mid-action choices. Playback
uses historical facts with event-time visibility and current replay entitlement;
resuming an old position requires a compatible runtime and its pinned card data.

Scenario inputs are validated data resolved by the same engine as live games.
Require valid references, zones, attachments, captures and historical context.
Do not accept executable scenario/card uploads or permit clients to replace live
state. Forking/sharing from a replay must enforce its disclosure authorization.

Keep actors, effects, randomness and queues isolated per game. Bound output and
command queues so a slow viewer does not block play. Multiple replicas require
owner routing and fencing; existing process-local socket rooms do not supply it.
Use minimal telemetry and explicitly exclude private game data from public
contributor dumps. Coordinate retention and account/deck deletion with replay
access rather than relying on accidental cascades.

Read [leader ability contracts](../../../docs/crossfire/leader-abilities.md)
before adding leaders. Use explicit face abilities and runtime role; keep
activation costs, effect conditions, and per-ability limits separate. Deployment
is an effect and does not itself spend a once-per-game use. Read
[pilot leaders](../../../docs/crossfire/pilot-leaders.md) for unit/upgrade deployment,
role-specific protection, conditional grants, attack history and non-combat
damage observation. Read [attachment attributes](../../../docs/crossfire/attachment-attributes.md)
when a card changes leader status or traits; direct upgrade effects and abilities
gained by the host respond differently to host ability loss. Read
[naming cards](../../../docs/crossfire/naming-cards.md) before adding title choices
or restrictions across zones; naming uses the pinned official title catalog,
while play admission still requires a complete registered implementation.

## Validation and companion skills

Select checks around the changed contract: rule outcomes; denied commands;
duplicate/stale messages; snapshot-plus-delta equivalence; secret-differential
projections; reveal/revoke; reconnect; fresh-process recovery at a pending choice;
commit/ack crash boundaries; replay stability; independent games and owner failover.
Use real commands from the implemented package, not illustrative plan commands.

Use `swubase-card-implementator` for card mechanics; the existing deck/catalog,
auth, backend, WebSocket, frontend, database-migration, development-data and
worktree skills only when their boundaries are crossed. Apply
`swubase-validation` and `swubase-change-review` to source/tooling changes.
