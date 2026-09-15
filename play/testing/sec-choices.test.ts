import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
function drain(s: GameState) {
  while (s.execution.decision?.kind === 'trigger' || s.execution.random) {
    s = advance(
      s,
      s.execution.random
        ? {
            type: 'random',
            gameId: s.gameId,
            expectedRevision: s.revision,
            requestId: s.execution.random.id,
            values: s.execution.random.bounds.map(() => 0),
          }
        : choose(s, 'trigger'),
    ).state;
  }
  return s;
}
function step(s: GameState, p: Intent['kind'] | ((i: Intent) => boolean), selected: string[] = []) {
  return drain(advance(s, choose(s, p, selected)).state);
}
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string) => step(s, i => i.kind === 'play' && i.card === id);
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
function board(card: string, inPlay = false) {
  const p = position();
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inPlay && d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else p.players[0].hand = [{ card, ref: 'source' }];
  return p;
}
test('AAT checks actual friendly damage after replacements, including empty and fully prevented allocations', () => {
  for (const mode of ['empty', 'enemy', 'friendly', 'shield'] as const) {
    const p = board('aat-incinerator');
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    if (mode === 'shield') p.attachments = [{ card: 'shield', unit: 'ally', ref: 'shield' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = step(
      play(state, refs.source!),
      'accept-effect',
      mode === 'empty' ? [] : [mode === 'enemy' ? refs.enemy! : refs.ally!],
    );
    expect(s.cards[s.players.alice!.base]!.damage).toBe(mode === 'friendly' ? 0 : 2);
    expect(s.cards[refs.ally!]!.damage).toBe(mode === 'friendly' ? 1 : 0);
  }
});
test('Cikatro lets the opponent pay and keeps the draw under the attacking player’s control', () => {
  for (const pay of [false, true]) {
    const p = board('cikatro-vizago--business-is-what-matters', true);
    p.players[1].resources = [{ card: ids.marine, ref: 'resource' }];
    const { state, refs } = scenario(p);
    const top = state.players.alice!.deck[0]!;
    let s = attack(state, refs.source!, state.players.bob!.base);
    expect(s.execution.decision!.playerId).toBe('bob');
    s = decodeState(encodeState(s));
    s = step(s, pay ? 'accept-effect' : 'decline-effect');
    expect(s.cards[top]!.zone).toBe(pay ? 'deck' : 'hand');
    expect(s.cards[refs.resource!]!.exhausted).toBe(pay);
    expect(s.players.bob!.hand).toHaveLength(0);
  }
});
test('Elia exposes exactly three chosen resources privately and replaces only a defeated resource ready', () => {
  for (const defeat of [false, true]) {
    const p = board('elia-kane--false-convert');
    p.players[1].resources = Array.from({ length: 5 }, (_, i) => ({
      card: ids.marine,
      ref: `r${i}`,
      exhausted: i % 2 === 0,
    }));
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    expect(s.execution.decision!.playerId).toBe('alice');
    expect(s.execution.decision!.selection!.min).toBe(3);
    s = step(s, 'accept-effect', [refs.r0!, refs.r2!, refs.r4!]);
    const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
    expect(view.decision!.inspectedCards).toHaveLength(3);
    expect(new Projector(s.gameId, { role: 'spectator' }).project(s).decision).toBeNull();
    expect(s.execution.frames[0]!.kind).toBe('zone-inspection');
    const before = s.players.bob!.deck[0]!;
    s = step(decodeState(encodeState(s)), 'accept-effect', defeat ? [refs.r2!] : []);
    expect(s.cards[refs.r2!]!.zone).toBe(defeat ? 'discard' : 'resources');
    expect(s.cards[before]!.zone).toBe(defeat ? 'resources' : 'deck');
    expect(s.players.bob!.resources).toHaveLength(5);
    if (defeat) expect(s.cards[before]!.exhausted).toBe(false);
  }
});
test('Hired Slicer reveals the chosen deck, offers only shared traits, then randomizes the exact revealed cards to its bottom', () => {
  const p = board('hired-slicer', true);
  p.players[1].deck = [
    { card: ids.marine, ref: 'top' },
    { card: ids.trooper, ref: 'second' },
    { card: ids.fighter, ref: 'third' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'trooper' }];
  const { state, refs } = scenario(p);
  let s = step(
    attack(state, refs.source!, state.players.bob!.base),
    i => i.kind === 'choose-mode' && i.mode === 'enemy',
  );
  expect(
    s.facts
      .filter(f => f.type === 'revealed')
      .at(-1)!
      .cards.map(c => c.instanceId),
  ).toEqual([refs.top!, refs.second!]);
  s = target(s, refs.trooper!);
  expect(s.cards[refs.trooper!]!.exhausted).toBe(true);
  expect(s.players.bob!.deck).toEqual([refs.third!, refs.second!, refs.top!]);
  expect(s.facts.some(f => f.type === 'searched')).toBe(false);
});
test('Mon Mothma resolves distinct exhausted attackers and their combat before asking for another unit', () => {
  const p = board('mon-mothma--clinging-to-hope');
  p.players[0].ground = [
    { card: ids.marine, ref: 'a', exhausted: true },
    { card: ids.marine, ref: 'b', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.source,
    ),
  ).toBe(false);
  s = target(s, refs.a!);
  expect(
    s.execution.decision!.options.every(
      o => o.intent.kind !== 'attack' || o.intent.defender !== s.players.bob!.base,
    ),
  ).toBe(true);
  s = attack(s, refs.a!, refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(3);
  expect(s.execution.frames[0]!.kind).toBe('attack-series');
  expect(
    s.execution.decision!.options.some(o => o.intent.kind === 'target' && o.intent.card === refs.a),
  ).toBe(false);
  s = target(decodeState(encodeState(s)), refs.b!);
  s = attack(s, refs.b!, refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(6);
  expect(s.activePlayer).toBe('bob');
});
test('Let’s Talk selects all capture pairs before departure, forbids duplicate prisoners and respects arenas', () => {
  const p = board('let-s-talk');
  p.players[0].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'x' },
    { card: ids.marine, ref: 'y' },
  ];
  const { state, refs } = scenario(p);
  let s = target(target(play(state, refs.source!), refs.a!), refs.x!);
  expect(s.cards[refs.x!]!.zone).toBe('ground');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.ship,
    ),
  ).toBe(false);
  s = target(decodeState(encodeState(s)), refs.b!);
  expect(
    s.execution.decision!.options.map(o => (o.intent.kind === 'target' ? o.intent.card : '')),
  ).toEqual([refs.y!]);
  s = target(s, refs.y!);
  expect(s.cards[refs.x!]!.capturedBy?.instanceId).toBe(refs.a);
  expect(s.cards[refs.y!]!.capturedBy?.instanceId).toBe(refs.b);
});
test('Obi-Wan grants a paid exact-card permission ignoring aspects and preserves owner while changing play control', () => {
  const p = board('obi-wan-kenobi--finding-what-doesn-t-exist', true);
  p.players[1].deck = [{ card: ids.consular, ref: 'stolen' }, { card: ids.marine }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.source!, state.players.bob!.base);
  expect(s.cards[refs.stolen!]!.zone).toBe('discard');
  expect(s.grantedPlays).toHaveLength(1);
  s = step(decodeState(encodeState(s)), 'pass');
  s = play(s, refs.stolen!);
  expect(s.cards[refs.stolen!]!.owner).toBe('bob');
  expect(s.cards[refs.stolen!]!.controller).toBe('alice');
  expect(s.cards[refs.stolen!]!.resourcesPaid).toBe(4);
  expect(s.grantedPlays).toHaveLength(0);
});
test('Elia does not reveal unselected resources, and spectators cannot distinguish any of the private resource faces', () => {
  const p = board('elia-kane--false-convert');
  p.players[1].resources = Array.from({ length: 4 }, (_, i) => ({
    card: ids.marine,
    ref: `r${i}`,
  }));
  const g = scenario(p);
  const s = step(play(g.state, g.refs.source!), 'accept-effect', [
    g.refs.r0!,
    g.refs.r1!,
    g.refs.r2!,
  ]);
  const other = structuredClone(s);
  other.cards[g.refs.r3!]!.cardId = ids.fighter;
  const project = (state: GameState, spectator: boolean) =>
    new Projector(
      state.gameId,
      spectator ? { role: 'spectator' } : { role: 'player', playerId: 'alice' },
      'k'.repeat(32),
    ).project(state);
  expect(project(other, false)).toEqual(project(s, false));
  other.cards[g.refs.r0!]!.cardId = ids.trooper;
  // Inspection facts are addressed only to Alice; the visible state remains identical to spectators.
  expect(project(other, true)).toEqual(project(s, true));
});
test('Hired Slicer bottoms a short deck without claiming the incomplete reveal condition, and can decline exhaustion', () => {
  for (const size of [1, 2]) {
    const p = board('hired-slicer', true);
    p.players[1].deck = Array.from({ length: size }, (_, i) => ({
      card: ids.marine,
      ref: `top${i}`,
    }));
    p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
    const g = scenario(p);
    let s = step(
      attack(g.state, g.refs.source!, g.state.players.bob!.base),
      i => i.kind === 'choose-mode' && i.mode === 'enemy',
    );
    if (size === 2) s = step(s, 'decline-effect');
    expect(s.cards[g.refs.unit!]!.exhausted).toBe(false);
    expect(s.players.bob!.deck).toHaveLength(size);
    expect(s.execution.decision!.kind).toBe('action');
  }
});
test('Obi-Wan’s permission also plays an opposing event and an upgrade under the paying player’s control', () => {
  for (const card of ['open-fire', 'academy-training']) {
    const p = board('obi-wan-kenobi--finding-what-doesn-t-exist', true);
    p.players[1].deck = [{ card, ref: 'stolen' }, { card: ids.marine }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = step(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'pass');
    s = step(
      s,
      i =>
        i.kind === 'play' &&
        i.card === g.refs.stolen &&
        (card === 'open-fire' || i.target === g.refs.source),
    );
    if (card === 'open-fire') {
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
      expect(s.cards[g.refs.stolen!]!.incarnation).toBe(
        g.state.cards[g.refs.stolen!]!.incarnation + 1,
      );
      expect(s.grantedPlays).toHaveLength(0);
    } else {
      expect(s.cards[g.refs.stolen!]!.controller).toBe('alice');
      expect(s.cards[g.refs.stolen!]!.attachedTo?.instanceId).toBe(g.refs.source);
    }
    expect(s.cards[g.refs.stolen!]!.owner).toBe('bob');
  }
});
