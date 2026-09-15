import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, unitKeywords } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { changeResourceController } from '../engine/state.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const thrawn = 'grand-admiral-thrawn--patient-and-insightful',
  hunter = 'hunter--outcast-sergeant',
  ahsoka = 'ahsoka-tano--i-have-an-idea',
  aphra = 'doctor-aphra--rapacious-archaeologist',
  sabine = 'sabine-wren--i-learned-the-hard-way',
  otherSabine = 'sabine-wren--spectre-five';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
const view = (s: GameState, player?: string) =>
  new Projector(
    s.gameId,
    player ? { role: 'player', playerId: player } : { role: 'spectator' },
    'v'.repeat(32),
  ).project(s);
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
function effects(s: GameState, e: CardEffect[], source: CardInstance = leader(s)) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: source.controller,
      source: structuredClone(source),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function attack(s: GameState, defender = s.players.bob!.base) {
  return step(
    s,
    i => i.kind === 'attack' && i.attacker === leader(s).instanceId && i.defender === defender,
  );
}
function randomInput(s: GameState, index: number): EngineInput {
  return {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: [index],
  };
}
for (const deployed of [false, true])
  test(`Thrawn privately peeks at both decks when the action phase starts (${deployed})`, () => {
    const p = board(thrawn, deployed);
    p.players[0].deck = [
      { card: ids.fighter },
      { card: ids.fighter },
      { card: ids.consular, ref: 'own-top' },
    ];
    p.players[1].deck = [
      { card: ids.marine },
      { card: ids.marine },
      { card: ids.trooper, ref: 'enemy-top' },
    ];
    const g = scenario(p);
    let s = g.state;
    while (s.round === 1)
      s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []);
    expect(s.execution.frames[0]!.kind).toBe('zone-inspection');
    expect(JSON.stringify(view(s, 'alice'))).toContain('Consular Security Force');
    const hidden = structuredClone(s);
    hidden.cards[g.refs['own-top']!]!.cardId = ids.trooper;
    expect(view(s, 'bob')).toEqual(view(hidden, 'bob'));
    expect(view(s)).toEqual(view(hidden));
    s = step(s, 'accept-effect');
    expect(JSON.stringify(view(s, 'alice'))).toContain('Death Star Stormtrooper');
    const changed = structuredClone(s);
    changed.cards[g.refs['enemy-top']!]!.cardId = ids.consular;
    expect(view(s, 'bob')).toEqual(view(changed, 'bob'));
    expect(view(s)).toEqual(view(changed));
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    expect(s.players.alice!.deck[0]).toBe(g.refs['own-top']!);
    expect(s.players.bob!.deck[0]).toBe(g.refs['enemy-top']!);
  });
for (const player of ['self', 'enemy'])
  test(`Thrawn reveals the chosen ${player} deck and exhausts an eligible exact unit`, () => {
    const p = board(thrawn);
    p.players[player === 'self' ? 0 : 1].deck = [{ card: ids.consular, ref: 'revealed' }];
    p.players[1].ground = [
      { card: ids.consular, ref: 'equal' },
      { card: ids.consular, ref: 'other' },
      { card: sabine, ref: 'too-expensive' },
    ];
    const g = scenario(p);
    let s = mode(use(g.state), `${player}-deck`);
    expect(s.facts.findLast(f => f.type === 'revealed')!.cards[0]!.instanceId).toBe(
      g.refs.revealed!,
    );
    expect(
      s.execution
        .decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []))
        .sort(),
    ).toEqual([g.refs.equal!, g.refs.other!].sort());
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.equal),
    );
    s = target(s, g.refs.equal!);
    expect(s.cards[g.refs.equal!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.other!]!.exhausted).toBe(false);
  });
for (const accept of [false, true])
  test(`Thrawn On Attack may decline the reveal (${accept})`, () => {
    const p = board(thrawn, true);
    p.players[0].deck = [{ card: ids.marine }];
    p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
    const g = scenario(p);
    let s = attack(g.state);
    if (accept) {
      s = step(s, 'accept-effect');
      s = mode(s, 'self-deck');
      s = target(s, g.refs.target!);
    } else s = step(s, 'decline-effect');
    expect(s.cards[g.refs.target!]!.exhausted).toBe(accept);
  });
