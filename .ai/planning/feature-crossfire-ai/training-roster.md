# Crossfire AI: selected decks and strategy curriculum

Status: all six pinned decks are admitted and implemented in the full-game
league. Complete scripted and sampled games/replays cover all 36 ordered pairs.
Continuous training and per-batch reporting are implemented; strategy-specific
curriculum cases and playing-strength qualification remain pending. This does
not expand the separate tactical model's capabilities.

The user supplied these deck IDs and strategy notes on 2026-09-21. Exact inputs
are preserved in [selected-decks.json](selected-decks.json), a planning reference
used to produce the checked-in `play/ai/full-game/league-decks.json` snapshots.
The league trainer loads those snapshots and verifies their engine/deck contracts. The source lists were read through the
local public deck/detail APIs. No source deck was edited. Card quantities,
including main decks larger than 50 cards, are retained exactly.

## Verified roster

| Label                | Source deck ID                         | Leader / base                                                      | Main | Side |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------ | ---: | ---: |
| Greef Aggression     | `5d1f7e0b-9146-4a45-9a65-eb29b0fe0ae6` | Greef Karga, Gracious Magistrate / Naval Intelligence HQ           |   50 |   10 |
| Vader Cunning        | `53b60b20-12c8-4f79-9306-364b19e29bd2` | Darth Vader, Victor Squadron Leader / Mos Eisley                   |   50 |   10 |
| Mandalorian Colossus | `097370f4-cc6f-4302-8dee-c762cbee0f0c` | The Mandalorian, We Can't Keep Running / Colossus                  |   65 |   10 |
| Dedra Colossus       | `736e9695-ef03-4422-8804-2e11281c44ef` | Dedra Meero, Not Wasting Time / Colossus                           |   56 |   10 |
| Aurra Data Vault     | `ba2264c6-6867-4cad-97e8-c22c729c1487` | Aurra Sing, Assassin / Data Vault                                  |   62 |   10 |
| Krennic ramp         | `6dfbf55b-57ea-4606-af93-992d37193f76` | Director Krennic, Amidst My Achievement / Shield Generator Complex |   52 |   10 |

All six passed [prepareDeckSnapshot](../../../play/admission/decks.ts) against
the official identity catalog and the pinned engine/card bundle. All inactive
support reports were empty. The main-deck pool, including leaders and bases,
contains 111 distinct identities. The JSON records the engine/rules/card pins,
catalog identity hash, exact inputs, source update timestamps, and content hashes.
Rebuilding all six snapshots reproduced their recorded hashes, and each snapshot
passed serialization and decoder round-trip checks.

This proves admission and implementation availability, not complete interaction
coverage, tournament legality, or AI competence. Admission uses `core-practice`.
Board 2 remains inactive in the initial single-game experiment; there is no
automatic sideboarding or silent movement of sideboard cards into main decks.

## User strategy guidance

These are expert hypotheses for curriculum and evaluation, not hardcoded action
priorities or rewards. Test the usual plan alongside situations where deviating
is necessary. Preserve terminal victory as the full-game learning objective.

### Greef Aggression

- Apply fast pressure, aiming to finish around six resources when the position
  permits it. A later win remains valid and must not be penalized as a failure.
- Preserve and recognize the finishing potential of Zeb Orrelios, Fists Work
  Every Time and Aggressive Negotiations.
- Consider claiming early to preserve the hand and set up a larger Negotiations
  attack, while accounting for the attacks/actions surrendered this round.
- Pair race-to-lethal cases with forced-defense cases. Measure timing as a
  diagnostic, not as a fixed six-resource deadline.

### Vader Cunning

- Develop space pressure and plan a disruptive deployment turn with Plot.
- Garindan can address a named threat such as Hyperspace Disaster; Lurking Snub
  Fighter can exhaust a dangerous unit; Chancellor Palpatine can provide ground
  Sentinels while the space board threatens the opponent's base.
- Compare deployment as a ground unit with deployment as a Pilot. Space
  removal, upgrade removal, and The Tree Remembers can make the Pilot line worse.
- Evaluate Plot resourcing, optional payment, trigger order, target selection,
  and deployment as a sequence. A ground deployment must remain selectable even
  when the deck is described as space aggro.
- Decisions about unseen removal must use legitimate observations and inferred
  matchup risk, never the opponent's actual hidden hand or the test scenario's
  answer. Naming a suspected card does not establish that the opponent holds it.

### Mandalorian Colossus

- The user's normal opening is to claim and pay one to draw. Preserve the
  qualifier: this is often useful, not a compulsory first turn.
- Frequently play below the available resource curve to afford the draw, but
  spend on the board when the extra card would leave an unacceptable threat.
- Remove opposing units while approaching six resources. Rebellious Hammerhead
  and Anakin Skywalker are important examples of removal that also develops a body.
- Turn a large hand and established board into a Negotiations finish; do not
  continue drawing or trading when there is a better winning line.
- Pair claim/draw positions with urgent-development positions, and include the
  cost of giving the opponent the remaining actions in the round.

The claim-and-draw trigger belongs to the
[Mandalorian leader](../../../play/cards/ash/the-mandalorian--we-can-t-keep-running.ts).
[Colossus](../../../play/cards/jtl/colossus.ts) also changes base HP and starting
hand size; the encoder must preserve those differences.

