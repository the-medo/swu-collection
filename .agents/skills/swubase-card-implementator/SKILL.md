---
name: swubase-card-implementator
description: Implement or fix individual SWU card behavior, keyword interactions, and card conformance scenarios for SWUBASE Crossfire. Use for game mechanics, not catalog ingestion or card display alone.
---

# SWUBASE Crossfire card implementator

## Locate the implementation contract

Read the [working core guide](../../../docs/crossfire/engine-core.md) and
[card/rules notes](../../../.ai/planning/feature-crossfire/rules-and-cards.md).
Inspect `play/cards/definition.ts`, `play/cards/registry.ts`, the relevant
`play/engine/` modules, and `play/testing/` before choosing APIs. Milestone 0
supports vanilla unit mechanics and Sabine's two faces. The first milestone 1
step expands coverage to fifteen definitions, nested trigger batches with
source snapshots, uniqueness, and v8 Ambush. Inspect `play/engine/triggers.ts`
and `play/testing/triggers.test.ts` for those contracts. Attachments, ordinary
upgrade play, modifiers, Shield replacement choices, Shielded and Sentinel are
implemented, followed by Latts Razzi's token choice and power-based damage
and event execution with attack-duration modifiers.
Power-based effects use the live source incarnation or its recorded departure
statistics; a later copy cannot overwrite an older source.
Read the [attachment guide](../../../docs/crossfire/attachments.md) and
[event/search guide](../../../docs/crossfire/events-and-search.md). Private
top-deck searches are implemented, with player-only inspection, filtered
selection, reveal and server-randomized bottom remainders. Other hidden-zone
mechanics, other keywords and other replacement effects still need engine work.
Sneak Attack implements discounted nested unit play, ready entry and ordered
regroup defeat. Its scheduled target is an exact incarnation; other delayed
conditions/effect kinds need explicit handlers. Non-leader Piloting is implemented;
read [Piloting roles](../../../docs/crossfire/piloting.md) before adding Pilots.
Printed identity and runtime role differ while attached, and only the active
role's abilities apply. [Support resolution](../../../docs/crossfire/support.md)
uses captured ability origins for borrowed triggers, lasting grants and last
known abilities. Do not look up a borrowed trigger on the holder's printed card.
The user requires an original SWUBASE engine and card implementations. Do not
mark an unsupported ability complete against a proposed API. Extend common
engine primitives when authorized and needed, with rule-based conformance cases.

Use one canonical-ID filename per card under `play/cards/<set>/`, register it
explicitly. Follow [card releases](../../../docs/crossfire/card-releases.md):
card-only additions/fixes increment the patch in `play/cards/release.json`, keeping
`requiredEngine` unchanged when no new capability is needed. Engine features need
a compatible minor release and deployment; breaking behavior needs a major or an
explicit historical compatibility path. Never replace an already published
version with different data.
`play/testing/scenario.ts` supplies exact-copy aliases for settled action-phase
fixtures. Run `bun run play:check`; use `bun run play:demo` when a change affects
complete-game progression. The catalog conformance test must cover new supported
definitions without treating text presence or a file count as rules coverage.

Load `swubase-online-play` for engine/state/visibility/replay changes and
`swubase-card-catalog` when resolving or modifying catalog identities. Use the
selection matrix for validation/review and other crossed domains.

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
while play admission still requires a complete registered implementation. Read
[combat order](../../../docs/crossfire/combat-order.md) for sequential combat
damage, attack-scoped effects and counting On Attack abilities separately from
keywords that share their timing window. Read
[player choices](../../../docs/crossfire/player-choices.md) when an ability asks
a different player to choose; preserve the distinction between decision ownership
and the original ability controller. Read
[regroup timing](../../../docs/crossfire/regroup.md) for captured phase-start
triggers, delayed-effect precedence and direct upgrade readying restrictions.

Read [capture and rescue](../../../docs/crossfire/capture.md) before implementing
captivity. Captured cards are public and out of play; guard links, upgrade links,
rescue entry and delayed incarnation checks have distinct contracts.

