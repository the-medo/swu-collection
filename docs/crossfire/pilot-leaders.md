# Crossfire pilot leaders

Boba Fett (Any Methods Necessary), Darth Vader (Victor Squadron Leader) and
Luke Skywalker (Hero of Yavin) have independent leader, unit and upgrade profiles.
The unit faces have their printed statistics; their pilot effects belong only
to `faces.upgrade`. The pinned text and official rulings are in
`play/testing/fixtures/meta-pilot-leaders.json`. Rules follow the supplied v8.0
§§3.4, 3.6, 6.4, 7.6 and 8.20.

## Deployment and identity

A declaring action owns its costs and Epic limit. A `deploy` effect with
`as: 'unit-or-upgrade'` checks the resource condition, then offers unit deployment
or an exact eligible friendly Vehicle. Both roles share the declaring action's
usage. An Epic used below the resource threshold is still spent, with no
successful deployment. No resources are paid by these three deployment effects.
Exhaustion does not prevent deployment unless a declaring cost requires it.

Unit deployment enters the printed arena ready. Upgrade deployment flips the
same physical leader and attaches it in the host's arena; it does not ready or
exhaust the host. A pre-existing eligible host is required, so Vader cannot use
a TIE token from his deployment trigger as his host. Existing Pilot capacity
rules apply through the upgrade profile. Deployment is not playing a card.

`deployedAs` accepts `null`, `unit` and `upgrade`. Attached leaders are upgrades,
not units: they cannot attack, take unit damage, be exhausted or host upgrades.
Their own abilities remain distinct from abilities they grant to their host.
These three upgrades make the host a leader unit through `hostIsLeader`, without
making it a printed leader or granting its aspect icons.

Defeat flips a pilot leader back to its base zone exhausted, retaining the
physical identity and Epic usage. An ability that would bounce the deployed
leader to hand instead defeats it. The host loses its modifiers immediately.
If the host leaves play, the leader upgrade is defeated with its other upgrades.
An ordinary host made a leader unit goes to its owner's discard when defeated.

Scenario leaders can declare `deployedAs: 'upgrade'` and `attachedTo: <unit alias>`.
Setup attaches the player's existing leader after units have been placed; it
never adds a second leader as an ordinary attachment. Invalid hosts, exhausted
upgrades and inconsistent roles fail validation. Checkpoints retain the selected
role and pending deployment/damage choices.

## Card-specific abilities through shared mechanics

Boba's leader face observes actual non-combat damage by his controller. One
simultaneous damage event creates one trigger for that observer. Zero or wholly
prevented damage, combat damage and game-rule fatigue do not qualify. Indirect
and On Attack ability damage do qualify. The trigger optionally pays exhaustion,
then chooses either player for one indirect damage. Exhaustion prevents repeated
payment from Boba's own subsequent indirect damage. Observers are captured in
their active role at the damage event; flipping to the leader face later cannot
retroactively create that trigger.

When Boba deploys as an upgrade, `divide-damage` with `upTo: true` permits any
total from zero to four among units in either arena. This is ordinary preventable
damage, with simultaneous application and allocation above a unit's remaining
HP allowed. The browser uses the supplied minimum, maximum and per-unit limits.

Vader's leader action pays exhaustion before checking whether a non-token Vehicle
attacked this phase. His upgrade deployment creates two exhausted TIE Fighter
tokens. Those tokens have their own canonical definition and ordinary token-unit
zone rules.

Luke's leader action similarly checks for a Fighter attack, including token
Fighters. Attack history stores controller and traits at declaration, so later
movement or trait changes cannot rewrite whether that attack qualified. The
history resets with the phase.

Luke's upgrade itself resists direct enemy ability defeat. Its host does not
gain that protection. Rule defeat after host departure or bouncing the upgrade
still returns Luke to base. The profile's `grantsIf` condition grants his attack
ability only to a Fighter host. Ability-origin capture preserves the granted
ability when Support lends it to a different unit; it does not reapply the
original host's trait requirement to the borrower. Host ability loss removes
the grant while leaving Luke's own protection and imposed leader status active.

