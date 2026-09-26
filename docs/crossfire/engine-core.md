# Crossfire engine core

For the current process, database, recovery and deployment overview, start with
[architecture and operations](architecture-and-operations.md).

Crossfire has an authoritative, two-player **core-practice** engine. It completes
games using supported cards, exposes separate player/spectator views, and
reproduces accepted progress from private input recordings and checkpoints.
The engine stays independent of application concerns; the surrounding feature
provides [persistent hosting](storage.md), [WebSocket transport](transport.md),
and the [integrated browser client](frontend.md).

Run from the repository root after the normal dependency installation:

```bash
bun run play:check
bun run play:demo
```

The check runs the package typecheck, engine/browser import checks, and Bun
conformance tests. The demo chooses only options offered by player projections,
plays until base defeat, and checks each accepted position against replay. It
prints a public result summary. It is a smoke harness, not an AI opponent.
`play/` uses the repository's installed dependencies and lockfile; it has its
own TypeScript check and is excluded from root TypeScript file discovery.

## Supported cards and rules

There are 1,768 explicit definitions under [play/cards](../../play/cards).
All 275 HMW, 267 ASH, 267 LAW, 266 SEC, 267 LOF, 266 JTL and 51 IBH canonical identities are implemented, including reprints.
The [Homeworlds guide](hmw-cards.md) covers the official-set completion and preview ID changes.
The [IBH implementation guide](ibh-cards.md) covers the 44 final definitions.
The [LOF implementation guide](lof-cards.md) describes the 164 added definitions and their shared mechanics.
The [JTL implementation guide](jtl-cards.md) tracks Jump to Lightspeed coverage.
The [SEC implementation guide](sec-cards.md) describes the 157 added definitions.
The [ASH implementation guide](ash-cards.md) covers the 120 new definitions and
the shared mechanics added for them.
The frozen [registry and coverage list](../../play/cards/registry.ts) are the
source of truth. The recent-meta foundation batch adds 22 vanilla units/bases
and 14 cards using established keywords or triggers; their text is pinned in
[the fixture](../../play/testing/fixtures/meta-foundations.json). See
[the expansion plan](../../.ai/planning/feature-crossfire/card-expansion.md) for
the fixed tournament targets and remaining source-data gaps. All 200 ranked
identities and 100 additional winner-deck identities in that snapshot are
implemented, including sideboards. This supports all 42 complete available winner
lists. The expanded Top 8 fixture has all 551/551 target identities implemented,
supporting all 342 complete available lists, including sideboard identities. Two
Top 8 records lack complete lists; 19 other events lack imported final results. Its first 49-card batch uses existing
keywords, Piloting, Plot, Force attack/regroup triggers and Epic aspect-penalty
exceptions. It does not imply coverage of every official card.
The [leader/base expansion](../../.ai/planning/feature-crossfire/leaders-and-bases.md)
now covers every Leader and Base in the tracked official catalog: 172 leaders and
103 bases. Every canonical identity has a dedicated implementation, including
separate leader/unit/Pilot faces, repeatable deployment, unusual costs, passive
abilities and multiple-use limits. The final batch adds Dooku and
[Exploit payment](exploit.md), including interrupted payment and rollback.
Twin Suns card behavior is supported within two-player practice; this does not
add multiplayer hosting or make every main-deck card available.
[Base abilities](base-abilities.md) covers limited uses, chosen exhaustion payments,
combat-damage observers, private resource returns and exact milled-card groups.
Catalog conformance checks verify IDs, printed statistics, aspects, and the
supported text against SWUBASE's official catalog. Art variants share behavior.
[Tokens and conditional abilities](tokens-and-conditional-abilities.md) documents
token creation, weighted choices, Greef's subject triggers and phase history.
[Board values and turn events](board-values-and-turn-events.md) covers numeric
effects, healing, simultaneous modifiers and initiative/attack observers.
[Force and indirect damage](force-and-indirect-damage.md) covers Force costs,
conditional grants and recoverable damage allocation.
[Movement and granted attacks](movement-and-granted-attacks.md) covers grouped
upgrade removal, arena changes, resource choices and attack declaration grants.
[Hidden-zone choices](hidden-zone-choices.md) covers private hand inspection,
discard recovery, deck placement, milling and divided damage.
[Continuous effects and control](continuous-effects-and-control.md) covers
dependent auras, control transfers, Hidden and additional Pilot slots.
[Modified play and costs](play-costs-and-searched-cards.md) covers discard/search
play, phase modifiers, round reductions and card-specific base setup.
[Plot](plot.md) covers private resource declarations and ordered deployment triggers.
[Disclose and restrictions](disclose-and-restrictions.md) covers aspect reveals, defending triggers,
keyword loss and effects tied to a source remaining in play.
[Credit payments](credits.md) covers public resource-zone tokens and optional, recoverable
replacement of resource payments.
[Attack outcomes](attack-outcomes.md) covers combat history, surviving damage,
round-limited triggers and end-of-attack resolution.
[Search continuations and phase damage](search-continuations.md) covers drawing before
optional free play, returned upgrades and exact-copy base-damage history.
[Damage prevention and protection](prevention-and-protection.md) covers optional replacement
costs, shared Shields, unpreventable damage and direct enemy-ability immunity.
[Aspect abilities and leader choices](aspect-abilities.md) covers distinct aspect counts,
resource choice ownership, colored penalty exceptions and measured reductions.
[Attachment attributes and departures](attachment-attributes.md) covers runtime leader
status, granted traits/aspects, token reassignment and upgrade defeat observers.
[Pilot leaders](pilot-leaders.md) covers dual deployment choices, role-specific
abilities, conditional grants and non-combat damage observation.

