# SOR, SHD and TWI implementation

The registry contains all canonical identities with a Spark of Rebellion,
Shadows of the Galaxy, or Twilight of the Republic printing in the tracked
catalog. The completion adds 506 definitions after the earlier 90-card foundation
batch. Identical reprints reuse their original definition; the full registry now
contains 2,473 definitions.

| Set | Implemented identities | Total identities | Remaining |
| --- | ---: | ---: | ---: |
| Spark of Rebellion | 254 | 254 | 0 |
| Shadows of the Galaxy | 264 | 264 | 0 |
| Twilight of the Republic | 259 | 259 | 0 |

Counts include leaders, bases and reprints, so their sum is not a count of unique
new implementations. The catalog test checks every identity with a printing in
each set. Registration is separate from rules conformance; it does not establish
coverage of every possible interaction or add competitive format legality.

Official text, keywords, uniqueness and available clarifications are pinned in
[early-set-completion.json](../../play/testing/fixtures/early-set-completion.json).
The earlier batch retains its [foundation fixture](../../play/testing/fixtures/early-set-foundations.json).
Rules use the engine's pinned Comprehensive Rules v8 baseline.

## Entry, combat and choices

Clone uses a serialized `unit-entry` replacement before entering play. It retains
its physical `cardId`, while `copiedCardId` supplies the copied printed identity,
stats and abilities. It gains Clone and loses uniqueness without inheriting the
chosen unit's damage, upgrades or temporary modifiers. Departure snapshots retain
copied attributes for last known information; the physical card loses them when
it leaves play. Rescue offers a new entry choice without playing the unit.
Simultaneously rescued Clones choose before any of them enters. The browser shows
the copied face with a note identifying the Clone exception.

Darth Maul, Revenge At Last records an optional second defender on one attack.
Both defenders must be legal, including Sentinel restrictions. On Attack occurs
once; both On Defense windows are collected. Damage to both defenders and their
counterattacks share a damage event, with separate replacement choices. First/last
damage instructions retain surviving participants and recalculate their power.
Overwhelm combines eligible excess before base damage limits; Wipe Them Out can
route that combined excess to a third unit. See the
[official Maul clarification](https://starwarsunlimited.com/cards?cid=9955988380&expansion=18)
and [combat guide](combat-order.md).

Other shared capabilities include captured-card inspection and play, returnable
resource control, leader ability suppression that preserves Epic Actions,
additional and replacement play costs, forced next attacks, incremental reveals,
and simultaneous damage chosen from a group. Count Dooku snapshots exploited
units' power before selecting damage recipients. Poe selects all modes and
recipients before the combined effects resolve. Private hand and resource choices
remain separate from public projections. Smoke and Cinders records both hand
choices before discarding either hand. Clear the Field snapshots all affected
units and returns them before resolving prisoner rescues.

Bravado uses defeat responsibility under §1.18, including each combat damage
source, direct defeat instructions, remaining-HP changes, uniqueness and modifier
expiry, including Huyang’s bonus ending when he leaves play. Bounty damage uses its resolving player when the former unit has left
play; damage dealt by a unit still in play retains that unit’s controller. A
new unit defeated by Snoke’s continuous HP reduction is credited to Snoke’s
controller. Damage that was nonlethal when applied does not claim a later defeat
caused by an expiring HP bonus (§1.18.1c). Rey and Kylo's partner-name exceptions include an undeployed leader:
§8.23.2 matches the named card without a type or subtitle restriction. Zorii's
delayed discard carries its ability origin into regroup even if she leaves play.

Bamboozle can replace its ordinary costs with a Cunning-card discard. Saw's event
cost and First Light's printed Smuggle cost resolve damage before entry or event
resolution, including replacement choices and lethal payment. The play-payment
continuation retains the original transaction and its rollback state.

## Validation and releases

The `early-set-*.test.ts` scenarios cover card effects, legal choices, timing,
optional branches, combat, source incarnations and hidden-information
differentials. Representative entry, multi-defender combat, Exploit damage,
replacement payments and incremental reveals also appear in the shared recovery
workload. Focused scenarios compare fresh-process continuations.

Runtime and card release `1.5.0` introduce the required shared capabilities and
use 1.5 as the minimum accepted card-bundle contract. Contracts 1.0–1.4 are
retired; see [card releases](card-releases.md) for the effect on stored games.
Optional state additions continue to use state
format 109 and the existing browser choice protocol. Historical replay recordings
must remain unchanged. The [completion manifest](../../play/cards/early-set-completion.json)
and [foundation manifest](../../play/cards/early-set-additions.json) exclude these
additions from the frozen development catalog. The explicit registry remains the
runtime source of truth.

Run `bun run play:check`, `bun run play:coverage`, `bun run play:demo`, and
`bun run play:cards:export`. Archive and verify the committed runtime with
`bun run play:archive` and `bun run play:archive:verify`.
