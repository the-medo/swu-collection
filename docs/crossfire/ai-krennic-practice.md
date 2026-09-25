# Krennic practice scenarios — review draft

These are 12 synthetic positions using your registered Krennic list. There are 20 executable lines, including losing comparisons. They are prepared examples for your strategic review; no model has been trained on them and there are no fixed action-score multipliers.

Every scripted decision runs through the real engine, the player-only projection and the current AI action adapter. Learner feature vectors are checked for finite values. Each command is checked after checkpoint restoration, and the entire line is replayed from its starting checkpoint. This verifies mechanics and representability, not global strategic optimality or playing strength.

The opponent’s hand and deck order are never inputs to the learner. Scenarios deliberately control draws and opponent replies. Full lists are partitioned into zones; the Arvel and Galen stress variants each replace one Zeb Orrelios in the Greef list. They do not edit the actual training roster. Galen naming is tested through ordinary play; Plot deployment is not yet a separate exercise.

Run without starting training: `taskset -c 0-8 bun play/ai/practice/report.ts`.
Regenerate this review: append `--write`. Validate: `taskset -c 0-8 bun test play/testing/ai/krennic-practice.test.ts`.

Source: [scenario definitions](../../play/ai/practice/krennic.ts), [runner](../../play/ai/practice/runner.ts). Continuous training remains stopped.

Verified target: engine 1.2.0, state 109, rules swu-8.0, cards `1.2.0@45abd7024e95120c53b5d17c20188a0fabb2155bdc2878f74e693486f769dfce`.

## 1. The full four-round ramp opening

**Question:** Can you reach seven real resources on round four while retaining a Credit?

