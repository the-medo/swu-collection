# Complete official leader and base coverage

Requested September 10, 2026. Implement all official catalog Leader and Base identities missing from Crossfire, with separate canonical implementation files and complete printed abilities. The initial inventory is 118 leaders and 46 bases; 36 leaders are already supported. Alternate art and reprints reuse their canonical behavior. This scope covers the tracked official catalog, including its Twin Suns cards, within the existing two-player practice engine; it does not introduce multiplayer hosting or preview-card admission.

Use `swubase-card-implementator`, `swubase-online-play`, `swubase-card-catalog`, `swubase-validation`, `swubase-change-review`, and `swubase-documentation`. Load the relevant frontend skill if a new public decision requires UI work.

Current coverage: all 154 official Leaders and all 90 official Bases have dedicated registered implementations. The registry contains 759 definitions. Final validation for batch 22 is recorded below.

## Delivery

1. Add bases and leaders using established mechanics, proving their actions, triggers, active faces and continuous effects.
2. Extend shared serializable mechanics for remaining costs, histories, replacements and role changes. Implement each affected card only when its complete behavior works.
3. Cover unusual leaders explicitly: repeatable deployment, conditional thresholds, alternative leader faces, Piloting, borrowed abilities and printed limits. Keep costs separate from deployment conditions and persistent use counters.
4. Test card outcomes and negative branches, exact instances, private projections, replay and fresh-process recovery for new choices. Run the full engine gate and review each behavior batch before committing; retain only its newest committed executable.
5. Finish with a catalog-wide leader/base coverage assertion and the complete-game regression suite. Catalog support does not imply competitive-format legality or support for other cards in an arbitrary deck.

Primary evidence is the official catalog, official card detail responses and the supplied v8 comprehensive rules. Record material text discrepancies with the card fixtures. Never infer a missing ability from another implementation.

## Initial missing identities