The core implements setup, server shuffling, first-player choice, one mulligan,
initial resourcing, alternating actions, aspect penalties, unit entry,
same-arena attacks and attacks on bases, simultaneous combat, defeat, passing,
initiative, regroup, empty-deck damage, and concession. Sabine implements both
faces: her exhaust action, resource-count deployment, On Attack damage before
combat, and persistent Epic Action use after defeat. Sabine declares actions on
her leader face and the attack trigger on her unit face. Deployment is an effect
of her limited action. Runtime instances and execution frames contain only
serializable data.

The rule baseline is the supplied v8.0 PDF, pinned by version and checksum in
[the rules notes](../../.ai/planning/feature-crossfire/rules-and-cards.md).
Test names identify the relevant official rules. This release does not claim
current competitive-format legality or complete SWU rules coverage.

Practice deck input requires a supported leader/base and 6–120 supported units, events or non-token upgrades.
It deliberately permits small decks and repeated copies for engine exercises;
Premier/Eternal/limited deck admission and SWUBASE deck access are later work.
Unknown cards and unsupported roles are rejected, including when used only as
resources. There is no silent blank-card fallback. Nested trigger ordering,
v8 Ambush, base healing, targeted damage, a defeated unit's optional return as a
ready resource, and unique-copy maintenance are supported for the registered
cards. Attachments, cumulative upgrade modifiers, Shield damage replacement, Shielded,
Sentinel, Saboteur and Overwhelm are also implemented. Other keywords, other replacement
effects and multiplayer remain unsupported.
Private top-deck searches support exact-copy selection, rule-mandated reveals
and server-randomized remainder order. Events resolve from discard and can initiate modified attacks with scoped power
bonuses. Sneak Attack provides discounted nested unit play, ready entry and
ordered delayed defeat at the start of regroup; see [events and attack duration](events-and-search.md).
Non-leader Piloting, printed traits, granted Sentinel and upgrade-only healing
are implemented; see [Piloting roles](piloting.md). Support, Raid, Restore and
borrowed attack abilities are in [Support resolution](support.md).
Composable choices, Grit, temporary modifiers, ability loss and conditional entry
are described in [choices and lasting effects](choices-and-lasting-effects.md).
See [attachment resolution](attachments.md) for the supported graph and choices.

