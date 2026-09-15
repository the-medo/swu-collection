# Capture and rescue

Crossfire 0.40.0 / card bundle 40 / state 39 implements Arrest, Grand Admiral
Thrawn (Grand Schemer), Lando Calrissian (Trust Me), and Moral Authority. Browser
protocol 21 exposes captured cards and their exact guard links.

The authoritative `captured` collection is a logical out-of-play location. Each
prisoner has a `capturedBy` link to its guard's instance and incarnation, separate
from upgrade attachment. Captured identities remain public despite being facedown
(supplied v8 §§1.17, 8.33). The projection includes them for players and spectators;
the board stacks them sideways and face down behind their guard (including a
base guarding an Arrest prisoner). Their exposed edges turn face up on hover or
keyboard focus, and they remain usable as exact log references.
They are neither units in play nor hidden hand/deck cards.

Capture removes damage, defeats attachments and records departure attributes. It
does not defeat the captured unit or fire its When Defeated abilities. Token units
are set aside instead. A departed guard cannot capture; runtime leader units
cannot be prisoners. Arrest's printed exception permits its controller's base to
guard a unit.

Moving a guard out of play immediately rescues its prisoners. Changing arenas or
control does not. Rescue returns the printed unit to its arena under its owner's
control as a new incarnation. It normally enters exhausted; card text that changes
ready entry still applies. It is not played and grants no When Played, Shielded or
Ambush triggers. Rescue maintenance can produce uniqueness choices or new lethal
units. An upgrade that granted a capture effect does not itself guard the prisoner;
removing Moral Authority leaves its host guarding that card.

Arrest schedules `rescue-at-regroup` for the exact captured incarnation. This uses
the existing delayed-effect ordering before regroup triggers and drawing. An early
rescue followed by recapture creates a later incarnation, so the old delayed
rescue does nothing. The original event's controller orders the delayed ability;
the rescued card returns to its owner regardless of who captured it.

`select-unit.otherwise` resolves when the chooser declines or no eligible unit
exists. Thrawn uses it to ready himself if his opponent offers no unit. His defeat
trigger chooses a friendly guard before restricting enemies to that guard's arena.
Lando heals only after both optional selections succeed. Moral Authority compares
current remaining HP strictly and can attach only to a friendly unique unit.

Scenario input supports `captured: [{ card, owner, guard, ref }]` plus optional base
aliases. It builds an initial position without firing capture/play triggers. The
normal engine validates guard roles, incarnations, ownership and zone membership.
Tests exercise capture decisions, delayed rescue order, secret-independent views,
exact public log references, nested guards, tokens, departed sources and recovery
in a fresh process.

Primary card details: [Arrest](https://admin.starwarsunlimited.com/api/card/details/40350?locale=en),
[Thrawn](https://admin.starwarsunlimited.com/api/card/details/40340?locale=en),
[Lando](https://admin.starwarsunlimited.com/api/card/details/39715?locale=en),
[Moral Authority](https://admin.starwarsunlimited.com/api/card/details/40655?locale=en).

Rescue preserves the physical card's action-use history. Creating a new rules
incarnation must not reset once-per-game Epic Action uses (v8 §7.2.4).

## Capturing a defeated unit

Bothan 5 observes another friendly non-Vehicle unit's defeat. Its optional
round-limited ability can capture that exact subject from its controller's own
discard pile. The `capture-unit.from` exception permits that printed unit in
discard; ordinary capture still requires a unit in play. A stolen friendly unit
in another owner's discard is unavailable, as are tokens set aside on defeat,
a returned resource, or a later incarnation. The guard must still be in play.
Capture after defeat does not fire a second defeat event, and normal guard
departure rescues the prisoner as a new exhausted unit.

The Top 8 optional-trigger scenarios cover decline and later use, exact duplicate
cards, Vehicles, ownership, simultaneous guard defeat and fresh-process recovery
before the capture. Captured identities and guard links remain public.