**Position:** Round 1; your base 30 HP, opponent 30 HP. You have 2 real resources (2 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Director Krennic, On the Verge of Greatness; Ant Droid; Expendable Mercenary; Resupply Carrier.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** Scripted unpressured line: opponent passes. Starting hand has exactly four cards; Ant Droid draws the staged Chimaera. Regroup adds one resource each round. This proves the curve is legal, not that passing opponents are realistic.

**Practice objective:** Sequence a delayed payoff.

### Reference line

Mercenary must die on round two: its exhausted resource and a second Credit make Carrier reachable on round three.

1. Play Director Krennic, On the Verge of Greatness
2. Opponent passes
3. Play Ant Droid
4. Opponent passes
5. Krennic sacrifices Ant Droid for a Credit
6. Opponent passes
7. Both players pass; regroup, draw and resource one card each
8. Play Expendable Mercenary
9. Pay with ordinary resources; keep Credits
10. Opponent passes
11. Krennic sacrifices Expendable Mercenary for a Credit
12. Accept the exhausted resource gain
13. Opponent passes
14. Both players pass; regroup, draw and resource one card each
15. Play Resupply Carrier
16. Spend 1 Credit
17. Accept the exhausted resource gain
18. Opponent passes
19. Both players pass; regroup, draw and resource one card each
20. Play Chimaera, A Frightening Reality
21. Pay with ordinary resources; keep Credits

**Verified result:** Game continues. Your base 30 HP; 7 real resources (0 ready), 1 Credit(s). 27 engine decisions replayed; 28 learner adapter choices checked.

The resource ledger below is after each non-pass decision. Mercenary’s optional resource effect and Carrier’s ramp effect are accepted explicitly.

| Round | Decision | Real resources | Ready | Credits |
| --- | --- | ---: | ---: | ---: |
| 1 | p1: play → krennic | 2 | 0 | 0 |
| 1 | p1: play → ant | 2 | 0 | 0 |
| 1 | p1: Sacrifice ant with Krennic | 2 | 0 | 1 |
| 1 | p1: Regroup: resource one unlabelled card | 3 | 0 | 1 |
| 2 | p2: Regroup: resource one unlabelled card | 3 | 3 | 1 |
| 2 | p1: play → merc | 3 | 3 | 1 |
| 2 | p1: Pay: keep Credits | 3 | 0 | 1 |
| 2 | p1: Sacrifice merc with Krennic | 3 | 0 | 2 |
| 2 | p1: Accept the exhausted resource gain | 4 | 0 | 2 |
| 2 | p1: Regroup: resource one unlabelled card | 5 | 0 | 2 |
| 3 | p2: Regroup: resource one unlabelled card | 5 | 5 | 2 |
| 3 | p1: play → carrier | 5 | 5 | 2 |
| 3 | p1: Pay: credit1 | 5 | 0 | 1 |
| 3 | p1: Accept the exhausted resource gain | 6 | 0 | 1 |
| 3 | p1: Regroup: resource one unlabelled card | 7 | 0 | 1 |
| 4 | p2: Regroup: resource one unlabelled card | 7 | 7 | 1 |
| 4 | p1: play → chim | 7 | 7 | 1 |
| 4 | p1: Pay: keep Credits | 7 | 0 | 1 |

## 2. The unit discount is only once per round

**Question:** With no ready resources, can the Krennic unit make both Ant Droids free this round?

**Position:** Round 3; your base 30 HP, opponent 30 HP. You have 3 real resources (0 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Ant Droid; Ant Droid.
- Your ground: Director Krennic, On the Verge of Greatness (2/2 remaining HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** The Krennic unit is already in play; its first qualifying play reduction is unused. All three real resources are exhausted. The leader is ready and the opponent passes.

**Practice objective:** Track a used discount.

### Discount is spent

The first Ant is free; the second is not offered at zero spending power.

1. Play Ant Droid
2. Opponent passes

**Verified result:** Game continues. Your base 30 HP; 3 real resources (0 ready), 0 Credit(s). 2 engine decisions replayed; 1 learner adapter choices checked.

### Pay for the second Ant

Sacrifice the first Ant for a Credit, then spend it on the second Ant. The leader is now exhausted and cannot repeat the sacrifice this round.

1. Play Ant Droid
2. Opponent passes
3. Krennic sacrifices Ant Droid for a Credit
4. Opponent passes
5. Play Ant Droid
6. Spend the available Credits on this payment

**Verified result:** Game continues. Your base 30 HP; 3 real resources (0 ready), 0 Credit(s). 6 engine decisions replayed; 6 learner adapter choices checked.

## 3. The Krennic unit is missing

**Question:** You have three resources and a Credit, but no Krennic unit. How do you play Mercenary?

**Position:** Round 2; your base 30 HP, opponent 30 HP. You have 3 real resources (3 ready) and 1 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Expendable Mercenary.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** The one-resource discount is absent. Mercenary costs four, so the saved Credit covers the shortfall.

**Practice objective:** Adapt payment to the actual board.

### Reference line

Spend exactly one Credit; do not assume the discounted cost always applies.

1. Play Expendable Mercenary
2. Spend 1 Credit

**Verified result:** Game continues. Your base 30 HP; 3 real resources (0 ready), 0 Credit(s). 2 engine decisions replayed; 4 learner adapter choices checked.

## 4. Sacrifice toward an immediate space clear

**Question:** Five ready resources, one Credit, an exhausted Mercenary, and Hyperspace Disaster in hand. Can you clear the ships this round?

**Position:** Round 3; your base 12 HP, opponent 30 HP. You have 5 real resources (5 ready) and 1 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Hyperspace Disaster.
- Your ground: Expendable Mercenary (3/3 remaining HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Stolen AT-Hauler (4/5 remaining HP; ready); A-Wing (1/2 remaining HP; exhausted).

**Assumptions:** Your base has 12 HP. The opponent attacks for four between your sacrifice and the wipe; taking that hit is survivable. No opponent disruption is scripted.

**Practice objective:** Ramp for a specific payoff.

### Reference line

Sacrifice Mercenary, absorb one attack, then spend five resources plus two Credits on Disaster. The new real resource is exhausted and cannot pay now.

1. Krennic sacrifices Expendable Mercenary for a Credit
2. Accept the exhausted resource gain
3. Opponent: Stolen AT-Hauler attacks Shield Generator Complex
4. Play Hyperspace Disaster
5. Spend the available Credits on this payment

**Verified result:** Game continues. Your base 8 HP; 6 real resources (0 ready), 0 Credit(s). 5 engine decisions replayed; 7 learner adapter choices checked.

## 5. Ground lethal: defend before ramping

**Question:** At 3 base HP, with four resources and two Credits, do you play Armored Commando or Resupply Carrier?

**Position:** Round 3; your base 3 HP, opponent 30 HP. You have 4 real resources (4 ready) and 2 Credit(s). Krennic leader is ready. Your action. Matchup: Greef.

- Your hand: Imperial Armored Commando; Resupply Carrier.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Karis Nemik, Freedom is a Pure Idea (3/2 remaining HP; ready).
- Enemy space: empty.

**Assumptions:** A ready Karis Nemik threatens three ground damage. It has no Saboteur and no removal is scripted. The opponent can attack immediately after your play.

**Practice objective:** Survival takes priority over ramp.

### Survive

Play the shielded ground Sentinel and keep both Credits; the attacker must hit it.

1. Play Imperial Armored Commando
2. Pay with ordinary resources; keep Credits

**Verified result:** Game continues. Your base 3 HP; 4 real resources (0 ready), 2 Credit(s). 2 engine decisions replayed; 3 learner adapter choices checked.

### Losing comparison

Carrier adds a resource but cannot intercept a ground attack; Nemik ends the game.

1. Play Resupply Carrier
2. Spend the available Credits on this payment
3. Accept the exhausted resource gain
4. Opponent: Karis Nemik, Freedom is a Pure Idea attacks Shield Generator Complex

**Verified result:** Opponent wins. Your base 0 HP; 5 real resources (0 ready), 0 Credit(s). 4 engine decisions replayed; 6 learner adapter choices checked.

## 6. Ramp would take one action too many

**Question:** You already have seven ready resources. Wipe space now, or sacrifice Ant Droid first for value?

**Position:** Round 3; your base 4 HP, opponent 30 HP. You have 7 real resources (7 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Hyperspace Disaster.
- Your ground: Ant Droid (1/2 remaining HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Snub Fighter Squadron (4/3 remaining HP; ready).

**Assumptions:** Your base has 4 HP and a ready Snub Fighter Squadron attacks for four. A spare Credit or extra card is worthless if the opponent wins before your next action.

**Practice objective:** Respect alternating actions.

### Survive

Play Hyperspace Disaster immediately.

1. Play Hyperspace Disaster

**Verified result:** Game continues. Your base 4 HP; 7 real resources (0 ready), 0 Credit(s). 1 engine decisions replayed; 1 learner adapter choices checked.

### Losing comparison

Sacrificing Ant draws a card and creates a Credit, but hands over the lethal attack.

1. Krennic sacrifices Ant Droid for a Credit
2. Opponent: Snub Fighter Squadron attacks Shield Generator Complex

**Verified result:** Opponent wins. Your base 0 HP; 7 real resources (7 ready), 1 Credit(s). 2 engine decisions replayed; 1 learner adapter choices checked.

## 7. Keep the unit that can win now

**Question:** You have nine resources, an empty hand and a ready 4-power Commando. The opponent has 4 base HP. Attack or sacrifice?

**Position:** Round 8; your base 30 HP, opponent 4 HP. You have 9 real resources (9 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: empty.
- Your ground: Imperial Armored Commando (4/3 remaining HP; ready; Sentinel).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** No enemy Sentinel blocks the attack. This is a forced immediate win, not a general ban on late-game sacrifices.

**Practice objective:** Stop converting useful bodies into Credits.

### Win now

Attack the base for four.

1. Imperial Armored Commando attacks Mos Eisley

**Verified result:** Krennic wins. Your base 30 HP; 9 real resources (9 ready), 0 Credit(s). 1 engine decisions replayed; 1 learner adapter choices checked.

### Wasteful comparison

Sacrifice loses the available lethal body and adds an unneeded Credit.

1. Krennic sacrifices Imperial Armored Commando for a Credit

**Verified result:** Game continues. Your base 30 HP; 9 real resources (9 ready), 1 Credit(s). 1 engine decisions replayed; 1 learner adapter choices checked.

## 8. A late sacrifice still enables Koska

**Question:** At eight resources, is sacrificing an exhausted Door Technician before playing Koska useful?

**Position:** Round 7; your base 12 HP, opponent 30 HP. You have 8 real resources (8 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Greef.

- Your hand: Koska Reeves, Warrior of Mandalore.
- Your ground: Imperial Door Technician (2/2 remaining HP; exhausted).
- Your space: empty.
- Enemy ground: Karis Nemik, Freedom is a Pure Idea (3/2 remaining HP; exhausted).
- Enemy space: empty.

**Assumptions:** Your base has 12 HP and the opponent has already exhausted its ground attacker. You can afford the extra action. No friendly unit has died this phase yet.

**Practice objective:** Recognize benefits beyond resource acceleration.

### Synergy line

Door heals two; the friendly defeat enables Koska to create a Mandalorian, which gives her Sentinel. The Credit is an additional benefit.

1. Krennic sacrifices Imperial Door Technician for a Credit
2. Opponent passes
3. Play Koska Reeves, Warrior of Mandalore
4. Pay with ordinary resources; keep Credits

**Verified result:** Game continues. Your base 14 HP; 8 real resources (4 ready), 1 Credit(s). 4 engine decisions replayed; 4 learner adapter choices checked.

### No setup comparison

Koska alone creates no token and has no Sentinel in this position.

1. Play Koska Reeves, Warrior of Mandalore

**Verified result:** Game continues. Your base 12 HP; 8 real resources (4 ready), 0 Credit(s). 1 engine decisions replayed; 1 learner adapter choices checked.

## 9. Spend the Credit before Arvel can destroy it

**Question:** A ready Arvel faces your 5-HP base. While playing Mercenary, should you preserve your Credit or spend it?

**Position:** Round 3; your base 5 HP, opponent 30 HP. You have 4 real resources (4 ready) and 1 Credit(s). Krennic leader is ready. Your action. Matchup: Greef + sideboard Arvel.

- Your hand: Expendable Mercenary.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Arvel Skeen, Win and Walk Away (4/3 remaining HP; ready).
- Enemy space: empty.

**Assumptions:** This is an explicit sideboard stress variant: one Zeb Orrelios is replaced with Arvel. Arvel can destroy either player’s Credit on attack and deal one extra damage.

**Practice objective:** Use visible disruption to choose payment.

### Survive

Spend the Credit on Mercenary despite having enough ordinary resources. Arvel then deals four instead of five; one resource remains ready.

1. Play Expendable Mercenary
2. Spend 1 Credit
3. Opponent: Arvel Skeen, Win and Walk Away attacks Shield Generator Complex

**Verified result:** Game continues. Your base 1 HP; 4 real resources (1 ready), 0 Credit(s). 3 engine decisions replayed; 4 learner adapter choices checked.

### Losing comparison

Keeping the Credit lets Arvel destroy it, ping your base, and finish with combat damage.

1. Play Expendable Mercenary
2. Pay with ordinary resources; keep Credits
3. Opponent: Arvel Skeen, Win and Walk Away attacks Shield Generator Complex
4. Opponent: Choose Credit
5. Opponent: Choose Shield Generator Complex

**Verified result:** Opponent wins. Your base 0 HP; 4 real resources (0 ready), 0 Credit(s). 5 engine decisions replayed; 3 learner adapter choices checked.

## 10. Credit tokens can be present but unusable

**Question:** Galen names Credit. With three resources and a visible Credit, can you play Mercenary? Can your experienced Commando reopen that line?

**Position:** Round 3; your base 30 HP, opponent 30 HP. You have 3 real resources (3 ready) and 1 Credit(s). Krennic leader is ready. Your action. Matchup: Greef + explicit Galen stress variant.

- Your hand: Expendable Mercenary.
- Your ground: Imperial Armored Commando (5/4 remaining HP; ready; Sentinel; Experience).
- Your space: empty.
- Enemy ground: Galen Erso, You'll Never Win (3/5 remaining HP; exhausted).
- Enemy space: empty.

**Assumptions:** Galen, You’ll Never Win replaces one Zeb in this stress variant and is played normally for six including the missing Vigilance aspect. Its naming effect is the same when played with Plot. Your ready Commando has an Experience token (5 power). The ordinary Vader list contains a different Galen.

**Practice objective:** Respond to public ability suppression.

### Recognize the constraint

Mercenary is unavailable: the Credit is still public, but it cannot contribute to payment. This branch checks recognition, not an action demonstration.

No action is submitted: inspect which plays are available.

**Verified result:** Game continues. Your base 30 HP; 3 real resources (3 ready), 1 Credit(s). 4 engine decisions replayed; 0 learner adapter choices checked.

### Remove the suppression

Commando kills Galen; after the scripted opponent pass, the Credit works again and pays the Mercenary shortfall.

1. Imperial Armored Commando attacks Galen Erso, You'll Never Win
2. Opponent passes
3. Play Expendable Mercenary
4. Spend 1 Credit

**Verified result:** Game continues. Your base 30 HP; 3 real resources (0 ready), 0 Credit(s). 8 engine decisions replayed; 5 learner adapter choices checked.

## 11. Credits pay for cards, not leader deployment

**Question:** With six resources and two Credits, can you deploy Krennic? Can you play Chimaera?

**Position:** Round 3; your base 30 HP, opponent 30 HP. You have 6 real resources (6 ready) and 2 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** Krennic requires seven real resources. The deploy action may be offered as a no-effect action by the current engine; it does not deploy the leader below threshold.

**Practice objective:** Distinguish money from the resource threshold.

### Pay for a stabilizer

Play Chimaera with six resources plus one Credit.

1. Play Chimaera, A Frightening Reality
2. Spend 1 Credit

**Verified result:** Game continues. Your base 30 HP; 6 real resources (0 ready), 1 Credit(s). 2 engine decisions replayed; 4 learner adapter choices checked.

### Threshold comparison

Invoking deployment below seven real resources leaves Krennic in the base zone.

1. Use Krennic’s deploy action

**Verified result:** Game continues. Your base 30 HP; 6 real resources (6 ready), 2 Credit(s). 1 engine decisions replayed; 1 learner adapter choices checked.

## 12. Stabilize with Chimaera and the cheap sacrifice

**Question:** After playing Chimaera, which friendly unit should you sacrifice to remove the opposing Squadron?

**Position:** Round 3; your base 12 HP, opponent 30 HP. You have 7 real resources (7 ready) and 0 Credit(s). Krennic leader is ready. Your action. Matchup: Vader.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Imperial Door Technician (2/2 remaining HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Snub Fighter Squadron (4/3 remaining HP; ready).

**Assumptions:** Seven ready resources; exhausted Door Technician already in play; own base at 12 HP. Chimaera may sacrifice itself, but that gives up the stabilizing ship.

**Practice objective:** Choose both sides of a sacrifice trade.

### Reference line

Sacrifice Door Technician and remove Squadron, retaining the 6/6 Chimaera and resolving both healing triggers.

1. Play Chimaera, A Frightening Reality
2. Choose Imperial Door Technician
3. Choose Snub Fighter Squadron
4. Resolve Door Technician healing

**Verified result:** Game continues. Your base 16 HP; 7 real resources (0 ready), 0 Credit(s). 4 engine decisions replayed; 4 learner adapter choices checked.

Validated total: 85 engine decisions and 85 learner adapter choices across 12 positions.

Before using these as a curriculum, review the strategic preferences, then add variations for base HP, initiative, missing cards, damage and opposing responses. Keep separate scenario families for evaluation; changing only a random seed is not an independent strategic test. Losing comparison lines must never become expert labels. No optimizer or training-data import is wired to this report.
