# Disclose and restrictions

The Disclose batch implements ten catalog-pinned cards in
[the fixture](../../play/testing/fixtures/meta-disclose.json). The supplied v8
rules §8.38 require the selected hand cards to collectively provide every
required aspect icon. Repeated icons count separately; additional cards may
be revealed. A failed requirement is not a reveal.

`disclose` suspends with a serialized chooser and continuation. Only that player
receives hand selection handles and the corresponding aspect icons. The server
validates unique, current hand references and the complete aspect multiset.
Declining selects no cards. Accepting creates a public reveal of the selected
cards and resumes effects under the original ability controller. The defender
variant uses the active attack's recorded defending player. The browser shows
the requirement and disables incomplete submissions; server validation remains
authoritative. Public view version 14 adds this selection metadata.

Syril uses a bound unit's controller for the discard decision. `inspect-zone`
can continue with `otherwise` when that player selects no card. Its pending
frame retains the original ability source and controller independently of the
hand owner. Captain Typho's `attacked` trigger joins the same batch as the
attacker's On Attack abilities.

Condemn supplies an attack-only replacement ability profile from its attached
upgrade. The recipient cannot gain other abilities while attacking, including
keywords granted for that attack. Maintenance after declaration checks defeat
if losing a conditional HP ability makes damage lethal. External numeric aura
bonuses continue to apply to a recipient that loses abilities; removing the
aura source's ability still ends that modifier. Support copies abilities, not
external numeric bonuses, and preserves keyword loss on the borrowed origins
without removing unrelated keywords from the borrower.

Screeching TIE Fighter suppresses all keywords for the phase, including numeric
Raid and Restore, while retaining non-keyword triggers. Cantwell's ready
restriction and BD-1's power/Saboteur grant use `source-in-play` duration tied to
the source's exact incarnation. The restriction covers both effect-based and
regroup readying. Leaving play ends it; returning the same physical card is a
new copy and does not restore the old grant. Darth Maul's Lightsaber grants an
optional attack restricted to unit defenders, with Overwhelm for that attack.

[Outcome scenarios](../../play/testing/meta-disclose.test.ts) cover acceptance,
decline, insufficient/repeated icons, forged selections, controller choices,
defeated sources, exact-copy lifetime, keyword/Shield/Sentinel interactions,
HP maintenance and Support. They include secret-differential projections and
fresh-process recovery. The authenticated `disclose` browser scenario reloads
a pending reveal and completes a game through rendered controls.

## Aspect alternatives and event restrictions

Leia, Of A Secret Bloodline pays one resource and exhausts on her leader face.
Her unit face instead has optional On Attack disclosure. Both choose one of
five aspect requirements, then preserve the complete group of revealed cards.
Target eligibility compares all aspects of those cards, including icons beyond
the chosen requirement. The filter applies the official single-card
clarification to every extra revealed card permitted by v8 §8.38; no separate
multi-card clarification is published in the pinned details. Eligible friendly
and enemy units are offered, including Leia herself when deployed.

Trade Route Taxation compares all units, across both arenas, when its effect
resolves. A strict majority establishes a phase restriction on the opponent's
event plays. Later board changes do not remove it. `playRestrictions` retains
source, affected player, filter and phase independently of named-card effects.
All ordinary and nested play admission uses `cannotPlayCard`, including free
plays and Plot. Phase transitions remove these restrictions.

Official details and catalog text are pinned in `top8-restrictions.json`:
[Leia](https://admin.starwarsunlimited.com/api/card/details/39395?locale=en),
[Trade Route Taxation](https://admin.starwarsunlimited.com/api/card/details/40005?locale=en).
