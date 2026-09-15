# Leader faces, deployment abilities, and runtime roles

Leader definitions must describe their printed faces explicitly. Before the
0.3.0 engine, Sabine had flat `action`, `onAttack` and `deployAt` fields; engine
branches interpreted them as an undeployed action, a unit attack trigger, and a
free once-per-game deployment. That was too specific to the first leader.

The current [Sabine definition](../../play/cards/sor/sabine-wren--galvanized-revolutionary.ts)
puts her two actions under `faces.leader.actions` and her attack trigger under
`faces.unit.triggers`. The shared
[ability resolver](../../play/engine/abilities.ts) selects only the active face.
Action intents and trigger collection both use that resolver. A trigger already
collected uses its captured source face even if the physical leader flips later.
Face abilities are not implicitly inherited by another face.

## Working contract

- `printedCost` describes the printed card. It is not a universal deploy
  requirement or a resource payment.
- An action has a stable `id`, separate `costs`, a `limit`, and `effects`.
  Costs support paying resources, using the Force and exhausting the source.
  Credit tokens can replace the resource component. The full
  cost is checked before any payment occurs.
- Deployment is an effect, usable independently of the action that caused it.
  The current effect supports a unit destination or a unit/upgrade choice and an optional resource-count
  condition. The condition is evaluated when the effect resolves.
- `abilityUses` records usage by ability ID on the physical card and survives
  face/zone changes. `once-per-game` applies to the declaring ability; deployment
  itself does not consume an Epic Action. Unlimited actions can be used again.
- `deployedAs` records the leader's current deployed role independently of usage.
  The current runtime accepts `null`, `unit` or `upgrade`. The unit deployment effect enters
  ready even if the action paid an exhaustion cost; defeat returns the leader
  exhausted without clearing its ability history.
- `use-ability` commands identify both card and ability. Projections expose the
  offered ability ID and whether its deployment condition currently succeeds.
  The server independently checks face, costs and usage.

The pinned v8 rules distinguish an action's cost from a condition in its effect
(§6.4). Paying a cost can make an action legal even if its conditional effect
does nothing. An Epic Action can also be spent without resolving its conditional
effect, because consuming its use changes game state (§7.2.4). Crossfire now
allows Sabine's Epic Action to be spent before controlling four resources;
she stays on her leader face and that ability is still used. This is separate
from successfully deploying her. The demo avoids that choice when its deployment
condition is false.

The 0.3.0 release changes state and browser protocol to version 3 and the card
bundle to `crossfire-core-3`. During unreleased development the [bundle workflow](retained-bundles.md) keeps
only the newest executable; there is no silent checkpoint migration.
The scenario builder accepts `deployedAs` and explicit `abilityUses` independently.
A deployed scenario does not automatically infer how the leader was deployed.

## Cases to resolve before adding more leaders

These observations were verified against SWUBASE's tracked official catalog and
the supplied comprehensive rules v8, especially §§3.4, 6.4, 7.2 and 7.6. The table records the design cases that informed the shared primitives. The
registry is the current admission authority; a shared primitive alone does not
make a leader with additional unsupported abilities playable.

| Leader                                                  | Representation and required engine work                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admiral Trench, Chk-chk-chk-chk                         | A normal repeatable action pays three resources and exhausts Trench. Its deploy effect checks six controlled resources. Exhausted resources still count toward that condition. His discard/draw action and opponent-choice When Deployed ability need their own resolution primitives.                                                                                                              |
| Chewbacca, Hero of Kessel                               | His Epic Action pays four resources and has no separate printed resource-count condition. It does not exhaust him. Credit payment will need to join the common cost system; neither printed cost nor Sabine's threshold should add an extra condition. Resource defeat and Credit creation are further dependencies.                                                                                |
| Bail Organa, Doing Everything He Can                    | A normal repeatable action exhausts Bail and discards two chosen hand cards before a four-resource deployment condition. Selection must suspend before payment, validate both exact hand copies, and commit all costs atomically. His resource movement and observer trigger remain separate mechanics.                                                                                             |
| Grogu, Charming Companion                               | A leader-face trigger observes playing a qualifying unique unit, then checks that Grogu is ready and optionally deploys him. Readiness is a condition, not an exhaustion payment; there is no blanket resource-count or once-per-game requirement. Playing a pilot as an upgrade does not satisfy the unit-play trigger. His unit-face passives are independent of that trigger.                    |
| Bo-Katan Kryze, Reclaiming Mandalore                    | Evaluate controlled resources plus friendly Mandalorian units against ten. This does not change her printed cost. The condition needs a live trait/role-aware count, not a stored discounted `deployAt`. Token creation and her deployed passive/trigger remain separate.                                                                                                                           |
| Avar Kriss, Marshal of Starlight                        | Evaluate controlled resources plus the controller's Force uses this phase against nine. Force usage must come from authoritative phase history, be reset at phase boundaries, and survive mid-phase checkpoints/scenarios. It must not be inferred from the current Force token or rewritten printed cost.                                                                                          |
| Nala Se, Clone Engineer                                 | Declare her aspect-penalty rule on each printed face that has it. Cost calculation queries active continuous effects. The unit-face grant of defeat triggers to Clones must be captured before simultaneous removals, including Nala Se's own defeat. A granted ability needs its recipient/source history and resolved parameters; re-reading only printed text after Nala leaves is insufficient. |
| Pilot leaders, such as Han Solo, Never Tell Me the Odds | Deployment choices share their declaring Epic Action's usage. The printed deployed face can function as a unit or an attached upgrade. Preserve one physical card, explicit runtime role, attachment target, stat modifiers and granted abilities. A leader upgrade and its attached unit may have different controllers/sources for effects. Defeat returns the leader exhausted.                  |

