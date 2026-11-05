import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import {
  board,
  choose,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';
const stop = (s: Parameters<typeof step>[0]) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === 'stop');
const more = (s: Parameters<typeof step>[0]) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === 'continue');
test('Don’t Get Cocky reveals one card at a time, permits stopping and bottoms only revealed cards', () => {
  const p = board('don-t-get-cocky', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  p.players[0].deck = [
    { card: ids.marine, ref: 'first' },
    { card: ids.fighter, ref: 'second' },
    { card: ids.consular, ref: 'third' },
  ];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.victim!);
  expect(
    pending.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
  ).toEqual([g.refs.first!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'continue'),
  );
  const s = stop(more(pending));
  expect(s.cards[g.refs.victim!]!.damage).toBe(3);
  expect(s.players.alice!.deck[0]).toBe(g.refs.third!);
  expect(new Set(s.players.alice!.deck.slice(1))).toEqual(new Set([g.refs.first!, g.refs.second!]));
});
test('Don’t Get Cocky deals no damage above seven cost and cannot reveal more than seven cards', () => {
  const p = board('don-t-get-cocky', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  p.players[0].deck = Array.from({ length: 9 }, (_, n) => ({ card: ids.marine, ref: `d${n}` }));
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.victim!);
  for (let n = 1; n < 7; n++) s = more(s);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.victim!]!.damage).toBe(0);
  expect(s.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards)).toHaveLength(7);
  expect(s.players.alice!.deck.slice(0, 2)).toEqual([g.refs.d7!, g.refs.d8!]);
});
test('Don’t Get Cocky does not reveal future deck cards in the continue decision', () => {
  const views = [];
  for (const card of [ids.marine, ids.fighter]) {
    const p = board('don-t-get-cocky', true);
    p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
    p.players[0].deck = [{ card: ids.fighter }, { card }];
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.victim!);
    views.push(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'k'.repeat(32)).project(s),
    );
  }
  expect(views[0]).toEqual(views[1]);
});
test('Don’t Get Cocky resolves normally with an empty or exhausted deck', () => {
  for (const empty of [false, true]) {
    const p = board('don-t-get-cocky', true);
    p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
    p.players[0].deck = empty ? [] : [{ card: ids.marine }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.card!), g.refs.victim!);
    if (!empty) s = more(s);
    expect(s.cards[g.refs.victim!]!.damage).toBe(empty ? 0 : 2);
    expect(s.execution.decision!.kind).toBe('action');
  }
});
