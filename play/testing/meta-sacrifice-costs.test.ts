import { expect, test } from 'bun:test';
import { cardDefinition } from '../cards/registry.ts';
import { payAbilityCosts } from '../engine/abilities.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { credits } from '../engine/credits.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const krennic = 'director-krennic--amidst-my-achievement';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const sacrifice = (s: GameState, id: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'create-credit' && i.costTarget === id);
const deploy = (s: GameState) => step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
function board() {
  const p = position();
  p.players[0].leader = { card: krennic, ref: 'leader' };
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
test('Krennic pays exhaustion and an exact friendly unit together, creating one Credit and removing its attachments', () => {
  const p = board();
  p.attachments = [{ card: 'shield', unit: 'two' }];
  const s = scenario(p);
  const options = s.state.execution.decision!.options.filter(
    o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'create-credit',
  );
  expect(options.map(o => o.intent)).toEqual([
    {
      kind: 'use-ability',
      card: s.refs.leader!,
      abilityId: 'create-credit',
      costTarget: s.refs.one!,
    },
    {
      kind: 'use-ability',
      card: s.refs.leader!,
      abilityId: 'create-credit',
      costTarget: s.refs.two!,
    },
  ]);
  const input = choose(s.state, i => i.kind === 'use-ability' && i.costTarget === s.refs.two);
  resume(s.state, input);
  const done = advance(s.state, input).state;
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.two!]!.zone).toBe('discard');
  expect(done.cards[s.refs.one!]!.zone).toBe('ground');
  expect(credits(done, 'alice')).toHaveLength(1);
  expect(attachedUpgrades(done, done.cards[s.refs.two!]!)).toEqual([]);
});
test('a sacrifice is unavailable without a friendly unit or when the leader is already exhausted', () => {
  for (const exhausted of [false, true]) {
    const p = board();
    if (exhausted) p.players[0].leader.exhausted = true;
    else p.players[0].ground = [];
    const s = scenario(p);
    expect(
      s.state.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'create-credit',
      ),
    ).toBe(false);
  }
});
test('invalid sacrifice assignments fail before exhaustion, resources or Force are paid', () => {
  const p = board();
  p.players[0].resources = [{ card: ids.marine }];
  p.players[0].force = true;
  const s = scenario(p),
    definition = cardDefinition(krennic);
  if (definition.kind !== 'leader') throw new Error('Wrong kind');
  const printed = definition.faces.leader.actions![0]!;
  const ability = {
    ...printed,
    costs: [
      ...printed.costs,
      { kind: 'resources' as const, amount: 1 },
      { kind: 'force' as const },
    ],
  };
  for (const invalid of [
    undefined,
    s.refs.enemy,
    s.state.players.alice!.base,
    s.state.players.alice!.resources[0],
  ]) {
    const state = structuredClone(s.state),
      before = structuredClone(state);
    expect(() =>
      payAbilityCosts(state, state.cards[s.refs.leader!]!, ability, 0, invalid),
    ).toThrow();
    expect(state).toEqual(before);
  }
  const unavailable = structuredClone(s.state);
  unavailable.cards[unavailable.players.alice!.resources[0]!]!.exhausted = true;
  const before = structuredClone(unavailable);
  expect(() =>
    payAbilityCosts(unavailable, unavailable.cards[s.refs.leader!]!, ability, 0, s.refs.one),
  ).toThrow();
  expect(unavailable).toEqual(before);
});
test('cost-triggered abilities wait until Krennic creates the Credit', () => {
  const p = board();
  p.players[0].ground = [{ card: 'onyx-squadron-brute', ref: 'victim', movedArena: true }];
  const s = scenario(p),
    pending = sacrifice(s.state, s.refs.victim!);
  expect(credits(pending, 'alice')).toHaveLength(1);
  expect(pending.execution.decision!.kind).toBe('effect');
  expect(pending.execution.frames[0]).toMatchObject({
    kind: 'effect',
    effect: { kind: 'heal-base' },
  });
  resume(pending, choose(pending, 'target'));
});
test('friendly means controller for sacrifice; tokens and stolen units are valid payments', () => {
  for (const token of [true, false]) {
    const p = board();
    p.players[0].ground = [];
    if (token) p.players[0].ground = [{ card: 'spy', ref: 'victim' }];
    else p.players[1].ground!.push({ card: ids.marine, controller: 'alice', ref: 'victim' });
    const s = scenario(p),
      done = sacrifice(s.state, s.refs.victim!);
    expect(done.cards[s.refs.victim!]!.zone).toBe(token ? 'set-aside' : 'discard');
    expect(credits(done, 'alice')).toHaveLength(1);
    if (!token) expect(done.players.bob!.discard).toContain(s.refs.victim!);
  }
});
test('Krennic deploys using seven resources in play and another unit’s modified power, with no leader-side action afterward', () => {
  const p = board();
  p.players[0].resources = Array.from({ length: 7 }, () => ({ card: ids.marine, exhausted: true }));
  p.attachments = [{ card: 'experience', unit: 'two' }];
  const s = scenario(p),
    friendly = deploy(s.state);
  expect(friendly.cards[s.refs.leader!]!).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(
    friendly.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.leader,
    ),
  ).toBe(false);
  const enemy = target(friendly, s.refs.two!);
  resume(enemy, choose(enemy, 'target'));
  const done = target(enemy, s.refs.enemy!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(4);
  expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
  const next = step(done, 'pass');
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.refs.leader,
    ),
  ).toBe(false);
  const fact = done.facts.findLast(f => f.type === 'damage')!;
  expect(fact.cards.some(c => c.instanceId === s.refs.two)).toBe(true);
});
test('deployment still spends its Epic use when no other friendly unit can deal damage', () => {
  const p = board();
  p.players[0].ground = [];
  p.players[0].resources = Array.from({ length: 7 }, () => ({ card: ids.marine }));
  const s = scenario(p),
    done = deploy(s.state);
  expect(done.cards[s.refs.leader!]!.abilityUses.deploy).toBe(1);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(0);
  expect(done.execution.decision!.playerId).toBe('bob');
});
test('a Shield can prevent the deployment damage and recover with the correct source unit', () => {
  const p = board();
  p.players[0].resources = Array.from({ length: 7 }, () => ({ card: ids.marine }));
  p.attachments = [
    { card: 'shield', unit: 'enemy', ref: 'shield1' },
    { card: 'shield', unit: 'enemy', ref: 'shield2' },
  ];
  const s = scenario(p),
    pending = target(target(deploy(s.state), s.refs.one!), s.refs.enemy!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === s.refs.shield2),
  );
  const done = target(pending, s.refs.shield2!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(0);
  expect(attachedUpgrades(done, done.cards[s.refs.enemy!]!)).toHaveLength(1);
});
test('the action projection references both the leader and the exact copy paid as its cost', () => {
  const s = scenario(board()),
    view = new Projector(s.state.gameId, { role: 'player', playerId: 'alice' }).project(s.state);
  const leader = view.cards.find(c => c.face?.cardId === krennic)!,
    units = view.cards.filter(c => c.face?.cardId === ids.marine && c.owner === 'alice');
  expect(
    view.decision!.options.filter(o => o.action?.id === 'create-credit').map(o => o.cards),
  ).toEqual(units.map(c => [leader.id, c.id]));
});