Shared costs, Force history, conditional values, continuous effects and granted
abilities now have implemented primitives. Each remaining leader still requires
its own complete card behavior and conformance scenarios; the table above is
not a claim that its card is admitted.

[Pilot leaders](pilot-leaders.md) now implement Boba Fett, Darth Vader and Luke
Skywalker's JTL deployment choices, independent profiles and return-to-base
behavior. The codec accepts their upgrade roles. Other pilot leaders, including
the Han example above, remain unregistered until their individual abilities are
implemented. Use runtime role and the attachment graph when resolving active
passives and grants.

New leader admission must prove both faces, conditions versus costs, relevant
usage limits, exhaustion before/after deployment, defeat/return, exact-copy
choices, and recovery at every introduced suspension. The existing Sabine and
cost-profile cases are in [leaders.test.ts](../../play/testing/leaders.test.ts).

Sloane and Leia now exercise separate leader actions, deployed abilities, phase
grants, ongoing auras and distinct aspect counts; see [aspect abilities](aspect-abilities.md).

## Chosen sacrifice costs

Director Krennic, Amidst My Achievement adds a `defeat-friendly-unit` action
cost. The action's legal options pair the leader with one exact friendly unit;
controller, role and availability determine the candidates. The view references
both cards and labels which copy is defeated. Targets are selected before any
cost is paid. The common payment gate checks all exhaustion, resources, Force
and sacrifice requirements before mutating state. Defeat uses ordinary departure,
attachment and trigger handling; its triggered abilities resolve after the
activated ability finishes. Tokens and units owned by the opponent are valid
payments when controlled by the activating player.

Krennic's leader face exhausts and sacrifices to create one Credit. Its Epic
Action requires seven resources in play without spending them. The unit face has
only its deployed ability: another friendly unit deals damage equal to its
current power to an enemy unit. The referenced unit is the damage source, with
normal Shield replacement. Empty choices do not refund deployment or Epic use.
Tests cover atomic failed payments, exact copies, cost-trigger ordering, separate
faces, modified power, Shield recovery and the public cost references.

## Dynamic deployment thresholds

A deployment's resource-count condition may include a numeric `reducedBy` value.
Avar Kriss, Marshal of Starlight counts Force uses recorded for her controller
in the current phase. Eight resources plus one Force use satisfies her threshold
of nine, even when resources are exhausted. Deployment spends no resources
unless the action explicitly has a resource payment. Force-use history resets
at the phase boundary; gaining or retaining a Force token is not a Force use.
Her unit face separately gains four power and Overwhelm while its controller has
a Force token. The scenario and shared recovery suites cover both contracts.

## Private and compound card costs

An `ability-payment` frame suspends for a chosen hand discard, resource defeat,
friendly-unit return or friendly-token defeat. It retains the original action or
triggered payment and its source; the engine recomputes candidates on recovery.
The payer alone sees private resource or hand faces. Chosen cards retain exact
handles. No exhaustion, resource spending, discard or usage occurs until the
complete payment is fixed. Resource payment may exhaust the same resource that
is then defeated. Credits cannot substitute for a required resource sacrifice,
nor can a Credit pay two parts of the same cost.

Top-deck discard costs have no choice or advance reveal; an empty deck cannot
pay them. Discarding a cost card records the actual discard and queues observers
behind the activated ability. Unit returns retain owner semantics and ordinary
attachment cleanup. Defeating the Force as a token cost is distinct from using
the Force and does not notify Force-use observers.

Krrsantan requires two exact hand discards. Dryden's front requires exhaustion
and a printed cost of at least six for the discard, then allows a unit of at most
five; his unit face accepts any discard and any unit cost. Chewbacca's front
pays one resource, exhaustion and a resource sacrifice. His Epic Action pays
four resources without exhausting him or imposing an extra resource-count
condition; Credits may replace that payment. His unit face has a separate
optional attack payment. Sebulba's front pays a deck discard for a Raid grant,
while his unit face has its own mandatory attack discard. Jabba's front returns
a friendly Underworld unit as a cost; his cost-free unit action requires a legal
Underworld play. Only a Credit actually spent on that nested play grants Ambush.

