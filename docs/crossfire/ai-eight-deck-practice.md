# Eight-deck practice curriculum

96 scenario families: 12 per exact saved deck. Ten families per deck enter practice; two entire families stay held out. Each family has four variations. Variations of the same family are not independent evidence of strategic generalization.

Every reference is executed through the real engine, player-only projection, and action adapter. Commands and deterministic random continuations are checked after checkpoint restoration and replayed. Outcome checks establish legality and the stated tactical result; they do not prove global strategic optimality. Scripted opponent choices are never learner labels. Hidden hands and deck orders never enter model features.

The original twelve Krennic families are retained, including their explicitly identified Arvel/Galen stress substitutions. The seven other sets partition the exact eight-deck mainboards. Named Plot resources are deliberate. There are no fixed strategic score multipliers.

Curriculum: `eight-deck-practice-v1`; content hash `ecb5c03036cf0085f31639d717d3ad4b81917ca7620a361053081a31a58c5ac2`.

Regenerate: `taskset -c 0-8 bun play/ai/practice/rotation-report.ts --write`.

Training and interpretation: [eight-deck rotation](ai-eight-deck-training.md).

## Greef Aggression

Archetypes: aggro.

### 1. Black One gets two benefits from Greef’s Advantage

Play Black One and exhaust Greef for Advantage. The token gives +1 power and activates Black One’s upgraded bonus.

**Position:** Round 1; 2 resources (2 ready), 0 Credits. Opponent: vader.

- Your hand: Black One, Straight At Them; N-1 Starfighter.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Black One, Straight At Them.
2. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 2 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 2. Save the once-per-round grant for Black One

Decline the first grant on N-1 and use it on Black One, where being upgraded supplies another point of power.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: vader.

- Your hand: N-1 Starfighter; Black One, Straight At Them.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play N-1 Starfighter.
2. decline-effect.
3. Opponent: pass.
4. Play Black One, Straight At Them.
5. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (0 ready), 0 Credits; 5 engine inputs replayed.

### 3. Deploy before playing multiple units

Deployed Greef grants Advantage to every new friendly unit. Deploy first, then develop both ships with the six unspent resources.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: N-1 Starfighter; Black One, Straight At Them.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Greef Karga, Gracious Magistrate: deploy.
2. Opponent: pass.
3. Play N-1 Starfighter.
4. Opponent: pass.
5. Play Black One, Straight At Them.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (2 ready), 0 Credits; 5 engine inputs replayed.

### 4. Poe opens the base through Sentinel

