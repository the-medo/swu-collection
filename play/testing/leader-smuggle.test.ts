import { createCredits } from '../engine/credits.ts';
import { changeResourceController } from '../engine/state.ts';
import { smuggleOptions } from '../engine/smuggle.ts';
import { Projector } from '../projection/projector.ts';
import { keywordNames } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const hondo = 'hondo-ohnaka--that-s-good-business',
  lando = 'lando-calrissian--with-impeccable-taste',
  starhopper = 'collections-starhopper';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
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
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

function setup(card = starhopper, id: string = ids.leader, deployed = false) {
  const p = board(id, deployed);
  p.players[0].resources![0] = { card, ref: 'smuggled' };
  p.players[0].deck![0] = { card: ids.trooper, ref: 'replacement' };
  return p;
}
const smuggle = (s: GameState, id: string, host?: string, option?: string) =>
  step(
    s,
    i =>
      i.kind === 'play' &&
      i.card === id &&
      !!i.smuggle &&
      i.target === host &&
      (!option || i.smuggle === option),
  );
const activate = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const count = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
const paid = (s: GameState, id: string) =>
  s.facts.filter(f => f.type === 'played' && f.cards.some(c => c.instanceId === id)).at(-1)!.amount;

for (const exhausted of [false, true])
  test(`Smuggle pays its alternate cost and replaces the card exhausted (${exhausted})`, () => {
    const p = setup();
    p.players[0].resources![0]!.exhausted = exhausted;
    const g = scenario(p),
      input = choose(g.state, i => i.kind === 'play' && i.card === g.refs.smuggled && !!i.smuggle);
    resume(g.state, input);
    const s = advance(g.state, input).state;
    expect(s.cards[g.refs.smuggled!]!.zone).toBe('space');
    expect(s.cards[g.refs.smuggled!]!.exhausted).toBe(true);
    expect(paid(s, g.refs.smuggled!)).toBe(3);
    expect(s.players.alice!.resources).toHaveLength(12);
    expect(s.cards[g.refs.replacement!]!.zone).toBe('resources');
    expect(s.cards[g.refs.replacement!]!.exhausted).toBe(true);
  });

test('The Smuggled resource can pay its own cost', () => {
  const p = setup();
  p.players[0].resources = p.players[0].resources!.slice(0, 3);
  const g = scenario(p),
    s = smuggle(g.state, g.refs.smuggled!);
  expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
});

test('An empty deck does not prevent Smuggle or cause draw damage', () => {
  const p = setup();
  p.players[0].deck = [];
  const g = scenario(p),
    s = smuggle(g.state, g.refs.smuggled!);
  expect(s.players.alice!.resources).toHaveLength(11);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});

test('Ordinary hand play does not use a Smuggle cost', () => {
  const p = board(ids.leader);
  p.players[0].hand = [{ card: starhopper, ref: 'played' }];
  const g = scenario(p);
  expect(
    g.state.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .every(o => o.intent.kind === 'play' && !o.intent.smuggle),
  ).toBe(true);
  const s = step(g.state, 'play');
  expect(paid(s, g.refs.played!)).toBe(2);
  expect(s.players.alice!.resources).toHaveLength(12);
});

for (const deployed of [false, true])
  for (const accept of [false, true])
    test(`Hondo can give Experience after Smuggle (${deployed}, ${accept})`, () => {
      const g = scenario(setup(starhopper, hondo, deployed));
      let s = smuggle(g.state, g.refs.smuggled!);
      resume(s, choose(s, accept ? 'accept-effect' : 'decline-effect'));
      s = step(s, accept ? 'accept-effect' : 'decline-effect');
      if (accept) s = target(s, g.refs.smuggled!);
      expect(count(s, g.refs.smuggled!)).toBe(accept ? 1 : 0);
      expect(leader(s).exhausted).toBe(accept && !deployed);
    });

