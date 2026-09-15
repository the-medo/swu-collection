import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { plotPlay } from '../engine/plot.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { createCredits, readyResourceCount } from '../engine/credits.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
import type { GameState, EngineInput } from '../engine/model.ts';

const ship = 'naboo-royal-starship--fit-for-a-queen';
function setup(card = ship, count = 5) {
  const p = position();
  if (card !== ship) p.players[0].base = { card: 'dagobah-swamp' };
  p.players[0].resources = Array.from({ length: count }, (_, i) => ({
    card: i === count - 1 ? card : ids.marine,
    ...(i === count - 1 ? { ref: 'plot' } : {}),
  }));
  p.players[0].deck![0] = { card: ids.trooper, ref: 'replacement' };
  return p;
}
function declare(g: ReturnType<typeof scenario>) {
  const deployed = advance(
    g.state,
    choose(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
  ).state;
  return advance(deployed, choose(deployed, 'accept-effect', [g.refs.plot!])).state;
}
function play(s: GameState, other = false) {
  return choose(s, i => i.kind === 'play' && !!i.plotPayment === other);
}
function resume(s: GameState, input: EngineInput) {
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

test('Plot prioritizes its own ready resource regardless of list order, or can leave it ready while paying', () => {
  const g = scenario(setup());
  const s = declare(g);
  const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(view.decision?.options.filter(o => o.kind === 'play').map(o => o.plot)).toEqual([
    { cost: 4, useOtherResources: false },
    { cost: 4, useOtherResources: true },
  ]);
  expect(gameViewSchema.parse(view)).toEqual(view);
  for (const other of [false, true]) {
    const input = play(s, other);
    resume(s, input);
    const end = advance(s, input).state;
    expect(readyResourceCount(end, 'alice')).toBe(other ? 0 : 1);
    expect(end.cards[g.refs.plot!]!.zone).toBe('space');
    expect(end.cards[g.refs.replacement!]!.exhausted).toBe(true);
    expect(end.facts.findLast(f => f.type === 'played')?.amount).toBe(4);
  }
});

test('One in a Million determines its target after the chosen payment and exhausted replacement', () => {
  const p = setup('one-in-a-million');
  p.players[1].ground = [
    { card: ids.marine, ref: 'three' },
    { card: ids.marine, ref: 'four' },
  ];
  p.attachments = [{ card: 'experience', unit: 'four', owner: 'bob' }];
  const g = scenario(p),
    s = declare(g);
  for (const other of [false, true]) {
    const target = other ? g.refs.three! : g.refs.four!;
    const next = advance(s, play(s, other)).state;
    expect(readyResourceCount(next, 'alice')).toBe(other ? 3 : 4);
    expect(next.execution.decision?.options.map(o => o.intent)).toEqual([
      { kind: 'target', card: target },
    ]);
    const input = choose(next, 'target');
    resume(next, input);
    expect(advance(next, input).state.cards[target]!.zone).toBe('discard');
  }
});

test('Plot offers no alternative when only the source can pay or when the source is already exhausted', () => {
  for (const exhausted of [false, true]) {
    const p = setup('one-in-a-million');
    if (exhausted) p.players[0].resources!.at(-1)!.exhausted = true;
    else
      p.players[0].resources!.slice(0, -1).forEach(c => {
        c.exhausted = true;
      });
    const g = scenario(p),
      s = declare(g);
    expect(s.execution.decision!.options.filter(o => o.intent.kind === 'play')).toHaveLength(1);
    expect(advance(s, play(s)).state.cards[g.refs.replacement!]!.exhausted).toBe(true);
  }
});

test('the alternative Plot payment requires enough Credits when excluding the source leaves a shortfall', () => {
  const g = scenario(setup(ship, 4));
  const [credit] = createCredits(g.state, 'alice', 1);
  const s = declare(g),
    payment = advance(s, play(s, true)).state;
  expect(payment.execution.frames[0]?.kind).toBe('credit-payment');
  expect(payment.execution.decision?.selection?.min).toBe(1);
  expect(() => advance(payment, choose(payment, 'accept-effect', []))).toThrow();
  const input = choose(payment, 'accept-effect', [credit!.instanceId]);
  resume(payment, input);
  const end = advance(payment, input).state;
  expect(readyResourceCount(end, 'alice')).toBe(0);
  expect(end.cards[credit!.instanceId]!.zone).toBe('set-aside');
  expect(end.cards[g.refs.plot!]!.zone).toBe('space');
});

test('Plot declarations expose only the selected public card references and never a replacement identity', () => {
  const g = scenario(setup());
  const s = declare(g);
  const projector = new Projector(s.gameId, { role: 'player', playerId: 'bob' });
  const view = projector.project(s);
  const notice = view.events.find(e => e.type === 'shown' && e.mode === 'plot');
  expect(notice?.cards.map(c => c.cardId)).toEqual([ship]);
  expect(
    view.cards
      .filter(c => c.zone === 'resources' && c.owner === 'alice')
      .every(c => c.face === null),
  ).toBe(true);
  const secret = structuredClone(s);
  secret.cards[g.refs.replacement!]!.cardId = ids.consular;
  expect(projector.project(secret)).toEqual(view);
  expect(view.decision).toBeNull();
});

test('Plot payment exclusion survives an Exploit continuation before the Credit choice', () => {
  const g = scenario(setup(ship, 4));
  const [credit] = createCredits(g.state, 'alice', 1);
  const s = declare(g);
  const frame = s.execution.frames[0];
  if (frame?.kind !== 'effect') throw new Error('Expected Plot effect');
  // Exercise the shared play primitive with a granted Exploit ability.
  frame.effect = { ...plotPlay, phaseAbilities: { exploit: 1 } };
  s.execution.decision = null;
  settle(s);
  const chooseDefeats = advance(s, play(s, true)).state;
  expect(chooseDefeats.execution.frames[0]?.kind).toBe('exploit-payment');
  const payment = advance(chooseDefeats, choose(chooseDefeats, 'accept-effect', [])).state;
  expect(payment.execution.frames[0]?.kind).toBe('credit-payment');
  expect(payment.execution.decision?.selection?.min).toBe(1);
  expect(() => advance(payment, choose(payment, 'accept-effect', []))).toThrow();
  const input = choose(payment, 'accept-effect', [credit!.instanceId]);
  resume(payment, input);
  expect(advance(payment, input).state.cards[g.refs.plot!]!.zone).toBe('space');
});