Modified plays may grant phase abilities before collecting When Played triggers.
This preserves Ambush timing and its granting source. The `top8-costs` scenarios
and shared recovery workload exercise all six card definitions, atomic failed
payments, private projections and compound Credit continuations. The opt-in
`ability-cost` browser scenario exercises resource selection after a reload.

## The Armorer’s resource upgrades

Steel Shapes Us has separate front and deployed abilities. The exhausted front
action allows an upgrade on any unit that entered this phase, including an enemy
unit. Its attack-ended ability instead allows any friendly host and resolves even
if The Armorer was defeated in combat. The normal five-resource Epic has neither
a resource payment nor an exhaustion cost.

`playAs: 'upgrade'` admits printed upgrades and units with an available Piloting
cost, while `play-card.attachFilter` constrains their actual attachment choices.
Private resource inspection precedes play. The selected card can pay toward its
own cost while it is still a resource. Only successful play replaces that resource
with the exhausted top deck card; declining or failing to find an eligible play
does not replace it. A Pilot is played in its upgrade role, with its normal host
restriction and alternate cost. All these choices use existing private projections
and Credit payment continuations.

## Kylo’s sequential discard upgrades and Sabé’s attack timing

Kylo Ren, We’re Not Done Yet pays only exhaustion for his front action. Its hand
discard is an effect, and only a printed upgrade causes the conditional draw;
a Pilot in hand/discard is a unit. His seven-resource Epic deploys a 5/5 Sentinel.
The separate deployment trigger uses `play-card.repeat` to offer one discard
upgrade at a time on that exact leader incarnation. Each successful play pays
its cost and finishes its triggers before recomputing the next play. The player
can stop, and an absent host or unaffordable remainder ends the sequence. Pilots
still obey their Vehicle restriction, so their alternate role does not allow
them to attach to Kylo.

Sabé, Queen’s Shadow follows the official revised styled text pinned alongside
both catalog faces in `top8-leader-choices.json`. Her front observes a friendly
attack ending with combat base damage, then optionally pays exhaustion to inspect
the defending player’s top two cards. After payment, discarding one is mandatory
when a card exists. The retained remainder returns to the top without disclosure.
Her unit face has Raid 1 and instead inspects the defending hand after her own
qualifying attack. Only choosing a discard makes that player draw a replacement.
The attack-ended trigger is captured before lethal combat maintenance, so it also
resolves after an Overwhelm attack that defeats Sabé. Ability damage alone does
not satisfy either face.

## Phase history and aspect waivers

Engine 0.78 / card bundle 78 / state 72 captures full play snapshots and defeated
unit traits for phase conditions. A play records its acting player and runtime
role; an event played from another player's zone still belongs to its acting
player. Unit eligibility also matches the exact incarnation, so deployment,
Piloting, tokens, older copies and the opponent's plays do not satisfy “a unit
you played this phase.” Attack and defeat conditions retain event-time control
and traits after cards leave play. Phase changes clear these records.

`ActionDefinition.condition` gates whether a conditional action exists, as with
Coordinate. This is separate from costs and from conditions inside the effect:
Nute can exhaust without two defeats, whereas Ahsoka Snips cannot activate her
Coordinate action below three units. Trigger conditions are captured at their
triggering event.

Active face abilities can waive aspect penalties for a filtered card and an
optional live condition. Unit-only waivers do not cover a Pilot played as an
upgrade. Waiving aspect penalties preserves printed cost and other additions;
it does not also subtract a waived colored penalty from that printed cost.
Ability loss removes the waiver. `leader-history.test.ts` covers Nala Se, both
Hera waivers and Mon Mothma, alongside both faces of all 20 leaders in the batch.

For “if you do” follow-ups, healing requires removing actual damage. Damage
replaced by a Shield still resolves its instruction under v8 §8.9.2. This
matters for Obi-Wan's healing and Phasma's damage, respectively. Separate damage
instructions remain separate instances, including Bo-Katan's optional second hit.

## Abilities attached to a particular play

Engine 0.79 / card bundle 79 / state 73 adds 15 leaders through the same face
contracts. `play-card.ignoreAspectPenalties` applies to that nested play's offer,
Credit selection and payment. It preserves printed cost, including the chosen
Piloting cost. `CardFilter.playAs` distinguishes Piloting from an ordinary
upgrade and permits non-unit plays to include a Pilot as an upgrade. Anakin's
Force payment occurs before the hidden play choice; it is not paid again after
recovery. Kallus's unit face observes all friendly card plays, including events,
without changing existing unit-only play observers.

