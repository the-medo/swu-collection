import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { move } from '../engine/state.ts';
import { keywordNames } from '../engine/effective-abilities.ts';
import { createCredits } from '../engine/credits.ts';
import type { CardEffect, SimpleAbilities } from '../cards/definition.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const morgan = 'morgan-elsbeth--following-the-call';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
const play = (s: GameState, id: string) =>
  step(s, i => i.kind === 'play' && i.card === id && !i.target);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const paid = (s: GameState, id: string) =>
  s.facts.filter(f => f.type === 'played' && f.cards.some(c => c.instanceId === id)).at(-1)!.amount;
function board(deployed = false) {
  const p = position();
  p.players[0].leader = { card: morgan, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: 'tech--source-of-insight', ref: 'witness' }];
  p.players[0].hand = [
    { card: 'collections-starhopper', ref: 'card' },
    { card: ids.marine, ref: 'plain' },
  ];
  return p;
}
function refresh(s: GameState) {
  s.execution.decision = null;
  settle(s);
  return s;
}
function effects(s: GameState, e: CardEffect[]) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: 'alice',
      source: structuredClone(leader(s)),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
}
function grant(s: GameState, id: string, abilities: SimpleAbilities) {
  modifyUnit(s, leader(s), s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities,
    duration: 'phase',
  });
  refresh(s);
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
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function attack(s: GameState, id: string) {
  s = step(s, i => i.kind === 'attack' && i.attacker === id && i.defender === s.players.bob!.base);
  return step(s, 'pass');
}
const activate = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
function next(s: GameState) {
  return attack(s, leader(s).instanceId);
}

test('Morgan front selects only friendly units that attacked and filters the exact shared keyword before a discounted play', () => {
  const p = board();
  p.players[0].ground!.push({ card: ids.marine, ref: 'idle' });
  p.players[1].ground = [{ card: 'tech--source-of-insight', ref: 'enemy' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.witness!);
  s = activate(s);
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => o.intent.kind === 'target' && o.intent.card),
  ).toEqual([g.refs.witness!]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.witness),
  );
  s = target(s, g.refs.witness!);
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .map(o => o.intent.kind === 'play' && o.intent.card),
  ).toEqual([g.refs.card!]);
  resume(s, choose(s, 'play'));
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(1);
  expect(leader(s).exhausted).toBe(true);
});

test('Morgan front cannot use an unearned attack and can end the modified play without a matching keyword', () => {
  const g = scenario(board());
  const empty = activate(g.state);
  expect(empty.activePlayer).toBe('bob');
  expect(empty.players.alice!.hand).toContain(g.refs.card!);
  let s = attack(g.state, g.refs.witness!);
  s = activate(s);
  s = target(s, g.refs.witness!);
  s = step(s, 'decline-effect');
  expect(s.players.alice!.hand).toContain(g.refs.card!);
});

for (const shares of [false, true])
  test(`Morgan unit checks live friendly keywords and consumes the next unit modifier (${shares})`, () => {
    const p = board(true);
    if (!shares) p.players[0].ground = [];
    const g = scenario(p);
    let s = next(g.state);
    expect(s.playModifiers).toHaveLength(1);
    resume(
      s,
      choose(s, i => i.kind === 'play' && i.card === g.refs.card),
    );
    s = play(s, g.refs.card!);
    expect(paid(s, g.refs.card!)).toBe(shares ? 1 : 2);
    expect(s.playModifiers).toHaveLength(0);
  });

test('Morgan discount survives her defeat and evaluates a witness leaving after the attack', () => {
  const g = scenario(board(true));
  let s = next(g.state);
  s = effects(s, [{ kind: 'defeat-units', filter: { sameAs: 'source' } }]);
  move(s, s.cards[g.refs.witness!]!, 'discard');
  refresh(s);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(2);
  expect(s.playModifiers).toHaveLength(0);
});

test('Morgan can be defeated while a surviving witness still grants the saved discount', () => {
  const g = scenario(board(true));
  let s = next(g.state);
  s = effects(s, [{ kind: 'defeat-units', filter: { sameAs: 'source' } }]);
  refresh(s);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(1);
});

for (const how of ['instruction', 'next-play'] as const)
  test(`Morgan sees declaration-time keywords from ${how}`, () => {
    const p = board(true);
    p.players[0].ground = [{ card: ids.marine, ref: 'witness' }];
    const g = scenario(p);
    grant(g.state, g.refs.witness!, { keywords: ['Ambush'] });
    let s = next(g.state);
    s = effects(s, [
      ...(how === 'next-play'
        ? [
            {
              kind: 'next-play' as const,
              filter: { kind: 'unit' as const },
              phaseAbilities: { keywords: ['Ambush' as const] },
            },
          ]
        : []),
      {
        kind: 'play-card',
        from: 'hand',
        filter: { kind: 'unit' },
        optional: false,
        ...(how === 'instruction' ? { phaseAbilities: { keywords: ['Ambush' as const] } } : {}),
      },
    ]);
    resume(
      s,
      choose(s, i => i.kind === 'play' && i.card === g.refs.plain),
    );
    s = play(s, g.refs.plain!);
    expect(paid(s, g.refs.plain!)).toBe(3);
    expect(keywordNames(s, s.cards[g.refs.plain!]!)).toContain('Ambush');
  });