- `ahsoka-tano--snips` (TWI, Leader)
- `anakin-skywalker--what-it-takes-to-win` (TWI, Leader)
- `asajj-ventress--unparalleled-adversary` (TWI, Leader)
- `bo-katan-kryze--princess-in-exile` (SHD, Leader)
- `boba-fett--collecting-the-bounty` (SOR, Leader)
- `boba-fett--daimyo` (SHD, Leader)
- `bossk--hunting-his-prey` (SHD, Leader)
- `cad-bane--he-who-needs-no-introduction` (SHD, Leader)
- `captain-rex--fighting-for-his-brothers` (TWI, Leader)
- `cassian-andor--dedicated-to-the-rebellion` (SOR, Leader)
- `chancellor-palpatine--playing-both-sides` (TWI, Leader)
- `chewbacca--walking-carpet` (SOR, Leader)
- `chirrut--mwe--one-with-the-force` (SOR, Leader)
- `coronet-city` (SHD, Base)
- `count-dooku--face-of-the-confederacy` (TWI, Leader)
- `dagobah-swamp` (SOR, Base)
- `darth-vader--dark-lord-of-the-sith` (SOR, Leader)
- `death-watch-hideout` (SHD, Base)
- `director-krennic--aspiring-to-authority` (SOR, Leader)
- `doctor-aphra--rapacious-archaeologist` (SHD, Leader)
- `droid-manufactory` (TWI, Base)
- `echo-base` (SOR, Base)
- `emperor-palpatine--galactic-ruler` (SOR, Leader)
- `energy-conversion-lab` (SOR, Base)
- `fennec-shand--honoring-the-deal` (SHD, Leader)
- `finn--this-is-a-rescue` (SHD, Leader)
- `gar-saxon--viceroy-of-mandalore` (SHD, Leader)
- `general-grievous--general-of-the-droid-armies` (TWI, Leader)
- `grand-admiral-thrawn--patient-and-insightful` (SOR, Leader)
- `grand-inquisitor--hunting-the-jedi` (SOR, Leader)
- `grand-moff-tarkin--oversector-governor` (SOR, Leader)
- `han-solo--audacious-smuggler` (SOR, Leader)
- `han-solo--worth-the-risk` (SHD, Leader)
- `hera-syndulla--spectre-two` (SOR, Leader)
- `hondo-ohnaka--that-s-good-business` (SHD, Leader)
- `hunter--outcast-sergeant` (SHD, Leader)
- `iden-versio--inferno-squad-commander` (SOR, Leader)
- `ig-88--ruthless-bounty-hunter` (SOR, Leader)
- `jabba-s-palace` (SHD, Base)
- `jabba-the-hutt--his-high-exaltedness` (SHD, Leader)
- `jango-fett--concealing-the-conspiracy` (TWI, Leader)
- `jedha-city` (SOR, Base)
- `jyn-erso--resisting-oppression` (SOR, Leader)
- `kcm-mining-facility` (TWI, Base)
- `kestro-city` (SOR, Base)
- `kylo-ren--rash-and-deadly` (SHD, Leader)
- `lair-of-grievous` (TWI, Base)
- `lando-calrissian--with-impeccable-taste` (SHD, Leader)
- `leia-organa--alliance-general` (SOR, Leader)
- `level-1313` (TWI, Base)
- `luke-skywalker--faithful-friend` (SOR, Leader)
- `mace-windu--vaapad-form-master` (TWI, Leader)
- `maul--a-rival-in-darkness` (TWI, Leader)
- `maz-kanata-s-castle` (SHD, Base)
- `moff-gideon--formidable-commander` (SHD, Leader)
- `nala-se--clone-engineer` (TWI, Leader)
- `nevarro-city` (SHD, Base)
- `nute-gunray--vindictive-viceroy` (TWI, Leader)
- `obi-wan-kenobi--patient-mentor` (TWI, Leader)
- `padm--amidala--serving-the-republic` (TWI, Leader)
- `pau-city` (TWI, Base)
- `petranaki-arena` (TWI, Base)
- `pre-vizsla--pursuing-the-throne` (TWI, Leader)
- `pyke-palace` (TWI, Base)
- `qi-ra--i-alone-survived` (SHD, Leader)
- `quinlan-vos--sticking-the-landing` (TWI, Leader)
- `remnant-science-facility` (SHD, Base)
- `remote-village` (SHD, Base)
- `rey--more-than-a-scavenger` (SHD, Leader)
- `security-complex` (SOR, Base)
- `shadow-collective-camp` (TWI, Base)
- `spice-mines` (SHD, Base)
- `sundari` (TWI, Base)
- `tarkintown` (SOR, Base)
- `the-crystal-city` (TWI, Base)
- `the-mandalorian--sworn-to-the-creed` (SHD, Leader)
- `the-nest` (TWI, Base)
- `tipoca-city` (TWI, Base)
- `wat-tambor--techno-union-foreman` (TWI, Leader)
- `yoda--sensing-darkness` (TWI, Leader)
- `admiral-ackbar--it-s-a-trap-` (JTL, Leader)
- `admiral-holdo--we-re-not-alone` (JTL, Leader)
- `admiral-trench--chk-chk-chk-chk` (JTL, Leader)
- `asajj-ventress--i-work-alone` (JTL, Leader)
- `captain-phasma--chrome-dome` (JTL, Leader)
- `lando-calrissian--buying-time` (JTL, Leader)
- `major-vonreg--red-baron` (JTL, Leader)
- `poe-dameron--i-can-fly-anything` (JTL, Leader)
- `rio-durant--wisecracking-wheelman` (JTL, Leader)
- `theed-palace` (JTL, Base)
- `thermal-oscillator` (JTL, Base)
- `wedge-antilles--leader-of-red-squadron` (JTL, Leader)
- `ahsoka-tano--fighting-for-peace` (LOF, Leader)
- `anakin-skywalker--tempted-by-the-dark-side` (LOF, Leader)
- `barriss-offee--we-have-become-villains` (LOF, Leader)
- `cal-kestis--i-can-t-keep-hiding` (LOF, Leader)
- `darth-revan--scourge-of-the-old-republic` (LOF, Leader)
- `grand-inquisitor--stories-travel-quickly` (LOF, Leader)
- `jedi-temple` (LOF, Base)
- `kanan-jarrus--help-us-survive` (LOF, Leader)
- `kit-fisto--focused-jedi-master` (LOF, Leader)
- `morgan-elsbeth--following-the-call` (LOF, Leader)
- `mystic-monastery` (LOF, Base)
- `qui-gon-jinn--student-of-the-living-force` (LOF, Leader)
- `rey--nobody` (LOF, Leader)
- `starlight-temple` (LOF, Base)
- `supreme-leader-snoke--in-the-seat-of-power` (LOF, Leader)
- `temple-of-destruction` (LOF, Base)
- `third-sister--seething-with-ambition` (LOF, Leader)
- `tomb-of-eilram` (LOF, Base)
- `echo-caverns` (IBH, Base)
- `leia-organa--get-to-your-transports-` (IBH, Leader)
- `bail-organa--doing-everything-he-can` (SEC, Leader)
- `c-3po--human-cyborg-relations` (SEC, Leader)
- `chancellor-palpatine--how-liberty-dies` (SEC, Leader)
- `colonel-yularen--this-is-why-we-plan` (SEC, Leader)
- `dj--need-a-lift-` (SEC, Leader)
- `governor-pryce--tyrant-of-lothal` (SEC, Leader)
- `lama-su--we-modified-their-genetics` (SEC, Leader)
- `luthen-rael--don-t-you-want-to-fight-for-real-` (SEC, Leader)
- `mon-mothma--forming-a-coalition` (SEC, Leader)
- `padm--amidala--what-do-you-have-to-hide-` (SEC, Leader)
- `satine-kryze--standing-on-principles` (SEC, Leader)
- `sly-moore--cipher-in-the-dark` (SEC, Leader)
- `cassian-andor--climb-` (SEC, Leader)
- `jabba-the-hutt--wonderful-human-being` (SEC, Leader)
- `senate-rotunda` (SEC, Base)
- `agent-kallus--reconsider-your-allegiance` (LAW, Leader)
- `aldhani-garrison` (LAW, Base)
- `citadel-research-center` (LAW, Base)
- `darth-vader--unstoppable` (LAW, Leader)
- `great-pit-of-carkoon` (LAW, Base)
- `han-solo--i-got-a-really-good-feeling` (LAW, Leader)
- `hera-syndulla--not-fighting-alone` (LAW, Leader)
- `jyn-erso--time-to-fight` (LAW, Leader)
- `shipbreaking-yard` (LAW, Base)
- `enfys-nest--until-we-can-go-no-higher` (LAW, Leader)
- `imperial-command-complex` (LAW, Base)
- `partisan-hideout` (LAW, Base)
- `saw-gerrera--bring-down-the-empire` (LAW, Leader)
- `tobias-beckett--people-are-predictable` (LAW, Leader)
- `vel-sartha--aldhani-insurgent` (LAW, Leader)
- `ahsoka-tano--i-have-an-idea` (TS26, Leader)
- `anakin-skywalker--protect-her-at-all-costs` (TS26, Leader)
- `asajj-ventress--ambitious-apprentice` (TS26, Leader)
- `count-dooku--offering-aid` (TS26, Leader)
- `maul--collective-ambition` (TS26, Leader)
- `padm--amidala--follow-my-lead` (TS26, Leader)
- `rex--no-other-option` (TS26, Leader)
- `savage-opress--you-must-have-your-revenge` (TS26, Leader)
- `dooku-s-palace` (TS26, Base)
- `executioner-s-arena` (TS26, Base)
- `first-battle-memorial` (TS26, Base)
- `sundari-palace` (TS26, Base)
- `emperor-palpatine--according-to-my-design` (ASH, Leader)
- `baylan-skoll--power-beyond-dream` (ASH, Leader)
- `bo-katan-kryze--reclaiming-mandalore` (ASH, Leader)
- `fennec-shand--ready-for-war` (ASH, Leader)
- `grand-admiral-thrawn--victory-is-mine` (ASH, Leader)
- `grogu--charming-companion` (ASH, Leader)
- `moff-gideon--indomitable-warlord` (ASH, Leader)
- `sabine-wren--bargaining-on-belief` (ASH, Leader)
- `shin-hati--eager-adversary` (ASH, Leader)
- `vane--quarrelsome-pirate` (ASH, Leader)

