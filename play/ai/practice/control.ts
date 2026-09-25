import assert from 'node:assert/strict';
import { ability, attack, pay, play, step, target } from './runner.ts';
import { c, dead, exercise as ex, mode, select, wait, won, zone } from './positions.ts';
const commando = 'imperial-armored-commando',
  door = 'imperial-door-technician';
const chim = 'chimaera--a-frightening-reality',
  disaster = 'hyperspace-disaster';
const anakin = 'anakin-skywalker--champion-of-mortis',
  pre = 'pre-vizsla--strong-willed-ruler';
const hammer = 'rebellious-hammerhead',
  pierce = 'piercing-shot',
  lost = 'lost-and-forgotten';
const tie = 'first-order-tie-fighter',
  snub = 'lurking-snub-fighter',
  skirmisher = 'death-space-skirmisher';
const negotiations = 'aggressive-negotiations',
  reactor = 'single-reactor-ignition';
const deploy = ability('leader', 'deploy'),
  claim = step('take-initiative');
const trigger = (id: string) => ({ ...step('trigger'), ability: id });
const enemyPair = [c(snub, 'one'), c(skirmisher, 'two')];
const bothDead = (r: Parameters<ReturnType<typeof dead>>[0]) => {
  dead('one')(r);
  dead('two')(r);
};