test('Morgan does not count a keyword conditional on spending a Credit', () => {
  const p = board(true);
  p.players[0].ground = [{ card: ids.marine, ref: 'witness' }];
  const g = scenario(p);
  grant(g.state, g.refs.witness!, { keywords: ['Ambush'] });
  let s = next(g.state);
  createCredits(s, 'alice', 1);
  refresh(s);
  s = effects(s, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { kind: 'unit' },
      optional: false,
      phaseAbilitiesWithCredit: { keywords: ['Ambush'] },
    },
  ]);
  s = play(s, g.refs.plain!);
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  resume(s, choose(s, 'accept-effect', [s.execution.decision!.selection!.cards[0]!]));
  s = step(s, 'accept-effect', [s.execution.decision!.selection!.cards[0]!]);
  expect(paid(s, g.refs.plain!)).toBe(3);
  expect(keywordNames(s, s.cards[g.refs.plain!]!)).toContain('Ambush');
});

test('Morgan matches numeric keyword names at zero and ignores their different values', () => {
  const p = board(true);
  p.players[0].ground = [{ card: ids.marine, ref: 'witness' }];
  const g = scenario(p);
  grant(g.state, g.refs.witness!, { raid: 0 });
  let s = next(g.state);
  s = effects(s, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { kind: 'unit' },
      optional: false,
      phaseAbilities: { raid: 3 },
    },
  ]);
  s = play(s, g.refs.plain!);
  expect(paid(s, g.refs.plain!)).toBe(3);
});

test('Morgan ignores opposing witnesses and keywords a friendly witness lost', () => {
  const p = board(true);
  p.players[1].ground = [{ card: 'tech--source-of-insight' }];
  const g = scenario(p);
  let s = next(g.state);
  modifyUnit(s, leader(s), s.cards[g.refs.witness!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  refresh(s);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(2);
});

test('Morgan does not consume a next-unit reduction on an event or Pilot upgrade play', () => {
  const p = board(true);
  p.players[0].hand = [
    { card: 'smuggler-s-aid', ref: 'event' },
    { card: 'clone-pilot', ref: 'pilot' },
  ];
  p.players[0].space = [{ card: 'collections-starhopper', ref: 'vehicle' }];
  const g = scenario(p);
  let s = next(g.state);
  s = play(s, g.refs.event!);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.pilot && !!i.target);
  expect(s.playModifiers).toHaveLength(1);
});

test('Morgan front matches Piloting by name but plays the chosen card only as a unit', () => {
  const p = board();
  p.players[0].ground = [{ card: 'clone-pilot', ref: 'witness' }];
  p.players[0].hand = [{ card: 'clone-pilot', ref: 'card' }];
  p.players[0].space = [{ card: 'collections-starhopper', ref: 'vehicle' }];
  const g = scenario(p);
  let s = target(activate(attack(g.state, g.refs.witness!)), g.refs.witness!);
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .every(o => o.intent.kind === 'play' && !o.intent.target),
  ).toBe(true);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(1);
});

test('Morgan next-unit discounts expire at the end of the action phase', () => {
  const g = scenario(board(true));
  let s = next(g.state);
  for (let i = 0; i < 10 && s.round === 1; i++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(2);
  expect(s.playModifiers).toHaveLength(0);
  expect(paid(play(s, g.refs.card!), g.refs.card!)).toBe(2);
});

for (const witness of [false, true])
  test(`Morgan's native keyword discount controls affordability before declaration (${witness})`, () => {
    const p = board(true);
    p.players[0].resources = [{ card: ids.marine }];
    if (!witness) p.players[0].ground = [];
    const g = scenario(p);
    const s = next(g.state);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === g.refs.card,
      ),
    ).toBe(witness);
    if (witness) expect(paid(play(s, g.refs.card!), g.refs.card!)).toBe(1);
  });

test('Two Morgan attack discounts stack and a free play consumes both', () => {
  const g = scenario(board(true));
  let s = next(g.state);
  leader(s).exhausted = false;
  refresh(s);
  s = next(s);
  expect(s.playModifiers).toHaveLength(2);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(0);
  expect(s.playModifiers).toHaveLength(0);
});

test('Morgan does not count a Smuggle resource as its own friendly unit witness', () => {
  const p = board(true);
  p.players[0].resources![0] = { card: 'collections-starhopper', ref: 'resource' };
  p.players[0].ground = [];
  const g = scenario(p);
  let s = next(g.state);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.resource && !!i.smuggle);
  expect(paid(s, g.refs.resource!)).toBe(3);
});

test('Morgan counts Smuggle granted to a resource before it leaves that zone', () => {
  const p = board(true);
  p.players[0].resources![0] = { card: ids.marine, ref: 'resource' };
  const g = scenario(p);
  let s = next(g.state);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.resource && !!i.smuggle);
  expect(paid(s, g.refs.resource!)).toBe(5);
  expect(keywordNames(s, s.cards[g.refs.resource!]!)).not.toContain('Smuggle');
});

test('Morgan matches Coordinate even below its unit-count threshold', () => {
  const p = board(true);
  p.players[0].ground = [];
  p.players[0].hand = [{ card: ids.marine, ref: 'card' }];
  const g = scenario(p);
  grant(g.state, leader(g.state).instanceId, { keywords: ['Coordinate'] });
  let s = next(g.state);
  s = effects(s, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { kind: 'unit' },
      phaseAbilities: { keywords: ['Coordinate'] },
      optional: false,
    },
  ]);
  s = play(s, g.refs.card!);
  expect(paid(s, g.refs.card!)).toBe(3);
});
