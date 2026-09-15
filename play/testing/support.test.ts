import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

const owl = 'honorable-nite-owl',
  interceptor = 'remnant-interceptor',
  migs = 'migs-mayfeld--how-about-a-toast-';
function fixture(card = owl) {
  const p = position('support-position');
  p.players[0].hand = [{ card, ref: 'support' }];
  p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  p.players[0].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.marine, ref: 'exhausted', exhausted: true },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  return p;
}
function step(state: GameState, predicate: Intent['kind'] | ((i: Intent) => boolean)) {
  return advance(state, choose(state, predicate)).state;
}
function play(state: GameState, card: string) {
  return step(state, i => i.kind === 'play' && i.card === card);
}
function attack(state: GameState, attacker: string, defender: string) {
  return step(
    state,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender,
  );
}
function resume(state: GameState, input: unknown) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  return JSON.parse(child.stdout.toString()).state;
}

test('v8 Support is optional, chooses another ready friendly unit in either arena, and obeys Sentinel', () => {
  const p = fixture();
  p.players[1].ground = [
    { card: 'imperial-armored-commando', ref: 'sentinel' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state: initial, refs } = scenario(p);
  const state = play(initial, refs.support!);
  expect(state.execution.decision?.playerId).toBe('alice');
  expect(state.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: refs.attacker!, defender: refs.sentinel! },
    { kind: 'attack', attacker: refs.space!, defender: state.players.bob!.base },
    { kind: 'decline-effect' },
  ]);
  const input = choose(state, 'decline-effect');
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(instance(after, refs.attacker!).exhausted).toBe(false);
  expect(instance(after, refs.exhausted!).exhausted).toBe(true);
  expect(after.execution.decision?.playerId).toBe('bob');
});

test('Raid stacks for one attack, expires afterwards, and is retained in departed power', () => {
  const p = fixture();
  p.players[0].ground = [{ card: owl, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'superlaser-technician', ref: 'defender' }];
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'defender', ref: `shield${n}` }));
  const { state: initial, refs } = scenario(p);
  let state = attack(play(initial, refs.support!), refs.attacker!, refs.defender!);
  expect(state.execution.decision?.kind).toBe('replacement');
  expect(unitStats(state, instance(state, refs.attacker!)).power).toBe(4);
  const input = choose(state, i => i.kind === 'target' && i.card === refs.shield1);
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(after.attacks).toEqual([]);
  // The Owl was defeated by the Technician's combat damage; LKI includes both Raid instances.
  expect(after.departedUnits.find(e => e.reference.instanceId === refs.attacker)?.power).toBe(4);
  expect(after.facts.find(f => f.type === 'damage-prevented')?.amount).toBe(4);

  const baseFixture = fixture();
  baseFixture.players[0].ground = [{ card: owl, ref: 'attacker' }];
  const b = scenario(baseFixture);
  state = attack(play(b.state, b.refs.support!), b.refs.attacker!, b.state.players.bob!.base);
  expect(instance(state, state.players.bob!.base).damage).toBe(4);
  expect(unitStats(state, instance(state, b.refs.attacker!)).power).toBe(2);
});

test('Restore combines into one On Attack heal for the attacking controller, including borrowed Restore', () => {
  const p = fixture(interceptor);
  p.players[0].space = [{ card: interceptor, ref: 'attacker' }];
  p.players[0].ground = [];
  p.players[0].base.damage = 5;
  p.players[1].base.damage = 5;
  const { state: initial, refs } = scenario(p);
  const state = attack(play(initial, refs.support!), refs.attacker!, initial.players.bob!.base);
  expect(instance(state, state.players.alice!.base).damage).toBe(3);
  expect(instance(state, state.players.bob!.base).damage).toBe(7);
  expect(state.facts.filter(f => f.type === 'healed')).toHaveLength(1);
  expect(state.facts.find(f => f.type === 'healed')?.amount).toBe(2);
  expect(state.facts.find(f => f.type === 'healed')?.cards[0]?.instanceId).toBe(refs.attacker!);
  expect(effectiveAbilities(state, instance(state, refs.attacker!)).restore).toBe(1);
});

