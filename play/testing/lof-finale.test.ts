import { cardTraits } from '../engine/attributes.ts';
import { recordDraw } from '../engine/draw.ts';
import { effectFrames } from '../engine/triggers.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { addCard, reference, move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import { lofContinuations } from './lof-continuations.ts';
import { forceToken } from '../engine/force.ts';
import { modifyUnit } from '../engine/lasting.ts';
function drain(state: GameState): GameState {
  let s = state;
  for (let n = 0; n < 60; n++) {
    if (s.execution.random) {
      s = advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      }).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger-player') {
      s = advance(s, choose(s, 'trigger-player')).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger') {
      s = advance(s, choose(s, 'trigger')).state;
      continue;
    }
    return s;
  }
  throw Error('Unsettled helper');
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => drain(advance(s, choose(s, p, selected)).state);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && (!host || i.target === host));
const attack = (s: GameState, id: string, defender?: string) =>
  step(
    s,
    i =>
      i.kind === 'attack' && i.attacker === id && i.defender === (defender ?? s.players.bob!.base),
  );
const select = (s: GameState, ...ids: string[]) => step(s, 'accept-effect', ids);
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
const spies = (s: GameState, player = 'alice') =>
  s.ground.filter(id => s.cards[id]!.controller === player && s.cards[id]!.cardId === 'spy').length;