test('Thrawn revealing an empty deck does not exhaust a zero-cost unit', () => {
  const p = board(thrawn);
  p.players[0].deck = [];
  p.players[1].ground = [{ card: 'battle-droid', ref: 'zero' }];
  const g = scenario(p);
  const s = mode(use(g.state), 'self-deck');
  expect(s.cards[g.refs.zero!]!.exhausted).toBe(false);
  expect(s.execution.decision!.kind).toBe('action');
});
for (const foreign of [false, true])
  test(`Hunter exchanges one revealed resource by printed title and returns it to its owner (${foreign})`, () => {
    const p = board(hunter);
    p.players[0].ground = [{ card: sabine, ref: 'unit' }];
    if (foreign) p.players[1].resources = [{ card: otherSabine, ref: 'resource' }];
    else p.players[0].resources![0] = { card: otherSabine, ref: 'resource' };
    p.players[0].deck = [{ card: ids.fighter, ref: 'replacement' }];
    const g = scenario(p);
    if (foreign) changeResourceController(g.state, g.state.cards[g.refs.resource!]!, 'alice');
    const count = g.state.players.alice!.resources.length;
    let s = use(g.state);
    resume(s, choose(s, 'accept-effect', [g.refs.resource!]));
    s = step(s, 'accept-effect', [g.refs.resource!]);
    expect(s.cards[g.refs.resource!]!).toMatchObject({
      zone: 'hand',
      owner: foreign ? 'bob' : 'alice',
      controller: foreign ? 'bob' : 'alice',
    });
    expect(s.players.alice!.resources).toHaveLength(count);
    expect(s.cards[g.refs.replacement!]!).toMatchObject({
      zone: 'resources',
      owner: 'alice',
      controller: 'alice',
      exhausted: true,
    });
    expect(
      s.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
    ).toEqual([g.refs.resource!]);
  });
for (const matching of ['nonunique', 'enemy', 'different-title'] as const)
  test(`Hunter cannot exchange a resource against a ${matching} unit`, () => {
    const p = board(hunter);
    p.players[0].resources![0] = {
      card: matching === 'nonunique' ? ids.marine : otherSabine,
      ref: 'resource',
    };
    p.players[matching === 'enemy' ? 1 : 0].ground = [
      {
        card:
          matching === 'nonunique'
            ? ids.marine
            : matching === 'different-title'
              ? 'luke-skywalker--you-still-with-me-'
              : sabine,
      },
    ];
    const g = scenario(p);
    const s = step(use(g.state), 'accept-effect', [g.refs.resource!]);
    expect(s.cards[g.refs.resource!]!.zone).toBe('resources');
    expect(s.players.alice!.deck).toHaveLength(12);
  });
