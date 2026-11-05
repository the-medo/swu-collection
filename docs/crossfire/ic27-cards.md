# Icons 2027 cards

Crossfire implements all 151 canonical identities in the
[SWUDB IC27 search](https://swudb.com/search/set:IC27?sortorder=preview&sortdir=desc)
retrieved November 4, 2026. The [printing inventory](../../play/testing/fixtures/ic27-printings.json)
pins the complete list, including token cards and the currently revealed Prestige
printing of Cassian Andor, Blending In (587). Coverage applies to this snapshot;
future reveals still require implementation.

The original [SWUBASE standard catalog](https://swubase.com/cards/sets/ic27?csCategory=all&csVariant=standard)
provided 83 identities: seven leaders, 71 units and five events, obtained from
its public merged provider (`POST /api/cards`). SWUDB adds four newly revealed
units: Clone Commander Cody, Loyal to the Republic; Jyn Erso, Her Father's
Revenge; K-2SO, Evacuate The Vault Door; and Cassian Andor, Blending In.
Their identity and printed text join the [pinned catalog](../../play/cards/ic27/catalog.json).
The four additions use SWUDB's public printing details; the original 83 use 82
active SWUBASE previews and official Jar Jar Binks data. Official website catalog
ingestion remains a separate workflow.

The remaining 64 identities are reprints. Forty-two already had implementations;
the [22 additions](../../play/cards/ic27/reprint-additions.json) retain their
canonical IDs and original SOR, SHD or TWI definition files. Their printed text
and stats come from the repository's official card catalog. Reprinted artwork
does not introduce duplicate gameplay definitions. The original development
catalog remains frozen for historical replay.

Kanan Jarrus, Sometimes I Hate Being Right has no printed ability; the empty
text was checked against his
[card image](https://images.swubase.com/cards/preview/kanan-jarrus--sometimes-i-hate-being-right-preview-standard-front-1793827646955.webp).

The complete snapshot is included in card release **1.5.0**, requiring engine
**1.5.0**. State format 109 and browser protocol 41 remain compatible. The current
1.5 card contract includes printed-cost equality, own-base HP conditions, private
optional-play choices, and simultaneous unit/base damage. Contracts 1.0–1.4
have been retired. Publishing and activation follow
[card releases](card-releases.md); exporting a local bundle does not activate it.

## Reprints and additional previews

- **C-3PO, Protocol Droid:** publicly chooses a number before privately inspecting
  the top card. Only a matching printed cost may be revealed and drawn; declining
  a match and inspecting a mismatch have identical opponent/spectator views.
- **R2-D2, Ignoring Protocol:** privately leaves or bottoms the exact top card on
  play and attack, without drawing or shuffling.
- **You're My Only Hope:** plays the inspected top card with a five-resource
  discount, or offers free play when the base has at most five remaining HP.
  Aspect penalties apply to discounted play; free play ignores resource costs.
  Playable and unplayable hidden cards retain the same optional choice window,
  so declining does not disclose affordability. The HP condition requires no
  redundant base selection.
- **Frozen in Carbonite:** exhausts a non-leader host and directly prevents all
  readying while attached, including when the host loses its own abilities.
- **Shoot First / Breaking In / Infiltrator's Skill:** use shared attack-scoped
  combat ordering, power bonuses and Saboteur; the upgrade's grant persists.
- **I Am Your Father:** the target's controller chooses damage or says no to let
  the event controller draw three; preventing the chosen damage does not draw.
- **Lethal Crackdown:** defeats a non-leader and damages the event controller's base
  using the target's power before departure and attachment cleanup.
- **Clone Commander Cody:** observes other friendly Republic units entering,
  including created tokens, and gives each an Experience token.
- **Jyn Erso:** readies up to three units with combined printed cost at most seven
  and grants each Saboteur for the phase. A readying restriction does not stop
  the separate ability grant; enemy units may be chosen.
- **K-2SO:** assigns five damage to every enemy unit and base in one simultaneous
  batch. Shield replacement decisions precede all damage, and base-defeat
  maintenance follows the complete batch.

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
printed abilities and both leader faces. [Reprint scenarios](../../play/testing/ic27-reprints.test.ts)
cover the 22 reprints and four additional previews, including private-view
comparisons, exact-copy choices, empty decks and fresh-process continuation. [Mechanic scenarios](../../play/testing/ic27-mechanics.test.ts)
cover replacement payment, duplicate copies, attachments, hidden-hand view
comparison, damage order, regroup timing and fresh-process continuation.
Catalog conformance also checks identities and printed stats for keyword-only
and vanilla cards.

Run `bun run play:check`, `bun run play:demo`, `bun run play:coverage` and
`bun run play:cards:export`. Preserve the fixed historical replay fixtures;
IC27 base-value, unit-healing, regroup-ready history and completed-attacker bindings
are gated on engine 1.4.0. Main's engine 1.3.0 introduced hand reveal and retains
its original rules behavior. The fixed 1.3.0 replay fixture was captured from
`eb6e406ba2aa2d1d4de4e11f923d045fa8b74bf3` against the retained 1.0 card catalog.
