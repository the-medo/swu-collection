# Attack outcomes and surviving damage

This batch implements Oggdo Bogdo, Rancor Keeper, First Light, Hera Syndulla,
the Great Mothers and Shin Hati's Fiend Fighter. Printed catalog text remains
pinned in [the fixture](../../play/testing/fixtures/meta-attack-outcomes.json).

The supplied v8 rules §§6.3.5 and 7.6.16 place attack-end and combat-defeat
abilities in the same trigger window. Attack-only modifiers expire before
those abilities resolve. An attacker defeated by combat damage can still have
an attack-end trigger. The
[official timing explanation](https://starwarsunlimited.com/articles/a-template-adjustment)
explains the transition from older attack-result wording.

Source verification on 2026-09-09 found that the official
[Oggdo detail endpoint](https://admin.starwarsunlimited.com/api/card/details/27339?locale=en)
contains updated `textStyled` and rulings while its `text` field retains older
wording. The updated ability checks whether the defender was defeated when
the attack ends. The
[First Light endpoint](https://admin.starwarsunlimited.com/api/card/details/39815?locale=en)
clarifies that defeating the defender before combat also satisfies its attack
result. Implementations use the supplied v8 timing; the catalog itself is not
rewritten by this batch.

Active attacks record exact-copy defeats and actual combat damage, including
Overwhelm damage to a base. Prevented and zero damage do not enter that history.
The attack also captures its attacker's ability origins before immediate combat
defeat maintenance. Ending the attack transfers the necessary references,
groups and amounts into serializable triggers. This permits Hera's actual-damage
healing and the Great Mothers' exact-target defeat after the attacker or borrower
has left play. A new incarnation cannot inherit an old attack's target effect.
Non-leader target groups exclude leader units. Support keeps its existing
origin-prefixed trigger IDs and copied attack-end abilities.

Damage application captures observers before immediate defeat, then checks
which damaged units remain in play after maintenance. This lets Rancor Keeper
observe another survivor even if the Keeper dies in the same event. It does not
trigger for prevented, zero or lethal damage. A `once-per-round` trigger use is
recorded when the player accepts the optional ability; other queued instances
then become unavailable. Declining the optional ability preserves its use for
a later trigger that round (v8 §8.32.3). Usage belongs to the exact source
incarnation and ability origin and resets next round. After explicitly accepting
Rancor Keeper, choosing zero bases still spends that accepted use. Selected bases
receive damage simultaneously. Combat-tagged damage separately records whether
Shin Hati's fighter was defeated by combat, determining its token choices.

[Outcome tests](../../play/testing/meta-attack-outcomes.test.ts) exercise thirteen
scenarios, including simultaneous defeat/end ordering, Shields, borrowed abilities,
independent round limits and fresh-process recovery at trigger, token and combat
replacement choices. Checkpoints validate combat source/target history, ending
snapshots, trigger context references and usage identities. The winner-game gate
now completes and replays the St Louis, Bozeman, Taipei, Austin and Cuernavaca
main decks, checking every pending checkpoint. Their pinned sideboards also have
complete implementation coverage; sideboard swapping and competitive format
validation remain separate features.

## Optional trigger continuations

An optional trigger retains its complete source, subject and ability origins in
an `optional-trigger` frame. Accepting consumes its round use and resolves its
nested effects; declining removes only that trigger instance. The normal trigger
batch retains the controller's ordering, and other copies have independent uses.
Checkpoint validation includes suspended optional triggers in the same reference
and origin checks as queued triggers and rejects a spent limit.

Sebulba's Podracer observes each card its controller discards from their own deck.
Hand discards, an empty deck and another player discarding that deck do not
qualify. Shared discard handling records the actual cards before notifying these
observers. The card can decline one discard trigger and accept a later one that
round. Cost-generated discard observers still wait for the activated ability.
`top8-optional.test.ts` and the shared recovery cases cover acceptance, decline,
multiple discards, exact-copy limits and private decision ownership.
