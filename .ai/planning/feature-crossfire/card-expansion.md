# Crossfire recent-meta card expansion

User scope: implement the 200 most included cards in the last 90 days of
SWUBASE tournament decks, then every additional card in the winning decks from
the last two weeks, so those complete decks can play each other. Visual redesign,
chat and replay UI follow this card-coverage task. Continue the original engine
and one canonical implementation file per card. Commit each verified batch.

## Top 8 expansion (in progress)

The follow-up request extends the same August 26–September 9 window to every
available final Top 8 deck, including sideboards. The read-only local extraction
pins 344 public records across 43 imported Premier tournaments, with placements
1–8 for each event. It retains the original ranking and winner records exactly.
There are 342 complete lists: Redlands first place and Écija eighth place lack
card lists; 19 other events still lack imported final results. Missing data must
remain visible rather than being counted as playable.

The expanded ranking-plus-Top-8 union contains 551 identities. Initially 304 are
implemented and 247 need implementation; 174 of the 342 complete lists are
already supported. The registry has 335 total definitions. Implement the new
cards in validated batches, favoring inclusion frequency and shared mechanics,
with a separate canonical file and printed-text conformance for every card.
Extend common rules primitives as needed; never admit partial implementations.

`play:targets` now reports per-deck placement, sideboard support, complete-list
status and missing final placements alongside the original winner counts.
`meta-tournament-games.test.ts` plays and replays each complete supported Top 8
list against another, using only projected choices. As coverage grows, each newly
supported list automatically joins that gate. Specific card outcomes and recovery
remain separate acceptance checks. Preserve the original engine and commit each
verified batch, retaining only the newest executable archive.

Use `swubase-card-implementator`, `swubase-online-play`, `swubase-card-catalog`,
`swubase-decks`, `swubase-validation`, `swubase-change-review` and
`swubase-documentation`; add boundary skills only when new mechanics require
changes to API, projection, frontend or storage contracts.

The target expansion passes typechecking, boundary checks, both source-coverage
tests and all 174 supported Top 8 full-game replay cases. The full suite had 758
passing tests and one existing Latts replay timeout at 5.10 seconds; its focused
rerun passed all eight tests, including that replay at 4.83 seconds. No engine
behavior changed in this extraction step. Claude review timed out with an
execution error; local extraction, fixture and test diff review completed.

### Top 8 batch 1: foundations

Adds 49 dedicated definitions: vanilla bases/units, keyword combinations,
five Force attack bases, Vergence Temple, three Epic penalty-discount bases,
Independent Smuggler and Hera Piloting, Knight's Saber and Unveiled Might.
Printed text, official unique flags and source URLs are pinned in
`top8-foundations.json`. All use existing engine primitives.

Coverage is now 353/551 target identities, 384 registered definitions and
201 complete Top 8 decks. `play:check` passes 829 tests / 26,259 assertions,
including all 201 full-game replay cases and 43 new card outcome scenarios.
The latter cover Force ownership, remaining HP, Epic usage/penalties, Hidden
expiry, Raid/Restore, Sentinel/Saboteur, Support/Grit, Pilot host grants,
attachment restrictions, Plot replacement and three fresh-process Ambush
choices. Engine 0.46.0 / card bundle 46; state 44 and browser protocol 22 remain
unchanged. Claude review failed to produce a result; local rules/diff review
completed.

### Top 8 batch 2: choices and effects

Adds 30 dedicated definitions, including Mother Talzin, Luke's healing leader,
Chirrut, Jam Communications, Jod, AT-ST Raider, Fulminatrix, Bendu, DRK-1, Leia,
Razor Crest, One Must Destroy to Create, Bog Down in Procedure, capture,
regroup effects and Force-based healing/plays. Attack declaration now captures
both combatants as exact bindings for On Attack/On Defense triggers. Card text,
unique flags and official source URLs are pinned in `top8-effects.json`.

Coverage is 383/551 target identities, 414 registered definitions and 216
complete Top 8 decks. `play:check` passes 876 tests / 27,887 assertions,
including all 216 full-game replay cases, 32 new outcome scenarios and 38 shared
continuation cases. Scenarios cover both leader faces and costs, departed
attackers, private discard choices, optional payments, borrowed abilities,
exact-card free play, Disclose bindings, simultaneous damage and capture.
Engine 0.47.0 / card bundle 47; state 44 and browser protocol 22 remain unchanged.
Claude review timed out with an execution error; local card/rules/diff review
completed. Both missing deck records have no imported decklist GUID; public
Melee rechecks for Écija (441488) and Redlands (449449) returned HTTP 403 on
September 10, so those gaps remain explicit.

### Top 8 batch 3: attachments and combat conditions