## Verification

Engine/card bundle 0.29.0/29 uses state 28 and browser protocol 16. The browser
shows deployed leader artwork for either role and labels upgrade deployment
choices with their exact Vehicle. The `pilot` browser preset deploys Boba and
resumes a partial damage allocation after reload:

```bash
CROSSFIRE_TEST_DATABASE_URL=<running-worktree-url> CROSSFIRE_BROWSER_SCENARIO=pilot bun run play:browser:test
```

`meta-pilot-leaders.test.ts` covers separate profiles, eligibility, independent
host readiness, shared Epic usage, return-to-base, Luke protection and borrowed
grants, phase history, Boba timing and bounded damage allocation. New choices
resume in a fresh process. Complete imported winner lists also run through the
existing game and accepted-input replay gate. Other pilot leaders remain
unsupported until their individual abilities pass conformance.

## Han Solo, Never Tell Me the Odds

Han’s leader action publicly reveals the top deck card without moving it. The
continuation retains its exact reference, then requires a ready eligible attacker
if one exists. Both printed costs must be odd and different for the attack-only
power bonus. The empty-deck case still permits the attack. Revealing one card
adds its public log face without exposing the rest of the deck or trackable deck
handles.

His ordinary deployed unit is 3/7 with no unit ability. Upgrade deployment gives
+3/+4, leader status and a separate When Deployed trigger. Count friendly units
and upgrades by physical card and printed cost, including Han himself; a Pilot’s
alternate payment does not replace its printed cost. Choose up to that many
distinct resources, at least one when possible. Under the simultaneous “for each”
rule, designating the same resource repeatedly is represented by selecting it
once. An already ready resource is also a legal designation. All chosen resources
ready together. The pending selection retains the count taken at resolution.

## Lando, Major Vonreg, Rio and Wedge

Engine 0.79 adds four separate leader/unit/upgrade implementations. Lando's front
counts the newly played unit toward controlling both arenas and gives the Shield
before When Played resolution. His unit has Sentinel; his upgrade grants Sentinel
and has its own optional deployment Shield in a different arena. Major Vonreg's
front excludes the exact played Vehicle from the power bonus, while his upgrade
grants its host an On Attack bonus for another unit in that arena.

Rio's front grants Saboteur for the chosen space attack. His unit has Saboteur;
his upgrade grants it to its host and directly adds one power to a Transport.
That direct modifier still applies if control of the host changes. Wedge's front
requires an actual Piloting play, while his upgrade's next-Pilot discount also
applies when playing a Pilot as a unit. All four share the declaring Epic usage
between their unit and upgrade deployment options.


## Asajj, Holdo and Ackbar

Asajj Ventress, I Work Alone has Grit as a unit and grants it as a Pilot. Her
upgrade also grants a separate optional attack trigger; the front action's
first damage is mandatory. The enemy damage stays in the selected friendly
unit's recorded arena even when that first unit is defeated.

Holdo's front and unit choices include a unit with a Resistance upgrade; the
unit itself need not have that trait. Her deployed ability excludes herself.
Ackbar's successful exhaustion makes that unit's controller create the X-Wing,
including their token replacement choices. An already exhausted target creates
no token. His front excludes leader units; his deployed attack ability does not.


## Poe Dameron, I Can Fly Anything

Poe's front action pays one resource and exhaustion, then `attach-leader` flips
him into an upgrade on an eligible friendly Vehicle. This entry is neither a
play nor a deployment: it does not trigger When Deployed, offer Plot, or spend
his independent Epic Action. An absent eligible host does not refund the paid
cost. His five-resource Epic deploys only his 4/6 unit face.

His +2/+1 upgrade does not make its host a leader. Its separate one-resource,
once-per-round action reattaches him to another eligible friendly Vehicle.
Neither initial attachment nor reattachment permits an existing Pilot, even on
a Vehicle with extra Pilot capacity. Reattachment preserves his incarnation.
If the host changes controller, Poe remains under his owner's control and only
that owner may activate his action. Host departure defeats Poe, returning him
exhausted to his base with any unused Epic still available.
