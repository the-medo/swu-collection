import { modifyUnit } from '../engine/lasting.ts';
import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const sarlacc = 'the-sarlacc-of-carkoon--horror-of-the-dune-sea';
const kylo = 'kylo-ren--rash-and-deadly';
const moff = 'moff-jerjerrod--we-shall-redouble-our-efforts';
const darksaber = 'the-darksaber--icon-of-leadership';
const resources = (n = 8) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const useBase = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.base);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function views(s: GameState) {
  return [
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'k'.repeat(32)).project(s),
    new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s),
  ];
}
function twoLeaders(base: string) {
  const p = position();
  p.players[0].base.card = base;
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].ground = [{ card: moff, ref: 'second' }];
  p.attachments = [{ card: darksaber, unit: 'second' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  return p;
}
for (const deployed of [false, true])
  test(`Dooku's Palace discounts only deployed friendly leader units (${deployed})`, () => {
    const p = position();
    p.players[0].base.card = 'dooku-s-palace';
    p.players[0].leader.deployedAs = deployed ? 'unit' : null;
    p.players[1].leader.deployedAs = 'unit';
    p.players[0].ground = [{ card: ids.marine }];
    p.players[0].resources = resources(2);
    p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
    const g = scenario(p),
      choice = useBase(g.state);
    resume(choice, choose(choice, 'play'));
    const done = step(choice, 'play');
    expect(ready(done)).toBe(deployed ? 1 : 0);
    expect(done.cards[g.refs.played!]!.exhausted).toBe(true);
    expect(done.cards[done.players.alice!.base]!.abilityUses.epic).toBe(1);
  });
test('Dooku counts a Pilot leader host and evaluates the same discount during Credit payment', () => {
  const p = position();
  p.players[0].base.card = 'dooku-s-palace';
  p.players[0].leader = {
    card: 'luke-skywalker--hero-of-yavin',
    deployedAs: 'upgrade',
    attachedTo: 'host',
  };
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].credits = ['credit'];
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  const g = scenario(p),
    payment = step(useBase(g.state), 'play');
  expect(payment.execution.frames[0]!.kind).toBe('credit-payment');
  resume(payment, choose(payment, 'accept-effect', [g.refs.credit!]));
  const done = step(payment, 'accept-effect', [g.refs.credit!]);
  expect(done.cards[g.refs.played!]!.zone).toBe('ground');
  expect(done.cards[g.refs.credit!]!.zone).toBe('set-aside');
});
test('Dooku can spend the Epic without an affordable unit and never offers an event', () => {
  const p = position();
  p.players[0].base.card = 'dooku-s-palace';
  p.players[0].hand = [{ card: ids.marine }, { card: 'open-fire' }];
  const done = useBase(scenario(p).state);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.players.alice!.hand).toHaveLength(2);
  expect(done.cards[done.players.alice!.base]!.abilityUses.epic).toBe(1);
});
test('Executioner allocates whole pairs, merges repeated targets into one damage instance and projects the constraint', () => {
  const p = twoLeaders('executioner-s-arena');
  p.attachments!.push({ card: 'shield', unit: 'one', ref: 'shield' });
  const g = scenario(p),
    choice = useBase(g.state);
  expect(choice.execution.decision!.selection!.max).toBe(4);
  expect(choice.execution.decision!.selection!.allocation!.quantum).toBe(2);
  const view = new Projector(choice.gameId, { role: 'player', playerId: 'alice' }).project(choice);
  expect(gameViewSchema.parse(view)).toEqual(view);
  expect(view.decision!.selection!.allocation!.quantum).toBe(2);
  for (const invalid of [[g.refs.one!], [g.refs.one!, g.refs.two!], Array(6).fill(g.refs.one!)])
    expect(() => step(choice, 'accept-effect', invalid)).toThrow();
  resume(choice, choose(choice, 'accept-effect', Array(4).fill(g.refs.one!)));
  const done = step(choice, 'accept-effect', Array(4).fill(g.refs.one!));
  expect(done.cards[g.refs.one!]!.damage).toBe(0);
  expect(done.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(done.cards[g.refs.two!]!.damage).toBe(0);
});
test('Executioner can distribute two simultaneous pairs, choose one pair or choose none', () => {
  const g = scenario(twoLeaders('executioner-s-arena')),
    choice = useBase(g.state);
  for (const selected of [
    [],
    [g.refs.one!, g.refs.one!],
    [g.refs.one!, g.refs.one!, g.refs.two!, g.refs.two!],
  ]) {
    const done = step(choice, 'accept-effect', selected);
    expect(done.cards[g.refs.one!]!.damage).toBe(selected.length ? 2 : 0);
    expect(done.cards[g.refs.two!]!.damage).toBe(selected.length === 4 ? 2 : 0);
  }
});
test('Executioner captures the leader count before simultaneously defeating a selected leader and another unit', () => {
  const p = twoLeaders('executioner-s-arena');
  p.players[0].leader.damage = 3;
  p.players[1].ground![0]!.damage = 5;
  const g = scenario(p),
    choice = useBase(g.state),
    leader = choice.players.alice!.leader;
  const done = step(choice, 'accept-effect', [leader, leader, g.refs.one!, g.refs.one!]);
  expect(done.cards[leader]!.zone).toBe('base');
  expect(done.cards[g.refs.one!]!.zone).toBe('discard');
});
test('Executioner offers no damage when no friendly leader unit exists', () => {
  const p = position();
  p.players[0].base.card = 'executioner-s-arena';
  p.players[1].leader.deployedAs = 'unit';
  const choice = useBase(scenario(p).state);
  expect(choice.execution.decision!.selection!.max).toBe(0);
  const done = step(choice, 'accept-effect', []);
  expect(done.cards[done.players.alice!.base]!.abilityUses.epic).toBe(1);
});
test('First Battle Memorial gives one Experience for each runtime leader and allows the same enemy recipient', () => {
  const g = scenario(twoLeaders('first-battle-memorial')),
    choice = useBase(g.state);
  expect(choice.execution.decision!.selection!.min).toBe(2);
  expect(() => step(choice, 'accept-effect', [g.refs.one!])).toThrow();
  resume(choice, choose(choice, 'accept-effect', [g.refs.one!, g.refs.one!]));
  const replacement = step(choice, 'accept-effect', [g.refs.one!, g.refs.one!]);
  const done = step(replacement, 'decline-effect');
  expect(attachedUpgrades(done, done.cards[g.refs.one!]!).map(c => c.cardId)).toEqual([
    'experience',
    'experience',
  ]);
  expect(attachedUpgrades(done, done.cards[g.refs.two!]!)).toHaveLength(0);
});
test('First Battle Memorial preserves simultaneous recipients through Moff replacement even though it removes a counted leader', () => {
  const g = scenario(twoLeaders('first-battle-memorial'));
  const replacement = step(useBase(g.state), 'accept-effect', [g.refs.one!, g.refs.two!]);
  resume(
    replacement,
    choose(replacement, i => i.kind === 'target' && i.card === g.refs.second),
  );
  const done = target(replacement, g.refs.second!);
  expect(done.cards[g.refs.second!]!.zone).toBe('discard');
  for (const id of [g.refs.one!, g.refs.two!])
    expect(
      attachedUpgrades(done, done.cards[id]!).filter(c => c.cardId === 'experience'),
    ).toHaveLength(2);
});
function pit() {
  const p = position();
  p.players[0].base.card = 'great-pit-of-carkoon';
  p.players[0].hand = [
    { card: ids.marine, ref: 'cost' },
    { card: 'open-fire', ref: 'event' },
  ];
  p.players[0].deck = [
    { card: ids.marine, ref: 'other' },
    { card: sarlacc, ref: 'one' },
    { card: sarlacc, ref: 'two' },
    { card: ids.consular, ref: 'unseen' },
  ];
  return p;
}
test('Great Pit pays a unit discard before a private title search, reveals one exact Sarlacc and shuffles the remainder', () => {
  const g = scenario(pit()),
    payment = useBase(g.state);
  expect(payment.execution.decision!.selection!.cards).toEqual([g.refs.cost!]);
  expect(() => step(payment, 'accept-effect', [g.refs.event!])).toThrow();
  const search = step(payment, 'accept-effect', [g.refs.cost!]);
  expect(search.cards[g.refs.cost!]!.zone).toBe('discard');
  expect(search.execution.decision!.selection!.cards).toEqual([g.refs.one!, g.refs.two!]);
  expect(views(search).every(v => v.decision === null)).toBe(true);
  resume(search, choose(search, 'search', [g.refs.two!]));
  const shuffle = step(search, 'search', [g.refs.two!]);
  expect(shuffle.execution.random!.bounds).toEqual([3, 2]);
  const random: EngineInput = {
    type: 'random',
    gameId: shuffle.gameId,
    expectedRevision: shuffle.revision,
    requestId: shuffle.execution.random!.id,
    values: [0, 0],
  };
  resume(shuffle, random);
  const done = advance(shuffle, random).state;
  expect(done.players.alice!.hand).toEqual([g.refs.event!, g.refs.two!]);
  expect(done.players.alice!.deck).toEqual([g.refs.one!, g.refs.unseen!, g.refs.other!]);
  expect(
    done.facts.some(f => f.type === 'revealed' && f.cards.some(c => c.instanceId === g.refs.two)),
  ).toBe(true);
});
test('Great Pit may fail to find a matching card while retaining its paid cost and spent Epic', () => {
  const g = scenario(pit()),
    search = step(useBase(g.state), 'accept-effect', [g.refs.cost!]);
  const shuffle = step(search, 'search', []);
  expect(shuffle.execution.random!.bounds).toEqual([4, 3, 2]);
  expect(shuffle.cards[g.refs.cost!]!.zone).toBe('discard');
  expect(shuffle.cards[shuffle.players.alice!.base]!.abilityUses.epic).toBe(1);
});
test('Great Pit cannot activate without a unit to discard', () => {
  const p = pit();
  p.players[0].hand = [{ card: 'open-fire' }];
  const s = scenario(p).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.players.alice!.base,
    ),
  ).toBe(false);
});
test('Great Pit search does not expose unmatched secret cards through other views', () => {
  const projected = [ids.consular, ids.trooper].map(secret => {
    const p = pit();
    p.players[0].deck![3]!.card = secret;
    const g = scenario(p);
    return views(step(useBase(g.state), 'accept-effect', [g.refs.cost!]));
  });
  expect(projected[0]).toEqual(projected[1]);
});
test('Sarlacc returns an exact own discard unit and uses its printed power for enemy ground damage before combat', () => {
  const p = position();
  p.players[0].ground = [{ card: sarlacc, ref: 'sarlacc' }];
  p.players[0].discard = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'open-fire', ref: 'event' },
  ];
  p.players[1].discard = [{ card: ids.marine, ref: 'enemy-discard' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    choice = step(g.state, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base);
  expect(choice.execution.decision!.selection!.cards).toEqual([g.refs.one!, g.refs.two!]);
  const damage = step(choice, 'accept-effect', [g.refs.two!]);
  expect(damage.players.alice!.deck.at(-1)).toBe(g.refs.two!);
  expect(damage.cards[g.refs.one!]!.zone).toBe('discard');
  expect(damage.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.victim! },
  ]);
  resume(damage, choose(damage, 'target'));
  const done = step(damage, 'target');
  expect(done.cards[g.refs.victim!]!.damage).toBe(3);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(8);
});
test('Sarlacc with no discarded unit deals only its combat damage', () => {
  const p = position();
  p.players[0].ground = [{ card: sarlacc }];
  p.players[0].discard = [{ card: 'open-fire' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base);
  if (s.execution.decision!.kind === 'effect') s = step(s, 'accept-effect', []);
  expect(s.cards[g.refs.victim!]!.damage).toBe(0);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
});
test('Kylo front pays exact discard and exhaust costs, grants phase power, and has no unit-side action', () => {
  const p = position();
  p.players[0].leader.card = kylo;
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    payment = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  resume(payment, choose(payment, 'accept-effect', [g.refs.two!]));
  const done = target(step(payment, 'accept-effect', [g.refs.two!]), g.refs.enemy!);
  expect(done.players.alice!.hand).toEqual([g.refs.one!]);
  expect(done.cards[g.refs.two!]!.zone).toBe('discard');
  expect(done.cards[done.players.alice!.leader]!.exhausted).toBe(true);
  expect(unitStats(done, done.cards[g.refs.enemy!]!).power).toBe(5);
  p.players[0].leader.deployedAs = 'unit';
  const unit = scenario(p).state;
  expect(
    unit.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === unit.players.alice!.leader,
    ),
  ).toBe(false);
});
for (const hand of [0, 1, 5, 7])
  test(`Kylo unit continuously loses one power per hand card (${hand})`, () => {
    const p = position();
    p.players[0].leader = { card: kylo, deployedAs: 'unit' };
    p.players[0].hand = resources(hand);
    const s = scenario(p).state;
    expect(unitStats(s, s.cards[s.players.alice!.leader]!).power).toBe(Math.max(0, 5 - hand));
  });

test('Kylo power updates when a hand card is played and his constant is suppressed by ability loss', () => {
  const p = position();
  p.players[0].leader = { card: kylo, deployedAs: 'unit' };
  p.players[0].hand = resources(2);
  p.players[0].resources = resources();
  const g = scenario(p),
    leader = g.state.players.alice!.leader;
  const done = step(g.state, 'play');
  expect(unitStats(done, done.cards[leader]!).power).toBe(4);
  modifyUnit(done, done.cards[leader]!, done.cards[leader]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(unitStats(done, done.cards[leader]!).power).toBe(5);
});
test('Dooku counts a unit made into a leader by The Darksaber and applies both reductions', () => {
  const p = twoLeaders('dooku-s-palace');
  p.players[0].hand = [{ card: ids.marine }];
  const g = scenario(p);
  const done = step(useBase(g.state), 'play');
  expect(done.players.alice!.hand).toHaveLength(0);
  expect(ready(done)).toBe(0);
});