A next-play modifier can carry phase abilities. The matching unit receives the
grant before its When Played abilities are collected, and the modifier is
consumed once. The grant survives source movement, respects ability loss and
expires with its phase. Third Sister uses this for Hidden.

Strongest-unit filters compare live power among the specified candidates and
retain all ties. Snoke chooses one tied Villainy unit; Savage grants Overwhelm
to every tied friendly unit. A token creation instruction may identify the
opponent as creator, preserving their ownership and their replacement choices.
Dooku's two selected players are both seats in the current two-player format.
Satine records actual healing for her subsequent base damage, including the
choice to heal zero. Rey can discard an empty hand and still draw two, as her
official clarification specifies.

The outcome tests are in `leader-plays.test.ts`; printed text and clarifications
are pinned in `leader-plays.json`. Shared recovery cases cover waived Piloting
with Credits, chosen healing, the next-unit grant, the opposing token creator,
and an upgrade deployment's choice in the other arena.

## Combat conditions, survival and repeatable deployment

Engine 0.80 / card bundle 80 / state 74 adds 16 leaders with their complete
active faces. `leader-combat.json` pins the official text and clarifications;
`leader-combat.test.ts` covers their outcomes and failure branches.

Attack effects bind the actual attacker and defender before evaluating numeric
bonuses. Anakin and Moff Gideon grant their bonus only against a unit. Defender
penalties last for that attack, while Jyn and Grogu impose their modifiers from
an active source. Chained attacks finish the first attack and its triggered
abilities before selecting the second unit. Yularen retains the first unit's
printed cost after departure. Saw's later defeat addresses the original
incarnation and waits for Attack Ends abilities.

Survival at zero HP is an active ability, including conditional and granted
abilities. Chirrut loses protection as regroup starts; Cassian Climb loses it
when his controller loses initiative. Both transitions run immediate lethal
maintenance. Cassian's front instead protects exact friendly units recorded as
having damaged a base this phase; an imposed protection survives ability loss
on its recipient, and Sentinel overrides it. Capability checks avoid resolving
unrelated continuous abilities for each potential attack target.

Grogu has a triggered deployment with no Epic limit or resource payment. His
front observes a unique unit played at printed cost four or more, checks that
he is ready, then offers deployment. Piloting does not qualify. A later
qualifying play can deploy him again after he returns to his ready leader face.
His deployed combat modifiers exclude himself. The six new shared suspension
cases cover Grogu's choice, phase survival, chained attacks, the departed first
attacker, defender-dependent bonuses and Ackbar's opposing token creator.

## Paid repeatable deployment and a chosen revealed draw

Engine 0.81 / card bundle 81 / state 75 implements Admiral Trench and Bail
Organa with unlimited deployment actions. Trench pays three resources and
exhaustion, then checks six controlled resources. Bail pays exhaustion and two
chosen hand discards, then checks four controlled resources. Payment can succeed
below the threshold without deployment. Credits replace only Trench's resource
payment, and cannot satisfy the resource-count condition or exhaustion. Both
leaders deploy ready, return exhausted on defeat and can deploy again later.

Trench's deployment uses a bounded, public deck inspection. The opponent chooses
two of the top four revealed cards to discard simultaneously; the controller
then chooses one of the remaining cards to draw and discards the other. The
fifth card never enters either choice or reveal. `draw-card` draws an exact bound
deck card through the ordinary draw observer and private/public log boundary.
It is a chosen-card instruction, like drawing a selected search result. No
remaining card means no selected draw. Checkpoints validate the original bounded
deck group and the correct chooser at each stage.

Bail's front returns a chosen private resource only after a friendly unit was
defeated, then resources the top deck card. His unit's all-card play observer
uses the captured `played-from-resources` value. It covers resource plays such
as Plot, including upgrades and events; ordinary hand plays do not heal his base.
The outcome tests and five shared recovery cases are in `leader-deployment`.

## Two leader faces without deployment

Engine 0.82 / card bundle 82 / state 76 implements Chancellor Palpatine,
Playing Both Sides. His definition has two horizontal leader faces and no unit
profile, printed cost, Epic Action or deployment effect. Every normal game starts
on Chancellor Palpatine; a server-side scenario can explicitly start on Darth
Sidious with `leaderSide: 'back'`.

The active face supplies its name, title, aspects, traits and abilities. Palpatine
supplies Cunning/Heroism and Republic/Official; Sidious supplies Cunning/Villainy
and Force/Separatist/Sith. The catalog's aggregate aspect list does not become a
third aspect provider. Absence of a printed cost does not qualify as cost zero
or an even cost in filters.

