import { canPayAbilityCosts, payAbilityCosts } from '../engine/abilities.ts';
import { decodeState } from '../engine/checkpoint.ts';
import { cardTraits } from '../engine/attributes.ts';
import { expect, test } from 'bun:test';
import { spendingPower, spendableCredits } from '../engine/credits.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { cardDefinition } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { credits, readyResourceCount } from '../engine/credits.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, abilityId: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === abilityId)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function regroup(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

function triggers(s: GameState) {
  for (let n = 0; n < 15 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
}

function randomize(s: GameState) {
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  }).state;
}
function targets(s: GameState) {
  return s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
}

function pilot(s: GameState, card: string, host: string) {
  return step(
    s,
    i => i.kind === 'play' && i.card === card && i.target === host && i.piloting === 'piloting',
  );
}
function blank(s: GameState, id: string) {
  modifyUnit(s, s.cards[s.players.alice!.leader]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
}

const activate = (s: GameState, card: string, abilityId: string) =>
  step(s, i => i.kind === 'use-ability' && i.card === card && i.abilityId === abilityId);
const available = (s: GameState, abilityId: string) =>
  s.execution.decision!.options.some(
    o => o.intent.kind === 'use-ability' && o.intent.abilityId === abilityId,
  );
const krr = 'krrsantan--hit-and-run';
const chewie = 'chewbacca--hero-of-kessel';
const dryden = 'dryden-vos--i-never-ask-twice';
const jabba = 'jabba-the-hutt--crime-boss';
const sebulba = 'sebulba--especially-dangerous-dug';
function payment(s: GameState, cards: string[]) {
  return step(s, 'accept-effect', cards);
}

test('Krrsantan chooses two exact hand cards atomically, then returns without retaining its attachments', () => {
  const p = playFixture(ids.marine);
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.fighter, ref: 'kept' },
  ];
  p.players[0].ground = [{ card: krr, ref: 'krr', exhausted: true }];
  p.attachments = [{ card: 'shield', unit: 'krr', ref: 'shield' }];
  const g = scenario(p);
  const old = g.state.cards[g.refs.krr!]!.visibility;
  let s = activate(g.state, g.refs.krr!, 'retreat');
  expect(s.execution.frames[0]?.kind).toBe('ability-payment');
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(s.cards[g.refs.krr!]!.zone).toBe('ground');
  expect(() => payment(s, [g.refs.one!])).toThrow();
  expect(() => payment(s, [g.refs.one!, g.refs.one!])).toThrow();
  const input = choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  resume(s, input);
  s = advance(s, input).state;
  expect(s.players.alice!.hand).toEqual([g.refs.kept!, g.refs.krr!]);
  expect(s.cards[g.refs.krr!]!.visibility).toBeGreaterThan(old);
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(s.players.alice!.discard).toEqual([g.refs.one!, g.refs.two!]);
  expect(s.phaseHistory.ownCardsDiscarded).toContain('alice');
});

test('Krrsantan cannot activate with one card and a stolen copy returns to its owner', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [{ card: krr, ref: 'krr', controller: 'bob' }];
  p.activePlayer = 'bob';
  p.players[1].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
  ];
  const g = scenario(p);
  let s = activate(g.state, g.refs.krr!, 'retreat');
  s = payment(s, [g.refs.one!, g.refs.two!]);
  expect(s.players.alice!.hand).toContain(g.refs.krr!);
  expect(s.players.bob!.hand).toEqual([]);
  const q = playFixture(ids.marine);
  q.players[0].ground = [{ card: krr, ref: 'krr' }];
  expect(available(scenario(q).state, 'retreat')).toBe(false);
});

test('private card payments reveal inspected faces only to the paying player', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [{ card: krr, ref: 'krr' }];
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
  ];
  const g = scenario(p);
  const s = activate(g.state, g.refs.krr!, 'retreat');
  const own = new Projector(
    s.gameId,
    { role: 'player', playerId: 'alice' },
    'x'.repeat(32),
  ).project(s);
  expect(own.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine, ids.fighter]);
  expect(
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'x'.repeat(32)).project(s)
      .decision,
  ).toBeNull();
  expect(
    new Projector(s.gameId, { role: 'spectator' }, 'x'.repeat(32)).project(s).decision,
  ).toBeNull();
  const changed = structuredClone(s);
  changed.cards[g.refs.two!]!.cardId = 'open-fire';
  expect(
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'x'.repeat(32)).project(changed),
  ).toEqual(
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'x'.repeat(32)).project(s),
  );
});