## Engine and host contracts

Use the server-only [engine entrypoint](../../play/engine/index.ts):

```ts
import { createGame, advance } from '@swubase/crossfire/engine';

const state = createGame({
  gameId: 'practice-one',
  players: [
    {
      id: 'alice',
      base: 'command-center',
      leader: 'sabine-wren--galvanized-revolutionary',
      deck: [{ cardId: 'battlefield-marine', quantity: 12 }],
    },
    {
      id: 'bob',
      base: 'command-center',
      leader: 'sabine-wren--galvanized-revolutionary',
      deck: [{ cardId: 'battlefield-marine', quantity: 12 }],
    },
  ],
});
```

Those package imports resolve within `play/`. Consumers elsewhere in the
repository must deliberately integrate the private package; it is not yet a
root workspace dependency. Root scripts invoke its files directly.

`createGame` initially suspends for a server random result. `advance(state,
input)` validates an input's game/revision and decision ownership, returns
`{ state, facts }`, and leaves the previous state intact. Commands select legal
options; they cannot assign state. A concession can come from either participant
at any suspension. Internal execution proceeds until a player decision, random
request, or game result. `execution.frames` records the remaining work. `pendingTriggers` holds abilities
collected within the current action/ability until its resolution boundary.
A trigger batch records source snapshots, ability IDs and controlling players.
`departedUnits` retains effective power/HP, upgrade status and ability origins
for each departed unit incarnation,
so a power-based ability cannot accidentally read a later copy's statistics.
The active player chooses whose simultaneous batch resolves first; each player
orders their own abilities. Nested batches finish before the older batch resumes.
Defeat observers are captured before any simultaneous removals. Effects refer to
the original source and controller even after that physical card leaves play.
These are the mechanisms exercised by the current cards, not full timing-window
coverage for every possible ability.

Current version pins are state 109, runtime `1.2.0`, an immutable card
version/checksum, and browser protocol 39. [Card releases](card-releases.md)
describes dynamic installation and backwards-compatible minor versions. The
pre-refactor engine/card tuple remains supported against its exact baseline data.
Checkpoint decoding and advancement verify supported versions and preserve
historical state hashes and facts. [Leader abilities](leader-abilities.md)
explains explicit faces, costs and deployment conditions.

The [LocalGame host](../../play/host/session.ts) supplies cryptographic uniform
integers for Fisher–Yates shuffling and first-player selection. Tests can inject
a bounded integer source. Player submission rejects random inputs. A failed
command or random provider leaves the accepted state and recording unchanged.
The host returns copies from its state/recording getters to isolate games.

`LocalGame` records validated inputs, including private random outcomes. `replay`
loads the recorded card versions on a compatible engine and reconstructs the
same state and facts. `LocalGame` is the in-memory host; the separate
[durable host](storage.md) adds database commits and crash-safe receipts, while
[history services](history.md) add replay entitlement and seeking. Generated
executable retention remains a separate server-only smoke check.

## Views and information boundaries

The [Projector](../../play/projection/projector.ts) is server-only. The host
constructs it with an authorized player or spectator role; a client must never
choose that role. A projector uses a private random HMAC key to create scoped
card/decision/option handles. It returns only browser-safe
[view contracts](../../play/view/types.ts), exposed through the `./view` export.
Browser builds reject the engine, host, and projection package exports.

The optional `{ training: true }` projector mode is limited to immutable,
forward-only in-process training snapshots. It caches views/identifiers and
returns appended visible events; browser and replay consumers must keep the
default complete-history mode. See the [training guide](ai-full-game-training.md).

