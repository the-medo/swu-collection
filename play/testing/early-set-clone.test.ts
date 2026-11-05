import { expect, test } from 'bun:test';
import { cardTraits } from '../engine/attributes.ts';
import { cardName } from '../engine/identity.ts';
import { printedCost } from '../engine/inspection.ts';
import { modifyUnit } from '../engine/lasting.ts';
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
  stats,
  step,
  target,
  targets,
  tokens,
} from './early-set-completion-helpers.ts';

test('Clone chooses before entry and copies printed attributes without damage, upgrades or temporary bonuses', () => {
  const p = board('clone', true);
  p.players[1].ground = [
    { card: ids.marine, ref: 'original', damage: 1 },
    { card: 'at-st', ref: 'vehicle' },
  ];
  p.players[1].leader = {
    card: 'darth-vader--dark-lord-of-the-sith',
    deployedAs: 'unit',
    ref: 'leader',
  };
  p.attachments = [{ card: 'experience', unit: 'original' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.original!]!, g.state.cards[g.refs.original!]!, {
    kind: 'modify',
    power: 5,
    hp: 5,
    duration: 'phase',
  });
  const pending = play(g.state, g.refs.card!);
  expect(pending.cards[g.refs.card!]!.zone).toBe('set-aside');
  expect(targets(pending)).toEqual([g.refs.original!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.original),
  );
  const s = target(pending, g.refs.original!);
  expect(stats(s, g.refs.card!)).toEqual({ power: 3, hp: 3 });
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
  expect(tokens(s, g.refs.card!)).toBe(0);
  expect(printedCost(s, s.cards[g.refs.card!]!)).toBe(2);
  expect(cardTraits(s, s.cards[g.refs.card!]!)).toContain('Clone');
  expect(cardName(s, s.cards[g.refs.card!]!)).toBe('Battlefield Marine');
  expect(s.cards[g.refs.card!]!.cardId).toBe('clone');
});

test('Clone can decline and is defeated as a zero-HP unit, including when no copy is legal', () => {
  const p = board('clone', true);
  p.players[0].ground = [{ card: ids.marine }];
  const g = scenario(p);
  const s = step(play(g.state, g.refs.card!), 'decline-effect');
  expect(s.cards[g.refs.card!]!.zone).toBe('discard');
  expect(
    s.facts.some(f => f.type === 'played' && f.cards.some(c => c.instanceId === g.refs.card)),
  ).toBe(true);
  const h = scenario(board('clone', true));
  expect(play(h.state, h.refs.card!).cards[h.refs.card!]!.zone).toBe('discard');
});

test('Clone stays nonunique and retains its copied attributes after the original leaves', () => {
  const p = board('clone', true);
  p.players[0].ground = [{ card: 'yoda--old-master', ref: 'original' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.original!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.original!]!.zone).toBe('ground');
  expect(s.cards[g.refs.card!]!.zone).toBe('ground');
  s = defeat(s, g.refs.original!);
  expect(stats(s, g.refs.card!)).toEqual({ power: 2, hp: 4 });
  expect(cardName(s, s.cards[g.refs.card!]!)).toBe('Yoda, Old Master');
});

test('Clone copies an entering unit’s Shielded and its own granted bonuses still apply', () => {
  const p = board('clone', true);
  p.players[0].ground = [{ card: 'doctor-evazan--wanted-on-twelve-systems', ref: 'original' }];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { name: 'Clone' },
      optional: false,
      free: true,
      phaseAbilities: { raid: 2 },
    },
  ]);
  s = play(s, g.refs.card!);
  s = target(s, g.refs.original!);
  expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
  expect(s.cards[g.refs.card!]!.zone).toBe('ground');
  expect(stats(s, g.refs.card!)).toEqual({ power: 3, hp: 3 });
});

test('captured Clone forgets its old copy and chooses again on rescue without triggering When Played', () => {
  const p = board('clone', true);
  p.players[0].ground = [
    { card: ids.marine, ref: 'first' },
    { card: 'echo-base-defender', ref: 'second' },
  ];
  p.players[1].ground = [{ card: 'at-st', ref: 'guard' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.first!);
  s = effects(
    s,
    [
      {
        kind: 'select-unit',
        filter: { name: 'Battlefield Marine', controller: 'enemy' },
        optional: false,
        bind: 'victim',
        effects: [{ kind: 'capture-unit', target: 'victim', guard: 'source' }],
      },
    ],
    g.refs.guard!,
  );
  s = target(s, g.refs.card!);
  expect(s.cards[g.refs.card!]!.zone).toBe('captured');
  expect(s.cards[g.refs.card!]!.copiedCardId).toBeUndefined();
  const pending = defeat(s, g.refs.guard!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.second),
  );
  s = target(pending, g.refs.second!);
  expect(cardName(s, s.cards[g.refs.card!]!)).toBe('Echo Base Defender');
  expect(stats(s, g.refs.card!)).toEqual({ power: 4, hp: 3 });
  expect(
    s.facts.filter(f => f.type === 'played' && f.cards.some(c => c.instanceId === g.refs.card)),
  ).toHaveLength(1);
});

test('simultaneously rescued Clones choose from the pre-entry board and then enter together', () => {
  const p = board('battlefield-marine');
  p.players[1].ground = [{ card: 'at-st', ref: 'guard' }];
  p.captured = [
    { card: 'clone', owner: 'alice', guard: 'guard', ref: 'one' },
    { card: 'clone', owner: 'alice', guard: 'guard', ref: 'two' },
  ];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.guard!);
  s = target(s, g.refs.card!);
  expect(targets(s)).toEqual([g.refs.card!]);
  expect(s.cards[g.refs.one!]!.zone).toBe('set-aside');
  expect(s.cards[g.refs.two!]!.zone).toBe('set-aside');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.card),
  );
  s = target(s, g.refs.card!);
  expect(stats(s, g.refs.one!)).toEqual({ power: 3, hp: 3 });
  expect(stats(s, g.refs.two!)).toEqual({ power: 3, hp: 3 });
});

test('a Clone of a token remains a nontoken physical card and returns to hand as Clone', () => {
  const p = board('clone', true);
  p.players[0].ground = [{ card: 'battle-droid', ref: 'token' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.token!);
  const view = new Projector(s.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(s);
  expect(JSON.stringify(view)).toContain('Battle Droid');
  s = effects(
    s,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'return-to-hand' } }],
    g.refs.card!,
  );
  expect(s.cards[g.refs.card!]!.zone).toBe('hand');
  expect(printedCost(s, s.cards[g.refs.card!]!)).toBe(7);
  expect(s.cards[g.refs.card!]!.copiedCardId).toBeUndefined();
});

test('Clone’s copied When Defeated ability survives losing its copied face in discard', () => {
  const p = board('clone', true);
  p.players[0].ground = [{ card: 'superlaser-technician', ref: 'original' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.original!);
  s = defeat(s, g.refs.card!);
  expect(s.cards[g.refs.card!]!.copiedCardId).toBeUndefined();
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.card!]!.zone).toBe('resources');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(false);
});
test('a second Clone copies the first Clone’s printed identity and gets a new entry choice on replay', () => {
  const p = board('clone', true);
  p.players[0].hand!.push({ card: 'clone', ref: 'second' });
  p.players[0].ground = [{ card: ids.marine, ref: 'original' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.original!);
  s = step(s, 'pass');
  s = target(play(s, g.refs.second!), g.refs.card!);
  expect(stats(s, g.refs.second!)).toEqual({ power: 3, hp: 3 });
  expect(s.cards[g.refs.second!]!.copiedCardId).toBe(ids.marine);
});
