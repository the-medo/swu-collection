import { expect, test } from 'bun:test';
import {
  abilities,
  attack,
  blank,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';

test('Brain Invaders removes both leaders’ ordinary abilities while preserving deployment', () => {
  const p = board('brain-invaders');
  p.players[1].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const g = scenario(p);
  for (const player of ['alice', 'bob'])
    expect(abilities(g.state, g.state.players[player]!.leader).actions!.map(a => a.id)).toEqual([
      'deploy',
    ]);
  const deployed = step(
    g.state,
    i =>
      i.kind === 'use-ability' &&
      i.card === g.state.players.alice!.leader &&
      i.abilityId === 'deploy',
  );
  expect(deployed.cards[deployed.players.alice!.leader]!.zone).toBe('ground');
  expect(abilities(deployed, deployed.players.alice!.leader).triggers).toHaveLength(0);
  const restored = defeat(deployed, g.refs.card!);
  expect(abilities(restored, restored.players.alice!.leader).triggers!.length).toBeGreaterThan(0);
});
test('Brain Invaders suppresses later grants to a deployed leader and losing its own text restores them', () => {
  const p = board('brain-invaders');
  p.players[0].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  const g = scenario(p);
  const s = effects(
    g.state,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: {
          kind: 'modify',
          power: 0,
          hp: 0,
          duration: 'phase',
          abilities: { keywords: ['Sentinel'] },
        },
      },
    ],
    g.refs.leader!,
  );
  expect(abilities(s, g.refs.leader!).keywords).not.toContain('Sentinel');
  blank(s, g.refs.card!);
  expect(abilities(s, g.refs.leader!).keywords).toContain('Sentinel');
});
test('IG-11 replaces capture with his defeat and damage to every enemy ground unit', () => {
  const p = board('ig-11--i-cannot-be-captured');
  p.players[1].ground = [
    { card: ids.consular, ref: 'guard' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p);
  let s = effects(
    g.state,
    [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        bind: 'prisoner',
        optional: false,
        effects: [{ kind: 'capture-unit', guard: 'own-base', target: 'prisoner' }],
      },
    ],
    g.state.players.bob!.leader,
  );
  s = target(s, g.refs.card!);
  expect(s.cards[g.refs.card!]!.zone).toBe('discard');
  expect(s.captured).toHaveLength(0);
  expect(s.cards[g.refs.guard!]!.damage).toBe(3);
  expect(s.cards[g.refs.other!]!.zone).toBe('discard');
  expect(s.cards[g.refs.space!]!.damage).toBe(0);
  expect(
    s.facts.some(f => f.type === 'captured' && f.cards.some(c => c.instanceId === g.refs.card)),
  ).toBe(false);
});
test('IG-11 can be captured after losing his ability and his attack damage targets damaged ground units', () => {
  const p = board('ig-11--i-cannot-be-captured');
  p.players[1].ground = [
    { card: ids.consular, damage: 1, ref: 'damaged' },
    { card: ids.marine, ref: 'undamaged' },
  ];
  const g = scenario(p);
  const pending = attack(g.state, g.refs.card!);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.undamaged,
    ),
  ).toBe(false);
  expect(target(pending, g.refs.damaged!).cards[g.refs.damaged!]!.damage).toBe(4);
  const s = structuredClone(g.state);
  blank(s, g.refs.card!);
  const captured = target(
    effects(
      s,
      [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'victim',
          optional: false,
          effects: [{ kind: 'capture-unit', guard: 'own-base', target: 'victim' }],
        },
      ],
      s.players.bob!.leader,
    ),
    g.refs.card!,
  );
  expect(captured.cards[g.refs.card!]!.zone).toBe('captured');
});
test('The Falcon enters ready and pays only after regroup resources ready', () => {
  const p = board('millennium-falcon--piece-of-junk', true);
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(false);
  s = step(step(s, 'pass'), 'pass');
  while (s.execution.decision?.kind === 'resource') s = step(s, 'resource');
  expect(s.execution.decision?.kind).toBe('effect');
  expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.card!]!.zone).toBe('space');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(1);
});
test('The Falcon returns to its owner when its controller declines the regroup payment', () => {
  const p = board('millennium-falcon--piece-of-junk');
  const g = scenario(p);
  let s = step(step(g.state, 'pass'), 'pass');
  while (s.execution.decision?.kind === 'resource') s = step(s, 'resource');
  s = step(s, 'decline-effect');
  expect(s.cards[g.refs.card!]!.zone).toBe('hand');
});