test('Hondo cannot pay exhaustion on his already exhausted front', () => {
  const p = setup(starhopper, hondo);
  p.players[0].leader.exhausted = true;
  const g = scenario(p),
    s = smuggle(g.state, g.refs.smuggled!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(count(s, g.refs.smuggled!)).toBe(0);
});

test('Hondo can give Experience to an enemy unit', () => {
  const p = setup(starhopper, hondo);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  const s = target(step(smuggle(g.state, g.refs.smuggled!), 'accept-effect'), g.refs.enemy!);
  expect(count(s, g.refs.enemy!)).toBe(1);
});

test('Hondo ignores ordinary hand plays', () => {
  const p = board(hondo);
  p.players[0].hand = [{ card: starhopper }];
  const s = step(scenario(p).state, 'play');
  expect(s.execution.decision!.kind).toBe('action');
  expect(leader(s).exhausted).toBe(false);
});

for (const deployed of [false, true])
  test(`Lando defeats his replacement resource before Privateer Crew gains Experience (${deployed})`, () => {
    const g = scenario(setup('privateer-crew', lando, deployed));
    let s = smuggle(activate(g.state, deployed ? 'smuggle' : 'leader-action'), g.refs.smuggled!);
    expect(paid(s, g.refs.smuggled!)).toBe(4);
    expect(count(s, g.refs.smuggled!)).toBe(0);
    expect(s.execution.decision!.selection!.cards).toContain(g.refs.replacement!);
    resume(s, choose(s, 'accept-effect', [g.refs.replacement!]));
    s = step(s, 'accept-effect', [g.refs.replacement!]);
    expect(s.cards[g.refs.replacement!]!.zone).toBe('discard');
    expect(s.players.alice!.resources).toHaveLength(11);
    expect(count(s, g.refs.smuggled!)).toBe(3);
    expect(leader(s).exhausted).toBe(!deployed);
  });

test('Lando defeats a resource before a Smuggled event resolves', () => {
  const p = setup('smuggler-s-aid', lando);
  p.players[0].base.damage = 5;
  const g = scenario(p);
  let s = smuggle(activate(g.state), g.refs.smuggled!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(5);
  s = step(s, 'accept-effect', [g.refs.replacement!]);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
  expect(paid(s, g.refs.smuggled!)).toBe(1);
});

test('Lando still defeats a resource if the player declines to Smuggle', () => {
  const g = scenario(setup(starhopper, lando));
  let s = step(activate(g.state), 'decline-effect');
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.smuggled!);
  s = step(s, 'accept-effect', [g.refs.smuggled!]);
  expect(s.cards[g.refs.smuggled!]!.zone).toBe('discard');
  expect(s.players.alice!.resources).toHaveLength(11);
});

test('Lando can defeat a resource even when no Smuggle play is available', () => {
  const p = board(lando);
  const g = scenario(p);
  let s = activate(g.state);
  expect(s.execution.decision!.selection!.min).toBe(1);
  s = step(s, 'accept-effect', [s.players.alice!.resources[0]!]);
  expect(s.players.alice!.resources).toHaveLength(11);
});

test('Lando cannot defeat a resource owned by the opponent', () => {
  const p = setup(starhopper, lando);
  p.players[1].resources = [{ card: ids.marine, ref: 'borrowed' }];
  const g = scenario(p);
  changeResourceController(g.state, g.state.cards[g.refs.borrowed!]!, 'alice');
  const s = smuggle(activate(g.state), g.refs.smuggled!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.borrowed!);
});

test('Lando’s unit action is limited once per round without requiring readiness', () => {
  const p = setup(starhopper, lando, true);
  p.players[0].leader.exhausted = true;
  const g = scenario(p);
  let s = step(activate(g.state, 'smuggle'), 'decline-effect');
  s = step(s, 'accept-effect', [g.refs.smuggled!]);
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'smuggle',
    ),
  ).toBe(false);
});

