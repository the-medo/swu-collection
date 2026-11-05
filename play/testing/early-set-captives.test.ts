import { expect, test } from 'bun:test';
import {
  board,
  scenario,
  ids,
  play,
  target,
  targets,
  tokens,
  attack,
  step,
  choose,
  resume,
  defeat,
  effects,
} from './early-set-completion-helpers.ts';
import { Projector } from '../projection/projector.ts';

function prison(card: string, inHand = true) {
  const p = board(card, inHand);
  p.players[0].ground ??= [];
  p.players[0].ground.push({ card: ids.marine, ref: 'guard' });
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy-guard' }];
  p.captured = [
    { card: ids.marine, owner: 'bob', guard: 'guard', ref: 'enemy-prisoner' },
    { card: 'lurking-snub-fighter', owner: 'alice', guard: 'enemy-guard', ref: 'own-prisoner' },
  ];
  return p;
}
test('Altering the Deal selects only a captive guarded by a friendly unit and discards it without rescue', () => {
  const g = scenario(prison('altering-the-deal')),
    pending = play(g.state, g.refs.card!);
  expect(targets(pending)).toEqual([g.refs['enemy-prisoner']!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs['enemy-prisoner']),
  );
  const s = target(pending, g.refs['enemy-prisoner']!);
  expect(s.cards[g.refs['enemy-prisoner']!]!.zone).toBe('discard');
  expect(s.cards[g.refs['own-prisoner']!]!.zone).toBe('captured');
  expect(s.facts.some(f => f.type === 'rescued')).toBe(false);
});
test('Unexpected Escape exhausts either player’s guard and rescues only from that guard', () => {
  const g = scenario(prison('unexpected-escape')),
    pending = target(play(g.state, g.refs.card!), g.refs['enemy-guard']!);
  expect(targets(pending)).toEqual([g.refs['own-prisoner']!]);
  const s = target(pending, g.refs['own-prisoner']!);
  expect(s.cards[g.refs['enemy-guard']!]!.exhausted).toBe(true);
  expect(s.cards[g.refs['own-prisoner']!]!).toMatchObject({
    zone: 'space',
    controller: 'alice',
    exhausted: true,
  });
  expect(tokens(s, g.refs['own-prisoner']!, 'shield')).toBe(0);
});
test('L3-37 gains a Shield only if no rescue is chosen, including with no captives', () => {
  const g = scenario(prison('l3-37--droid-revolutionary')),
    pending = play(g.state, g.refs.card!);
  expect(tokens(step(pending, 'decline-effect'), g.refs.card!, 'shield')).toBe(1);
  const s = target(pending, g.refs['own-prisoner']!);
  expect(s.cards[g.refs['own-prisoner']!]!.zone).toBe('space');
  expect(tokens(s, g.refs.card!, 'shield')).toBe(0);
  const h = scenario(board('l3-37--droid-revolutionary', true));
  expect(tokens(play(h.state, h.refs.card!), h.refs.card!, 'shield')).toBe(1);
});
test('Cad Bane captures at most three units with at most eight remaining HP, then his opponent chooses a rescue', () => {
  const p = board('cad-bane--hostage-taker', true);
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
    { card: ids.marine, ref: 'c' },
    { card: ids.consular, ref: 'large' },
  ];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.a!, g.refs.b!]);
  expect(s.captured).toHaveLength(2);
  // Ready through an ordinary effect, then attack on Alice’s next action.
  s = step(s, 'pass');
  s = effects(
    s,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'ready' } }],
    g.refs.card!,
  );
  const pending = attack(s, g.refs.card!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(targets(pending).sort()).toEqual([g.refs.a!, g.refs.b!].sort());
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.a),
  );
  const done = target(pending, g.refs.a!);
  expect(done.cards[g.refs.a!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    exhausted: true,
  });
  expect(done.players.alice!.hand).toHaveLength(2);
});
test('Dryden plays a captive under his controller, preserving ownership and resolving When Played abilities', () => {
  const p = prison('dryden-vos--offering-no-escape');
  p.captured![0]!.card = 'alliance-dispatcher';
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs['enemy-prisoner']!);
  resume(
    pending,
    choose(pending, i => i.kind === 'play' && i.card === g.refs['enemy-prisoner']),
  );
  const s = play(pending, g.refs['enemy-prisoner']!);
  expect(s.cards[g.refs['enemy-prisoner']!]!).toMatchObject({
    zone: 'ground',
    owner: 'bob',
    controller: 'alice',
    exhausted: true,
  });
  expect(s.cards[g.refs['enemy-prisoner']!]!.capturedBy).toBeNull();
  expect(
    s.facts.some(
      f => f.type === 'played' && f.cards.some(c => c.instanceId === g.refs['enemy-prisoner']),
    ),
  ).toBe(true);
  expect(s.facts.some(f => f.type === 'rescued')).toBe(false);
});
test('captured choices remain public to both players and spectators without exposing hands', () => {
  const g = scenario(prison('altering-the-deal')),
    pending = play(g.state, g.refs.card!);
  for (const viewer of [
    { role: 'player', playerId: 'alice' } as const,
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const view = new Projector(pending.gameId, viewer, 'k'.repeat(32)).project(pending);
    expect(
      view.cards
        .filter(c => c.zone === 'captured')
        .map(c => c.face?.cardId)
        .sort(),
    ).toEqual([ids.marine, 'lurking-snub-fighter'].sort());
  }
});
test('Unrefusable Offer plays a defeated enemy under the bounty collector and defeats it at regroup', () => {
  const p = board('unrefusable-offer');
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  p.attachments = [{ card: 'unrefusable-offer', unit: 'victim', owner: 'alice', ref: 'offer' }];
  const g = scenario(p),
    pending = step(defeat(g.state, g.refs.victim!), 'accept-effect');
  const s = play(pending, g.refs.victim!);
  expect(s.cards[g.refs.victim!]!).toMatchObject({
    controller: 'alice',
    owner: 'bob',
    exhausted: false,
    zone: 'ground',
  });
  expect(s.delayedEffects.some(e => e.target?.instanceId === g.refs.victim)).toBe(true);
  const done = step(step(s, 'pass'), 'pass');
  expect(done.cards[g.refs.victim!]!.zone).toBe('discard');
});
