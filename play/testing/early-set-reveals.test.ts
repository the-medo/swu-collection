import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  board,
  choose,
  damage,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
} from './early-set-completion-helpers.ts';

test('Soulless One exhausts a friendly Droid for its attack bonus', () => {
  const p = board('soulless-one--customized-for-grievous');
  p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.card!);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'unit');
  s = target(s, g.refs.droid!);
  expect(damage(s)).toBe(3);
  expect(s.cards[g.refs.droid!]!.exhausted).toBe(true);
});
test('Soulless One can exhaust an undeployed General Grievous but cannot exhaust another leader', () => {
  const p = board('soulless-one--customized-for-grievous');
  p.players[0].leader = { card: 'general-grievous--general-of-the-droid-armies', ref: 'general' };
  const g = scenario(p);
  const pending = step(
    attack(g.state, g.refs.card!),
    i => i.kind === 'choose-mode' && i.mode === 'leader',
  );
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.general),
  );
  const s = target(pending, g.refs.general!);
  expect(damage(s)).toBe(3);
  expect(s.cards[g.refs.general!]!.exhausted).toBe(true);
  const h = scenario(board('soulless-one--customized-for-grievous'));
  let t = step(attack(h.state, h.refs.card!), i => i.kind === 'choose-mode' && i.mode === 'leader');
  expect(t.execution.decision!.kind).toBe('action');
  expect(damage(t)).toBe(1);
});
test('Scanning Officer reveals only three selected enemy resources and replaces their Smugglers exhausted', () => {
  const p = board('scanning-officer', true);
  p.players[1].resources = [
    { card: 'tech--source-of-insight', ref: 'smuggler' },
    { card: ids.marine, ref: 'ordinary' },
    { card: ids.fighter, ref: 'ordinary2' },
    { card: 'hotshot-dl-44-blaster', ref: 'hidden' },
  ];
  const g = scenario(p);
  const pending = play(g.state, g.refs.card!);
  const selected = ['smuggler', 'ordinary', 'ordinary2'].map(k => g.refs[k]!);
  resume(pending, choose(pending, 'accept-effect', selected));
  const revealed = step(pending, 'accept-effect', selected);
  expect(revealed.execution.decision!.selection!.cards).toEqual([g.refs.smuggler!]);
  const s = step(revealed, 'accept-effect', [g.refs.smuggler!]);
  expect(s.cards[g.refs.smuggler!]!.zone).toBe('discard');
  expect(s.cards[g.refs.hidden!]!.zone).toBe('resources');
  expect(s.players.bob!.resources).toHaveLength(4);
  expect(s.cards[s.players.bob!.resources.at(-1)!]!.exhausted).toBe(true);
  expect(
    s.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
  ).not.toContain(g.refs.hidden!);
});
test('Scanning Officer recognizes Smuggle granted to resources by Tech', () => {
  const p = board('scanning-officer', true);
  p.players[1].resources = [
    { card: ids.marine, ref: 'a' },
    { card: ids.fighter, ref: 'b' },
  ];
  p.players[1].ground = [{ card: 'tech--source-of-insight' }];
  const g = scenario(p),
    chosen = [g.refs.a!, g.refs.b!];
  let s = step(play(g.state, g.refs.card!), 'accept-effect', chosen);
  expect(s.execution.decision!.selection!.cards).toEqual(chosen);
  s = step(s, 'accept-effect', chosen);
  expect(s.players.bob!.discard).toEqual(chosen);
  expect(s.players.bob!.resources).toHaveLength(2);
  expect(s.players.bob!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
});
test('Scanning Officer does not leak resource faces before their selection', () => {
  const views = [];
  for (const card of [ids.fighter, 'tech--source-of-insight']) {
    const p = board('scanning-officer', true);
    p.players[1].resources = [{ card, ref: 'secret' }];
    const g = scenario(p),
      s = play(g.state, g.refs.card!);
    views.push(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'k'.repeat(32)).project(s),
    );
  }
  expect(views[0]).toEqual(views[1]);
});
test('For a Cause counts Heroism cards once each and permits discarding several then ordering the rest', () => {
  const p = board('for-a-cause-i-believe-in', true);
  p.players[0].deck = [
    { card: ids.marine, ref: 'hero' },
    { card: ids.fighter, ref: 'dark' },
    { card: 'heroic-resolve', ref: 'hero2' },
    { card: 'for-a-cause-i-believe-in', ref: 'hero3' },
    { card: ids.consular, ref: 'tail' },
  ];
  const g = scenario(p);
  const pending = play(g.state, g.refs.card!);
  expect(damage(pending)).toBe(3);
  expect(pending.execution.decision!.selection!.max).toBe(4);
  const ordering = step(pending, 'accept-effect', [g.refs.hero!, g.refs.dark!]);
  resume(
    ordering,
    choose(ordering, i => i.kind === 'target' && i.card === g.refs.hero3),
  );
  const s = target(ordering, g.refs.hero3!);
  expect(s.players.alice!.deck).toEqual([g.refs.hero3!, g.refs.hero2!, g.refs.tail!]);
  expect(s.players.alice!.discard).toContain(g.refs.hero!);
  expect(s.players.alice!.discard).toContain(g.refs.dark!);
});
test('For a Cause handles a short deck and can discard every revealed card', () => {
  const p = board('for-a-cause-i-believe-in', true);
  p.players[0].deck = [{ card: ids.marine, ref: 'hero' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  const s = step(pending, 'accept-effect', [g.refs.hero!]);
  expect(damage(s)).toBe(1);
  expect(s.players.alice!.deck).toHaveLength(0);
});