for (const enemy of [false, true])
  test(`The Blaster uses Cunning instead of its printed Aggression cost (${enemy})`, () => {
    const p = setup('hotshot-dl-44-blaster', lando);
    p.players[enemy ? 1 : 0].ground = [{ card: ids.marine, ref: 'host' }];
    const g = scenario(p);
    let s = smuggle(g.state, g.refs.smuggled!, g.refs.host!);
    expect(paid(s, g.refs.smuggled!)).toBe(3);
    expect(s.cards[g.refs.smuggled!]!.attachedTo!.instanceId).toBe(g.refs.host!);
    if (enemy) expect(s.execution.decision!.kind).toBe('action');
    else {
      expect(s.execution.decision!.options.every(o => o.intent.kind === 'attack')).toBe(true);
      s = step(s, 'attack');
      expect(s.cards[g.refs.host!]!.exhausted).toBe(true);
    }
  });

test('Tech grants a separate Smuggle cost alongside a printed one', () => {
  const p = setup();
  p.players[0].ground = [{ card: 'tech--source-of-insight', ref: 'tech' }];
  const g = scenario(p);
  const costs = smuggleOptions(g.state, g.state.cards[g.refs.smuggled!]!);
  expect(costs.map(c => c.cost)).toEqual([3, 4]);
  expect(
    g.state.execution.decision!.options.filter(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.smuggled,
    ),
  ).toHaveLength(2);
  const s = smuggle(g.state, g.refs.smuggled!, undefined, costs[1]!.id);
  expect(paid(s, g.refs.smuggled!)).toBe(4);
});

test('Tech lets another resource Smuggle a card with its printed icons and cost plus two', () => {
  const p = setup(ids.marine);
  p.players[0].ground = [{ card: 'tech--source-of-insight' }];
  const g = scenario(p),
    s = smuggle(g.state, g.refs.smuggled!);
  expect(paid(s, g.refs.smuggled!)).toBe(4);
  expect(s.cards[g.refs.smuggled!]!.zone).toBe('ground');
});

test('Blanking Tech removes his Smuggle grants', () => {
  const p = setup(ids.marine);
  p.players[0].ground = [{ card: 'tech--source-of-insight', ref: 'tech' }];
  const g = scenario(p);
  modifyUnit(g.state, leader(g.state), g.state.cards[g.refs.tech!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  g.state.execution.decision = null;
  settle(g.state);
  expect(
    g.state.execution.decision!.options.some(o => o.intent.kind === 'play' && !!o.intent.smuggle),
  ).toBe(false);
});

test('Tech’s resource grant ceases when the recipient becomes a unit', () => {
  const p = setup(ids.marine);
  p.players[0].ground = [{ card: 'tech--source-of-insight' }];
  const g = scenario(p);
  expect(keywordNames(g.state, g.state.cards[g.refs.smuggled!]!)).toContain('Smuggle');
  const s = smuggle(g.state, g.refs.smuggled!);
  expect(keywordNames(s, s.cards[g.refs.smuggled!]!)).not.toContain('Smuggle');
});

test('Printed Smuggle remains a keyword in play and is removed by ability loss', () => {
  const g = scenario(setup()),
    s = smuggle(g.state, g.refs.smuggled!);
  expect(keywordNames(s, s.cards[g.refs.smuggled!]!)).toContain('Smuggle');
  modifyUnit(s, leader(s), s.cards[g.refs.smuggled!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(keywordNames(s, s.cards[g.refs.smuggled!]!)).not.toContain('Smuggle');
});

test('Smuggle payments through Credits preserve the exact chosen cost after recovery', () => {
  const g = scenario(setup());
  createCredits(g.state, 'alice', 3);
  let s = smuggle(g.state, g.refs.smuggled!);
  resume(s, choose(s, 'accept-effect', s.players.alice!.tokens));
  s = step(s, 'accept-effect', s.players.alice!.tokens);
  expect(paid(s, g.refs.smuggled!)).toBe(0);
  expect(s.cards[g.refs.smuggled!]!.zone).toBe('space');
});

test('Smuggle choices and their costs are visible only to the acting player', () => {
  const a = scenario(setup()),
    b = scenario(setup(ids.marine));
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ])
    expect(new Projector(a.state.gameId, viewer, 'v'.repeat(32)).project(a.state)).toEqual(
      new Projector(b.state.gameId, viewer, 'v'.repeat(32)).project(b.state),
    );
  const p = new Projector(a.state.gameId, { role: 'player', playerId: 'alice' }, 'v'.repeat(32)),
    v = p.project(a.state);
  expect(v.decision!.options.find(o => o.smuggle)!.smuggle!.cost).toBe(3);
});

test('A checkpoint cannot substitute an invented Smuggle cost', () => {
  const g = scenario(setup());
  const option = g.state.execution.decision!.options.find(
    o => o.intent.kind === 'play' && !!o.intent.smuggle,
  )!;
  if (option.intent.kind === 'play') option.intent.smuggle = 'invented';
  expect(() => decodeState(encodeState(g.state))).toThrow();
});

test('Playing Privateer Crew from hand does not grant Experience', () => {
  const p = board(ids.leader);
  p.players[0].hand = [{ card: 'privateer-crew', ref: 'crew' }];
  const g = scenario(p),
    s = step(g.state, 'play');
  expect(count(s, g.refs.crew!)).toBe(0);
});

test('Smuggle rejects a card whose alternate cost cannot be paid', () => {
  const p = setup();
  p.players[0].resources = p.players[0].resources!.slice(0, 2);
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.smuggled,
    ),
  ).toBe(false);
});

