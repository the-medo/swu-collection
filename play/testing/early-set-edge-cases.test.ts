import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  board,
  choose,
  damage,
  defeat,
  ids,
  play,
  resume,
  scenario,
  step,
} from './early-set-completion-helpers.ts';

test('Toro may decline without spending his round limit, then damage another Bounty Hunter and ready once', () => {
  const p = board('toro-calican--ambitious-upstart');
  p.players[0].ground![0]!.exhausted = true;
  p.players[0].hand = [
    { card: 'dengar--crude-and-slovenly', ref: 'first' },
    { card: 'boba-fett--disintegrator', ref: 'second' },
  ];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.first!), 'decline-effect');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
  s = step(s, 'pass');
  s = play(s, g.refs.second!);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(false);
  expect(s.cards[g.refs.second!]!.damage).toBe(1);
});
test('Punishing One only observes upgraded enemy defeats, using the defeated unit’s former attachments', () => {
  const p = board('punishing-one--dengar-s-jumpmaster');
  p.players[0].space![0]!.exhausted = true;
  p.players[1].ground = [
    { card: ids.marine, ref: 'ordinary' },
    { card: ids.marine, ref: 'upgraded' },
  ];
  p.attachments = [{ card: 'academy-training', unit: 'upgraded' }];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.ordinary!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
  s = defeat(s, g.refs.upgraded!);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(false);
});
test('Reinforcement Walker draws the inspected card or discards it before healing', () => {
  for (const mode of ['draw', 'discard']) {
    const p = board('reinforcement-walker', true);
    p.players[0].base.damage = 5;
    p.players[0].deck = [
      { card: ids.marine, ref: 'top' },
      { card: ids.fighter, ref: 'next' },
    ];
    const g = scenario(p);
    let s = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.top!]);
    s = step(s, i => i.kind === 'choose-mode' && i.mode === mode);
    expect(s.players.alice!.deck).toEqual([g.refs.next!]);
    expect(s.cards[g.refs.top!]!.zone).toBe(mode === 'draw' ? 'hand' : 'discard');
    expect(damage(s, 'alice')).toBe(mode === 'draw' ? 5 : 2);
    if (mode === 'draw') expect(s.facts.some(f => f.type === 'drawn')).toBe(true);
  }
});
test('Black One can discard an empty hand and draw three cards', () => {
  const g = scenario(board('black-one--scourge-of-starkiller-base', true));
  let s = step(play(g.state, g.refs.card!), i => i.kind === 'choose-mode' && i.mode === 'resolve');
  if (s.execution.frames[0]?.kind === 'zone-inspection') s = step(s, 'accept-effect', []);
  expect(s.players.alice!.hand).toHaveLength(3);
});
test('Smoke and Cinders leaves a hand with fewer than two cards unchanged', () => {
  const p = board('smoke-and-cinders', true);
  p.players[0].hand!.push({ card: ids.fighter, ref: 'kept' });
  p.players[1].hand = [];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  for (let n = 0; n < 2 && s.execution.frames[0]?.kind === 'zone-inspection'; n++)
    s = step(s, 'accept-effect', []);
  expect(s.players.alice!.hand).toEqual([g.refs.kept!]);
  expect(s.players.bob!.hand).toHaveLength(0);
  expect(s.execution.decision!.kind).toBe('action');
});
test('General Grievous with four Lightsabers defeats exactly four chosen enemy units', () => {
  const p = board('general-grievous--trophy-collector');
  p.players[1].ground = Array.from({ length: 5 }, (_, n) => ({
    card: ids.consular,
    ref: `enemy${n}`,
  }));
  p.attachments = Array.from({ length: 4 }, () => ({ card: 'jedi-lightsaber', unit: 'card' }));
  const g = scenario(p);
  const pending = attack(g.state, g.refs.card!);
  expect(pending.execution.decision!.selection!.min).toBe(4);
  const selected = [0, 1, 2, 3].map(n => g.refs[`enemy${n}`]!);
  resume(pending, choose(pending, 'accept-effect', selected));
  const s = step(pending, 'accept-effect', selected);
  for (const id of selected) expect(s.cards[id]!.zone).toBe('discard');
  expect(s.cards[g.refs.enemy4!]!.zone).toBe('ground');
});
test('Zorii’s scheduled discard resolves before regroup draws, even though it is a separate phase', () => {
  const g = scenario(board('zorii-bliss--valiant-smuggler'));
  let s = attack(g.state, g.refs.card!);
  const drawn = s.players.alice!.hand[0]!;
  expect(s.delayedEffects.some(e => e.kind === 'effects-at-regroup')).toBe(true);
  s = step(step(s, 'pass'), 'pass');
  expect(s.phase).toBe('regroup');
  expect(s.execution.decision!.selection!.cards).toEqual([drawn]);
  resume(s, choose(s, 'accept-effect', [drawn]));
  s = step(s, 'accept-effect', [drawn]);
  expect(s.cards[drawn]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(2);
});
test('Qi’ra reveals the inspected hand only to its owner and the inspecting player', () => {
  const publicViews = [];
  const privateViews = [];
  for (const secret of [ids.marine, ids.fighter]) {
    const p = board('qi-ra--playing-her-part', true);
    p.players[1].hand = [{ card: secret }];
    const g = scenario(p),
      s = play(g.state, g.refs.card!);
    publicViews.push(new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s));
    privateViews.push(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'k'.repeat(32)).project(s),
    );
  }
  expect(publicViews[0]).toEqual(publicViews[1]);
  expect(privateViews[0]).not.toEqual(privateViews[1]);
});
