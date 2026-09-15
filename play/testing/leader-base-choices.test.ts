import { resourceCard } from '../engine/state.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { canPayAbilityCosts } from '../engine/abilities.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

const resources = (n = 8) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const useBase = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.base);
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
function views(s: GameState) {
  return [
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'k'.repeat(32)).project(s),
    new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s),
  ];
}
function resume(s: GameState, i: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input: i })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, i));
}

test('Mystic Monastery has one public action usable three times per game, including when already holding the Force', () => {
  const p = position();
  p.players[0].base.card = 'mystic-monastery';
  let s = scenario(p).state;
  const publicView = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(gameViewSchema.parse(publicView)).toEqual(publicView);
  expect(
    publicView.decision!.options.find(o => o.action?.id === 'gain-force')!.action!.limit,
  ).toEqual({ per: 'game', max: 3 });
  for (let n = 1; n <= 3; n++) {
    resume(
      s,
      choose(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.base),
    );
    s = useBase(s);
    expect(forceToken(s, 'alice')).toBeDefined();
    expect(s.players.alice!.tokens).toHaveLength(1);
    expect(s.cards[s.players.alice!.base]!.abilityUses['gain-force']).toBe(n);
    s = step(s, 'pass');
  }
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.players.alice!.base,
    ),
  ).toBe(false);
});

test('Tomb of Eilram selects and exhausts exactly one ready friendly unit before gaining the Force', () => {
  const p = position();
  p.players[0].base.card = 'tomb-of-eilram';
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
    { card: ids.marine, ref: 'tired', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    choice = useBase(s.state);
  expect(choice.execution.frames[0]!.kind).toBe('ability-payment');
  expect(choice.execution.decision!.selection!.cards).toEqual([
    s.state.players.alice!.leader,
    s.refs.one!,
    s.refs.two!,
  ]);
  expect(forceToken(choice, 'alice')).toBeUndefined();
  resume(choice, choose(choice, 'accept-effect', [s.refs.two!]));
  const before = encodeState(choice);
  expect(() => step(choice, 'accept-effect', [s.refs.enemy!])).toThrow();
  expect(encodeState(choice)).toBe(before);
  const done = step(choice, 'accept-effect', [s.refs.two!]);
  expect(done.cards[s.refs.two!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.one!]!.exhausted).toBe(false);
  expect(forceToken(done, 'alice')).toBeDefined();
});

test('Tomb cannot activate without a ready friendly unit, but its cost may exhaust a unit while Force already exists', () => {
  const p = position();
  p.players[0].base.card = 'tomb-of-eilram';
  p.players[0].force = true;
  p.players[0].ground = [{ card: ids.marine, exhausted: true }];
  let s = scenario(p);
  expect(
    s.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.state.players.alice!.base,
    ),
  ).toBe(false);
  p.players[0].ground = [{ card: ids.marine, ref: 'ready' }];
  s = scenario(p);
  const done = step(useBase(s.state), 'accept-effect', [s.refs.ready!]);
  expect(done.players.alice!.tokens).toHaveLength(1);
  expect(done.cards[s.refs.ready!]!.exhausted).toBe(true);
});

for (const deployed of [false, true]) {
  test(`Fennec ${deployed ? 'unit' : 'front'} pays exhaustion and resources atomically, then plays an exhausted hand unit ready`, () => {
    const p = position();
    p.players[0].leader = {
      card: 'fennec-shand--ready-for-war',
      deployedAs: deployed ? 'unit' : null,
    };
    p.players[0].resources = resources();
    p.players[0].ground = [{ card: ids.consular, ref: 'cost' }];
    p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
    const s = scenario(p),
      payment = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'ready-unit');
    expect(ready(payment)).toBe(8);
    expect(payment.cards[s.state.players.alice!.leader]!.exhausted).toBe(false);
    const cost = deployed ? s.state.players.alice!.leader : s.refs.cost!;
    resume(payment, choose(payment, 'accept-effect', [cost]));
    const play = step(payment, 'accept-effect', [cost]);
    expect(ready(play)).toBe(7);
    expect(play.cards[cost]!.exhausted).toBe(true);
    expect(play.cards[s.state.players.alice!.leader]!.exhausted).toBe(true);
    const done = step(play, 'play');
    expect(ready(done)).toBe(3);
    expect(done.cards[s.refs.played!]!.exhausted).toBe(false);
    expect(done.cards[s.refs.played!]!.zone).toBe('ground');
  });
}

