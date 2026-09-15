import { matchesCard } from '../engine/inspection.ts';
import { matchingInPlayCards } from '../engine/in-play.ts';
import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { activeAbilities } from '../engine/abilities.ts';
import { cardTraits } from '../engine/attributes.ts';
import { cardDefinition } from '../cards/registry.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { initialState, playCost, reference } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { applyViewDelta, diffViews } from '../view/delta.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position } from './helpers.ts';
const palp = 'chancellor-palpatine--playing-both-sides';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(back = false) {
  const p = position();
  p.players[0].leader = { card: palp, ...(back ? { leaderSide: 'back' as const } : {}) };
  p.players[0].base.damage = 5;
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  return p;
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
function round(s: GameState) {
  const first = s.round;
  for (let n = 0; n < 20 && s.round === first; n++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(first + 1);
  return s;
}
test('Palpatine starts on his designated leader face in a new game, with no deployment or unit profile', () => {
  const c = config();
  c.players[0].leader = palp;
  const s = initialState(c);
  expect(leader(s).leaderSide).toBeUndefined();
  const def = cardDefinition(palp);
  expect(def.kind === 'leader' && def.printedCost).toBe(null);
  const a = activeAbilities(s, leader(s));
  expect(a.actions?.map(a => a.id)).toEqual(['leader-action']);
  expect(
    scenario(board()).state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'deploy',
    ),
  ).toBe(false);
});
for (const [friendly, heroic, flips] of [
  [true, true, true],
  [true, false, false],
  [false, true, false],
] as const)
  test(`Palpatine requires a defeated friendly Heroism unit (${friendly}, ${heroic})`, () => {
    const p = board();
    p.players[friendly ? 0 : 1].discard = [
      { card: heroic ? ids.marine : ids.fighter, ref: 'lost' },
    ];
    p.defeatedThisPhase = ['lost'];
    const s = scenario(p).state;
    resume(
      s,
      choose(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
    );
    const done = use(s);
    expect(leader(done).leaderSide).toBe(flips ? 'back' : undefined);
    expect(leader(done)).toMatchObject({
      zone: 'base',
      deployedAs: null,
      exhausted: true,
      damage: 0,
    });
    expect(done.players.alice!.hand).toHaveLength(flips ? 1 : 0);
    expect(done.cards[done.players.alice!.base]!.damage).toBe(flips ? 3 : 5);
    expect(done.facts.some(f => f.type === 'deployed' || f.type === 'played')).toBe(false);
  });
for (const back of [false, true])
  test(`Both faces can exhaust with no qualifying history (${back})`, () => {
    const s = use(scenario(board(back)).state);
    expect(leader(s).leaderSide).toBe(back ? 'back' : undefined);
    expect(leader(s).exhausted).toBe(true);
    expect(
      s.facts.some(f =>
        ['drawn', 'healed', 'created', 'damage', 'leader-flipped'].includes(f.type),
      ),
    ).toBe(false);
    const done = step(s, 'pass');
    expect(
      done.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.card === leader(done).instanceId,
      ),
    ).toBe(false);
  });
for (const card of [ids.fighter, 'arrest', ids.marine])
  test(`Sidious checks cards played this phase, including events (${card})`, () => {
    const p = board(true);
    p.players[0].hand = [{ card, ref: 'play' }];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'play' && i.card === g.refs.play);
    s = step(s, 'pass');
    resume(
      s,
      choose(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
    );
    s = use(s);
    const flips = card !== ids.marine;
    expect(leader(s).leaderSide).toBe(flips ? undefined : 'back');
    expect(s.cards[s.players.bob!.base]!.damage).toBe(flips ? 2 : 0);
    const tokens = s.ground.map(id => s.cards[id]!).filter(c => c.cardId === 'clone-trooper');
    expect(tokens).toHaveLength(flips ? 1 : 0);
    if (flips)
      expect(tokens[0]).toMatchObject({ owner: 'alice', controller: 'alice', exhausted: true });
  });
test('Sidious does not reuse a Villainy play from an earlier phase', () => {
  const p = board(true);
  p.players[0].hand = [{ card: ids.fighter }];
  let s = step(scenario(p).state, 'play');
  s = round(s);
  s = use(s);
  expect(leader(s).leaderSide).toBe('back');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
});
test('Face flips replace aspect providers and traits without granting both sides at once', () => {
  for (const back of [false, true]) {
    const p = board(back);
    p.players[0].hand = [
      { card: ids.marine, ref: 'hero' },
      { card: ids.fighter, ref: 'villain' },
    ];
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.hero!]!)).toBe(back ? 4 : 2);
    expect(playCost(g.state, g.state.cards[g.refs.villain!]!)).toBe(back ? 1 : 3);
    expect(cardTraits(g.state, leader(g.state))).toEqual(
      back ? ['Force', 'Separatist', 'Sith'] : ['Republic', 'Official'],
    );
  }
});
test('A flip projects the correct face, historical labels and exact incarnation links for every viewer', () => {
  const p = board();
  p.players[0].discard = [{ card: ids.marine, ref: 'lost' }];
  p.defeatedThisPhase = ['lost'];
  const s = scenario(p).state,
    done = use(s);
  for (const viewer of [
    { role: 'player' as const, playerId: 'alice' },
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const projector = new Projector(s.gameId, viewer, 'v'.repeat(32));
    const before = projector.project(s),
      after = projector.project(done);
    expect(gameViewSchema.parse(after)).toEqual(after);
    const face = after.cards.find(c => c.face?.cardId === palp)!;
    expect(face.face).toMatchObject({
      name: 'Darth Sidious, Playing Both Sides',
      side: 'back',
      kind: 'leader',
      power: null,
      hp: null,
      leaderUnit: false,
    });
    const event = after.events.find(e => e.type === 'leader-flipped')!;
    expect(event.cards.map(c => c.name)).toEqual([
      'Chancellor Palpatine, Playing Both Sides',
      'Darth Sidious, Playing Both Sides',
    ]);
    expect(event.cards.map(c => c.currentCardId)).toEqual([null, face.id]);
    expect(applyViewDelta(before, diffViews(before, after)!)).toEqual(after);
  }
});
test('Palpatine can flip in both directions while preserving physical identity and exhaustion', () => {
  const p = board();
  p.players[0].discard = [{ card: ids.marine, ref: 'lost' }];
  p.defeatedThisPhase = ['lost'];
  p.players[0].hand = [{ card: ids.fighter }];
  let s = use(scenario(p).state);
  const id = leader(s).instanceId,
    incarnation = leader(s).incarnation;
  s = round(s);
  s = step(s, i => i.kind === 'play' && s.cards[i.card]!.cardId === ids.fighter);
  s = step(s, 'pass');
  s = use(s);
  expect(leader(s)).toMatchObject({
    instanceId: id,
    incarnation: incarnation + 1,
    exhausted: true,
    deployedAs: null,
    abilityUses: {},
  });
  expect(leader(s).leaderSide).toBeUndefined();
  resume(s, choose(s, 'pass'));
});
test('Checkpoint and scenario validation reject impossible leader faces and same-incarnation historical forgeries', () => {
  for (const invalid of [
    { leaderSide: 'back' as const, card: ids.leader },
    { card: palp, deployedAs: 'unit' as const },
    { card: palp, damage: 1 },
  ]) {
    const p = board();
    p.players[0].leader = invalid;
    expect(() => scenario(p)).toThrow();
  }
  const s = scenario(board(true)).state;
  s.phaseHistory.baseDamageSources.push(reference(leader(s)));
  expect(() => decodeState(encodeState(s))).not.toThrow();
  delete s.phaseHistory.baseDamageSources[0]!.leaderSide;
  expect(() => decodeState(encodeState(s))).toThrow('Invalid leader face reference');
});

test('A leader with no printed cost does not count as cost zero or as an even-cost card', () => {
  const s = scenario(board()).state,
    card = leader(s),
    context = { source: card };
  for (const filter of [{ maxCost: 0 }, { minCost: 0 }, { costParity: 'even' as const }])
    expect(matchesCard(s, card, filter, context)).toBe(false);
  expect(
    matchingInPlayCards(
      s,
      'alice',
      { controller: 'friendly', roles: ['leader'], costParity: 'even' },
      context,
    ),
  ).toEqual([]);
  expect(
    matchingInPlayCards(s, 'alice', { controller: 'friendly', roles: ['leader'] }, context),
  ).toEqual([card]);
});
