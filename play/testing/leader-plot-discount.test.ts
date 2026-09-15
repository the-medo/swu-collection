import { createCredits } from '../engine/credits.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { reference } from '../engine/state.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const palp = 'chancellor-palpatine--how-liberty-dies';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
function effects(
  s: GameState,
  e: CardEffect[],
  source: CardInstance = leader(s),
  bindings?: Record<string, ReturnType<typeof reference>>,
) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: source.controller,
      source: structuredClone(source),
      effect,
      bindings,
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
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

function setup(card = 'unveiled-might') {
  const p = board(palp);
  p.players[0].resources![0] = { card, ref: 'plot' };
  p.players[0].resources![1] = { card, ref: 'second' };
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  return p;
}
const deploy = (s: GameState) => step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
function trigger(s: GameState, card: string) {
  const frame = s.execution.frames[0]!;
  if (frame.kind !== 'trigger-batch') throw new Error('Expected trigger order');
  const t = frame.triggers.find(t => t.source.instanceId === card)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const paid = (s: GameState, id: string) =>
  s.facts.filter(f => f.type === 'played' && f.cards.some(c => c.instanceId === id)).at(-1)!.amount;
const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && i.target === host);
function declare(g: ReturnType<typeof scenario>) {
  return step(deploy(g.state), 'accept-effect', [g.refs.plot!, g.refs.second!]);
}
function random(s: GameState) {
  const r = s.execution.random!;
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(() => 0),
  }).state;
}

test('Palpatine searches only the top five cards with Plot, reveals and draws the exact choice', () => {
  const p = board(palp);
  p.players[0].deck = [
    { card: ids.marine },
    { card: 'unveiled-might', ref: 'plot' },
    { card: ids.marine },
    { card: ids.marine },
    { card: 'armor-of-fortune', ref: 'second' },
    { card: 'unveiled-might', ref: 'sixth' },
  ];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.plot!, g.refs.second!]);
  resume(s, choose(s, 'search', [g.refs.second!]));
  s = step(s, 'search', [g.refs.second!]);
  s = random(s);
  expect(s.players.alice!.hand).toContain(g.refs.second!);
  expect(s.players.alice!.deck[0]).toBe(g.refs.sixth!);
  expect(s.phaseHistory.cardsDrawn.alice).toBe(1);
  expect(
    s.facts.some(f => f.type === 'revealed' && f.cards.some(c => c.instanceId === g.refs.second)),
  ).toBe(true);
});

test('Palpatine can decline a matching hidden search', () => {
  const p = board(palp);
  p.players[0].deck![0] = { card: 'unveiled-might' };
  let s = step(scenario(p).state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  s = random(step(s, 'search'));
  expect(s.players.alice!.hand).toHaveLength(0);
});

for (const leaderFirst of [false, true])
  test(`Palpatine discounts the next actual Plot after his deployment trigger resolves (${leaderFirst})`, () => {
    const g = scenario(setup());
    let s = declare(g);
    resume(s, choose(s, 'trigger'));
    s = trigger(s, leaderFirst ? leader(s).instanceId : g.refs.plot!);
    if (leaderFirst) s = trigger(s, g.refs.plot!);
    s = play(s, g.refs.plot!, g.refs.host!);
    expect(paid(s, g.refs.plot!)).toBe(leaderFirst ? 1 : 4);
    if (!leaderFirst) s = trigger(s, leader(s).instanceId);
    s = play(s, g.refs.second!, g.refs.host!);
    expect(paid(s, g.refs.second!)).toBe(leaderFirst ? 4 : 1);
    expect(s.playModifiers).toHaveLength(0);
  });

test('Declining a Plot play does not consume Palpatine’s discount', () => {
  const g = scenario(setup());
  let s = trigger(declare(g), leader(g.state).instanceId);
  s = trigger(s, g.refs.plot!);
  s = step(s, 'decline-effect');
  expect(s.playModifiers).toHaveLength(1);
  s = play(s, g.refs.second!, g.refs.host!);
  expect(paid(s, g.refs.second!)).toBe(1);
});

for (const from of ['hand', 'resources'] as const)
  test(`Playing a Plot card from ${from} through another instruction leaves the discount intact`, () => {
    const p = setup();
    if (from === 'hand') p.players[0].hand = [{ card: 'unveiled-might', ref: 'unrelated' }];
    else p.players[0].resources!.push({ card: 'unveiled-might', ref: 'unrelated' });
    const g = scenario(p);
    let s = step(deploy(g.state), 'accept-effect', []);
    s = effects(
      s,
      [{ kind: 'play-card', from, target: 'chosen', filter: {}, optional: true }],
      leader(s),
      { chosen: reference(s.cards[g.refs.unrelated!]!) },
    );
    s = play(s, g.refs.unrelated!, g.refs.host!);
    expect(paid(s, g.refs.unrelated!)).toBe(4);
    expect(s.playModifiers).toHaveLength(1);
  });

test('Palpatine’s Plot discount survives his defeat', () => {
  const g = scenario(setup());
  let s = step(deploy(g.state), 'accept-effect', []);
  s = effects(
    s,
    [
      { kind: 'defeat-units', filter: { sameAs: 'source' } },
      {
        kind: 'play-card',
        from: 'resources',
        using: 'plot',
        replaceResource: true,
        target: 'chosen',
        filter: {},
        optional: true,
      },
    ],
    leader(s),
    { chosen: reference(s.cards[g.refs.plot!]!) },
  );
  expect(leader(s).zone).toBe('base');
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.plot && i.target === g.refs.host),
  );
  s = play(s, g.refs.plot!, g.refs.host!);
  expect(paid(s, g.refs.plot!)).toBe(1);
});

