# Damage prevention and protection

Queen Amidala, Chewbacca, Rey, the Mandalorian, Gorian Shard's Corsair and Boba
Fett have dedicated definitions with catalog text pinned in
[the fixture](../../play/testing/fixtures/meta-prevention.json).

Damage frames offer all applicable replacement choices to the affected unit's
controller. An attached Shield remains mandatory, while Amidala's trait-sharing
friendly-unit sacrifice and the Mandalorian's remote Shield are optional. When
both exist, the controller can choose either prevention effect. Exact units and
Shields are reserved across simultaneous assignments, preventing duplicate use.
The event then applies its replacements and remaining damage; sacrificed units
and lethal units share defeat observation before either group leaves play.
The supplied v8 rules §§1.9 and 7.7.5 govern prevention and simultaneous replacements.
The official [Amidala](https://admin.starwarsunlimited.com/api/card/details/39880?locale=en)
and [Mandalorian](https://admin.starwarsunlimited.com/api/card/details/51992?locale=en)
rulings, verified 2026-09-09, confirm the controller's replacement choice.

No prevention choice is offered for zero or unpreventable damage. Gorian's
active ability makes friendly Underworld card damage unpreventable, including
combat and divided damage. It does not affect opposing or unrelated sources,
and stops applying when Gorian loses the ability. Indirect damage retains its
independent unpreventable status. Prevention also cancels the Overwhelm excess
associated with that assignment.

Direct defeat and return effects check the captured ability controller against
the affected unit's current controller. Chewbacca protects himself as a unit or
grants both protections to his Vehicle as a Pilot. Rey blocks direct enemy
ability defeat and controller changes. These abilities do not prevent lethal
damage, zero-HP maintenance, friendly defeat or other unlisted operations.
Blocked defeat does not satisfy an `ifYouDo` continuation or increase defeated
enemy counts. Delayed defeats retain their original source controller.
The official [Chewbacca](https://admin.starwarsunlimited.com/api/card/details/19986?locale=en)
and [Rey](https://admin.starwarsunlimited.com/api/card/details/46797?locale=en)
rulings explicitly distinguish direct defeat from game effects and lethal HP.

Boba's ordinary unit play creates a Shield. His Pilot profile instead grants
+2/+3 and offers one damage, or a choice of one or two on a Transport. He can
decline that damage. The runtime role determines the active profile, using the
existing non-leader Piloting and exact-host contracts.

[Seventeen scenarios](../../play/testing/meta-prevention.test.ts) cover replacement
alternatives, duplicate costs, indirect and Overwhelm interactions, ability loss,
unit/Pilot separation, control restrictions, outcome counts and fresh-process
replacement/Pilot/target recovery. Checkpoints validate reserved costs and their
replacement sources. The existing public target and decline intents present
these choices; no hidden state or new executable frontend rule code is sent.

## Ordered damage changes and temporary survival

Deadly Vulnerability doubles incoming unit damage, including unpreventable
damage. Each attached copy applies once to the packet. Its direct upgrade text
also suppresses the attacker's Overwhelm while the host defends; blanking the
host does not blank the upgrade. Shien Flurry separately pays for a Force unit
and establishes Ambush and a one-use, two-damage prevention effect before played
triggers. Its prevention is a lasting effect; losing the unit's abilities removes
granted Ambush but does not erase the resolved prevention instruction.

The affected unit's controller orders partial prevention, doubling and existing
Shield/sacrifice replacements. A Shield chosen first leaves Shien's prevention
unused. Partial prevention chosen first can reduce damage to zero and preserve
the Shield. Serializable replacement histories retain original amounts, exact
sources and reserved one-use effects; checkpoint decoding replays and validates
them. Unpreventable damage ignores prevention effects under v8 §1.9.13.

At Attin Safety Droid limits each preventable base-damage packet to four,
including Overwhelm excess. Limits are captured before a simultaneous event,
so defeating the Droid in that event does not undo its protection of the base.
Repeated copies do not lower the limit below four. Prevention logs retain the
exact Droid source and base reference.

The Tragedy of Plagueis prevents zero-HP maintenance defeat for the chosen
unit through the phase. It does not block explicit defeat or prevent damage.
Overwhelm has no excess when the defender survives (v8 §6.3.5d), including when
partial prevention saves it. Indirect allocation still obeys v8 §8.35.3's
remaining-HP limit. The protected unit is checked again as the phase expires,
before regroup draws; a later incarnation does not inherit the effect.

Definitions and official clarifications are pinned in `top8-prevention.json`;
`top8-prevention.test.ts` covers outcomes and recoverable ordering. Primary
sources:
[Deadly Vulnerability](https://admin.starwarsunlimited.com/api/card/details/52431?locale=en),
[At Attin Safety Droid](https://admin.starwarsunlimited.com/api/card/details/52032?locale=en),
[The Tragedy of Plagueis](https://admin.starwarsunlimited.com/api/card/details/27239?locale=en),
[Shien Flurry](https://admin.starwarsunlimited.com/api/card/details/28124?locale=en).