function board(card: string, inHand = true) {
  const p = position();
  p.players[0].resources = Array.from({ length: 22 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inHand) p.players[0].hand = [{ card, ref: 'source' }];
  else if (d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else throw Error();
  return p;
}
const mode = (s: GameState, value: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === value);
const moveToHand = (s: GameState, id: string) => {
  move(s, s.cards[id]!, 'hand');
  recordDraw(s, s.cards[id]!.owner, [s.cards[id]!]);
};
const nextOwn = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.card === s.players.bob!.leader);
test('A Precarious Predicament lets the chosen enemy controller accept the return', () => {
  const p = board('a-precarious-predicament');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  expect(s.execution.decision!.playerId).toBe('bob');
  s = mode(s, 'return-to-hand');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
  expect(s.players.bob!.hand).toContain(g.refs.enemy!);
});
for (const from of ['hand', 'resources'] as const)
  test(`A Precarious Predicament plays It's Worse from ${from} for free`, () => {
    const p = board('a-precarious-predicament');
    p.players[0][from] = [
      ...(p.players[0][from] ?? []),
      { card: 'it-s-worse', ref: 'worse', exhausted: true },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    const resourceCount = s.players.alice!.resources.length,
      ready = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
    s = mode(mode(s, 'it-could-be-worse'), `play-from-${from}`);
    s = target(play(s, g.refs.worse!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
    expect(s.players.alice!.resources.length).toBe(resourceCount - (from === 'resources' ? 1 : 0));
    expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length).toBe(ready);
  });
test('A Precarious Predicament may be declined after the opponent chooses worse', () => {
  const p = board('a-precarious-predicament');
  p.players[0].hand!.push({ card: 'it-s-worse' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = mode(
    mode(target(play(g.state, g.refs.source!), g.refs.enemy!), 'it-could-be-worse'),
    'play-from-hand',
  );
  s = step(s, 'decline-effect');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('ground');
});
function foreseen(card = ids.marine as string, force = true) {
  const p = board('as-i-have-foreseen');
  p.players[0].force = force;
  p.players[0].deck = [
    { card, ref: 'top' },
    { card: ids.trooper, ref: 'other' },
  ];
  return scenario(p);
}
test('As I Have Foreseen inspects privately before Force payment and plays only that top card', () => {
  const g = foreseen();
  let s = play(g.state, g.refs.source!);
  const enemy = new Projector(s.gameId, { role: 'player', playerId: 'bob' }).project(s);
  expect(enemy.decision).toBeNull();
  expect(enemy.privateDeckTop).toBeNull();
  s = select(s, g.refs.top!);
  expect(forceToken(s, 'alice')).toBeDefined();
  s = step(s, 'accept-effect');
  expect(forceToken(s, 'alice')).toBeUndefined();
  expect(s.execution.decision!.options.map(o => o.intent)).toContainEqual({
    kind: 'play',
    card: g.refs.top!,
  });
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.other,
    ),
  ).toBe(false);
  const before = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  s = play(s, g.refs.top!);
  expect(s.cards[g.refs.top!]!.zone).toBe('ground');
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length).toBe(before);
  expect(s.phaseHistory.cardsDrawn.alice ?? 0).toBe(0);
});
test('As I Have Foreseen can decline Force use after inspection', () => {
  const g = foreseen();
  let s = select(play(g.state, g.refs.source!), g.refs.top!);
  s = step(s, 'decline-effect');
  expect(forceToken(s, 'alice')).toBeDefined();
  expect(s.players.alice!.deck[0]).toBe(g.refs.top!);
});
test('As I Have Foreseen with no Force token finishes after the look', () => {
  const g = foreseen(ids.marine, false),
    s = select(play(g.state, g.refs.source!), g.refs.top!);
  expect(s.execution.decision?.kind).toBe('action');
  expect(s.players.alice!.deck[0]).toBe(g.refs.top!);
});
function path() {
  const p = board('following-the-path');
  p.players[0].deck = [
    { card: 'jedi-guardian', ref: 'a' },
    { card: 'jedi-sentinel', ref: 'b' },
    ...Array.from({ length: 6 }, (_, i) => ({ card: ids.marine, ref: `rest-${i}` })),
    { card: ids.trooper, ref: 'unseen' },
  ];
  return scenario(p);
}
for (const count of [0, 1, 2])
  test(`Following the Path returns ${count} revealed Force units and randomizes only the remainder`, () => {
    const g = path();
    let s = play(g.state, g.refs.source!);
    s = step(s, 'search', [g.refs.a!, g.refs.b!].slice(0, count));
    if (count === 2) {
      expect(s.execution.decision?.kind).toBe('effect');
      s = target(s, g.refs.b!);
      expect(s.players.alice!.deck.slice(0, 3)).toEqual([g.refs.b!, g.refs.a!, g.refs.unseen!]);
    } else expect(s.players.alice!.deck[count]).toBe(g.refs.unseen!);
    expect(s.players.alice!.hand).toHaveLength(0);
    expect(s.phaseHistory.cardsDrawn.alice ?? 0).toBe(0);
    expect(
      s.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
    ).toEqual([g.refs.a!, g.refs.b!].slice(0, count));
  });
test('Following the Path rejects an unselected card during ordering and conceals the chosen order', () => {
  const g = path();
  const before = step(play(g.state, g.refs.source!), 'search', [g.refs.a!, g.refs.b!]);
  expect(() => target(before, g.refs.unseen!)).toThrow();
  const a = target(before, g.refs.a!),
    b = target(before, g.refs.b!);
  expect(a.players.alice!.deck).not.toEqual(b.players.alice!.deck);
  const viewer = new Projector(g.state.gameId, { role: 'spectator' });
  expect(viewer.project(a)).toEqual(viewer.project(b));
});
function luminous() {
  const p = board('luminous-beings');
  p.players[0].discard = [
    { card: 'jedi-guardian', ref: 'a' },
    { card: 'jedi-sentinel', ref: 'b' },
    { card: ids.marine, ref: 'wrong' },
  ];
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return scenario(p);
}
test('Luminous Beings randomizes selected Force units then buffs that many distinct units', () => {
  const g = luminous();
  let s = play(g.state, g.refs.source!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.wrong!);
  s = select(s, g.refs.a!, g.refs.b!);
  expect(s.execution.decision!.selection).toMatchObject({ min: 2, max: 2 });
  s = select(s, g.refs.friendly!, g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.friendly!]!)).toEqual({ power: 7, hp: 7 });
  expect(unitStats(s, s.cards[g.refs.enemy!]!)).toEqual({ power: 7, hp: 7 });
  expect(new Set(s.players.alice!.deck.slice(-2))).toEqual(new Set([g.refs.a!, g.refs.b!]));
  expect(s.players.alice!.discard).toContain(g.refs.wrong!);
});
test('Luminous Beings may return zero cards and gives no bonus', () => {
  const g = luminous(),
    s = select(play(g.state, g.refs.source!));
  expect(s.lastingEffects).toHaveLength(0);
  expect(s.cards[g.refs.a!]!.zone).toBe('discard');
});
function premonition() {
  const p = board('premonition-of-doom');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: 'jedi-guardian', ref: 'protected' },
  ];
  p.attachments = [{ card: 'kylo-ren-s-lightsaber', unit: 'protected' }];
  return scenario(p);
}
test('Premonition persists in discard and exhausts all units when its controller takes initiative', () => {
  const g = premonition();
  let s = nextOwn(play(g.state, g.refs.source!));
  expect(s.phaseTriggers).toHaveLength(1);
  s = decodeState(encodeState(s));
  s = step(s, 'take-initiative');
  expect(s.cards[g.refs.friendly!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.protected!]!.exhausted).toBe(false);
  expect(s.phaseTriggers).toHaveLength(0);
});
test('An opposing initiative claim does not consume Premonition; the phase boundary expires it', () => {
  const g = premonition();
  let s = step(play(g.state, g.refs.source!), 'take-initiative');
  expect(s.phaseTriggers).toHaveLength(1);
  expect(s.cards[g.refs.friendly!]!.exhausted).toBe(false);
  s = step(s, 'pass');
  expect(s.phaseTriggers).toHaveLength(0);
  expect(s.phase).toBe('regroup');
});
function aether(card = 'ravening-gundark') {
  const p = board('qui-gon-jinn-s-aethersprite--guided-by-the-force', false);
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].ground = [{ card: ids.consular, ref: 'a' }];
  p.players[1].ground = [{ card: 'jedi-sentinel', ref: 'b' }];
  p.players[1].hand = [{ card: 'it-s-worse', ref: 'removal' }];
  p.players[1].resources = Array.from({ length: 15 }, () => ({ card: ids.marine }));
  return scenario(p);
}
for (const remove of [false, true])
  test(`Aethersprite repeats the next When Played with new targets, source removed: ${remove}`, () => {
    const g = aether();
    let s = attack(g.state, g.refs.source!);
    expect(s.phaseTriggers).toHaveLength(1);
    s = remove ? target(play(s, g.refs.removal!), g.refs.source!) : nextOwn(s);
    s = target(play(s, g.refs.played!), g.refs.a!);
    expect(s.phaseTriggers).toHaveLength(0);
    expect(s.usedPlayedAbilities).toHaveLength(1);
    s = step(s, 'accept-effect');
    s = target(s, g.refs.b!);
    expect(s.cards[g.refs.a!]!.damage).toBe(1);
    expect(s.cards[g.refs.b!]!.damage).toBe(1);
    expect(s.usedPlayedAbilities).toHaveLength(1);
    expect(s.execution.decision?.kind).toBe('action');
  });
