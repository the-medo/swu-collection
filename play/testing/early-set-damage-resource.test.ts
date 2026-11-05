import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import {
  board,
  choose,
  defeat,
  effects,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';

test('Execute Order 66 damages all Jedi simultaneously and creates tokens for actual defeats', () => {
  const p = board('execute-order-66', true);
  p.players[0].ground = [
    { card: 'barriss-offee--unassuming-apprentice', ref: 'own' },
    { card: ids.marine, ref: 'ordinary' },
  ];
  p.players[1].ground = [
    { card: 'barriss-offee--unassuming-apprentice', ref: 'enemy' },
    { card: 'kit-fisto--the-smiling-jedi', ref: 'shielded' },
  ];
  p.attachments = [{ card: 'shield', unit: 'shielded' }];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.own!]!.zone).toBe('discard');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.shielded!]!.damage).toBe(0);
  expect(s.cards[g.refs.ordinary!]!.damage).toBe(0);
  for (const player of ['alice', 'bob'])
    expect(
      s.ground.filter(
        id => s.cards[id]!.cardId === 'clone-trooper' && s.cards[id]!.controller === player,
      ),
    ).toHaveLength(1);
});
test('Execute Order 66 uses the defeated Jedi’s controller, including stolen Jedi', () => {
  const p = board('execute-order-66', true);
  p.players[1].ground = [
    { card: 'barriss-offee--unassuming-apprentice', controller: 'alice', ref: 'stolen' },
  ];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.stolen!]!.zone).toBe('discard');
  expect(
    s.ground
      .filter(id => s.cards[id]!.cardId === 'clone-trooper')
      .map(id => s.cards[id]!.controller),
  ).toEqual(['alice']);
});
function dj(secret: string = ids.marine) {
  const p = board('dj--blatant-thief', true);
  p.players[0].hand = [];
  p.players[0].resources!.push({ card: 'dj--blatant-thief', ref: 'dj' });
  p.players[1].resources = [{ card: secret, ref: 'enemy' }];
  return scenario(p);
}
test('DJ steals a resource only when Smuggled, preserves readiness and returns the exact resource when he leaves', () => {
  const g = dj(),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.dj && !!i.smuggle);
  resume(pending, choose(pending, 'accept-effect', [g.refs.enemy!]));
  const s = step(pending, 'accept-effect', [g.refs.enemy!]);
  expect(s.cards[g.refs.enemy!]!).toMatchObject({
    controller: 'alice',
    owner: 'bob',
    zone: 'resources',
    exhausted: false,
  });
  let returned = defeat(s, g.refs.dj!);
  expect(returned.cards[g.refs.enemy!]!.controller).toBe('bob');
  expect(returned.players.bob!.resources).toContain(g.refs.enemy!);
  const h = scenario(board('dj--blatant-thief', true));
  expect(play(h.state, h.refs.card!).delayedEffects).toHaveLength(0);
});
test('DJ immediately returns the resource if he left before his played ability resolved', () => {
  const g = dj(),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.dj && !!i.smuggle);
  const preserved = structuredClone(pending.execution.frames);
  const killed = defeat(pending, g.refs.dj!);
  const restored = structuredClone(killed);
  restored.execution.frames = preserved;
  restored.execution.decision = null;
  // Re-enter the real pending trigger continuation after an intervening departure.
  const { settle } = require('../engine/advance.ts');
  settle(restored);
  let s = step(restored, 'accept-effect', [g.refs.enemy!]);
  expect(s.cards[g.refs.enemy!]!.controller).toBe('bob');
});
test('DJ’s delayed return does not expose the face of a stolen resource to spectators', () => {
  const views = [];
  for (const secret of [ids.marine, ids.fighter]) {
    const g = dj(secret),
      pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.dj && !!i.smuggle);
    const s = step(pending, 'accept-effect', [g.refs.enemy!]);
    views.push(new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s));
  }
  expect(views[0]).toEqual(views[1]);
});
test('DJ does not return a card that has left the resource zone', () => {
  const g = dj('tech--source-of-insight');
  let s = step(
    step(g.state, i => i.kind === 'play' && i.card === g.refs.dj && !!i.smuggle),
    'accept-effect',
    [g.refs.enemy!],
  );
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.enemy && !!i.smuggle);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('ground');
  s = defeat(s, g.refs.dj!);
  expect(s.cards[g.refs.enemy!]!.controller).toBe('alice');
});
