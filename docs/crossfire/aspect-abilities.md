# Aspect abilities and leader choices

This batch registers Sloane, Leia, Sabine's Masterpiece, Enoch, Mando's N-1,
Canto Bight and Daimyo's Palace. Their printed text is pinned in
[the fixture](../../play/testing/fixtures/meta-aspect-abilities.json).

Sloane's leader action pays exhaustion and gives existing units in the chosen
arena Sentinel and Overwhelm for the phase, including enemy units. Later entrants
do not receive that grant. Her deployed face independently has Overwhelm and
an ongoing aura granting both keywords to other friendly units. The aura affects
later entrants and disappears when her unit face leaves or loses its abilities.
The [official ruling](https://admin.starwarsunlimited.com/api/card/details/51717?locale=en),
verified 2026-09-09, confirms that the leader action affects only existing units.

Leia's leader action separately pays two resources and exhausts her. Its chosen
unit receives a fixed phase bonus equal to its different aspects. Neutral units
receive zero; a repeated icon never counts twice. Deployment costs no resources
and counts distinct aspects across all friendly units, including Leia's new
unit face, for the Experience tokens. The target can belong to either player.
Her unit face has Overwhelm and does not inherit her leader action.

Masterpiece has one attack ability whose four conditional effects resolve in
printed order. Only units satisfy its colored-aspect conditions; the leader
face and base do not. Resource modes are offered only where a resource with
matching readiness exists. A resource effect can now distinguish the resource
owner from its chooser. Masterpiece's controller chooses the exact resource,
including an opponent's opaque face-down resource, without learning its identity.
Existing owner-chosen resource effects keep their default behavior.

Mando's N-1 can optionally exhaust a friendly ready leader or leader unit for
an attack-only +2/+0. Support transfers that ability to the attacker and the
bonus expires at the end of that attack. The common role query excludes
attached upgrades; the
[official ruling](https://admin.starwarsunlimited.com/api/card/details/52696?locale=en)
explicitly says upgrades cannot be exhausted. Pilot-leader deployment and
upgrades that make their host a leader remain separate implementation work.

Enoch offers zero through six damage to his controller's base. Its next-unit
reduction records the actual increase from that resolution and halves it,
rounding down. Existing base damage is excluded, the next unit consumes it,
and phase changes expire it. This follows the
[official ruling](https://admin.starwarsunlimited.com/api/card/details/51817?locale=en)
that preventing his damage removes the associated reduction.

Both bases declare a once-per-game action that plays a card from hand while
ignoring one missing colored aspect icon. It removes one two-resource penalty,
even when several colored icons are missing. Heroism and Villainy penalties
remain. A card with all colored icons supplied gets no reduction. Ordinary play
is unaffected; alternate Pilot costs and Credit replacement use the same
calculation and resume with the original action's exception. Hidden-information
play may fail without refunding the Epic Action's use.

[Twelve outcome scenarios](../../play/testing/meta-aspect-abilities.test.ts) cover
both leader faces, phase grants versus auras, neutral and six-aspect counts,
private enemy-resource selection, Support, optional exhaustion, measured costs,
Pilot play and fresh-process choice/payment recovery. The six supported winner
games continue to pass full progression and input replay.