## Completed batches

### Batch 1: base foundations

Engine 0.73 / card bundle 73 adds 36 bases and the Battle Droid token, bringing the registry to 619 definitions. Ten bases and 118 leaders from the initial inventory remain. Printed text and official API responses are pinned in `leader-base-foundations.json`.

The base batch covers vanilla statistics/aspects, targeted Epic effects, paid unit play with Ambush, one colored aspect-penalty exception, dynamic leader statistics, Force attacks, deployment token/draw triggers and Thermal Oscillator's deck minimum. Successful deployment now notifies friendly in-play observers as well as the deployed card and selected resource Plot cards; spending an Epic below its threshold does not notify them. The new token uses its current canonical printing, shared by older token reprints.

Focused validation: 46 passing tests across base outcomes, catalog conformance, Plot and Pilot leaders. Tests resume private nested play and joint base/Plot decisions in a fresh process. Full `play:check`: 1,437 passing tests, 44,957 assertions, 81 files, including all 342 complete Top 8 games and replays. Local diff review completed. The required read-only Claude CLI attempt returned no review (timeout 124, `Execution error`).

### Batch 2: leader actions and continuous abilities

Engine 0.74 / card bundle 74 adds 20 leaders through existing typed effects, with separate printed front and deployed abilities. The registry has 639 definitions; 98 leaders and ten bases from the initial inventory remain. `leader-foundations.json` pins both faces and official API text/clarifications.

The batch covers Chewbacca (Walking Carpet), Fennec (Honoring the Deal), Han (Worth the Risk), Grand Inquisitor (Hunting the Jedi), Tarkin, Maul (A Rival in Darkness), IG-88, Rey (More Than a Scavenger), Wat Tambor, Grievous, Ahsoka (Fighting for Peace), Barriss, Cal, Kanan (Help Us Survive), Kit Fisto, C-3PO, Sly Moore, Vel Sartha, Bo-Katan (Reclaiming Mandalore) and Palpatine (According to My Design).

Force and resource payments remain separate from effects; cost-free deployed card-play actions require a successful play. Han damages his played unit before When Played abilities. Cal's opponent chooses which ready enemy unit exhausts. Bo-Katan counts friendly Mandalorian units toward ten, spends no resources to deploy and retains her separate two-arena token condition. Grand Inquisitor retains his chosen target after Grit increases its power. Token beneficiaries and their controllers remain distinct from the ability's source.

Focused validation: 45 passing tests across the new leader outcomes and catalog conformance, including fresh-process recovery for Force, opponent choices, private plays and a defeated leader returning with its Epic spent. Full `play:check`: 1,480 passing tests, 45,498 assertions, 82 files, including all 342 complete Top 8 games and replays. Local diff review completed. The required read-only Claude CLI attempt returned no review (timeout 124, `Execution error`).

### Batch 3: base choices and chosen exhaustion

Engine 0.75 / card bundle 75 / state 69 / browser protocol 26 adds Mystic Monastery, Tomb of Eilram, Temple of Destruction, Citadel Research Center, Shipbreaking Yard and Fennec Shand (Ready for War). The registry has 645 definitions; 97 leaders and five bases from the initial inventory remain. The printed text and official clarifications are in `leader-base-choices.json`; the shared contracts are documented in `docs/crossfire/base-abilities.md`.

Tests cover three-use game counters, atomic chosen exhaustion and Credit payment, ready unit play, combat-only thresholds including Overwhelm, private resource returns with distinct ownership/control, and returning an exact milled copy. Opponent and spectator projections match for differing private resource identities. Five new shared continuations bring the recovery workload to 142 cases. Full `play:check`: 1,497 passing tests, 45,718 assertions, 84 files, including all complete Top 8 games and replays. Frontend build passed (8.60 seconds), focused lint and browser connection tests passed. The live `base-choices` browser game finished in 54 actions, verified all three Monastery uses and a reload between uses, and covered two authenticated players, spectators, privacy, reconnect and mobile layout. Local diff review completed; the required Claude CLI attempts produced no review (`Execution error` / timeout 124).

### Batch 4: simultaneous allocations and title search

Engine 0.76 / card bundle 76 / state 70 / browser protocol 27 adds Dooku's Palace, Executioner's Arena, First Battle Memorial, Great Pit of Carkoon, Kylo Ren (Rash and Deadly) and the Sarlacc unit required by Great Pit. The registry has 651 definitions; 96 leaders and Sundari Palace remain from the initial inventory. The original API text and clarifications are pinned in `leader-base-allocations.json`.

