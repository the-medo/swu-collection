import assert from 'node:assert/strict';
import { ability, attack, pay, play, step, target } from './runner.ts';
import {
  c,
  dead,
  decline,
  exercise as ex,
  exhausted,
  mode,
  select,
  wait,
  won,
} from './positions.ts';
const sage = 'secretive-sage',
  black = 'black-one--straight-at-them',
  commando = 'imperial-armored-commando';
const mastery = 'mastery',
  nimble = 'nimble-prowess',
  festivities = 'commence-the-festivities';
const deploy = ability('leader', 'deploy');
const shot = [pay(), select('resource1'), target('sentinel')];
export const chewbaccaExercises = [
  ex(
    'chewbacca',
    'opening',
    'Turn-one Shield becomes a turn-two Chewbacca',
    'Play Shielded Sage, exchange its Shield for a Credit, and spend that Credit with three resources to deploy Chewbacca.',
    {
      round: 1,
      resources: 2,
      hand: [c(sage, 'sage'), c(black, 'ship'), c(mastery, 'buff'), c(festivities, 'event')],
    },
    [
      play('sage'),
      wait,
      ability('base', 'exchange-token'),
      select('shield1'),
      mode('credit'),
      wait,
      { nextRound: true },
      deploy,
      pay(['credit1']),
    ],
    r => {
      assert.equal(r.state.round, 2);
      assert.equal(r.count(), 3);
      assert.equal(r.credits(), 0);
      assert.equal(r.card('leader').zone, 'ground');
    },
  ),
  ex(
    'chewbacca',
    'protect-leader',
    'A defensive upgrade preserves the main attacker',
    'Chewbacca has two remaining HP. Mastery costs three on this unique unit and raises its remaining HP to five before the opponent can attack.',
    {
      resources: 3,
      deployed: 'unit',
      leaderDamage: 4,
      hand: [c(mastery, 'buff')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [
      { ...play('buff'), target: 'leader' },
      { ...attack('threat', 'leader'), actor: 'p2', teach: false },
    ],
    r => {
      assert.equal(r.card('leader').zone, 'ground');
      assert.equal(r.card('leader').damage, 8);
    },
  ),
  ex(
    'chewbacca',
    'exhaust-threat',
    'Nimble Prowess buys a protected attack',
    'Upgrade Chewbacca and exhaust the ready ground attacker; preserve the leader while continuing pressure.',
    {
      resources: 2,
      deployed: 'unit',
      leaderDamage: 3,
      hand: [c(nimble, 'buff')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [{ ...play('buff'), target: 'leader' }, target('threat')],
    exhausted('threat'),
  ),
  ex(
    'chewbacca',
    'bypass-sentinel',
    'Commence the Festivities goes around Sentinel',
    'At one fewer resource, Chewbacca gains +2 power and Saboteur. Attack the seven-HP base instead of trading into Sentinel.',
    {
      resources: 4,
      enemyResources: 5,
      enemyHp: 7,
      deployed: 'unit',
      opponent: 'krennic',
      hand: [c(festivities, 'event')],
      enemyGround: [c(commando, 'sentinel')],
    },
    [
      play('event'),
      target('leader'),
      attack('leader', 'enemy-base'),
      { ...step('trigger'), ability: 'resource-shot' },
      decline(),
    ],
    won,
  ),
  ex(
    'chewbacca',
    'hotshot-clear',
    'Hotshot clears Sentinel before declaring the attack',
    'The damaged Sentinel has two HP left. Hotshot removes it first, allowing Chewbacca to attack the base.',
    {
      resources: 4,
      enemyHp: 5,
      deployed: 'unit',
      opponent: 'krennic',
      hand: [c('hotshot-maneuver', 'event')],
      enemyGround: [c(commando, 'sentinel', { damage: 1 })],
    },
    [
      play('event'),
      target('leader'),
      { ...step('accept-effect'), selections: ['sentinel'] },
      attack('leader', 'enemy-base'),
      decline(),
    ],
    won,
  ),
  ex(
    'chewbacca',
    'resource-shot',
    'An On Attack shot avoids combat damage',
    'Attack the two-HP Sentinel, sacrifice one resource, and shoot it before combat. Chewbacca survives and a Credit replaces the spending power.',
    {
      resources: 4,
      deployed: 'unit',
      leaderDamage: 4,
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel', { damage: 1 })],
    },
    [attack('leader', 'sentinel'), ...shot],
    r => {
      dead('sentinel')(r);
      assert.equal(r.card('leader').damage, 4);
      assert.equal(r.count(), 3);
      assert.equal(r.credits(), 1);
    },
  ),
  ex(
    'chewbacca',
    'decline-unneeded-shot',
    'Do not sacrifice a resource for an unnecessary shot',
    'The base is already in lethal range and there is no unit to remove. Decline the optional resource sacrifice.',
    { resources: 6, deployed: 'unit', enemyHp: 5 },
    [attack('leader', 'enemy-base'), decline()],
    r => {
      won(r);
      assert.equal(r.count(), 6);
    },
  ),
  ex(
    'chewbacca',
    'free-pilot',
    'A free R2-D2 pilot improves Black One',
    'Pilot R2-D2 for zero. Black One gains the pilot power and its own upgraded bonus; retain resources for later actions.',
    {
      resources: 2,
      hand: [c('r2-d2--artooooooooo-', 'r2')],
      space: [c(black, 'ship')],
      enemyHp: 4,
    },
    [
      { ...play('r2'), target: 'ship', intent: { kind: 'play', piloting: 'pilot' } },
      wait,
      attack('ship', 'enemy-base'),
    ],
    won,
  ),
  ex(
    'chewbacca',
    'remove-shield',
    'Strip the opposing Shield rather than your own protection',
    'Constable removes the enemy Sentinel’s Shield. Preserve the Shield on your injured Chewbacca.',
    {
      resources: 3,
      deployed: 'unit',
      leaderDamage: 3,
      opponent: 'krennic',
      hand: [c('outer-rim-constable', 'constable')],
      enemyGround: [c(commando, 'sentinel')],
      attachments: [
        { card: 'shield', ref: 'own-shield', unit: 'leader' },
        { card: 'shield', ref: 'enemy-shield', unit: 'sentinel', owner: 'p2' },
      ],
    },
    [play('constable'), target('enemy-shield')],
    r => {
      assert.equal(r.card('enemy-shield').attachedTo, null);
      assert.equal(r.card('own-shield').attachedTo?.instanceId, r.refs.leader);
    },
  ),
  ex(
    'chewbacca',
    'choose-token',
    'Exchange expendable Experience and keep Chewbacca’s Shield',
    'The base can sacrifice either token. Spend the Experience on exhausted Sage so Chewbacca keeps its protection.',
    {
      resources: 3,
      deployed: 'unit',
      ground: [c(sage, 'sage', { exhausted: true })],
      attachments: [
        { card: 'experience', ref: 'xp', unit: 'sage' },
        { card: 'shield', ref: 'own-shield', unit: 'leader' },
      ],
    },
    [ability('base', 'exchange-token'), select('xp'), mode('credit')],
    r => {
      assert.equal(r.credits(), 1);
      assert.equal(r.card('own-shield').attachedTo?.instanceId, r.refs.leader);
    },
  ),
  ex(
    'chewbacca',
    'space-emergency',
    'A space threat can take priority over the ground plan',
    'With only two base HP, remove the ready enemy fighter using Black One before investing in a ground upgrade.',
    {
      resources: 4,
      hp: 2,
      hand: [c(mastery, 'buff')],
      ground: [c(sage, 'sage')],
      space: [c(black, 'ship')],
      enemySpace: [c('first-order-tie-fighter', 'threat')],
    },
    [attack('ship', 'threat')],
    dead('threat'),
  ),
  ex(
    'chewbacca',
    'outpost-shield',
    'A late token exchange can protect rather than ramp',
    'There is no spending shortfall. Exchange Experience for a Shield on wounded Chewbacca instead of another Credit.',
    {
      resources: 8,
      deployed: 'unit',
      leaderDamage: 5,
      ground: [c(sage, 'sage', { exhausted: true })],
      attachments: [{ card: 'experience', ref: 'xp', unit: 'sage' }],
    },
    [ability('base', 'exchange-token'), select('xp'), mode('shield'), target('leader')],
    r => {
      assert.equal(r.credits(), 0);
      assert.equal(r.card('shield1').attachedTo?.instanceId, r.refs.leader);
    },
  ),
];