test('Hunter resource choice hides the unselected pool from opponents and spectators', () => {
  const p = board(hunter);
  p.players[0].resources![0] = { card: sabine, ref: 'secret' };
  const g = scenario(p);
  const s = use(g.state);
  const changed = structuredClone(s);
  changed.cards[g.refs.secret!]!.cardId = ids.fighter;
  expect(view(s, 'bob')).toEqual(view(changed, 'bob'));
  expect(view(s)).toEqual(view(changed));
  expect(view(s, 'alice')).not.toEqual(view(changed, 'alice'));
});
test('Hunter unit has Overwhelm and may decline the resource exchange', () => {
  const s0 = scenario(board(hunter, true)).state;
  expect(unitKeywords(s0, leader(s0))).toContain('Overwhelm');
  const s = step(attack(s0), 'decline-effect');
  expect(s.players.alice!.resources).toHaveLength(12);
  expect(s.facts.filter(f => f.type === 'revealed')).toHaveLength(0);
});
function eventPeek(top = ids.marine) {
  const p = board(ahsoka);
  p.players[0].hand = [{ card: 'open-fire', ref: 'event' }];
  p.players[0].deck = [
    { card: top, ref: 'top' },
    { card: ids.fighter, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = step(g.state, 'play');
  expect(s.execution.decision!.kind).toBe('effect');
  expect(leader(s).exhausted).toBe(false);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.damage).toBe(4);
  s = step(s, 'accept-effect');
  expect(leader(s).exhausted).toBe(true);
  return { state: s, refs: g.refs };
}
for (const choice of ['play', 'discard', 'leave'])
  test(`Ahsoka resolves the event first, then privately chooses to ${choice} the top card`, () => {
    const g = eventPeek();
    let s = g.state;
    const changed = structuredClone(s);
    changed.cards[g.refs.top!]!.cardId = ids.consular;
    expect(view(s, 'bob')).toEqual(view(changed, 'bob'));
    expect(view(s)).toEqual(view(changed));
    s = step(s, 'accept-effect', [g.refs.top!]);
    s = mode(s, choice);
    if (choice === 'play') {
      resume(s, choose(s, 'play'));
      s = step(s, 'play');
    }
    expect(s.cards[g.refs.top!]!.zone).toBe(
      choice === 'play' ? 'ground' : choice === 'discard' ? 'discard' : 'deck',
    );
    expect(s.cards[g.refs.other!]!.zone).toBe('deck');
    if (choice === 'leave') expect(s.players.alice!.deck[0]).toBe(g.refs.top!);
  });
test('Ahsoka attack-end play receives a discount and survives her own departure', () => {
  const p = board(ahsoka, true);
  p.players[0].leader.damage = 5;
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.defender!);
  expect(leader(s).zone).toBe('base');
  s = step(s, 'accept-effect', [g.refs.top!]);
  s = mode(s, 'play');
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(1);
  expect(s.cards[g.refs.top!]!.zone).toBe('ground');
});
test('Ahsoka can play a looked-at Pilot as an upgrade for its discounted alternate cost', () => {
  const p = board(ahsoka, true);
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].deck = [{ card: 'clone-pilot', ref: 'top' }];
  const g = scenario(p);
  let s = attack(g.state);
  s = step(s, 'accept-effect', [g.refs.top!]);
  s = mode(s, 'play');
  s = step(s, i => i.kind === 'play' && !!i.piloting);
  expect(s.cards[g.refs.top!]!.attachedTo!.instanceId).toBe(g.refs.host!);
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(1);
});
test('Ahsoka cannot play an unaffordable looked-at card and may leave it there', () => {
  const p = board(ahsoka, true);
  p.players[0].resources!.forEach(c => (c.exhausted = true));
  p.players[0].deck = [{ card: sabine, ref: 'top' }];
  const g = scenario(p);
  let s = attack(g.state);
  s = step(s, 'accept-effect', [g.refs.top!]);
  s = mode(s, 'play');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.top!]!.zone).toBe('deck');
});
test('An inspected deck reference cannot authorize a later hidden copy after its visibility changes', () => {
  const g = eventPeek();
  let s = step(g.state, 'accept-effect', [g.refs.top!]);
  s = mode(s, 'play');
  s.cards[g.refs.top!]!.visibility++;
  s.execution.decision = null;
  settle(s);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.top!]!.zone).toBe('deck');
});
test('Ahsoka looking at an empty deck does not cause fatigue or invent a card choice', () => {
  const p = board(ahsoka, true);
  p.players[0].deck = [];
  let s = attack(scenario(p).state);
  s = step(s, 'accept-effect', []);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});
function aphraChoice() {
  const p = board(aphra);
  p.players[0].discard = [
    { card: sabine, ref: 'first' },
    { card: otherSabine, ref: 'same-name' },
    { card: ids.marine, ref: 'second' },
    { card: ids.fighter, ref: 'third' },
  ];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  s = step(s, 'accept-effect', [g.refs.first!]);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs['same-name']!);
  s = step(s, 'accept-effect', [g.refs.second!]);
  s = step(s, 'accept-effect', [g.refs.third!]);
  return { state: s, refs: g.refs };
}
for (const index of [0, 1, 2])
  test(`Aphra returns the uniformly selected one of three distinct titles (${index})`, () => {
    const g = aphraChoice();
    let s = g.state;
    expect(s.execution.random!.bounds).toEqual([3]);
    const input = randomInput(s, index);
    resume(s, input);
    s = advance(s, input).state;
    const choices = [g.refs.first!, g.refs.second!, g.refs.third!];
    expect(s.players.alice!.hand).toEqual([choices[index]!]);
    expect(s.players.alice!.discard).toHaveLength(3);
    expect(s.cards[g.refs['same-name']!]!.zone).toBe('discard');
  });
