import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { addCard, instance } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

const negotiations = 'aggressive-negotiations';
function step(state: GameState, choice: Intent['kind'] | ((intent: Intent) => boolean)) {
  return advance(state, choose(state, choice)).state;
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
  expect(child.exitCode).toBe(0);
  return JSON.parse(child.stdout.toString()).state;
}
function eventPosition(event = negotiations) {
  const p = position('event-position');
  p.players[0].hand = [
    { card: event, ref: 'event' },
    ...Array.from({ length: 3 }, () => ({ card: ids.marine })),
  ];
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  return p;
}

test('v8 §7.4: an event enters discard before resolving and can be played with no eligible effect target', () => {
  const p = eventPosition();
  p.players[0].ground = [];
  const { state: initial, refs } = scenario(p);
  const state = step(initial, i => i.kind === 'play' && i.card === refs.event);
  expect(instance(state, refs.event!).zone).toBe('discard');
  expect(instance(state, refs.event!).incarnation).toBe(0);
  expect(state.players.alice!.resources.filter(id => instance(state, id).exhausted)).toHaveLength(
    3,
  );
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(state.attacks).toEqual([]);
  const face = new Projector(state.gameId, { role: 'spectator' })
    .project(state)
    .cards.find(c => c.face?.cardId === negotiations)!.face;
  expect(face).toMatchObject({ kind: 'event', hp: null, power: null });
  const empty = eventPosition('open-fire');
  empty.players[0].ground = [];
  empty.players[1].ground = [];
  const game = scenario(empty);
  expect(
    step(game.state, i => i.kind === 'play' && i.card === game.refs.event).execution.decision?.kind,
  ).toBe('action');
});

test('SEC 179: only ready friendly units attack; bonus excludes the played event and expires after combat', () => {
  const p = eventPosition();
  p.players[0].ground!.push({ card: ids.marine, ref: 'exhausted', exhausted: true });
  const { state: initial, refs } = scenario(p);
  let state = step(initial, i => i.kind === 'play' && i.card === refs.event);
  expect(instance(state, refs.event!).zone).toBe('discard');
  expect(state.players.alice!.hand).toHaveLength(3);
  expect(
    state.execution.decision?.options.every(
      o => o.intent.kind === 'attack' && o.intent.attacker === refs.attacker,
    ),
  ).toBe(true);
  const input = choose(state, i => i.kind === 'attack' && i.defender === refs.defender);
  expect(resume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(instance(state, refs.defender!).damage).toBe(6);
  expect(
    state.departedUnits.find(entry => entry.reference.instanceId === refs.attacker)?.power,
  ).toBe(6);
  expect(state.attacks).toEqual([]);
  expect(state.facts.filter(f => f.type === 'attack-ended')).toHaveLength(1);
  expect(state.activePlayer).toBe('bob');
});

test('a modified attack honors Sentinel and retains a fixed bonus across a recoverable Shield choice', () => {
  const p = eventPosition();
  p.players[1].ground = [
    { card: 'imperial-armored-commando', ref: 'sentinel' },
    { card: ids.marine },
  ];
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'sentinel', ref: `shield${n}` }));
  const { state: initial, refs } = scenario(p);
  let state = step(initial, i => i.kind === 'play' && i.card === refs.event);
  expect(state.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: refs.attacker!, defender: refs.sentinel! },
  ]);
  state = step(state, 'attack');
  expect(state.attacks[0]?.powerBonus).toBe(3);
  expect(unitStats(state, instance(state, refs.attacker!)).power).toBe(6);
  // The rule's count is locked at declaration, not recalculated on each stat read.
  addCard(state, 'alice', ids.fighter, 'hand');
  expect(unitStats(state, instance(state, refs.attacker!)).power).toBe(6);
  const view = new Projector(state.gameId, { role: 'spectator' }).project(state);
  expect(
    view.cards.find(
      c => c.face?.cardId === ids.marine && c.controller === 'alice' && c.zone === 'ground',
    )?.face?.power,
  ).toBe(6);
  const input = choose(state, i => i.kind === 'target' && i.card === refs.shield2);
  expect(resume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(state.facts.find(f => f.type === 'damage-prevented')?.amount).toBe(6);
  expect(state.attacks).toEqual([]);
});

