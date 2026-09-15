# Crossfire base abilities

Bases use the same versioned action, effect, observer and continuous-ability contracts as other cards. Each base has its own canonical definition. The registry controls admission; the [leader/base expansion](../../.ai/planning/feature-crossfire/leaders-and-bases.md) tracks the remaining catalog identities.

## Usage and payment

An action can have a game limit `{ per: 'game', max: 3 }`, as on Mystic Monastery. Its own `abilityUses` counter survives round changes. Using a limited action changes the game state even when the Force is already with that player (supplied v8 §7.2.5). This limit is displayed in public action metadata and the browser label. It does not turn the ability into an Epic Action.

Tomb of Eilram introduces a chosen `exhaust-friendly-unit` cost. Only ready friendly runtime units can pay it, including a deployed leader. Selection precedes payment, and the chosen exact unit survives a Credit-payment continuation when another cost requires resources. An individual unit cannot pay both its own exhaustion and a second exhaustion cost. Fennec Shand, Ready for War uses the same payment contract on separate faces and then plays a unit ready. Her front also exhausts herself; the deployed action may choose herself as its friendly-unit payment.

## Combat observation

Temple of Destruction observes actual combat damage from a friendly unit to an enemy base. Its three-damage threshold applies to that damage event, including Overwhelm excess. It does not accumulate smaller attacks and does not count indirect or other ability damage. The base supplies the observer; it does not grant an ability to the damaging unit. Capture the observer and damage context before resolving resulting triggers.

## Private resources and exact discarded groups

Citadel Research Center pays one resource before offering private resource selection. The chosen resource returns to its owner's hand, then the ability controller resources the top deck card exhausted. Resource control and ownership remain separate. The public return event identifies the base and quantity; only the selecting controller and returned card's owner receive its face. The replacement resource is private under the ordinary resource rules.

Shipbreaking Yard discards the top three cards, or the remaining deck when fewer are available, without drawing or fatigue. The optional return uses `CardFilter.inGroup` against the exact post-discard references, including incarnation and visibility. An older discard copy with the same title is not eligible. Choosing none leaves all milled cards in discard; a chosen card returns above the untouched deck remainder.

## Validation

`leader-base-choices.test.ts` covers payments, limited usage, combat thresholds, source/controller differences, private resource views and exact-copy choices. The shared recovery workload includes the final Monastery use, Tomb's exhaustion selection, Fennec's combined Credit payment, Citadel's resource selection and Shipbreaking's milled-card selection. Engine 0.75/card bundle 75 uses state 69 and browser protocol 26. The browser-safe public contract does not import card definitions or private engine state.

The opt-in `CROSSFIRE_BROWSER_SCENARIO=base-choices` acceptance game spends all three Monastery uses, reloads between uses and then finishes a game with two authenticated players and a spectator. The action label and limit are read through rendered controls.

## Leader counts, allocations and whole-deck searches

Dooku's Palace evaluates its unit-play discount from the current friendly runtime leader units. A deployed Pilot's host and an ordinary unit made into a leader by The Darksaber count; an undeployed leader and opposing leaders do not. Choice admission, Credit payment and execution evaluate the same numeric discount. Kylo Ren, Rash and Deadly separately uses a live hand-zone count for his deployed power penalty.

Executioner's Arena captures the leader count and allocates optional two-damage packets. The private decision and public view carry `allocation.quantum: 2`; the engine, browser connection and numeric controls reject odd amounts assigned to any card. Repeated packets to one unit combine into one damage instance, with all chosen units damaged simultaneously (supplied v8 §8.34.1a and the base's official clarification). A single Shield prevents that combined instance. First Battle Memorial uses the same simultaneous recipient selection for mandatory Experience tokens. Token creation runs through the existing replacement continuation, retaining recipient counts even when a replacement defeats a counted leader.

Great Pit of Carkoon pays an exact unit discard before searching its entire deck by printed title. The title filter differs from naming a title through a player choice. Only the searching player sees the inspection; the chosen card is revealed and drawn, and the searched remainder is shuffled with server-provided randomness. A hidden search can fail to find a card. The Sarlacc of Carkoon has its own implementation: its On Attack returns an exact own discarded unit to the deck bottom, then uses that card's printed power for enemy ground damage before combat. Its retained identity remains available to the ability after the zone change, without exposing the remaining deck.

`leader-base-allocations.test.ts` covers these outcomes, invalid allocations, exact copies, opposing and Pilot leaders, token replacements, private projections and fresh-process recovery. Six additional shared continuation cases bring the workload to 148. Engine 0.76/card bundle 76 uses state 70 and browser protocol 27. `CROSSFIRE_BROWSER_SCENARIO=base-allocation` exercises a pending packet allocation after reload, including rejection of one damage and acceptance of two.

## Ready resources with later repayment

Sundari Palace first captures how many friendly leader units are available, then privately selects up to that many hand cards. The entire chosen group becomes ready resources before subsequent abilities resolve. `resource-cards` records the actual number moved; only a positive amount creates a `resources-at-regroup` schedule. Choosing none still spends the Epic Action.

The repayment stores a public amount, original ability controller and source snapshot. It does not retain specific resource targets. At regroup start the controller chooses that many current friendly resources, or all available resources when fewer remain. Ready and exhausted resources are eligible; Credit tokens are not resources. The selected resources move to their respective owners' discard piles together. Repayment resolves before normal regroup triggers and drawing.

Han Solo, Audacious Smuggler uses `resources-at-action` instead. His front resources a hand card ready; his unit attack resources the top deck card ready. Each use separately schedules one resource defeat for the next action phase, including when no card could be resourced. This independent instruction survives Han being defeated, deployed or changing zones. Regroup does not collect an action-phase debt. Both variants use existing delayed-effect ordering and validate the captured source's scheduling ability; borrowed ability origins remain distinct from their holders.

`inspect-zone` now accepts numeric selection bounds, resolved before offering the private choice and stored as integer bounds in the inspection frame. `resource-top.ready` is explicit and defaults to exhausted entry for existing cards. Public scheduled entries carry the amount without exposing hand or resource identities. Engine 0.77/card bundle 77 uses state 71 and browser protocol 28. `leader-resource-repayment.test.ts` covers both timings, simultaneous groups, secrecy, separate uses, departed sources and rejected checkpoints. Three new shared cases bring the continuation workload to 151.