test('Fennec retains the chosen unit through Credit payment and spends no other resources for the ability', () => {
  const p = position();
  p.players[0].leader.card = 'fennec-shand--ready-for-war';
  p.players[0].credits = ['credit'];
  p.players[0].resources = resources(4);
  p.players[0].ground = [{ card: ids.consular, ref: 'cost' }];
  p.players[0].hand = [{ card: ids.marine }];
  const s = scenario(p);
  const chosen = step(
    step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'ready-unit'),
    'accept-effect',
    [s.refs.cost!],
  );
  expect(chosen.execution.frames[0]!.kind).toBe('credit-payment');
  resume(chosen, choose(chosen, 'accept-effect', [s.refs.credit!]));
  const play = step(chosen, 'accept-effect', [s.refs.credit!]);
  expect(ready(play)).toBe(4);
  expect(play.cards[s.refs.cost!]!.exhausted).toBe(true);
  expect(play.cards[s.refs.credit!]!.zone).toBe('set-aside');
  expect(step(play, 'play').players.alice!.hand).toHaveLength(0);
});

test('one physical unit cannot pay both exhaust-self and exhaust-friendly-unit in a compound cost', () => {
  const p = position();
  p.players[0].leader.deployedAs = 'unit';
  const s = scenario(p),
    source = s.state.cards[s.state.players.alice!.leader]!;
  expect(
    canPayAbilityCosts(s.state, source, {
      id: 'compound',
      costs: [{ kind: 'exhaust-self' }, { kind: 'exhaust-friendly-unit' }],
      limit: null,
      effects: [],
    }),
  ).toBe(false);
});

for (const power of [2, 3]) {
  test(`Temple of Destruction ${power === 3 ? 'grants' : 'does not grant'} the Force for ${power} combat base damage`, () => {
    const p = position();
    p.players[0].base.card = 'temple-of-destruction';
    p.players[0].ground = [{ card: power === 3 ? ids.marine : 'mandalorian', ref: 'attacker' }];
    const s = scenario(p),
      done = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
    expect(!!forceToken(done, 'alice')).toBe(power === 3);
  });
}

test('Temple triggers for Overwhelm combat damage but not ability damage or enemy combat damage', () => {
  const p = position();
  p.players[0].base.card = 'temple-of-destruction';
  p.players[0].leader = { card: 'maul--a-rival-in-darkness', deployedAs: 'unit' };
  p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
  const s = scenario(p),
    done = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.defender);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
  expect(forceToken(done, 'alice')).toBeDefined();
  p.players[0].leader = { card: ids.leader };
  p.players[0].base.damage = 0;
  const plain = scenario(p),
    noncombat = step(plain.state, i => i.kind === 'use-ability');
  expect(forceToken(noncombat, 'alice')).toBeUndefined();
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: ids.marine }];
  const enemy = scenario(p),
    damage = step(
      enemy.state,
      i => i.kind === 'attack' && i.defender === enemy.state.players.alice!.base,
    );
  expect(forceToken(damage, 'alice')).toBeUndefined();
});

test('Citadel charges one resource, returns the chosen resource privately and resources the top deck card exhausted', () => {
  const results: GameState[] = [];
  for (const secret of [ids.consular, ids.trooper]) {
    const p = position();
    p.players[0].base.card = 'citadel-research-center';
    p.players[0].resources = [
      { card: secret, ref: 'chosen' },
      { card: ids.marine, ref: 'other' },
    ];
    p.players[0].deck![0] = { card: 'open-fire', ref: 'replacement' };
    const s = scenario(p),
      choice = useBase(s.state);
    expect(ready(choice)).toBe(1);
    expect(views(choice).every(v => v.decision === null)).toBe(true);
    resume(choice, choose(choice, 'accept-effect', [s.refs.chosen!]));
    const done = step(choice, 'accept-effect', [s.refs.chosen!]);
    expect(done.players.alice!.hand).toEqual([s.refs.chosen!]);
    expect(done.players.alice!.resources).toEqual([s.refs.other!, s.refs.replacement!]);
    expect(done.cards[s.refs.replacement!]!.exhausted).toBe(true);
    expect(ready(done)).toBe(1);
    results.push(done);
  }
  expect(views(results[0]!)).toEqual(views(results[1]!));
});