test('Migs checks the borrowed ability holder for upgrades and damages the defending unit before combat', () => {
  const p = fixture(migs);
  p.attachments = [{ card: 'academy-training', unit: 'attacker' }];
  const { state: initial, refs } = scenario(p);
  const state = attack(play(initial, refs.support!), refs.attacker!, refs.defender!);
  expect(state.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([2, 5, 3]);
  expect(
    state.facts
      .filter(f => f.type === 'damage' && f.actor === 'alice')
      .every(f => f.cards[0]?.instanceId === refs.attacker),
  ).toBe(true);
  expect(instance(state, refs.defender!).zone).toBe('discard');
  expect(effectiveAbilities(state, instance(state, refs.attacker!)).triggers).toEqual([]);
  const b = scenario(fixture(migs));
  const base = attack(play(b.state, b.refs.support!), b.refs.attacker!, b.state.players.bob!.base);
  expect(instance(base, base.players.bob!.base).damage).toBe(3);
  expect(base.facts.filter(f => f.type === 'damage')).toHaveLength(1);
});

test('a Support source defeated by uniqueness lends its last known abilities, not the surviving same-name copy', () => {
  const p = fixture(migs);
  p.players[0].ground!.push({ card: migs, ref: 'old' });
  const { state: initial, refs } = scenario(p);
  const unique = play(initial, refs.support!);
  expect(unique.execution.decision?.kind).toBe('unique');
  const state = step(unique, i => i.kind === 'keep-unique' && i.card === refs.old);
  expect(instance(state, refs.support!).zone).toBe('discard');
  const input = choose(
    state,
    i => i.kind === 'attack' && i.attacker === refs.attacker && i.defender === refs.defender,
  );
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(after.facts.find(f => f.type === 'damage')?.amount).toBe(1);
  expect(after.facts.find(f => f.type === 'damage')?.cards[0]?.instanceId).toBe(refs.attacker!);
});

test('borrowed attack abilities and repeated Shield suspensions survive fresh-process recovery', () => {
  const p = fixture(migs);
  p.players[0].leader = {
    card: ids.leader,
    ref: 'leader',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  p.attachments = [1, 2, 3].map(n => ({ card: 'shield', unit: 'defender', ref: `shield${n}` }));
  const { state: initial, refs } = scenario(p);
  let state = attack(play(initial, refs.support!), refs.leader!, refs.defender!);
  expect(state.execution.decision?.kind).toBe('trigger');
  const batch = state.execution.frames[0]!;
  if (batch.kind !== 'trigger-batch') throw new Error('Expected triggers');
  const borrowed = batch.triggers.find(t => t.abilityId.endsWith('-on-attack'))!;
  expect(borrowed.source.instanceId).toBe(refs.leader!);
  const input = choose(state, i => i.kind === 'trigger' && i.triggerId === borrowed.id);
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  state = after;
  expect(state.execution.decision?.kind).toBe('replacement');
  expect(effectiveAbilities(state, instance(state, refs.leader!)).keywords).not.toContain(
    'Support',
  );
  const shield = choose(state, i => i.kind === 'target' && i.card === refs.shield1);
  const combat = advance(state, shield).state;
  expect(resume(state, shield)).toEqual(combat);
  expect(combat.execution.decision?.kind).toBe('replacement');
  state = step(combat, i => i.kind === 'target' && i.card === refs.shield2);
  expect(state.attacks).toEqual([]);
  expect(instance(state, state.players.bob!.base).damage).toBe(1);
});

test('Support does not let a newly played ready source attack itself, and borrowing abilities does not retrigger When Played', () => {
  const p = fixture();
  p.players[0].ground = [];
  p.players[0].space = [];
  p.players[0].hand!.push({ card: 'sneak-attack', ref: 'sneak' });
  const { state: initial, refs } = scenario(p);
  const state = play(play(initial, refs.sneak!), refs.support!);
  expect(instance(state, refs.support!).exhausted).toBe(false);
  expect(state.execution.decision?.kind).toBe('action');
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(state.facts.filter(f => f.type === 'triggered')).toHaveLength(1);
});

test('Support checkpoints reject invented origins and restoring the excluded Support keyword', () => {
  const p = fixture(migs);
  p.attachments = [1, 2].map(() => ({ card: 'shield', unit: 'defender' }));
  const { state: initial, refs } = scenario(p);
  const state = attack(play(initial, refs.support!), refs.attacker!, refs.defender!);
  expect(decodeState(encodeState(state))).toEqual(state);
  const invented = structuredClone(state);
  invented.attacks[0]!.grantedAbilities[0]!.card.instanceId = 'invented';
  expect(() => decodeState(encodeState(invented))).toThrow('Invalid ability origin');
  const recursive = structuredClone(state);
  recursive.attacks[0]!.grantedAbilities[0]!.withoutSupport = false;
  expect(() => decodeState(encodeState(recursive))).toThrow('Invalid attack ability grant');
});

test('borrowed-trigger views label the attacking physical copy without exposing private ability history', () => {
  const p = fixture(migs);
  p.players[0].leader = { card: ids.leader, ref: 'leader', deployedAs: 'unit' };
  const { state: initial, refs } = scenario(p);
  const state = attack(play(initial, refs.support!), refs.leader!, refs.defender!);
  const player = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
  const view = player.project(state);
  expect(view.decision!.options.filter(o => o.ability?.id === 'on-attack')).toHaveLength(2);
  const trigger = view.decision!.options.find(o => o.ability?.grantedBy?.cardId === migs)!;
  expect(trigger.ability?.source.cardId).toBe(ids.leader);
  expect(trigger.ability?.grantedBy?.cardId).toBe(migs);
  expect(trigger.ability?.source.currentCardId).toBe(
    view.cards.find(c => c.face?.cardId === ids.leader && c.controller === 'alice')!.id,
  );
  const json = JSON.stringify(new Projector(state.gameId, { role: 'spectator' }).project(state));
  expect(json).not.toContain('grantedAbilities');
  expect(json).not.toContain('withoutSupport');
});

test('Support games replay every accepted input with borrowed triggers and uniqueness', () => {
  const c = config('support-recording');
  for (const player of c.players)
    player.deck = [migs, interceptor, owl, ids.marine].map(cardId => ({ cardId, quantity: 6 }));
  const game = new LocalGame(c, upper => upper - 1);
  let state = setup(game);
  for (let n = 0; n < 160 && !state.result; n++) {
    const d = state.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'play') ??
      d.options.find(o => o.intent.kind === 'attack') ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(0, d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(state.facts.some(f => f.type === 'healed')).toBe(true);
  expect(state.facts.some(f => f.type === 'played' && f.cards[0]?.cardId === migs)).toBe(true);
}, 15_000);