Adds Blade of Talzin, Axe Woves, Heroic Purrgil, 8D8, Liberty, R5-D4,
Pong Krell and The Desolation of Hoth. Automatic all-upgrade selection uses
printed costs (including a Pilot's printed unit cost), captures exact hosts,
and returns cards to their owners. Blade checks the former host's traits and
controller after departure. Ambush attacks carry explicit state, independent
of possessing the keyword. Pong checks survival and strict remaining HP against
its power after combat; Hoth chooses distinct targets before simultaneous defeat.

Coverage is 391/551 target identities, 422 definitions and 228 complete Top 8
decks. `play:check` passes 902 tests / 29,734 assertions, including fourteen
new outcome scenarios, forty shared continuation cases and all 228 supported
full-game replay cases. The existing 160-input Latts prefix replay test now has
a 30-second correctness-test allowance after repeated five-second timeouts;
the final full run passes. Engine 0.48.0 / card bundle 48 / state 45; browser
protocol remains 22. Claude review timed out with an execution error; local
card/rules/diff review completed. Official card text and identity are pinned in
`top8-attachments.json`. Remaining target identities and source gaps stay explicit.

### Top 8 batch 4: tokens, payments and searches

Adds 37 dedicated definitions using existing engine primitives, including
Executor, Halo, Zuckuss, Galleon, Paige Tico, Force Illusion, token/credit
creation, optional resource and Force payments, exact-card hand discards,
constrained searches and attack modifiers. The official text and unique flags
are pinned in `top8-tokens.json`.

Coverage is 428/551 target identities, 459 definitions and 238 complete Top 8
decks. `play:check` passes 949 tests / 30,948 assertions, including 37 new card
outcome scenarios and all 238 supported full-game replay cases. Scenarios cover
optional costs, controller/role boundaries, departed sources, friendly and enemy
targets, token entry triggers, phase expiry, private selection and fresh-process
recovery. Engine 0.49.0 / card bundle 49; state 45 and browser protocol 22 are
unchanged. Claude review timed out without a review result; local card/rules/diff
review completed. The remaining 123 target identities and recorded source gaps
stay explicitly unsupported or incomplete.

### Top 8 batch 5: conditions, leaders and phase prohibitions

Adds 25 dedicated definitions, including Rose Tico, Obi-Wan Kenobi, Avar Kriss,
Darth Vader's damage leader, Grogu, Purrgil Ultra/King, conditional Sentinel and
Restore, Pilots excluded by printed role, and phase-duration naming. Exact-unit
filters distinguish a physical card's current incarnation, attack history and
attached tokens. Avar's deployment uses resource count plus recorded Force uses,
separately from payments. Grogu chooses one unit, heals up to two actual damage,
then uses the healed amount for a distinct damage choice. Transmission Jamming
stores its own duration and affects both players after its event enters discard;
existing source-dependent restrictions preserve their original behavior.

Coverage is 453/551 target identities, 484 definitions and 246 complete Top 8
decks. `play:check` passes 983 tests / 31,708 assertions, including 26 new card
scenarios, 43 shared recovery cases and all 246 supported full-game replay cases.
The focused regression set also covers prior naming, discard-play and regroup
contracts. Engine 0.50.0 / card bundle 50 / state 46; browser protocol remains 22.
Official card text is pinned in `top8-conditions.json`. Claude review timed out
with an execution error; local card/rules/diff review completed. Remaining target
identities: 98, plus the recorded source-data gaps.

### Top 8 batch 6: damage, draw, healing and Force observers

Adds 13 definitions: Paz Vizsla, The Mandalorian (Cleaning Up Nevarro), Blade
Three, Vane's Snub Fighter, Ezra Bridger, Boba Fett, Blockade Runner, Stay on
Target, Yoda, Seasoned Fleet Admiral, Silver Angel, Kylo Ren and Whistling Birds.
Damage observers preserve captured origins and distinguish combat damage from
other base damage. Friendly attack observers receive exact combat results and
last known attacker traits. Draws and healing notify once per actual event;
Force use and played upgrades have distinct triggers. Created tokens do not
count as played upgrades. The fixture retains official styled text, including
The Mandalorian's updated When Attack Ends wording.

Coverage is 466/551 target identities, 497 definitions and 259 complete Top 8
decks. `play:check` passes 1,012 tests / 33,530 assertions, including sixteen new
outcome scenarios, 46 shared recovery cases and all 259 supported full-game
replay cases. The existing 130-input Piloting prefix replay test now uses the
same 30-second correctness allowance as Latts after its five-second timeout;
the final full run passes. Engine 0.51.0 / card bundle 51 / state 47; browser
protocol remains 22. Claude review timed out with an execution error; local
card/rules/diff review completed. Eighty-five target identities and the recorded
source-data gaps remain.

### Top 8 batch 7: searches, attack sequencing and capture groups

Adds fifteen definitions, including Home One, the Master Codebreaker, Faith
in Your Friends, 4-LOM, Target Tagger, Tandem Assault, Hold Them Off, Loth-Wolf,
Darth Traya, Helgait and Dismantle the Conspiracy. Searches can explicitly keep
the selected identity private and filter any listed aspect. Attack selections
exclude prohibited attackers; explicit continuations wait for the complete
first attack. Allocation preserves the damage source or last-known power;
capture validates the complete group before movement. Official text and styled
text are pinned in `top8-search-combat.json`.

Coverage is 481/551 target identities, 512 definitions and 263 complete Top 8
decks. `play:check` passes 1,033 tests / 33,780 assertions, including seventeen
new outcome scenarios, fifty shared recovery cases and all 263 supported
full-game replay cases. Engine 0.52.0 / card bundle 52 / state 48; browser
protocol remains 22. Claude review timed out with an execution error; local
card/rules/diff review completed. Seventy target identities and the recorded
source-data gaps remain.

### Top 8 batch 8: Pilot traits and conditional choices

Adds fourteen definitions: Lando, Biggs, the Mandalorian's Weathered Pilot,
Nien Nunb, Raddus, C-3PO, Nihilus, Crix, Warrior of Clan Ordo, Razor Crest,
Vader's Twilight and Scourge units, Hound's Tooth and Arcana Star Map. Upgrade
stat modifiers have a distinct origin from host abilities. Role-aware public
counts distinguish Pilot cards, leaders and hidden zones; combat conditions
track the exact attacker, defender and entry phase. Grouped exhaustion selects
all targets first. Search multipliers and declined Disclose have serializable
continuations. Crix follows its official strict-unit-count erratum. Source text
and rulings are pinned in `top8-traits.json`.

Coverage is 495/551 target identities, 526 definitions and 271 complete Top 8
decks. `play:check` passes 1,058 tests / 35,073 assertions, including seventeen
new outcome scenarios, 53 shared recovery cases and all 271 supported full-game
replay cases. Engine 0.53.0 / card bundle 53 / state 49; browser protocol remains 22. Claude review timed out with an execution error; local card/rules/diff review
completed. Fifty-six target identities and the recorded source-data gaps remain.

### Top 8 batch 9: phase events and token control

Adds ten definitions: Conveyex Security Captain, Lieutenant Gorn, Tempest
Assault, Decimator of Dissidents, Mist Hunter, the Client, Vult Skerris's
Defender, Outcast, Guerilla Soldier and Eviscerator. Phase history records actual
base/indirect damage, played traits, token creators and discards from the acting
player's own hand/deck. Unit entry differs from play. Indirect damage carries an
explicit continuation with the actual base damage. Credit control can transfer
without changing ownership; suppression disables its payment ability. Advantage
ability loss preserves its printed power modifier. Source text is pinned in
`top8-history.json`.

Coverage is 505/551 target identities, 536 definitions and 284 complete Top 8
decks. `play:check` passes 1,088 tests / 36,511 assertions, including seventeen
new outcome scenarios, 56 shared recovery cases and all 284 supported full-game
replay cases. Engine 0.54.0 / card bundle 54 / state 50; browser protocol remains
22. Claude review timed out with an execution error; local card/rules/diff review
completed and corrected token-creator tracking. Forty-six target identities and
the recorded source-data gaps remain.

### Top 8 batch 10: chosen ability costs

Adds Krrsantan, Dryden Vos's leader, Chewbacca's Kessel leader, Sebulba's leader,
Jabba's Crime Boss leader and Alliance Outpost. A private payment continuation
selects exact hand cards, resources, units or tokens before paying the complete
cost. Top-deck discard costs require a card. Credit choices retain the selected
card payment and cannot reuse it. Leaders retain independent faces and Epic
usage; Chewbacca's printed deployment has a resource payment without an extra
threshold or exhaust cost. Modified plays grant Ambush before play triggers;
Jabba requires a play and grants it only for a Credit actually spent. Source
text and errata are pinned in `top8-costs.json`.

Coverage is 511/551 target identities, 542 definitions and 291 complete Top 8
decks. `play:check` passes 1,111 tests / 36,889 assertions, including sixteen
new outcome scenarios, sixty shared recovery cases and all 291 supported
full-game replay cases. Frontend build, focused lint and connection tests
(10 / 66 assertions) pass. Engine 0.55.0 / card bundle 55 / state 51; browser
protocol remains 22. Claude review timed out with an execution error; local
card/rules/diff review completed and required an actual play for Jabba's
cost-free action. Forty target identities and the recorded source-data gaps
remain. The committed executable passes replay and all sixty fresh-process
recoveries. Services were restarted on this build, and the authenticated
`ability-cost` browser run passes in 47 actions, including two card payment
selections, a Credit payment, prompt reload, privacy checks and a full game.

### Top 8 batch 11: optional round limits and discard capture

Adds Sebulba's Podracer and Bothan 5. Optional triggers retain their complete
source and subject across the acceptance decision; declining does not spend a
round-limited use. Rancor Keeper uses the same contract. Deck-discard observers
distinguish who discarded a card and its original zone. Bothan captures its exact
non-Vehicle subject only from its controller's own discard, with a surviving
guard; ordinary capture still requires a unit in play. Source text is pinned in
`top8-optional.json`.

Coverage is 513/551 target identities, 544 definitions and 293 complete Top 8
decks. `play:check` passes 1,123 tests / 37,209 assertions, including ten new
outcome scenarios, 63 shared recovery cases and all 293 supported full-game
replay cases. Frontend build and focused lint pass. Engine 0.56.0 / card bundle
56 / state 52; browser protocol remains 22. Claude review timed out with an
execution error; local card/rules/diff review completed. Thirty-eight target
identities and the recorded source-data gaps remain.

### Top 8 batch 12: grouped discards and private deck choices

Adds Profundity, Inspector's Shuttle, Reanimated Night Trooper, Luthen's
Haulcraft, The Will of the Force, BoShek and Ebon Hawk. Grouped inspections
retain exact selected cards for simultaneous discards. Deck inspections separate
the chooser from the deck owner. Random discards retain the owner's complete
hand only on the server; public hand reveals count named titles without
subtitles. Odd-cost recovery and both-aspect Disclose use shared primitives.
Official text and errata are pinned in `top8-hidden.json`.

Coverage is 520/551 target identities, 551 definitions and 297 complete Top 8
decks. `play:check` passes 1,142 tests / 37,918 assertions, including sixteen
new outcome scenarios, 69 shared recovery cases and all 297 supported full-game
replay cases. Engine 0.57.0 / card bundle 57 / state 53; browser protocol remains
22. Claude review failed with an execution error and timed out; local
card/rules/diff review completed. Thirty-one target identities and the recorded
source-data gaps remain.

### Top 8 batch 13: temporary control and attack timing

Adds Maul (Master of the Shadow Collective), Liberated by Darkness, Dryden
(I Get All Worked Up) and Time of Crisis. Control returns retain exact source,
target and borrowed ability origin, with ordered source-departure or regroup
resolution. Token upgrades follow their host's ownership when control changes
or they are reattached; explicit token control instructions remain supported.
Dryden skips only the next regroup ready step. Both players choose their spared
unit before Time of Crisis deals simultaneous damage. Source text is pinned in
`top8-control.json`.

Coverage is 524/551 target identities, 555 definitions and 300 complete Top 8
decks. `play:check` passes 1,160 tests / 38,366 assertions, including fifteen new
outcome scenarios, 75 shared recovery cases and all 300 supported full-game
replay cases. The first full run exposed older token-ownership expectations and
an overly strict token-controller invariant; focused regressions and the full
rerun pass after correcting both. Frontend build, focused lint and connection
tests (10 / 66 assertions) pass. Engine 0.58.0 / card bundle 58 / state 54;
browser protocol is 23. Both Claude review attempts failed with execution
errors and timed out; local card/rules/diff review completed. Twenty-seven
target identities and the recorded source-data gaps remain. The committed
executable passes replay and all 75 fresh-process recoveries. Services were
restarted on engine 0.58.0 / browser protocol 23. The authenticated browser run
passes in 47 actions, including two card-payment selections, a Credit payment,
reconnect, spectator privacy controls, a full game and mobile layout.

### Top 8 batch 14: attack order and exact attack outcomes

Adds Flash the Vents, The Stranger (No Survivors), Babu Frik and One Way Out.
The attacking player can choose defender-first damage, with a surviving Grit
response recalculated after the first hit. Modified attacks retain their damage
statistic, temporary defender ability loss and exact post-attack continuation.
Flash waits for every attack trigger before its defeat instruction, counting
only damage dealt by the chosen unit during that attack. Source text and
clarifications are pinned in `top8-attacks.json`.

Coverage is 528/551 target identities, 559 definitions and 307 complete Top 8
decks. `play:check` passes 1,185 tests / 38,916 assertions, including eighteen
new outcome scenarios, 81 shared recovery cases and all 307 supported full-game
replay cases. Frontend build and connection tests (10 / 66 assertions) pass.
Engine 0.59.0 / card bundle 59 / state 55; browser protocol remains
23. Claude review failed with an execution error and timed out; local
card/rules/diff review completed. Twenty-three target identities and the
recorded source-data gaps remain.

### Top 8 batch 15: damage replacement and temporary survival

Adds Deadly Vulnerability, At Attin Safety Droid, The Tragedy of Plagueis and
Shien Flurry. Damage frames preserve ordered replacement histories, allowing
the affected controller to choose doubling, partial prevention or a Shield.
Exact one-use effects are reserved until simultaneous damage resolves. Base
limits capture their source before the event. Temporary zero-HP survival
changes maintenance and Overwhelm outcomes without preventing explicit defeat.
Source text is pinned in `top8-prevention.json`.

Coverage is 532/551 target identities, 563 definitions and 312 complete Top 8
decks. `play:check` passes 1,212 tests / 39,590 assertions, including twenty-two
new outcome scenarios, 86 shared recovery cases and all 312 supported full-game
replay cases. Local rules review corrected an initial indirect-allocation
exception: v8 §8.35.3 still limits indirect assignment to remaining HP. The
focused correction and final full run pass. Engine 0.60.0 / card bundle 60 /
state 56; browser protocol remains 23. Both Claude review attempts failed with
execution errors and timed out; local card/rules/diff review completed.
Nineteen target identities and the recorded source-data gaps remain.

### Top 8 batch 16: keyword counts, Disclose and play restrictions

Adds Trade Route Taxation, Gallius Rax and Leia (Of A Secret Bloodline).
Phase restrictions cover ordinary and nested event plays, including free play.
Disclose retains exact revealed groups for subsequent aspect checks. Numeric
keywords preserve presence independently of value; Gallius counts distinct
words, including Piloting on its active face, through the shared aura evaluator.
Source text is pinned in `top8-restrictions.json`.

Coverage is 535/551 target identities, 566 definitions and 314 complete Top 8
decks. `play:check` passes 1,231 tests / 39,937 assertions, including seventeen
new outcome scenarios, 90 shared recovery cases and all 314 supported full-game
replay cases. Engine 0.61.0 / card bundle 61 / state 57; browser protocol remains
23. Claude review failed with an execution error and timed out; local
card/rules/diff review completed. Sixteen target identities and the recorded
source-data gaps remain.

Live acceptance on this committed engine passes in 47 actions: two authenticated
players, spectator reveal/hide, private ability-cost selection, Credit payment,
prompt reload/reconnect, a completed game and mobile layout.

### Top 8 batch 17: Pilot capacity, resource upgrades and odd costs

Adds R2-D2 (Artooooooooo!), The Armorer (Steel Shapes Us) and Han Solo
(Never Tell Me the Odds). R2 has separate incoming and granted Pilot permissions.
Private resource plays support Pilots and eligible-host filters. The Armorer
resources after successful play and before nested When Played abilities. Han
reveals without moving the deck card, compares printed odd costs and counts
physical units/upgrades for his separate upgrade deployment trigger. Printed
text and rules are pinned in `top8-pilot-foundations.json`.

Coverage is 538/551 target identities, 569 definitions and 319 complete Top 8
decks. The final `play:check` passes 1,251 tests / 40,372 assertions, including
fifteen card scenarios, 94 shared continuation cases and all 319 supported
full-game replay cases. Local review added an explicit play/resourcing/BoShek
timing case; focused checks and the final full rerun pass. Engine 0.62.0 /
card bundle 62 / state 58; browser protocol remains 23. Both Claude review
attempts failed with execution errors and timed out; local card/rules/diff
review completed. Thirteen target identities and the source-data gaps remain.

### Top 8 batch 18: sequential upgrade plays and defending-player inspection

Adds Kylo Ren (We’re Not Done Yet) and Sabé (Queen’s Shadow). Kylo’s deployment
resolves paid discard upgrades one at a time, including their nested triggers,
and stops when the player declines, cannot pay or loses the host. Sabé follows
the official revised attack-ended text on both faces. Her paid top-two inspection
requires a discard, while the deployed hand inspection permits declining it.
Source text, including the revised unit-face text, is pinned in
`top8-leader-choices.json`.

Coverage is 540/551 target identities, 571 definitions and 323 complete Top 8
decks. `play:check` passes 1,267 tests / 40,905 assertions, including twelve
card scenarios, 98 shared continuation cases and all 323 supported full-game
replay cases. Focused deck/hidden-choice regressions pass. Engine 0.63.0 /
card bundle 63 / state 59; browser protocol remains 23. Claude review failed
with an execution error and timed out; local card/rules/diff review completed.
Eleven target identities and the recorded source-data gaps remain.

### Top 8 batch 19: Nabat Village setup and private hand order

Adds Nabat Village with nine starting cards, a prohibited mulligan, normal initial
resourcing and its first-action-phase hand reduction. A private continuation
orders three exact hand cards before moving them to the deck bottom. Both Nabat
players finish their triggers before the first action. Later rounds retain
normal hand sizes and do not repeat the setup effect. Source text is pinned in
`top8-nabat.json`; the `nabat` browser preset covers selection and order reloads.

Coverage is 541/551 target identities and 572 definitions. Complete supported
Top 8 lists remain 323 because the affected lists have other pending cards.
`play:check` passes 1,273 tests / 41,004 assertions, including six setup/privacy
scenarios and 101 shared continuation cases. Engine 0.64.0 / card bundle 64 /
state 60; browser protocol remains 23. Claude review failed with an execution
error and timed out; local card/rules/diff review completed. Ten target
identities and the recorded source-data gaps remain.

Live Nabat acceptance on this committed engine passes in 43 actions: the
nine-card opening hand, required three-card selection, both private ordering
choices, selection/order reloads, player and spectator privacy, a completed game
and mobile layout. All 101 retained continuation cases also pass input replay
and fresh-process recovery with the newest executable.

### Top 8 batch 20: extra actions and additional regroups

Adds Kazuda Xiono, Best Pilot in the Galaxy and Max Rebo, Encore! Kazuda's
explicit faces use round-long ability loss and simultaneous friendly selections.
The leader action grants any standard extra action, with pass ownership retained
across payment and action continuations. Max repeats the full regroup sequence
per active copy without resetting round limits or expiring round effects early.

Coverage is 543/551 target identities, 574 definitions and 325 complete Top 8
lists. Engine 0.65.0 / card bundle 65 / state 61; browser protocol remains 23.
`play:check` passes 1,291 tests / 41,346 assertions across 73 files, including
sixteen new outcome scenarios, 107 shared recovery cases and every complete
supported Top 8 list. Focused typechecking and diff checks pass. Claude review
failed with an execution error; local diff/rules review completed. Eight target
identities and the recorded tournament source-data gaps remain.

### Top 8 batch 21: first-action play and delayed victory

Adds Confidence in Victory. Normal action admission and execution share its
first-action restriction; nested and free effect plays are rejected. Per-player
phase history survives Credit payment and extra-action continuations. A public
arena choice schedules a conditional win at regroup using existing delayed
controller/order choices. Card-effect victory records its exact source and
terminates the game without defeating a base.

Coverage is 544/551 target identities, 575 definitions and 326 complete Top 8
lists. Engine 0.66.0 / card bundle 66 / state 62 / browser protocol 24.
`play:check` passes 1,306 tests / 41,527 assertions across 74 files, including
fourteen outcome scenarios, 111 shared recovery cases and every supported Top 8
list. Frontend build, ten connection tests, focused ESLint and diff checks pass.
Claude review timed out with an execution error; local diff/rules review
completed. Seven target identities and the recorded source-data gaps remain.

The committed engine's live `victory` browser preset passes in 50 actions. It
checks a reload at the arena choice, the public scheduled arena in all three
views and the card-effect result, alongside the existing consent, disclosure,
privacy, reconnect, exact-copy log and mobile-layout gates. Only the latest
executable is retained; all 111 archived continuation cases match in fresh
processes. Supported worktree services were restarted on engine 0.66.0 / browser
protocol 24, with local migrations and container ownership checks passing.
Browser typechecking passes. The independent CLI review timed out with an
execution error; local review of the acceptance changes completed.


### Top 8 batch 22: invoked defeat abilities and resource ownership

Adds Chimaera, Reinforcing the Center. Its When Played selects another friendly
unit's effective When Defeated ability, including granted abilities; a choice
among several invokes exactly one. Ordinary source snapshots, fresh targets,
optional effects and nested triggers apply without inventing a defeat. Its own
actual defeat creates two exhausted TIE Fighters.

The official July 20 Superlaser Technician templating update permits resourcing
the live unit. Resource membership and payment now follow the controller while
preserving ownership, including actual defeat of a stolen Technician. Private
faces remain visible only to the resource controller. Playing an opponent's
resource transfers membership before moving the card. The exported browser
version constant is aligned with protocol 24 and checked against actual views.

Coverage is 545/551 target identities and 576 definitions. Complete supported
Top 8 lists remain 326 because affected lists also need other pending cards.
Engine 0.67.0 / card bundle 67 / state 63; browser protocol remains 24.
`play:check` passes 1,317 tests / 41,655 assertions across 75 files, including
eleven new outcome scenarios, 114 shared recovery cases and every supported
Top 8 list. Focused typechecking and diff checks pass. The independent CLI
review timed out without a result; local diff/rules review completed. Six target
identities and the recorded source-data gaps remain.

### Top 8 batch 23: repeating a used defeat ability

Grand Admiral Thrawn, ...How Unfortunate brings the registry to 577 definitions,
covering 546/551 targets and 329 complete Top 8 lists. His leader exhaustion and
unit once-per-round abilities are separate. Repetition preserves the original
source and ability origin while resolving fresh targets, optional choices and
costs. Deferred observer frames preserve timing if the observer leaves play.
Invocations qualify without inventing a defeat event. Engine 0.68 / card bundle
68 / state 64; browser protocol remains 24.

Fourteen outcome scenarios cover both faces, round resets, decline/exhaustion,
ability loss, opposing ownership, invocation, new targets, granted origins,
Force costs, source reincarnation, observer departure, privacy and invalid
checkpoints. Four new shared continuations bring the recovery set to 118.
The full check passed 1,333 tests; its sole failure was the stale recovery-case
count (114). After updating that assertion, the recovery workload passed with
945 assertions. Package and browser typechecks pass.
Claude review timed out without a result; local diff and rules review completed.

### Top 8 batch 24: searching for attack abilities

Improvised Identity brings the registry to 578 definitions, covering 547/551
targets and 334 complete Top 8 lists. Its granted action discards a privately
searched ground unit and offers an attack even when the search fails. The attack
gains the full printed abilities, with declaration restrictions evaluated before
target selection. A shared origin identifies the discarded card; stats and
traits are not copied and entry abilities do not retrigger. Independent round
uses track both holder and granting-upgrade incarnations. Browser action labels,
hover highlights and logs identify the exact granting copy. Engine 0.69 / card
bundle 69 / state 65 / browser protocol 25.

Fifteen card outcome scenarios and four new shared continuations cover the
private search, remainder randomization, optional attack, copied trigger and
round limit; there are 122 shared recovery cases. The full `play:check` passes
1,354 tests with 42,801 assertions. Frontend build, focused lint
and ten connection tests pass. Claude review timed out without a result; local
diff and rules review completed.

The `identity` browser preset completes a 63-action game against the running
0.69 engine. It checks the private search after reload, a selected discard,
reload at the optional attack, both granting-card and holder highlights,
player/spectator disclosure, reconnect and mobile layout. Worktree restart and
local migrations succeeded; Docker labels match this worktree. Browser/package
typechecks pass. Claude's automation review timed out without a result; local
review completed.

### Top 8 batch 25: token creation replacements

Moff Jerjerrod, We Shall Redouble Our Efforts brings the registry to 579 explicit
definitions, covering 548/551 targets and 335 complete Top 8 lists. Token creation
now has a serializable replacement boundary before allocation. It retains chosen
recipients and group distributions, separates creator from owner, preserves the
Force limit, and resolves sacrifice-triggered abilities after creation. Copied
Moff abilities work on their actual holder. Covering the Wing excludes the entire
created X-Wing group from its later choice. Engine 0.70 / card bundle 70 / state
66; browser protocol remains 25.

Seventeen card scenarios and five new shared continuations cover replacement,
cost and creation timing, exact groups, ownership, copied origins and malformed
checkpoints. The 95-test focused token/recovery suite passes; there are 127 shared
recovery cases. The full check passes: 1,372 tests, 43,027 assertions across 78
files. Claude review failed to return a result within its time limit (execution
error); local review completed.

### Top 8 batch 26: in-play Pilot conversion

Corvus, Inferno Squadron Raider and Eject bring the registry to 581 explicit
definitions, covering 550/551 targets and 340 complete Top 8 lists. Both Pilot
roles now convert in play while retaining identity, control and used deployment.
Conversion handles damage, attached upgrades, prisoners and combat removal;
reattachment preserves the original restriction. Real departures record the
final unit or upgrade role for last known information. Ability loss and temporary
control returns continue through conversion. Engine 0.71 / card bundle 71 / state
67; browser protocol remains 25.

Seventeen card scenarios and four new shared continuations cover these rules;
there are 131 shared recovery cases. Luke Skywalker, You Still With Me? is the
one remaining known target identity. Full validation passes: 1,394 tests, 42,810
assertions across 79 files. Claude review failed with an execution error and no
review result; local review completed.

### Top 8 batch 27: upgrade defeat replacement and complete known coverage

Luke Skywalker, You Still With Me? completes all 551 target identities. The
registry has 582 explicit card definitions. All 342 complete available Top 8
lists pass actual deck admission with supported sideboards. The full-game
workload now includes every complete list without filtering out unsupported
cards, so a future coverage regression cannot silently remove a deck from the
workload. Engine 0.72 / card bundle 72 / state 68; browser protocol remains 25.

Upgrade defeat is a serializable replacement boundary before subsequent effects
or triggers. Luke can escape after his vehicle leaves play, while “if you do”
follow-ups still resolve. Conversion cleanup, current ability loss, observers,
uniqueness and concession retain the correct role and exact reference. The UI
labels both replacement outcomes. Twenty-four card scenarios and six new shared
continuations cover these rules; there are 137 shared recovery cases. The focused
30-test coverage/recovery suite passes with 10,416 assertions. The full check
passes: 1,421 tests, 44,458 assertions across 80 files, including 342 full Top 8
games and replay comparisons. Frontend build and focused lint pass. Claude review
failed with an execution error and no review result; local review completed.

The only retained executable archive is engine 0.72, built from commit
`097c8ce6c18999239c11145d3928a6ff47081e70`, SHA-256
`f7e89ceed1d96871ed882c5118478ce3ee919fffc5850a027ee4f5ec38ac1d9e`.
Its replay and all 137 fresh-process continuation recoveries pass.

### Top 8 browser acceptance

The `luke` browser preset completed a 67-action live game through the running
worktree services. It plays Luke as a Pilot, has the opponent remove him, reloads
his controller's replacement choice, accepts conversion, verifies the exhausted
ground unit for both players and the spectator, and checks the exact log hover.
The normal consent, spectator visibility, reconnect, full-game and mobile checks
also pass. Services were restarted on the latest engine using the managed
worktree environment; local migrations passed and database labels matched this
worktree. Browser/package typechecks pass. Claude’s read-only automation review
timed out with an execution error and no review result; local review completed.

## Completed known Top 8 card set

All 200 recent-meta identities and every identity in the available Top 8 lists
from August 26 through September 9, 2026 are implemented, including sideboards.
The union has 551 identities. All 342 complete lists are admitted; 344 placement
records exist. Redlands first place and Écija eighth place still lack complete
decklists, and 19 other tournaments lack imported final results. No deck contents
are invented for these missing sources. Strict completeness reporting continues
to fail solely for those source-data gaps, with zero unsupported known cards.

## Completed original known card set

All 200 ranked identities and all 100 additional winner-deck identities are
implemented: 300/300 targets, including sideboards, with 335 total registered
cards. All 42 complete available winning decklists are supported. The fixed
snapshot contains 43 winner records; Redlands lacks a complete list, and 19
other tournaments lack imported final results. These source-data gaps remain
explicit. The strict `play:targets --require-complete` command still fails for
those gaps, with zero unsupported known target identities. Public rechecks of
Redlands and another missing event remained inaccessible on September 10.

Final validation: `play:check` passes 625 tests / 12,922 assertions, including
37 shared continuation cases and full-game replay for all 42 supported winner
lists. Frontend build, focused ESLint, card-skill validation and the final live
browser scenario pass. The final browser game takes 49 actions and covers two
private resource inspections/free plays, prompt reload, spectator privacy,
exact-copy log inspection, completion and mobile layout. The implementation
retains only the newest committed executable during unreleased development.
Claude review failed to produce a result; local diff/rules review completed.

## Fixed target and evidence

The initial extraction is dated 2026-09-09. The ranking window is 2026-06-12
through 2026-09-09 inclusive; the winners window is 2026-08-26 through
2026-09-09. Count each distinct public deck once, using imported tournaments
only. Rank by deck inclusion, descending, then canonical card ID. Mainboard
cards, leaders and bases participate in the ranking. This measures deck inclusion,
not actual card plays during matches. Winners also contribute sideboards.

The local sample contains 9,283 public decks, 200 ranked identities and 43 winning
deck records. Their union is 300 identities, of which eight already have complete
implementations at the start of this task. One recorded winner (Redlands,
2026-09-05) lacks its leader/base/mainboard; other events in the window have no
imported final result. Those are explicit data gaps, not completed coverage.
The public SWUBASE API returned HTTP 403 during freshness verification; the
snapshot is not a claim that all worldwide events or newer imports are covered.

The committed [target fixture](../../../play/testing/fixtures/meta-targets.json)
contains public tournament/deck identities and card quantities, without player
identities. `bun run play:targets` computes progress from the actual registry;
`bun run play:targets --require-complete` fails while card or source-data gaps
remain. It must not infer support merely from the existence of a file.

To deliberately refresh against the isolated local database:

```bash
CROSSFIRE_TEST_DATABASE_URL='<local worktree URL>' bun run play:targets:refresh 2026-09-09
```

Extraction runs in a read-only repeatable-read transaction. Review changes to
scope before replacing the fixed fixture. Never substitute incomplete decklists,
private contributor decks or an unimplemented card's blank statistics.

## Implementation order and acceptance

1. Add the ranked vanilla, keyword and existing-effect cards, with independent
   catalog agreement and representative outcome checks.
2. Complete combat keywords, unit tokens, targeted and simultaneous effects,
   lasting modifiers, conditional abilities and phase/round history.
3. Add hand/discard/deck movement and choices, resource play, Force/Credit use,
   capture/rescue, replacements and ownership changes as their cards require.
4. Complete both faces of the target leaders, including pilot leader roles,
   costs, deployment requirements and grants. Keep unsupported roles unadmitted.
5. Finish the remaining individual cards, then admit and play every complete
   winning deck, including sideboard card coverage. Exercise representative
   matchups, exact-copy choices, secret-differential views and mid-resolution
   recovery; record missing-source exceptions separately.

For each batch, pin printed text/rules, write dedicated definitions, and test
observable outcomes including relevant negative/optional branches. A new shared
primitive needs interaction tests, checkpoint validation and fresh-process
recovery where it suspends. Keep only the latest unreleased executable; rebuild
it after the committed engine/card version changes. Do not claim 200-card or
winner-deck completion while the coverage gate reports missing behavior.

Skills: `swubase-card-implementator`, `swubase-online-play`,
`swubase-card-catalog`, `swubase-decks`, `swubase-validation`,
`swubase-change-review`, `swubase-documentation`; add API/frontend/WebSocket
skills only when new choice contracts cross those boundaries. Tournament import
code and external publication are outside this extraction task.

## Verified batches

- Foundation batch: 36 dedicated definitions (22 vanilla units/bases, 14 with
  existing effects/keywords). Total registry: 71. `play:check` passes 150 tests,
  including new arena entry/combat, Sentinel restrictions, Shielded attachment,
  optional Ambush, Raid/Restore, Han's Experience, Technician healing, and
  Jedi Starfighter's exact-copy target choice with fresh-process continuation.
  Independent Claude CLI review could not run (execution error); local review
  completed. Engine 0.11.0 / card bundle 11; state and browser contracts remain 10.

- Combat/removal batch: 29 dedicated definitions, including Cad Bane and Aurra
  Sing with explicit faces; total registry 100. Adds Saboteur (also during
  Support declaration), Overwhelm with Shield-linked excess damage, filtered
  removal, simultaneous multi-unit damage, private draws, and exhausted
  self-resourcing. `play:check` passes 176 tests including fresh-process resumes
  at multi-target, leader, Shield and departed-defender choices.
  Engine 0.12.0 / card bundle 12 / state 11; browser contract remains 10.
  Claude CLI review failed with an execution error; local diff review completed.

- Choices/effects batch: 20 dedicated definitions; total registry 120, covering
  67 of the top 200 and 93 of the 300 combined targets. Adds serializable modes,
  exact-copy bindings, condition checks, Grit, temporary stats/abilities, expiry,
  ability loss, bounce, and conditional readiness. `play:check` passes 190 tests;
  frontend build, six connection tests and focused lint pass. Fresh-process
  cases cover modes, bound attacks and modifiers. The authenticated browser
  acceptance game passes in 42 actions, including spectator disclosure and reconnect.
  Engine 0.13.0 / card bundle 13 / state 12 / browser protocol 11.
  Claude CLI review failed with an execution error; local diff review completed.

- Token/conditional batch: 20 target definitions and four token dependencies;
  total registry 144, covering 78 of the top 200 and 113 of 300 combined targets.
  Adds unit token creation, Advantage, weighted remaining-HP selections,
  simultaneous bound defeat, exact trigger subjects, optional effect payments,
  conditional keywords/stats and phase defeat history. `play:check` passes 207
  tests; the 17 new scenarios include exact-copy recovery, token departure,
  Greef's independent faces and limited exhaust payments, and opaque HP budgets.
  Frontend build, connection tests and focused lint pass. The authenticated
  browser game passes in 42 actions, including spectator consent and reconnect.
  Engine 0.14.0 / card
  bundle 14 / state 13 / browser protocol 12. Claude CLI review failed with an
  execution error; local diff review completed.

- Board/turn batch: 35 target definitions; total registry 179, covering 102 of
  the top 200 and 148 of 300 combined targets. Adds calculated amounts, exact
  arena history, healing, mass modifiers, initiative/attack observers, optional
  resource payments after source departure, and private top-deck resourcing.
  Engine 0.15.0 / card bundle 15 / state 14; browser protocol remains 12.
  `play:check` passes 227 tests. Nineteen new outcome scenarios include
  fresh-process choices and secret
  differential resource projections. Every registered effect now passes the
  checkpoint schema, including nested modes. Claude CLI review failed with an
  execution error; local diff/rules review completed.

- Force/indirect batch: 21 target definitions plus the Force token; total
  registry 201, covering 117 of the top 200 and 169 of 300 combined targets.
  Adds atomic Force costs, explicit Maul faces, conditional upgrade grants,
  keyword Ambush and private, recoverable indirect-damage allocation with unit
  caps and Shield bypass. Engine 0.16.0 / card bundle 16 / state 15 / browser
  protocol 13. `play:check` passes 243 tests; frontend build, seven connection
  tests and focused lint pass. The authenticated allocation browser game passes
  in 50 actions, including reloading a pending allocation. That test caught and
  verified the fix for the client's former blanket rejection of repeated card
  handles. Claude CLI review failed with an execution error; local diff/rules
  review completed.

- Movement/attack batch: 12 target definitions; total registry 213, covering
  125 of the top 200 and 181 of 300 combined targets. Adds grouped upgrade
  selection/removal/return, exact host continuations, runtime arena movement,
  chosen resource readiness/payment and attack declaration grants/calculated
  bonuses. Engine 0.17.0 / card bundle 17 / state 16; browser protocol stays 13.
  `play:check` passes 255 tests, including twelve new card outcome scenarios,
  optional branches, hidden-resource privacy and fresh-process continuation.
  Claude CLI review failed with an execution error; local diff/rules review
  completed.

- Hidden-zone batch: 13 target definitions; total registry 226, covering
  135 of the top 200 and 194 of 300 combined targets. Adds private hand/discard
  choices, printed-cost comparisons, milling, owner-chosen deck placement and
  divided damage with normal Shield replacement. Engine 0.18.0 / card bundle 18 /
  state 17; browser protocol stays 13. `play:check` passes 270 tests, including
  fifteen new outcome/privacy scenarios and fresh-process inspection/allocation
  recovery. Frontend build, eight connection tests and focused lint pass. The
  authenticated browser game passes in 38 actions with three hand inspections
  and a reload during inspection. Claude CLI review failed with an execution
  error; local diff/rules review completed.

- Continuous/control batch: 12 target definitions; total registry 238, covering
  146 of the top 200 and 206 of 300 combined targets. Adds dependent auras,
  calculated self modifiers, keyword suppression, control transfer, Hidden
  entry history and additional Pilot slots. Engine 0.19.0 / card bundle 19 /
  state 18; browser protocol stays 13. `play:check` passes 285 tests, including
  fifteen new outcome scenarios and fresh-process control, aura-trigger and
  granted-attack recovery. Local review also fixed the checkpoint requirement
  that mistakenly treated every attack grant as a Support grant. Claude CLI
  review failed with an execution error; local diff/rules review completed.

- Play/cost batch: 11 target definitions; total registry 249, covering 154 of
  the top 200 and 217 of 300 combined targets. Adds exact-copy discard/search
  play, calculated attachment affordability, round-based reductions, next-unit
  modifiers and base-specific setup. Engine 0.20.0 / card bundle 20 / state 19;
  browser protocol stays 13. `play:check` passes 300 tests, including fifteen
  new outcome/privacy/recovery scenarios. Frontend build, eight connection tests
  and focused lint pass. Claude CLI review timed out without completing; local
  diff/rules review completed. The remaining target report still has no fully
  supported winner decks; unsupported roles and cards continue to block admission.

- Plot batch: 8 target definitions; total registry 257, covering 161 of the
  top 200 and 225 of 300 combined targets. Adds private declaration of hidden
  resource triggers, ordering with deployment abilities, explicit resource
  replacement and temporary abilities for newly created tokens. Engine 0.21.0 /
  card bundle 21 / state 20; browser protocol stays 13. `play:check` passes 311
  tests, including eleven new outcome/privacy/recovery scenarios. Frontend build,
  eight connection tests and focused lint pass. The authenticated Plot browser
  game reloads a declaration and completes a resource upgrade play; the harness
  now waits for an available leader deployment. Claude CLI review failed with
  an execution error; local diff/rules review completed.

- Disclose/restrictions batch: 10 target definitions; total registry 267,
  covering 169 of the top 200 and 235 of 300 combined targets. Adds private
  aspect-multiset disclosure, defending triggers, controller-selected discard
  alternatives, source-bound ready/stat restrictions, keyword loss and attack
  ability replacement. Engine 0.22.0 / card bundle 22 / state 21 / browser
  protocol 14. `play:check` passes 326 tests, including fifteen new outcome,
  privacy and fresh-process recovery scenarios. Frontend build, nine connection
  tests and focused lint pass. The authenticated browser game passes in 71
  actions with six Disclose selections and a pending-choice reload. Local review
  fixed external aura-stat preservation under ability loss and excluded external
  numeric bonuses from Support. Claude CLI review did not complete; local
  diff/rules review completed. Winner decks remain blocked by explicit gaps.

- Credit batch: 3 target definitions plus Credit and Champion's KT9 Podracer;
  total registry 272, covering 169 of the top 200 and 238 of 300 combined targets.
  Adds optional exact-token replacement for card and ability resource payments,
  serializable nested payment continuations and public Credit projection with
  separate real-resource counts. Engine 0.23.0 / card bundle 23 / state 22;
  browser protocol stays 14. `play:check` passes 340 tests. Thirteen Credit
  scenarios pass, including compound
  cost atomicity and fresh-process payment recovery. Frontend build and focused
  lint pass; the authenticated browser game completes in 55 actions with four
  Credit payments and a pending-payment reload. The Bozeman winner is the first
  complete supported list, including its sideboard. Its main deck completes a
  mirror match with every pending checkpoint validated and final input replay
  equality. The other recorded winner lists remain explicitly gated. Claude
  CLI review timed out; local diff/rules review completed.

- Attack-outcome batch: 6 target definitions; total registry 278, covering
  174 of the top 200 and 244 of 300 combined targets. Adds actual combat damage
  and defeat history, captured attack-end origins, post-maintenance survivor
  checks, exact-copy round trigger limits and simultaneous chosen-base damage.
  Engine 0.24.0 / card bundle 24 / state 23; browser protocol stays 14.
  `play:check` passes 357 tests. Thirteen new scenarios include fresh-process
  attack-end, survivor, token and combat-replacement choices. The winner-game
  gate completes and replays five supported main decks: St Louis, Bozeman,
  Taipei, Austin and Cuernavaca. Catalog coverage includes their sideboards.
  Official detail data verifies Oggdo's updated formatted text despite its stale
  plain-text field; see the attack-outcomes guide. The existing Support trigger
  identity safeguard remains intact and has an additional regression scenario.
  Claude CLI review failed with an execution error; local diff/rules review
  completed.

- Search-continuation batch: 4 target definitions; total registry 282, covering
  176 of the top 200 and 248 of 300 combined targets. Adds a draw-then-play
  search continuation, returned-upgrade bindings, captured attack survival and
  exact-incarnation phase base-damage history. Engine 0.25.0 / card bundle 25 /
  state 24; browser protocol stays 14. `play:check` passes 369 tests, including
  eleven new card scenarios and six complete winner games with input replay.
  Roseville is the newly supported winner list. Pending search, optional play
  and target choices resume in a fresh process. Official formatted card text
  verifies the survival conditions; see the search-continuations guide.
  Claude CLI review timed out without completing; local diff/rules review
  completed.

- Prevention/protection batch: 6 target definitions; total registry 288, covering
  180 of the top 200 and 254 of 300 combined targets. Adds optional trait-unit
  and remote-Shield replacement costs, shared simultaneous reservations,
  trait-based unpreventable damage and direct enemy-ability protection.
  Engine 0.26.0 / card bundle 26 / state 25; browser protocol stays 14.
  `play:check` passes 386 tests, including seventeen new scenarios and all six
  supported winner games with input replay. Checks cover ordinary/Pilot faces,
  fresh-process replacement recovery, control restrictions, lethal damage,
  Overwhelm and ability loss. Official rulings confirm replacement choice and
  direct-defeat limitations. Claude CLI review timed out; local diff/rules
  review completed.

- Aspect-ability batch: 7 target definitions; total registry 295, covering
  181 of the top 200 and 261 of 300 combined targets. Adds distinct aspect
  counts, conditional modes, resource chooser/owner separation, measured
  next-unit reductions, leader exhaustion effects and one-colored-penalty play.
  Engine 0.27.0 / card bundle 27 / state 26; browser protocol stays 14.
  `play:check` passes 398 tests, including twelve new scenarios and all six
  supported winner games with input replay. Checks cover separate leader
  faces, phase effects versus auras, hidden enemy resources, Support,
  optional costs, Pilot cost exceptions and fresh-process Credit payment.
  Claude CLI review timed out; local diff/rules review completed.

- Attachment-attribute batch: 5 target definitions; total registry 300, covering
  184 of the top 200 and 266 of 300 combined targets. Adds upgrade-imposed leader
  status and traits, granted aspect payment, grouped attachment events, token
  control/reassignment and upgrade defeat observers captured before simultaneous
  unit departures. Engine 0.28.0 / card bundle 28 / state 27 / browser protocol 15.
  `play:check` passes 415 tests, including sixteen new scenarios and seven
  supported winner games with input replay. The September 6 Taipei winner is
  newly supported. Fresh-process checks cover Shield targets, token selection,
  reassignment and simultaneous defeat triggers. Frontend build, focused ESLint,
  nine connection tests and a 40-action browser game pass; the browser verifies
  reconnect, visibility and mobile layout. One replay
  test exceeded its timeout while browser checks were running; it passed alone
  and the complete final suite passed without concurrent browser work. Claude
  review timed out with an execution error; local diff/rules review completed.

- Pilot-leader batch: 3 target leaders plus the TIE Fighter token; total registry
  304, covering 187 of the top 200 and 269 of 300 combined targets. Boba Fett,
  Darth Vader and Luke Skywalker have separate unit/upgrade profiles, shared
  Epic usage, eligible-host choices and leader return-to-base behavior. Adds
  bounded partial damage allocation, trait-conditioned grants, historical attack
  traits and non-combat damage observers. Engine 0.29.0 / card bundle 29 / state
  28 / browser protocol 16. `play:check` passes 433 tests, including seventeen
  new scenarios and eight complete winner games with input replay. Shanghai is
  newly supported. Frontend build, focused ESLint and nine connection tests pass.
  A 53-action browser game exercises one actual pilot deployment, seven damage
  allocations, a partial divided allocation after reload, deployed artwork,
  unit statistics, spectators and mobile layout. The browser driver now resources
  beyond setup so the deployment gate cannot silently be skipped. Both updated
  Crossfire skills pass the skill validator. Claude review timed out with an
  execution error; local diff/rules review completed.

- Card-naming batch: Ryder Azadi, Garindan and Galen Erso; total registry 307,
  covering 190 of the top 200 and 272 of 300 combined targets. Adds a pinned
  official title catalog, public name choices before private hand inspection,
  source-incarnation restrictions and ownership-based ability loss in all zones.
  Shared play paths enforce prohibitions; events, Plot, Piloting, Shield
  replacement, upgrade attributes and printed cost/attachment abilities respect
  suppression. Engine 0.30.0 / card bundle 30 / state 29 / browser protocol 17.
  `play:check` passes 450 tests with 8,879 assertions, including fifteen naming
  scenarios and ten complete winner games with input replay. Toulouse and the
  September 6 São Paulo winner are newly supported. Naming and private discard
  join the executable's fresh-process continuation workload. Frontend build,
  focused ESLint, ten connection tests and both updated skill validators pass.
  A 71-action browser game exercises six names and six hand inspections, reloads
  at both prompts, rejected invalid names, spectators and mobile layout. Claude
  review timed out with an execution error; local diff/rules review completed.

- Combat-order batch: Han Solo, Has His Moments; Anakin's Podracer, So Wizard!;
  and Hotshot Maneuver. Total registry 310, covering 192 of the top 200 and
  275 of 300 combined targets; ten complete winner lists remain supported.
  Adds a serializable response step for first combat damage, recalculated Grit,
  attack-scoped priority, effective On Attack counts and mandatory distinct
  damage targets. Engine 0.31.0 / card bundle 31 / state 30; browser protocol
  remains 17. `play:check` passes 462 tests with 8,998 assertions, including
  twelve new scenarios, first/second-hit replacement recovery and all supported
  winner games with input replay. The retained workload gains a first-hit
  replacement with the defender's response pending. The updated card skill
  passes validation. Claude review timed out with an execution error; local
  diff/rules review completed.

- Player-choice batch: Governor's Shuttle and Dedra Meero, Not Wasting Time;
  total registry 312, covering 192 of the top 200 and 277 of 300 combined
  targets. Eleven complete winner lists are supported, now including Mexico.
  Adds opponent unit selection, bound-controller mode choices and hand-count
  conditions while retaining the original ability controller. Shuttle choices
  remain private until simultaneous defeat; Dedra's decision links the exact
  affected card, and prevented damage does not grant the draw fallback.
  Engine 0.32.0 / card bundle 32 / state 31; browser protocol remains 17.
  `play:check` passes 472 tests with nine new scenarios and all eleven supported
  winner games. The expanded recovery workload separately passes all fourteen
  suspension cases, including the second unit selection and opponent mode.
  Frontend build, focused ESLint and skill validation pass. Claude review timed
  out with an execution error; local diff/rules review completed.

- Whole-zone search batch: Annihilator, Tagge's Flagship; total registry 313,
  covering 193 of the top 200 and 278 of 300 combined targets. Fourteen complete
  winner lists are supported, adding Brisbane, Bernardsville and Geelong.
  Search targets retain the defeated unit's former controller, match titles
  across subtitles, allow hidden matches to remain unrevealed, and shuffle the
  whole remaining deck through server randomness. Engine 0.33.0 / card bundle
  33 / state 32; browser protocol remains 17. `play:check` passes 483 tests with
  9,530 assertions, including eight card scenarios and all fourteen winner
  games with replay. Sixteen shared recovery cases now include the whole-zone
  inspection and subsequent shuffle. Focused tests caught and corrected a
  checkpoint comparison that depended on JSON property order. Claude review
  timed out with an execution error; local diff/rules review completed.

- Temporary discard-play batch: Stolen AT-Hauler; total registry 314, covering
  194 of the top 200 and 279 of 300 combined targets. Fourteen winner lists
  remain supported. Adds phase-scoped exact-copy permissions to ordinary action
  admission, free resource/Credit payment and unit entry under the playing
  opponent while preserving ownership. Movement cancels the permission, and
  initiative/regroup restrictions remain enforced. Engine 0.34.0 / card bundle
  34 / state 33; browser protocol remains 17. `play:check` passes 492 tests with
  9,594 assertions, including nine card scenarios and all supported winner games.
  The seventeen-case shared recovery workload includes the opponent's free-play
  action. Official JTL 221 data verifies both timing restrictions. Claude review
  timed out with an execution error; local diff/rules review completed.

- Regroup batch: Alphabet Squadron U-Wing, Shadow of Stygeon Prime and
  Commandeer; total registry 317, covering 195 of the top 200 and 282 of 300
  combined targets. Fifteen winner lists are supported, now including
  Charlottetown. Captures phase-start triggers before delayed effects resolve,
  adds exact-incarnation delayed returns and direct upgrade readying restrictions.
  Engine 0.35.0 / card bundle 35 / state 34 / browser protocol 18. `play:check`
  passes 503 tests with 9,704 assertions, including ten new card scenarios,
  eighteen shared recovery cases and all fifteen winner games with replay.
  Tests cover captured controller/upgrade origins after return, phase expiry,
  Pilot and leader filters, ability loss, no-effect control choices and source
  movement. Frontend build, focused ESLint, ten connection tests and the updated
  card skill validator pass. Claude review timed out with an execution error;
  local diff/rules review completed.

- Sacrifice-cost batch: Director Krennic, Amidst My Achievement; total registry
  318, covering 196 of the top 200 and 283 of 300 combined targets. Twenty-one
  winner lists are supported, adding Hong Kong, Wien, Ankeny, Madison, Melton
  Mowbray and Seoul. Action options bind the exact unit cost before any payment;
  all costs validate together, and cost-triggered abilities wait until the
  activated ability finishes. Deployment uses another friendly unit's modified
  power and preserves both faces. Engine 0.36.0 / card bundle 36 / state 35;
  browser protocol remains 18. The final `play:check` passes 518 tests with
  10,314 assertions, including nine card scenarios, nineteen shared recovery
  cases and all twenty-one winner games. An earlier full run hit the existing
  five-second Piloting replay limit during app startup; isolation and the final
  full run pass. Granted discard options now iterate only designated copies.
  Frontend build and focused ESLint pass. A 50-action browser game verifies one
  sacrifice after reload, one Credit payment, deployment, spectator visibility,
  completion and mobile layout. The driver opens the resource drawer before
  checking Credits and handles Credit payments in any scenario. Claude review
  timed out with an execution error; local diff/rules review completed.

- Wager/optional-damage batch: Lando Calrissian, Full Sabacc and Cobb Vanth,
  Let Me Handle This; total registry 320, covering 197 of the top 200 and
  285 of 300 combined targets. Twenty-three winner lists are supported, now
  including Sydney and Karori. Lando fixes an aspect before selecting a deck
  and revealing its top card; his deployed Credit exchange is separate. Cobb's
  “another unit” condition is captured at the event, and replaced or lethal
  self-damage can still grant a Shield to the exact played unit. Public mode
  labels are included in the log. Engine 0.37.0 / card bundle 37 / state 36 /
  browser protocol 19. `play:check` passes 530 tests with 10,605 assertions,
  including ten card scenarios and all twenty-three supported winner games.
  Fresh-process checks cover aspect/deck choices, Credit payment, optional
  damage and a moved subject. Frontend build, focused ESLint and ten connection
  tests pass. Claude review timed out with an execution error; local diff/rules
  review completed.

- Distribution/opponent-search batch: Elzar Mann, Haunted by a Vision and Trace
  Martez, Trusting Sister; total registry 322, covering 198 of the top 200 and
  287 of 300 combined targets. Twenty-four winner lists are supported, adding
  Écija. Allocation decisions enforce individual damage caps for healing and
  retain exact card references; Elzar counts the Advantage tokens actually
  given before his opponent privately searches for an event. Trace's healing
  belongs to her Pilot face. Engine 0.38.0 / card bundle 38 / state 37 / browser
  protocol 20. `play:check` passes 540 tests with 10,782 assertions, including
  twenty-two shared recovery cases and all twenty-four supported winner games.
  Tests cover opponent-only inspection, server shuffle recovery, zero choices,
  Force leader faces, Pilot roles and invalid allocation checkpoints. Frontend
  build, focused ESLint and ten connection tests pass. Claude review returned
  an execution error; local diff/rules review completed.

- Constrained-search batch: Admiral Ackbar, Assume Attack Coordinates and
  Reforge; total registry 324, covering 199 of the top 200 and 289 of 300
  combined targets. Twenty-nine winner lists are supported, adding Caguas,
  Vilsheim, Marghera, Bloomington and Bellevue. Searches enforce a combined
  printed-cost budget and exact attachment restrictions. Multiple selected
  cards use an explicit play order with nested trigger resolution between
  plays. Reforge preserves the original host through defeat, inspection,
  shuffle and discounted payment; unplayable cards return to the deck bottom.
  Engine 0.39.0 / card bundle 39 / state 38; browser protocol remains 20.
  The final `play:check` passes 553 tests with 11,321 assertions, including
  eight card scenarios, twenty-four shared recovery cases and twenty-nine
  supported winner games. The initial run hit the existing five-second
  Piloting replay limit while the frontend build ran; the isolated test and
  final full run pass. Frontend build and focused ESLint pass. Claude review
  timed out without findings; local diff/rules review completed.

- Capture/rescue batch: Arrest; Grand Admiral Thrawn, Grand Schemer; Lando
  Calrissian, Trust Me; Moral Authority. Total registry 328, covering all 200
  selected popular cards and 293 of 300 combined targets; thirty-two winner
  lists are supported. Captured cards are public but out of play, with exact
  guard links separate from upgrades. Guard departure rescues prisoners as new
  copies; Arrest's delayed rescue cannot follow a later incarnation. The board
  groups captives under their guards and preserves public log references.
  Engine 0.40.0 / card bundle 40 / state 39 / browser protocol 21.
  `play:check` passes 569 tests with 11,715 assertions, including thirteen card
  scenarios, twenty-six shared recovery cases and thirty-two supported winner
  games. Frontend build, focused ESLint, ten connection tests and the card skill
  validator pass. A 52-action browser game checks a captured-board reload,
  public spectator/player visibility, rescue, completion and mobile layout.
  Claude review timed out with an execution error; local diff/rules review
  completed. Seven additional winner-deck cards and the previously recorded
  tournament source-data gaps remain.

- Draw/attack-observer batch: The Mandalorian, Let's See the Puck and Anakin
  Skywalker, Prescient Podracer. Total registry 330, covering all 200 selected
  popular cards and 295 of 300 combined targets. Thirty-four winner lists are
  supported, adding Bristol and Somerset West. Ordinary and search draws share
  one event boundary; Mandalorian grants one Shield per actual action-phase draw
  event. Friendly Attack Ends observers retain their captured origins through
  combat replacement and defeat. Anakin checks both players' attack history and
  the exact attacker; a leader's replacement defeat still permits the subsequent
  healing under v8 §§3.4.6 and 8.9.2. Engine 0.41.0 / card bundle 41 / state 40;
  browser protocol remains 21. `play:check` passes 581 tests with 11,983 assertions,
  including ten card scenarios, twenty-eight shared recovery cases and all
  thirty-four supported winner games. Claude review timed out without a review
  result; local diff/rules review completed. Five additional winner-deck cards
  and the previously recorded tournament source-data gaps remain.

- Private deck-ordering batch: Qui-Gon Jinn, Influencing Chance and Rogue One,
  At Any Cost. Total registry 332, covering all 200 selected popular cards and
  297 of 300 combined targets; thirty-six winner lists are supported. Explicit
  discard/bottom choices and successive top/bottom ordering use a serializable
  continuation. Inspection and order remain private, discarded cards become
  public, and prior visibility handles expire after rearrangement. Rogue One
  observes each simultaneous friendly defeat, including its own. Engine 0.42.0 /
  card bundle 42 / state 41; browser protocol remains 21. `play:check` passes
  593 tests with 12,239 assertions, including ten card scenarios, thirty-one
  shared recovery cases and thirty-six supported winner games. Frontend build
  and focused ESLint pass. A 49-action browser game verifies private ordering
  after reload, spectator privacy, completion and mobile layout. Claude review
  timed out without a review result; local diff/rules review completed. Trench
  Run, The Eye of Aldhani, Tear This Ship Apart and source-data gaps remain.

- Attack-grant batch: Trench Run. Total registry 333; 200/200 popular cards,
  298/300 combined targets and thirty-seven supported winner lists, adding
  Edmonton. The Fighter receives an attack-scoped trigger with the event as its
  origin; printed-cost self-damage is unpreventable and lethal damage prevents
  combat without erasing already captured triggers. Rescue also preserves the
  physical card's action-use history. Engine 0.43.0 / card bundle 43 / state 42;
  browser protocol remains 21. `play:check` passes 602 tests with 12,342 assertions,
  including seven attack-grant scenarios, the rescue regression, thirty-two
  shared recovery cases and thirty-seven supported winner games. An older Latts
  replay test exceeded its five-second timeout on an earlier run; it passed
  independently and in the final full run. Claude review timed out without a
  result; local diff/rules review completed. The Eye of Aldhani, Tear This Ship
  Apart and the previously recorded source-data gaps remain.

- Action-phase delay batch: The Eye of Aldhani. Total registry 334; 200/200
  popular cards, 299/300 combined targets and forty-one supported winner lists.
  Global delayed effects have no invented unit target. The next action phase
  collects delays after readying; the opponent chooses all unit payments before
  simultaneous exhaustion, with optional Credit payments preserved through
  recovery. Engine 0.44.0 / card bundle 44 / state 43 / browser protocol 22.
  `play:check` passes 614 tests with 12,858 assertions, including eight card
  scenarios, thirty-four shared recovery cases and forty-one winner games.
  Frontend build, focused ESLint and ten connection tests pass. A 48-action
  browser game verifies four unit payments, prompt reload, spectator privacy,
  exact-copy log inspection, completion and mobile layout. The browser's log
  assertion now waits for React to apply focus; a transient development-server
  reload interrupted an earlier attempt. An earlier Latts replay timeout passed
  in the final full run. Claude review timed out with an execution error; local
  diff/rules review completed. Tear This Ship Apart and source-data gaps remain.

- Opponent-resource play batch: Tear This Ship Apart. Total registry 335;
  200/200 popular cards, 300/300 combined targets and forty-two supported winner
  lists, adding Morgantown. Private resource inspection uses the existing zone
  continuation; free plays evaluate all legal roles under the acting player.
  Ownership is preserved, including events whose ability controller differs
  from the owner of the discard pile. Conditional replacement uses the existing
  top-resource effect with an explicit recipient. Engine 0.45.0 / card bundle 45 /
  state 44; browser protocol remains 22. `play:check` passes 625 tests with
  12,922 assertions, including ten card scenarios, thirty-seven shared recovery
  cases and forty-two winner games. Frontend build, focused ESLint, card-skill
  validation and the 49-action resource-play browser game pass. Claude review
  timed out with an execution error; local diff/rules review completed. All known
  target cards are implemented; only the recorded tournament source-data gaps
  prevent the strict completeness audit from passing.