Both actions can pay exhaustion without qualifying phase history. Palpatine
checks a friendly Heroism defeat, then draws, heals two and flips. Sidious checks
an actual Villainy card play, including an event, then creates a Clone Trooper,
damages each enemy base and flips. Both remain exhausted. A flip advances the
face incarnation without a play, deployment or Plot opportunity; physical
identity and usage history survive. Historical references retain their face
name and cannot link to the replacement incarnation. Checkpoint decoding rejects
impossible side flags and mismatched current-face references.

Browser protocol 29 adds the projected face's `side`. Board cards, choice images
and inspection dialogs use that field for artwork. The client does not infer a
back face from deployment alone. `leader-faces.test.ts` covers both faces,
conditions, costs, projections, invalid scenarios and fresh-process recovery;
two shared cases bring the continuation workload to 173.

## Reactions to plays and attack results

Engine 0.83 / card bundle 83 / state 77 adds Boba Fett (Daimyo), Cad Bane,
Mandalorian (Sworn To The Creed), Darth Revan, Quinlan Vos, Vader (Unstoppable),
Lama Su and Qui-Gon (Student of the Living Force). `leader-reactions.json`
retains both printed faces and the revised official styled text.

Play observers distinguish a unit play from a card played in its upgrade role,
including Piloting. Token creation and attachment without play do not count as
an upgrade play. Boba checks active keywords at unit entry, including a keyword
granted by the play instruction. His unit aura excludes himself and updates
when keywords or source abilities change. Cad's opponent owns the subsequent
unit choice; declining the deployed trigger preserves its round use.

Revan follows the revised attack-end wording: a defeated defender qualifies,
even if the attacker also died. The Experience effect still requires that exact
attacker to remain a unit. Quinlan compares printed costs using retained card
references, including after the played unit leaves. Qui-Gon's strict lower-cost
comparison excludes Villainy and only follows a successful return. His and
Lama Su's attack-end plays explicitly require survival.

Nested upgrade plays can bind the selected host before entry. Lama Su uses that
reference to damage the same host before the upgrade's When Played abilities;
returning or replacing that host cannot redirect the follow-up to a new copy.
Vader's private hand inspection retains the selected group independently of
zone changes, discards those copies together, and uses its size for damage.
Choosing zero cards does not discard or disclose a hand face.

`leader-reactions.test.ts` covers both faces, costs, choices, expiry, ability
loss, private projections and recovery. Seven additional shared cases bring
the executable recovery workload to 180.

## Chosen costs, tokens and damage reactions

Engine 0.84 / card bundle 84 / state 78 adds Rex (No Other Option), Vane,
Han (I Got A Really Good Feeling), Tobias Beckett, Jabba (Wonderful Human Being)
and Jango (Concealing the Conspiracy). Official face text and clarifications
are pinned in `leader-costs-damage.json`.

Rex's front pays leader exhaustion and readying an exhausted enemy together;
a unit that cannot ready cannot pay that cost. Vane chooses a friendly upgrade,
including one attached to an enemy host. Replacing Luke's upgrade defeat with
unit conversion still pays the cost before the base choice. Their unit faces
use optional effects with follow-ups conditional on successful resolution.

Han's token selection covers unit and upgrade tokens, Credits and the Force.
A selected unit and its selected attached token each count once. Removing an
unselected attachment when its host leaves does not increase the damage count.
Unit departures retain their attributes before attachment cleanup. Tobias's
deployment filters printed ownership separately from current control and counts
actual selected defeats. An attempted control change that instead defeats a
leader-status unit does not create his front-face Credit.

Damage events retain the exact unit source and actual unprevented amount.
Jango observes both combat and ability damage, including simultaneous damage
that defeats the dealer or his own unit face. Jabba requires the other friendly
unit to survive and retaliates for the damage packet, not accumulated damage.
The retaliation cannot use a replacement incarnation. Prevented damage does not
create either reaction, and declining Jabba's optional ability preserves the
round limit.

`leader-costs-damage.test.ts` covers the six leaders, compound costs, replaced
upgrade defeat, mixed tokens, control changes, optional limits, damage prevention
and fresh-process recovery. Seven shared continuation cases bring the executable
recovery workload to 187. The browser protocol remains 29.

## Phase events and action-scoped history

Engine 0.85 / card bundle 85 / state 79 adds Boba Fett (Collecting the Bounty),
Yoda (Sensing Darkness), Cassian (Dedicated to the Rebellion), Pre Vizsla,
Luthen Rael, Padme (What Do You Have to Hide and Follow My Lead) and Anakin
(Protect Her at All Costs). Revised official wording is retained in
`leader-phase-events.json`.

Phase history records unit entry and departure snapshots with their controller,
role and traits at the event. Departures include defeat, capture, returning to
hand and resourcing; moving between arenas or changing control does not leave
play. Unit entry counts include created tokens and deployed leaders, while
Pilots played as upgrades do not qualify. A departed entry still contributes
to Anakin and Padme's condition; targets must be eligible current incarnations.

