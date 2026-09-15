import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, EngineInput, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const annihilator = 'annihilator--tagge-s-flagship',
  sabine = 'sabine-wren--spectre-five',
  otherSabine = 'sabine-wren--i-learned-the-hard-way';
const resources = () => Array.from({ length: 16 }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
function shuffleInput(s: GameState): EngineInput {
  const request = s.execution.random!;
  return {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: request.id,
    values: request.bounds.map(() => 0),
  };
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function board() {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: annihilator, ref: 'annihilator' }];
  p.players[1].ground = [{ card: sabine, ref: 'victim' }];
  p.players[1].deck = [
    { card: sabine, ref: 'deck1' },
    { card: otherSabine, ref: 'deck2' },
    { card: ids.fighter, ref: 'nonmatch' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  p.players[1].hand = [
    { card: sabine, ref: 'hand1' },
    { card: otherSabine, ref: 'hand2' },
    { card: ids.consular, ref: 'handOther' },
  ];
  return p;
}
test('Annihilator defeats first, then privately searches the opponent’s deck and hand by full title', () => {
  const s = scenario(board()),
    search = target(step(s.state, 'play'), s.refs.victim!);
  expect(search.cards[s.refs.victim!]!.zone).toBe('discard');
  expect(search.execution.frames[0]).toMatchObject({
    kind: 'zone-search',
    owner: 'bob',
    playerId: 'alice',
  });
  expect(search.execution.decision!.selection).toEqual({
    cards: [s.refs.deck1!, s.refs.deck2!, s.refs.hand1!, s.refs.hand2!],
    min: 0,
    max: 4,
  });
  const a = new Projector(search.gameId, { role: 'player', playerId: 'alice' }).project(search);
  expect(a.decision!.inspectedCards).toHaveLength(14);
  const b = new Projector(search.gameId, { role: 'player', playerId: 'bob' }).project(search),
    spec = new Projector(search.gameId, { role: 'spectator' }).project(search);
  expect(b.decision).toBeNull();
  expect(spec.decision).toBeNull();
  expect(JSON.stringify(spec)).not.toContain(ids.consular);
  expect(() => step(search, 'accept-effect', [s.refs.nonmatch!])).toThrow();
  expect(() => step(search, 'accept-effect', [s.refs.deck1!, s.refs.deck1!])).toThrow();
  resume(search, choose(search, 'accept-effect', [s.refs.deck1!, s.refs.hand2!]));
  const pending = step(search, 'accept-effect', [s.refs.deck1!, s.refs.hand2!]);
  expect(pending.cards[s.refs.deck1!]!.zone).toBe('discard');
  expect(pending.cards[s.refs.hand2!]!.zone).toBe('discard');
  expect(pending.cards[s.refs.deck2!]!.zone).toBe('deck');
  expect(pending.cards[s.refs.hand1!]!.zone).toBe('hand');
  expect(pending.execution.frames[0]).toMatchObject({ kind: 'shuffle', playerId: 'bob' });
  resume(pending, shuffleInput(pending));
  const done = advance(pending, shuffleInput(pending)).state;
  expect(done.players.bob!.deck).toHaveLength(10);
  expect(done.players.bob!.hand).toHaveLength(2);
  expect(done.facts.some(f => f.type === 'shuffled' && f.actor === 'bob')).toBe(true);
});
test('the search can fail to reveal matches, but the whole searched deck still shuffles', () => {
  const s = scenario(board()),
    search = target(step(s.state, 'play'), s.refs.victim!),
    pending = step(search, 'accept-effect');
  const old = pending.players.bob!.deck.slice(),
    visibility = pending.cards[s.refs.deck1!]!.visibility;
  const done = advance(pending, shuffleInput(pending)).state;
  expect(done.players.bob!.deck).not.toEqual(old);
  expect([...done.players.bob!.deck].sort()).toEqual([...old].sort());
  expect(done.cards[s.refs.deck1!]!.visibility).toBe(visibility + 1);
  expect(done.players.bob!.hand).toHaveLength(3);
});
test('a defeated stolen unit points to its former controller’s zones, not its owner or reset controller', () => {
  const p = board();
  p.players[1].ground = [];
  p.players[0].ground = [{ card: sabine, controller: 'bob', ref: 'victim' }];
  const s = scenario(p),
    search = target(step(s.state, 'play'), s.refs.victim!);
  expect(search.cards[s.refs.victim!]!.controller).toBe('alice');
  expect(search.cards[s.refs.victim!]!.zone).toBe('discard');
  expect(search.execution.frames[0]).toMatchObject({ kind: 'zone-search', owner: 'bob' });
  expect(search.execution.decision!.selection!.cards).toContain(s.refs.hand2!);
  resume(search, choose(search, 'accept-effect', [s.refs.hand1!]));
});
test('Annihilator may decline the defeat and cannot search after a protected unit survives it', () => {
  const s = scenario(board()),
    declined = step(step(s.state, 'play'), 'decline-effect');
  expect(declined.cards[s.refs.victim!]!.zone).toBe('ground');
  expect(declined.facts.some(f => f.type === 'searched')).toBe(false);
  const p = board();
  p.players[1].ground = [{ card: 'rey--skywalker', ref: 'protected' }];
  const t = scenario(p),
    protectedState = target(step(t.state, 'play'), t.refs.protected!);
  expect(protectedState.cards[t.refs.protected!]!.zone).toBe('ground');
  expect(protectedState.facts.some(f => f.type === 'searched')).toBe(false);
});
test('the defeated Annihilator’s trigger still searches using its original controller after leaving play', () => {
  const p = board();
  p.activePlayer = 'bob';
  p.players[0].hand = [];
  p.players[0].space = [{ card: annihilator, ref: 'annihilator', damage: 11 }];
  p.players[1].resources = resources();
  p.players[1].hand!.push({ card: 'incapacitate', ref: 'removal' });
  const s = scenario(p),
    kill = step(s.state, i => i.kind === 'play' && i.card === s.refs.removal),
    choice = target(kill, s.refs.annihilator!);
  expect(choice.execution.decision!.playerId).toBe('alice');
  expect(choice.cards[s.refs.annihilator!]!.zone).toBe('discard');
  const search = target(choice, s.refs.victim!);
  expect(search.execution.frames[0]).toMatchObject({
    kind: 'zone-search',
    owner: 'bob',
    playerId: 'alice',
  });
  resume(search, choose(search, 'accept-effect', [s.refs.deck2!, s.refs.hand2!]));
});
test('non-inspecting views do not change when hidden searched cards differ', () => {
  const s = scenario(board()),
    search = target(step(s.state, 'play'), s.refs.victim!),
    other = structuredClone(search);
  other.cards[s.refs.nonmatch!]!.cardId = ids.consular;
  const frame = other.execution.frames[0];
  if (frame?.kind !== 'zone-search') throw new Error('Missing search');
  frame.cards.find(c => c.instanceId === s.refs.nonmatch)!.cardId = ids.consular;
  const inspected = other.facts.find(
    f => f.type === 'looked-at' && f.cards.some(c => c.instanceId === s.refs.nonmatch),
  )!;
  inspected.cards.find(c => c.instanceId === s.refs.nonmatch)!.cardId = ids.consular;
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const p = new Projector(search.gameId, viewer, 'x'.repeat(32));
    expect(p.project(search)).toEqual(p.project(other));
  }
});
test('checkpoints reject a changed search owner, missing inspection card or repeated zone', () => {
  const s = scenario(board()),
    search = target(step(s.state, 'play'), s.refs.victim!);
  for (const change of ['owner', 'card', 'zones']) {
    const invalid = structuredClone(search),
      frame = invalid.execution.frames[0];
    if (frame?.kind !== 'zone-search') throw new Error('Missing search');
    if (change === 'owner') frame.owner = 'alice';
    else if (change === 'card') frame.cards.pop();
    else frame.effect.zones = ['deck', 'deck'];
    expect(() => decodeState(encodeState(invalid))).toThrow();
  }
});
test('defeating a leader or token still starts a search even without matching cards in its controller’s zones', () => {
  for (const leader of [true, false]) {
    const p = board();
    p.players[1].ground = leader ? [] : [{ card: 'spy', ref: 'token' }];
    if (leader)
      p.players[1].leader = {
        card: 'darth-vader--victor-squadron-leader',
        deployedAs: 'unit',
        ref: 'leader',
        abilityUses: { deploy: 1 },
      };
    const s = scenario(p),
      search = target(step(s.state, 'play'), s.refs[leader ? 'leader' : 'token']!);
    expect(search.execution.frames[0]).toMatchObject({ kind: 'zone-search', owner: 'bob' });
    expect(search.execution.decision!.selection).toMatchObject({ cards: [], min: 0, max: 0 });
    expect(step(search, 'accept-effect').execution.random).not.toBeNull();
  }
});