test('Aethersprite may decline repetition and the permission is still consumed', () => {
  const g = aether();
  let s = target(play(nextOwn(attack(g.state, g.refs.source!)), g.refs.played!), g.refs.a!);
  s = step(s, 'decline-effect');
  expect(s.cards[g.refs.a!]!.damage).toBe(1);
  expect(s.cards[g.refs.b!]!.damage).toBe(0);
  expect(s.phaseTriggers).toHaveLength(0);
});
test('Aethersprite does not consume its permission for Shielded', () => {
  const g = aether('gungan-warrior');
  const s = play(nextOwn(attack(g.state, g.refs.source!)), g.refs.played!);
  expect(s.phaseTriggers).toHaveLength(1);
  expect(
    attachedUpgrades(s, s.cards[g.refs.played!]!).filter(c => c.cardId === 'shield'),
  ).toHaveLength(1);
});
function rey(other = false, aggression = true) {
  const p = board('do-or-do-not');
  if (!aggression) p.players[0].leader.card = 'leia-organa--alliance-general';
  p.players[0].deck = [
    { card: 'rey--with-palpatine-s-power', ref: 'rey' },
    { card: ids.marine, ref: 'secret' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  if (other) {
    p.players[0].force = true;
    p.players[0].ground = [{ card: 'the-father--maintaining-balance', ref: 'father' }];
  }
  return scenario(p);
}
function drawRey(g: ReturnType<typeof rey>) {
  const s = play(g.state, g.refs.source!);
  return forceToken(g.state, 'alice') ? step(s, 'accept-effect') : s;
}
test('Rey can remain private when drawn alone and declined', () => {
  const g = rey();
  let s = drawRey(g);
  expect(s.execution.decision!.options.map(o => o.intent)).toContainEqual({
    kind: 'choose-mode',
    mode: 'keep-hidden',
  });
  const viewer = new Projector(g.state.gameId, { role: 'spectator' });
  expect(
    viewer
      .project(s)
      .events.some(e => e.cards.some(c => c.cardId === 'rey--with-palpatine-s-power')),
  ).toBe(false);
  s = mode(s, 'keep-hidden');
  expect(
    viewer
      .project(s)
      .events.some(e => e.cards.some(c => c.cardId === 'rey--with-palpatine-s-power')),
  ).toBe(false);
  expect(s.cards[g.refs.rey!]!.zone).toBe('hand');
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
});
test('Rey reveals the exact drawn copy before damaging a unit and a chosen base', () => {
  const g = rey();
  let s = mode(drawRey(g), 'reveal-rey');
  s = target(s, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
  s = target(s, s.players.alice!.base);
  expect(s.cards[g.refs.unit!]!.damage).toBe(2);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
  expect(
    new Projector(g.state.gameId, { role: 'spectator' })
      .project(s)
      .events.some(
        e => e.type === 'revealed' && e.cards.some(c => c.cardId === 'rey--with-palpatine-s-power'),
      ),
  ).toBe(true);
  expect(s.cards[g.refs.rey!]!.zone).toBe('hand');
});
test('Rey must be announced when another trigger is already waiting, without exposing other drawn cards', () => {
  const g = rey(true);
  let s = play(g.state, g.refs.source!);
  s = advance(s, choose(s, 'accept-effect')).state;
  const view = new Projector(g.state.gameId, { role: 'spectator' }).project(s);
  expect(
    view.events.some(
      e => e.type === 'triggered' && e.cards.some(c => c.cardId === 'rey--with-palpatine-s-power'),
    ),
  ).toBe(true);
  expect(view.events.filter(e => e.type === 'drawn').every(e => e.cards.length === 0)).toBe(true);
  expect(
    view.cards
      .filter(c => c.controller === 'alice' && c.zone === 'hand')
      .every(c => c.face === null),
  ).toBe(true);
});
test('Rey cannot reveal a later hand incarnation after the drawn card leaves', () => {
  const g = rey();
  let s = drawRey(g);
  move(s, s.cards[g.refs.rey!]!, 'discard');
  move(s, s.cards[g.refs.rey!]!, 'hand');
  s = mode(s, 'reveal-rey');
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
  expect(s.execution.decision?.kind).toBe('action');
});
test('Rey needs an Aggression leader or base when her ability resolves', () => {
  const g = rey(false, false);
  const s = drawRey(g);
  expect(s.execution.decision?.kind).toBe('action');
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
});
test('Rey drawn in regroup does not trigger', () => {
  const p = position();
  p.players[0].deck = [{ card: 'rey--with-palpatine-s-power', ref: 'rey' }, { card: ids.marine }];
  const g = scenario(p),
    s = step(step(g.state, 'pass'), 'pass');
  expect(s.phase).toBe('regroup');
  expect(
    s.facts.some(f => f.type === 'triggered' && f.cards.some(c => c.instanceId === g.refs.rey)),
  ).toBe(false);
});
test('Two scheduled Aethersprite triggers each repeat once and cannot reconsume each other', () => {
  const g = aether();
  let s = nextOwn(attack(g.state, g.refs.source!));
  s.cards[g.refs.source!]!.exhausted = false;
  s.execution.decision = null;
  settle(s);
  s = step(attack(s, g.refs.source!), 'pass');
  expect(s.phaseTriggers).toHaveLength(2);
  s = target(play(s, g.refs.played!), g.refs.a!);
  expect(s.phaseTriggers).toHaveLength(0);
  s = target(step(s, 'accept-effect'), g.refs.a!);
  s = target(step(s, 'accept-effect'), g.refs.b!);
  expect(s.cards[g.refs.a!]!.damage).toBe(2);
  expect(s.cards[g.refs.b!]!.damage).toBe(1);
  expect(s.usedPlayedAbilities).toHaveLength(1);
});
test('Luminous Beings hides the randomized bottom order from every viewer', () => {
  const g = luminous();
  const s = advance(
    play(g.state, g.refs.source!),
    choose(play(g.state, g.refs.source!), 'accept-effect', [g.refs.a!, g.refs.b!]),
  ).state;
  expect(s.execution.random?.bounds).toEqual([2]);
  const random = s.execution.random!;
  const states = [0, 1].map(
    value =>
      advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: random.id,
        values: [value],
      }).state,
  );
  expect(states[0]!.players.alice!.deck).not.toEqual(states[1]!.players.alice!.deck);
  for (const viewer of [
    { role: 'player', playerId: 'alice' },
    { role: 'player', playerId: 'bob' },
    { role: 'spectator' },
  ] as const) {
    const projector = new Projector(s.gameId, viewer);
    expect(projector.project(states[0]!)).toEqual(projector.project(states[1]!));
  }
});
for (const change of ['expiry', 'identity', 'owner'] as const)
  test(`Phase trigger checkpoints reject forged ${change}`, () => {
    const g = premonition(),
      s = play(g.state, g.refs.source!);
    const bad = JSON.parse(encodeState(s));
    if (change === 'expiry') bad.phaseTriggers[0].round++;
    if (change === 'identity')
      bad.phaseTriggers[0].trigger.abilities[1].scheduledId = 'not-an-ability';
    if (change === 'owner') bad.phaseTriggers[0].trigger.playerId = 'bob';
    expect(() => decodeState(JSON.stringify(bad))).toThrow();
  });
test('Rey reveal choices and logs do not disclose an unrelated hidden card', () => {
  const g = rey(),
    s = drawRey(g),
    other = structuredClone(s);
  other.cards[g.refs.secret!]!.cardId = ids.fighter;
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const) {
    const projector = new Projector(s.gameId, viewer);
    expect(projector.project(s)).toEqual(projector.project(other));
    expect(projector.project(mode(s, 'keep-hidden'))).toEqual(
      projector.project(mode(other, 'keep-hidden')),
    );
  }
});
test('As I Have Foreseen can use the Force even when an empty deck leaves nothing to play', () => {
  const g = foreseen();
  for (const id of [...g.state.players.alice!.deck]) move(g.state, g.state.cards[id]!, 'discard');
  let s = select(play(g.state, g.refs.source!));
  s = step(s, 'accept-effect');
  expect(forceToken(s, 'alice')).toBeUndefined();
  expect(s.execution.decision?.kind).toBe('action');
});
test('As I Have Foreseen does not ignore the remaining resource cost after its discount', () => {
  const g = foreseen('supremacy--of-unimaginable-size');
  g.state.players.alice!.resources.slice(5).forEach(id => (g.state.cards[id]!.exhausted = true));
  let s = select(play(g.state, g.refs.source!), g.refs.top!);
  s = step(s, 'accept-effect');
  expect(forceToken(s, 'alice')).toBeUndefined();
  expect(s.cards[g.refs.top!]!.zone).toBe('deck');
  expect(s.execution.decision?.kind).toBe('action');
});
test('Rey still damages a base when no units are available', () => {
  const g = rey();
  move(g.state, g.state.cards[g.refs.unit!]!, 'discard');
  let s = mode(drawRey(g), 'reveal-rey');
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
});
