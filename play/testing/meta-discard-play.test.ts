import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const hauler = 'stolen-at-hauler';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
function board() {
  const p = position();
  p.players[0].space = [{ card: hauler, ref: 'hauler', damage: 4 }];
  p.players[0].hand = [{ card: 'incapacitate', ref: 'removal' }];
  p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  p.players[1].discard = [{ card: hauler, ref: 'other' }];
  return p;
}
const plays = (s: GameState) =>
  s.execution.decision!.options.flatMap(o => (o.intent.kind === 'play' ? [o.intent.card] : []));
function defeated(p = board()) {
  const s = scenario(p);
  return { ...s, state: target(step(s.state, 'play'), s.refs.hauler!) };
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
test('Stolen AT-Hauler grants only the opponent a free action for the exact discarded copy, retaining ownership', () => {
  const p = board();
  p.players[1].credits = ['credit'];
  const s = defeated(p),
    input = choose(s.state, i => i.kind === 'play' && i.card === s.refs.hauler);
  expect(s.state.activePlayer).toBe('bob');
  expect(s.state.grantedPlays).toHaveLength(1);
  expect(plays(s.state)).toEqual([s.refs.hauler!]);
  resume(s.state, input);
  const done = advance(s.state, input).state,
    card = done.cards[s.refs.hauler!]!;
  expect(card).toMatchObject({
    zone: 'space',
    controller: 'bob',
    owner: 'alice',
    exhausted: true,
    damage: 0,
  });
  expect(card.incarnation).toBe(s.state.cards[s.refs.hauler!]!.incarnation + 1);
  expect(done.grantedPlays).toEqual([]);
  expect(done.cards[s.refs.credit!]!.zone).toBe('resources');
  expect(done.facts.findLast(f => f.type === 'played')).toMatchObject({ actor: 'bob', amount: 0 });
  expect(done.roundHistory.plays.at(-1)!.card.controller).toBe('bob');
});
test('a second defeat offers the same physical card back to the former controller’s opponent', () => {
  const p = board();
  p.players[0].hand!.push({ card: 'incapacitate', ref: 'secondRemoval' });
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  const s = defeated(p);
  let state = step(s.state, 'play');
  // Damage represents an exact settled combat position before the second removal.
  state.cards[s.refs.hauler!]!.damage = 4;
  state = target(
    step(state, i => i.kind === 'play' && i.card === s.refs.secondRemoval),
    s.refs.hauler!,
  );
  expect(state.grantedPlays).toHaveLength(1);
  expect(state.grantedPlays[0]!.playerId).toBe('alice');
  expect(state.cards[s.refs.hauler!]!.controller).toBe('alice');
  expect(plays(state)).not.toContain(s.refs.hauler!);
  state = step(state, 'pass');
  expect(plays(state)).toContain(s.refs.hauler!);
  const done = step(state, i => i.kind === 'play' && i.card === s.refs.hauler);
  expect(done.cards[s.refs.hauler!]!).toMatchObject({
    controller: 'alice',
    owner: 'alice',
    zone: 'space',
  });
});
test('leaving discard cancels the permission even when the card returns to discard without entering play', () => {
  const s = defeated(),
    state = structuredClone(s.state),
    card = state.cards[s.refs.hauler!]!;
  move(state, card, 'hand');
  move(state, card, 'discard');
  state.execution.decision = null;
  settle(state);
  expect(state.grantedPlays).toEqual([]);
  expect(plays(state)).not.toContain(s.refs.hauler!);
  expect(() => advance(state, choose(s.state, 'play'))).toThrow();
});
test('passing preserves the option during the phase, while phase end removes it', () => {
  const s = defeated();
  let state = step(s.state, 'pass');
  expect(state.grantedPlays).toHaveLength(1);
  expect(plays(state)).not.toContain(s.refs.hauler!);
  state = step(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases');
  expect(plays(state)).toContain(s.refs.hauler!);
  state = step(step(state, 'pass'), 'pass');
  expect(state.phase).toBe('regroup');
  expect(state.grantedPlays).toEqual([]);
});
test('a player who claimed initiative cannot use the granted play', () => {
  const p = board();
  p.initiative = { holder: 'bob', claimed: true };
  const s = defeated(p);
  expect(s.state.execution.decision!.playerId).toBe('alice');
  expect(plays(s.state)).not.toContain(s.refs.hauler!);
  expect(s.state.cards[s.refs.hauler!]!.zone).toBe('discard');
});
test('a Hauler defeated during regroup does not carry its permission into the next action phase', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'source' }];
  p.delayed = [{ source: 'source', unit: 'hauler' }];
  const s = scenario(p);
  let state = step(step(s.state, 'pass'), 'pass');
  for (let n = 0; n < 12 && state.round === 1; n++)
    state = step(
      state,
      state.execution.decision!.kind === 'resource'
        ? 'resource'
        : state.execution.decision!.options[0]!.intent.kind,
    );
  expect(state.round).toBe(2);
  expect(state.cards[s.refs.hauler!]!.zone).toBe('discard');
  expect(state.grantedPlays).toEqual([]);
});
test('losing the printed defeated ability prevents a grant, and a naming prohibition blocks free play', () => {
  const p = board();
  p.players[0].hand = [{ card: 'the-tree-remembers' }];
  p.players[0].space = [];
  p.players[1].space = [{ card: hauler, ref: 'hauler' }];
  const s = defeated(p);
  expect(s.state.grantedPlays).toEqual([]);
  const q = board();
  q.players[0].ground = [{ card: 'ryder-azadi--restored-governor', ref: 'ryder' }];
  const t = defeated(q),
    state = structuredClone(t.state);
  state.namedEffects.push({
    appliesTo: 'enemy',
    expires: { kind: 'source-in-play' },
    id: 'restriction',
    source: { ...state.cards[t.refs.ryder!]! },
    playerId: 'alice',
    name: 'Stolen AT-Hauler',
    restriction: 'prevent-play',
  });
  state.execution.decision = null;
  settle(state);
  expect(plays(state)).not.toContain(t.refs.hauler!);
  expect(state.grantedPlays).toHaveLength(1);
});
test('checkpoint validation rejects changed recipients, expired phases and wrong physical copies', () => {
  const s = defeated();
  for (const key of ['player', 'phase', 'target']) {
    const invalid = structuredClone(s.state),
      permission = invalid.grantedPlays[0]!;
    if (key === 'player') permission.playerId = 'alice';
    else if (key === 'phase') permission.phase = 'regroup';
    else permission.target.instanceId = s.refs.other!;
    expect(() => decodeState(encodeState(invalid))).toThrow();
  }
});
test('the public discard copy is the legal play reference, with no opponent-hand disclosure', () => {
  const s = defeated(),
    view = new Projector(s.state.gameId, { role: 'player', playerId: 'bob' }).project(s.state);
  const card = view.cards.find(
    c => c.zone === 'discard' && c.owner === 'alice' && c.face?.cardId === hauler,
  )!;
  expect(card).toBeDefined();
  expect(view.decision!.options.find(o => o.kind === 'play')!.cards).toContain(card.id);
  expect(new Projector(s.state.gameId, { role: 'spectator' }).project(s.state).decision).toBeNull();
});