test('Tech does not allow Piloting and Smuggle to be paid together', () => {
  const p = setup('clone-pilot');
  p.players[0].ground = [{ card: 'tech--source-of-insight' }];
  p.players[0].space = [{ card: ids.fighter }];
  const g = scenario(p);
  expect(
    g.state.execution
      .decision!.options.filter(o => o.intent.kind === 'play' && o.intent.card === g.refs.smuggled)
      .every(o => o.intent.kind === 'play' && !o.intent.piloting && !o.intent.target),
  ).toBe(true);
});

for (const deployed of [false, true])
  test(`Hondo can observe a second Smuggle in the same round (${deployed})`, () => {
    const p = setup(starhopper, hondo, deployed);
    p.players[0].resources![1] = { card: starhopper, ref: 'second' };
    const g = scenario(p);
    let s = target(step(smuggle(g.state, g.refs.smuggled!), 'accept-effect'), g.refs.smuggled!);
    s = step(s, 'pass');
    s = smuggle(s, g.refs.second!);
    if (deployed) s = target(step(s, 'accept-effect'), g.refs.second!);
    expect(count(s, g.refs.second!)).toBe(deployed ? 1 : 0);
  });

test('Lando’s unit action becomes available again in the next round', () => {
  const g = scenario(setup(starhopper, lando, true));
  let s = step(activate(g.state, 'smuggle'), 'decline-effect');
  s = step(s, 'accept-effect', [g.refs.smuggled!]);
  for (let n = 0; s.round === 1 && n < 20; n++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(2);
  if (s.activePlayer !== 'alice') s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'smuggle',
    ),
  ).toBe(true);
});

test('A stolen resource can be Smuggled, and an event goes to its printed owner’s discard pile', () => {
  const p = board(ids.leader);
  p.players[1].resources = [{ card: 'smuggler-s-aid', ref: 'event' }];
  p.players[0].base.damage = 4;
  const g = scenario(p);
  changeResourceController(g.state, g.state.cards[g.refs.event!]!, 'alice');
  g.state.execution.decision = null;
  settle(g.state);
  const s = smuggle(g.state, g.refs.event!);
  expect(s.players.bob!.discard).toContain(g.refs.event!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(1);
});

test('The browser receives distinct paid costs and a public grant source for Tech’s alternatives', () => {
  const p = setup();
  p.players[0].ground = [{ card: 'tech--source-of-insight' }];
  const g = scenario(p);
  const v = new Projector(
    g.state.gameId,
    { role: 'player', playerId: 'alice' },
    'v'.repeat(32),
  ).project(g.state);
  const choices = v.decision!.options.filter(
    o => o.smuggle && v.cards.find(c => c.id === o.cards[0])?.face?.cardId === starhopper,
  );
  expect(choices.map(o => o.smuggle!.cost)).toEqual([3, 4]);
  expect(choices[1]!.smuggle!.grantedBy!.cardId).toBe('tech--source-of-insight');
});