Players see their own hand and resource faces. Other hand faces follow separate
player/spectator policies; hand disclosure never grants resource/deck inspection.
The spectator display preference can hide authorized hands. Decks expose counts.
Only the chooser receives a decision. Ability choices include an ability ID
and an event-time source label; a hover handle is included only when the same
incarnation is currently visible. Target choices and uniqueness choices identify
the physical copy through viewer-scoped handles. Policies are trusted constructor inputs in
this slice; consent, policy-change commands, admission, and revocation belong to
the future service. Create a new projector for a new authorization context.

Views contain a projector-local revision and epoch, not the authoritative
revision or random requests. `Projector.command(state, viewCommand)` resolves
opaque options and selection handles back to the assigned player's engine input.
It rejects stale views, wrong games, spectators, unknown handles, and extra keys.
These snapshots are the boundary for later view-delta transport; no socket or
delta protocol is implemented here.

Structured facts retain exact physical-instance/incarnation references. Public
events and a player's own private events are projected separately. A visible
event can highlight the exact current copy; moving it into a hidden zone changes
its handle, and re-entering play starts a new incarnation. Historical labels
remain available only to viewers entitled to that event. Private recordings and
checkpoints must never be returned to a browser.

## Scenarios and checkpoints

The [scenario builder](../../play/testing/scenario.ts) creates a settled action
phase position with canonical catalog IDs, aliases for duplicate copies,
explicit deck order, hand/resources/arenas, damage, exhaustion, initiative, and
leader deployment and explicit `abilityUses` history, plus attached upgrades with aliases and owners.
`delayed` entries reference a discarded source event and target unit alias, with
an optional due round. Inputs are strict data;
arbitrary fields, duplicate aliases, unsupported cards, invalid arenas, and unresolved defeats are rejected.
The current cards retain Epic use and scheduled regroup effects;
new mechanics must extend the scenario/history contract deliberately.

```ts
import { scenario } from './testing/scenario.ts';

const { state, refs } = scenario({
  gameId: 'duplicate-copy-case',
  activePlayer: 'alice',
  initiative: { holder: 'alice' },
  players: [
    {
      id: 'alice',
      base: { card: 'command-center' },
      leader: { card: 'sabine-wren--galvanized-revolutionary' },
      ground: [
        { card: 'battlefield-marine', ref: 'marineA' },
        { card: 'battlefield-marine', ref: 'marineB', exhausted: true },
      ],
    },
    {
      id: 'bob',
      base: { card: 'command-center', damage: 5 },
      leader: { card: 'sabine-wren--galvanized-revolutionary' },
    },
  ],
});
```

Run that import from a file under `play/`. Aliases resolve to internal physical
instance IDs, not browser handles. Scenario creation does not replace a live
game or bypass command validation. Resource payment uses the first sufficient
ready resources in deterministic order; the supported cards have no effects
that distinguish which blank resources paid. Explicit resource rearrangement
and selection need to accompany mechanics where that distinction matters.

[encodeState/decodeState](../../play/engine/checkpoint.ts) preserve the pinned
state and current suspension. Decoding validates structure, zone membership,
card roles, random bounds, decision options, and selection sets. It is a trusted
server checkpoint codec, not authorization to accept user-uploaded live states.
Fresh-process tests cover setup, a nested opponent trigger with older work still
pending, uniqueness selection, and a defeated source's resource-return choice.
The new-card recording test replays every accepted decision and checks game
isolation. Milestone 1 still needs broader hidden-zone/replacement coverage
and expanded measurements; executable retention and an initial
performance baseline are now recorded in the bundle guide.
Persistence/admission follows in milestone 2 and transport in milestone 3.

[Card priorities](card-priorities.md) records the local tournament sample and
explains how popularity and mechanic dependencies choose the next cards.

The [durable storage adapter](storage.md) now stores checkpoints and command
history in PostgreSQL and verifies recovery through pinned executables. It is a
private host building block. `DurableGame` adds a bounded command queue, commit-
before-return behavior and paused recovery on storage failure. `LocalGame` remains
an in-process harness; no network/admission service is exposed by this step.