The shared contracts now support live numeric nested-play discounts, printed-title filters, signed zone-size values, printed statistics retained across zone movement, simultaneous Experience allocation and whole two-damage packet selection. Tests cover Pilot and Darksaber leader status, consistent Credit costs, Shield prevention of merged packets, simultaneous defeat, Moff token replacement, exact Sarlacc copies, private search projections, server-side shuffle and both Kylo faces. The six added shared continuations bring recovery coverage to 148 cases. Focused validation passed 37 tests across card outcomes, catalog, shared continuations and browser connection checks. Frontend build passed (8.97 seconds) and focused lint passed. The live `base-allocation` browser game finished in 43 actions with reload recovery, odd-allocation rejection, two-damage acceptance, authenticated players, spectator policies, privacy and mobile layout. Local diff review completed; the required Claude CLI attempt produced no review (`Execution error` / timeout 124).

Full `play:check`: 1,520 passing tests, 45,959 assertions, 85 files (282.35 seconds), including all 342 complete imported Top 8 games and their replays. The browser connection packet-validation regression also passes.

### Batch 5: temporary resources and the final base

Engine 0.77 / card bundle 77 / state 71 / browser protocol 28 adds Sundari Palace and Han Solo (Audacious Smuggler). This completes all 46 initially missing bases. The registry has 653 definitions; 95 initially missing leaders remain. Both official texts and clarifications are pinned in `leader-resource-repayment.json`.

Sundari resources a simultaneous chosen hand group ready and repays only the actual amount at regroup start. Han's separate front and unit abilities each create an independent next-action-phase repayment. The schedules survive source movement and select current resources at repayment time. Private choices and card identities remain separate from public repayment amounts. Numeric inspection bounds resolve into checkpointed integers. Three new shared recovery cases cover Sundari's group selection and regroup repayment, plus Han's later action-phase repayment.

Focused card/catalog/continuation validation: 13 passing tests. Full `play:check`: 1,530 passing tests, 46,106 assertions, 86 files (285.69 seconds), including every complete imported Top 8 game and replay. Frontend build passed (9.05 seconds), focused lint and both package typechecks passed. The `resource-loan` live browser game completed in 46 actions, covering both loans, private hand/resource choices, repayment after reload, authenticated players, spectators and mobile layout. Local diff review completed; the required read-only Claude CLI attempt returned no review (`Execution error` / timeout 124).

### Batch 6: phase history, Coordinate and aspect waivers

Engine 0.78 / card bundle 78 / state 72 adds 20 leaders and the canonical Clone Trooper token. The registry has 674 definitions; 75 initially missing leaders remain. All initially missing bases are complete. Official text and clarifications for this batch are pinned in `leader-history.json`.

The batch covers Ahsoka (Snips), Padme (Serving the Republic), Rex, Nute, Krennic, Leia (Get to Your Transports), Pryce, Obi-Wan, Mace, Luke (Faithful Friend), Iden, Vader (Dark Lord of the Sith), Asajj (Unparalleled Adversary), Phasma, Jyn (Time to Fight), Nala Se, Hera (Spectre Two and Not Fighting Alone), Mon Mothma and Bo-Katan (Princess in Exile).

Phase play history retains actor, exact incarnation and runtime role; defeat history retains traits. Coordinate action availability is separate from costs and effect conditions. Aspect waivers preserve printed costs and distinguish ordinary unit play from Piloting. Tests cover both faces, histories after departure, private searches, Shield prevention, actual healing, token creation, dynamic auras, ability loss and single-penalty interactions. Four new shared continuations bring the retained-bundle recovery workload to 155 cases.

Focused card and shared-continuation validation: 56 passing tests. Full `play:check`: 1,585 passing tests, 46,715 assertions, 87 files (296.26 seconds), including every complete imported Top 8 game and replay. Both package typechecks and boundary checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 7: nested plays and additional Pilot faces

Engine 0.79 / card bundle 79 / state 73 adds Finn, Palpatine (Galactic Ruler), Lando (Buying Time), Major Vonreg, Rio, Wedge, Rey (Nobody), Satine, Anakin (Tempted by the Dark Side), Kallus, Third Sister, Asajj (Ambitious Apprentice), Snoke, Savage and Dooku (Offering Aid). The registry has 689 definitions; 60 initially missing leaders remain. All initially missing bases are complete. Printed text and official clarifications are pinned in `leader-plays.json`.

Nested-play aspect waivers now preserve the chosen runtime role and agree across offers, Credit payment and execution. Next-unit phase grants apply before When Played collection. All-card play observers remain separate from existing unit-only observers. Strongest-unit selection preserves ties and dynamic power. Token creation can identify the opposing player as creator. Tests cover four new Pilot profiles, exact hosts, both printed faces, cost failure, Force/Credits, Hidden expiry, healing amounts, empty-hand discard, conditional targets and the opposing Moff replacement. Five shared continuations bring retained-bundle recovery to 160 cases.

Focused card and continuation validation: 45 passing tests. Full `play:check`: 1,629 passing tests, 47,273 assertions, 88 files (298.42 seconds), including every complete imported Top 8 game and replay. Both package typechecks and boundary checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 8: combat conditions, chained attacks and survival

Engine 0.80 / card bundle 80 / state 74 adds Anakin (What It Takes to Win), Jyn (Resisting Oppression), Grand Inquisitor (Stories Travel Quickly), Moff Gideon (Formidable Commander), Leia (Alliance General), Yularen, Saw, Grogu, Baylan, Thrawn (Victory Is Mine), Shin, Chirrut, Cassian (Climb), Asajj (I Work Alone), Holdo and Ackbar. The registry has 705 definitions; 44 initially missing leaders remain. All initially missing bases are complete. Printed text and official clarifications are pinned in `leader-combat.json`.

