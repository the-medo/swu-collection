import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { playCost } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  play,
  resources,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';

test('Del Meeko taxes each enemy event while in play and stops taxing after departure', () => {
  const p = board('del-meeko--providing-overwatch');
  p.activePlayer = 'bob';
  p.players[1].resources = resources();
  p.players[1].hand = [
    { card: 'open-fire', ref: 'event' },
    { card: ids.marine, ref: 'unit' },
  ];
  const g = scenario(p),
    cost = playCost(g.state, g.state.cards[g.refs.event!]!);
  expect(cost).toBe(4);
  expect(playCost(g.state, g.state.cards[g.refs.unit!]!)).toBe(2);
  expect(playCost(defeat(g.state, g.refs.card!), g.state.cards[g.refs.event!]!)).toBe(3);
});
test('Relentless blanks only the first opposing event of a round, while charging its full cost', () => {
  const p = board('relentless--konstantine-s-folly');
  p.activePlayer = 'bob';
  p.players[1].resources = resources();
  p.players[1].hand = [
    { card: 'open-fire', ref: 'first' },
    { card: 'open-fire', ref: 'second' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.first!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(3);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  s = step(s, 'pass');
  s = target(play(s, g.refs.second!), g.refs.card!);
  expect(s.cards[g.refs.card!]!.damage).toBe(4);
});
test('Qi’ra privately inspects a hand and taxes any named title only for opponents while she remains in play', () => {
  const p = board('qi-ra--playing-her-part', true);
  p.players[1].hand = [{ card: 'open-fire', ref: 'named' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  const view = new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s);
  expect(JSON.stringify(view)).not.toContain('open-fire');
  s = step(s, 'accept-effect', []);
  const input = { ...choose(s, 'accept-effect'), namedCardId: 'open-fire' };
  resume(s, input);
  s = advance(s, input).state;
  expect(playCost(s, s.cards[g.refs.named!]!)).toBe(6);
  s = defeat(s, g.refs.card!);
  expect(playCost(s, s.cards[g.refs.named!]!)).toBe(3);
});
test('Tranquility discounts each of the next three Republic cards once, without consuming a use on other cards', () => {
  const p = board('tranquility--inspiring-flagship');
  p.players[0].hand = [
    { card: '501st-liberator', ref: 'a' },
    { card: '501st-liberator', ref: 'b' },
    { card: '501st-liberator', ref: 'c' },
    { card: '501st-liberator', ref: 'd' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p);
  let s = step(attack(g.state, g.refs.card!), 'pass');
  s = step(play(s, g.refs.other!), 'pass');
  for (const ref of ['a', 'b', 'c', 'd']) {
    expect(playCost(s, s.cards[g.refs[ref]!]!)).toBe(ref === 'd' ? 3 : 2);
    s = play(s, g.refs[ref]!);
    if (s.execution.decision!.kind !== 'action') s = target(s, s.players.alice!.base);
    s = step(s, 'pass');
  }
});
test('Final Showdown readies friendly units and loses at regroup start before ordinary regroup steps', () => {
  const p = board('final-showdown', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'own', exhausted: true }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy', exhausted: true }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.own!]!.exhausted).toBe(false);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  s = step(s, 'pass');
  resume(s, choose(s, 'pass'));
  s = step(s, 'pass');
  expect(s.result).toEqual({ winner: 'bob', reason: 'card-effect' });
});