Actual draw and enemy-base-damage counters reset at each phase boundary.
Regroup draws do not carry into Pre Vizsla's next action phase, and empty-deck
fatigue is not a draw. Cassian counts damage that was dealt even if the base was
later healed. Damage observations retain contributors and their ability origins
before simultaneous removals.

`actionHistory` exists only while an action is resolving. It retains exact
attackers through chained attacks and post-combat effects, then clears when the
action finishes. Luthen follows his revised wording and can react when a unit
that attacked this action is defeated after combat; a later action or regroup
defeat does not qualify. Defeat observers include active leader faces in the
base zone. Captured triggers continue after the observing unit's own defeat.

Padme's hand trigger observes one event per affected owner when one or more
cards are explicitly revealed or discarded from that owner's hand. An opposing
ability discarding those cards still qualifies. A revealed search result drawn
from the deck, or a card shown for payment legality, does not count as an
explicit hand reveal. The engine records this semantic event directly rather
than deriving triggers from presentation logs.

Yoda chooses whether to discard before the deck's top card is visible. His
follow-up compares the discarded card's printed cost; an empty deck supplies
no card and no fabricated zero-cost target. His front keeps a selected hand
copy bound through the private top-or-bottom choice. Boba's unit reaction
requires survival; Padme's attack-end chain does not.

`leader-phase-events.test.ts` checks these histories, both faces, optional
branches, hidden views and fresh-process recovery. Nine shared cases bring
the executable recovery workload to 196. The browser protocol remains 29.

## Private top-card choices and random discard selection

Engine 0.86 / card bundle 86 / state 80 adds Thrawn (Patient and Insightful),
Hunter (Outcast Sergeant), Ahsoka (I Have an Idea) and Doctor Aphra. Official
face text and clarifications are pinned in `leader-private-choices.json`.

Thrawn inspects each deck privately at action-phase start on both faces. His
paid front action and optional attack reaction reveal only the chosen top card
and compare its printed cost. An empty deck supplies no zero-cost target.
Hunter privately selects a controlled resource, reveals only that copy, and
compares printed titles without subtitles against friendly unique units. A
successful exchange returns the card to its printed owner and resources his own
top card exhausted; an empty replacement deck does not prevent the return.

Ahsoka resolves the played event before offering her front reaction. Her
attack-end reaction remains usable after her defeat. A bound inspection can
now authorize playing that exact deck incarnation without removing the rest of
the deck into a search area. The cost, Pilot role and Credit payment use ordinary
play validation. A stale visibility reference cannot authorize a later hidden
copy; leaving or discarding the inspected card preserves the remaining order.

Aphra counts distinct printed costs in her discard pile. Deployment selects
three different printed titles before requesting one uniform server random
index. The serializable random-card frame retains and validates all three
references. With fewer than three distinct titles, the conditional return does
not occur. Her front mills at regroup start before drawing.

`leader-private-choices.test.ts` covers both faces, private-view differences,
empty decks, duplicate copies, Pilot/Credit play and all three random outcomes.
Eight shared cases bring executable recovery coverage to 204. The browser
protocol remains 29.

## Simultaneous healing, inherited keywords and rescue entry

Engine 0.87 / card bundle 87 / state 81 adds Qi'ra (I Alone Survived), Moff
Gideon (Indomitable Warlord), Sabine (Bargaining on Belief) and DJ (Need a Lift).
Official text and clarifications are pinned in `leader-recovery.json`.

Qi'ra heals every unit before calculating half of each unit's remaining HP,
rounded down. Those calculated amounts form one simultaneous damage event and
remain fixed through replacement choices. Her front damages the selected
friendly unit before giving it a Shield; a defeated unit receives no token.

Filtered zone counts and a printed-keyword filter let Moff Gideon gain only
his eight listed keywords from Imperial units in his own discard pile.
Conditional keywords do not qualify, and gaining Support does not copy the
discarded unit's other abilities. His front checks retained friendly Imperial
defeat history and may exhaust even when that condition is false.

Sabine's opponent chooses a unit they control and creates its Advantage tokens.
The ability controller and instructed token creator remain distinct through
replacement choices. Her next-unit Shielded grant applies before play triggers,
survives her departure and is not consumed by a Pilot played as an upgrade.

DJ binds a friendly guard before playing a discounted unit and captures the
played copy before its When Played abilities resolve. Captured source snapshots
still resolve those abilities; Ambush cannot attack and Shielded cannot attach
to the captured card. His unit ability changes ready entry only for friendly
rescues while it remains active. Rescues from a simultaneous defeat resolve
after all defeated units have moved, so iteration order cannot leave a departing
DJ's ability active. Leader abilities use the base-side profile as soon as the
physical leader returns to the base zone.