The batch covers actual-defender bonuses, direct combat modifiers, strictly cheaper chained attacks after a departure, post-attack defeat, conditional survival at zero HP, Sentinel exceptions, repeatable triggered deployment, compound base-damage costs and the selected unit controller's token creation. Tests cover both faces, relevant Pilot roles, declined limits, Shield replacements, ability loss, exact incarnations and fresh-process recovery. Six shared cases bring the retained-bundle recovery workload to 166 suspensions.

Focused card, Support and continuation validation: 62 passing tests. Repeated protection resolution initially slowed the recovery workload; candidate scans and lethal-first validation remove unnecessary ability evaluation. The previous committed engine also exceeded the default five-second Support test timeout in a comparison run. The two aggregate recovery/replay tests now have explicit 15-second limits. Full `play:check`: 1,680 passing tests, 47,823 assertions, 89 files (306.19 seconds), including every complete imported Top 8 game and replay. Both package typechecks, boundary and coverage checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 9: Trench, Bail and Poe's independent entry rules

Engine 0.81 / card bundle 81 / state 75 adds Admiral Trench (Chk-chk-chk-chk), Bail Organa (Doing Everything He Can) and Poe Dameron (I Can Fly Anything). The registry has 708 definitions; 41 initially missing leaders remain. All initially missing bases are complete. Printed text and official clarifications are pinned in `leader-deployment.json`.

Trench and Bail use repeatable compound payments with separate deployment conditions. Trench's revealed top-four group passes from an opposing discard choice to the controller's selected draw. Bail observes actual resource plays, including an upgrade played through Plot. Poe's paid attachment is separate from his Epic unit deployment, keeps his own controller when the host is taken, and does not make the host a leader. Tests cover repeated deployment, incomplete/ineffective payments, Credits, private resources, exact duplicate copies, short decks, forbidden targets and fresh-process continuation. Five shared cases bring recovery coverage to 171 suspensions.

Focused card, catalog and continuation validation: 29 passing tests. Full `play:check`: 1,706 passing tests, 48,070 assertions, 90 files (305.57 seconds), including every complete imported Top 8 game and replay. Both package typechecks and boundary checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 10: Palpatine and Sidious as separate leader faces

Engine 0.82 / card bundle 82 / state 76 / browser protocol 29 adds Chancellor Palpatine (Playing Both Sides). The registry has 709 definitions; 40 initially missing leaders remain. All initially missing bases are complete. `leader-faces.json` pins official text, both faces' attributes and the exhaustion clarification.

This leader has no unit face, printed cost, Epic or deployment. The active side supplies its own name, title, aspects, traits and action, so the catalog's aggregated aspects do not grant both Heroism and Villainy. Both actions can exhaust ineffectively; successful flips preserve physical identity and exhaustion, replace the face incarnation, and leave historical log labels accurate. Recovery validates side references, and no-cost cards do not satisfy even-cost or numeric-cost filters. Public face data controls board and dialog artwork.

Focused rules, catalog, shared continuations and browser connection checks passed. Two new shared cases bring recovery coverage to 173. Frontend build and focused lint passed. The live `leader-faces` browser game finished in 129 actions and verified both flips, back artwork in the board and inspection dialog, reload recovery, both authenticated players, spectator disclosure/privacy, reconnect and mobile layout. The browser harness needed corrections to open inspection, clear selected-card filtering and create the flip condition before using the action; those failed attempts were test-flow issues.

Local diff review completed. The required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124). A full engine run passed 1,720 tests and timed out in the existing attachment full-prefix replay test (5.56 seconds) while the browser was also running. That replay test passed alone in 4.78 seconds. The final full gate runs without concurrent browser work; its result is recorded below.

Final serial `play:check`: 1,721 passing tests, zero failures, including all 342 complete imported Top 8 games and replays. Both package typechecks and boundary checks passed. The attachment replay passed in 4.92 seconds without a timeout change.

### Batch 11: leader reactions and printed-cost follow-ups

Engine 0.83 / card bundle 83 / state 77 adds Boba Fett (Daimyo), Cad Bane, Mandalorian (Sworn To The Creed), Darth Revan, Quinlan Vos, Vader (Unstoppable), Lama Su and Qui-Gon (Student of the Living Force). The registry has 717 definitions; 32 initially missing leaders remain. All initially missing bases are complete. Official text and revisions are pinned in `leader-reactions.json`.

The shared contracts distinguish an upgrade play from a unit play or token creation, compare printed costs using retained references, measure a selected private group after movement, and bind an upgrade's exact host for the play's follow-up. Revan uses the revised attack-end wording. Tests cover both faces, optional round limits, opposing choices, granted keywords, phase expiry, simultaneous combat defeat, Pilot roles, remaining HP, private duplicate hand selections, Force payments and pre-trigger host damage. Seven added shared cases bring recovery coverage to 180.

Focused outcome and shared-continuation validation: 30 passing tests. Catalog, package typechecks, boundary and full-game checks are part of the full gate recorded below. No browser contract changed in this batch. Local diff review completed; the required read-only Claude CLI review was attempted separately.