test('Palpatine’s Plot discount can pay through Credits', () => {
  const p = setup();
  for (const r of p.players[0].resources!) r.exhausted = true;
  const g = scenario(p);
  createCredits(g.state, 'alice', 1);
  let s = trigger(declare(g), leader(g.state).instanceId);
  s = trigger(s, g.refs.plot!);
  s = play(s, g.refs.plot!, g.refs.host!);
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  resume(s, choose(s, 'accept-effect', s.players.alice!.tokens));
  s = step(s, 'accept-effect', s.players.alice!.tokens);
  expect(paid(s, g.refs.plot!)).toBe(0);
  expect(s.playModifiers).toHaveLength(0);
});

test('A unit played using Plot receives the discount', () => {
  const g = scenario(setup('lurking-snub-fighter'));
  let s = trigger(declare(g), leader(g.state).instanceId);
  s = trigger(s, g.refs.plot!);
  s = play(s, g.refs.plot!);
  expect(paid(s, g.refs.plot!)).toBe(2);
  expect(s.cards[g.refs.plot!]!.zone).toBe('space');
});

test('An event played using Plot receives the discount', () => {
  const g = scenario(setup('trade-route-taxation'));
  let s = trigger(declare(g), leader(g.state).instanceId);
  s = trigger(s, g.refs.plot!);
  s = play(s, g.refs.plot!);
  expect(paid(s, g.refs.plot!)).toBe(0);
  expect(s.cards[g.refs.plot!]!.zone).toBe('discard');
});

test('Discounts expire when the phase ends', () => {
  const p = board(palp),
    g = scenario(p);
  let s = deploy(g.state);
  expect(s.playModifiers).toHaveLength(1);
  s = step(s, 'pass');
  s = step(s, 'pass');
  expect(s.playModifiers).toHaveLength(0);
});

test('A free Plot play consumes the discount without charging resources', () => {
  const g = scenario(setup());
  let s = step(deploy(g.state), 'accept-effect', []);
  s = effects(
    s,
    [
      {
        kind: 'play-card',
        from: 'resources',
        using: 'plot',
        replaceResource: true,
        target: 'chosen',
        filter: {},
        free: true,
        optional: true,
      },
    ],
    leader(s),
    { chosen: reference(s.cards[g.refs.plot!]!) },
  );
  s = play(s, g.refs.plot!, g.refs.host!);
  expect(paid(s, g.refs.plot!)).toBe(0);
  expect(s.playModifiers).toHaveLength(0);
});
