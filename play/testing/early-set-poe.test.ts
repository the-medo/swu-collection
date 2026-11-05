import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  board,
  choose,
  damage,
  ids,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';
function fixture() {
  const p = board('poe-dameron--quick-to-improvise');
  p.players[0].hand = [
    { card: ids.marine, ref: 'a' },
    { card: ids.fighter, ref: 'b' },
    { card: ids.consular, ref: 'c' },
  ];
  p.players[1].ground = [{ card: ids.marine, damage: 1, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  p.players[1].hand = [{ card: ids.fighter, ref: 'enemy-hand' }];
  return scenario(p);
}
const mode = (s: Parameters<typeof step>[0], m: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === m);
test('Poe discards up to three cards and chooses each mode at most once before resolving the effects', () => {
  const g = fixture();
  let s = step(attack(g.state, g.refs.card!), 'accept-effect', [g.refs.a!, g.refs.b!, g.refs.c!]);
  s = target(mode(s, 'damage'), g.refs.host!);
  expect(s.cards[g.refs.host!]!.damage).toBe(1);
  expect(
    s.execution.decision!.options.map(o => o.intent.kind === 'choose-mode' && o.intent.mode),
  ).not.toContain('damage');
  s = step(mode(s, 'upgrade'), 'accept-effect', [g.refs.upgrade!]);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('ground');
  s = mode(s, 'discard');
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(s, choose(s, 'accept-effect', [g.refs['enemy-hand']!]));
  s = step(s, 'accept-effect', [g.refs['enemy-hand']!]);
  expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
  expect(s.cards[g.refs['enemy-hand']!]!.zone).toBe('discard');
  expect(damage(s)).toBe(6);
});
test('Poe can discard zero or one card and unresolvable choices still complete the attack', () => {
  const g = fixture();
  const pending = attack(g.state, g.refs.card!);
  const none = step(pending, 'accept-effect', []);
  expect(none.players.alice!.hand).toHaveLength(3);
  expect(damage(none)).toBe(6);
  const one = target(
    mode(step(pending, 'accept-effect', [g.refs.a!]), 'damage'),
    g.state.players.bob!.base,
  );
  expect(damage(one)).toBe(8);
  const p = board('poe-dameron--quick-to-improvise');
  p.players[0].hand = [{ card: ids.fighter, ref: 'cost' }];
  const h = scenario(p);
  let s = mode(step(attack(h.state, h.refs.card!), 'accept-effect', [h.refs.cost!]), 'discard');
  s = step(s, 'accept-effect', []);
  expect(damage(s)).toBe(6);
});
test('Poe keeps the opponent’s pending hand choice private while choosing another mode', () => {
  const views = [];
  for (const secret of [ids.fighter, ids.consular]) {
    const g = fixture();
    g.state.cards[g.refs['enemy-hand']!]!.cardId = secret;
    let s = step(attack(g.state, g.refs.card!), 'accept-effect', [g.refs.a!, g.refs.b!]);
    s = step(mode(s, 'discard'), 'accept-effect', [g.refs['enemy-hand']!]);
    views.push(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'k'.repeat(32)).project(s),
    );
    expect(s.cards[g.refs['enemy-hand']!]!.zone).toBe('hand');
  }
  expect(views[0]).toEqual(views[1]);
});
test('Poe resumes with all three choices while damage prevention is pending', () => {
  const p = board('poe-dameron--quick-to-improvise');
  p.players[0].hand = [
    { card: ids.fighter, ref: 'a' },
    { card: ids.marine, ref: 'b' },
    { card: ids.consular, ref: 'c' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].hand = [{ card: ids.fighter, ref: 'enemy-hand' }];
  p.attachments = [
    { card: 'shield', unit: 'card', ref: 'one' },
    { card: 'shield', unit: 'card', ref: 'two' },
    { card: 'academy-training', unit: 'host', ref: 'upgrade' },
  ];
  const g = scenario(p);
  let s = step(attack(g.state, g.refs.card!), 'accept-effect', [g.refs.a!, g.refs.b!, g.refs.c!]);
  s = target(mode(s, 'damage'), g.refs.card!);
  s = step(mode(s, 'upgrade'), 'accept-effect', [g.refs.upgrade!]);
  s = step(mode(s, 'discard'), 'accept-effect', [g.refs['enemy-hand']!]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.one),
  );
  s = target(s, g.refs.one!);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
  expect(s.cards[g.refs['enemy-hand']!]!.zone).toBe('discard');
  expect(s.phaseHistory.ownCardsDiscarded).toContain('bob');
});
