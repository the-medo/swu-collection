import { ibhContinuations } from './ibh-continuations.ts';
import { jtlContinuations } from './jtl-continuations.ts';
import { lofContinuations } from './lof-continuations.ts';
import { secContinuations } from './sec-continuations.ts';
import { lawContinuations } from './law-continuations.ts';
import { ashContinuations } from './ash-continuations.ts';
import { exploitContinuations } from './exploit-continuations.ts';
import { createCredits } from '../engine/credits.ts';
import { attachPilot } from '../engine/pilot-conversion.ts';
import { advance, createGame, settle } from '../engine/advance.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { LocalGame } from '../host/session.ts';
import { choose, config, ids, position } from './helpers.ts';

export type ContinuationCase = {
  name: string;
  description: string;
  state: GameState;
  input: EngineInput;
};
function board(name: string) {
  const p = position(`continuation-${name}`);
  for (const player of p.players) {
    player.deck = Array.from({ length: 50 }, () => ({ card: ids.marine }));
    player.resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
    player.ground = Array.from({ length: 5 }, (_, n) => ({
      card: ids.marine,
      ref: `${player.id}-${n}`,
    }));
  }
  return p;
}
function step(state: GameState, intent: Intent['kind'] | ((i: Intent) => boolean)) {
  return advance(state, choose(state, intent)).state;
}
export function continuationCases(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const record = (name: string, description: string, state: GameState, input: EngineInput) =>
    cases.push({ name, description, state, input });

  const nested = board('nested');
  nested.players[0].hand = [{ card: 'snub-fighter-squadron' }];
  nested.players[1].space = [{ card: 'onyx-squadron-brute', damage: 2, ref: 'onyx' }];
  nested.players[1].base.damage = 5;
  const a = scenario(nested);
  let state = step(a.state, 'play');
  const batch = state.execution.frames[0]!;
  if (batch.kind !== 'trigger-batch') throw new Error('Missing nested trigger batch');
  const trigger = batch.triggers.find(t => t.abilityId === 'when-played')!;
  state = step(state, i => i.kind === 'trigger' && i.triggerId === trigger.id);
  state = step(state, i => i.kind === 'target' && i.card === a.refs.onyx);
  record(
    'nested-trigger',
    'Opponent heal-base choice before an older Ambush',
    state,
    choose(state, i => i.kind === 'target' && i.card === state.players.bob!.base),
  );

  const search = board('search');
  search.players[0].hand = [{ card: 'remnant-reserves' }];
  const b = scenario(search);
  state = step(b.state, 'play');
  const selection = choose(state, 'search', state.execution.decision!.selection!.cards.slice(0, 2));
  record(
    'private-search',
    'Choose two exact units from a private top-five search',
    state,
    selection,
  );
  state = advance(state, selection).state;
  record('search-randomness', 'Server shuffle of unchosen search remainder', state, {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values: state.execution.random!.bounds.map(n => n - 1),
  });

  const support = board('support');
  support.players[0].hand = [{ card: 'migs-mayfeld--how-about-a-toast-' }];
  support.players[0].leader = {
    card: ids.leader,
    ref: 'leader',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  support.players[1].ground![0] = { card: ids.consular, ref: 'defender' };
  support.attachments = [
    { card: 'academy-training', unit: 'leader' },
    ...[1, 2, 3].map(n => ({ card: 'shield', unit: 'defender', ref: `shield-${n}` })),
  ];
  const c = scenario(support);
  state = step(c.state, 'play');
  state = step(
    state,
    i => i.kind === 'attack' && i.attacker === c.refs.leader && i.defender === c.refs.defender,
  );
  const triggers = state.execution.frames[0]!;
  if (triggers.kind !== 'trigger-batch') throw new Error('Missing borrowed triggers');
  const borrowed = triggers.triggers.find(t => t.abilityId.endsWith('-on-attack'))!;
  const order = choose(state, i => i.kind === 'trigger' && i.triggerId === borrowed.id);
  record(
    'borrowed-trigger',
    'Order borrowed Migs and printed Sabine attack abilities',
    state,
    order,
  );
  state = advance(state, order).state;
  record(
    'shield-replacement',
    'Choose a physical Shield while borrowed damage and combat remain pending',
    state,
    choose(state, i => i.kind === 'target' && i.card === c.refs['shield-1']),
  );

  const piloting = board('piloting');
  piloting.players[0].hand = [{ card: 'astromech-pilot', ref: 'pilot' }];
  piloting.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  piloting.players[1].ground![0] = { card: ids.consular, damage: 3, ref: 'damaged' };
  const d = scenario(piloting);
  state = step(
    d.state,
    i =>
      i.kind === 'play' && i.card === d.refs.pilot && i.target === d.refs.vehicle && !!i.piloting,
  );
  record(
    'piloting-trigger',
    'Upgrade-only healing with a ground Pilot attached to a space Vehicle',
    state,
    choose(state, i => i.kind === 'target' && i.card === d.refs.damaged),
  );

  const naming = board('naming');
  naming.players[0].hand = [{ card: 'garindan--information-broker' }];
  naming.players[1].hand = [{ card: ids.consular }];
  const named = scenario(naming);
  state = step(named.state, 'play');
  const namedInput = { ...choose(state, 'accept-effect'), namedCardId: ids.consular };
  record(
    'card-name',
    'Choose an official title before privately looking at a hand',
    state,
    namedInput,
  );
  state = advance(state, namedInput).state;
  record(
    'named-hand',
    'Discard a matching physical copy after naming and private inspection',
    state,
    choose(state, 'accept-effect', state.execution.decision!.selection!.cards.slice(0, 1)),
  );

  const firstDamage = board('first-damage');
  firstDamage.players[0].ground!.push({ card: 'anakin-s-podracer--so-wizard-', ref: 'pod' });
  firstDamage.players[1].ground![0] = { card: 'the-cyborg-mech--mysterious-threat', ref: 'mech' };
  firstDamage.attachments = [
    { card: 'shield', unit: 'mech', ref: 'first-shield' },
    { card: 'shield', unit: 'mech', ref: 'second-shield' },
  ];
  const first = scenario(firstDamage);
  state = step(
    first.state,
    i => i.kind === 'attack' && i.attacker === first.refs.pod && i.defender === first.refs.mech,
  );
  record(
    'first-combat-damage',
    'Replace the first hit before the surviving defender computes combat damage',
    state,
    choose(state, i => i.kind === 'target' && i.card === first.refs['first-shield']),
  );

  const playerChoices = board('player-choices');
  playerChoices.players[0].hand = [{ card: 'governor-s-shuttle' }];
  playerChoices.players[0].resources!.push({ card: ids.marine }, { card: ids.marine });
  const choiceGame = scenario(playerChoices);
  state = step(choiceGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === choiceGame.refs['alice-0']);
  record(
    'simultaneous-unit-choices',
    'Collect the second player’s unit before simultaneous defeat',
    state,
    choose(state, i => i.kind === 'target' && i.card === choiceGame.refs['bob-0']),
  );
  const opponentMode = board('opponent-mode');
  opponentMode.players[0].leader = { card: 'dedra-meero--not-wasting-time' };
  const modeGame = scenario(opponentMode);
  state = step(modeGame.state, i => i.kind === 'use-ability' && i.abilityId === 'interrogate');
  state = step(state, i => i.kind === 'target' && i.card === modeGame.refs['bob-0']);
  record(
    'opponent-mode',
    'The chosen unit’s controller decides whether the opposing leader draws',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'opponent-draws'),
  );

  const zoneSearch = board('zone-search');
  zoneSearch.players[0].hand = [{ card: 'annihilator--tagge-s-flagship' }];
  zoneSearch.players[0].resources = Array.from({ length: 16 }, () => ({ card: ids.marine }));
  zoneSearch.players[1].hand = [{ card: ids.marine }];
  const zoneGame = scenario(zoneSearch);
  state = step(zoneGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === zoneGame.refs['bob-0']);
  const searchedInput = choose(
    state,
    'accept-effect',
    state.execution.decision!.selection!.cards.slice(0, 2),
  );
  record(
    'whole-zone-search',
    'Privately select matching titles from another player’s deck and hand',
    state,
    searchedInput,
  );
  state = advance(state, searchedInput).state;
  record(
    'whole-deck-shuffle',
    'Shuffle the full remaining deck after a hidden-zone search',
    state,
    {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: state.execution.random!.id,
      values: state.execution.random!.bounds.map(n => n - 1),
    },
  );

  const discardPlay = board('discard-play');
  discardPlay.players[0].space = [{ card: 'stolen-at-hauler', ref: 'hauler', damage: 4 }];
  discardPlay.players[0].hand = [{ card: 'incapacitate' }];
  discardPlay.players[1].resources = [];
  const granted = scenario(discardPlay);
  state = step(granted.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === granted.refs.hauler);
  record(
    'granted-discard-play',
    'An opponent can play an exact discarded copy for free without changing ownership',
    state,
    choose(state, i => i.kind === 'play' && i.card === granted.refs.hauler),
  );

  const regroupReturn = board('regroup-return');
  regroupReturn.players[0].hand = [{ card: 'commandeer' }];
  regroupReturn.players[0].discard = [{ card: 'sneak-attack', ref: 'return-sneak' }];
  regroupReturn.players[1].space = [
    { card: 'alphabet-squadron-u-wing--quiet-devotion', ref: 'return-alpha' },
  ];
  regroupReturn.delayed = [{ source: 'return-sneak', unit: 'alice-0' }];
  const returnGame = scenario(regroupReturn);
  state = step(returnGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === returnGame.refs['return-alpha']);
  state = step(step(state, 'pass'), 'pass');
  const returnBatch = state.execution.frames[0];
  if (returnBatch?.kind !== 'delayed-batch') throw new Error('Missing return order');
  const returnEffect = returnBatch.effects.find(e => e.kind === 'return-at-regroup')!;
  record(
    'regroup-return-order',
    'Order a delayed return and defeat before captured regroup triggers',
    state,
    choose(state, i => i.kind === 'delayed' && i.effectId === returnEffect.id),
  );

  const sacrifice = board('sacrifice-cost');
  sacrifice.players[0].leader = { card: 'director-krennic--amidst-my-achievement' };
  const sacrificeGame = scenario(sacrifice);
  record(
    'sacrifice-cost',
    'Pay leader exhaustion and one exact friendly unit before resolving its Credit ability',
    sacrificeGame.state,
    choose(
      sacrificeGame.state,
      i => i.kind === 'use-ability' && i.costTarget === sacrificeGame.refs['alice-1'],
    ),
  );

  const benefits = board('benefits');
  benefits.players[0].hand = [{ card: 'elzar-mann--haunted-by-a-vision' }];
  benefits.players[1].deck![0] = { card: 'incapacitate', ref: 'opponent-event' };
  const benefitGame = scenario(benefits);
  state = step(benefitGame.state, 'play');
  const benefitInput = choose(state, 'accept-effect', [benefitGame.refs['alice-0']!]);
  record(
    'token-distribution',
    'Allocate Advantage tokens before the opponent’s private search',
    state,
    benefitInput,
  );
  state = advance(state, benefitInput).state;
  record(
    'opponent-search',
    'A different player searches their own deck while the ability retains its original source',
    state,
    choose(state, 'search', [benefitGame.refs['opponent-event']!]),
  );
  const healing = board('healing');
  healing.players[0].space = [{ card: ids.fighter, ref: 'healing-host', damage: 1 }];
  healing.players[1].ground![0]!.damage = 2;
  healing.attachments = [{ card: 'trace-martez--trusting-sister', unit: 'healing-host' }];
  const healingGame = scenario(healing);
  state = step(
    healingGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === healingGame.refs['healing-host'] &&
      i.defender === healingGame.state.players.bob!.base,
  );
  record(
    'divided-healing',
    'Distribute healing between friendly and enemy units before combat damage',
    state,
    choose(state, 'accept-effect', [healingGame.refs['healing-host']!, healingGame.refs['bob-0']!]),
  );

  const fleet = board('searched-fleet');
  fleet.players[0].hand = [{ card: 'admiral-ackbar--assume-attack-coordinates' }];
  fleet.players[0].deck![0] = { card: ids.fighter, ref: 'fleet-one' };
  fleet.players[0].deck![1] = { card: ids.fighter, ref: 'fleet-two' };
  const fleetGame = scenario(fleet);
  state = step(
    step(fleetGame.state, 'play'),
    i => i.kind === 'choose-mode' && i.mode === 'defeat-ackbar',
  );
  state = advance(
    state,
    choose(state, 'search', [fleetGame.refs['fleet-one']!, fleetGame.refs['fleet-two']!]),
  ).state;
  state = advance(state, {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values: state.execution.random!.bounds.map(() => 0),
  }).state;
  record(
    'searched-play-order',
    'Choose the next searched unit while preserving every remaining free play',
    state,
    choose(state, i => i.kind === 'play' && i.card === fleetGame.refs['fleet-two']),
  );

  const forge = board('reforged-host');
  forge.players[0].hand = [{ card: 'reforge' }];
  forge.players[0].deck![0] = { card: 'academy-training', ref: 'forged-upgrade' };
  forge.attachments = [{ card: 'shield', unit: 'alice-0', ref: 'old-upgrade' }];
  const forgeGame = scenario(forge);
  state = step(
    step(forgeGame.state, 'play'),
    i => i.kind === 'target' && i.card === forgeGame.refs['alice-0'],
  );
  state = advance(state, choose(state, 'accept-effect', [forgeGame.refs['old-upgrade']!])).state;
  record(
    'search-bound-host',
    'Preserve the original attachment target through inspection and server shuffle',
    state,
    choose(state, 'search', [forgeGame.refs['forged-upgrade']!]),
  );

  const custody = board('capture-choice');
  custody.players[0].hand = [{ card: 'grand-admiral-thrawn--grand-schemer' }];
  custody.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  const custodyGame = scenario(custody);
  state = step(custodyGame.state, 'play');
  record(
    'opponent-capture',
    'The opponent offers an exact unit to the original ability controller’s guard',
    state,
    choose(state, i => i.kind === 'target' && i.card === custodyGame.refs['bob-0']),
  );
  const arrest = board('delayed-rescue');
  arrest.players[0].hand = [{ card: 'arrest' }, { card: 'arrest' }];
  arrest.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  const arrestGame = scenario(arrest);
  state = step(
    step(arrestGame.state, 'play'),
    i => i.kind === 'target' && i.card === arrestGame.refs['bob-0'],
  );
  state = step(
    step(step(state, 'pass'), 'play'),
    i => i.kind === 'target' && i.card === arrestGame.refs['bob-1'],
  );
  state = step(step(state, 'pass'), 'pass');
  record(
    'delayed-rescue-order',
    'Order two base-guarded rescues before regroup triggers and drawing',
    state,
    choose(state, 'delayed'),
  );

  const drawObserver = board('draw-observer');
  drawObserver.players[0].ground!.push({
    card: 'the-mandalorian--let-s-see-the-puck',
    ref: 'draw-mando',
  });
  drawObserver.players[0].hand = [{ card: 'remnant-reserves' }];
  const drawGame = scenario(drawObserver);
  state = step(drawGame.state, 'play');
  state = advance(
    state,
    choose(state, 'search', state.execution.decision!.selection!.cards.slice(0, 3)),
  ).state;
  record(
    'search-draw-observer',
    'A multi-card search draw triggers one Shield after the server shuffle',
    state,
    {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: state.execution.random!.id,
      values: state.execution.random!.bounds.map(() => 0),
    },
  );
  const attackObserver = board('attack-observer');
  attackObserver.players[0].ground!.push({
    card: 'anakin-skywalker--prescient-podracer',
    ref: 'attack-observer',
  });
  attackObserver.attachments = [
    { card: 'shield', unit: 'bob-0' },
    { card: 'shield', unit: 'bob-0' },
  ];
  const observerGame = scenario(attackObserver);
  state = step(
    observerGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === observerGame.refs['attack-observer'] &&
      i.defender === observerGame.refs['bob-0'],
  );
  record(
    'attack-observer-combat',
    'Preserve friendly Attack Ends observers across combat damage replacement',
    state,
    choose(state, 'target'),
  );

  const arrange = board('private-order');
  arrange.players[0].hand = [{ card: 'qui-gon-jinn--influencing-chance' }];
  arrange.players[0].deck![0] = { card: ids.marine, ref: 'ordered-one' };
  arrange.players[0].deck![1] = { card: ids.fighter, ref: 'ordered-two' };
  arrange.players[0].deck![2] = { card: 'incapacitate', ref: 'ordered-three' };
  const arrangeGame = scenario(arrange);
  state = step(arrangeGame.state, 'play');
  record(
    'look-discard',
    'Choose a private inspected card to discard before ordering the rest',
    state,
    choose(state, 'accept-effect', [arrangeGame.refs['ordered-two']!]),
  );
  state = advance(state, choose(state, 'accept-effect', [arrangeGame.refs['ordered-two']!])).state;
  record(
    'order-deck-top',
    'Choose the topmost card while keeping remaining order private',
    state,
    choose(state, i => i.kind === 'target' && i.card === arrangeGame.refs['ordered-three']),
  );
  const bottom = board('bottom-order');
  bottom.players[0].hand = [{ card: 'incapacitate' }];
  bottom.players[0].ground![0]!.damage = 2;
  bottom.players[0].space = [{ card: 'rogue-one--at-any-cost' }];
  const bottomGame = scenario(bottom);
  state = step(
    step(bottomGame.state, 'play'),
    i => i.kind === 'target' && i.card === bottomGame.refs['alice-0'],
  );
  state = advance(
    state,
    choose(state, 'accept-effect', state.execution.decision!.selection!.cards),
  ).state;
  record(
    'order-deck-bottom',
    'Order both inspected cards on the bottom without a shuffle',
    state,
    choose(state, 'target'),
  );

  const attackGrant = board('attack-grant');
  attackGrant.players[0].hand = [{ card: 'trench-run' }];
  attackGrant.players[0].space = [{ card: 'tie-bomber', ref: 'bomber' }];
  const grantGame = scenario(attackGrant);
  state = step(
    step(grantGame.state, 'play'),
    i =>
      i.kind === 'attack' &&
      i.attacker === grantGame.refs.bomber &&
      i.defender === grantGame.state.players.bob!.base,
  );
  record(
    'attack-grant-order',
    'Order native and event-granted On Attack abilities with a captured origin',
    state,
    choose(state, 'trigger'),
  );

  const taxBoard = board('action-tax');
  taxBoard.players[0].hand = [{ card: 'the-eye-of-aldhani' }];
  taxBoard.players[1].credits = ['tax-credit'];
  const taxGame = scenario(taxBoard);
  state = step(taxGame.state, 'play');
  state = step(step(state, 'pass'), 'pass');
  state = step(step(state, 'resource'), 'resource');
  record(
    'action-phase-tax',
    'The opponent chooses units to pay for after readying',
    state,
    choose(state, 'accept-effect', [taxGame.refs['bob-0']!]),
  );
  state = advance(state, choose(state, 'accept-effect', [taxGame.refs['bob-0']!])).state;
  record(
    'action-tax-credits',
    'Confirm a Credit with all unit payment choices preserved',
    state,
    choose(state, 'accept-effect', [state.execution.decision!.selection!.cards[0]!]),
  );

  const stolenBoard = board('resource-play');
  stolenBoard.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  stolenBoard.players[0].hand = [{ card: 'tear-this-ship-apart' }];
  stolenBoard.players[1].resources![0] = { card: 'open-fire', ref: 'stolen-event' };
  const stolenGame = scenario(stolenBoard);
  state = step(stolenGame.state, 'play');
  record(
    'opponent-resources',
    'Privately select an opponent resource to play for free',
    state,
    choose(state, 'accept-effect', [stolenGame.refs['stolen-event']!]),
  );
  state = advance(state, choose(state, 'accept-effect', [stolenGame.refs['stolen-event']!])).state;
  record(
    'free-resource-play',
    'Choose to play a privately inspected resource under another controller',
    state,
    choose(state, 'play'),
  );
  state = step(state, 'play');
  record(
    'stolen-event-target',
    'The event in its owner discard resolves for the player who played it',
    state,
    choose(state, 'target'),
  );

  const defense = board('force-defense');
  defense.players[1].ground = [{ card: 'chirrut--mwe--blind--but-not-deaf', ref: 'chirrut' }];
  defense.players[1].force = true;
  const defenseGame = scenario(defense);
  state = step(
    defenseGame.state,
    i => i.kind === 'attack' && i.defender === defenseGame.refs.chirrut,
  );
  record(
    'force-defense',
    'Defender pays Force with the exact attacker captured in its trigger',
    state,
    choose(state, 'accept-effect'),
  );

  const ambushPower = board('ambush-power');
  ambushPower.players[0].hand = [{ card: 'heroic-purrgil', ref: 'purrgil' }];
  ambushPower.players[1].space = [{ card: 'mercenary-fleet', ref: 'defender' }];
  ambushPower.attachments = [
    { card: 'shield', unit: 'defender' },
    { card: 'shield', unit: 'defender' },
  ];
  const ambushGame = scenario(ambushPower);
  state = step(
    step(ambushGame.state, 'play'),
    i => i.kind === 'target' && i.card === ambushGame.refs.defender,
  );
  record(
    'ambush-power',
    'Preserve the Ambush-only bonus while choosing a Shield replacement',
    state,
    choose(state, 'target'),
  );

  const allUpgrades = board('all-upgrades');
  allUpgrades.players[0].resources = Array.from({ length: 15 }, () => ({ card: ids.marine }));
  allUpgrades.players[0].hand = [{ card: 'liberty--draw-their-fire-' }];
  allUpgrades.attachments = [
    { card: 'shield', unit: 'bob-0' },
    { card: 'preparation', unit: 'bob-0' },
  ];
  const libertyGame = scenario(allUpgrades);
  state = step(libertyGame.state, 'play');
  record(
    'all-upgrades',
    'Choose the exact unit before automatically returning all eligible upgrades',
    state,
    choose(state, i => i.kind === 'target' && i.card === libertyGame.refs['bob-0']),
  );

  const exactHealing = board('exact-healing');
  exactHealing.players[0].ground = [
    { card: 'grogu--mysterious-child', ref: 'grogu' },
    { card: ids.consular, ref: 'patient', damage: 2 },
  ];
  const exactHealingGame = scenario(exactHealing);
  state = step(
    exactHealingGame.state,
    i => i.kind === 'use-ability' && i.abilityId === 'heal-damage',
  );
  state = step(state, i => i.kind === 'target' && i.card === exactHealingGame.refs.patient);
  record(
    'exact-healing',
    'Allocate healing on one exact unit before counted damage',
    state,
    choose(state, 'accept-effect', [exactHealingGame.refs.patient!]),
  );

  const avar = board('force-deployment');
  avar.players[0].leader = { card: 'avar-kriss--marshal-of-starlight' };
  avar.players[0].force = true;
  avar.players[0].hand = [{ card: 'ki-adi-mundi--we-must-push-on' }];
  state = step(scenario(avar).state, 'play');
  state = step(state, 'accept-effect');
  state = step(state, 'pass');
  record(
    'force-deployment',
    'Deploy with eight resources and one recorded Force use',
    state,
    choose(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
  );

  const jamming = board('phase-naming');
  jamming.players[0].hand = [{ card: 'transmission-jamming' }];
  jamming.players[1].hand = [{ card: ids.marine }];
  state = step(scenario(jamming).state, 'play');
  state = advance(state, { ...choose(state, 'accept-effect'), namedCardId: ids.marine }).state;
  record(
    'phase-naming',
    'Both-player prohibition persists after the named event is discarded',
    state,
    choose(state, 'pass'),
  );

  const forceObserver = board('force-observer');
  forceObserver.players[0].force = true;
  forceObserver.players[0].hand = [{ card: 'yoda--my-ally-is-the-force' }];
  state = step(scenario(forceObserver).state, 'play');
  state = step(state, 'accept-effect');
  record(
    'force-observer',
    'Resolve healing before the pending Force-use observer',
    state,
    choose(state, i => i.kind === 'target' && i.card === state.players.alice!.base),
  );

  const deadHunter = board('defeated-hunter');
  deadHunter.players[0].leader = { card: 'boba-fett--krayt-s-claw-commander' };
  deadHunter.players[0].ground = [
    { card: 'asajj-ventress--harden-your-heart', ref: 'hunter', damage: 4 },
  ];
  deadHunter.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const hunterGame = scenario(deadHunter);
  state = step(
    hunterGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === hunterGame.refs.hunter &&
      i.defender === hunterGame.refs.defender,
  );
  record(
    'defeated-hunter',
    'Pay for the observed attack after its Bounty Hunter has left play',
    state,
    choose(state, 'accept-effect'),
  );

  const attackDraw = board('attack-draw');
  attackDraw.players[0].hand = [{ card: 'stay-on-target' }];
  attackDraw.players[0].space = [{ card: 'yellow-aces-bomber', ref: 'bomber' }];
  attackDraw.players[1].ground = [{ card: 'seasoned-fleet-admiral' }];
  attackDraw.attachments = [{ card: 'experience', unit: 'bomber' }];
  const attackDrawGame = scenario(attackDraw);
  state = step(attackDrawGame.state, 'play');
  state = step(
    state,
    i =>
      i.kind === 'attack' &&
      i.attacker === attackDrawGame.refs.bomber &&
      i.defender === state.players.bob!.base,
  );
  state = step(state, i => i.kind === 'target' && i.card === state.players.bob!.base);
  record(
    'attack-draw',
    'Opponent draw reaction suspends a granted ability before combat',
    state,
    choose(state, 'decline-effect'),
  );

  const hiddenSearch = board('unrevealed-search');
  hiddenSearch.players[0].hand = [{ card: 'faith-in-your-friends' }];
  const hiddenSearchGame = scenario(hiddenSearch);
  state = step(hiddenSearchGame.state, 'play');
  record(
    'unrevealed-search',
    'Keep a searched card private before separate Disclose and server randomness',
    state,
    choose(state, 'search', state.execution.decision!.selection!.cards.slice(0, 1)),
  );

  const multiCapture = board('capture-group');
  multiCapture.players[0].hand = [{ card: 'dismantle-the-conspiracy' }];
  const multiCaptureGame = scenario(multiCapture);
  state = step(multiCaptureGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === multiCaptureGame.refs['alice-0']);
  record(
    'capture-group',
    'Validate a shared remaining-HP budget before capturing the complete selected group',
    state,
    choose(state, 'accept-effect', [
      multiCaptureGame.refs['bob-0']!,
      multiCaptureGame.refs['bob-1']!,
    ]),
  );

  const tandem = board('tandem-attacks');
  tandem.players[0].hand = [{ card: 'tandem-assault' }];
  tandem.players[0].space = [{ card: 'blockade-runner', ref: 'runner' }];
  const tandemGame = scenario(tandem);
  state = step(tandemGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === tandemGame.refs.runner);
  state = step(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base);
  record(
    'tandem-attacks',
    'The first attack still has a trigger before the queued second attack',
    state,
    choose(state, 'decline-effect'),
  );

  const lastPower = board('last-power-allocation');
  lastPower.players[0].hand = [{ card: 'get-lost' }];
  lastPower.players[0].ground!.push({ card: 'helgait--dooku-was-a-visionary', ref: 'helgait' });
  lastPower.attachments = [{ card: 'experience', unit: 'helgait' }];
  const lastPowerGame = scenario(lastPower);
  state = step(lastPowerGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === lastPowerGame.refs.helgait);
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'distribute');
  record(
    'last-power-allocation',
    'Allocate the complete captured last-known power of a defeated upgraded unit',
    state,
    choose(state, 'accept-effect', Array(7).fill(lastPowerGame.refs['alice-0']!)),
  );

  const multiplied = board('multiplied-search');
  multiplied.players[0].hand = [{ card: 'recruit' }];
  multiplied.attachments = [{ card: 'arcana-star-map--path-to-peridea', unit: 'alice-0' }];
  const multipliedGame = scenario(multiplied);
  state = step(multipliedGame.state, 'play');
  record(
    'multiplied-search',
    'Resolve the doubled private inspection before server shuffling',
    state,
    choose(state, 'search', state.execution.decision!.selection!.cards.slice(-1)),
  );

  const exhaustionGroup = board('exhaustion-group');
  exhaustionGroup.players[0].hand = [{ card: 'the-mandalorian--weathered-pilot' }];
  exhaustionGroup.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  const exhaustionGame = scenario(exhaustionGroup);
  state = step(exhaustionGame.state, 'play');
  record(
    'exhaustion-group',
    'Choose both exact ground units before simultaneous exhaustion',
    state,
    choose(state, 'accept-effect', [
      exhaustionGame.refs['alice-0']!,
      exhaustionGame.refs['bob-0']!,
    ]),
  );

  const declinedDisclosure = board('declined-disclosure');
  declinedDisclosure.players[0].ground![0] = { card: 'warrior-of-clan-ordo', ref: 'warrior' };
  const declinedDisclosureGame = scenario(declinedDisclosure);
  state = step(
    declinedDisclosureGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === declinedDisclosureGame.refs.warrior &&
      i.defender === declinedDisclosureGame.state.players.bob!.base,
  );
  record(
    'declined-disclosure',
    'Declining Disclose resolves the card-defined consequence before combat',
    state,
    choose(state, 'decline-effect'),
  );

  const stolenCredit = board('stolen-credit');
  stolenCredit.players[0].ground![0] = { card: 'lieutenant-gorn--i-deserve-worse', ref: 'gorn' };
  stolenCredit.players[1].credits = ['stolen'];
  const stolenCreditGame = scenario(stolenCredit);
  state = step(
    stolenCreditGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === stolenCreditGame.refs.gorn &&
      i.defender === stolenCreditGame.state.players.bob!.base,
  );
  record(
    'stolen-credit',
    'Transfer a public Credit while preserving its owner and exact reference',
    state,
    choose(state, i => i.kind === 'target' && i.card === stolenCreditGame.refs.stolen),
  );

  const indirectOutcome = board('indirect-outcome');
  indirectOutcome.players[0].hand = [{ card: 'guerilla-soldier' }];
  const indirectOutcomeGame = scenario(indirectOutcome);
  state = step(indirectOutcomeGame.state, 'play');
  state = step(state, i => i.kind === 'choose-player' && i.playerId === 'bob');
  record(
    'indirect-outcome',
    'Assign unpreventable damage before the actual-base-damage continuation',
    state,
    choose(state, 'accept-effect', Array(3).fill(state.players.bob!.base)),
  );

  const persistentAdvantages = board('persistent-advantages');
  persistentAdvantages.players[0].space = [{ card: 'eviscerator--burn-them-away' }];
  persistentAdvantages.attachments = [{ card: 'advantage', unit: 'alice-0' }];
  const persistentAdvantageGame = scenario(persistentAdvantages);
  state = persistentAdvantageGame.state;
  record(
    'persistent-advantages',
    'Token modifiers remain while their combat-end abilities are suppressed',
    state,
    choose(
      state,
      i =>
        i.kind === 'attack' &&
        i.attacker === persistentAdvantageGame.refs['alice-0'] &&
        i.defender === state.players.bob!.base,
    ),
  );

  const chosenCost = board('chosen-cost');
  chosenCost.players[0].ground![0] = { card: 'krrsantan--hit-and-run', ref: 'krr' };
  chosenCost.players[0].hand = [
    { card: ids.marine, ref: 'cost-one' },
    { card: ids.fighter, ref: 'cost-two' },
  ];
  const chosenCostGame = scenario(chosenCost);
  state = step(chosenCostGame.state, i => i.kind === 'use-ability' && i.abilityId === 'retreat');
  record(
    'chosen-hand-cost',
    'Select two private exact cards before returning the paid source',
    state,
    choose(state, 'accept-effect', [
      chosenCostGame.refs['cost-one']!,
      chosenCostGame.refs['cost-two']!,
    ]),
  );

  const compoundCost = board('compound-cost');
  compoundCost.players[0].leader = { card: 'chewbacca--hero-of-kessel' };
  compoundCost.players[0].resources = [
    { card: ids.fighter, ref: 'resource-cost', exhausted: true },
  ];
  compoundCost.players[0].credits = ['credit-cost'];
  const compoundCostGame = scenario(compoundCost);
  state = step(
    compoundCostGame.state,
    i => i.kind === 'use-ability' && i.abilityId === 'break-free',
  );
  record(
    'chosen-resource-cost',
    'Privately choose a resource before any payment or exhaustion',
    state,
    choose(state, 'accept-effect', [compoundCostGame.refs['resource-cost']!]),
  );
  state = advance(
    state,
    choose(state, 'accept-effect', [compoundCostGame.refs['resource-cost']!]),
  ).state;
  record(
    'compound-credit-cost',
    'Spend a Credit and the previously selected resource in one payment',
    state,
    choose(state, 'accept-effect', [compoundCostGame.refs['credit-cost']!]),
  );

  const creditedAmbush = board('credited-ambush');
  creditedAmbush.players[0].leader = { card: 'jabba-the-hutt--crime-boss', deployedAs: 'unit' };
  creditedAmbush.players[0].hand = [{ card: 'independent-smuggler' }];
  creditedAmbush.players[0].credits = ['ambush-credit'];
  const creditedAmbushGame = scenario(creditedAmbush);
  state = step(
    creditedAmbushGame.state,
    i => i.kind === 'use-ability' && i.abilityId === 'underworld-ambush',
  );
  state = step(state, 'play');
  record(
    'credited-ambush',
    'Actual Credit payment grants Ambush before the new unit triggers',
    state,
    choose(state, 'accept-effect', [creditedAmbushGame.refs['ambush-credit']!]),
  );

  const optionalDiscard = board('optional-discard');
  optionalDiscard.players[0].leader = {
    card: 'sebulba--especially-dangerous-dug',
    ref: 'mill-leader',
    deployedAs: 'unit',
  };
  optionalDiscard.players[0].ground![0] = {
    card: 'sebulba-s-podracer--taking-the-lead',
    ref: 'podracer',
    exhausted: true,
  };
  const optionalDiscardGame = scenario(optionalDiscard);
  state = step(
    optionalDiscardGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === optionalDiscardGame.refs['mill-leader'] &&
      i.defender === optionalDiscardGame.state.players.bob!.base,
  );
  record(
    'optional-trigger-decline',
    'Decline a deck-discard observer without spending its round use',
    state,
    choose(state, 'decline-effect'),
  );
  record(
    'optional-trigger-accept',
    'Accept a deck-discard observer and consume only this exact copy use',
    state,
    choose(state, 'accept-effect'),
  );

  const captureDefeated = board('capture-defeated');
  captureDefeated.players[0].space = [{ card: 'bothan-5--new-republic-prison-ship' }];
  captureDefeated.players[0].hand = [{ card: 'open-fire' }];
  const captureDefeatedGame = scenario(captureDefeated);
  state = step(captureDefeatedGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === captureDefeatedGame.refs['alice-0']);
  record(
    'capture-defeated',
    'Capture the exact defeated subject from the controller discard',
    state,
    choose(state, 'accept-effect'),
  );

  const pairedDiscard = board('paired-discard');
  pairedDiscard.players[0].space = [
    { card: 'luthen-s-haulcraft--countermeasures-armed', ref: 'haulcraft' },
  ];
  pairedDiscard.players[0].hand = [
    { card: 'open-fire' },
    { card: 'open-fire', ref: 'agg-one' },
    { card: ids.trooper, ref: 'agg-two' },
    { card: ids.marine, ref: 'hero' },
  ];
  pairedDiscard.players[1].hand = [
    { card: ids.fighter, ref: 'discard-one' },
    { card: ids.marine, ref: 'discard-two' },
  ];
  const pairedDiscardGame = scenario(pairedDiscard);
  state = step(pairedDiscardGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === pairedDiscardGame.refs.haulcraft);
  state = advance(
    state,
    choose(
      state,
      'accept-effect',
      ['agg-one', 'agg-two', 'hero'].map(n => pairedDiscardGame.refs[n]!),
    ),
  ).state;
  record(
    'paired-discard',
    'The opponent chooses two exact hand cards for one simultaneous discard',
    state,
    choose(
      state,
      'accept-effect',
      ['discard-one', 'discard-two'].map(n => pairedDiscardGame.refs[n]!),
    ),
  );

  const enemyDeck = board('enemy-deck');
  enemyDeck.players[0].ground![0] = { card: 'reanimated-night-trooper', ref: 'trooper' };
  enemyDeck.players[0].hand = [{ card: 'open-fire' }];
  const enemyDeckGame = scenario(enemyDeck);
  state = step(enemyDeckGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === enemyDeckGame.refs.trooper);
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'enemy');
  record(
    'enemy-deck',
    'A private inspector chooses a card from the other player deck',
    state,
    choose(state, 'accept-effect', [state.players.bob!.deck[0]!]),
  );

  const randomHand = board('random-hand');
  randomHand.players[0].force = true;
  randomHand.players[0].hand = [{ card: 'the-will-of-the-force' }];
  randomHand.players[1].hand = [{ card: ids.fighter }];
  const randomHandGame = scenario(randomHand);
  state = step(randomHandGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === randomHandGame.refs['bob-0']);
  state = step(state, 'accept-effect');
  record(
    'random-hand',
    'Server randomness selects from the exact owner hand after returning a unit',
    state,
    {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: state.execution.random!.id,
      values: [1],
    },
  );

  const revealNamed = board('reveal-named');
  revealNamed.players[0].hand = [{ card: 'inspector-s-shuttle' }];
  revealNamed.players[1].hand = [
    { card: ids.fighter },
    { card: ids.fighter },
    { card: ids.marine },
  ];
  const revealNamedGame = scenario(revealNamed);
  state = step(revealNamedGame.state, 'play');
  const revealNamedInput = choose(state, 'accept-effect');
  if (revealNamedInput.type !== 'decision') throw new Error('Expected naming choice');
  record(
    'reveal-named',
    'Name a title before revealing the complete hand and counting matching cards',
    state,
    { ...revealNamedInput, namedCardId: ids.fighter },
  );

  const oddRecovery = board('odd-recovery');
  oddRecovery.players[0].hand = [{ card: 'boshek--charismatic-smuggler', ref: 'pilot' }];
  oddRecovery.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  oddRecovery.players[0].deck = [{ card: ids.fighter }, { card: ids.marine }];
  const oddRecoveryGame = scenario(oddRecovery);
  state = oddRecoveryGame.state;
  record(
    'odd-recovery',
    'Play the Pilot face, discard two cards and return only odd printed costs',
    state,
    choose(
      state,
      i =>
        i.kind === 'play' &&
        i.card === oddRecoveryGame.refs.pilot &&
        i.target === oddRecoveryGame.refs.host &&
        i.piloting === 'piloting',
    ),
  );

  const dualDisclosure = board('dual-disclosure');
  dualDisclosure.players[0].space = [{ card: 'ebon-hawk--cause-and-effect', ref: 'hawk' }];
  dualDisclosure.players[1].space = [{ card: 'blockade-runner', ref: 'ship' }];
  dualDisclosure.players[0].hand = [
    { card: ids.marine, ref: 'hero' },
    { card: ids.fighter, ref: 'villain' },
  ];
  const dualDisclosureGame = scenario(dualDisclosure);
  state = step(
    dualDisclosureGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === dualDisclosureGame.refs.hawk &&
      i.defender === dualDisclosureGame.refs.ship,
  );
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'both');
  record(
    'dual-disclosure',
    'Disclose both aspects before applying attack-only modifiers to exact combatants',
    state,
    choose(state, 'accept-effect', [
      dualDisclosureGame.refs.hero!,
      dualDisclosureGame.refs.villain!,
    ]),
  );

  const takingControl = board('taking-control');
  takingControl.players[0].ground![0] = {
    card: 'maul--master-of-the-shadow-collective',
    ref: 'maul',
  };
  const takingControlGame = scenario(takingControl);
  state = step(
    takingControlGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === takingControlGame.refs.maul &&
      i.defender === takingControlGame.state.players.bob!.base,
  );
  record(
    'taking-control',
    'Take control and record the future return against the exact source and target',
    state,
    choose(state, i => i.kind === 'target' && i.card === takingControlGame.refs['bob-0']),
  );

  const regroupControl = board('regroup-control');
  regroupControl.players[0].hand = [{ card: 'liberated-by-darkness' }];
  regroupControl.players[0].force = true;
  regroupControl.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  const regroupControlGame = scenario(regroupControl);
  state = step(step(regroupControlGame.state, 'play'), 'accept-effect');
  record(
    'regroup-control',
    'Force payment precedes selection and regroup restores the owner',
    state,
    choose(state, i => i.kind === 'target' && i.card === regroupControlGame.refs['bob-0']),
  );

  const repeatedControl = board('repeated-control');
  repeatedControl.players[0].ground![0] = {
    card: 'maul--master-of-the-shadow-collective',
    ref: 'maul',
  };
  repeatedControl.players[0].hand = [{ card: 'the-will-of-the-force', ref: 'bounce' }];
  const repeatedControlGame = scenario(repeatedControl);
  state = step(
    repeatedControlGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === repeatedControlGame.refs.maul &&
      i.defender === repeatedControlGame.state.players.bob!.base,
  );
  state = step(state, i => i.kind === 'target' && i.card === repeatedControlGame.refs['bob-0']);
  const controlRound = state.round;
  while (state.round === controlRound)
    state = advance(
      state,
      choose(state, state.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []),
    ).state;
  state = step(
    state,
    i =>
      i.kind === 'attack' &&
      i.attacker === repeatedControlGame.refs.maul &&
      i.defender === state.players.bob!.base,
  );
  state = step(state, i => i.kind === 'target' && i.card === repeatedControlGame.refs['bob-1']);
  state = step(state, 'pass');
  state = step(state, i => i.kind === 'play' && i.card === repeatedControlGame.refs.bounce);
  state = step(state, i => i.kind === 'target' && i.card === repeatedControlGame.refs.maul);
  record(
    'repeated-control',
    'Order both control returns after their source leaves play',
    state,
    choose(state, 'delayed'),
  );

  const doubledPower = board('doubled-power');
  doubledPower.players[0].ground![0] = { card: 'dryden-vos--i-get-all-worked-up', ref: 'dryden' };
  const doubledPowerGame = scenario(doubledPower);
  state = step(
    doubledPowerGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === doubledPowerGame.refs.dryden &&
      i.defender === doubledPowerGame.state.players.bob!.base,
  );
  record(
    'doubled-power',
    'Accept optional current-power doubling and retain the next regroup restriction',
    state,
    choose(state, 'accept-effect'),
  );
  state = step(state, 'accept-effect');
  record(
    'skipped-regroup-readiness',
    'The readiness restriction survives the attack expiry',
    state,
    choose(state, 'pass'),
  );

  const crisisChoice = board('crisis-choice');
  crisisChoice.players[0].hand = [{ card: 'time-of-crisis' }];
  const crisisChoiceGame = scenario(crisisChoice);
  state = step(crisisChoiceGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === crisisChoiceGame.refs['alice-0']);
  record(
    'crisis-choice',
    'Opponent chooses its own exact spared unit before simultaneous damage',
    state,
    choose(state, i => i.kind === 'target' && i.card === crisisChoiceGame.refs['bob-0']),
  );

  const combatOrder = board('combat-order');
  combatOrder.players[0].ground![0] = { card: 'the-stranger--no-survivors', ref: 'stranger' };
  combatOrder.attachments = [
    { card: 'shield', unit: 'stranger', ref: 'one' },
    { card: 'shield', unit: 'stranger', ref: 'two' },
  ];
  const combatOrderGame = scenario(combatOrder);
  state = step(
    combatOrderGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === combatOrderGame.refs.stranger &&
      i.defender === combatOrderGame.refs['bob-0'],
  );
  record(
    'combat-order',
    'The attacking player chooses defender-first combat before either damage packet',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'defender-first'),
  );
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'defender-first');
  record(
    'defender-first-shield',
    'Choose prevention before the Grit attacker responds',
    state,
    choose(state, i => i.kind === 'target' && i.card === combatOrderGame.refs.two),
  );

  for (const event of ['flash-the-vents', 'one-way-out']) {
    const attackEvent = board(event);
    attackEvent.players[0].hand = [{ card: event }];
    attackEvent.attachments = [
      { card: 'shield', unit: 'bob-0', ref: 'one' },
      { card: 'shield', unit: 'bob-0', ref: 'two' },
    ];
    const attackEventGame = scenario(attackEvent);
    state = step(attackEventGame.state, 'play');
    state = step(state, i => i.kind === 'target' && i.card === attackEventGame.refs['alice-0']);
    state = step(state, i => i.kind === 'attack' && i.defender === attackEventGame.refs['bob-0']);
    record(
      event,
      'Resolve Shield prevention with the modified attack and its exact continuation retained',
      state,
      choose(state, i => i.kind === 'target' && i.card === attackEventGame.refs.one),
    );
  }
  const afterAttack = board('after-attack');
  afterAttack.players[0].hand = [{ card: 'flash-the-vents' }];
  afterAttack.players[0].ground![1] = { card: 'anakin-skywalker--prescient-podracer' };
  const afterAttackGame = scenario(afterAttack);
  state = step(afterAttackGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === afterAttackGame.refs['alice-0']);
  state = step(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base);
  record(
    'after-attack',
    'Return the attacker through an Attack Ends trigger before Flash attempts its defeat',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'return-attacker'),
  );

  const droidAttack = board('droid-attack');
  droidAttack.players[0].ground![0] = { card: 'babu-frik--heyyy-', ref: 'babu' };
  droidAttack.players[0].ground![1] = { card: 'astromech-pilot', ref: 'droid', damage: 1 };
  const droidAttackGame = scenario(droidAttack);
  state = step(
    droidAttackGame.state,
    i => i.kind === 'use-ability' && i.card === droidAttackGame.refs.babu,
  );
  state = step(state, i => i.kind === 'target' && i.card === droidAttackGame.refs.droid);
  record(
    'droid-attack',
    'Babu’s exact Droid attacks using remaining HP without changing its power',
    state,
    choose(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base),
  );

  const zeroHp = board('zero-hp');
  zeroHp.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  zeroHp.players[0].hand = [{ card: 'the-tragedy-of-plagueis' }];
  zeroHp.players[1].hand = [{ card: 'open-fire' }];
  const zeroHpGame = scenario(zeroHp);
  state = step(zeroHpGame.state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === zeroHpGame.refs['alice-0']);
  record(
    'tragedy-opponent',
    'Opponent chooses its own unit after the friendly protection is established',
    state,
    choose(state, i => i.kind === 'target' && i.card === zeroHpGame.refs['bob-0']),
  );
  state = step(state, i => i.kind === 'target' && i.card === zeroHpGame.refs['bob-0']);
  state = step(state, 'play');
  state = step(state, i => i.kind === 'target' && i.card === zeroHpGame.refs['alice-0']);
  record(
    'zero-hp',
    'A unit below zero remaining HP survives until the protection expires',
    state,
    choose(state, 'pass'),
  );

  const partial = board('partial-prevention');
  partial.players[0].resources = Array.from({ length: 16 }, () => ({ card: ids.marine }));
  partial.players[0].hand = [
    { card: 'shien-flurry', ref: 'shien' },
    { card: 'darth-vader--twilight-of-the-apprentice', ref: 'vader' },
  ];
  partial.players[1].hand = [
    { card: 'deadly-vulnerability', ref: 'deadly' },
    { card: 'open-fire', ref: 'fire' },
  ];
  const partialGame = scenario(partial);
  state = step(partialGame.state, i => i.kind === 'play' && i.card === partialGame.refs.shien);
  state = step(state, i => i.kind === 'play' && i.card === partialGame.refs.vader);
  const playedBatch = state.execution.frames[0];
  if (playedBatch?.kind !== 'trigger-batch') throw new Error('Missing Shien/Vader played batch');
  const shieldsFirst = playedBatch.triggers.find(t => t.abilityId === 'shield-both')!;
  record(
    'shien-played',
    'Order the printed played ability and newly granted Ambush after establishing prevention',
    state,
    choose(state, i => i.kind === 'trigger' && i.triggerId === shieldsFirst.id),
  );
  state = step(state, i => i.kind === 'trigger' && i.triggerId === shieldsFirst.id);
  state = step(state, i => i.kind === 'target' && i.card === partialGame.refs.vader);
  state = step(state, i => i.kind === 'target' && i.card === partialGame.refs['bob-0']);
  state = step(state, 'decline-effect');
  state = step(
    state,
    i =>
      i.kind === 'play' &&
      i.card === partialGame.refs.deadly &&
      i.target === partialGame.refs.vader,
  );
  state = step(state, 'pass');
  state = step(state, i => i.kind === 'play' && i.card === partialGame.refs.fire);
  state = step(state, i => i.kind === 'target' && i.card === partialGame.refs.vader);
  record(
    'partial-prevention',
    'The affected controller orders Shield, partial prevention and mandatory doubling',
    state,
    choose(state, i => i.kind === 'target' && i.card === partialGame.refs.shien),
  );
  state = step(state, i => i.kind === 'target' && i.card === partialGame.refs.shien);
  record(
    'transformed-damage',
    'Resume after partial prevention with doubled damage and a Shield still available',
    state,
    choose(state, i => i.kind === 'target' && i.card === partialGame.refs.deadly),
  );

  const restriction = board('event-restriction');
  restriction.players[0].hand = [{ card: 'trade-route-taxation' }];
  restriction.players[0].space = [{ card: ids.fighter }];
  restriction.players[1].hand = [
    { card: 'open-fire', ref: 'blocked-event' },
    { card: ids.marine, ref: 'allowed-unit' },
  ];
  const restrictionGame = scenario(restriction);
  state = step(restrictionGame.state, 'play');
  record(
    'event-restriction',
    'An enemy unit remains playable while ordinary and nested events are prohibited',
    state,
    choose(state, i => i.kind === 'play' && i.card === restrictionGame.refs['allowed-unit']),
  );

  const leiaDisclosure = board('leia-disclosure');
  leiaDisclosure.players[0].leader = { card: 'leia-organa--of-a-secret-bloodline', ref: 'leia' };
  leiaDisclosure.players[0].hand = [{ card: 'liberated-by-darkness', ref: 'reveal' }];
  const leiaGame = scenario(leiaDisclosure);
  state = step(
    leiaGame.state,
    i => i.kind === 'use-ability' && i.abilityId === 'disclose-training',
  );
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'cunning');
  record(
    'leia-disclosure',
    'Reveal a Cunning/Villainy card after Leia pays and exhausts',
    state,
    choose(state, 'accept-effect', [leiaGame.refs.reveal!]),
  );
  state = advance(state, choose(state, 'accept-effect', [leiaGame.refs.reveal!])).state;
  record(
    'leia-disclosed-target',
    'Retain all aspects of the disclosed card while choosing a friendly or enemy unit',
    state,
    choose(state, i => i.kind === 'target' && i.card === leiaGame.refs['bob-0']),
  );

  const keywordAura = board('keyword-aura');
  keywordAura.players[0].ground![0] = { card: 'gallius-rax--counselor-to-the-empire' };
  keywordAura.players[0].ground![1] = { card: 'the-stranger--no-survivors', ref: 'stranger' };
  const keywordGame = scenario(keywordAura);
  state = step(
    keywordGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === keywordGame.refs.stranger &&
      i.defender === keywordGame.refs['bob-0'],
  );
  record(
    'keyword-aura',
    'Gallius’s keyword-dependent bonus survives a pending combat-order decision',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'defender-first'),
  );

  const armorerForge = board('armorer-forge');
  armorerForge.players[0].leader = { card: 'the-armorer--steel-shapes-us' };
  armorerForge.players[0].resources![0] = { card: 'academy-training', ref: 'upgrade' };
  armorerForge.enteredThisPhase = ['bob-0'];
  const armorerGame = scenario(armorerForge);
  state = step(armorerGame.state, i => i.kind === 'use-ability' && i.abilityId === 'forge-upgrade');
  record(
    'armorer-resource',
    'Inspect private resources before paying for an upgrade',
    state,
    choose(state, 'accept-effect', [armorerGame.refs.upgrade!]),
  );
  state = advance(state, choose(state, 'accept-effect', [armorerGame.refs.upgrade!])).state;
  record(
    'armorer-resource-play',
    'Pay with the selected resource and attach to a newly entered enemy unit',
    state,
    choose(state, i => i.kind === 'play' && i.target === armorerGame.refs['bob-0']),
  );

  const odds = board('han-odds');
  odds.players[0].leader = { card: 'han-solo--never-tell-me-the-odds' };
  odds.players[0].deck![0] = { card: 'open-fire' };
  odds.players[0].ground![0] = { card: ids.trooper, ref: 'odd-attacker' };
  odds.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  for (const resource of odds.players[0].resources!) resource.exhausted = true;
  const oddsGame = scenario(odds);
  state = step(oddsGame.state, i => i.kind === 'use-ability' && i.abilityId === 'different-odds');
  record(
    'han-revealed-odds',
    'Choose the attacker after a public reveal without moving the top card',
    state,
    choose(state, i => i.kind === 'target' && i.card === oddsGame.refs['odd-attacker']),
  );
  state = step(oddsGame.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  state = step(state, i => i.kind === 'target' && i.card === oddsGame.refs.host);
  record(
    'han-odd-resources',
    'Choose exact resources for the odd-cost cards after upgrade deployment',
    state,
    choose(state, 'accept-effect', state.players.alice!.resources.slice(0, 3)),
  );

  const kyloChoices = board('kylo-discard');
  kyloChoices.players[0].leader = { card: 'kylo-ren--we-re-not-done-yet' };
  kyloChoices.players[0].hand = [{ card: 'academy-training', ref: 'hand-upgrade' }];
  kyloChoices.players[0].discard = [
    { card: 'nimble-prowess', ref: 'first-upgrade' },
    { card: 'cybernetic-enhancements', ref: 'second-upgrade' },
  ];
  const kyloChoicesGame = scenario(kyloChoices);
  state = step(
    kyloChoicesGame.state,
    i => i.kind === 'use-ability' && i.abilityId === 'upgrade-recovery',
  );
  record(
    'kylo-hand-discard',
    'Discard a private hand upgrade before the conditional draw',
    state,
    choose(state, 'accept-effect', [kyloChoicesGame.refs['hand-upgrade']!]),
  );
  state = step(kyloChoicesGame.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  state = step(state, i => i.kind === 'play' && i.card === kyloChoicesGame.refs['first-upgrade']);
  state = step(state, 'decline-effect');
  record(
    'kylo-next-upgrade',
    'Choose another paid upgrade after the first play and its nested trigger',
    state,
    choose(state, i => i.kind === 'play' && i.card === kyloChoicesGame.refs['second-upgrade']),
  );

  const sabeChoices = board('sabe-deck');
  sabeChoices.players[0].leader = { card: 'sab---queen-s-shadow' };
  sabeChoices.players[1].hand = [{ card: 'nimble-prowess', ref: 'defending-hand' }];
  const sabeChoicesGame = scenario(sabeChoices);
  state = step(
    sabeChoicesGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === sabeChoicesGame.refs['alice-0'] &&
      i.defender === sabeChoicesGame.state.players.bob!.base,
  );
  state = step(state, 'accept-effect');
  record(
    'sabe-required-discard',
    'Choose the mandatory discard from the defending player’s private top two',
    state,
    choose(state, 'accept-effect', [state.players.bob!.deck[0]!]),
  );
  sabeChoices.players[0].leader = {
    card: 'sab---queen-s-shadow',
    ref: 'sabe',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  const sabeUnitGame = scenario(sabeChoices);
  state = step(
    sabeUnitGame.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === sabeUnitGame.refs.sabe &&
      i.defender === sabeUnitGame.state.players.bob!.base,
  );
  record(
    'sabe-defending-hand',
    'Inspect the defending hand after Raid expires, then discard and replace a chosen card',
    state,
    choose(state, 'accept-effect', [sabeUnitGame.refs['defending-hand']!]),
  );

  const nabatConfig = config('nabat-hand-order');
  nabatConfig.players[0].base = 'nabat-village';
  const nabatGame = new LocalGame(nabatConfig, n => n - 1);
  state = nabatGame.submit(
    choose(nabatGame.state, i => i.kind === 'initiative' && i.playerId === 'alice'),
  );
  for (let n = 0; n < 2; n++)
    state = nabatGame.submit(choose(state, i => i.kind === 'mulligan' && !i.take));
  for (let n = 0; n < 2; n++)
    state = nabatGame.submit(
      choose(state, 'resource', state.execution.decision!.selection!.cards.slice(0, 2)),
    );
  const nabatCards = state.players.alice!.hand.slice(0, 3);
  record(
    'nabat-hand-selection',
    'Choose three private hand cards after resourcing and before the first action',
    state,
    choose(state, 'accept-effect', nabatCards),
  );
  state = advance(state, choose(state, 'accept-effect', nabatCards)).state;
  record(
    'nabat-bottom-order',
    'Order selected hand cards without moving or revealing them first',
    state,
    choose(state, i => i.kind === 'target' && i.card === nabatCards[2]),
  );
  state = step(state, i => i.kind === 'target' && i.card === nabatCards[2]);
  record(
    'nabat-partial-order',
    'Finish the private bottom order and move the group together',
    state,
    choose(state, i => i.kind === 'target' && i.card === nabatCards[0]),
  );

  const kazTurns = board('kaz-extra-action');
  kazTurns.players[0].leader = { card: 'kazuda-xiono--best-pilot-in-the-galaxy', ref: 'kaz' };
  kazTurns.players[0].ground![0] = { card: 'independent-smuggler', ref: 'smuggler' };
  kazTurns.players[0].hand = [{ card: ids.marine, ref: 'extra-play' }];
  const kazTurnsGame = scenario(kazTurns);
  state = step(kazTurnsGame.state, i => i.kind === 'use-ability' && i.abilityId === 'extra-action');
  record(
    'kaz-round-target',
    'Choose a friendly unit for round-long ability loss before the extra action',
    state,
    choose(state, i => i.kind === 'target' && i.card === kazTurnsGame.refs.smuggler),
  );
  state = step(state, i => i.kind === 'target' && i.card === kazTurnsGame.refs.smuggler);
  record(
    'kaz-extra-action',
    'The same player plays a unit after the leader action, with round loss retained',
    state,
    choose(state, i => i.kind === 'play' && i.card === kazTurnsGame.refs['extra-play']),
  );
  kazTurns.players[0].leader = {
    card: 'kazuda-xiono--best-pilot-in-the-galaxy',
    ref: 'kaz',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  const kazUnitTurns = scenario(kazTurns);
  state = step(
    kazUnitTurns.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === kazUnitTurns.refs.kaz &&
      i.defender === kazUnitTurns.state.players.bob!.base,
  );
  record(
    'kaz-round-group',
    'Blank chosen friendly units simultaneously, including the ability source',
    state,
    choose(state, 'accept-effect', [kazUnitTurns.refs.kaz!, kazUnitTurns.refs.smuggler!]),
  );

  const extraPasses = board('extra-action-passes');
  extraPasses.extraActions = 2;
  const extraPassesGame = scenario(extraPasses);
  state = step(extraPassesGame.state, 'pass');
  record(
    'extra-action-passes',
    'Another pass by the same player does not end the phase while an extra action remains',
    state,
    choose(state, 'pass'),
  );

  const encore = board('extra-regroups');
  encore.players[0].ground![0] = { card: 'max-rebo--encore-' };
  encore.players[1].ground![0] = { card: 'max-rebo--encore-' };
  const encoreGame = scenario(encore);
  state = step(step(encoreGame.state, 'pass'), 'pass');
  state = advance(state, choose(state, 'resource', [])).state;
  state = advance(state, choose(state, 'resource', [])).state;
  record(
    'additional-regroup',
    'The second regroup retains the first round and the remaining additional phase',
    state,
    choose(state, 'resource', [state.players.alice!.hand[0]!]),
  );
  state = advance(state, choose(state, 'resource', [])).state;
  state = advance(state, choose(state, 'resource', [])).state;
  record(
    'final-additional-regroup',
    'The third regroup will finish the round without adding more phases',
    state,
    choose(state, 'resource', [state.players.alice!.hand[0]!]),
  );

  const victory = board('victory');
  for (const player of victory.players) {
    player.resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
    player.hand = [{ card: 'confidence-in-victory', ref: `${player.id}-victory` }];
  }
  victory.players[1].ground = [];
  victory.players[1].space = [{ card: ids.fighter }];
  const victoryGame = scenario(victory);
  state = step(
    victoryGame.state,
    i => i.kind === 'play' && i.card === victoryGame.refs['alice-victory'],
  );
  record(
    'victory-arena',
    'Public arena choice for a delayed card-effect win',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'ground'),
  );
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'ground');
  state = step(state, 'pass');
  record(
    'victory-result',
    'First regroup ends the game from the scheduled condition',
    state,
    choose(state, 'pass'),
  );
  state = step(
    victoryGame.state,
    i => i.kind === 'play' && i.card === victoryGame.refs['alice-victory'],
  );
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'ground');
  state = step(state, i => i.kind === 'play' && i.card === victoryGame.refs['bob-victory']);
  state = step(state, i => i.kind === 'choose-mode' && i.mode === 'space');
  state = step(step(state, 'pass'), 'pass');
  record(
    'victory-order',
    'The active player orders opposing victory schedules',
    state,
    choose(state, i => i.kind === 'delayed-player' && i.playerId === 'bob'),
  );
  victory.players[0].credits = ['victory-credit'];
  const victoryCredit = scenario(victory);
  state = step(
    victoryCredit.state,
    i => i.kind === 'play' && i.card === victoryCredit.refs['alice-victory'],
  );
  record(
    'victory-payment',
    'First-action permission survives a Credit payment continuation',
    state,
    choose(state, 'accept-effect', [victoryCredit.refs['victory-credit']!]),
  );

  const invoke = board('invoke-defeated');
  invoke.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  invoke.players[0].hand = [{ card: 'chimaera--reinforcing-the-center' }];
  invoke.players[0].ground = [{ card: 'ant-droid', ref: 'droid' }];
  invoke.attachments = [{ card: 'creditor-s-claim', unit: 'droid' }];
  const invokeGame = scenario(invoke);
  state = step(invokeGame.state, 'play');
  record(
    'invoked-source',
    'Choose the exact friendly unit whose ability will be used',
    state,
    choose(state, i => i.kind === 'target' && i.card === invokeGame.refs.droid),
  );
  state = step(state, i => i.kind === 'target' && i.card === invokeGame.refs.droid);
  record(
    'invoked-ability',
    'Choose only one of the printed and granted defeat abilities',
    state,
    choose(state, 'trigger'),
  );
  invoke.players[1].ground = [
    { card: 'superlaser-technician', controller: 'alice', ref: 'stolen' },
  ];
  const invokeResource = scenario(invoke);
  state = step(
    step(invokeResource.state, 'play'),
    i => i.kind === 'target' && i.card === invokeResource.refs.stolen,
  );
  record(
    'invoked-resource',
    'Resource a live unit for its controller while preserving its different owner',
    state,
    choose(state, 'accept-effect'),
  );

  const thrawn = board('repeat-defeated');
  thrawn.players[0].leader = { card: 'grand-admiral-thrawn-----how-unfortunate' };
  thrawn.players[0].hand = [{ card: 'chimaera--reinforcing-the-center' }];
  thrawn.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  const thrawnGame = scenario(thrawn);
  state = step(
    step(thrawnGame.state, 'play'),
    i => i.kind === 'target' && i.card === thrawnGame.refs.raddus,
  );
  record(
    'repeat-observer-queued',
    'Preserve the observer while the original ability chooses its target',
    state,
    choose(state, i => i.kind === 'target' && i.card === thrawnGame.refs['bob-0']),
  );
  state = step(state, i => i.kind === 'target' && i.card === thrawnGame.refs['bob-0']);
  record(
    'repeat-leader-payment',
    'Pay leader exhaustion before repeating the captured ability',
    state,
    choose(state, 'accept-effect'),
  );
  state = step(state, 'accept-effect');
  record(
    'repeat-new-target',
    'Choose a new target using the original source and ability',
    state,
    choose(state, i => i.kind === 'target' && i.card === thrawnGame.refs['bob-1']),
  );
  thrawn.players[0].leader = {
    card: 'grand-admiral-thrawn-----how-unfortunate',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  const thrawnUnit = scenario(thrawn);
  state = step(
    step(thrawnUnit.state, 'play'),
    i => i.kind === 'target' && i.card === thrawnUnit.refs.raddus,
  );
  state = step(state, i => i.kind === 'target' && i.card === thrawnUnit.refs['bob-0']);
  record(
    'repeat-unit-limit',
    'Accept the unit face’s optional once-per-round repetition',
    state,
    choose(state, 'accept-effect'),
  );

  const identity = board('identity-search');
  identity.players[0].deck = [
    { card: 'migs-mayfeld--how-about-a-toast-', ref: 'borrowed' },
    ...Array.from({ length: 20 }, () => ({ card: ids.marine })),
  ];
  identity.attachments = [
    { card: 'improvised-identity', unit: 'alice-0' },
    { card: 'shield', unit: 'bob-0', ref: 'shield-one' },
    { card: 'shield', unit: 'bob-0', ref: 'shield-two' },
  ];
  const identityGame = scenario(identity);
  state = step(
    identityGame.state,
    i => i.kind === 'use-ability' && i.abilityId.endsWith('-improvise'),
  );
  record(
    'identity-private-search',
    'Select one private ground unit to discard, with the round use and granting origin retained',
    state,
    choose(state, 'search', [identityGame.refs.borrowed!]),
  );
  state = advance(state, choose(state, 'search', [identityGame.refs.borrowed!])).state;
  const identityRandom: EngineInput = {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values: state.execution.random!.bounds.map(() => 0),
  };
  record(
    'identity-remainder',
    'Randomize the unchosen cards before the attack continuation',
    state,
    identityRandom,
  );
  state = advance(state, identityRandom).state;
  record(
    'identity-attack-choice',
    'Declare an attack with the full discarded-card abilities available',
    state,
    choose(state, i => i.kind === 'attack' && i.defender === identityGame.refs['bob-0']),
  );
  state = step(state, i => i.kind === 'attack' && i.defender === identityGame.refs['bob-0']);
  record(
    'identity-copied-attack',
    'Resolve a borrowed attack ability with the exact discarded origin',
    state,
    choose(state, i => i.kind === 'target' && i.card === identityGame.refs['shield-one']),
  );

  const moff = board('token-replacement');
  moff.players[0].ground!.push({
    card: 'moff-jerjerrod--we-shall-redouble-our-efforts',
    ref: 'moff',
  });
  moff.players[0].hand = [{ card: 'i-am-the-senate' }];
  const moffGame = scenario(moff);
  state = step(moffGame.state, 'play');
  record(
    'moff-unit-creation',
    'Replace an entire unit-token creation before allocating tokens',
    state,
    choose(state, i => i.kind === 'target' && i.card === moffGame.refs.moff),
  );
  moff.players[0].hand = [{ card: 'covering-the-wing' }];
  const moffShield = scenario(moff);
  state = step(step(moffShield.state, 'play'), 'decline-effect');
  state = step(state, i => i.kind === 'target' && i.card === moffShield.refs['bob-0']);
  record(
    'moff-fixed-recipient',
    'Double a Shield on the exact already selected opposing unit',
    state,
    choose(state, i => i.kind === 'target' && i.card === moffShield.refs.moff),
  );
  state = step(
    step(moffShield.state, 'play'),
    i => i.kind === 'target' && i.card === moffShield.refs.moff,
  );
  record(
    'moff-created-group',
    'Exclude every newly created X-Wing from the subsequent another-unit choice',
    state,
    choose(state, i => i.kind === 'target' && i.card === moffShield.refs['alice-0']),
  );
  moff.players[0].hand = [{ card: 'crucible--centuries-of-wisdom' }];
  const moffGroup = scenario(moff);
  state = step(moffGroup.state, 'play');
  record(
    'moff-grouped-creation',
    'Preserve all selected recipients through one replacement of a grouped token instruction',
    state,
    choose(state, i => i.kind === 'target' && i.card === moffGroup.refs.moff),
  );
  moff.players[0].hand = [{ card: 'i-am-the-senate' }];
  moff.attachments = [{ card: 'creditor-s-claim', unit: 'moff' }];
  const moffCost = scenario(moff);
  state = step(
    step(moffCost.state, 'play'),
    i => i.kind === 'target' && i.card === moffCost.refs.moff,
  );
  record(
    'moff-cost-trigger',
    'Resolve the sacrifice ability after the doubled tokens exist',
    state,
    choose(state, i => i.kind === 'target' && i.card === moffCost.refs['bob-0']),
  );

  const conversion = board('pilot-conversion');
  conversion.players[0].resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
  conversion.players[0].ground = [{ card: 'clone-pilot', ref: 'pilot' }];
  conversion.players[0].hand = [
    { card: 'corvus--inferno-squadron-raider', ref: 'corvus' },
    { card: 'eject', ref: 'eject' },
  ];
  const convertGame = scenario(conversion);
  state = step(convertGame.state, i => i.kind === 'play' && i.card === convertGame.refs.corvus);
  record(
    'convert-pilot',
    'Convert an in-play Pilot unit without leaving play',
    state,
    choose(state, i => i.kind === 'target' && i.card === convertGame.refs.pilot),
  );
  state = step(state, i => i.kind === 'target' && i.card === convertGame.refs.pilot);
  record(
    'converted-pilot',
    'Recover the exact converted role and original attachment restriction',
    state,
    choose(state, 'pass'),
  );
  state = step(step(state, 'pass'), i => i.kind === 'play' && i.card === convertGame.refs.eject);
  record(
    'eject-pilot',
    'Detach the same physical Pilot before drawing',
    state,
    choose(state, i => i.kind === 'target' && i.card === convertGame.refs.pilot),
  );
  conversion.players[0].ground = [];
  conversion.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  conversion.attachments = [{ card: 'clone-pilot', unit: 'ship', ref: 'pilot' }];
  const reattachGame = scenario(conversion);
  state = step(reattachGame.state, i => i.kind === 'play' && i.card === reattachGame.refs.corvus);
  record(
    'reattach-pilot',
    'Retain Piloting restrictions when moving an existing upgrade',
    state,
    choose(state, i => i.kind === 'target' && i.card === reattachGame.refs.pilot),
  );

  const luke = board('luke-replacement');
  luke.players[0].hand = [{ card: 'outer-rim-constable', ref: 'removal' }];
  luke.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  luke.attachments = [{ card: 'luke-skywalker--you-still-with-me-', unit: 'ship', ref: 'luke' }];
  const lukeGame = scenario(luke);
  state = step(
    step(lukeGame.state, 'play'),
    i => i.kind === 'target' && i.card === lukeGame.refs.luke,
  );
  record(
    'luke-upgrade-defeat',
    'Replace an upgrade defeat before any departure',
    state,
    choose(state, 'accept-effect'),
  );
  luke.players[0].hand = [{ card: 'open-fire' }];
  const lukeDeath = scenario(luke);
  state = step(
    step(lukeDeath.state, 'play'),
    i => i.kind === 'target' && i.card === lukeDeath.refs.ship,
  );
  record(
    'luke-vehicle-defeat',
    'Decline replacement after the vehicle has left play',
    state,
    choose(state, 'decline-effect'),
  );
  record('luke-interrupted', 'Concede during an orphaned upgrade replacement', state, {
    type: 'concede',
    gameId: state.gameId,
    expectedRevision: state.revision,
    playerId: 'alice',
  });
  luke.players[0].hand = [{ card: 'system-shock' }];
  const lukeConditional = scenario(luke);
  state = step(lukeConditional.state, 'play');
  state = advance(state, choose(state, 'accept-effect', [lukeConditional.refs.luke!])).state;
  record(
    'luke-conditional',
    'Complete a replacement before the original conditional damage',
    state,
    choose(state, 'accept-effect'),
  );
  luke.players[0].hand = [{ card: 'arrest' }];
  luke.players[0].space = [];
  luke.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  luke.attachments = [
    { card: 'luke-skywalker--you-still-with-me-', unit: 'ship', owner: 'bob', ref: 'luke' },
  ];
  const lukeCapture = scenario(luke);
  state = step(
    step(lukeCapture.state, 'play'),
    i => i.kind === 'target' && i.card === lukeCapture.refs.ship,
  );
  record(
    'luke-captured-vehicle',
    'The opposing Pilot escapes while the vehicle stays captured',
    state,
    choose(state, 'accept-effect'),
  );
  const cleanup = board('pilot-cleanup');
  cleanup.players[0].ground = [
    { card: 'clone-pilot', ref: 'pilot' },
    { card: 'luke-skywalker--you-still-with-me-', ref: 'luke' },
  ];
  cleanup.players[0].space = [{ card: 'corvus--inferno-squadron-raider', ref: 'corvus' }];
  const lukeCleanup = scenario(cleanup);
  state = lukeCleanup.state;
  const cleanupPilot = state.cards[lukeCleanup.refs.pilot!]!,
    cleanupHost = state.cards[lukeCleanup.refs.corvus!]!;
  attachPilot(state, state.cards[lukeCleanup.refs.luke!]!, cleanupPilot, cleanupHost);
  cleanupPilot.damage = 3;
  attachPilot(state, cleanupPilot, cleanupHost, cleanupHost);
  state.execution.decision = null;
  settle(state);
  record(
    'luke-conversion-cleanup',
    'Finish the host conversion after its attached Pilot escapes',
    state,
    choose(state, 'accept-effect'),
  );

  const monastery = board('monastery');
  monastery.players[0].base.card = 'mystic-monastery';
  state = scenario(monastery).state;
  for (let n = 0; n < 2; n++)
    state = step(
      step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base),
      'pass',
    );
  record(
    'monastery-third-use',
    'Spend the final game-wide Force action use',
    state,
    choose(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base),
  );

  const tomb = board('tomb-cost');
  tomb.players[0].base.card = 'tomb-of-eilram';
  const tombCase = scenario(tomb);
  state = step(
    tombCase.state,
    i => i.kind === 'use-ability' && i.card === tombCase.state.players.alice!.base,
  );
  record(
    'tomb-exhaustion-cost',
    'Choose an exact ready friendly unit as an activation cost',
    state,
    choose(state, 'accept-effect', [tombCase.refs['alice-1']!]),
  );

  const fennec = board('fennec-credit');
  fennec.players[0].leader.card = 'fennec-shand--ready-for-war';
  fennec.players[0].credits = ['payment'];
  fennec.players[0].hand = [{ card: ids.marine }];
  const fennecCase = scenario(fennec);
  state = step(fennecCase.state, i => i.kind === 'use-ability' && i.abilityId === 'ready-unit');
  state = advance(state, choose(state, 'accept-effect', [fennecCase.refs['alice-0']!])).state;
  record(
    'fennec-compound-credit',
    'Preserve the chosen unit while paying the resource component with a Credit',
    state,
    choose(state, 'accept-effect', [fennecCase.refs.payment!]),
  );

  const citadel = board('citadel-resource');
  citadel.players[0].base.card = 'citadel-research-center';
  state = scenario(citadel).state;
  state = step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base);
  record(
    'citadel-private-resource',
    'Return a private resource without exposing its face',
    state,
    choose(state, 'accept-effect', [state.execution.decision!.selection!.cards[0]!]),
  );

  const yard = board('shipbreaking');
  yard.players[0].base.card = 'shipbreaking-yard';
  state = scenario(yard).state;
  state = step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base);
  record(
    'shipbreaking-milled-copy',
    'Return only an exact card among the three just discarded',
    state,
    choose(state, 'accept-effect', [state.execution.decision!.selection!.cards[1]!]),
  );

  const allocation = board('base-allocation');
  allocation.players[0].base.card = 'executioner-s-arena';
  allocation.players[0].leader.deployedAs = 'unit';
  state = scenario(allocation).state;
  state = step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base);
  record(
    'executioner-pairs',
    'Allocate whole two-damage packets',
    state,
    choose(state, 'accept-effect', [
      state.ground.filter(id => state.cards[id]!.controller === 'bob')[0]!,
      state.ground.filter(id => state.cards[id]!.controller === 'bob')[0]!,
    ]),
  );

  allocation.players[0].base.card = 'first-battle-memorial';
  state = scenario(allocation).state;
  state = step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base);
  record(
    'memorial-experience',
    'Allocate Experience to an exact enemy copy',
    state,
    choose(state, 'accept-effect', [
      state.ground.filter(id => state.cards[id]!.controller === 'bob')[1]!,
    ]),
  );

  const palace = board('palace-discount');
  palace.players[0].base.card = 'dooku-s-palace';
  palace.players[0].leader.deployedAs = 'unit';
  palace.players[0].hand = [{ card: ids.marine }];
  palace.players[0].credits = ['palace-credit'];
  const pc = scenario(palace);
  state = step(pc.state, i => i.kind === 'use-ability' && i.card === pc.state.players.alice!.base);
  state = step(state, 'play');
  record(
    'palace-discount-credit',
    'Credit payment uses the live leader discount',
    state,
    choose(state, 'accept-effect', [pc.refs['palace-credit']!]),
  );

  const pit = board('pit-search');
  pit.players[0].base.card = 'great-pit-of-carkoon';
  pit.players[0].hand = [{ card: ids.marine }];
  pit.players[0].deck![10] = {
    card: 'the-sarlacc-of-carkoon--horror-of-the-dune-sea',
    ref: 'sarlacc',
  };
  const ps = scenario(pit);
  state = step(ps.state, i => i.kind === 'use-ability' && i.card === ps.state.players.alice!.base);
  state = advance(state, choose(state, 'accept-effect', [state.players.alice!.hand[0]!])).state;
  record(
    'pit-title-search',
    'Private whole-deck title search after a paid discard',
    state,
    choose(state, 'search', [ps.refs.sarlacc!]),
  );
  state = advance(state, choose(state, 'search', [ps.refs.sarlacc!])).state;
  record('pit-remainder-shuffle', 'Randomize the searched deck without exposing its order', state, {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values: state.execution.random!.bounds.map(() => 0),
  });

  const sar = board('sarlacc-power');
  sar.players[0].ground = [{ card: 'the-sarlacc-of-carkoon--horror-of-the-dune-sea' }];
  sar.players[0].discard = [{ card: ids.marine }];
  state = scenario(sar).state;
  state = step(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base);
  state = advance(state, choose(state, 'accept-effect', [state.players.alice!.discard[0]!])).state;
  record(
    'sarlacc-printed-power',
    'Use the printed power of a card already put in the deck',
    state,
    choose(state, 'target'),
  );

  const loan = board('resource-loan');
  loan.players[0].base.card = 'sundari-palace';
  loan.players[0].leader.deployedAs = 'unit';
  loan.players[0].hand = [{ card: ids.marine }];
  state = scenario(loan).state;
  state = step(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base);
  record(
    'sundari-resource-group',
    'Choose a private hand group to resource ready',
    state,
    choose(state, 'accept-effect', [state.players.alice!.hand[0]!]),
  );
  state = advance(state, choose(state, 'accept-effect', [state.players.alice!.hand[0]!])).state;
  state = step(step(state, 'pass'), 'pass');
  record(
    'sundari-repayment',
    'Defeat a chosen resource before regroup drawing',
    state,
    choose(state, 'accept-effect', [state.players.alice!.resources[0]!]),
  );

  const hanLoan = board('han-loan');
  hanLoan.players[0].leader.card = 'han-solo--audacious-smuggler';
  hanLoan.players[0].hand = [{ card: ids.marine }];
  state = scenario(hanLoan).state;
  state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = advance(state, choose(state, 'accept-effect', [state.players.alice!.hand[0]!])).state;
  for (let n = 0; n < 20; n++) {
    const f = state.execution.frames[0];
    if (
      f?.kind === 'effect' &&
      f.effect.kind === 'select-resources' &&
      f.effect.operation === 'defeat'
    )
      break;
    state = step(state, state.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  }
  record(
    'han-action-repayment',
    'Preserve a leader-front debt through the whole regroup',
    state,
    choose(state, 'accept-effect', [state.players.alice!.resources[0]!]),
  );

  const coordinate = board('leader-coordinate');
  coordinate.players[0].leader.card = 'padm--amidala--serving-the-republic';
  coordinate.players[0].deck![1] = { card: 'inspector-s-shuttle' };
  state = scenario(coordinate).state;
  state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  record(
    'coordinate-search',
    'Resume a Coordinate search using a private selected Republic card',
    state,
    choose(state, 'search', state.execution.decision!.selection!.cards.slice(0, 1)),
  );

  const lukePlayed = board('leader-played-copy');
  lukePlayed.players[0].leader.card = 'luke-skywalker--faithful-friend';
  lukePlayed.players[0].hand = [{ card: ids.marine }];
  state = scenario(lukePlayed).state;
  state = step(step(state, 'play'), 'pass');
  state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  record(
    'luke-played-copy',
    'Shield only the exact Heroism unit played by this player this phase',
    state,
    choose(state, 'target'),
  );

  const separateHits = board('leader-separate-damage');
  separateHits.players[0].leader = {
    card: 'bo-katan-kryze--princess-in-exile',
    deployedAs: 'unit',
  };
  separateHits.players[0].ground!.push({ card: 'mandalorian', ref: 'mando' });
  separateHits.attackedThisPhase = ['mando'];
  separateHits.attachments = [{ card: 'shield', unit: 'bob-0' }];
  const hits = scenario(separateHits);
  state = step(
    hits.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === hits.state.players.alice!.leader &&
      i.defender === hits.state.players.bob!.base,
  );
  state = step(state, i => i.kind === 'target' && i.card === hits.refs['bob-0']);
  record(
    'leader-second-damage',
    'Keep a separate second damage instruction after a Shield prevented the first',
    state,
    choose(state, i => i.kind === 'target' && i.card === hits.refs['bob-0']),
  );

  const waiver = board('leader-aspect-waiver');
  waiver.players[0].leader.card = 'nala-se--clone-engineer';
  waiver.players[0].base.card = 'kestro-city';
  waiver.players[0].hand = [{ card: 'clone-pilot' }];
  state = scenario(waiver).state;
  record(
    'leader-aspect-waiver',
    'Pay the printed Clone unit cost while retaining the distinct Piloting role',
    state,
    choose(state, i => i.kind === 'play' && !i.piloting),
  );

  const forcePilot = board('leader-force-pilot');
  forcePilot.players[0].leader.card = 'anakin-skywalker--tempted-by-the-dark-side';
  forcePilot.players[0].force = true;
  forcePilot.players[0].resources = [];
  forcePilot.players[0].credits = ['credit-a', 'credit-b', 'credit-c'];
  forcePilot.players[0].hand = [{ card: 'darth-vader--scourge-of-squadrons' }];
  forcePilot.players[0].space = [{ card: ids.fighter }];
  const fp = scenario(forcePilot);
  state = step(fp.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, 'play');
  record(
    'force-pilot-credits',
    'Spend the waived Pilot cost in Credits after the Force was paid',
    state,
    choose(
      state,
      'accept-effect',
      ['credit-a', 'credit-b', 'credit-c'].map(k => fp.refs[k]!),
    ),
  );

  const healingChoice = board('leader-chosen-heal');
  healingChoice.players[0].leader.card = 'satine-kryze--standing-on-principles';
  healingChoice.players[1].ground![0]!.damage = 1;
  const sh = scenario(healingChoice);
  state = step(sh.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, i => i.kind === 'target' && i.card === sh.refs['bob-0']);
  record(
    'chosen-healing',
    "Retain actual healing for Satine's later base damage",
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'heal-2-damage'),
  );

  const nextHidden = board('leader-next-hidden');
  nextHidden.players[0].leader = {
    card: 'third-sister--seething-with-ambition',
    deployedAs: 'unit',
  };
  nextHidden.players[0].hand = [{ card: ids.marine }];
  state = scenario(nextHidden).state;
  state = step(
    state,
    i =>
      i.kind === 'attack' &&
      i.attacker === state.players.alice!.leader &&
      i.defender === state.players.bob!.base,
  );
  state = step(state, 'pass');
  record(
    'next-play-hidden',
    'Apply and consume a checkpointed next-unit ability grant',
    state,
    choose(state, 'play'),
  );

  const aid = board('leader-opponent-creator');
  aid.players[0].leader.card = 'count-dooku--offering-aid';
  aid.players[1].ground!.push({
    card: 'moff-jerjerrod--we-shall-redouble-our-efforts',
    ref: 'moff',
  });
  const dc = scenario(aid);
  state = step(dc.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  record(
    'opponent-token-creator',
    'Let the instructed opposing creator replace their own token creation',
    state,
    choose(state, i => i.kind === 'target' && i.card === dc.refs.moff),
  );

  const landoPilot = board('leader-other-arena');
  landoPilot.players[0].leader.card = 'lando-calrissian--buying-time';
  landoPilot.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const lp = scenario(landoPilot);
  state = step(lp.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  state = step(state, i => i.kind === 'target' && i.card === lp.refs.vehicle);
  record(
    'pilot-other-arena',
    "Choose a Shield recipient outside the newly deployed Pilot's arena",
    state,
    choose(state, 'target'),
  );

  const survival = board('leader-zero-hp');
  survival.players[0].leader = {
    card: 'chirrut--mwe--one-with-the-force',
    deployedAs: 'unit',
    damage: 8,
  };
  state = step(scenario(survival).state, 'pass');
  record(
    'phase-survival',
    'Resolve immediate lethal maintenance when action-only survival ends',
    state,
    choose(state, 'pass'),
  );

  const groguDeploy = board('leader-repeatable-deployment');
  groguDeploy.players[0].leader.card = 'grogu--charming-companion';
  groguDeploy.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  groguDeploy.players[0].hand = [{ card: 'darth-vader--scourge-of-squadrons' }];
  state = step(scenario(groguDeploy).state, 'play');
  record(
    'repeatable-leader-deployment',
    'Deploy a ready Grogu from a unique-unit trigger without spending an Epic use',
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'deploy-grogu'),
  );

  const rebelChain = board('leader-rebel-chain');
  rebelChain.players[0].leader.card = 'leia-organa--alliance-general';
  const rc = scenario(rebelChain);
  state = step(rc.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, i => i.kind === 'target' && i.card === rc.refs['alice-0']);
  state = step(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base);
  record(
    'leader-chained-attack',
    'Choose a different Rebel after completing the first attack',
    state,
    choose(state, 'target'),
  );

  const cheaperChain = board('leader-cheaper-chain');
  cheaperChain.players[0].leader.card = 'colonel-yularen--this-is-why-we-plan';
  cheaperChain.players[0].ground = [
    { card: ids.consular, damage: 4, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  cheaperChain.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const cc = scenario(cheaperChain);
  state = step(cc.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, i => i.kind === 'target' && i.card === cc.refs.first);
  state = step(state, i => i.kind === 'attack' && i.defender === cc.refs.defender);
  record(
    'leader-cheaper-attacker',
    "Compare the departed first attacker's printed cost for the next attack",
    state,
    choose(state, 'target'),
  );

  const conditionalAttack = board('leader-unit-target-bonus');
  conditionalAttack.players[0].leader.card = 'anakin-skywalker--what-it-takes-to-win';
  const ca = scenario(conditionalAttack);
  state = step(ca.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, i => i.kind === 'target' && i.card === ca.refs['alice-0']);
  record(
    'declared-defender-bonus',
    'Evaluate the chosen defender after paying a recoverable base-damage cost',
    state,
    choose(state, i => i.kind === 'attack' && i.defender === ca.refs['bob-0']),
  );

  const ackbar = board('leader-bound-creator');
  ackbar.players[0].leader.card = 'admiral-ackbar--it-s-a-trap-';
  const ac = scenario(ackbar);
  state = step(ac.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  record(
    'bound-token-creator',
    'The controller of the exhausted unit creates its X-Wing',
    state,
    choose(state, i => i.kind === 'target' && i.card === ac.refs['bob-0']),
  );

  const trenchDeployment = board('paid-leader-deployment');
  trenchDeployment.players[0].leader.card = 'admiral-trench--chk-chk-chk-chk';
  state = step(
    scenario(trenchDeployment).state,
    i => i.kind === 'use-ability' && i.abilityId === 'deploy',
  );
  const trenchDiscard = choose(
    state,
    'accept-effect',
    state.execution.decision!.selection!.cards.slice(0, 2),
  );
  record(
    'deployment-opponent-discard',
    'An opponent selects two exact revealed deck cards after a repeatable deployment payment',
    state,
    trenchDiscard,
  );
  state = advance(state, trenchDiscard).state;
  record(
    'deployment-selected-draw',
    'The leader controller draws one remaining revealed copy and discards the other',
    state,
    choose(state, 'accept-effect', state.execution.decision!.selection!.cards.slice(0, 1)),
  );

  const bailDeployment = board('discard-leader-deployment');
  bailDeployment.players[0].leader.card = 'bail-organa--doing-everything-he-can';
  bailDeployment.players[0].hand = [{ card: ids.marine }, { card: ids.marine }];
  bailDeployment.players[0].resources![0] = { card: 'sudden-ferocity', ref: 'plot-upgrade' };
  const bc = scenario(bailDeployment);
  state = step(bc.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const bailPayment = choose(state, 'accept-effect', state.execution.decision!.selection!.cards);
  record(
    'deployment-compound-discard',
    'Pay both hand cards and exhaustion atomically before checking the four-resource condition',
    state,
    bailPayment,
  );
  state = advance(state, bailPayment).state;
  state = advance(state, choose(state, 'accept-effect', [bc.refs['plot-upgrade']!])).state;
  record(
    'resource-play-observer',
    'A Plot upgrade played after deployment triggers the resource-play healing observer',
    state,
    choose(state, i => i.kind === 'play' && i.target === state.players.alice!.leader),
  );

  const poeAttachment = board('leader-attachment-without-deployment');
  poeAttachment.players[0].leader.card = 'poe-dameron--i-can-fly-anything';
  poeAttachment.players[0].space = [{ card: ids.fighter }];
  state = step(
    scenario(poeAttachment).state,
    i => i.kind === 'use-ability' && i.abilityId === 'leader-action',
  );
  record(
    'leader-attachment-without-deploying',
    'Flip into an upgrade without spending the independent Epic or notifying deployment observers',
    state,
    choose(state, 'target'),
  );

  const leaderFlip = board('alternate-leader-face');
  leaderFlip.players[0].leader.card = 'chancellor-palpatine--playing-both-sides';
  leaderFlip.players[0].discard = [{ card: ids.marine, ref: 'defeated-hero' }];
  leaderFlip.defeatedThisPhase = ['defeated-hero'];
  state = scenario(leaderFlip).state;
  record(
    'alternate-leader-front-action',
    'A qualifying defeat flips Palpatine after drawing and healing, preserving exhaustion',
    state,
    choose(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
  );
  leaderFlip.players[0].leader.leaderSide = 'back';
  leaderFlip.players[0].hand = [{ card: ids.fighter }];
  state = step(scenario(leaderFlip).state, 'play');
  state = step(state, 'pass');
  record(
    'alternate-leader-back-action',
    'A Villainy play lets Sidious create a Clone, damage enemy bases and flip back',
    state,
    choose(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
  );

  const cadChoice = board('leader-opposing-reaction');
  cadChoice.players[0].leader.card = 'cad-bane--he-who-needs-no-introduction';
  cadChoice.players[0].hand = [{ card: 'devaronian-doorbuster' }];
  state = step(step(scenario(cadChoice).state, 'play'), 'accept-effect');
  record(
    'leader-opposing-reaction',
    'The opponent chooses which of its units Cad damages',
    state,
    choose(state, 'target'),
  );

  const mandoPilot = board('leader-upgrade-play-observer');
  mandoPilot.players[0].leader.card = 'the-mandalorian--sworn-to-the-creed';
  mandoPilot.players[0].hand = [{ card: 'clone-pilot' }];
  mandoPilot.players[0].space = [{ card: ids.fighter }];
  state = scenario(mandoPilot).state;
  record(
    'leader-upgrade-play-observer',
    'A Pilot played as an upgrade triggers Mandalorian',
    state,
    choose(state, i => i.kind === 'play' && !!i.piloting),
  );

  const revanAttack = board('leader-departed-attacker');
  revanAttack.players[0].leader.card = 'darth-revan--scourge-of-the-old-republic';
  const ra = scenario(revanAttack);
  state = step(
    ra.state,
    i =>
      i.kind === 'attack' && i.attacker === ra.refs['alice-0'] && i.defender === ra.refs['bob-0'],
  );
  record(
    'leader-departed-attacker',
    'Revan may exhaust after the attacker and defender both die, without giving another copy Experience',
    state,
    choose(state, 'accept-effect'),
  );

  const quinlanPlay = board('leader-equal-printed-cost');
  quinlanPlay.players[0].leader.card = 'quinlan-vos--sticking-the-landing';
  quinlanPlay.players[0].hand = [{ card: ids.marine }];
  state = step(step(scenario(quinlanPlay).state, 'play'), 'accept-effect');
  record(
    'leader-equal-printed-cost',
    'Quinlan chooses an enemy matching the played unit printed cost',
    state,
    choose(state, 'target'),
  );

  const vaderDiscard = board('leader-hand-damage');
  vaderDiscard.players[0].leader = { card: 'darth-vader--unstoppable', deployedAs: 'unit' };
  vaderDiscard.players[0].hand = [
    { card: ids.marine },
    { card: ids.marine },
    { card: ids.fighter },
  ];
  state = scenario(vaderDiscard).state;
  state = step(
    state,
    i =>
      i.kind === 'attack' &&
      i.attacker === state.players.alice!.leader &&
      i.defender === state.players.bob!.base,
  );
  record(
    'leader-hand-damage',
    'Select two exact hidden hand copies for Vader attack damage',
    state,
    choose(state, 'accept-effect', state.execution.decision!.selection!.cards.slice(0, 2)),
  );

  const lamaUpgrade = board('leader-upgrade-host-followup');
  lamaUpgrade.players[0].leader.card = 'lama-su--we-modified-their-genetics';
  lamaUpgrade.players[0].hand = [{ card: 'academy-training' }];
  state = step(
    scenario(lamaUpgrade).state,
    i => i.kind === 'use-ability' && i.abilityId === 'leader-action',
  );
  record(
    'leader-upgrade-host-followup',
    'Lama Su plays an upgrade and damages its exact host before play triggers',
    state,
    choose(state, 'play'),
  );

  const quiReturn = board('leader-return-cheaper-play');
  quiReturn.players[0].leader.card = 'qui-gon-jinn--student-of-the-living-force';
  quiReturn.players[0].force = true;
  quiReturn.players[0].ground![0] = { card: ids.consular, ref: 'return' };
  quiReturn.players[0].hand = [{ card: ids.marine }];
  const qr = scenario(quiReturn);
  state = step(qr.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  state = step(state, i => i.kind === 'target' && i.card === qr.refs.return);
  record(
    'leader-return-cheaper-play',
    'A returned unit retains its printed cost for the free non-Villainy hand play',
    state,
    choose(state, 'play'),
  );

  const rexCost = board('leader-ready-enemy-cost');
  rexCost.players[0].leader.card = 'rex--no-other-option';
  rexCost.players[1].ground![0]!.exhausted = true;
  state = step(
    scenario(rexCost).state,
    i => i.kind === 'use-ability' && i.abilityId === 'leader-action',
  );
  record(
    'leader-ready-enemy-cost',
    'Ready an exact enemy copy and exhaust Rex as one chosen payment',
    state,
    choose(state, 'accept-effect', state.execution.decision!.selection!.cards),
  );

  const vaneCost = board('leader-upgrade-cost');
  vaneCost.players[0].leader.card = 'vane--quarrelsome-pirate';
  vaneCost.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  vaneCost.attachments = [
    { card: 'luke-skywalker--you-still-with-me-', unit: 'host', ref: 'pilot' },
  ];
  const vc = scenario(vaneCost);
  state = step(vc.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  const vp = choose(state, 'accept-effect', [vc.refs.pilot!]);
  record(
    'leader-upgrade-cost',
    'Pay a friendly upgrade even when its defeat has a replacement choice',
    state,
    vp,
  );
  state = advance(state, vp).state;
  record(
    'leader-upgrade-cost-replacement',
    'Convert Luke into a unit before Vane chooses the damaged base',
    state,
    choose(state, 'accept-effect'),
  );

  const hanTokens = board('leader-mixed-tokens');
  hanTokens.players[0].leader = {
    card: 'han-solo--i-got-a-really-good-feeling',
    deployedAs: 'unit',
  };
  hanTokens.players[0].ground = [{ card: 'clone-trooper', ref: 'token' }];
  hanTokens.players[0].credits = ['credit'];
  hanTokens.attachments = [{ card: 'experience', unit: 'token', ref: 'experience' }];
  const ht = scenario(hanTokens);
  state = step(
    ht.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === ht.state.players.alice!.leader &&
      i.defender === ht.state.players.bob!.base,
  );
  if (state.execution.frames[0]?.kind === 'trigger-batch') {
    const trigger = state.execution.frames[0].triggers.find(t => t.abilityId === 'observe')!;
    state = step(state, i => i.kind === 'trigger' && i.triggerId === trigger.id);
  }
  record(
    'leader-mixed-tokens',
    'Select a token unit, its attached token and a Credit without counting unselected attachments',
    state,
    choose(state, 'accept-effect', [ht.refs.token!, ht.refs.experience!, ht.refs.credit!]),
  );

  const tobiasOwned = board('leader-owned-enemy-units');
  tobiasOwned.players[0].leader.card = 'tobias-beckett--people-are-predictable';
  tobiasOwned.players[0].ground![0]!.controller = 'bob';
  const to = scenario(tobiasOwned);
  state = step(to.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  record(
    'leader-owned-enemy-units',
    'Defeat a selected owned unit under enemy control, then create a Credit and draw',
    state,
    choose(state, 'accept-effect', [to.refs['alice-0']!]),
  );

  const jabbaDamage = board('leader-surviving-damage-amount');
  jabbaDamage.players[0].leader = {
    card: 'jabba-the-hutt--wonderful-human-being',
    deployedAs: 'unit',
  };
  jabbaDamage.players[0].ground = [{ card: ids.consular, damage: 1, ref: 'retaliator' }];
  state = scenario(jabbaDamage).state;
  state.execution.decision = null;
  state.execution.frames.unshift(
    {
      kind: 'effect',
      playerId: 'alice',
      source: structuredClone(state.cards[state.players.alice!.leader]!),
      effect: {
        kind: 'damage-units',
        filter: { controller: 'friendly', otherThan: 'source' },
        amount: 2,
      },
    },
    { kind: 'flush-triggers' },
  );
  settle(state);
  state = step(state, 'accept-effect');
  record(
    'leader-surviving-damage-amount',
    'Retaliation remembers the actual damage packet and the exact surviving dealer',
    state,
    choose(state, 'target'),
  );

  const jangoDamage = board('leader-unit-damage-dealer');
  jangoDamage.players[0].leader.card = 'jango-fett--concealing-the-conspiracy';
  jangoDamage.players[1].ground![0]!.card = ids.consular;
  const jd = scenario(jangoDamage);
  state = step(
    jd.state,
    i =>
      i.kind === 'attack' && i.attacker === jd.refs['alice-0'] && i.defender === jd.refs['bob-0'],
  );
  record(
    'leader-unit-damage-dealer',
    'Jango may pay exhaustion after the friendly unit that dealt combat damage has died',
    state,
    choose(state, 'accept-effect'),
  );

  {
    const bobaDeparture = board('leader-enemy-departure');
    bobaDeparture.players[0].leader.card = 'boba-fett--collecting-the-bounty';
    const bd = scenario(bobaDeparture);
    state = step(
      bd.state,
      i =>
        i.kind === 'attack' && i.attacker === bd.refs['alice-0'] && i.defender === bd.refs['bob-0'],
    );
    record(
      'leader-enemy-departure',
      'Boba observes an enemy departure after simultaneous combat defeats both units',
      state,
      choose(state, 'accept-effect'),
    );

    const yodaHand = board('leader-draw-deck-order');
    yodaHand.players[0].leader.card = 'yoda--sensing-darkness';
    yodaHand.players[0].hand = [{ card: ids.fighter, ref: 'return-hand' }];
    const yh = scenario(yodaHand);
    state = step(
      yh.state,
      i =>
        i.kind === 'attack' && i.attacker === yh.refs['alice-0'] && i.defender === yh.refs['bob-0'],
    );
    state = step(state, 'pass');
    state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    state = advance(state, choose(state, 'accept-effect', [yh.refs['return-hand']!])).state;
    record(
      'leader-draw-deck-order',
      'Yoda remembers the selected private hand copy while choosing top or bottom',
      state,
      choose(state, i => i.kind === 'choose-mode' && i.mode === 'deck-bottom'),
    );
    state = step(
      scenario(yodaHand).state,
      i => i.kind === 'use-ability' && i.abilityId === 'deploy',
    );
    record(
      'leader-blind-deck-discard',
      'Yoda chooses whether to discard before the top card becomes known',
      state,
      choose(state, 'accept-effect'),
    );

    const cassianCount = board('leader-base-damage-counter');
    cassianCount.players[0].leader.card = 'cassian-andor--dedicated-to-the-rebellion';
    const cc = scenario(cassianCount);
    state = step(
      cc.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === cc.refs['alice-0'] &&
        i.defender === cc.state.players.bob!.base,
    );
    state = step(state, 'pass');
    record(
      'leader-base-damage-counter',
      'Cassian checks retained actual base damage rather than the current damage total',
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
    );

    const preDraw = board('leader-draw-counter');
    preDraw.players[0].leader.card = 'pre-vizsla--pursuing-the-throne';
    state = scenario(preDraw).state;
    state.execution.decision = null;
    state.execution.frames.unshift(
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        effect: { kind: 'draw-cards', amount: 2 },
      },
      { kind: 'flush-triggers' },
    );
    settle(state);
    state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    record(
      'leader-draw-counter',
      'Pre Vizsla damage remembers the number of cards actually drawn this phase',
      state,
      choose(state, 'target'),
    );

    const luthenAfter = board('leader-after-combat-defeat');
    luthenAfter.players[0].leader.card = 'luthen-rael--don-t-you-want-to-fight-for-real-';
    luthenAfter.players[0].ground![0]!.card = ids.consular;
    luthenAfter.attachments = [
      { card: 'shield', unit: 'bob-0', owner: 'bob', ref: 'shield-one' },
      { card: 'shield', unit: 'bob-0', owner: 'bob', ref: 'shield-two' },
    ];
    const la = scenario(luthenAfter);
    state = step(
      la.state,
      i =>
        i.kind === 'attack' && i.attacker === la.refs['alice-0'] && i.defender === la.refs['bob-0'],
    );
    const attacker = state.cards[la.refs['alice-0']!]!;
    state.attacks[0]!.after = [
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        bindings: {
          chosen: {
            instanceId: attacker.instanceId,
            cardId: attacker.cardId,
            incarnation: attacker.incarnation,
            visibility: attacker.visibility,
          },
        },
        effect: { kind: 'on-unit', target: 'chosen', operation: { kind: 'defeat' } },
      },
    ];
    record(
      'leader-after-combat-defeat',
      'Luthen retains this-action attack history through a post-combat defeat',
      state,
      choose(state, i => i.kind === 'target' && i.card === la.refs['shield-one']),
    );

    const padmeReveal = board('leader-hand-reveal-event');
    padmeReveal.players[0].leader = {
      card: 'padm--amidala--what-do-you-have-to-hide-',
      deployedAs: 'unit',
    };
    padmeReveal.players[0].hand = [{ card: ids.marine }, { card: ids.fighter }];
    state = scenario(padmeReveal).state;
    state.execution.decision = null;
    state.execution.frames.unshift(
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        effect: { kind: 'reveal-hand', player: 'self', effects: [] },
      },
      { kind: 'flush-triggers' },
    );
    settle(state);
    record(
      'leader-hand-reveal-event',
      'A whole hand reveal creates one optional Padme reaction',
      state,
      choose(state, 'accept-effect'),
    );

    const anakinEntries = board('leader-entry-snapshots');
    anakinEntries.players[0].leader.card = 'anakin-skywalker--protect-her-at-all-costs';
    anakinEntries.enteredThisPhase = ['alice-0', 'alice-1'];
    state = step(
      scenario(anakinEntries).state,
      i => i.kind === 'use-ability' && i.abilityId === 'leader-action',
    );
    record(
      'leader-entry-snapshots',
      'Anakin uses the retained unit-entry count and selects an exact surviving entrant',
      state,
      choose(state, 'target'),
    );

    const padmeChain = board('leader-dead-source-chain');
    padmeChain.players[0].leader = {
      card: 'padm--amidala--follow-my-lead',
      deployedAs: 'unit',
      damage: 5,
    };
    padmeChain.players[0].ground![0]!.exhausted = true;
    padmeChain.players[1].ground![0]!.card = ids.consular;
    padmeChain.enteredThisPhase = ['alice-0'];
    const pc = scenario(padmeChain);
    state = step(
      pc.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === pc.state.players.alice!.leader &&
        i.defender === pc.refs['bob-0'],
    );
    state = step(state, 'accept-effect');
    state = step(state, 'target');
    record(
      'leader-dead-source-chain',
      'Padme may chain an exhausted entrant into a unit attack after her own defeat',
      state,
      choose(state, 'attack'),
    );
  }
  {
    const peek = board('leader-private-top');
    peek.players[0].leader.card = 'grand-admiral-thrawn--patient-and-insightful';
    state = scenario(peek).state;
    while (state.round === 1)
      state = advance(
        state,
        choose(state, state.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []),
      ).state;
    state = step(state, 'accept-effect');
    record(
      'leader-private-enemy-top',
      'Thrawn acknowledges the opposing private top card without revealing it',
      state,
      choose(state, 'accept-effect'),
    );
    const t = scenario(peek);
    state = step(t.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    state = step(state, i => i.kind === 'choose-mode' && i.mode === 'enemy-deck');
    record(
      'leader-revealed-top-cost',
      'Thrawn selects an exact eligible unit after revealing the opposing top card',
      state,
      choose(state, 'target'),
    );

    const exchange = board('leader-resource-title');
    exchange.players[0].leader.card = 'hunter--outcast-sergeant';
    exchange.players[0].ground![0]!.card = 'sabine-wren--i-learned-the-hard-way';
    exchange.players[0].resources![0] = { card: 'sabine-wren--spectre-five', ref: 'exchange' };
    const h = scenario(exchange);
    state = step(h.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    record(
      'leader-resource-title',
      'Hunter privately selects a resource sharing a printed name across subtitles',
      state,
      choose(state, 'accept-effect', [h.refs.exchange!]),
    );

    const played = board('leader-private-deck-play');
    played.players[0].leader = { card: 'ahsoka-tano--i-have-an-idea', deployedAs: 'unit' };
    played.players[0].deck = [{ card: ids.marine, ref: 'inspected' }, { card: ids.marine }];
    played.players[0].resources!.forEach(c => (c.exhausted = true));
    played.players[0].credits = ['deck-payment'];
    const a = scenario(played);
    state = step(
      a.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === a.state.players.alice!.leader &&
        i.defender === a.state.players.bob!.base,
    );
    record(
      'leader-private-deck-choice',
      'Ahsoka retains the top-card inspection after her attack',
      state,
      choose(state, 'accept-effect', [a.refs.inspected!]),
    );
    state = advance(state, choose(state, 'accept-effect', [a.refs.inspected!])).state;
    state = step(state, i => i.kind === 'choose-mode' && i.mode === 'play');
    record(
      'leader-bounded-deck-play',
      'Only the inspected incarnation can be played from the unchanged deck',
      state,
      choose(state, 'play'),
    );
    state = step(state, 'play');
    record(
      'leader-bounded-deck-credit',
      'A Credit pays for the inspected deck card after the play choice resumes',
      state,
      choose(state, 'accept-effect', [a.refs['deck-payment']!]),
    );

    const archaeological = board('leader-distinct-random');
    archaeological.players[0].leader.card = 'doctor-aphra--rapacious-archaeologist';
    archaeological.players[0].discard = [
      { card: ids.marine, ref: 'first' },
      { card: ids.fighter, ref: 'second' },
      { card: ids.consular, ref: 'third' },
    ];
    const d = scenario(archaeological);
    state = step(d.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    state = advance(state, choose(state, 'accept-effect', [d.refs.first!])).state;
    state = advance(state, choose(state, 'accept-effect', [d.refs.second!])).state;
    record(
      'leader-distinct-third-title',
      'Aphra remembers the first two printed names when selecting the third',
      state,
      choose(state, 'accept-effect', [d.refs.third!]),
    );
    state = advance(state, choose(state, 'accept-effect', [d.refs.third!])).state;
    record(
      'leader-random-discard-return',
      'Server randomness selects one of three retained exact discard references',
      state,
      {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: state.execution.random!.id,
        values: [2],
      },
    );
  }
  {
    const mass = board('leader-half-hp');
    mass.players[0].leader.card = 'qi-ra--i-alone-survived';
    mass.players[0].ground![0] = { card: ids.consular, damage: 6, ref: 'protected' };
    mass.attachments = [
      { card: 'shield', unit: 'protected', ref: 'one' },
      { card: 'shield', unit: 'protected', ref: 'two' },
    ];
    const q = scenario(mass);
    state = step(q.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    record(
      'leader-half-hp-damage',
      'All units heal before simultaneous half-HP damage waits on an exact Shield',
      state,
      choose(state, i => i.kind === 'target' && i.card === q.refs.one),
    );
    const inherited = board('leader-inherited-keywords');
    inherited.players[0].leader = { card: 'moff-gideon--indomitable-warlord', deployedAs: 'unit' };
    inherited.players[0].discard = [
      { card: 'imperial-armored-commando' },
      { card: 'flanking-tie-interceptor' },
    ];
    state = scenario(inherited).state;
    record(
      'leader-inherited-keywords',
      'The recovered leader derives only listed printed Imperial discard keywords',
      state,
      choose(state, 'pass'),
    );
    const advantage = board('leader-opponent-advantages');
    advantage.players[0].leader.card = 'sabine-wren--bargaining-on-belief';
    advantage.players[1].ground!.push({
      card: 'moff-jerjerrod--we-shall-redouble-our-efforts',
      ref: 'doubler',
    });
    const s = scenario(advantage);
    state = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    record(
      'leader-opponent-unit-choice',
      'Sabine keeps the original ability controller while the opponent chooses the token recipient',
      state,
      choose(state, i => i.kind === 'target' && i.card === s.refs['bob-0']),
    );
    state = step(state, i => i.kind === 'target' && i.card === s.refs['bob-0']);
    record(
      'leader-opponent-token-replacement',
      'Only the instructed opposing token creator can replace Advantage creation',
      state,
      choose(state, i => i.kind === 'target' && i.card === s.refs.doubler),
    );
    const captive = board('leader-capture-play');
    captive.players[0].leader.card = 'dj--need-a-lift-';
    captive.players[0].hand = [{ card: 'snub-fighter-squadron', ref: 'played' }];
    captive.players[1].space = [{ card: ids.fighter, ref: 'enemy-space' }];
    const d = scenario(captive);
    state = step(d.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    state = step(state, i => i.kind === 'target' && i.card === d.refs['alice-0']);
    record(
      'leader-capture-before-played',
      'DJ retains the selected guard through discounted unit play',
      state,
      choose(state, 'play'),
    );
    state = step(state, 'play');
    const playedBatch = state.execution.frames[0]!;
    if (playedBatch.kind !== 'trigger-batch')
      throw new Error('Missing captured play trigger batch');
    const playedTrigger = playedBatch.triggers.find(t => t.abilityId === 'when-played')!;
    state = step(state, i => i.kind === 'trigger' && i.triggerId === playedTrigger.id);
    record(
      'leader-captured-play-trigger',
      'A captured unit still resolves its captured When Played ability',
      state,
      choose(state, 'target'),
    );
  }
  {
    const repeat = board('leader-attack-repeat');
    repeat.players[0].leader.card = 'enfys-nest--until-we-can-go-no-higher';
    repeat.players[0].ground![0]!.card = 'cloud-rider-veteran';
    repeat.players[0].credits = ['repeat-one', 'repeat-two'];
    repeat.players[0].resources!.forEach(c => (c.exhausted = true));
    const e = scenario(repeat);
    state = step(
      e.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === e.refs['alice-0'] &&
        i.defender === e.state.players.bob!.base,
    );
    state = step(state, i => i.kind === 'target' && i.card === e.state.players.bob!.base);
    record(
      'leader-attack-repeat-payment',
      'Enfys retains the used explicit On Attack ability before her optional compound payment',
      state,
      choose(state, 'accept-effect'),
    );
    state = step(state, 'accept-effect');
    record(
      'leader-attack-repeat-credits',
      'Credit payment resumes into the exact remembered On Attack ability',
      state,
      choose(state, 'accept-effect', [e.refs['repeat-one']!, e.refs['repeat-two']!]),
    );

    const borrowed = board('leader-borrowed-repeat');
    borrowed.players[0].leader = {
      card: 'enfys-nest--until-we-can-go-no-higher',
      deployedAs: 'unit',
    };
    borrowed.players[0].hand = [{ card: 'migs-mayfeld--how-about-a-toast-' }];
    borrowed.players[1].ground![0]!.card = ids.consular;
    const b = scenario(borrowed);
    state = step(b.state, 'play');
    state = step(
      state,
      i =>
        i.kind === 'attack' && i.attacker === b.refs['alice-0'] && i.defender === b.refs['bob-0'],
    );
    record(
      'leader-borrowed-attack-repeat',
      'Enfys repeats a borrowed ability using its captured origin and attacking holder',
      state,
      choose(state, 'accept-effect'),
    );

    const returned = board('leader-departed-attachment');
    returned.players[0].leader = { card: 'gar-saxon--viceroy-of-mandalore', deployedAs: 'unit' };
    returned.attachments = [
      { card: 'academy-training', unit: 'alice-0', owner: 'bob', ref: 'returned' },
    ];
    const r = scenario(returned);
    state = r.state;
    state.execution.decision = null;
    state.execution.frames.unshift(
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        effect: { kind: 'defeat-units', filter: { controller: 'friendly' } },
      },
      { kind: 'flush-triggers' },
    );
    settle(state);
    record(
      'leader-departed-attachment-owner',
      'A simultaneously defeated Gar returns an opponent-owned attached upgrade to its owner',
      state,
      choose(state, i => i.kind === 'target' && i.card === r.refs.returned),
    );

    const pilot = board('leader-departed-pilot');
    pilot.players[0].leader = { card: 'gar-saxon--viceroy-of-mandalore', deployedAs: 'unit' };
    pilot.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
    pilot.attachments = [
      { card: 'luke-skywalker--you-still-with-me-', unit: 'vehicle', ref: 'pilot' },
    ];
    const p = scenario(pilot);
    state = p.state;
    state.execution.decision = null;
    state.execution.frames.unshift(
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        effect: { kind: 'defeat-units', filter: { controller: 'friendly', arena: 'space' } },
      },
      { kind: 'flush-triggers' },
    );
    settle(state);
    record(
      'leader-departed-pilot-replacement',
      'Attachment snapshots survive a pending replacement that keeps the Pilot in play',
      state,
      choose(state, 'accept-effect'),
    );
    state = step(state, 'decline-effect');
    record(
      'leader-return-defeated-pilot',
      'A Pilot that actually leaves as an upgrade can be returned from discard',
      state,
      choose(state, i => i.kind === 'target' && i.card === p.refs.pilot),
    );
  }
  const delayed = board('delayed');
  delayed.initiative.holder = 'bob';
  delayed.delayed = [];
  for (const player of delayed.players) {
    player.discard = [{ card: 'sneak-attack', ref: `${player.id}-source` }];
    for (const n of [0, 1])
      delayed.delayed.push({ source: `${player.id}-source`, unit: `${player.id}-${n}` });
  }
  const e = scenario(delayed);
  state = step(step(e.state, 'pass'), 'pass');
  const playerOrder = choose(state, i => i.kind === 'delayed-player' && i.playerId === 'alice');
  record(
    'delayed-player',
    'Initiative holder selects whose regroup effects resolve first',
    state,
    playerOrder,
  );
  state = advance(state, playerOrder).state;
  record(
    'delayed-order',
    'Controller orders exact-copy defeats before either player draws',
    state,
    choose(state, 'delayed'),
  );

  {
    const p = board('leader-collective-ambition');
    p.players[0].leader = { card: 'maul--collective-ambition' };
    p.players[0].ground = [
      { card: 'clone-pilot', damage: 1, ref: 'pilot' },
      { card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'moff' },
    ];
    p.attachments = [
      { card: 'shield', unit: 'pilot', ref: 'shield-a' },
      { card: 'shield', unit: 'pilot', ref: 'shield-b' },
    ];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    record(
      'leader-collective-target',
      'Choose a unit before comparing keywords and Experience',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.pilot),
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs.pilot);
    record(
      'leader-collective-token-replacement',
      'Double Experience while simultaneous damage remains pending',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.moff),
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs.moff);
    record(
      'leader-collective-shield-replacement',
      'Choose Shield before doubled Experience and damage commit',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs['shield-b']),
    );
  }

  {
    const p = board('leader-plot-discount');
    p.players[0].leader = { card: 'chancellor-palpatine--how-liberty-dies' };
    p.players[0].deck![0] = { card: 'unveiled-might', ref: 'found' };
    p.players[0].resources![0] = { card: 'unveiled-might', ref: 'plot' };
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    const searched = choose(s, 'search', [g.refs.found!]);
    record('leader-plot-search', 'Private top-five search restricted to active Plot', s, searched);
    s = advance(s, searched).state;
    record(
      'leader-plot-search-randomness',
      'Randomize unchosen cards and reveal the exact Plot draw',
      s,
      {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random!.id,
        values: s.execution.random!.bounds.map(() => 0),
      },
    );
    s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    s = advance(s, choose(s, 'accept-effect', [g.refs.plot!])).state;
    const batch = s.execution.frames[0]!;
    if (batch.kind !== 'trigger-batch') throw new Error('Expected deployment and Plot');
    s = step(
      s,
      i =>
        i.kind === 'trigger' &&
        i.triggerId === batch.triggers.find(t => t.abilityId === 'deployed')!.id,
    );
    record(
      'leader-plot-discount-play',
      'Pay the discounted Plot cost on a selected host',
      s,
      choose(s, i => i.kind === 'play' && i.target === g.refs['alice-0']),
    );
    const paid = structuredClone(s);
    for (const id of paid.players.alice!.resources) paid.cards[id]!.exhausted = true;
    createCredits(paid, 'alice', 1);
    paid.execution.decision = null;
    settle(paid);
    s = step(paid, i => i.kind === 'play' && i.target === g.refs['alice-0']);
    record(
      'leader-plot-discount-credit',
      'Use one Credit for the discounted Plot play',
      s,
      choose(s, 'accept-effect', s.players.alice!.tokens),
    );
  }

  {
    const p = board('leader-smuggle');
    p.players[0].leader = { card: 'hondo-ohnaka--that-s-good-business' };
    p.players[0].resources![0] = { card: 'collections-starhopper', ref: 'smuggled' };
    p.players[0].ground = [{ card: 'tech--source-of-insight', ref: 'tech' }];
    const g = scenario(p);
    const native = choose(
      g.state,
      i => i.kind === 'play' && i.card === g.refs.smuggled && i.smuggle === 'smuggle',
    );
    record('leader-smuggle-native', 'Pay the printed alternate resource cost', g.state, native);
    record(
      'leader-smuggle-granted',
      'Choose Tech’s independent Smuggle cost',
      g.state,
      choose(
        g.state,
        i =>
          i.kind === 'play' && i.card === g.refs.smuggled && !!i.smuggle && i.smuggle !== 'smuggle',
      ),
    );
    let s = advance(g.state, native).state;
    record(
      'leader-smuggle-hondo-exhaust',
      'Pay Hondo’s optional exhaustion after a Smuggle play',
      s,
      choose(s, 'accept-effect'),
    );
    s = step(s, 'accept-effect');
    record(
      'leader-smuggle-hondo-experience',
      'Choose the exact Experience recipient',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.smuggled),
    );
    const creditState = structuredClone(g.state);
    createCredits(creditState, 'alice', 3);
    s = step(
      creditState,
      i => i.kind === 'play' && i.card === g.refs.smuggled && i.smuggle === 'smuggle',
    );
    record(
      'leader-smuggle-credits',
      'Spend Credits for the selected Smuggle cost',
      s,
      choose(s, 'accept-effect', s.players.alice!.tokens),
    );
  }
  {
    const p = board('leader-smuggle-lando');
    p.players[0].leader = { card: 'lando-calrissian--with-impeccable-taste' };
    p.players[0].resources![0] = { card: 'privateer-crew', ref: 'crew' };
    p.players[0].deck![0] = { card: 'battlefield-marine', ref: 'replacement' };
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    s = step(s, i => i.kind === 'play' && i.card === g.refs.crew && !!i.smuggle);
    record(
      'leader-smuggle-lando-resource',
      'Defeat Lando’s replacement resource before When Played',
      s,
      choose(s, 'accept-effect', [g.refs.replacement!]),
    );
  }
  {
    const p = board('smuggle-blaster');
    p.players[0].resources![0] = { card: 'hotshot-dl-44-blaster', ref: 'blaster' };
    const g = scenario(p);
    const s = step(
      g.state,
      i =>
        i.kind === 'play' &&
        i.card === g.refs.blaster &&
        i.target === g.refs['alice-0'] &&
        !!i.smuggle,
    );
    record(
      'smuggle-blaster-attack',
      'Attack with the exact attached friendly unit',
      s,
      choose(s, 'attack'),
    );
  }

  const history = board('history');
  for (const player of history.players)
    player.deck = Array.from({ length: 100 }, () => ({ card: ids.marine }));
  state = scenario(history).state;
  for (let n = 0; state.round < 40 && !state.result && n < 200; n++) {
    state = advance(
      state,
      choose(state, state.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []),
    ).state;
  }
  if (state.round !== 40 || state.result)
    throw new Error('History fixture failed to reach round 40');
  record(
    'long-history',
    'Round 40 after real passing/regroup inputs, with large hands and full logs',
    state,
    choose(state, 'pass'),
  );
  {
    const p = position('continuation-morgan-shared-keyword');
    p.players[0].leader = { card: 'morgan-elsbeth--following-the-call' };
    p.players[0].ground = [{ card: 'tech--source-of-insight', ref: 'witness' }];
    p.players[0].hand = [{ card: 'collections-starhopper', ref: 'play' }];
    p.players[0].resources = [{ card: ids.marine }];
    const g = scenario(p);
    let s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.witness &&
        i.defender === g.state.players.bob!.base,
    );
    s = step(s, 'pass');
    s = step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    record(
      'leader-shared-keyword-witness',
      'Select the exact friendly unit that attacked this phase',
      s,
      choose(s, 'target'),
    );
    s = step(s, 'target');
    record(
      'leader-shared-keyword-play',
      'Declare a matching discounted hand unit',
      s,
      choose(s, 'play'),
    );
    s = structuredClone(s);
    createCredits(s, 'alice', 1);
    s.execution.decision = null;
    settle(s);
    s = step(s, 'play');
    record(
      'leader-shared-keyword-credits',
      'Resume Credit payment for the same shared-keyword play',
      s,
      choose(s, 'accept-effect', [s.execution.decision!.selection!.cards[0]!]),
    );
  }
  {
    const p = board('bounty-repeat');
    p.players[0].leader = { card: 'bossk--hunting-his-prey', deployedAs: 'unit' };
    p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
    const g = scenario(p);
    let s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.state.players.alice!.leader &&
        i.defender === g.refs.prey,
    );
    record(
      'bounty-native',
      'Optional reward belongs to the defeated unit controller’s opponent',
      s,
      choose(s, 'accept-effect'),
    );
    s = step(s, 'accept-effect');
    record(
      'bounty-target',
      'Bounty source and target chooser retain separate controllers',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs['alice-0']),
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs['alice-0']);
    record(
      'bossk-repeat-bounty',
      'Optional once-per-round repeat references the collected reward',
      s,
      choose(s, 'accept-effect'),
    );
    s = step(s, 'accept-effect');
    record(
      'bossk-repeat-bounty-target',
      'A repeated reward makes its own exact target choice',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs['alice-1']),
    );
  }
  {
    const p = board('bounty-capture');
    p.players[0].leader = { card: 'jabba-the-hutt--his-high-exaltedness' };
    p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    record(
      'jabba-capture-guard',
      'Choose another friendly unit as the guard',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs['alice-0']),
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs['alice-0']);
    record(
      'jabba-capture-unit',
      'Choose an enemy non-leader to capture',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.prey),
    );
    s = step(s, i => i.kind === 'target' && i.card === g.refs.prey);
    record(
      'bounty-captured',
      'Capture preserves the optional Bounty before resolving its reward',
      s,
      choose(s, 'accept-effect'),
    );
  }
  {
    const p = board('bounty-discount');
    p.players[0].leader = { card: 'jabba-the-hutt--his-high-exaltedness' };
    p.players[0].hand = [{ card: ids.marine, ref: 'play' }];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
    s = step(s, i => i.kind === 'target' && i.card === g.refs['bob-0']);
    s = step(s, 'pass');
    s = step(
      s,
      i =>
        i.kind === 'attack' && i.attacker === g.refs['alice-0'] && i.defender === g.refs['bob-0'],
    );
    record(
      'jabba-collect-discount',
      'Collect a granted reward after combat defeats its recipient',
      s,
      choose(s, 'accept-effect'),
    );
    s = step(s, 'accept-effect');
    s = step(s, 'pass');
    record(
      'jabba-bounty-next-play',
      'A lasting discount preserves the Bounty collector and enemy source',
      s,
      choose(s, i => i.kind === 'play' && i.card === g.refs.play),
    );
  }
  {
    const p = position('continuation-grav-charge');
    p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
    p.attachments = [
      { card: 'grav-charge', unit: 'host', owner: 'bob' },
      { card: 'shield', unit: 'host', ref: 'first' },
      { card: 'shield', unit: 'host', ref: 'second' },
    ];
    const g = scenario(p);
    const s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.host &&
        i.defender === g.state.players.bob!.base,
    );
    record(
      'grav-charge-shield',
      'Attacker identity survives combat completion and the direct upgrade damage replacement',
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.first),
    );
  }
  const matchSetup = createGame({
    ...config('continuation-match-initiative'),
    initiativeChooser: 'bob',
  });
  record(
    'match-initiative',
    'The previous loser chooses initiative before shuffling and mulligans',
    matchSetup,
    choose(matchSetup, i => i.kind === 'initiative' && i.playerId === 'alice'),
  );

  return [
    ...cases,
    ...exploitContinuations(),
    ...ashContinuations(),
    ...lawContinuations(),
    ...secContinuations(),
    ...lofContinuations(),
    ...jtlContinuations(),
    ...ibhContinuations(),
  ];
}
