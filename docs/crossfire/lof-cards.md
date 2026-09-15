# Legends of the Force cards

The tracked official catalog contains 267 canonical identities with a LOF
printing. The initial inventory had 103 implemented cards and 164 missing cards.
The registry in `play/cards/registry.ts` remains the runtime source of truth;
reprints retain their canonical implementation in the original set directory.

The first batch adds 54 definitions, bringing LOF coverage to 157/267 and the
complete registry to 1,217 cards. Official text, uniqueness and clarifications
are pinned in `play/testing/fixtures/lof-foundations.json`. The rules baseline
remains the supplied v8.0 comprehensive rules, including Ambush's exhausted
attack without a ready instruction.

Conditional abilities evaluate the current board, controller and runtime role.
Padawan Starfighter counts a controlled Force upgrade even on an enemy host.
Jedi Vector counts its Jedi and Lightsaber prerequisites separately. Force-token
grants disappear when the token is used; granted abilities and auras respond to
ability loss. Supremacy excludes itself and non-Vehicles. Upgrade restrictions
are checked when attaching, while Heirloom's Force prerequisite is continuous.

Guardian of the Whills discounts the first upgrade played on its exact host
incarnation each round. Round play history now records the attachment host,
just as phase play history already did. An upgrade on a different Guardian does
not consume the first one's discount, and token creation is not a play. Recovery
preserves these host snapshots and rejects invalid references.

`lof-foundations.test.ts` checks combat outcomes, prerequisites, ability loss,
attachment eligibility and payment. `lof-continuations.ts` adds the distinct-host
history case to the shared fresh-process recovery workload.

First batch: engine `crossfire-0.113.0`, state `98`, cards
`crossfire-core-112`, browser protocol `35`. Only the newest committed executable
is archived during unreleased development.

## Force effects, nested plays and searches

The second batch adds 84 definitions, bringing LOF coverage to 241/267 and the
complete registry to 1,301 cards. Its text and official clarifications are
pinned in `lof-effects.json`. `lof-effects.test.ts` checks every distinct card
behavior through production engine choices, including optional branches,
replacement damage, defeat and attack timing, ownership and private searches.

Searches now support an `afterEach` continuation for every selected exact card.
Sifo-Dyas discards all selected Clones, then grants an independent free-play
permission to each for this phase. Search constraints and unselected random
bottom placement retain the existing shared contract. No permission is granted
to an unselected card or a later incarnation.

Baylan preserves the returned card's owner as its next play chooser. Watto's
opponent chooses the benefit, while the original ability controller receives it.
Heavy Blaster Cannon deals three separate damage instances; one Shield prevents
only one. The Father's trigger waits until the original Force ability has
finished, and replacing his chosen self-damage still satisfies “if you do.”
Dooku and Go into Hiding follow v8's Sentinel exception to attack protection.

Seven more shared checkpoints cover searched permissions and their random
remainder, owner-controlled replay, sequential damage, Force recovery, opponent
choices and granted attack abilities. The current batch uses engine
`crossfire-0.114.0`, state `99`, cards `crossfire-core-113`, browser protocol `35`.

## Attributes, protection and grouped targets

The third batch adds 19 definitions (260/267 LOF; 1,320 total). Its official
text is pinned in `lof-attributes.json`. Shared primitives distinguish direct
protection by another card from abilities granted to a protected unit. Mythosaur
continues to protect an upgraded unit that loses abilities; losing Mythosaur's
abilities removes that protection. Kylo's Lightsaber instead grants a removable
ability to its Force host. Protection covers individual, grouped and tax-based
exhaustion without blocking attack exhaustion or costs.

Trait changes retain exact incarnations and expire with their effects. Nameless
Terror prevents Force from being regained during that phase; Tusken Tracker
removes only Hidden from units present at resolution. Jedi Trials' direct
conditional trait survives host ability loss. Mythosaur includes all leader
roles. Marchion multiplies the final Raid sum; Oppo queries other units' keywords
with a dependency guard so multiple copies cannot establish their own keywords.

Mind Trick and Qui-Gon's Lightsaber use authoritative combined power/cost
budgets, also labelled in the browser prompt. Psychometry binds the exact chosen
discard, excluding only the played event itself. Curious Flock offers affordable
payments including available alternative resource payments. Malakili filters
both the friendly Creature source and friendly unit recipient. Size Matters Not
uses the existing ordered printed-stat overrides before ordinary modifiers.

Outcome tests cover these interactions; three additional fresh-process cases
cover grouped power, chosen payment amounts and trait-bound private search.
Current pins: engine `crossfire-0.115.0`, state `100`, cards
`crossfire-core-114`, browser protocol `36`.

## Complete LOF coverage

All **267 canonical LOF cards** are implemented, including the 164 that were
missing at the initial inventory. The registry now contains **1,327** definitions.
The final seven cards and their official clarifications are pinned in
`lof-finale.json`; the catalog test guards the complete LOF inventory.

Following the Path reveals selected Force units, privately orders them above the
uninspected deck, and randomizes only the unselected search remainder. Luminous
Beings randomizes the selected discard cards on the bottom, then uses the actual
returned count to select distinct units. Neither operation is a draw.
As I Have Foreseen keeps the inspected exact reference through optional Force
payment; the discount does not waive the remaining cost. A Precarious Predicament
lets the opposing unit controller choose, then permits the specified free play
from hand or resources without a replacement resource.

One-use phase triggers retain their source role, committed scheduling ability
identity and context. They enter the ordinary trigger-ordering system when the
specified event happens and expire at the phase boundary. Premonition responds
only to its controller's next initiative claim. Aethersprite captures the next
explicit When Played ability, including its original ability origin and bindings;
Shielded is not an explicit When Played ability. The ship need not remain in play.
All matching permissions are consumed before repetitions can trigger further work.
Checkpoints reject unknown scheduling identities, changed owners and stale expiry.

Rey's draw trigger distinguishes a private reveal choice from the required
announcement when other triggers are waiting. Keeping the card hidden does not
publish its identity through mode logs. A reveal requires the original drawn
hand reference; a card that leaves and returns cannot satisfy it. The Aggression
leader/base prerequisite is checked when resolving the ability. Both damage
targets are selected before the unit and base receive damage in the same event.

Eleven final shared checkpoints cover private inspection, Force payment, search
randomness and ordering, discard-bottom randomness and counts, initiative,
repetition after source departure, and Rey's reveal and damage targets. Browser
gallery examples include power budgets, top-deck ordering, Aethersprite, Rey,
private inspection and Luminous Beings.

Final pins: engine `crossfire-0.116.0`, state `101`, cards
`crossfire-core-115`, browser protocol `36`. Only this newest committed engine
is retained after final validation and archival.
