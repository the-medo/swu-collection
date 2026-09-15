import { describe, expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import {
  activeAbilities,
  canPayAbilityCosts,
  canUseAbility,
  deployCondition,
  payAbilityCosts,
} from '../engine/abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance } from '../engine/state.ts';
import { sabineWren } from '../cards/sor/sabine-wren--galvanized-revolutionary.ts';
import type { ActionDefinition } from '../cards/definition.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = (count: number) => Array.from({ length: count }, () => ({ card: ids.marine }));
const deployment = sabineWren.faces.leader.actions[1];

describe('leader faces and ability-specific limits (v8 §§3.4.3, 7.2.4)', () => {
  test('Sabine only exposes the actions and triggers printed on her current face', () => {
    const p = position();
    p.players[0].resources = resources(4);
    let state = scenario(p).state;
    const leaderId = state.players.alice!.leader;
    expect(activeAbilities(state, instance(state, leaderId)).actions?.map(a => a.id)).toEqual([
      'damage-bases',
      'deploy',
    ]);
    expect(activeAbilities(state, instance(state, leaderId)).triggers ?? []).toEqual([]);
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
    ).state;
    state = advance(state, choose(state, 'pass')).state;
    expect(activeAbilities(state, instance(state, leaderId)).actions ?? []).toEqual([]);
    expect(activeAbilities(state, instance(state, leaderId)).triggers?.map(t => t.id)).toEqual([
      'on-attack',
    ]);
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.card === leaderId,
      ),
    ).toBe(false);
    // The server revalidates the current face, even with a valid card ID.
    const forged = { ...choose(state, 'attack'), optionId: 'leader-damage-bases' };
    expect(() => advance(state, forged)).toThrow();
    state = advance(
      state,
      choose(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base),
    ).state;
    expect(instance(state, state.players.alice!.base).damage).toBe(0);
    expect(instance(state, state.players.bob!.base).damage).toBe(3); // On Attack 1 plus combat 2.
  });

  test('an Epic Action may be spent while its deployment condition is false', () => {
    const state = scenario(position()).state;
    const leader = instance(state, state.players.alice!.leader);
    expect(deployCondition(state, 'alice', deployment.effects[0])).toBe(false);
    expect(canUseAbility(state, leader, deployment)).toBe(true);
    const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
    const option = projector.project(state).decision!.options.find(o => o.action?.id === 'deploy')!;
    expect(option.action?.deploymentAvailable).toBe(false);
    const next = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
    ).state;
    expect(instance(next, leader.instanceId).deployedAs).toBeNull();
    expect(instance(next, leader.instanceId).abilityUses).toEqual({ deploy: 1 });
    expect(canUseAbility(next, instance(next, leader.instanceId), deployment)).toBe(false);
    expect(next.facts.some(f => f.type === 'deployed')).toBe(false);
    expect(instance(state, leader.instanceId).abilityUses).toEqual({});
  });

  test('using a normal action does not consume the separate deployment limit', () => {
    const state = scenario(position()).state;
    const next = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases'),
    ).state;
    const leader = instance(next, next.players.alice!.leader);
    expect(leader.abilityUses).toEqual({ 'damage-bases': 1 });
    expect(canUseAbility(next, leader, deployment)).toBe(true);
    expect(decodeState(encodeState(next))).toEqual(next);
  });

  test('a deployment effect does not mark any Epic Action as used', () => {
    const state = scenario(position()).state;
    const leader = instance(state, state.players.alice!.leader);
    leader.exhausted = true;
    // Exercise the same primitive a future triggered deployment will invoke.
    // This is not a registration or partial implementation of another leader.
    state.execution.decision = null;
    state.execution.frames = [
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(leader),
        effect: { kind: 'deploy', as: 'unit', condition: null },
      },
      { kind: 'action' },
    ];
    settle(state);
    expect(leader.deployedAs).toBe('unit');
    expect(leader.exhausted).toBe(false);
    expect(leader.abilityUses).toEqual({});
    expect(decodeState(encodeState(state))).toEqual(state);
  });
});

describe('deployment cost profiles (v8 §6.4; referenced leaders remain unsupported)', () => {
  const paidRepeat: ActionDefinition = {
    id: 'paid-deploy',
    costs: [{ kind: 'resources', amount: 3 }, { kind: 'exhaust-self' }],
    limit: null,
    effects: [{ kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 6 } }],
  };
  const paidEpic: ActionDefinition = {
    id: 'paid-epic',
    costs: [{ kind: 'resources', amount: 4 }],
    limit: 'once-per-game',
    effects: [{ kind: 'deploy', as: 'unit', condition: null }],
  };
  test('Trench-shaped cost: threshold six, pay three, exhaust source, no once-per-game limit', () => {
    const p = position();
    p.players[0].resources = resources(6);
    const state = scenario(p).state;
    const leader = instance(state, state.players.alice!.leader);
    expect(canUseAbility(state, leader, paidRepeat)).toBe(true);
    payAbilityCosts(state, leader, paidRepeat);
    expect(state.players.alice!.resources).toHaveLength(6);
    expect(state.players.alice!.resources.filter(id => instance(state, id).exhausted)).toHaveLength(
      3,
    );
    expect(leader.exhausted).toBe(true);
    expect(canUseAbility(state, leader, paidRepeat)).toBe(false);
    leader.exhausted = false;
    leader.abilityUses[paidRepeat.id] = 2;
    expect(canUseAbility(state, leader, paidRepeat)).toBe(true);
  });

  test('Chewbacca-shaped cost: an exhausted source can pay four, but needs four ready resources', () => {
    const p = position();
    p.players[0].resources = resources(4);
    p.players[0].leader.exhausted = true;
    const state = scenario(p).state;
    const leader = instance(state, state.players.alice!.leader);
    expect(canUseAbility(state, leader, paidEpic)).toBe(true);
    instance(state, state.players.alice!.resources[0]!).exhausted = true;
    expect(canPayAbilityCosts(state, leader, paidEpic)).toBe(false);
    const before = encodeState(state);
    expect(() => payAbilityCosts(state, leader, paidEpic)).toThrow();
    expect(encodeState(state)).toBe(before);
    instance(state, state.players.alice!.resources[0]!).exhausted = false;
    payAbilityCosts(state, leader, paidEpic);
    expect(state.players.alice!.resources.every(id => instance(state, id).exhausted)).toBe(true);
    expect(leader.exhausted).toBe(true);
  });

  test('all costs must be payable before exhausting any resources', () => {
    const p = position();
    p.players[0].resources = resources(6);
    p.players[0].leader.exhausted = true;
    const state = scenario(p).state;
    const leader = instance(state, state.players.alice!.leader);
    expect(() => payAbilityCosts(state, leader, paidRepeat)).toThrow();
    expect(state.players.alice!.resources.some(id => instance(state, id).exhausted)).toBe(false);
  });
});

test('ability usage survives fresh-process continuation and unknown history is rejected', async () => {
  const p = position();
  p.players[0].leader.abilityUses = { deploy: 1 };
  const state = scenario(p).state;
  const input = choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases');
  const child = Bun.spawn(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
  );
  child.stdin.write(JSON.stringify({ state: encodeState(state), input }));
  child.stdin.end();
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect(code).toBe(0);
  expect(error).toBe('');
  expect(JSON.parse(output)).toEqual(advance(state, input));
  const corrupted = structuredClone(state);
  corrupted.cards[corrupted.players.alice!.leader]!.abilityUses.invented = 1;
  expect(() => decodeState(encodeState(corrupted))).toThrow('history');
});