`leader-recovery.test.ts` covers both faces, replacement choices, exact copies,
source defeat, optional hidden play, keyword loss and fresh-process recovery.
Six shared cases bring executable recovery coverage to 210. The browser protocol
remains 29.

## Repeating On Attack abilities and returning departed attachments

Engine 0.88 / card bundle 88 / state 82 adds Enfys Nest (Until We Can Go No
Higher) and Gar Saxon (Viceroy of Mandalore). Official text is pinned in
`leader-repeated-abilities.json`.

Enfys observes acceptance of an explicit On Attack ability and resolves after
that ability's effects. Generated keyword handlers sharing the attack window,
such as Restore, do not qualify. The retained trigger includes its exact source,
controller, borrowed origin and resolution context. Repeating it uses normal
trigger resolution and limits. Declining an optional original ability produces
no use event; declining Enfys preserves her unit face's round limit. Her front
requires the complete two-resource-and-exhaust cost, including any Credit choice.

Gar's upgraded-unit aura applies on both faces; only his unit face grants the
When Defeated return. Unit departure records retain attachment snapshots before
cleanup. The selection includes either owner's public discard pile and follows
the exact former attachment, including a Pilot that left as an upgrade. A Shield
set aside, an upgrade moved through hand, or a Pilot whose defeat was replaced
by remaining in play is unavailable. Returned cards go to their printed owner.
Snapshots remain valid through pending Pilot defeat replacement choices.

A simultaneously defeated Gar still grants captured defeat abilities to other
friendly upgraded units and himself. A recipient losing abilities retains the
external numeric bonus but loses the granted trigger. The shared defeat-units
handler now passes its effect context to filters such as `otherThan: source`.

`leader-repeated-abilities.test.ts` covers exact duplicates, printed ownership,
Pilot replacement, ability loss, Credits, round limits, borrowed triggers and
fresh-process recovery. Six shared cases bring executable recovery coverage to 216. The browser protocol remains 29.

## Collective Ambition and simultaneous token damage

Engine 0.89 / card bundle 89 / state 83 adds Maul (Collective Ambition).
His front action and unit face's When Deployed/On Attack abilities compare the
chosen unit's distinct active keyword names with its attached Experience tokens.
Repeated Raid instances count once, including Raid 0. Coordinate remains present
below its three-unit threshold; the existing Ahsoka (Snips) and Padmé (Serving
the Republic) implementations now declare that keyword on both printed faces.

The Experience and damage use one compound continuation. Token replacements
resolve before damage replacements, with both parts still pending. The prepared
Experience creation travels inside the damage frame; committing it and damage
precedes defeat checks and attachment-trigger observation. This preserves a unit
with 1 remaining HP. A Shield prevents damage without preventing Experience;
Jerjerrod doubles only token creation. A departed recipient is never replaced
by a later incarnation. Checkpoints validate the nested context, target, actor,
source snapshot, original damage and completed token-replacement choices.

`leader-collective-ambition.test.ts` covers these outcomes and fresh-process
recovery. Three shared suspension cases bring executable recovery coverage to 219. The browser protocol remains 29. Official text and the simultaneous-effect
clarification are pinned in `leader-collective-ambition.json`.

## Plot-specific cost reductions

Engine 0.90 / card bundle 90 / state 84 adds Chancellor Palpatine (How Liberty
Dies). His front searches the top five for an active Plot keyword, using the
normal private search, exact selection, reveal, draw and randomized remainder.
The unit's deployment creates a phase modifier restricted to plays using Plot.

A play's method travels with its executable effect through legal options,
Credit payment, final cost and modifier consumption. Having Plot printed on a
card or playing it from resources through another instruction does not consume
the modifier. Declining a Plot play also preserves it. A free Plot play consumes
it. Deployment abilities and declared Plot cards retain the player's choice of
resolution order, so the discount starts when Palpatine's trigger resolves.
Its captured modifier survives Palpatine's defeat and expires with the phase.

`leader-plot-discount.test.ts` covers units, upgrades, events, costs, Credits,
other play instructions, deployment order, expiry and fresh-process recovery.
Four shared cases bring executable recovery coverage to 223. The public protocol
remains 29; official face text is pinned in `leader-plot-discount.json`.

## Smuggle costs and leader follow-ups

