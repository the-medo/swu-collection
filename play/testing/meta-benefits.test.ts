import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const elzar = 'elzar-mann--haunted-by-a-vision',
  trace = 'trace-martez--trusting-sister',
  maul = 'darth-maul--sith-revealed';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
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
function randomInput(s: GameState): EngineInput {
  const r = s.execution.random!;
  return {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(n => n - 1),
  };
}
function board() {
  const p = position();
  p.players[0].hand = [{ card: elzar, ref: 'elzar' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].deck = [
    { card: 'incapacitate', ref: 'event1' },
    { card: ids.fighter, ref: 'nonmatch' },
    { card: 'commandeer', ref: 'event2' },
    ...Array.from({ length: 9 }, () => ({ card: ids.marine })),
  ];
  return p;
}
test('Elzar enters ready only with a friendly Force leader, on either leader face', () => {
  for (const leader of ['normal', 'force', 'deployed', 'enemy-force']) {
    const p = board();
    if (leader === 'force' || leader === 'deployed')
      p.players[0].leader = {
        card: maul,
        ...(leader === 'deployed'
          ? { deployedAs: 'unit' as const, abilityUses: { deploy: 1 } }
          : {}),
      };
    if (leader === 'enemy-force') p.players[1].leader = { card: maul };
    const s = scenario(p),
      done = step(s.state, 'play');
    expect(done.cards[s.refs.elzar!]!.exhausted).toBe(!['force', 'deployed'].includes(leader));
  }
});
test('Elzar distributes up to five Advantage tokens among other friendly units, then the opponent privately searches twice that many cards', () => {
  const s = scenario(board()),
    allocation = step(s.state, 'play');
  expect(allocation.execution.decision!.selection).toMatchObject({
    cards: [s.refs.one!, s.refs.two!],
    min: 0,
    max: 5,
  });
  expect(() => step(allocation, 'accept-effect', [s.refs.elzar!])).toThrow();
  expect(() => step(allocation, 'accept-effect', [s.refs.enemy!])).toThrow();
  expect(() => step(allocation, 'accept-effect', Array(6).fill(s.refs.one!))).toThrow();
  const input = choose(allocation, 'accept-effect', [s.refs.one!, s.refs.two!, s.refs.one!]);
  resume(allocation, input);
  const search = advance(allocation, input).state;
  expect(attachedUpgrades(search, search.cards[s.refs.one!]!)).toHaveLength(2);
  expect(attachedUpgrades(search, search.cards[s.refs.two!]!)).toHaveLength(1);
  expect(search.execution.frames[0]).toMatchObject({
    kind: 'search',
    playerId: 'alice',
    effect: { count: 6, player: 'enemy', filter: 'event' },
  });
  expect(search.execution.decision!.playerId).toBe('bob');
  expect(search.execution.decision!.selection!.cards).toEqual([s.refs.event1!, s.refs.event2!]);
  const a = new Projector(search.gameId, { role: 'player', playerId: 'alice' }).project(search),
    b = new Projector(search.gameId, { role: 'player', playerId: 'bob' }).project(search);
  expect(a.decision).toBeNull();
  expect(b.decision!.inspectedCards).toHaveLength(6);
  resume(search, choose(search, 'search', [s.refs.event2!]));
  const pending = step(search, 'search', [s.refs.event2!]);
  resume(pending, randomInput(pending));
  const done = advance(pending, randomInput(pending)).state;
  expect(done.players.bob!.hand).toContain(s.refs.event2!);
  expect(done.players.alice!.hand).not.toContain(s.refs.event2!);
  expect(done.players.bob!.deck).toHaveLength(11);
});
test('zero distribution and having no other friendly units cause no inspection, reveal or shuffle', () => {
  for (const units of [true, false]) {
    const p = board();
    if (!units) p.players[0].ground = [];
    const s = scenario(p),
      allocation = step(s.state, 'play'),
      done = step(allocation, 'accept-effect');
    expect(done.execution.random).toBeNull();
    expect(done.execution.decision!.kind).toBe('action');
    expect(done.facts.some(f => f.type === 'looked-at')).toBe(false);
    expect(done.players.bob!.deck).toEqual(s.state.players.bob!.deck);
  }
});
test('an opponent can decline to find an event; uninspected deck order remains unchanged', () => {
  const s = scenario(board()),
    search = step(step(s.state, 'play'), 'accept-effect', [s.refs.one!]);
  const original = search.players.bob!.deck.slice(),
    pending = step(search, 'search'),
    done = advance(pending, randomInput(pending)).state;
  expect(done.players.bob!.hand).toEqual([]);
  expect(done.players.bob!.deck.slice(0, 10)).toEqual(original.slice(2));
  expect(new Set(done.players.bob!.deck.slice(-2))).toEqual(new Set(original.slice(0, 2)));
});
test('the ability controller and spectators cannot distinguish hidden nonmatching cards inspected by the opponent', () => {
  const s = scenario(board()),
    a = step(step(s.state, 'play'), 'accept-effect', [s.refs.one!, s.refs.two!]),
    b = structuredClone(a);
  b.cards[s.refs.nonmatch!]!.cardId = ids.consular;
  const frame = b.execution.frames[0];
  if (frame?.kind !== 'search') throw new Error('Missing search');
  frame.cards.find(c => c.instanceId === s.refs.nonmatch)!.cardId = ids.consular;
  b.facts
    .find(f => f.type === 'looked-at')!
    .cards.find(c => c.instanceId === s.refs.nonmatch)!.cardId = ids.consular;
  for (const viewer of [
    { role: 'player', playerId: 'alice' } as const,
    { role: 'spectator' } as const,
  ]) {
    const p = new Projector(a.gameId, viewer, 'k'.repeat(32));
    expect(p.project(a)).toEqual(p.project(b));
  }
});
function traceBoard() {
  const p = position();
  p.players[0].space = [{ card: ids.fighter, ref: 'host', damage: 1 }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 3 }];
  p.players[0].ground = [{ card: ids.marine, ref: 'undamaged' }];
  p.attachments = [{ card: trace, unit: 'host', ref: 'pilot' }];
  return p;
}
const attack = (s: GameState, id: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === id && i.defender === s.players.bob!.base);
test('Trace grants its host optional divided healing on attack, capped by each unit’s current damage', () => {
  const s = scenario(traceBoard()),
    healing = attack(s.state, s.refs.host!);
  expect(healing.execution.decision!.selection).toMatchObject({
    cards: [s.refs.enemy!, s.refs.host!],
    min: 0,
    max: 2,
    allocation: { limits: { [s.refs.host!]: 1, [s.refs.enemy!]: 2 } },
  });
  expect(() => step(healing, 'accept-effect', [s.refs.host!, s.refs.host!])).toThrow();
  expect(() => step(healing, 'accept-effect', [s.refs.undamaged!])).toThrow();
  expect(() => step(healing, 'accept-effect', Array(3).fill(s.refs.enemy!))).toThrow();
  resume(healing, choose(healing, 'accept-effect', [s.refs.host!, s.refs.enemy!]));
  const done = step(healing, 'accept-effect', [s.refs.host!, s.refs.enemy!]);
  expect(done.cards[s.refs.host!]!.damage).toBe(0);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(2);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(unitStats(done, done.cards[s.refs.host!]!)).toMatchObject({ power: 3, hp: 3 });
  const view = new Projector(healing.gameId, { role: 'player', playerId: 'alice' }).project(
    healing,
  );
  expect(view.decision!.effect).toBe('allocate-healing');
});
test('Trace can heal one unit twice, heal nothing, or have no damaged units to choose', () => {
  for (const count of [0, 2, -1]) {
    const p = traceBoard();
    if (count === -1) {
      p.players[0].space![0]!.damage = 0;
      p.players[1].ground![0]!.damage = 0;
    }
    const s = scenario(p),
      pending = attack(s.state, s.refs.host!),
      done = step(pending, 'accept-effect', count === 2 ? [s.refs.enemy!, s.refs.enemy!] : []);
    expect(done.cards[s.refs.enemy!]!.damage).toBe(count === -1 ? 0 : count === 2 ? 1 : 3);
    expect(done.execution.decision!.kind).toBe('action');
  }
});
test('Trace’s unit role has no healing trigger; ordinary play and Piloting keep distinct cost and attachment statistics', () => {
  const p = position();
  p.players[0].ground = [{ card: trace, ref: 'unit', damage: 2 }];
  const s = scenario(p),
    done = attack(s.state, s.refs.unit!);
  expect(done.cards[s.refs.unit!]!.damage).toBe(2);
  expect(done.execution.decision!.playerId).toBe('bob');
  const q = position();
  q.players[0].hand = [{ card: trace, ref: 'pilot' }];
  q.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  q.players[0].resources = Array.from({ length: 3 }, () => ({ card: ids.marine }));
  const t = scenario(q);
  expect(
    t.state.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .every(o => o.intent.kind === 'play' && !!o.intent.piloting),
  ).toBe(true);
  const played = step(t.state, 'play');
  expect(played.cards[t.refs.pilot!]!.attachedTo!.instanceId).toBe(t.refs.host!);
  expect(unitStats(played, played.cards[t.refs.host!]!)).toMatchObject({ power: 3, hp: 3 });
});
test('checkpoints reject a forged opponent-search chooser and altered distribution caps', () => {
  const s = scenario(board()),
    allocation = step(s.state, 'play'),
    bad = structuredClone(allocation);
  bad.execution.decision!.selection!.max = 6;
  expect(() => decodeState(encodeState(bad))).toThrow();
  const search = step(allocation, 'accept-effect', [s.refs.one!]);
  search.execution.decision!.playerId = 'alice';
  expect(() => decodeState(encodeState(search))).toThrow();
});