test('attack bonuses expire before defeat triggers resolve, with fresh-process recovery inside the nested trigger', () => {
  const p = eventPosition('surprise-strike');
  p.players[0].ground = [];
  p.players[0].space = [{ card: ids.fighter, ref: 'attacker' }];
  p.players[1].ground = [];
  p.players[1].space = [{ card: 'onyx-squadron-brute', ref: 'onyx' }];
  p.players[1].base.damage = 4;
  const { state: initial, refs } = scenario(p);
  let state = step(
    step(initial, i => i.kind === 'play' && i.card === refs.event),
    i => i.kind === 'attack' && i.defender === refs.onyx,
  );
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(state.execution.decision?.kind).toBe('effect');
  expect(state.activePlayer).toBe('alice');
  expect(state.attacks).toEqual([]);
  expect(
    state.departedUnits.find(entry => entry.reference.instanceId === refs.attacker)?.power,
  ).toBe(5);
  const input = choose(state, i => i.kind === 'target' && i.card === state.players.bob!.base);
  expect(resume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(instance(state, state.players.bob!.base).damage).toBe(2);
  expect(state.activePlayer).toBe('bob');
});

test('an attack ending early still removes its modifier; Sabine can end the game before combat', () => {
  const p = eventPosition();
  p.players[0].ground = [];
  p.players[0].leader = { card: ids.leader, deployedAs: 'unit', abilityUses: { deploy: 1 } };
  p.players[1].base.damage = 29;
  const { state: initial, refs } = scenario(p);
  const state = step(
    step(initial, i => i.kind === 'play' && i.card === refs.event),
    i => i.kind === 'attack' && i.defender === initial.players.bob!.base,
  );
  expect(state.result?.winner).toBe('alice');
  expect(state.attacks).toEqual([]);
  expect(state.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([1]);
  expect(decodeState(encodeState(state))).toEqual(state);
});

test('Open Fire deals damage from the exact discarded event and only targets units', () => {
  const p = eventPosition('open-fire');
  p.attachments = [{ card: 'experience', unit: 'defender' }];
  const { state: initial, refs } = scenario(p);
  let state = step(initial, i => i.kind === 'play' && i.card === refs.event);
  expect(state.execution.decision?.options).toHaveLength(2);
  state = step(state, i => i.kind === 'target' && i.card === refs.defender);
  expect(instance(state, refs.defender!).damage).toBe(4);
  expect(state.facts.find(f => f.type === 'damage')?.cards[0]?.instanceId).toBe(refs.event!);
});

test('checkpoint validation rejects missing or mismatched attack duration continuations', () => {
  const p = eventPosition();
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'target', ref: `shield${n}` }));
  const { state: initial, refs } = scenario(p);
  const state = step(
    step(initial, i => i.kind === 'play' && i.card === refs.event),
    i => i.kind === 'attack' && i.defender === refs.target,
  );
  const corrupt = structuredClone(state);
  corrupt.attacks = [];
  expect(() => decodeState(encodeState(corrupt))).toThrow();
  const wrong = structuredClone(state);
  wrong.attacks[0]!.attacker.incarnation += 50;
  expect(() => decodeState(encodeState(wrong))).toThrow();
});

test('complete event games replay each accepted command and keep independent recordings', () => {
  const c = config('event-recording');
  for (const player of c.players)
    player.deck = [
      { cardId: ids.marine, quantity: 12 },
      { cardId: negotiations, quantity: 8 },
      { cardId: 'open-fire', quantity: 4 },
    ];
  const game = new LocalGame(c, upper => upper - 1),
    other = new LocalGame({ ...c, gameId: 'other-events' }, upper => upper - 1);
  const untouched = other.recording;
  let state = setup(game);
  for (let n = 0; n < 140 && !state.result; n++) {
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
        d.selection ? d.selection.cards.slice(-d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(
    state.facts.some(f => f.type === 'played' && f.cards.some(c => c.cardId === negotiations)),
  ).toBe(true);
  expect(other.recording).toEqual(untouched);
});
