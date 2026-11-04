# Icons 2027 cards

Crossfire implements the 83 canonical IC27 identities present in the
[standard IC27 catalog](https://swubase.com/cards/sets/ic27?csCategory=all&csVariant=standard)
on November 4, 2026: seven leaders, 71 units and five events. This is the
published preview snapshot, not a claim of coverage for future reveals.

The pinned [catalog](../../play/cards/ic27/catalog.json) records the identity,
printed stats, traits and text used by each explicit
[card definition](../../play/cards/ic27/). It was obtained from SWUBASE's public
merged card provider (`POST /api/cards`): 82 active previews and the official
Jar Jar Binks printing. Official catalog ingestion remains a separate workflow.
Kanan Jarrus, Sometimes I Hate Being Right has no printed ability; the empty
text was checked against his
[card image](https://images.swubase.com/cards/preview/kanan-jarrus--sometimes-i-hate-being-right-preview-standard-front-1793827646955.webp).

These cards require engine 1.3.0 and ship in card release 1.3.0. State format
109 and browser protocol 39 remain compatible. The 1.3 card data contract is
retained alongside earlier minor contracts. Publishing and activation follow
[card releases](card-releases.md); exporting the local bundle does not activate
it on the website.

## Shared mechanics

- **Asajj Ventress, Death From Above:** before a friendly non-leader ground
  attacker deals combat damage to a base, its controller can reveal an exact
  Asajj copy and pay five resources plus missing Cunning/Villainy penalties.
  Credits and ordinary ability-payment modifiers apply. The original attacker
  returns to its owner's hand with ordinary attachment cleanup; Asajj enters
  exhausted as the attacker and deals her own combat damage. This is neither
  playing a card nor declaring another attack. Original attack bonuses and
  borrowed abilities do not transfer. Only one replacement resolves for the
  damage event. Her leader’s after-attack ability checks the surviving replacement
  attacker. Both the replacement choice and payment resume from checkpoints.
- **Replacement privacy:** for a deck containing a hand replacement card, every
  qualifying attack offers the timing window regardless of that card's current
  zone or affordability. Other viewers cannot distinguish Asajj in hand from
  Asajj elsewhere in the same deck. The deck's use of this timing window is
  observable; it does not expose current hidden card identities. Decks without
  this capability retain their existing attack flow.
- **Count Dooku, Silver-Tongued:** each affected player chooses which exhausted
  unit to ready in each arena. Units readied by earlier regroup abilities count
  toward the same phase limit for the player resolving the ready effect, even
  when that player readies an opponent’s unit. Choices precede simultaneous normal readying;
  resources and undeployed leaders still ready normally. Extra regroup phases
  start fresh histories.
- **Greedo, Big Timer:** supports dealing combat damage second as attacker or
  defender, including conflicts with first-damage effects. A unit defeated by
  the first damage event cannot deal the second one.
- **Yoda, A Disturbing Puzzle:** combat-only prevention applies both to damage
  dealt to and by the chosen unit, including excess combat damage. Ability
  damage remains unaffected.
- **Jabba, Bounties Left and Right:** the current attacker receives the power
  bonus only while attacking the chosen defender during that phase.
- **General Grievous, Four-Armed Menace:** choices are tracked once per phase,
  per source incarnation and ability origin.
- **Luke and Holdo:** starting-hand and normal regroup-draw modifiers are
  distinct from effect-driven draws.
- **Sidious, Maz and The Ghost:** observe actual base healing, card resourcing
  and friendly-unit damage to an enemy base respectively.
- **Anakin and Kylo's TIE Silencer:** explicit discard-zone aspect waivers and
  paid, phase-limited permission after being discarded from hand.
- **The Inquisitor's TIE:** both players make private discard selections before
  the selected cards move together. Decision ownership remains separate from
  the original ability controller.

The rule baseline remains Comprehensive Rules v8.0, particularly sections 6.2,
6.3, 7.6, 7.7.5 and 8.5. The PDF used is
`SWH_Comp_Rules_v8_0_e26603c6e1.pdf`, SHA-256
`18dd5c92b051b3260c535d3ef225abc5654ba65ec74093bbe3a50536db37c8fb`.

## Verification

[Card scenarios](../../play/testing/ic27-cards.test.ts) exercise all nontrivial
printed abilities and both leader faces. [Mechanic scenarios](../../play/testing/ic27-mechanics.test.ts)
cover replacement payment, duplicate copies, attachments, hidden-hand view
comparison, damage order, regroup timing and fresh-process continuation.
Catalog conformance also checks identities and printed stats for keyword-only
and vanilla cards.

Run `bun run play:check`, `bun run play:demo`, `bun run play:coverage` and
`bun run play:cards:export`. Preserve the fixed historical replay fixtures;
new base-value and unit-healing behavior is gated on engine 1.3.0.