Poe removes Sentinel from all units. Play him before sending the ready ground attacker at the base.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Poe Dameron, I'll Come Back For You.
- Your ground: Sabine Wren, Spectre Five (3 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Poe Dameron, I'll Come Back For You.
2. Pay: keep Credits.
3. Opponent: pass.
4. Sabine Wren, Spectre Five attacks Shield Generator Complex.

**Verified:** Winner: p1. 3 resources (1 ready), 0 Credits; 4 engine inputs replayed.

### 5. Aggressive Negotiations finishes before deployment

The event adds four power from the remaining hand. Take lethal now instead of adding another body.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: Aggressive Negotiations; Black One, Straight At Them; N-1 Starfighter; Zeb Orrelios, Fists Work Every Time; Beguile.
- Your ground: empty.
- Your space: N-1 Starfighter (3 power, 2 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Aggressive Negotiations.
2. N-1 Starfighter attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (3 ready), 0 Credits; 2 engine inputs replayed.

### 6. Do not delay a winning attack for leader value

With three base HP left, N-1 already wins. Deploying or playing Zeb gives the opponent an unnecessary response window.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: vader.

- Your hand: Zeb Orrelios, Fists Work Every Time.
- Your ground: empty.
- Your space: N-1 Starfighter (3 power, 2 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. N-1 Starfighter attacks Mos Eisley.

**Verified:** Winner: p1. 7 resources (7 ready), 0 Credits; 1 engine inputs replayed.

### 7. Aggro still trades when the base is about to fall

At two base HP, remove the ready enemy fighter. Attacking the healthy enemy base would lose the game next action.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: N-1 Starfighter (3 power, 2 HP; ready).
- Enemy ground: empty.
- Enemy space: First Order TIE Fighter (2 power, 1 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. N-1 Starfighter attacks First Order TIE Fighter.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 0 Credits; 1 engine inputs replayed.

### 8. Use Greef’s seven HP to clear the ground Sentinel

Greef survives the four-power counterattack. Trade the leader into Sentinel before trying to send smaller ground units through.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Greef Karga, Gracious Magistrate: deploy.
2. Opponent: pass.
3. Greef Karga, Gracious Magistrate attacks Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (6 ready), 0 Credits; 3 engine inputs replayed.

### 9. Plot the upgrade onto the ready ship

Deploy Greef, Plot Sudden Ferocity onto N-1, and attack for six. A newly played exhausted unit cannot use the bonus this turn.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: N-1 Starfighter (3 power, 2 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Greef Karga, Gracious Magistrate: deploy.
2. accept-effect: select Sudden Ferocity.
3. Play Sudden Ferocity on N-1 Starfighter.
4. Opponent: pass.
5. N-1 Starfighter attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (3 ready), 0 Credits; 5 engine inputs replayed.

### 10. Zeb puts the finishing Advantages on a ready attacker

Grant all three Advantages to ready Black One rather than the exhausted unit; being upgraded also activates Black One’s extra power.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: vader.

- Your hand: Zeb Orrelios, Fists Work Every Time.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready); N-1 Starfighter (3 power, 2 HP; exhausted).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Zeb Orrelios, Fists Work Every Time.
2. Resolve trigger on-friendly-played.
3. Choose Black One, Straight At Them.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 11. Beguile buys a turn against a lethal attacker — held out

Inspect the hand, then return the ready enemy ship. A base attack cannot win and would leave lethal in space.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: Beguile.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Beguile.
2. accept-effect.
3. Choose Death Space Skirmisher.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 12. Sabine strips the large upgrade before taking the trade — held out

Use Sabine’s nonunique-upgrade removal on the opposing Craving Power, then resolve Ambush against the weakened ground unit.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Sabine Wren, Spectre Five.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Door Technician (4 power, 4 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Sabine Wren, Spectre Five.
2. Resolve trigger on-played.
3. Choose Craving Power.
4. Resolve trigger on-friendly-played.
5. Choose Imperial Door Technician.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 5 engine inputs replayed.

## Vader Cunning

Archetypes: aggro, space-aggro.

### 1. Use the one-drop to start the fleet

Play First Order TIE on turn one instead of saving for Plot cards; it establishes the non-token Vehicle needed by Vader’s action.

**Position:** Round 1; 2 resources (2 ready), 0 Credits. Opponent: vader.

- Your hand: First Order TIE Fighter; Lurking Snub Fighter.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play First Order TIE Fighter.

**Verified:** The stated outcome assertions pass; game continues. 2 resources (1 ready), 0 Credits; 1 engine inputs replayed.

### 2. Attack with a non-token Vehicle before creating a TIE

The attack enables Vader’s ability. Create the extra TIE after that attack; token attacks alone do not enable it.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. First Order TIE Fighter attacks Mos Eisley.
2. Opponent: pass.
3. Use Darth Vader, Victor Squadron Leader: vehicle-squadron.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 0 Credits; 3 engine inputs replayed.

### 3. An established fleet enables Skirmisher’s disruption

Play Skirmisher while another friendly ship is present, and exhaust the enemy attacker that would otherwise deal lethal.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: luke.

- Your hand: Death Space Skirmisher.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; exhausted).
- Enemy ground: empty.
- Enemy space: Phoenix Squadron A-Wing (3 power, 2 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Death Space Skirmisher.
2. Choose Phoenix Squadron A-Wing.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 4. Deploy onto a ready fighter for the finishing attack

Vader adds five power and creates two TIEs, activating First Order TIE’s Raid. Use the ready host to finish immediately.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. Choose First Order TIE Fighter.
3. Opponent: pass.
4. First Order TIE Fighter attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (6 ready), 0 Credits; 4 engine inputs replayed.

### 5. Ground deployment avoids concentrating everything in space

The host is exhausted and a space-wipe deck is visible from its discard. Deploy to ground and remove the Sentinel.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; exhausted).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. deploy-unit.
3. Opponent: pass.
4. Darth Vader, Victor Squadron Leader attacks Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (6 ready), 0 Credits; 4 engine inputs replayed.

### 6. Plot Lurking Snub Fighter before the enemy can attack

Deploy to ground and Plot the stored ship, exhausting the lethal space attacker inside the same action.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. deploy-unit.
3. accept-effect: select Lurking Snub Fighter.
4. Play Lurking Snub Fighter.
5. Choose Chimaera, A Frightening Reality.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (3 ready), 0 Credits; 5 engine inputs replayed.

### 7. Garindan names space removal during the deployment window

Name Hyperspace Disaster against the ramp deck, inspect the matching revealed card, and discard it before exposing the fleet to a later action.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** The name is a matchup-based guess, not knowledge of the hidden hand. The subsequent discard choice uses only the engine’s reveal. Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. deploy-unit.
3. accept-effect: select Garindan, Information Broker.
4. Play Garindan, Information Broker.
5. Name Hyperspace Disaster.
6. accept-effect: select Hyperspace Disaster.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (4 ready), 0 Credits; 6 engine inputs replayed.

### 8. Palpatine’s Plot protects the ground while space attacks

Deploy the leader before playing Palpatine from resources so his two Spy tokens gain Sentinel for the phase.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. deploy-unit.
3. accept-effect: select Chancellor Palpatine, I Am the Senate.
4. Play Chancellor Palpatine, I Am the Senate.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (3 ready), 0 Credits; 4 engine inputs replayed.

### 9. Bounce the Sentinel to reopen the ground lane

Beguile clears Sentinel for deployed Vader while revealing the opponent’s hand. Take the base attack once the lane opens.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Beguile.
- Your ground: Darth Vader, Victor Squadron Leader (5 power, 6 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Beguile.
2. accept-effect.
3. Choose Imperial Armored Commando.
4. Opponent: pass.
5. Darth Vader, Victor Squadron Leader attacks Shield Generator Complex.

**Verified:** Winner: p1. 4 resources (1 ready), 0 Credits; 5 engine inputs replayed.

### 10. Craving Power removes a threat while growing the attacker

Upgrade the ready ship and direct its increased power into the opposing fighter; choose removal that preserves your attack.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: luke.

- Your hand: Craving Power.
- Your ground: empty.
- Your space: Death Space Skirmisher (3 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: Resistance Blue Squadron (3 power, 4 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Craving Power on Death Space Skirmisher.
2. Choose Resistance Blue Squadron.

**Verified:** The stated outcome assertions pass; game continues. 5 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 11. A space aggro deck must still stop immediate lethal — held out

Trade Skirmisher into the ready enemy fighter. Attacking the base does not win and leaves a fatal counterattack.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: luke.

- Your hand: empty.
- Your ground: empty.
- Your space: Death Space Skirmisher (3 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: Phoenix Squadron A-Wing (3 power, 2 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Death Space Skirmisher attacks Phoenix Squadron A-Wing.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (4 ready), 0 Credits; 1 engine inputs replayed.

### 12. Do not deploy a pilot onto an exhausted host for lethal — held out

Ground Vader enters ready and can deal the last five damage; the exhausted ship would remain exhausted after piloting.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: First Order TIE Fighter (2 power, 1 HP; exhausted).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Darth Vader, Victor Squadron Leader: deploy.
2. deploy-unit.
3. Opponent: pass.
4. Darth Vader, Victor Squadron Leader attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (6 ready), 0 Credits; 4 engine inputs replayed.

## Mandalorian Colossus

Archetypes: control.

### 1. Claim and pay for the opening card

With no urgent threat, claim initiative on turn one and pay one to draw. Preserve the remaining resource instead of forcing an inefficient curve.

**Position:** Round 1; 2 resources (2 ready), 0 Credits. Opponent: vader.

- Your hand: Rebellious Hammerhead; Anakin Skywalker, Champion of Mortis; Hyperspace Disaster.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. take-initiative.
2. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 2 resources (1 ready), 0 Credits; 2 engine inputs replayed.

### 2. Survival takes the resource needed for a bonus card

All three resources are needed to kill the lethal attacker. Remove it first; there is no resource left for a bonus draw this phase.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: Piercing Shot.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Piercing Shot.
2. Choose Death Space Skirmisher.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 3. Piercing Shot defeats the Shield before dealing damage

Use the removal that ignores the Shield’s protection and kills the three-HP Sentinel in one action.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Piercing Shot.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Piercing Shot.
2. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 4. Crushing Blow removes a cheap threat without a trade

Spend three to remove the enemy two-cost fighter while keeping your own ready ship for a later attack.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: luke.

- Your hand: Crushing Blow.
- Your ground: empty.
- Your space: Rebellious Hammerhead (5 power, 7 HP; ready).
- Enemy ground: empty.
- Enemy space: Phoenix Squadron A-Wing (3 power, 2 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Crushing Blow.
2. Choose Phoenix Squadron A-Wing.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 5. Play Bith Brute when claiming would expose lethal

The four-power ground attacker can kill the base. Put Sentinel in its way before taking a card-draw action.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Bith Brute.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Bith Brute.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 6. Hammerhead turns a preserved hand into removal

Three cards remain after paying for Hammerhead. Use its entry damage to remove the three-HP ground Sentinel and leave a large ship.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: Rebellious Hammerhead; Anakin Skywalker, Champion of Mortis; Hyperspace Disaster; Piercing Shot.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Rebellious Hammerhead.
2. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 7. Anakin’s reduction works through a Shield

Heroism is in the discard. Reduce the shielded Sentinel to zero HP instead of spending damage into its Shield.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: Anakin Skywalker, Champion of Mortis.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Anakin Skywalker, Champion of Mortis.
2. Resolve trigger discard-villainy.
3. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 8. Chimaera trades the cheap body and restores base health

Pay nine including the Villainy penalty. Sacrifice Door Technician to defeat the opposing capital ship, gaining both healing effects.

**Position:** Round 3; 9 resources (9 ready), 0 Credits. Opponent: krennic.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Imperial Door Technician (2 power, 2 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Chimaera, A Frightening Reality.
2. Choose Imperial Door Technician.
3. Choose Chimaera, A Frightening Reality.
4. trigger-player.
5. Resolve trigger when-defeated.

**Verified:** The stated outcome assertions pass; game continues. 9 resources (0 ready), 0 Credits; 5 engine inputs replayed.

### 9. Reset an overwhelming board before rebuilding

Single Reactor costs ten in this deck. Clear both arenas now; preserving one small body is not worth leaving two large enemy threats.

**Position:** Round 3; 10 resources (10 ready), 0 Credits. Opponent: krennic.

- Your hand: Single Reactor Ignition.
- Your ground: Outer Rim Constable (3 power, 1 HP; ready).
- Your space: empty.
- Enemy ground: Pre Vizsla, Strong-Willed Ruler (6 power, 6 HP; ready).
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Single Reactor Ignition.

**Verified:** The stated outcome assertions pass; game continues. 10 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 10. Stop controlling once the hand gives lethal

Hammerhead’s five power plus four remaining hand cards reaches nine. Finish the base instead of spending another removal spell.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: Aggressive Negotiations; Anakin Skywalker, Champion of Mortis; Hyperspace Disaster; Piercing Shot; Lost and Forgotten.
- Your ground: empty.
- Your space: Rebellious Hammerhead (5 power, 7 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Aggressive Negotiations.
2. Rebellious Hammerhead attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (3 ready), 0 Credits; 2 engine inputs replayed.

### 11. Clear imminent space lethal before claiming — held out

Seven resources exactly pay for Hyperspace Disaster. Wipe the two ships before choosing the normally attractive claim-and-draw line.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: vader.

- Your hand: Hyperspace Disaster.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Lurking Snub Fighter (2 power, 3 HP; ready); Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Hyperspace Disaster.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 12. A Credit preserves the resource for a bonus card — held out

Spend the Credit on removal, leaving one real resource. After the opponent develops another ship, claim and pay that resource to draw.

**Position:** Round 3; 3 resources (3 ready), 1 Credits. Opponent: vader.

- Your hand: Piercing Shot; Rebellious Hammerhead.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Piercing Shot.
2. accept-effect: select Credit.
3. Choose Death Space Skirmisher.
4. Opponent: Play First Order TIE Fighter.
5. take-initiative.
6. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 6 engine inputs replayed.

## Dedra Colossus

Archetypes: control.

### 1. Deploy on four and use the hand advantage for Raid

More cards in hand give Dedra four attacking power. Deploy and trade into the ground Sentinel while retaining the leader.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Chimaera, A Frightening Reality; Hyperspace Disaster.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Dedra Meero, Not Wasting Time: deploy.
2. Opponent: pass.
3. Dedra Meero, Not Wasting Time attacks Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (4 ready), 0 Credits; 3 engine inputs replayed.

### 2. Interrogate a meaningful threat, respecting the enemy’s choice

Target the capital ship. Here the opponent chooses two damage to preserve your small hand; do not train the learner to choose that response for the opponent.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Dedra Meero, Not Wasting Time: interrogate.
2. Choose Chimaera, A Frightening Reality.
3. Opponent: take-2-damage.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (2 ready), 0 Credits; 3 engine inputs replayed.

### 3. A fragile target can force the opponent to concede a card

Interrogate the one-HP fighter. The scripted opponent keeps it alive by allowing a draw, increasing Dedra’s hand pressure.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: First Order TIE Fighter (2 power, 1 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Dedra Meero, Not Wasting Time: interrogate.
2. Choose First Order TIE Fighter.
3. Opponent: opponent-draws.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (2 ready), 0 Credits; 3 engine inputs replayed.

### 4. Removal plus healing buys the time needed for top end

Lost and Forgotten removes the dangerous ship and heals three. Take the immediate stabilization instead of holding out for a bigger unit.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: Lost and Forgotten; Chimaera, A Frightening Reality.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Lost and Forgotten.
2. Choose Death Space Skirmisher.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 5. Use Hyperspace Disaster against the wide space board

Remove both ships with one card, preserving the ground Sentinel and avoiding two separate trades.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: vader.

- Your hand: Hyperspace Disaster.
- Your ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Lurking Snub Fighter (2 power, 3 HP; ready); Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Hyperspace Disaster.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 6. Single Reactor clears both arenas when single-target removal is too slow

Two large threats cover both arenas. Reset them together while the base can still survive.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: krennic.

- Your hand: Single Reactor Ignition.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Pre Vizsla, Strong-Willed Ruler (6 power, 6 HP; ready).
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Single Reactor Ignition.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 7. Trade Door Technician for the capital ship

Chimaera and Door Technician together heal four while replacing a cheap unit with a large ship and removing the opponent’s top end.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Imperial Door Technician (2 power, 2 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Chimaera, A Frightening Reality.
2. Choose Imperial Door Technician.
3. Choose Chimaera, A Frightening Reality.
4. trigger-player.
5. Resolve trigger when-defeated.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 5 engine inputs replayed.

### 8. Spend Pre Vizsla’s six-HP budget on two threats

Choose the two three-HP enemies instead of your own unit. Each defeated enemy becomes another Mandalorian body.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: vader.

- Your hand: Pre Vizsla, Strong-Willed Ruler.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Lurking Snub Fighter (2 power, 3 HP; ready); Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Pre Vizsla, Strong-Willed Ruler.
2. accept-effect: select Lurking Snub Fighter, Death Space Skirmisher.
3. Resolve trigger shielded-created.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 9. Remove the enemy’s top end without entering combat

No Glory, Only Results takes and defeats the capital ship. Clear the imminent space attack rather than deploying into ground.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: krennic.

- Your hand: No Glory, Only Results.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play No Glory, Only Results.
2. Choose Chimaera, A Frightening Reality.

**Verified:** The stated outcome assertions pass; game continues. 5 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 10. Convert the hand advantage into lethal

Dedra has Raid 2 and Negotiations leaves four cards. Attack for eight rather than using another control action.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: vader.

- Your hand: Aggressive Negotiations; Hyperspace Disaster; Chimaera, A Frightening Reality; Pre Vizsla, Strong-Willed Ruler; Lost and Forgotten.
- Your ground: Dedra Meero, Not Wasting Time (2 power, 5 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Aggressive Negotiations.
2. Dedra Meero, Not Wasting Time attacks Mos Eisley.

**Verified:** Winner: p1. 5 resources (2 ready), 0 Credits; 2 engine inputs replayed.

### 11. Take leader lethal instead of drawing more cards — held out

Hand advantage already gives four power. Finish the base before playing an unnecessary expensive unit.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: vader.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Dedra Meero, Not Wasting Time (2 power, 5 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Dedra Meero, Not Wasting Time attacks Mos Eisley.

**Verified:** Winner: p1. 7 resources (7 ready), 0 Credits; 1 engine inputs replayed.

### 12. A ready capital ship must stop lethal before attacking base — held out

Use Chimaera to kill the ready attacker. The two-point heal is also valuable when the base has only two HP.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Chimaera, A Frightening Reality attacks Death Space Skirmisher.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (8 ready), 0 Credits; 1 engine inputs replayed.

## Aurra Data Vault

Archetypes: control, midrange.

### 1. Use Aurra’s free action on the one-HP attacker

Remove the ready fighter before spending resources. The ability can target either side, so choose the enemy unit.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: Lepi Lookout (3 power, 1 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: First Order TIE Fighter (2 power, 1 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Aurra Sing, Assassin: defeat-unit.
2. Choose First Order TIE Fighter.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 0 Credits; 2 engine inputs replayed.

### 2. Combat sets up Aurra to finish a larger ship

Pirate Snub deals two into the three-HP ship. After the opponent’s pass, use Aurra to finish the one remaining HP.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: Pirate Snub Fighter (2 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Pirate Snub Fighter attacks Death Space Skirmisher.
2. Opponent: pass.
3. Use Aurra Sing, Assassin: defeat-unit.
4. Choose Death Space Skirmisher.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (4 ready), 0 Credits; 4 engine inputs replayed.

### 3. Deploy Aurra to remove a five-HP capital ship

The damaged Chimaera is within the deployment trigger’s five-HP limit. Remove it and leave Aurra ready on the ground.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 5 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Aurra Sing, Assassin: deploy.
2. Choose Chimaera, A Frightening Reality.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (7 ready), 0 Credits; 2 engine inputs replayed.

### 4. Use the deployment removal on the expensive threat

Both enemies qualify, but the five-HP capital ship is the immediate danger. Preserve other removal for the cheap body.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Door Technician (2 power, 2 HP; ready).
- Enemy space: Chimaera, A Frightening Reality (6 power, 5 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Aurra Sing, Assassin: deploy.
2. Choose Chimaera, A Frightening Reality.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (7 ready), 0 Credits; 2 engine inputs replayed.

### 5. A unit upgrade supplies removal and a stronger body

Pay seven including the Command penalty, grow Dark Trooper to five power, and direct that damage into the opposing ship.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: luke.

- Your hand: Craving Power.
- Your ground: Imperial Dark Trooper (3 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Resistance Blue Squadron (3 power, 4 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Craving Power on Imperial Dark Trooper.
2. Choose Resistance Blue Squadron.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (2 ready), 0 Credits; 2 engine inputs replayed.

### 6. Sacrifice the cheap lookout rather than your valuable attacker

Chimaera replaces a cheap exhausted unit while removing the enemy capital ship. Keep the healthy ground attacker for future turns.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Lepi Lookout (3 power, 1 HP; exhausted); Imperial Dark Trooper (3 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Chimaera, A Frightening Reality.
2. Choose Lepi Lookout.
3. Choose Chimaera, A Frightening Reality.
4. trigger-player.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 4 engine inputs replayed.

### 7. Use Villainy in the discard to remove a shielded Sentinel

Anakin’s Villainy trigger gives -3/-3 through the Shield. Keep the newly played body instead of making an inefficient combat trade.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: Anakin Skywalker, Champion of Mortis.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Anakin Skywalker, Champion of Mortis.
2. Resolve trigger discard-heroism.
3. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 8. Pre Vizsla changes a wide enemy board into your own units

Use the entire six-HP removal budget on the two three-HP ships. Do not consume the friendly attacker in the selection.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: vader.

- Your hand: Pre Vizsla, Strong-Willed Ruler.
- Your ground: Imperial Dark Trooper (3 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Lurking Snub Fighter (2 power, 3 HP; ready); Death Space Skirmisher (3 power, 3 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Pre Vizsla, Strong-Willed Ruler.
2. accept-effect: select Lurking Snub Fighter, Death Space Skirmisher.
3. Resolve trigger shielded-created.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (0 ready), 0 Credits; 3 engine inputs replayed.

### 9. Play Sentinel when deployment is still three resources away

The base cannot survive the ground attack. Play Armored Commando now instead of waiting for Aurra’s deployment removal.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Imperial Armored Commando; Chimaera, A Frightening Reality.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 10. Take space lethal against a slower ground board

Chimaera already deals the last six damage. End the game rather than removing a harmless exhausted ground body.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).
- Enemy ground: Imperial Door Technician (2 power, 2 HP; exhausted).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Chimaera, A Frightening Reality attacks Shield Generator Complex.

**Verified:** Winner: p1. 8 resources (8 ready), 0 Credits; 1 engine inputs replayed.

### 11. Damage a six-HP target before deploying Aurra — held out

Undamaged Chimaera is outside the five-HP limit. Attack it first to bring it into range, then deploy and remove it.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Pirate Snub Fighter (2 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: Chimaera, A Frightening Reality (6 power, 6 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Pirate Snub Fighter attacks Chimaera, A Frightening Reality.
2. Opponent: pass.
3. Use Aurra Sing, Assassin: deploy.
4. Choose Chimaera, A Frightening Reality.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (7 ready), 0 Credits; 4 engine inputs replayed.

### 12. Remove Krennic’s economy unit while building board advantage — held out

No Glory removes the discount engine without losing one of your own attackers. This line targets future ramp rather than damage to the base.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: krennic.

- Your hand: No Glory, Only Results.
- Your ground: Imperial Dark Trooper (3 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: Director Krennic, On the Verge of Greatness (2 power, 2 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play No Glory, Only Results.
2. Choose Director Krennic, On the Verge of Greatness.

**Verified:** The stated outcome assertions pass; game continues. 5 resources (0 ready), 0 Credits; 2 engine inputs replayed.

## Krennic ramp

Archetypes: ramp, control.

### 1. The full four-round ramp opening

Mercenary must die on round two: its exhausted resource and a second Credit make Carrier reachable on round three.

**Position:** Round 1; 2 resources (2 ready), 0 Credits. Opponent: Vader.

- Your hand: Director Krennic, On the Verge of Greatness; Ant Droid; Expendable Mercenary; Resupply Carrier.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** Scripted unpressured line: opponent passes. Starting hand has exactly four cards; Ant Droid draws the staged Chimaera. Regroup adds one resource each round. This proves the curve is legal, not that passing opponents are realistic.

1. Play Director Krennic, On the Verge of Greatness.
2. Opponent: pass.
3. Play Ant Droid.
4. Opponent: pass.
5. Use Director Krennic, Amidst My Achievement: create-credit; sacrifice Ant Droid.
6. Opponent: pass.
7. Regroup: both players pass, draw, and resource an unlabelled card.
8. Play Expendable Mercenary.
9. Pay: keep Credits.
10. Opponent: pass.
11. Use Director Krennic, Amidst My Achievement: create-credit; sacrifice Expendable Mercenary.
12. Accept the exhausted resource gain.
13. Opponent: pass.
14. Regroup: both players pass, draw, and resource an unlabelled card.
15. Play Resupply Carrier.
16. accept-effect: select Credit.
17. Accept the exhausted resource gain.
18. Opponent: pass.
19. Regroup: both players pass, draw, and resource an unlabelled card.
20. Play Chimaera, A Frightening Reality.
21. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 1 Credits; 27 engine inputs replayed.

### 2. The unit discount is only once per round

Sacrifice the first Ant for a Credit, then spend it on the second Ant. The leader is now exhausted and cannot repeat the sacrifice this round.

**Position:** Round 3; 3 resources (0 ready), 0 Credits. Opponent: Vader.

- Your hand: Ant Droid; Ant Droid.
- Your ground: Director Krennic, On the Verge of Greatness (2 power, 2 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** The Krennic unit is already in play; its first qualifying play reduction is unused. All three real resources are exhausted. The leader is ready and the opponent passes.

1. Play Ant Droid.
2. Opponent: pass.
3. Use Director Krennic, Amidst My Achievement: create-credit; sacrifice Ant Droid.
4. Opponent: pass.
5. Play Ant Droid.
6. Accept and spend the available Credits.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 6 engine inputs replayed.

### 3. The Krennic unit is missing

Spend exactly one Credit; do not assume the discounted cost always applies.

**Position:** Round 2; 3 resources (3 ready), 1 Credits. Opponent: Vader.

- Your hand: Expendable Mercenary.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** The one-resource discount is absent. Mercenary costs four, so the saved Credit covers the shortfall.

1. Play Expendable Mercenary.
2. accept-effect: select Credit.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 4. Sacrifice toward an immediate space clear

Sacrifice Mercenary, absorb one attack, then spend five resources plus two Credits on Disaster. The new real resource is exhausted and cannot pay now.

**Position:** Round 3; 5 resources (5 ready), 1 Credits. Opponent: Vader.

- Your hand: Hyperspace Disaster.
- Your ground: Expendable Mercenary (3 power, 3 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Stolen AT-Hauler (4 power, 5 HP; ready); A-Wing (1 power, 2 HP; exhausted).

**Assumptions:** Your base has 12 HP. The opponent attacks for four between your sacrifice and the wipe; taking that hit is survivable. No opponent disruption is scripted.

1. Use Director Krennic, Amidst My Achievement: create-credit; sacrifice Expendable Mercenary.
2. Accept the exhausted resource gain.
3. Opponent: Stolen AT-Hauler attacks Shield Generator Complex.
4. Play Hyperspace Disaster.
5. Accept and spend the available Credits.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 0 Credits; 5 engine inputs replayed.

### 5. Ground lethal: defend before ramping

Play the shielded ground Sentinel and keep both Credits; the attacker must hit it.

**Position:** Round 3; 4 resources (4 ready), 2 Credits. Opponent: Greef.

- Your hand: Imperial Armored Commando; Resupply Carrier.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Karis Nemik, Freedom is a Pure Idea (3 power, 2 HP; ready).
- Enemy space: empty.

**Assumptions:** A ready Karis Nemik threatens three ground damage. It has no Saboteur and no removal is scripted. The opponent can attack immediately after your play.

1. Play Imperial Armored Commando.
2. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (0 ready), 2 Credits; 2 engine inputs replayed.

### 6. Ramp would take one action too many — held out

Play Hyperspace Disaster immediately.

**Position:** Round 3; 8 resources (7 ready), 0 Credits. Opponent: Vader.

- Your hand: Hyperspace Disaster; No Glory, Only Results.
- Your ground: Ant Droid (1 power, 2 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Snub Fighter Squadron (4 power, 3 HP; ready).

**Assumptions:** Your base has 4 HP and a ready Snub Fighter Squadron attacks for four. A spare Credit or extra card is worthless if the opponent wins before your next action.

1. Play Hyperspace Disaster.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 7. Keep the unit that can win now

Attack the base for four.

**Position:** Round 8; 9 resources (9 ready), 0 Credits. Opponent: Vader.

- Your hand: empty.
- Your ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** No enemy Sentinel blocks the attack. This is a forced immediate win, not a general ban on late-game sacrifices.

1. Imperial Armored Commando attacks Mos Eisley.

**Verified:** Winner: p1. 9 resources (9 ready), 0 Credits; 1 engine inputs replayed.

### 8. A late sacrifice still enables Koska

Door heals two; the friendly defeat enables Koska to create a Mandalorian, which gives her Sentinel. The Credit is an additional benefit.

**Position:** Round 7; 8 resources (8 ready), 0 Credits. Opponent: Greef.

- Your hand: Koska Reeves, Warrior of Mandalore.
- Your ground: Imperial Door Technician (2 power, 2 HP; exhausted).
- Your space: empty.
- Enemy ground: Karis Nemik, Freedom is a Pure Idea (3 power, 2 HP; exhausted).
- Enemy space: empty.

**Assumptions:** Your base has 12 HP and the opponent has already exhausted its ground attacker. You can afford the extra action. No friendly unit has died this phase yet.

1. Use Director Krennic, Amidst My Achievement: create-credit; sacrifice Imperial Door Technician.
2. Opponent: pass.
3. Play Koska Reeves, Warrior of Mandalore.
4. Pay: keep Credits.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (4 ready), 1 Credits; 4 engine inputs replayed.

### 9. Spend the Credit before Arvel can destroy it

Spend the Credit on Mercenary despite having enough ordinary resources. Arvel then deals four instead of five; one resource remains ready.

**Position:** Round 3; 4 resources (4 ready), 1 Credits. Opponent: Greef + sideboard Arvel.

- Your hand: Expendable Mercenary.
- Your ground: empty.
- Your space: empty.
- Enemy ground: Arvel Skeen, Win and Walk Away (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:** This is an explicit sideboard stress variant: one Zeb Orrelios is replaced with Arvel. Arvel can destroy either player’s Credit on attack and deal one extra damage.

1. Play Expendable Mercenary.
2. accept-effect: select Credit.
3. Opponent: Arvel Skeen, Win and Walk Away attacks Shield Generator Complex.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (1 ready), 0 Credits; 3 engine inputs replayed.

### 10. Credit tokens can be present but unusable — held out

Commando kills Galen; after the scripted opponent pass, the Credit works again and pays the Mercenary shortfall.

**Position:** Round 3; 4 resources (3 ready), 1 Credits. Opponent: Greef + explicit Galen stress variant.

- Your hand: Expendable Mercenary; Pre Vizsla, Strong-Willed Ruler.
- Your ground: Imperial Armored Commando (5 power, 4 HP; ready).
- Your space: empty.
- Enemy ground: Galen Erso, You'll Never Win (3 power, 5 HP; exhausted).
- Enemy space: empty.

**Assumptions:** Galen, You’ll Never Win replaces one Zeb in this stress variant and is played normally for six including the missing Vigilance aspect. Its naming effect is the same when played with Plot. Your ready Commando has an Experience token (5 power). The ordinary Vader list contains a different Galen.

1. Imperial Armored Commando attacks Galen Erso, You'll Never Win.
2. Opponent: pass.
3. Play Expendable Mercenary.
4. accept-effect: select Credit.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (0 ready), 0 Credits; 8 engine inputs replayed.

### 11. Credits pay for cards, not leader deployment

Play Chimaera with six resources plus one Credit.

**Position:** Round 3; 6 resources (6 ready), 2 Credits. Opponent: Vader.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:** Krennic requires seven real resources. The deploy action may be offered as a no-effect action by the current engine; it does not deploy the leader below threshold.

1. Play Chimaera, A Frightening Reality.
2. accept-effect: select Credit.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (0 ready), 1 Credits; 2 engine inputs replayed.

### 12. Stabilize with Chimaera and the cheap sacrifice

Sacrifice Door Technician and remove Squadron, retaining the 6/6 Chimaera and resolving both healing triggers.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: Vader.

- Your hand: Chimaera, A Frightening Reality.
- Your ground: Imperial Door Technician (2 power, 2 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: Snub Fighter Squadron (4 power, 3 HP; ready).

**Assumptions:** Seven ready resources; exhausted Door Technician already in play; own base at 12 HP. Chimaera may sacrifice itself, but that gives up the stabilizing ship.

1. Play Chimaera, A Frightening Reality.
2. Choose Imperial Door Technician.
3. Choose Snub Fighter Squadron.
4. Resolve trigger when-defeated.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (0 ready), 0 Credits; 4 engine inputs replayed.

## Chewbacca Alliance Outpost

Archetypes: aggro.

### 1. Turn-one Shield becomes a turn-two Chewbacca

Play Shielded Sage, exchange its Shield for a Credit, and spend that Credit with three resources to deploy Chewbacca.

**Position:** Round 1; 2 resources (2 ready), 0 Credits. Opponent: vader.

- Your hand: Secretive Sage; Black One, Straight At Them; Mastery; Commence the Festivities.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Secretive Sage.
2. Opponent: pass.
3. Use Alliance Outpost: exchange-token.
4. accept-effect: select Shield.
5. credit.
6. Opponent: pass.
7. Regroup: both players pass, draw, and resource an unlabelled card.
8. Use Chewbacca, Hero of Kessel: deploy.
9. accept-effect: select Credit.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 11 engine inputs replayed.

### 2. A defensive upgrade preserves the main attacker

Chewbacca has two remaining HP. Mastery costs three on this unique unit and raises its remaining HP to five before the opponent can attack.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Mastery.
- Your ground: Chewbacca, Hero of Kessel (5 power, 2 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Mastery on Chewbacca, Hero of Kessel.
2. Opponent: Imperial Armored Commando attacks Chewbacca, Hero of Kessel.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 2 engine inputs replayed.

### 3. Nimble Prowess buys a protected attack

Upgrade Chewbacca and exhaust the ready ground attacker; preserve the leader while continuing pressure.

**Position:** Round 3; 2 resources (2 ready), 0 Credits. Opponent: krennic.

- Your hand: Nimble Prowess.
- Your ground: Chewbacca, Hero of Kessel (5 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Nimble Prowess on Chewbacca, Hero of Kessel.
2. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 2 resources (1 ready), 0 Credits; 2 engine inputs replayed.

### 4. Commence the Festivities goes around Sentinel

At one fewer resource, Chewbacca gains +2 power and Saboteur. Attack the seven-HP base instead of trading into Sentinel.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Commence the Festivities.
- Your ground: Chewbacca, Hero of Kessel (5 power, 6 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Commence the Festivities.
2. Choose Chewbacca, Hero of Kessel.
3. Chewbacca, Hero of Kessel attacks Shield Generator Complex.
4. Resolve trigger resource-shot.
5. decline-effect.

**Verified:** Winner: p1. 4 resources (3 ready), 0 Credits; 5 engine inputs replayed.

### 5. Hotshot clears Sentinel before declaring the attack

The damaged Sentinel has two HP left. Hotshot removes it first, allowing Chewbacca to attack the base.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Hotshot Maneuver.
- Your ground: Chewbacca, Hero of Kessel (5 power, 6 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 2 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Hotshot Maneuver.
2. Choose Chewbacca, Hero of Kessel.
3. accept-effect: select Imperial Armored Commando.
4. Chewbacca, Hero of Kessel attacks Shield Generator Complex.
5. decline-effect.

**Verified:** Winner: p1. 4 resources (3 ready), 0 Credits; 5 engine inputs replayed.

### 6. An On Attack shot avoids combat damage

Attack the two-HP Sentinel, sacrifice one resource, and shoot it before combat. Chewbacca survives and a Credit replaces the spending power.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: Chewbacca, Hero of Kessel (5 power, 2 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 2 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Chewbacca, Hero of Kessel attacks Imperial Armored Commando.
2. Pay: keep Credits.
3. accept-effect: select Unfettered Ambition.
4. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 1 Credits; 4 engine inputs replayed.

### 7. Do not sacrifice a resource for an unnecessary shot

The base is already in lethal range and there is no unit to remove. Decline the optional resource sacrifice.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: Chewbacca, Hero of Kessel (5 power, 6 HP; ready).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Chewbacca, Hero of Kessel attacks Mos Eisley.
2. decline-effect.

**Verified:** Winner: p1. 6 resources (6 ready), 0 Credits; 2 engine inputs replayed.

### 8. A free R2-D2 pilot improves Black One

Pilot R2-D2 for zero. Black One gains the pilot power and its own upgraded bonus; retain resources for later actions.

**Position:** Round 3; 2 resources (2 ready), 0 Credits. Opponent: vader.

- Your hand: R2-D2, Artooooooooo!.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play R2-D2, Artooooooooo! on Black One, Straight At Them.
2. Opponent: pass.
3. Black One, Straight At Them attacks Mos Eisley.

**Verified:** Winner: p1. 2 resources (2 ready), 0 Credits; 3 engine inputs replayed.

### 9. Strip the opposing Shield rather than your own protection

Constable removes the enemy Sentinel’s Shield. Preserve the Shield on your injured Chewbacca.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: Outer Rim Constable.
- Your ground: Chewbacca, Hero of Kessel (5 power, 3 HP; ready).
- Your space: empty.
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Outer Rim Constable.
2. Choose Shield.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (1 ready), 0 Credits; 2 engine inputs replayed.

### 10. Exchange expendable Experience and keep Chewbacca’s Shield

The base can sacrifice either token. Spend the Experience on exhausted Sage so Chewbacca keeps its protection.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: Chewbacca, Hero of Kessel (5 power, 6 HP; ready); Secretive Sage (3 power, 3 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Alliance Outpost: exchange-token.
2. accept-effect: select Experience.
3. credit.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 1 Credits; 3 engine inputs replayed.

### 11. A space threat can take priority over the ground plan — held out

With only two base HP, remove the ready enemy fighter using Black One before investing in a ground upgrade.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: vader.

- Your hand: Mastery.
- Your ground: Secretive Sage (2 power, 2 HP; ready).
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: First Order TIE Fighter (2 power, 1 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Black One, Straight At Them attacks First Order TIE Fighter.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (4 ready), 0 Credits; 1 engine inputs replayed.

### 12. A late token exchange can protect rather than ramp — held out

There is no spending shortfall. Exchange Experience for a Shield on wounded Chewbacca instead of another Credit.

**Position:** Round 3; 8 resources (8 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: Chewbacca, Hero of Kessel (5 power, 1 HP; ready); Secretive Sage (3 power, 3 HP; exhausted).
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Alliance Outpost: exchange-token.
2. accept-effect: select Experience.
3. shield.
4. Choose Chewbacca, Hero of Kessel.

**Verified:** The stated outcome assertions pass; game continues. 8 resources (8 ready), 0 Credits; 4 engine inputs replayed.

## Luke Data Vault

Archetypes: space-aggro.

### 1. Develop the fleet before saving for Ackbar

On three resources, establish Red Five. Ackbar’s later search is not a reason to pass an affordable ship now.

**Position:** Round 2; 3 resources (3 ready), 0 Credits. Opponent: vader.

- Your hand: Red Five, Running the Trench; Admiral Ackbar, Assume Attack Coordinates.
- Your ground: empty.
- Your space: empty.
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Red Five, Running the Trench.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (0 ready), 0 Credits; 1 engine inputs replayed.

### 2. Attack with a Fighter before activating Luke

Black One attacks first, enabling the leader’s one-damage ability to remove a weakened ground unit.

**Position:** Round 3; 3 resources (3 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 1 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Black One, Straight At Them attacks Shield Generator Complex.
2. Opponent: pass.
3. Use Luke Skywalker, Hero of Yavin: fighter-damage.
4. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 3 resources (3 ready), 0 Credits; 4 engine inputs replayed.

### 3. Luke’s ping primes Red Five’s ground removal

A Fighter has already attacked. Ping the undamaged Sentinel, then let Red Five finish it while attacking the base.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; exhausted); Red Five, Running the Trench (3 power, 4 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: fighter-damage.
2. Choose Imperial Armored Commando.
3. Opponent: pass.
4. Red Five, Running the Trench attacks Shield Generator Complex.
5. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 5 resources (5 ready), 0 Credits; 5 engine inputs replayed.

### 4. Sacrifice Ackbar and play the one-drop before Blue Squadron

Pay Ackbar’s actual seven-resource cost in this deck. Find Outland Protector plus Resistance Blue Squadron within the five-cost search budget; the one-drop increases Blue’s entry damage.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: Admiral Ackbar, Assume Attack Coordinates.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Admiral Ackbar, Assume Attack Coordinates.
2. defeat-ackbar.
3. search: select Outland Protector, Resistance Blue Squadron.
4. Play Outland Protector.
5. Play Resistance Blue Squadron.
6. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (2 ready), 0 Credits; 7 engine inputs replayed.

### 5. Keep Ackbar when the ground needs a large body

The fleet already dominates space. Keep the six-power ground body to contest the opponent’s ground units instead of concentrating still more value in space.

**Position:** Round 3; 7 resources (7 ready), 0 Credits. Opponent: krennic.

- Your hand: Admiral Ackbar, Assume Attack Coordinates.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready); Red Five, Running the Trench (3 power, 4 HP; ready); Resistance Blue Squadron (3 power, 4 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready); Pre Vizsla, Strong-Willed Ruler (6 power, 6 HP; exhausted).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Admiral Ackbar, Assume Attack Coordinates.
2. keep-ackbar.

**Verified:** The stated outcome assertions pass; game continues. 7 resources (2 ready), 0 Credits; 2 engine inputs replayed.

### 6. Pilot a ready Fighter for immediate space lethal

Deploy Luke onto ready Black One, then use the granted On Attack damage to clear the ground unit while finishing the base.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: deploy.
2. Choose Black One, Straight At Them.
3. Opponent: pass.
4. Black One, Straight At Them attacks Shield Generator Complex.
5. Resolve trigger on-attack.
6. Choose Imperial Armored Commando.

**Verified:** Winner: p1. 6 resources (6 ready), 0 Credits; 6 engine inputs replayed.

### 7. Choose ground when the ship cannot act and space is exposed

The ship is exhausted and the opponent’s visible discard confirms a space-wipe deck. Deploy Luke as a ready ground unit to remove Sentinel now.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: krennic.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; exhausted).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: deploy.
2. deploy-unit.
3. Opponent: pass.
4. Luke Skywalker, Hero of Yavin attacks Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 6 resources (6 ready), 0 Credits; 4 engine inputs replayed.

### 8. Plot Cinta converts deployment into an immediate attack

Deploy onto the ready Fighter and play Cinta from resources. Her attack happens inside the deployment sequence, before the opponent receives an action.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: deploy.
2. Choose Black One, Straight At Them.
3. accept-effect: select Cinta Kaz, The Struggle Comes First.
4. Play Cinta Kaz, The Struggle Comes First.
5. Choose Black One, Straight At Them.
6. Black One, Straight At Them attacks Mos Eisley.
7. Resolve trigger on-attack.
8. decline-effect.

**Verified:** Winner: p1. 6 resources (0 ready), 0 Credits; 8 engine inputs replayed.

### 9. Choose the Plot upgrade that supplies lethal power

Ground Luke alone deals five. Plot Sudden Ferocity onto him, keep the other resources for later actions, then attack for eight.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; exhausted).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: deploy.
2. deploy-unit.
3. accept-effect: select Sudden Ferocity.
4. Play Sudden Ferocity on Luke Skywalker, Hero of Yavin.
5. Opponent: pass.
6. Luke Skywalker, Hero of Yavin attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (3 ready), 0 Credits; 6 engine inputs replayed.

### 10. A wider fleet turns Air Superiority into ground control

Two ships beat one for the event’s condition. Spend four including the Command penalty to remove the ground Sentinel.

**Position:** Round 3; 4 resources (4 ready), 0 Credits. Opponent: krennic.

- Your hand: Air Superiority.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; ready); Red Five, Running the Trench (3 power, 4 HP; ready).
- Enemy ground: Imperial Armored Commando (4 power, 3 HP; ready).
- Enemy space: Resupply Carrier (4 power, 5 HP; ready).

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Air Superiority.
2. Choose Imperial Armored Commando.

**Verified:** The stated outcome assertions pass; game continues. 4 resources (2 ready), 0 Credits; 2 engine inputs replayed.

### 11. An exhausted pilot host does not ready on deployment — held out

The base has five HP. Deploy Luke to ground for a ready attacker; piloting the exhausted ship would miss this lethal window.

**Position:** Round 3; 6 resources (6 ready), 0 Credits. Opponent: vader.

- Your hand: empty.
- Your ground: empty.
- Your space: Black One, Straight At Them (2 power, 3 HP; exhausted).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Use Luke Skywalker, Hero of Yavin: deploy.
2. deploy-unit.
3. Opponent: pass.
4. Luke Skywalker, Hero of Yavin attacks Mos Eisley.

**Verified:** Winner: p1. 6 resources (6 ready), 0 Credits; 4 engine inputs replayed.

### 12. Keep the hand large for Aggressive Negotiations — held out

The event leaves four cards in hand, giving Phoenix +4 power. Play the finisher before spending cards on unnecessary development.

**Position:** Round 3; 5 resources (5 ready), 0 Credits. Opponent: vader.

- Your hand: Aggressive Negotiations; Black One, Straight At Them; Red Five, Running the Trench; Resistance Blue Squadron; Admiral Ackbar, Assume Attack Coordinates.
- Your ground: empty.
- Your space: Phoenix Squadron A-Wing (3 power, 2 HP; ready).
- Enemy ground: empty.
- Enemy space: empty.

**Assumptions:**  Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.

1. Play Aggressive Negotiations.
2. Phoenix Squadron A-Wing attacks Mos Eisley.

**Verified:** Winner: p1. 5 resources (2 ready), 0 Credits; 2 engine inputs replayed.

All 96 representative lines passed; 326 engine inputs replayed. The test suite additionally checks every variation.