test('Dryden discards a printed six-cost card and grants Ambush before play triggers', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: dryden, ref: 'leader' };
  p.players[0].hand = [
    { card: krr, ref: 'cost' },
    { card: ids.marine, ref: 'marine' },
    { card: ids.fighter, ref: 'small' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'command-ambush');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.cost!]);
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(false);
  s = payment(s, [g.refs.cost!]);
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
  expect(s.players.alice!.discard).toContain(g.refs.cost!);
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(true);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.marine);
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'target')).toBe(true);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});

test('Dryden unit side accepts any hand discard and can play a unit above five cost', () => {
  const p = playFixture(krr);
  p.players[0].leader = { card: dryden, ref: 'leader', deployedAs: 'unit', exhausted: true };
  p.players[0].hand!.push({ card: ids.fighter, ref: 'cost' });
  const g = scenario(p);
  expect(available(g.state, 'command-ambush')).toBe(false);
  let s = activate(g.state, g.refs.leader!, 'unit-ambush');
  s = payment(s, [g.refs.cost!]);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.played,
    ),
  ).toBe(true);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.played);
  s = triggers(s);
  expect(s.cards[g.refs.played!]!.zone).toBe('ground');
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
});

test('Chewbacca selects a private resource before paying Credit and exhausting his front', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: chewie, ref: 'leader' };
  p.players[0].resources = [{ card: ids.fighter, ref: 'resource', exhausted: true }];
  p.players[0].credits = ['credit'];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'break-free');
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(false);
  expect(credits(s, 'alice')).toHaveLength(1);
  s = payment(s, [g.refs.resource!]);
  expect(s.execution.frames[0]?.kind).toBe('credit-payment');
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(false);
  expect(s.players.alice!.resources).toHaveLength(1);
  resume(s, choose(s, 'accept-effect', [g.refs.credit!]));
  s = payment(s, [g.refs.credit!]);
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
  expect(s.players.alice!.resources).toHaveLength(0);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(credits(s, 'alice')).toHaveLength(1);
  expect(credits(s, 'alice')[0]!.instanceId).not.toBe(g.refs.credit!);
  expect(s.phaseHistory.ownCardsDiscarded).not.toContain('alice');
});

test('Chewbacca can exhaust the resource he sacrifices and cannot sacrifice a Credit instead', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: chewie, ref: 'leader' };
  p.players[0].resources = [{ card: ids.marine, ref: 'resource' }];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'break-free');
  s = payment(s, [g.refs.resource!]);
  expect(s.players.alice!.resources).toHaveLength(0);
  expect(s.players.alice!.discard).toContain(g.refs.resource!);
  const q = playFixture(ids.marine);
  q.players[0].leader = { card: chewie };
  q.players[0].resources = [];
  q.players[0].credits = ['a', 'b', 'c', 'd'];
  expect(available(scenario(q).state, 'break-free')).toBe(false);
});

test('Chewbacca pays four to deploy while exhausted; Credits can replace resources', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: chewie, ref: 'leader', exhausted: true };
  p.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  p.players[0].credits = ['a', 'b'];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'deploy');
  s = payment(s, [g.refs.a!, g.refs.b!]);
  expect(s.cards[g.refs.leader!]!.deployedAs).toBe('unit');
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(false);
  expect(readyResourceCount(s, 'alice')).toBe(0);
  expect(s.cards[g.refs.leader!]!.abilityUses.deploy).toBe(1);
  expect(credits(s, 'alice')).toHaveLength(0);
});

test('Chewbacca unit side optionally sacrifices a resource during attack and can decline', () => {
  for (const accept of [true, false]) {
    const p = playFixture(ids.marine);
    p.players[0].leader = { card: chewie, ref: 'leader', deployedAs: 'unit' };
    p.players[0].resources = [{ card: ids.fighter, ref: 'resource', exhausted: true }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.leader!, g.refs.enemy!);
    if (accept) {
      s = step(s, 'accept-effect');
      resume(s, choose(s, 'accept-effect', [g.refs.resource!]));
      s = payment(s, [g.refs.resource!]);
      s = target(s, g.refs.enemy!);
    } else s = step(s, 'decline-effect');
    expect(s.players.alice!.resources).toHaveLength(accept ? 0 : 1);
    expect(credits(s, 'alice')).toHaveLength(accept ? 1 : 0);
  }
});

test('failed custom costs leave exhaustion, resource payment and usage untouched', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: chewie, ref: 'leader' };
  const g = scenario(p);
  const def = cardDefinition(chewie);
  if (def.kind !== 'leader') throw new Error();
  const ability = def.faces.leader.actions!.find(a => a.id === 'break-free')!;
  const before = encodeState(g.state);
  expect(() =>
    payAbilityCosts(g.state, g.state.cards[g.refs.leader!]!, ability, 0, undefined, [
      g.refs.played!,
    ]),
  ).toThrow();
  expect(encodeState(g.state)).toBe(before);
  const s = activate(g.state, g.refs.leader!, 'break-free');
  const broken = structuredClone(s);
  broken.cards[g.refs.leader!]!.exhausted = true;
  expect(() => decodeState(encodeState(broken))).toThrow();
});