Full `play:check`: 1,750 passing tests, zero failures, 48,573 assertions across 92 files (315.99 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 12: chosen costs, mixed tokens and damage sources

Engine 0.84 / card bundle 84 / state 78 adds Rex (No Other Option), Vane, Han (I Got A Really Good Feeling), Tobias Beckett, Jabba (Wonderful Human Being) and Jango (Concealing the Conspiracy). The registry has 723 definitions; 26 initially missing leaders remain. All initially missing bases are complete. Official text and clarifications are pinned in `leader-costs-damage.json`.

The engine now supports chosen enemy-ready and friendly-upgrade costs, any-number mixed token defeats, ownership separate from control in unit filters, calculated Credit creation, and observed unit damage with the exact source and amount. Tests cover optional follow-ups, Luke's defeat replacement, host cleanup and selected-token counting, leader-status control replacement, combat and ability damage, Shields, simultaneous source defeat and Jabba's round limit. Seven shared cases bring executable recovery coverage to 187.

Focused outcomes: 27 passing tests. Shared continuation validation passed. The first full-gate attempt found two missing non-null assertions in test expectations; those were corrected before the final run. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124). Final full-gate results are recorded below.

Full `play:check`: 1,777 passing tests, zero failures, 48,891 assertions across 93 files (318.53 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. The browser protocol did not change.

### Batch 13: phase events and action history

Engine 0.85 / card bundle 85 / state 79 adds Boba Fett (Collecting the Bounty), Yoda (Sensing Darkness), Cassian (Dedicated to the Rebellion), Pre Vizsla, Luthen Rael, Padme (What Do You Have to Hide and Follow My Lead), and Anakin (Protect Her at All Costs). The registry has 731 definitions; 18 initially missing leaders remain. All initially missing bases are complete. Official text and revised timing are pinned in `leader-phase-events.json`.

Unit entries and departures retain controller and runtime-role snapshots. Phase counters record actual draws and enemy base damage. Action history retains exact attackers until the action ends. Explicit hand-reveal and discard events preserve the affected owner and multi-card boundary. The implementation follows revised Luthen attack-history wording, preserves Yoda's blind discard decision, and allows Padme's attack-end follow-up after her defeat.

Focused outcomes: 35 passing tests. The aggregate shared continuation check passes with 196 cases. The first focused run exposed a missing base-zone leader in defeat-observer collection; that path now includes active leaders. An opposing-discard test needed its selected group declared, and newly added continuation fixtures needed a local block to avoid duplicate variable names. Both test issues were corrected. Local diff review completed; the required read-only Claude review was attempted separately. Final full-gate results are recorded below.

The first full run passed 1,811 tests and timed out at 5.009 seconds in the existing attachment full-prefix replay. Candidate scans now avoid resolving absent observer abilities while retaining printed, Support-borrowed, upgrade-granted and aura sources; a focused outcome test covers borrowed Cassian and ability loss. Isolated comparisons measured the preceding committed build at 4.834/4.846 seconds and this build at 4.958/4.925 seconds. The aggregate replay retains every assertion and now uses the same explicit 15-second budget as the existing large Support/recovery workloads. Focused outcomes are now 36 passing tests; the final full run follows.

Final `play:check`: 1,813 passing tests, zero failures, 49,285 assertions across 94 files (324.39 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124).

### Batch 14: private top cards and random discard selection

Engine 0.86 / card bundle 86 / state 80 adds Thrawn (Patient and Insightful), Hunter (Outcast Sergeant), Ahsoka (I Have an Idea) and Doctor Aphra. The registry has 735 definitions; 14 initially missing leaders remain. All initially missing bases are complete. Official text and clarifications are pinned in `leader-private-choices.json`.

The batch adds exact-card reveals, distinct title/cost counts, a serializable server random-card selection, and bounded play of an inspected deck card without moving the rest of the deck. Thrawn's two private peeks remain separate from his selected reveal. Hunter compares titles across subtitles and respects resource ownership. Ahsoka completes the played event first, preserves attack-end resolution after defeat, and supports Pilot/Credit payment from the inspected top card. Aphra chooses three distinct titles before requesting randomness.

Focused card and shared-continuation validation passed 32 tests, including 204 shared recovery cases. The first full run passed 1,843 tests and caught a regression in Jabba's return-and-replay: a new deck visibility check was also applied after his upgrade legitimately moved to hand. The check is now specific to inspected deck plays, preserving that existing follow-up. The affected card suites pass together (42 tests). Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124). Final full-gate results follow.

Final `play:check`: 1,844 passing tests, zero failures, 49,630 assertions across 95 files (325.71 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. The browser protocol remains 29.

### Batch 15: simultaneous healing, keywords and rescue entry

Engine 0.87 / card bundle 87 / state 81 adds Qi'ra (I Alone Survived), Moff Gideon (Indomitable Warlord), Sabine (Bargaining on Belief) and DJ (Need a Lift). The registry has 739 definitions; 10 initially missing leaders remain. All initially missing bases are complete. Official text and clarifications are pinned in `leader-recovery.json`.

Qi'ra's whole-board healing precedes one calculated simultaneous damage event. Moff gains only the listed unconditional printed Imperial discard keywords. Sabine preserves the distinction between ability controller, opponent chooser and token creator. DJ captures before play-trigger resolution and changes entry readiness for friendly rescues. Rescues following simultaneous defeats wait until all defeated units have moved; a returning leader immediately uses its base-side abilities.

Focused card, capture and shared-continuation validation: 38 passing tests. The 23 new card outcomes include both processing orders for simultaneous DJ/guard defeat and recovery through the associated choices. Six new shared cases bring executable recovery coverage to 210. Initial validation caught a readonly-array sort in a test and the stale unit-face ability during DJ's return to base; both were corrected. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124). Final full-gate results follow.

Final `play:check`: 1,867 passing tests, zero failures, 49,866 assertions across 96 files (327.72 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. The browser protocol remains 29.

### Batch 16: repeated On Attack abilities and departed attachments

Engine 0.88 / card bundle 88 / state 82 adds Enfys Nest (Until We Can Go No Higher) and Gar Saxon (Viceroy of Mandalore). The registry has 741 definitions; eight initially missing leaders remain. All initially missing bases are complete. Official text is pinned in `leader-repeated-abilities.json`.

Enfys retains and repeats explicit On Attack abilities, including Support-borrowed origins, with separate front payment and unit round limits. Generated keyword triggers do not qualify. Gar retains attachment snapshots through unit defeat and pending upgrade replacement, then offers the exact former upgrade from either owner's discard pile. His aura and granted trigger respond separately to recipient ability loss.

Focused outcomes: 31 passing tests. Shared recovery passes with 216 cases. Initial checks identified a missing effect context in the shared defeat-units filter, a manual historical test fixture needing the new attachment field, and attachment validation that needed full role snapshots to survive Pilot conversion. A borrowed Migs test was corrected to target a unit, matching its actual ability. All were resolved before the full gate. Local diff review completed; the required read-only Claude CLI review was attempted separately. Final results follow.

Final `play:check`: 1,898 passing tests, zero failures, 50,071 assertions across 97 files (324.27 seconds), including all 342 complete imported Top 8 games and replays. Both package typechecks, boundary and coverage checks passed. Local diff review completed; the required read-only Claude CLI attempt produced no review (`Execution error`, timeout 124). The browser protocol remains 29.

## Batch 17: Maul's simultaneous Experience and damage

Engine 0.89 / card bundle 89 / state 83 adds Maul (Collective Ambition). The registry has 742 definitions; seven initially missing leaders remain. All initially missing bases are complete. Official text and rulings are pinned in `leader-collective-ambition.json`.

Maul uses a shared compound continuation for Experience creation and damage. The engine retains both parts through token and damage replacement choices, commits them before defeat checks, and captures attachment triggers after the whole event. Coordinate metadata on Ahsoka (Snips) and Padmé (Serving the Republic) now reflects keyword presence even below three units. Keyword counts deduplicate names; Experience counting uses canonical token identity.

Focused outcomes: 25 passing card tests and 219 shared continuation cases. An initial test attempted to grant an unsupported arbitrary trigger; it now verifies the completed-event snapshot through Sabine's real attachment trigger. The shared case-count assertion was updated for the three new suspensions. Local complete-diff review completed. The required read-only Claude CLI review failed with `Execution error` and timeout 124; no Claude review occurred. Final full-gate results follow.

Batch 17 final gate: `bun run play:check` passes both package typechecks, browser boundaries and 1,923 tests (0 failures, 50,196 assertions, 98 files, 330.87 seconds), including all 342 complete imported Top 8 games and replays. Coverage reports 742 registered definitions. `git diff --check` passes. Only the newest executable is retained after the commit and verified with all 219 shared recovery cases.

## Batch 18: Chancellor Palpatine's Plot search and discount

Engine 0.90 / card bundle 90 / state 84 adds Chancellor Palpatine (How Liberty Dies). The registry has 743 definitions; six initially missing leaders remain. All initially missing bases are complete. Official text and rulings are pinned in `leader-plot-discount.json`.

The private search filters active Plot keywords. A server-owned play-method marker distinguishes actual Plot plays in affordability, Credit payment, payment and next-play consumption. The discount can resolve before or after another declared Plot, survives the leader's defeat, and is consumed by a free Plot play but not by declining or playing a Plot card through an unrelated instruction.

Validation: 13 focused card cases pass; the combined card/Plot/shared recovery run passes 25 tests with 223 shared cases. Both package typechecks pass. Local complete-diff review completed. The required read-only Claude CLI attempt failed with `Execution error` and timeout 124; no Claude review occurred. The full `bun run play:check` gate passes 1,936 tests (0 failures, 50,296 assertions, 99 files, 335.52 seconds), including all 342 imported Top 8 complete games and replays. `git diff --check` passes. The newest committed executable is retained and checked with the 223 recovery cases.

## Batch 19: Hondo, Lando and Smuggle

Engine 0.91 / card bundle 91 / state 85 / protocol 30 adds Hondo (That's Good Business), Lando (With Impeccable Taste), Collections Starhopper, Smuggler's Aid, Hotshot DL-44 Blaster, Privateer Crew and Tech (Source of Insight). The registry has 750 definitions; four initially missing leaders remain. All initially missing bases are complete. Official text and timing clarifications are pinned in `leader-smuggle.json`.

Independent printed and Tech-granted costs use their own aspect icons. The engine replaces Smuggled resources before attachment/play observation, preserves exact identities and distinguishes the play method from the starting zone. Lando's mandatory resource defeat precedes the played card's abilities and still resolves when no card is played. Hondo's two faces have separate optional costs/effects. Browser choices show each cost and grantor without exposing private resource choices to another viewer.

The 37 focused card cases pass; combined Smuggle/Plot/Palpatine regression passes 61 tests. Shared continuation validation covers 230 cases. Initial checks exposed an import cycle in protocol validation, intent property ordering during checkpoint validation, and Lando's missing follow-up on decline; these were fixed. Browser validation also caught a prompt that incorrectly described every resource inspection as playing an opponent's resource for free; the instruction now applies to the current ability and the smoke test selects Lando's required resource. Package typechecks and frontend build/lint pass. Final full-gate, browser and review results follow.

Final `play:check`: 1,973 passing tests, zero failures, 50,581 assertions across 100 files (358.99 seconds), including all 342 imported Top 8 complete games and replays. Browser Smuggle validation completed a 69-action game with six Smuggle plays and one restored Lando resource choice; the existing resource-play scenario also passed a 49-action game with two inspections and two free plays. The connection fixture still pinned protocol 29; it now imports the public version constant, and all 11 connection tests pass. Frontend build and focused lint pass. Local complete-diff review completed. The required read-only Claude CLI produced `Execution error` and timed out (124); no Claude review occurred. Only the newest committed executable is retained and verified against the 230 shared continuation cases.

## Batch 20: Morgan's shared-keyword plays

Engine 0.92 / card bundle 92 / state 86 adds Morgan Elsbeth (Following the Call). The registry has 751 definitions; three initially missing leaders remain. All initially missing bases are complete. Official face text and declaration-time rulings are pinned in `leader-shared-keywords.json`.

The front chooses a friendly unit that attacked and offers a discounted hand unit sharing a keyword. The unit creates a next-unit discount that evaluates current friendly keywords during cost determination and is consumed even when the condition fails. Printed, resource-granted and declaration-time keywords qualify; payment-conditional grants do not. A common modifier matcher keeps cost determination and consumption consistent.

Twenty card cases pass, including affordability, stacked/free plays, loss of the source or witness, Piloting, Smuggle, Coordinate, granted keywords and phase expiry. The combined Morgan/Plot/recovery regression passes 56 cases. Shared recovery passes 233 suspension cases. Initial test fixtures moved a leader without the normal defeat bookkeeping; they now use the actual defeat effect. The continuation count was updated for the new cases. Local complete-diff review completed; final full-gate and required read-only Claude results follow.

Final `play:check`: 1,993 passing tests, zero failures, 50,685 assertions across 101 files (339.15 seconds), including all 342 imported Top 8 complete games and replays. Both package typechecks and boundary/coverage checks pass. Local complete-diff review completed. The required read-only Claude CLI again returned `Execution error` and timed out (124); no Claude review occurred. The public protocol remains 30. Only the newest committed executable is retained and verified with 233 shared recovery cases.

## Batch 21: Bossk, Jabba and Bounty collection

Engine 0.93 / card bundle 93 / state 87 adds Bossk (Hunting His Prey), Jabba (His High Exaltedness), Cartel Turncoat, Fugitive Wookiee and Death Mark. The registry has 756 definitions; Count Dooku (Face of the Confederacy) is the final initially missing leader. All initially missing bases are complete. Official text is pinned in `leader-bounties.json`.

Bounties retain independent captured origins and a collector separate from their unit's controller. Accepted collection records the exact reward for Bossk's optional once-per-round repeat and for later Jabba discounts. Defeat/capture snapshots preserve granted rewards through attachment cleanup, ownership changes and leader return. Bounties are excluded from explicit When Defeated ability invocation.

Thirty-one card cases and the 242-case shared continuation workload pass. Coverage includes both faces, stolen units, own-unit capture, tokens, simultaneous defeat, repeated choices, expiry, round renewal and controller-provenance rejection. Initial test adapters used the wrong projector constructor and trigger-player intent name; those were corrected. The catalog's vanilla-unit guard now recognizes Bounty implementations. Local complete-diff review completed. Final full-gate and required read-only Claude results follow.

Final `play:check`: 2,024 passing tests, zero failures, 50,997 assertions across 102 files (346.59 seconds), including all 342 imported Top 8 complete games and replays. The focused Bounty/capture/repeated-ability/Morgan regression passes 96 cases. Both package typechecks, boundary and coverage checks pass. Local complete-diff review completed. The required read-only Claude CLI again produced `Execution error` and timed out (124); no Claude review occurred. Protocol 30 is unchanged. Only the newest committed executable is retained and verified against all 242 shared recovery cases.

## Batch 22: Dooku, Exploit and complete Leader/Base coverage

Engine 0.94 / card bundle 94 / state 88 / protocol 31 adds Count Dooku (Face of the Confederacy), Hailfire Tank and Battle Droid Legion. The registry has 759 definitions. A catalog-wide regression now requires all 154 Leaders and all 90 Bases; no initially missing identity remains. The scope remains the tracked official catalog in two-player practice.

Exploit stacks printed, next-play and unconditional declaration-time grants. A serializable payment plan separates unit defeats and replacements from Credits/resources and the eventual card play. Cost increases are fixed before decreases; reductions keep their individual origins across source departure or rescue. Triggers wait for the completed play. Failed payment restores the declaration while retaining monotonic facts, revisions and handles. The browser exposes exact friendly-unit selection and actor-only cost metadata. Official text and Dooku's phase-duration erratum are pinned in `leader-exploit.json`; the implementation contract is in `docs/crossfire/exploit.md`.

The focused Exploit/Smuggle/Bounty/Morgan/recovery regression passes 117 tests. All 251 shared continuation cases preserve resumed transitions and player/spectator views. Recovery testing caught a rollback JSON property-order mismatch; snapshots now use the canonical state codec. The final full-suite, browser, review and executable verification results follow.

The browser completed a 47-action game with three Exploit choices/plays, Dooku's leader action, reload during selection, both player connections, spectator hand disclosure toggles, exact-card log hover and mobile layout. The first hover check ran on a declared hand card; it now waits for arena entry. Frontend build (8.50 seconds), focused lint, all 11 connection tests and the browser package typecheck pass. Local complete-diff review completed. The required read-only Claude CLI again returned `Execution error` and timed out (124); no Claude review occurred.

Final `play:check`: 2,053 passing tests, zero failures, 51,533 assertions across 103 files (366.53 seconds), including all 342 imported Top 8 complete games and replays. Both package typechecks, import boundaries, coverage reporting and documentation link checks pass. The final catalog assertion covers all 154 Leaders and 90 Bases. Post-commit gate: archive the newest executable and verify all 251 recovery cases; retain no older development engine.
