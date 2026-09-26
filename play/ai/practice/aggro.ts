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
  zone,
} from './positions.ts';
const black = 'black-one--straight-at-them',
  n1 = 'n-1-starfighter',
  commando = 'imperial-armored-commando';
const tie = 'first-order-tie-fighter',
  snub = 'lurking-snub-fighter',
  skirmisher = 'death-space-skirmisher';
const deploy = ability('leader', 'deploy');
const trigger = (id: string) => ({ ...step('trigger'), ability: id });
export const greefExercises = [
  ex(
    'greef',
    'black-one-opening',
    'Black One gets two benefits from Greef’s Advantage',
    'Play Black One and exhaust Greef for Advantage. The token gives +1 power and activates Black One’s upgraded bonus.',
    { resources: 2, round: 1, hand: [c(black, 'ship'), c(n1, 'later')] },
    [play('ship'), pay()],
    r => {
      zone('ship', 'space')(r);
      exhausted('leader')(r);
      assert.equal(r.card('advantage1').attachedTo?.instanceId, r.refs.ship);
    },
  ),
  ex(
    'greef',
    'save-advantage',
    'Save the once-per-round grant for Black One',
    'Decline the first grant on N-1 and use it on Black One, where being upgraded supplies another point of power.',
    { resources: 4, hand: [c(n1, 'n1'), c(black, 'black')] },
    [play('n1'), decline(), wait, play('black'), pay()],
    r => assert.equal(r.card('advantage1').attachedTo?.instanceId, r.refs.black),
  ),
  ex(
    'greef',
    'deploy-before-development',
    'Deploy before playing multiple units',
    'Deployed Greef grants Advantage to every new friendly unit. Deploy first, then develop both ships with the six unspent resources.',
    { resources: 6, hand: [c(n1, 'n1'), c(black, 'black')] },
    [deploy, wait, play('n1'), wait, play('black')],
    r => {
      zone('leader', 'ground')(r);
      assert.equal(r.card('advantage1').attachedTo?.instanceId, r.refs.n1);
      assert.equal(r.card('advantage2').attachedTo?.instanceId, r.refs.black);
    },
  ),
  ex(
    'greef',
    'poe-removes-sentinel',
    'Poe opens the base through Sentinel',
    'Poe removes Sentinel from all units. Play him before sending the ready ground attacker at the base.',
    {
      resources: 3,
      enemyHp: 3,
      hand: [c('poe-dameron--i-ll-come-back-for-you', 'poe')],
      ground: [c('sabine-wren--spectre-five', 'attacker')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
    },
    [play('poe'), pay(), wait, attack('attacker', 'enemy-base')],
    won,
  ),
  ex(
    'greef',
    'hand-finisher',
    'Aggressive Negotiations finishes before deployment',
    'The event adds four power from the remaining hand. Take lethal now instead of adding another body.',
    {
      resources: 6,
      enemyHp: 7,
      space: [c(n1, 'ship')],
      hand: [
        c('aggressive-negotiations', 'event'),
        c(black, 'black'),
        c(n1, 'later'),
        c('zeb-orrelios--fists-work-every-time', 'zeb'),
        c('beguile', 'beguile'),
      ],
    },
    [play('event'), attack('ship', 'enemy-base')],
    won,
  ),
  ex(
    'greef',
    'lethal-before-value',
    'Do not delay a winning attack for leader value',
    'With three base HP left, N-1 already wins. Deploying or playing Zeb gives the opponent an unnecessary response window.',
    {
      resources: 7,
      enemyHp: 3,
      space: [c(n1, 'ship')],
      hand: [c('zeb-orrelios--fists-work-every-time', 'zeb')],
    },
    [attack('ship', 'enemy-base')],
    won,
  ),
  ex(
    'greef',
    'emergency-trade',
    'Aggro still trades when the base is about to fall',
    'At two base HP, remove the ready enemy fighter. Attacking the healthy enemy base would lose the game next action.',
    { resources: 3, hp: 2, space: [c(n1, 'ship')], enemySpace: [c(tie, 'threat')] },
    [attack('ship', 'threat')],
    dead('threat'),
  ),
  ex(
    'greef',
    'leader-trade',
    'Use Greef’s seven HP to clear the ground Sentinel',
    'Greef survives the four-power counterattack. Trade the leader into Sentinel before trying to send smaller ground units through.',
    { resources: 6, opponent: 'krennic', enemyGround: [c(commando, 'sentinel')] },
    [deploy, wait, attack('leader', 'sentinel')],
    r => {
      dead('sentinel')(r);
      zone('leader', 'ground')(r);
    },
  ),
  ex(
    'greef',
    'plot-ferocity',
    'Plot the upgrade onto the ready ship',
    'Deploy Greef, Plot Sudden Ferocity onto N-1, and attack for six. A newly played exhausted unit cannot use the bonus this turn.',
    { resources: 6, enemyHp: 6, space: [c(n1, 'ship')], plot: [c('sudden-ferocity', 'ferocity')] },
    [
      deploy,
      select('ferocity'),
      { ...play('ferocity'), target: 'ship' },
      wait,
      attack('ship', 'enemy-base'),
    ],
    won,
  ),
  ex(
    'greef',
    'zeb-finisher',
    'Zeb puts the finishing Advantages on a ready attacker',
    'Grant all three Advantages to ready Black One rather than the exhausted unit; being upgraded also activates Black One’s extra power.',
    {
      resources: 7,
      leaderExhausted: true,
      hand: [c('zeb-orrelios--fists-work-every-time', 'zeb')],
      space: [c(black, 'ship'), c(n1, 'exhausted', { exhausted: true })],
    },
    [play('zeb'), trigger('on-friendly-played'), target('ship')],
    r => {
      for (let i = 1; i <= 3; i++)
        assert.equal(r.card(`advantage${i}`).attachedTo?.instanceId, r.refs.ship);
    },
  ),
  ex(
    'greef',
    'beguile-tempo',
    'Beguile buys a turn against a lethal attacker',
    'Inspect the hand, then return the ready enemy ship. A base attack cannot win and would leave lethal in space.',
    { resources: 3, hp: 2, hand: [c('beguile', 'event')], enemySpace: [c(skirmisher, 'threat')] },
    [play('event'), select(), target('threat')],
    zone('threat', 'hand'),
  ),
  ex(
    'greef',
    'remove-upgrade',
    'Sabine strips the large upgrade before taking the trade',
    'Use Sabine’s nonunique-upgrade removal on the opposing Craving Power, then resolve Ambush against the weakened ground unit.',
    {
      resources: 3,
      leaderExhausted: true,
      hand: [c('sabine-wren--spectre-five', 'sabine')],
      opponent: 'krennic',
      enemyGround: [c('imperial-door-technician', 'door')],
      attachments: [{ card: 'craving-power', ref: 'upgrade', unit: 'door', owner: 'p2' }],
    },
    [
      play('sabine'),
      trigger('on-played'),
      target('upgrade'),
      trigger('on-friendly-played'),
      target('door'),
    ],
    dead('door'),
  ),
];
export const vaderExercises = [
  ex(
    'vader',
    'opening-fighter',
    'Use the one-drop to start the fleet',
    'Play First Order TIE on turn one instead of saving for Plot cards; it establishes the non-token Vehicle needed by Vader’s action.',
    { resources: 2, round: 1, hand: [c(tie, 'tie'), c(snub, 'snub')] },
    [play('tie')],
    zone('tie', 'space'),
  ),
  ex(
    'vader',
    'attack-then-token',
    'Attack with a non-token Vehicle before creating a TIE',
    'The attack enables Vader’s ability. Create the extra TIE after that attack; token attacks alone do not enable it.',
    { resources: 3, space: [c(tie, 'ship')] },
    [attack('ship', 'enemy-base'), wait, ability('leader', 'vehicle-squadron')],
    zone('tie-fighter1', 'space'),
  ),
  ex(
    'vader',
    'skirmisher-exhaust',
    'An established fleet enables Skirmisher’s disruption',
    'Play Skirmisher while another friendly ship is present, and exhaust the enemy attacker that would otherwise deal lethal.',
    {
      resources: 3,
      hp: 2,
      hand: [c(skirmisher, 'skirmisher')],
      space: [c(tie, 'ship', { exhausted: true })],
      opponent: 'luke',
      enemySpace: [c('phoenix-squadron-a-wing', 'threat')],
    },
    [play('skirmisher'), target('threat')],
    exhausted('threat'),
  ),
  ex(
    'vader',
    'pilot-lethal',
    'Deploy onto a ready fighter for the finishing attack',
    'Vader adds five power and creates two TIEs, activating First Order TIE’s Raid. Use the ready host to finish immediately.',
    { resources: 6, enemyHp: 8, space: [c(tie, 'ship')] },
    [deploy, target('ship'), wait, attack('ship', 'enemy-base')],
    won,
  ),
  ex(
    'vader',
    'ground-deploy',
    'Ground deployment avoids concentrating everything in space',
    'The host is exhausted and a space-wipe deck is visible from its discard. Deploy to ground and remove the Sentinel.',
    {
      resources: 6,
      space: [c(tie, 'ship', { exhausted: true })],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
      enemyDiscard: [c('hyperspace-disaster', 'known-disaster')],
    },
    [deploy, mode('deploy-unit'), wait, attack('leader', 'sentinel')],
    r => {
      dead('sentinel')(r);
      zone('leader', 'ground')(r);
    },
  ),
  ex(
    'vader',
    'plot-exhaust',
    'Plot Lurking Snub Fighter before the enemy can attack',
    'Deploy to ground and Plot the stored ship, exhausting the lethal space attacker inside the same action.',
    {
      resources: 6,
      hp: 3,
      plot: [c(snub, 'snub')],
      opponent: 'krennic',
      enemySpace: [c('chimaera--a-frightening-reality', 'threat')],
    },
    [deploy, mode('deploy-unit'), select('snub'), play('snub'), target('threat')],
    exhausted('threat'),
  ),
  ex(
    'vader',
    'plot-hand-disruption',
    'Garindan names space removal during the deployment window',
    'Name Hyperspace Disaster against the ramp deck, inspect the matching revealed card, and discard it before exposing the fleet to a later action.',
    {
      resources: 6,
      plot: [c('garindan--information-broker', 'garindan')],
      space: [c(tie, 'ship')],
      opponent: 'krennic',
      enemyHand: [c('hyperspace-disaster', 'disaster')],
    },
    [
      deploy,
      mode('deploy-unit'),
      select('garindan'),
      play('garindan'),
      { ...step('accept-effect'), name: 'hyperspace-disaster' },
      select('disaster'),
    ],
    dead('disaster'),
    'The name is a matchup-based guess, not knowledge of the hidden hand. The subsequent discard choice uses only the engine’s reveal.',
  ),
  ex(
    'vader',
    'plot-sentinels',
    'Palpatine’s Plot protects the ground while space attacks',
    'Deploy the leader before playing Palpatine from resources so his two Spy tokens gain Sentinel for the phase.',
    {
      resources: 6,
      hp: 3,
      plot: [c('chancellor-palpatine--i-am-the-senate', 'palpatine')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [deploy, mode('deploy-unit'), select('palpatine'), play('palpatine')],
    r => {
      zone('spy1', 'ground')(r);
      zone('spy2', 'ground')(r);
    },
  ),
  ex(
    'vader',
    'beguile-sentinel',
    'Bounce the Sentinel to reopen the ground lane',
    'Beguile clears Sentinel for deployed Vader while revealing the opponent’s hand. Take the base attack once the lane opens.',
    {
      resources: 4,
      deployed: 'unit',
      enemyHp: 5,
      hand: [c('beguile', 'event')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
    },
    [play('event'), select(), target('sentinel'), wait, attack('leader', 'enemy-base')],
    won,
  ),
  ex(
    'vader',
    'craving-power',
    'Craving Power removes a threat while growing the attacker',
    'Upgrade the ready ship and direct its increased power into the opposing fighter; choose removal that preserves your attack.',
    {
      resources: 5,
      hand: [c('craving-power', 'upgrade')],
      space: [c(skirmisher, 'ship')],
      opponent: 'luke',
      enemySpace: [c('resistance-blue-squadron', 'threat')],
    },
    [{ ...play('upgrade'), target: 'ship' }, target('threat')],
    dead('threat'),
  ),
  ex(
    'vader',
    'trade-before-lethal',
    'A space aggro deck must still stop immediate lethal',
    'Trade Skirmisher into the ready enemy fighter. Attacking the base does not win and leaves a fatal counterattack.',
    {
      resources: 4,
      hp: 2,
      space: [c(skirmisher, 'ship')],
      opponent: 'luke',
      enemySpace: [c('phoenix-squadron-a-wing', 'threat')],
    },
    [attack('ship', 'threat')],
    dead('threat'),
  ),
  ex(
    'vader',
    'exhausted-pilot-host',
    'Do not deploy a pilot onto an exhausted host for lethal',
    'Ground Vader enters ready and can deal the last five damage; the exhausted ship would remain exhausted after piloting.',
    { resources: 6, enemyHp: 5, space: [c(tie, 'ship', { exhausted: true })] },
    [deploy, mode('deploy-unit'), wait, attack('leader', 'enemy-base')],
    won,
  ),
];