test('Citadel can return an opponent-owned friendly resource to that owner, without resourcing into the wrong player', () => {
  const p = position();
  p.players[0].base.card = 'citadel-research-center';
  p.players[0].resources = resources(1);
  p.players[1].ground = [{ card: ids.consular, controller: 'alice', ref: 'borrowed' }];
  const s = scenario(p);
  resourceCard(s.state, s.state.cards[s.refs.borrowed!]!, 'alice', false);
  s.state.execution.decision = null;
  settle(s.state);
  const done = step(useBase(s.state), 'accept-effect', [s.refs.borrowed!]);
  expect(done.players.bob!.hand).toEqual([s.refs.borrowed!]);
  expect(done.players.alice!.resources).toHaveLength(2);
  expect(done.players.bob!.resources).toHaveLength(0);
});

test('Shipbreaking Yard can choose only an exact card just milled and keeps the other discarded cards', () => {
  const p = position();
  p.players[0].base.card = 'shipbreaking-yard';
  p.players[0].discard = [{ card: ids.marine, ref: 'old' }];
  p.players[0].deck = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'open-fire', ref: 'three' },
    { card: ids.consular, ref: 'unseen' },
  ];
  const s = scenario(p),
    choice = useBase(s.state);
  expect(choice.execution.decision!.selection!.cards).toEqual([
    s.refs.one!,
    s.refs.two!,
    s.refs.three!,
  ]);
  expect(() => step(choice, 'accept-effect', [s.refs.old!])).toThrow();
  resume(choice, choose(choice, 'accept-effect', [s.refs.two!]));
  const done = step(choice, 'accept-effect', [s.refs.two!]);
  expect(done.players.alice!.deck).toEqual([s.refs.two!, s.refs.unseen!]);
  expect(done.players.alice!.discard).toEqual([s.refs.old!, s.refs.one!, s.refs.three!]);
  expect(step(choice, 'accept-effect', []).players.alice!.deck).toEqual([s.refs.unseen!]);
});

test('Shipbreaking Yard resolves with fewer than three cards, without draw fatigue on an empty deck', () => {
  for (const count of [0, 1, 2]) {
    const p = position();
    p.players[0].base.card = 'shipbreaking-yard';
    p.players[0].deck = resources(count);
    let s = useBase(scenario(p).state);
    if (count) s = step(s, 'accept-effect', []);
    expect(s.players.alice!.discard).toHaveLength(count);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
  }
});

test('Temple does not mistake three indirect damage from a friendly unit for combat damage', () => {
  const p = position();
  p.players[0].base.card = 'temple-of-destruction';
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: 'guerilla-soldier' }];
  const s = scenario(p);
  const allocate = step(
    step(s.state, 'play'),
    i => i.kind === 'choose-player' && i.playerId === 'bob',
  );
  const done = step(allocate, 'accept-effect', Array(3).fill(s.state.players.bob!.base));
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(forceToken(done, 'alice')).toBeUndefined();
});

test('Mystic Monastery does not replenish its three uses at a new round', () => {
  const p = position();
  p.players[0].base.card = 'mystic-monastery';
  let s = scenario(p).state;
  for (let n = 0; n < 3; n++) s = step(useBase(s), 'pass');
  for (let n = 0; n < 10 && s.round === 1; n++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []);
  expect(s.round).toBe(2);
  expect(s.cards[s.players.alice!.base]!.abilityUses['gain-force']).toBe(3);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.players.alice!.base,
    ),
  ).toBe(false);
});