### Dedra Colossus

- Survive until the expensive units and board clears can stabilize the game:
  Chimaera, Pre Vizsla, Hyperspace Disaster, and Single Reactor Ignition.
- Use aggressive leader deployment to clear units when appropriate; survival
  does not mean avoiding combat or leaving the leader undeployed.
- Compare targeted removal, deploying a body, and committing to a sweeper.
  Include both beneficial and wasteful clears, and a transition to ending the game.

### Aurra Data Vault

- Control the board through units and the leader ability, with Chimaera and
  Pre Vizsla as strong later plays.
- Apply faster pressure against a slow opponent. The deck must be able to switch
  between controlling and racing as the matchup and board change.
- Evaluate similar friendly boards against different visible opponent positions
  so the model cannot solve the task with a permanent control/aggro label.

### Krennic ramp

The user's ideal opening is a multi-round curriculum target, conditional on
the required cards and enough time to invest:

1. First turn: play the Krennic unit, use its qualifying one-drop discount, and
   sacrifice the one-drop for a Credit.
2. Second turn: play Expendable Mercenary for three with the Krennic discount;
   without that discount, a Credit can help pay the full cost.
3. Third turn: play Resupply Carrier, aiming to have seven resources next round.
4. Fourth turn: play Chimaera or another suitable stabilizer.

The executable fixture must include the omitted intermediate choices and exact
payments. In particular, Mercenary becomes an exhausted resource when defeated;
the opening must account for its defeat, Credits spent versus retained, the
leader's exhaustion, once-per-round discounts, and normal regroup resourcing.
The four listed plays alone are not a complete replay or proof of the curve.
Relevant definitions: [leader](../../../play/cards/law/director-krennic--amidst-my-achievement.ts),
[Krennic unit](../../../play/cards/jtl/director-krennic--on-the-verge-of-greatness.ts),
[Mercenary](../../../play/cards/law/expendable-mercenary.ts), and
[Carrier](../../../play/cards/jtl/resupply-carrier.ts).

Add alternatives where drawing the wrong pieces, losing Krennic, facing lethal
pressure, or encountering Credit disruption makes the ideal sequence inferior.
Credits must be distinct from ordinary resources in the observation and payment
adapter; resource count, spending power, and deployment eligibility differ.

## Counter-strategies missing from ordinary main-deck self-play

Arvel Skeen, Win and Walk Away appears only in the Greef and Mandalorian
sideboards. Galen Erso, You'll Never Win, the Plot/naming version, appears in
none of the six lists. Vader's Galen is Destroying His Creation, a different card.

Therefore, unchanged main-deck self-play will not encounter these two Credit
counters. Add explicit scenario families and separately named opponent deck
variants, preserving the six original inputs and documenting every substitution.
This does not require learned sideboarding. The Tree Remembers and Hyperspace
Disaster are already represented in opposing main decks.

For Galen naming Credit, cover the ability-suppressed token, its effect on
affordable plays, and whether removing Galen is worth delaying development. For
Arvel, compare spending a vulnerable Credit now with retaining it for a stronger
future turn. Separate revealed/public danger from uncertainty about an unseen
counter; do not supply a hidden-card flag to either the policy or value model.

## Implementation order and acceptance

1. Start full-game adapter work with **Greef versus Dedra**, both seat
   orientations and varied initial initiative. This is a proposed engineering
   order to contrast fast pressure and survival; neither policy is trained yet.
2. Add **Krennic** to force explicit Credit/payment, sacrifice, and delayed-return
   handling before scaling training. Add the missing Credit counter cases.
3. Add **Mandalorian**, **Aurra**, and **Vader**, covering draw/claim tradeoffs,
   changing aggression, and compound Plot/Piloting choices.
4. Qualify the six-deck roster across the 36 ordered deck pairings, including
   mirrors. Report each matchup and keep later held-out list variations separate.

Include own-deck composition in the full-game model input from the first pair;
do not wait until expansion. Card roles, available ability choices, phase/round,
initiative, resources/Credits, hand, board, usage limits, and authorized history
must be represented. The initial 18-feature tactical encoder cannot express these
plans and must not be presented as ready for these decks.

The initial static decision inventory includes mulligan and resource selection,
ordinary and alternative payments, targets, optional effects, trigger ordering,
deployment roles, Plot selections, searches/reveals, card naming, and constrained
multi-card selections. The full-game adapter supports these shapes, and 72 scripted/sampled games
completed with exact replay across all ordered pairings. Complete strategic
branch coverage and the expert curriculum scenarios remain pending; ordinary
self-play does not prove that every intended line has been learned.

Strategy exercises need separate training and reserved evaluation positions,
including counterexamples and allowed alternative moves. Longer game performance
is the strategic test; do not claim optimal play because a policy mimics these
notes or succeeds on a short forced line. Retain the existing plan's privacy,
compatibility, cutoff reporting, opponent diversity, and evaluation requirements.

Required implementation skills: `swubase-online-play`, `swubase-architecture`,
`swubase-decks`, `swubase-card-catalog`, `swubase-validation`, and
`swubase-change-review`; use `swubase-documentation` for the maintained runbook.