export const mandalorianExercises = [
  ex(
    'mandalorian',
    'opening-claim',
    'Claim and pay for the opening card',
    'With no urgent threat, claim initiative on turn one and pay one to draw. Preserve the remaining resource instead of forcing an inefficient curve.',
    {
      resources: 2,
      round: 1,
      hand: [c(hammer, 'hammer'), c(anakin, 'anakin'), c(disaster, 'disaster')],
    },
    [claim, pay()],
    r => {
      assert.equal(r.state.players.p1!.hand.length, 4);
      assert.equal(r.ready(), 1);
    },
  ),
  ex(
    'mandalorian',
    'removal-before-draw',
    'Survival takes the resource needed for a bonus card',
    'All three resources are needed to kill the lethal attacker. Remove it first; there is no resource left for a bonus draw this phase.',
    { resources: 3, hp: 2, hand: [c(pierce, 'event')], enemySpace: [c(skirmisher, 'threat')] },
    [play('event'), target('threat')],
    r => {
      dead('threat')(r);
      assert.equal(r.ready(), 0);
    },
  ),
  ex(
    'mandalorian',
    'pierce-shield',
    'Piercing Shot defeats the Shield before dealing damage',
    'Use the removal that ignores the Shield’s protection and kills the three-HP Sentinel in one action.',
    {
      resources: 3,
      hand: [c(pierce, 'event')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
      attachments: [{ card: 'shield', unit: 'sentinel', owner: 'p2', ref: 'shield' }],
    },
    [play('event'), target('sentinel')],
    dead('sentinel'),
  ),
  ex(
    'mandalorian',
    'cheap-removal',
    'Crushing Blow removes a cheap threat without a trade',
    'Spend three to remove the enemy two-cost fighter while keeping your own ready ship for a later attack.',
    {
      resources: 3,
      hand: [c('crushing-blow', 'event')],
      space: [c(hammer, 'ship')],
      opponent: 'luke',
      enemySpace: [c('phoenix-squadron-a-wing', 'threat')],
    },
    [play('event'), target('threat')],
    r => {
      dead('threat')(r);
      assert.equal(r.card('ship').exhausted, false);
    },
  ),
  ex(
    'mandalorian',
    'sentinel-under-pressure',
    'Play Bith Brute when claiming would expose lethal',
    'The four-power ground attacker can kill the base. Put Sentinel in its way before taking a card-draw action.',
    {
      resources: 3,
      hp: 3,
      hand: [c('bith-brute', 'brute')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [play('brute')],
    zone('brute', 'ground'),
  ),
  ex(
    'mandalorian',
    'hammerhead-hand',
    'Hammerhead turns a preserved hand into removal',
    'Three cards remain after paying for Hammerhead. Use its entry damage to remove the three-HP ground Sentinel and leave a large ship.',
    {
      resources: 6,
      hand: [
        c(hammer, 'hammer'),
        c(anakin, 'anakin'),
        c(disaster, 'disaster'),
        c(pierce, 'pierce'),
      ],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
    },
    [play('hammer'), target('sentinel')],
    r => {
      dead('sentinel')(r);
      zone('hammer', 'space')(r);
    },
  ),
  ex(
    'mandalorian',
    'anakin-shield',
    'Anakin’s reduction works through a Shield',
    'Heroism is in the discard. Reduce the shielded Sentinel to zero HP instead of spending damage into its Shield.',
    {
      resources: 6,
      hand: [c(anakin, 'anakin')],
      discard: [c('karis-nemik--freedom-is-a-pure-idea', 'nemik')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
      attachments: [{ card: 'shield', ref: 'shield', unit: 'sentinel', owner: 'p2' }],
    },
    [play('anakin'), trigger('discard-villainy'), target('sentinel')],
    dead('sentinel'),
  ),
  ex(
    'mandalorian',
    'chimaera-stabilize',
    'Chimaera trades the cheap body and restores base health',
    'Pay nine including the Villainy penalty. Sacrifice Door Technician to defeat the opposing capital ship, gaining both healing effects.',
    {
      resources: 9,
      hp: 5,
      hand: [c(chim, 'chim')],
      ground: [c(door, 'door')],
      opponent: 'krennic',
      enemySpace: [c(chim, 'enemy-chim')],
    },
    [
      play('chim'),
      target('door'),
      target('enemy-chim'),
      { ...step('trigger-player'), intent: { kind: 'trigger-player', playerId: 'p1' } },
      trigger('when-defeated'),
    ],
    r => {
      dead('enemy-chim')(r);
      dead('door')(r);
      zone('chim', 'space')(r);
      assert.equal(r.damage(), 26);
    },
  ),
  ex(
    'mandalorian',
    'reset-board',
    'Reset an overwhelming board before rebuilding',
    'Single Reactor costs ten in this deck. Clear both arenas now; preserving one small body is not worth leaving two large enemy threats.',
    {
      resources: 10,
      hp: 4,
      hand: [c(reactor, 'event')],
      ground: [c('outer-rim-constable', 'own')],
      opponent: 'krennic',
      enemyGround: [c(pre, 'one')],
      enemySpace: [c(chim, 'two')],
    },
    [play('event')],
    r => {
      bothDead(r);
      dead('own')(r);
    },
  ),
  ex(
    'mandalorian',
    'large-hand-finisher',
    'Stop controlling once the hand gives lethal',
    'Hammerhead’s five power plus four remaining hand cards reaches nine. Finish the base instead of spending another removal spell.',
    {
      resources: 6,
      enemyHp: 9,
      space: [c(hammer, 'ship')],
      hand: [
        c(negotiations, 'event'),
        c(anakin, 'anakin'),
        c(disaster, 'disaster'),
        c(pierce, 'pierce'),
        c(lost, 'lost'),
      ],
    },
    [play('event'), attack('ship', 'enemy-base')],
    won,
  ),
  ex(
    'mandalorian',
    'space-lethal',
    'Clear imminent space lethal before claiming',
    'Seven resources exactly pay for Hyperspace Disaster. Wipe the two ships before choosing the normally attractive claim-and-draw line.',
    { resources: 7, hp: 2, hand: [c(disaster, 'event')], enemySpace: enemyPair },
    [play('event')],
    bothDead,
  ),
  ex(
    'mandalorian',
    'credit-draw-budget',
    'A Credit preserves the resource for a bonus card',
    'Spend the Credit on removal, leaving one real resource. After the opponent develops another ship, claim and pay that resource to draw.',
    {
      resources: 3,
      credits: 1,
      hp: 3,
      hand: [c(pierce, 'event'), c(hammer, 'hammer')],
      enemySpace: [c(skirmisher, 'threat')],
      enemyHand: [c(tie, 'enemy-play')],
    },
    [
      play('event'),
      pay(['credit1']),
      target('threat'),
      { ...play('enemy-play'), actor: 'p2', teach: false },
      claim,
      pay(),
    ],
    r => {
      dead('threat')(r);
      assert.equal(r.credits(), 0);
      assert.equal(r.ready(), 0);
      assert.equal(r.state.players.p1!.hand.length, 2);
    },
  ),
];

export const dedraExercises = [
  ex(
    'dedra',
    'early-deploy',
    'Deploy on four and use the hand advantage for Raid',
    'More cards in hand give Dedra four attacking power. Deploy and trade into the ground Sentinel while retaining the leader.',
    {
      resources: 4,
      hand: [c(chim, 'chim'), c(disaster, 'disaster')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
    },
    [deploy, wait, attack('leader', 'sentinel')],
    r => {
      dead('sentinel')(r);
      zone('leader', 'ground')(r);
    },
  ),
  ex(
    'dedra',
    'interrogate-damage',
    'Interrogate a meaningful threat, respecting the enemy’s choice',
    'Target the capital ship. Here the opponent chooses two damage to preserve your small hand; do not train the learner to choose that response for the opponent.',
    { resources: 3, opponent: 'krennic', enemySpace: [c(chim, 'threat')] },
    [
      ability('leader', 'interrogate'),
      target('threat'),
      { ...mode('take-2-damage'), actor: 'p2', teach: false },
    ],
    r => assert.equal(r.card('threat').damage, 2),
  ),
  ex(
    'dedra',
    'interrogate-draw',
    'A fragile target can force the opponent to concede a card',
    'Interrogate the one-HP fighter. The scripted opponent keeps it alive by allowing a draw, increasing Dedra’s hand pressure.',
    { resources: 3, enemySpace: [c(tie, 'threat')] },
    [
      ability('leader', 'interrogate'),
      target('threat'),
      { ...mode('opponent-draws'), actor: 'p2', teach: false },
    ],
    r => {
      assert.equal(r.state.players.p1!.hand.length, 1);
      zone('threat', 'space')(r);
    },
  ),
  ex(
    'dedra',
    'removal-heal',
    'Removal plus healing buys the time needed for top end',
    'Lost and Forgotten removes the dangerous ship and heals three. Take the immediate stabilization instead of holding out for a bigger unit.',
    {
      resources: 6,
      hp: 2,
      hand: [c(lost, 'event'), c(chim, 'chim')],
      enemySpace: [c(skirmisher, 'threat')],
    },
    [play('event'), target('threat')],
    r => {
      dead('threat')(r);
      assert.equal(r.damage(), 30);
    },
  ),
  ex(
    'dedra',
    'space-wipe',
    'Use Hyperspace Disaster against the wide space board',
    'Remove both ships with one card, preserving the ground Sentinel and avoiding two separate trades.',
    {
      resources: 7,
      hand: [c(disaster, 'event')],
      ground: [c(commando, 'own')],
      enemySpace: enemyPair,
    },
    [play('event')],
    r => {
      bothDead(r);
      zone('own', 'ground')(r);
    },
  ),
  ex(
    'dedra',
    'reactor-reset',
    'Single Reactor clears both arenas when single-target removal is too slow',
    'Two large threats cover both arenas. Reset them together while the base can still survive.',
    {
      resources: 8,
      hp: 3,
      hand: [c(reactor, 'event')],
      opponent: 'krennic',
      enemyGround: [c(pre, 'one')],
      enemySpace: [c(chim, 'two')],
    },
    [play('event')],
    bothDead,
  ),
  ex(
    'dedra',
    'chimaera-trade',
    'Trade Door Technician for the capital ship',
    'Chimaera and Door Technician together heal four while replacing a cheap unit with a large ship and removing the opponent’s top end.',
    {
      resources: 7,
      hp: 4,
      hand: [c(chim, 'chim')],
      ground: [c(door, 'door')],
      opponent: 'krennic',
      enemySpace: [c(chim, 'enemy-chim')],
    },
    [
      play('chim'),
      target('door'),
      target('enemy-chim'),
      { ...step('trigger-player'), intent: { kind: 'trigger-player', playerId: 'p1' } },
      trigger('when-defeated'),
    ],
    r => {
      dead('enemy-chim')(r);
      zone('chim', 'space')(r);
      assert.equal(r.damage(), 27);
    },
  ),
  ex(
    'dedra',
    'pre-budget',
    'Spend Pre Vizsla’s six-HP budget on two threats',
    'Choose the two three-HP enemies instead of your own unit. Each defeated enemy becomes another Mandalorian body.',
    { resources: 8, hand: [c(pre, 'pre')], enemySpace: enemyPair },
    [play('pre'), select('one', 'two'), trigger('shielded-created')],
    r => {
      bothDead(r);
      assert.equal(
        Object.values(r.state.cards).filter(c => c.cardId === 'mandalorian' && c.zone === 'ground')
          .length,
        2,
      );
    },
  ),
  ex(
    'dedra',
    'no-glory',
    'Remove the enemy’s top end without entering combat',
    'No Glory, Only Results takes and defeats the capital ship. Clear the imminent space attack rather than deploying into ground.',
    {
      resources: 5,
      hp: 4,
      hand: [c('no-glory--only-results', 'event')],
      opponent: 'krennic',
      enemySpace: [c(chim, 'threat')],
    },
    [play('event'), target('threat')],
    dead('threat'),
  ),
  ex(
    'dedra',
    'finish-with-raid',
    'Convert the hand advantage into lethal',
    'Dedra has Raid 2 and Negotiations leaves four cards. Attack for eight rather than using another control action.',
    {
      resources: 5,
      deployed: 'unit',
      enemyHp: 8,
      hand: [
        c(negotiations, 'event'),
        c(disaster, 'disaster'),
        c(chim, 'chim'),
        c(pre, 'pre'),
        c(lost, 'lost'),
      ],
    },
    [play('event'), attack('leader', 'enemy-base')],
    won,
  ),
  ex(
    'dedra',
    'take-lethal',
    'Take leader lethal instead of drawing more cards',
    'Hand advantage already gives four power. Finish the base before playing an unnecessary expensive unit.',
    { resources: 7, deployed: 'unit', enemyHp: 4, hand: [c(chim, 'chim')] },
    [attack('leader', 'enemy-base')],
    won,
  ),
  ex(
    'dedra',
    'clear-space-first',
    'A ready capital ship must stop lethal before attacking base',
    'Use Chimaera to kill the ready attacker. The two-point heal is also valuable when the base has only two HP.',
    { resources: 8, hp: 2, space: [c(chim, 'ship')], enemySpace: [c(skirmisher, 'threat')] },
    [attack('ship', 'threat')],
    r => {
      dead('threat')(r);
      assert.equal(r.damage(), 31);
    },
  ),
];

export const aurraExercises = [
  ex(
    'aurra',
    'free-removal',
    'Use Aurra’s free action on the one-HP attacker',
    'Remove the ready fighter before spending resources. The ability can target either side, so choose the enemy unit.',
    { resources: 3, enemySpace: [c(tie, 'threat')], ground: [c('lepi-lookout', 'own')] },
    [ability('leader', 'defeat-unit'), target('threat')],
    dead('threat'),
  ),
  ex(
    'aurra',
    'trade-then-ability',
    'Combat sets up Aurra to finish a larger ship',
    'Pirate Snub deals two into the three-HP ship. After the opponent’s pass, use Aurra to finish the one remaining HP.',
    {
      resources: 4,
      space: [c('pirate-snub-fighter', 'ship')],
      enemySpace: [c(skirmisher, 'threat')],
    },
    [attack('ship', 'threat'), wait, ability('leader', 'defeat-unit'), target('threat')],
    dead('threat'),
  ),
  ex(
    'aurra',
    'deploy-capital',
    'Deploy Aurra to remove a five-HP capital ship',
    'The damaged Chimaera is within the deployment trigger’s five-HP limit. Remove it and leave Aurra ready on the ground.',
    { resources: 7, opponent: 'krennic', enemySpace: [c(chim, 'threat', { damage: 1 })] },
    [deploy, target('threat')],
    r => {
      dead('threat')(r);
      zone('leader', 'ground')(r);
    },
  ),
  ex(
    'aurra',
    'choose-deploy-target',
    'Use the deployment removal on the expensive threat',
    'Both enemies qualify, but the five-HP capital ship is the immediate danger. Preserve other removal for the cheap body.',
    {
      resources: 7,
      hp: 5,
      opponent: 'krennic',
      enemySpace: [c(chim, 'threat', { damage: 1 })],
      enemyGround: [c(door, 'door')],
    },
    [deploy, target('threat')],
    r => {
      dead('threat')(r);
      zone('door', 'ground')(r);
    },
  ),
  ex(
    'aurra',
    'craving-power',
    'A unit upgrade supplies removal and a stronger body',
    'Pay seven including the Command penalty, grow Dark Trooper to five power, and direct that damage into the opposing ship.',
    {
      resources: 7,
      hand: [c('craving-power', 'upgrade')],
      ground: [c('imperial-dark-trooper', 'trooper')],
      opponent: 'luke',
      enemySpace: [c('resistance-blue-squadron', 'threat')],
    },
    [{ ...play('upgrade'), target: 'trooper' }, target('threat')],
    dead('threat'),
  ),
  ex(
    'aurra',
    'chimaera-sacrifice',
    'Sacrifice the cheap lookout rather than your valuable attacker',
    'Chimaera replaces a cheap exhausted unit while removing the enemy capital ship. Keep the healthy ground attacker for future turns.',
    {
      resources: 7,
      hand: [c(chim, 'chim')],
      ground: [
        c('lepi-lookout', 'lookout', { exhausted: true }),
        c('imperial-dark-trooper', 'trooper'),
      ],
      opponent: 'krennic',
      enemySpace: [c(chim, 'threat')],
    },
    [
      play('chim'),
      target('lookout'),
      target('threat'),
      { ...step('trigger-player'), intent: { kind: 'trigger-player', playerId: 'p1' } },
    ],
    r => {
      dead('threat')(r);
      dead('lookout')(r);
      zone('trooper', 'ground')(r);
    },
  ),
  ex(
    'aurra',
    'anakin-discard',
    'Use Villainy in the discard to remove a shielded Sentinel',
    'Anakin’s Villainy trigger gives -3/-3 through the Shield. Keep the newly played body instead of making an inefficient combat trade.',
    {
      resources: 6,
      hand: [c(anakin, 'anakin')],
      discard: [c('imperial-dark-trooper', 'discard')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'sentinel')],
      attachments: [{ card: 'shield', ref: 'shield', unit: 'sentinel', owner: 'p2' }],
    },
    [play('anakin'), trigger('discard-heroism'), target('sentinel')],
    dead('sentinel'),
  ),
  ex(
    'aurra',
    'pre-wide-board',
    'Pre Vizsla changes a wide enemy board into your own units',
    'Use the entire six-HP removal budget on the two three-HP ships. Do not consume the friendly attacker in the selection.',
    {
      resources: 8,
      hand: [c(pre, 'pre')],
      ground: [c('imperial-dark-trooper', 'own')],
      enemySpace: enemyPair,
    },
    [play('pre'), select('one', 'two'), trigger('shielded-created')],
    r => {
      bothDead(r);
      zone('own', 'ground')(r);
    },
  ),
  ex(
    'aurra',
    'sentinel-first',
    'Play Sentinel when deployment is still three resources away',
    'The base cannot survive the ground attack. Play Armored Commando now instead of waiting for Aurra’s deployment removal.',
    {
      resources: 4,
      hp: 3,
      hand: [c(commando, 'sentinel'), c(chim, 'chim')],
      opponent: 'krennic',
      enemyGround: [c(commando, 'threat')],
    },
    [play('sentinel')],
    r => {
      zone('sentinel', 'ground')(r);
      assert.equal(r.card('shield1').attachedTo?.instanceId, r.refs.sentinel);
    },
  ),
  ex(
    'aurra',
    'punish-slow-deck',
    'Take space lethal against a slower ground board',
    'Chimaera already deals the last six damage. End the game rather than removing a harmless exhausted ground body.',
    {
      resources: 8,
      enemyHp: 6,
      space: [c(chim, 'ship')],
      opponent: 'krennic',
      enemyGround: [c(door, 'door', { exhausted: true })],
    },
    [attack('ship', 'enemy-base')],
    won,
  ),
  ex(
    'aurra',
    'above-deploy-threshold',
    'Damage a six-HP target before deploying Aurra',
    'Undamaged Chimaera is outside the five-HP limit. Attack it first to bring it into range, then deploy and remove it.',
    {
      resources: 7,
      space: [c('pirate-snub-fighter', 'ship')],
      opponent: 'krennic',
      enemySpace: [c(chim, 'threat')],
    },
    [attack('ship', 'threat'), wait, deploy, target('threat')],
    dead('threat'),
  ),
  ex(
    'aurra',
    'remove-ramp-engine',
    'Remove Krennic’s economy unit while building board advantage',
    'No Glory removes the discount engine without losing one of your own attackers. This line targets future ramp rather than damage to the base.',
    {
      resources: 5,
      hand: [c('no-glory--only-results', 'event')],
      ground: [c('imperial-dark-trooper', 'own')],
      opponent: 'krennic',
      enemyGround: [c('director-krennic--on-the-verge-of-greatness', 'engine')],
    },
    [play('event'), target('engine')],
    r => {
      dead('engine')(r);
      zone('own', 'ground')(r);
    },
  ),
];
