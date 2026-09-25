import assert from 'node:assert/strict';
import { ability, attack, play, step, target } from './runner.ts';
import {
  c,
  dead,
  decline,
  exercise as ex,
  mode,
  search,
  select,
  wait,
  won,
  zone,
} from './positions.ts';
const black = 'black-one--straight-at-them',
  red = 'red-five--running-the-trench';
const blue = 'resistance-blue-squadron',
  ackbar = 'admiral-ackbar--assume-attack-coordinates';
const phoenix = 'phoenix-squadron-a-wing',
  commando = 'imperial-armored-commando';
const cinta = 'cinta-kaz--the-struggle-comes-first',
  negotiations = 'aggressive-negotiations';
const deploy = ability('leader', 'deploy'),
  ping = ability('leader', 'fighter-damage');
export const lukeExercises = [
  ex(
    'luke',
    'early-fleet',
    'Develop the fleet before saving for Ackbar',
    'On three resources, establish Red Five. Ackbar’s later search is not a reason to pass an affordable ship now.',
    { resources: 3, round: 2, hand: [c(red, 'red'), c(ackbar, 'ackbar')] },
    [play('red')],
    zone('red', 'space'),
  ),
  ex(
    'luke',
    'attack-before-ping',
    'Attack with a Fighter before activating Luke',
    'Black One attacks first, enabling the leader’s one-damage ability to remove a weakened ground unit.',
    {
      resources: 3,
      space: [c(black, 'ship')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat', { damage: 2 })],
    },
    [attack('ship', 'enemy-base'), wait, ping, target('threat')],
    dead('threat'),
  ),
  ex(
    'luke',
    'ping-primes-red-five',
    'Luke’s ping primes Red Five’s ground removal',
    'A Fighter has already attacked. Ping the undamaged Sentinel, then let Red Five finish it while attacking the base.',
    {
      resources: 5,
      space: [c(black, 'ship', { exhausted: true }), c(red, 'red')],
      attacked: ['ship'],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
    },
    [ping, target('sentinel'), wait, attack('red', 'enemy-base'), target('sentinel')],
    dead('sentinel'),
  ),
  ex(
    'luke',
    'ackbar-fleet-order',
    'Sacrifice Ackbar and play the one-drop before Blue Squadron',
    'Pay Ackbar’s actual seven-resource cost in this deck. Find Outland Protector plus Resistance Blue Squadron within the five-cost search budget; the one-drop increases Blue’s entry damage.',
    {
      resources: 7,
      hand: [c(ackbar, 'ackbar')],
      space: [c(black, 'ship')],
      top: [c('outland-protector', 'one'), c(blue, 'blue')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [
      play('ackbar'),
      mode('defeat-ackbar'),
      search('one', 'blue'),
      play('one'),
      play('blue'),
      target('threat'),
    ],
    r => {
      dead('ackbar')(r);
      dead('threat')(r);
      zone('one', 'space')(r);
      zone('blue', 'space')(r);
    },
  ),
  ex(
    'luke',
    'keep-ackbar',
    'Keep Ackbar when the ground needs a large body',
    'The fleet already dominates space. Keep the six-power ground body to contest the opponent’s ground units instead of concentrating still more value in space.',
    {
      resources: 7,
      hand: [c(ackbar, 'ackbar')],
      space: [c(black, 'ship'), c(red, 'red'), c(blue, 'blue')],
      opponent: 'krennic',
      enemyGround: [
        c(commando, 'sentinel'),
        c('pre-vizsla--strong-willed-ruler', 'pre', { exhausted: true }),
      ],
    },
    [play('ackbar'), mode('keep-ackbar')],
    zone('ackbar', 'ground'),
  ),
  ex(
    'luke',
    'pilot-lethal',
    'Pilot a ready Fighter for immediate space lethal',
    'Deploy Luke onto ready Black One, then use the granted On Attack damage to clear the ground unit while finishing the base.',
    {
      resources: 6,
      enemyHp: 7,
      space: [c(black, 'ship')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [
      deploy,
      target('ship'),
      wait,
      attack('ship', 'enemy-base'),
      { ...step('trigger'), ability: 'on-attack' },
      target('threat'),
    ],
    won,
  ),
  ex(
    'luke',
    'ground-deploy',
    'Choose ground when the ship cannot act and space is exposed',
    'The ship is exhausted and the opponent’s visible discard confirms a space-wipe deck. Deploy Luke as a ready ground unit to remove Sentinel now.',
    {
      resources: 6,
      space: [c(black, 'ship', { exhausted: true })],
      opponent: 'krennic',
      enemyDiscard: [c('hyperspace-disaster', 'known-disaster')],
      enemyGround: [c(commando, 'sentinel')],
    },
    [deploy, mode('deploy-unit'), wait, attack('leader', 'sentinel')],
    r => {
      dead('sentinel')(r);
      zone('leader', 'ground')(r);
    },
  ),
  ex(
    'luke',
    'plot-cinta',
    'Plot Cinta converts deployment into an immediate attack',
    'Deploy onto the ready Fighter and play Cinta from resources. Her attack happens inside the deployment sequence, before the opponent receives an action.',
    { resources: 6, enemyHp: 7, space: [c(black, 'ship')], plot: [c(cinta, 'cinta')] },
    [
      deploy,
      target('ship'),
      select('cinta'),
      play('cinta'),
      target('ship'),
      attack('ship', 'enemy-base'),
      { ...step('trigger'), ability: 'on-attack' },
      decline(),
    ],
    won,
  ),
  ex(
    'luke',
    'plot-upgrade',
    'Choose the Plot upgrade that supplies lethal power',
    'Ground Luke alone deals five. Plot Sudden Ferocity onto him, keep the other resources for later actions, then attack for eight.',
    {
      resources: 6,
      enemyHp: 8,
      plot: [c('sudden-ferocity', 'ferocity')],
      space: [c(black, 'ship', { exhausted: true })],
    },
    [
      deploy,
      mode('deploy-unit'),
      select('ferocity'),
      { ...play('ferocity'), target: 'leader' },
      wait,
      attack('leader', 'enemy-base'),
    ],
    won,
  ),
  ex(
    'luke',
    'air-superiority',
    'A wider fleet turns Air Superiority into ground control',
    'Two ships beat one for the event’s condition. Spend four including the Command penalty to remove the ground Sentinel.',
    {
      resources: 4,
      hand: [c('air-superiority', 'event')],
      space: [c(black, 'ship'), c(red, 'red')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
      enemySpace: [c('resupply-carrier', 'carrier')],
    },
    [play('event'), target('sentinel')],
    dead('sentinel'),
  ),
  ex(
    'luke',
    'exhausted-host',
    'An exhausted pilot host does not ready on deployment',
    'The base has five HP. Deploy Luke to ground for a ready attacker; piloting the exhausted ship would miss this lethal window.',
    { resources: 6, enemyHp: 5, space: [c(black, 'ship', { exhausted: true })] },
    [deploy, mode('deploy-unit'), wait, attack('leader', 'enemy-base')],
    won,
  ),
  ex(
    'luke',
    'hand-finisher',
    'Keep the hand large for Aggressive Negotiations',
    'The event leaves four cards in hand, giving Phoenix +4 power. Play the finisher before spending cards on unnecessary development.',
    {
      resources: 5,
      enemyHp: 7,
      space: [c(phoenix, 'ship')],
      hand: [
        c(negotiations, 'event'),
        c(black, 'black'),
        c(red, 'red'),
        c(blue, 'blue'),
        c(ackbar, 'ackbar'),
      ],
    },
    [play('event'), attack('ship', 'enemy-base')],
    won,
  ),
];
