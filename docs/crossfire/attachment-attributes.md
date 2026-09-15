# Crossfire attachment attributes and departures

The Darksaber, Leia's Disguise, Sabine Wren (I Learned the Hard Way), Shuttle
ST-149 and Zeb Orrelios (Fists Work Every Time) have dedicated definitions.
Printed text and official clarifications are pinned in
`play/testing/fixtures/meta-attachments.json`. The rules basis is the supplied
v8.0 §§3.4.6–7, 3.6, 7.6, 8.11–12, 8.32 and the official card detail records.

## Attributes versus granted abilities

An upgrade profile can impose `hostIsLeader` and `hostTraits` directly on its
attached unit. `unitIsLeader` and `cardTraits` derive those attributes from the
active upgrade. Losing the host's abilities does not remove these direct upgrade
effects. Removing the upgrade immediately removes its contribution. These
attributes affect targeting, attachment eligibility, trait conditions, damage
prevention costs and public card metadata.

The Darksaber requires a unique non-Vehicle host. Its separate
`grants.providesAspects` is an ability gained by that host. Ability loss removes
this grant. Payment adds the icons of friendly units with this ability to those
of the base and printed leader; one physical provider is counted once. Runtime
leader status alone does not supply icons. The underlying card's identity,
owner, incarnation and deployed face remain unchanged.

A leader unit that an ability would return to hand or change control of is
instead defeated, subject to any applicable prohibition on the original effect.
A printed leader returns exhausted to its owner's base and keeps its Epic usage.
An ordinary unit made a leader by The Darksaber goes to its owner's discard.
Non-leader targeting restrictions use runtime status.

Leia's Disguise directly grants Underworld. Its When Played ability checks its
host's title for Leia Organa, then gives a Shield to a friendly unit chosen by
the upgrade's controller. It works on deployed Leia leaders as well as units.

## Attachment events and token reassignment

`attach` emits the host's `upgrades-attached` trigger. A single instruction that
gives several token upgrades uses `giveTokens`, which emits one such event after
the entire group attaches. Sabine therefore triggers once for three Advantage
tokens, once for her Shielded token, and again for each later attachment event.
Her optional exhaustion can choose any ground unit. Scenario setup suppresses
attachment events because it describes an existing position.

Shuttle's played and defeated triggers select zero or one token upgrade, bind
its exact incarnation, take control, then choose a different eligible host.
Both decisions resume after serialization. Taking control changes the token's controller explicitly while its owner still
follows the existing host. Reassignment preserves its exact identity, moves it
to the new host's arena and makes that host's controller its owner and controller. The new host may belong to either player. Maintenance checks the
old host after losing the modifier. If no different host remains, the control
instruction still resolves and the attachment instruction does as much as
possible. The defeated Shuttle's own upgrades have already left play before
its When Defeated selection resolves.

## Defeat observation

Unit departure records capture statistics, traits, runtime leader status and
ability origins before removal. For a simultaneous group of departing units,
the engine also captures upgrade-defeat observers before any member leaves.
Attached upgrades are defeated as their host departs. Their own When Defeated
abilities and friendly observers use the relevant source/controller snapshots.

Zeb creates three Advantage on another unit, including an enemy. Each friendly
upgrade defeated causes one mandatory base-damage choice. Controller determines
friendliness, independently of host and owner. Shields spent preventing damage,
Advantage expiring after combat and upgrades lost with a host all count. Returning
an upgrade to hand or reassigning it does not count as defeat. A Zeb departing
in the same event still observes his own and other friendly upgrades' defeats.

## Views and verification

Browser protocol 15 exposes effective traits and a leader-unit flag only for
visible faces. `face.kind` is `unit` for a deployed leader; `printedKind` retains
its printed identity. The board displays unit statistics, traits and leader-unit
status. Hidden-card boundaries and opaque instance handles remain enforced by
the server projector.

`meta-attachments.test.ts` covers eligibility, ability loss, exact-copy choices,
controller/owner separation, simultaneous departure, modifier-loss defeat,
Shield replacement, Advantage expiry and fresh-process recovery. The browser
smoke test verifies that deployment renders both ATK and HP. Run `play:check`,
the frontend build, connection tests and the opt-in local browser test.

## Pilot stat bonuses and conditional choices

Biggs grants Fighter Overwhelm and Speeder Grit. Its extra Transport HP is an
upgrade-imposed modifier. Nien Nunb's Pilot face likewise imposes power based on
other friendly Pilot units and upgrades. These numeric effects survive loss of
the host's abilities, but stop if the upgrade loses its own abilities; printed
upgrade modifiers remain. Nien's unit face has its own constant ability.
Counts include current public roles and control, exclude the exact source, and
do not inspect hidden hands or resources. Raddus uses the same role-aware
selection to detect another friendly Resistance unit, upgrade or leader.

Lando's reduction follows the exact unit attacking him. Hound's Tooth checks
the current defender's exhaustion and phase of entry before combat ordering.
Nihilus publishes only the eligible units tied for least remaining HP, then
uses the chosen unit's last-known traits after damage. Crix follows its official
erratum: only arenas with strictly more units than the opponent reduce cost.
C-3PO compares current traits to friendly leaders without imposing a friendly
restriction on the recipient.

A dedicated Pilot-attachment event lets Razor Crest distinguish Pilots from
ordinary upgrades and tokens. Mandalorian's unit face selects its complete
exhaustion group before changing readiness; its Pilot face chooses an enemy in
the host's arena. Arcana's granted replacement doubles its controller's own-deck
search count before inspection. Losing the host's abilities suppresses it.
Disclose continuations can carry a card-defined consequence for declining, as
used by Warrior of Clan Ordo.

[Seventeen outcome scenarios](../../play/testing/top8-traits.test.ts) verify
these cards, Vader's two additional unit/Pilot implementations, role boundaries,
ability loss, optional branches and fresh-process recovery.