test('Aphra rejects duplicate random pools, forged cards and out-of-range randomness', () => {
  const g = aphraChoice();
  const s = g.state;
  expect(() => advance(s, randomInput(s, 3))).toThrow();
  for (const kind of ['duplicate', 'wrong-visibility'] as const) {
    const invalid = structuredClone(s);
    const frame = invalid.execution.frames[0]!;
    if (frame.kind !== 'random-card') throw Error();
    if (kind === 'duplicate') frame.cards[1] = frame.cards[0]!;
    else frame.cards[0]!.visibility++;
    expect(() => decodeState(encodeState(invalid))).toThrow();
  }
});
test('Aphra requires three distinct names, ignoring subtitles', () => {
  const p = board(aphra);
  p.players[0].discard = [{ card: sabine }, { card: otherSabine }, { card: ids.marine }];
  const s = use(scenario(p).state, 'deploy');
  expect(s.execution.random).toBeNull();
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Aphra power counts different printed costs and updates when a cost leaves the discard pile', () => {
  const p = board(aphra);
  p.players[0].discard = [
    { card: ids.fighter, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'resupply', ref: 'three' },
    { card: ids.consular },
    { card: sabine },
  ];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  expect(unitStats(s, leader(s)).power).toBe(5);
  for (const ref of ['one', 'two', 'three']) s = step(s, 'accept-effect', [g.refs[ref]!]);
  s = advance(s, randomInput(s, 0)).state;
  expect(unitStats(s, leader(s)).power).toBe(2);
});
test('Aphra front mills at regroup start before the normal draw', () => {
  const p = board(aphra);
  p.players[0].deck = [
    { card: ids.fighter, ref: 'milled' },
    { card: ids.marine },
    { card: ids.consular },
  ];
  const g = scenario(p);
  let s = step(step(g.state, 'pass'), 'pass');
  expect(s.cards[g.refs.milled!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.phaseHistory.cardsDrawn.alice).toBe(2);
});

test('Ahsoka bounded deck play uses Credits without authorizing another deck copy', () => {
  const p = board(ahsoka, true);
  p.players[0].resources!.forEach(c => (c.exhausted = true));
  p.players[0].credits = ['payment'];
  p.players[0].deck = [
    { card: ids.marine, ref: 'top' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p);
  let s = attack(g.state);
  s = step(s, 'accept-effect', [g.refs.top!]);
  s = mode(s, 'play');
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .map(o => (o.intent.kind === 'play' ? o.intent.card : '')),
  ).toEqual([g.refs.top!]);
  s = step(s, 'play');
  resume(s, choose(s, 'accept-effect', [g.refs.payment!]));
  s = step(s, 'accept-effect', [g.refs.payment!]);
  expect(s.cards[g.refs.top!]!.zone).toBe('ground');
  expect(s.cards[g.refs.other!]!.zone).toBe('deck');
  expect(s.cards[g.refs.payment!]!.zone).toBe('set-aside');
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(0);
});
test('Hunter still returns the matching resource when his replacement deck is empty', () => {
  const p = board(hunter);
  p.players[0].ground = [{ card: sabine }];
  p.players[0].resources![0] = { card: otherSabine, ref: 'resource' };
  p.players[0].deck = [];
  const g = scenario(p);
  const s = step(use(g.state), 'accept-effect', [g.refs.resource!]);
  expect(s.cards[g.refs.resource!]!.zone).toBe('hand');
  expect(s.players.alice!.resources).toHaveLength(11);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});
