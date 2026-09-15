# Choices and lasting effects

The card definitions can compose serializable effects without capturing a live
callback. `choose-mode` offers card-authored mode IDs; `if` evaluates a condition
at resolution; `select-unit` binds an exact instance/incarnation to a name for
its nested effects. `on-unit` and `attack-bound` use that binding, the source,
or the attached unit. A unit leaving and returning cannot satisfy the old
binding. The public protocol exposes the mode label and viewer-scoped choices,
never the binding map or executable effect tree.

`UnitFilter` queries current arena, controller, printed cost, traits, uniqueness,
exhaustion, damage, upgrades and remaining HP. Relative comparisons can exclude
the source, use a bound unit's arena, or compare power to the source or any
friendly unit. Source power uses the exact incarnation's last known information
when necessary. Conditions support discard aspects, unit counts, initiative,
relative fleet size and a bound unit's current attributes. They are intentionally
finite; a definition requiring another condition must add its engine handler
and tests before it is registered.

Temporary modifiers live in `lastingEffects` with their source, target, stat
changes, supported ability grants, and an explicit phase or attack expiry.
Power and HP are recomputed from printed values, upgrades, lasting modifiers
and attack effects. Grit adds current damage once; simultaneous combat computes
both units' power before applying either damage assignment. Reducing HP can
cause an immediate defeat without dealing damage, and Shields do not prevent it.

Granted keyword/Raid/Restore origins are captured with triggers and departure
records. Losing all abilities suppresses printed and granted origins for the
effect's duration, including abilities gained later. This does not remove the
abilities of attached upgrades themselves. Support checks borrowed Saboteur at
attack declaration, subject to any effect preventing the recipient from gaining
abilities. A borrowed self-reference refers to the receiving unit.

Phase expiry is an explicit continuation before the next phase begins. Removing
a temporary HP bonus runs maintenance and resulting defeat triggers before
regroup draw. Attack expiry removes the attack's modifiers before subsequent
trigger resolution. Checkpoints validate modifier sources, target incarnations,
expiry and bound references. The scenario builder still starts a settled phase
without pre-existing modifiers; tests obtain these through production actions.

The effects batch adds twenty cards, including Anakin's independent discard
conditions, Ahsoka's face-specific power comparisons, Cyborg Mech's modes/Grit,
Yaddle's Restore grants, T-6's bound attack, temporary reductions, ability loss,
bounce, exhaustion and conditional entry. Printed text pins are in
`play/testing/fixtures/meta-effects.json`; independent outcomes and fresh-process
continuations are in `play/testing/meta-effects.test.ts`.

Rules basis: supplied v8 §§6.3.1, 7.5.6, 7.5.20, 7.6, 7.7.3, 8.5, 8.11 and 8.14.
Engine 0.13.0, card bundle 13, state 12 and browser protocol 11. These primitives
cover the registered definitions; additional conditional grants, arbitrary
replacement rules and other mechanics remain unimplemented.