The [combat guide](../../../docs/crossfire/combat-order.md) also covers temporary
abilities granted by events: keep the event origin distinct from the attacking
unit. The [regroup guide](../../../docs/crossfire/regroup.md) covers global next
action-phase delays and atomic unit payment choices, including Credits. Read
[hidden-zone choices](../../../docs/crossfire/hidden-zone-choices.md) for private
resource inspection and playing another player's card: ownership, play control,
and the controller of a discarded event's effect must remain distinct.

## Establish what the card does

- Resolve its canonical `cardId`, printing aliases, faces and possible roles.
  `variantId` is artwork and `cardUid` is a catalog-source mapping, not game-instance
  identity. Use the appropriate official or merged provider deliberately.
- Inspect actual card text and available official clarifications against the
  game's pinned rules version. The initial research baseline is the supplied
  v8.0 PDF, identified by filename/checksum in the proposal. Do not assume it is
  always current or substitute remembered older keyword behavior.
- Identify costs versus effects, legal zones/targets, mandatory versus optional
  choices, timing windows, nested triggers, duration, replacement interactions,
  last known information and any hidden-information exception. Record unresolved
  ruling questions for verification against official material.
- Follow nearby working Crossfire implementations once they exist. Derive
  expected outcomes from card text and official rules; another engine's behavior
  is not the specification. Keep external project research outside committed
  feature files.

## Implement through Crossfire's engine

Every mechanically distinct card requires its own definition/implementation
file, including bases, leaders, tokens and vanilla/keyword-only cards. Identical
reprints and alternate art reuse behavior. Write original definitions against
the actual Crossfire registry and shared primitives. Do not copy or port another
project's card implementations or tests.

Use shared keyword/effect primitives and keep card-specific conditions in the
card file. Model runtime roles independently where a unit becomes an upgrade or
a leader changes faces. Changes to common primitives need coverage for other
cards using them. Card files must not own network/database calls, global random
state, raw client patches, or ad-hoc HTML log messages.

All choices and effects must resume after serialization: use the engine's
versioned handlers and serializable execution parameters. A closure captured
only in memory cannot be the sole continuation of an accepted choice. Preserve
exact physical instances, new-copy incarnations, effect expiry, and persistent
Epic Action usage according to the rules.

## Verify behavior and report coverage

Use the same engine/scenario builder as production. Test observable outcomes and
legal choices, including the card's relevant failure/optional branches. Include
duplicate copies when identity matters, and do not use card name equality as an
instance assertion. Cover hidden search/reveal projection, replacement/trigger
ordering, lost abilities and last known information where the ability needs
them; avoid irrelevant test boilerplate for a vanilla definition.

For changed continuations or randomness, resume in a fresh process at the affected
choice and compare subsequent behavior. For changed information visibility,
compare permitted views/logs/deltas for states that differ only in secrets. Never
make a hidden card's actual identity available merely to generate legal choices
or hover/animation effects for another viewer.

Update the implementation coverage manifest and supported roles/formats only
when the behavior passes its meaningful checks. Unknown or partial cards remain
explicitly unsupported at deck admission. Report the card identity, rule basis,
behavior covered, checks run and remaining limitations. Keep releases reproducible.
Run `bun run play:coverage` and `bun run play:check`,
including the fixed historical replay cases. Commit before publishing. Use
`bun run play:cards:export` to inspect the complete JSON bundle, then
`bun run play:cards:publish` when release credentials/authorization are available.
Publication only uploads; administrators activate through the release screen.
If credentials are missing, finish the export and report the missing setup.
Use `bun run play:cards:install <file>` for local worktree testing without R2.
For engine changes, regenerate the current minor's contract with
`bun run play:cards:schema`, retain older minor contracts, and verify unchanged
historical recordings. Use `bun run play:archive` after committing runtime changes
for the current executable smoke check; card-only updates do not need an archive
or deployment.