Engine 0.91 / card bundle 91 / state 85 adds Hondo (That's Good Business),
Lando (With Impeccable Taste), and five cards that exercise printed and granted
Smuggle costs. Independent alternative costs retain their own aspect icons and
origin. Tech grants each friendly resource an additional cost based on its
printed cost and icons. The resource may pay for its own play; its replacement
enters exhausted before attachment and play observers are captured. An empty
deck supplies no replacement and does not cause draw damage.

The play method is explicit throughout legal choices, payment and triggers.
Smuggle and Piloting costs cannot be combined. Hondo reacts only to actual
Smuggle plays, with an optional exhaust cost on his front and optional Experience
on his unit face. Lando's separate front and unit actions defeat an owned,
controlled resource after replacement and before resolving the played card's
abilities. That instruction still resolves when no card is played. The unit
face's once-per-round limit is independent of exhaustion.

The private resource choice uses the existing inspection continuation and exact
card references. The public protocol is now 30: Smuggle choices expose the
payable amount and visible grantor to the acting player, while cost IDs and
resource identities remain server-owned. The browser labels alternate costs and
uses a general resource-inspection instruction suitable for both owners.

`leader-smuggle.test.ts` covers both faces, costs, Credits, native and granted
keywords, ability loss, alternate aspect icons, follow-up timing, empty decks,
stolen resources, round limits and secret-differential projections. Seven shared
suspensions bring executable recovery coverage to 230. Official face text,
Smuggle cards and Lando's timing clarification are pinned in `leader-smuggle.json`.

## Shared keywords when declaring a play

Engine 0.92 / card bundle 92 / state 86 adds Morgan Elsbeth (Following the Call).
Her front selects an exact friendly unit that attacked this phase, then offers
only matching unit plays from hand. Her unit's attack creates a next-unit
modifier: it is consumed even if no friendly unit shares a keyword when that
next unit is played. Multiple resolved modifiers stack and expire with the
phase; the source's defeat does not remove them.

Shared keywords are evaluated before resource payment. Printed keywords and
unconditional grants from the modified play instruction or matching next-play
modifiers qualify. Grants conditional on paying a Credit or on the later play
event do not qualify yet. Numeric keywords compare names, including zero;
Piloting is eligible as a shared keyword even when the card must be played as a
unit. A Tech-granted Smuggle keyword exists while its resource is being played,
but the resource cannot count as its own friendly unit witness.

`play-keywords.ts` centralizes matching next-play modifiers and declaration-time
keyword evaluation. Legal options, Credit payment and final payment receive the
same unconditional play grants, separately from payment-conditional grants.
`leader-shared-keywords.test.ts` covers both faces, affordability, repeated
attacks, lost abilities, source/witness departure, modified plays, alternate
roles and phase expiry. Three shared cases bring executable recovery coverage
to 233. Protocol 30 is unchanged; official text and the declaration-time ruling
are pinned in `leader-shared-keywords.json`.

## Bounties and their collector

Engine 0.93 / card bundle 93 / state 87 adds Bossk (Hunting His Prey), Jabba
(His High Exaltedness), Cartel Turncoat, Fugitive Wookiee and Death Mark.
Printed, lasting and upgrade-granted Bounties use independent ability origins.
Each Bounty creates an optional generated trigger before defeat or capture moves
its unit. It shares that timing window with ordinary defeat abilities, but is
not an explicit When Defeated ability and cannot be invoked as one.

The collector is the opponent of the unit's controller immediately before its
defeat or capture, including stolen units and a player capturing their own unit.
The source snapshot retains its actual controller. Accepted collection records
an exact historical trigger; effect frames and lasting play modifiers carry its
index as controller provenance. Numeric values and owner filters use the ability
controller separately from the source card. Checkpoints validate this exception
against the collected trigger instead of allowing arbitrary controller changes.

Jabba grants one- or two-resource next-unit discounts for the phase, depending
on his active face. His deployment selects another friendly guard before an
enemy non-leader captive. Bossk's front damages a Bounty unit and may improve that
same surviving incarnation. His unit optionally repeats the exact collected
Bounty once per round; a repeated reward makes fresh choices, and declining the
original reward does not count as collection.

`leader-bounties.test.ts` covers both leaders, source/collector ownership,
multiple rewards, phase and round limits, unit/upgrade ability loss, tokens,
stolen units, capture, simultaneous defeat and malformed provenance. Nine shared
cases bring executable recovery coverage to 242. The public protocol remains 30. Official text is pinned in `leader-bounties.json`.

## Dooku and Exploit

Engine 0.94 / card bundle 94 / state 88 completes the official leader/base
expansion: all 154 Leaders and 90 Bases are registered. Dooku (Face of the
Confederacy) uses separate face contracts: the exhausted leader-side action
grants a Separatist Exploit 1, while the unit's On Attack grants the next
Separatist Exploit 3. The front grant lasts for the phase under the official
erratum. Printed Exploit on Hailfire Tank and Battle Droid Legion stacks with
these grants. Read [Exploit payment](exploit.md) for cost order, exact unit
selection, Credits, replacement choices, trigger deferral and rollback.
Protocol 31 adds actor-only payment metadata; the shared recovery workload
contains 251 cases. This completes the tracked official Leader/Base identities,
not the remaining main-deck catalog or multiplayer formats.