test('Sebulba pays with the unseen top card before granting Raid and cannot pay an empty deck', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: sebulba, ref: 'leader' };
  p.players[0].deck = [{ card: ids.fighter, ref: 'top' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'reckless-raid');
  expect(s.players.alice!.discard).toEqual([g.refs.top!]);
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
  s = target(s, g.refs.marine!);
  expect(effectiveAbilities(s, s.cards[g.refs.marine!]!).raid).toBe(1);
  const q = playFixture(ids.marine);
  q.players[0].leader = { card: sebulba };
  q.players[0].deck = [];
  expect(available(scenario(q).state, 'reckless-raid')).toBe(false);
});

test('Sebulba unit side mills and has Raid independently of the front action', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: sebulba, ref: 'leader', deployedAs: 'unit' };
  p.players[0].deck = [{ card: ids.fighter, ref: 'top' }];
  const g = scenario(p);
  const s = attack(g.state, g.refs.leader!, g.state.players.bob!.base);
  expect(s.players.alice!.discard).toContain(g.refs.top!);
  expect(s.cards[g.state.players.bob!.base]!.damage).toBe(3);
});

test('Jabba pays resources and returns an Underworld unit to its owner to create a Credit', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: jabba, ref: 'leader' };
  p.players[1].ground = [{ card: krr, ref: 'krr', controller: 'alice' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  const g = scenario(p);
  let s = activate(g.state, g.refs.leader!, 'collect-debt');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.krr!]);
  s = payment(s, [g.refs.krr!]);
  expect(s.players.bob!.hand).toContain(g.refs.krr!);
  expect(readyResourceCount(s, 'alice')).toBe(19);
  expect(credits(s, 'alice')).toHaveLength(1);
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
});

test('Jabba unit action grants Ambush only when a Credit was actually spent on that play', () => {
  for (const spend of [true, false]) {
    const p = playFixture('independent-smuggler');
    p.players[0].leader = { card: jabba, ref: 'leader', deployedAs: 'unit', exhausted: true };
    p.players[0].credits = ['credit'];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = activate(g.state, g.refs.leader!, 'underworld-ambush');
    expect(s.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(false);
    s = step(s, i => i.kind === 'play' && i.card === g.refs.played);
    s = payment(s, spend ? [g.refs.credit!] : []);
    s = triggers(s);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
      ),
    ).toBe(spend);
    if (spend) s = step(s, 'decline-effect');
    expect(s.cards[g.refs.played!]!.zone).toBe('ground');
  }
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: jabba, deployedAs: 'unit' };
  expect(available(scenario(p).state, 'underworld-ambush')).toBe(false);
});

test('Alliance Outpost can defeat any friendly token, but defeating the Force is not using it', () => {
  for (const kind of ['credit', 'the-force', 'shield', 'experience', 'advantage', 'x-wing']) {
    const p = playFixture(ids.marine);
    p.players[0].base = { card: 'alliance-outpost', ref: 'base' };
    p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
    if (kind === 'credit') p.players[0].credits = ['token'];
    else if (kind === 'the-force') p.players[0].force = true;
    else if (kind === 'x-wing') p.players[0].space = [{ card: 'x-wing', ref: 'token' }];
    else p.attachments = [{ card: kind, unit: 'marine', ref: 'token' }];
    const g = scenario(p);
    const id = kind === 'the-force' ? forceToken(g.state, 'alice')!.instanceId : g.refs.token!;
    let s = activate(g.state, g.refs.base!, 'exchange-token');
    s = payment(s, [id]);
    expect(s.cards[id]!.zone).toBe('set-aside');
    s = step(s, i => i.kind === 'choose-mode' && i.mode === 'credit');
    expect(credits(s, 'alice')).toHaveLength(1);
    expect(s.phaseHistory.forceUsed.alice ?? 0).toBe(0);
    expect(s.cards[g.refs.base!]!.abilityUses['exchange-token']).toBe(1);
  }
});

test('Alliance Outpost grants Shield or Experience to either player after paying its token', () => {
  for (const kind of ['shield', 'experience']) {
    const p = playFixture(ids.marine);
    p.players[0].base = { card: 'alliance-outpost', ref: 'base' };
    p.players[0].credits = ['token'];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = activate(g.state, g.refs.base!, 'exchange-token');
    s = payment(s, [g.refs.token!]);
    s = step(s, i => i.kind === 'choose-mode' && i.mode === kind);
    s = target(s, g.refs.enemy!);
    expect(upgrades(s, g.refs.enemy!)).toEqual([kind]);
    expect(s.phaseHistory.tokensCreated).toContain('alice');
  }
});
