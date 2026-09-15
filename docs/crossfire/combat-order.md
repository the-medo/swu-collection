# Combat order and attack-ability counts

Crossfire 0.31.0 / card bundle 31 / state 30 adds Han Solo, Has His Moments;
Anakin's Podracer, So Wizard!; and Hotshot Maneuver. The browser view remains 17.

Under comprehensive rules v8 §6.3.5c, a unit dealing combat damage second must
survive the first hit. Its power is then recalculated, including damage gained
for Grit. `combat-response` is a serializable frame behind the first damage
batch and maintenance, before attack completion and the common trigger flush.
Both steps retain the same attack identity and exact source/target incarnations.
Shield choices can suspend either step. The first step's defeat and other
triggered abilities resolve with the attack-end window, after all combat damage
(v8 §6.3.5e).

The Podracer's `firstCombatDamage` ability is conditional on no **other unit**
having attacked that phase, including opponents' units. Its own earlier attacks
do not disqualify it; another incarnation does. Ability loss removes the benefit,
and the ability does not give it priority while defending.

Han has separate ordinary-unit Ambush and Piloting behavior. His upgrade-play
ability offers an attack with the attached, ready unit. `attack-bound.combatFirst`
applies first damage to that specific attack when the host's title is Millennium
Falcon. It is an effect of the resolved ability, independent of later gained or
lost abilities, and does not grant priority to later attacks. This effect does
not ready an exhausted host. The registered Get Out And Push Falcon supplies a
real implementation for the matching-title conformance case.

Hotshot uses `on-attack-count` to count the chosen unit's effective printed and
granted On Attack abilities. Abilities suppressed by ability loss do not count.
Restore and Saboteur are keywords that resolve in the same window, distinct from
the On Attack abilities defined in v8 §7.6.15. Each damage recipient must be a
different enemy unit; `damage-units` supports a numeric limit and a mandatory
count bounded by available targets. All selected damage is simultaneous, then
the chosen unit attacks if able. The effect does not ready it.

`play/testing/meta-combat-order.test.ts` covers damage order, both players' attack
history, Grit, Shield replacements, exact recovery, separate Han roles, the
single-attack duration and Hotshot's target/count rules. The retained executable
workload also resumes a first-hit replacement with the response still pending.
Use `bun run play:check`, then archive and verify the committed current bundle.

Primary details and clarifications:
[Han Solo](https://admin.starwarsunlimited.com/api/card/details/20486?locale=en),
[Anakin's Podracer](https://admin.starwarsunlimited.com/api/card/details/47147?locale=en),
[Hotshot Maneuver](https://admin.starwarsunlimited.com/api/card/details/20341?locale=en).

Friendly Attack Ends observers are captured with their ability origins at the
combat step, alongside the attacking unit. They remain available when combat or
end-of-attack maintenance defeats the observer. Combat damage replacement retains
this observer set. Anakin Skywalker, Prescient Podracer checks the phase's attacks
against the attacking incarnation, including earlier attacks by either player.
Returning a later copy or a defeated attacker does nothing. Returning a leader is
replaced by defeat (v8 §3.4.6) and still satisfies “If you do” (§8.9.2); this permits
Anakin's subsequent healing. Returning a token sets it aside and also satisfies
the condition.

Trench Run uses an event `attackGrants` profile. Its temporary origin records the
resolved event, while the ability's source is the exact attacking Fighter. This
keeps the self-damage, log attribution and trigger ordering tied to that unit,
including a native On Attack ability captured before lethal self-damage. Combat
requires the attacker to survive. Ordinary ability loss suppresses the grant;
the separate +4 power effect still applies to that attack. Both expire with the
attack. Checkpoints validate event origins as well as ordinary Support grants.

The defending player mills from the top; the cost difference uses the two
printed costs, independent of aspect penalties. Equal costs deal zero damage.
With fewer than two discarded cards, there is no pair of costs to compare and
the implementation deals zero; this edge case follows the do-as-much-as-possible
rule and has no separate published clarification in the pinned card details.
Damage from this ability is explicitly unpreventable, including by Shields.
`meta-attack-grants.test.ts` covers these interactions and fresh-process recovery.
[Trench Run details](https://admin.starwarsunlimited.com/api/card/details/20251?locale=en).

## Captured attack participants

On Attack and On Defense triggers capture exact `attacker` and `defender`
bindings at declaration. The ability source remains the card with the ability.
Chirrut's optional Force payment therefore resumes with the original attacker
reference, including after a checkpoint, and applies its power penalty only to
that attack. The shared recovery workload includes this defending-player choice.

Each attack also records whether it began through Ambush. Heroic Purrgil checks
that origin for its two-power bonus; possessing Ambush during an ordinary attack
does not qualify. Nested attacks retain their own origin, and checkpoint schema
45 requires the explicit flag. Pong Krell's surviving-attack trigger compares
target remaining HP against his current postcombat power, including Grit, after
attack-duration bonuses expire. Equality does not qualify.

## Defender-first combat and post-attack instructions

The Stranger offers a `combat-order` choice to the attacking player before
combat damage. Choosing defender-first schedules the surviving attacker's
response behind damage replacement and maintenance; Grit is recalculated then.
Competing first/last abilities use the same choice (v8 §6.3.5c). Ordinary attacks
against bases and a Stranger defending do not offer it. Babu Frik's modified
attack reads remaining HP for combat damage without changing power or unrelated
power-based abilities. One Way Out suppresses the defending unit's abilities
before On Defense collection; direct Shield upgrade effects still work.

An attack retains its post-attack effect frames and exact base-damage sources.
Flash the Vents checks damage during that attack, including non-combat damage
from the chosen unit, without counting earlier attacks that phase. Its defeat
instruction waits for the attack's complete trigger window (v8 §7.6.8a), including
an Attack Ends return to hand. Old references cannot defeat a later incarnation.
The event remains the source of its post-attack instruction and defender blank.

`top8-attacks.test.ts` covers outcomes, expiry, replacements and fresh-process
recovery. The shared recovery workload includes order selection, first-hit Shield
prevention, both attack events, the post-attack return and Babu's chosen Droid.
Official details are pinned in `top8-attacks.json`:
[The Stranger](https://admin.starwarsunlimited.com/api/card/details/46482?locale=en),
[Babu Frik](https://admin.starwarsunlimited.com/api/card/details/28054?locale=en),
[One Way Out](https://admin.starwarsunlimited.com/api/card/details/40160?locale=en),
[Flash the Vents](https://admin.starwarsunlimited.com/api/card/details/47077?locale=en).
