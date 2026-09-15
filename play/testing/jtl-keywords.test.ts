import { expect, test } from 'bun:test';
import { effectiveAbilities, keywordNames } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { move } from '../engine/state.ts';
import { changeControl } from '../engine/control.ts';
import { captureUnit, rescueCaptured } from '../engine/capture.ts';
import { scenario } from './scenario.ts';
import {
  board,
  play,
  mode,
  keyword,
  tokens,
  blank,
  nextOwn,
  ids,
  refresh,
  attack,
  step,
} from './jtl-helpers.ts';
const yularen = 'admiral-yularen--fleet-coordinator';
const ghost = 'the-ghost--heart-of-the-family';
const ezra = 'ezra-bridger--attuned-with-life';
function fleet() {
  const p = board(yularen);
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'ship' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'person' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  return scenario(p);
}
for (const [choice, k] of [
  ['grit', 'Grit'],
  ['sentinel', 'Sentinel'],
  ['shielded', 'Shielded'],
] as const)
  test(`Yularen grants ${k} to current friendly Vehicles, without retroactive Shielded entry`, () => {
    const g = fleet();
    const s = mode(play(g.state, g.refs.source!), choice);
    expect(keyword(s, g.refs.ship!, k)).toBe(true);
    expect(keyword(s, g.refs.person!, k)).toBe(false);
    expect(keyword(s, g.refs.enemy!, k)).toBe(false);
    expect(tokens(s, g.refs.ship!, 'shield')).toBe(0);
    expect(decodeState(encodeState(s))).toEqual(s);
  });
test('Yularen’s Restore stacks and heals during an attack', () => {
  const g = fleet();
  let s = mode(play(g.state, g.refs.source!), 'restore');
  expect(effectiveAbilities(s, s.cards[g.refs.ship!]!).restore).toBe(1);
  s = nextOwn(s);
  const before = s.cards[s.players.alice!.base]!.damage;
  s = attack(s, g.refs.ship!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(before - 1);
});
test('Yularen’s resolved grant survives losing abilities and changing controller, but ends on capture', () => {
  const g = fleet();
  const s = mode(play(g.state, g.refs.source!), 'sentinel');
  blank(s, g.refs.source!);
  changeControl(s, s.cards[g.refs.source!]!, 'bob');
  expect(keyword(s, g.refs.ship!, 'Sentinel')).toBe(true);
  expect(keyword(s, g.refs.enemy!, 'Sentinel')).toBe(false);
  captureUnit(
    s,
    s.cards[g.refs.person!]!,
    s.cards[g.refs.source!]!,
    'alice',
    s.cards[g.refs.person!]!,
  );
  expect(keyword(s, g.refs.ship!, 'Sentinel')).toBe(false);
  rescueCaptured(s, s.cards[g.refs.source!]!);
  expect(keyword(s, g.refs.ship!, 'Sentinel')).toBe(false);
});
test('Yularen Shielded applies when a later Vehicle is played, and does not restart after returning', () => {
  const p = board(yularen);
  p.players[0].hand!.push({ card: 'munificent-frigate', ref: 'ship' });
  const g = scenario(p);
  let s = mode(play(g.state, g.refs.source!), 'shielded');
  s = play(nextOwn(s), g.refs.ship!);
  expect(tokens(s, g.refs.ship!, 'shield')).toBe(1);
  move(s, s.cards[g.refs.source!]!, 'hand');
  move(s, s.cards[g.refs.source!]!, 'ground');
  expect(keyword(s, g.refs.ship!, 'Shielded')).toBe(false);
});
function family() {
  const p = board(ghost, false);
  p.players[0].ground = [
    { card: ezra, ref: 'spectre' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ezra, ref: 'enemy' }];
  return scenario(p);
}
test('The Ghost shares conditional Sentinel only with other friendly Spectres', () => {
  const p = board(ghost, false);
  p.players[0].ground = [
    { card: ezra, ref: 'spectre' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ezra, ref: 'enemy' }];
  p.attachments = [{ card: 'experience', unit: 'source', ref: 'up' }];
  const g = scenario(p),
    s = g.state;
  expect(keyword(s, g.refs.source!, 'Sentinel')).toBe(true);
  expect(keyword(s, g.refs.spectre!, 'Sentinel')).toBe(true);
  expect(keyword(s, g.refs.other!, 'Sentinel')).toBe(false);
  expect(keyword(s, g.refs.enemy!, 'Sentinel')).toBe(false);
  move(s, s.cards[g.refs.up!]!, 'discard');
  expect(keyword(s, g.refs.spectre!, 'Sentinel')).toBe(false);
});
test('The Ghost shares gained numeric and cost keywords and Bounty rewards without ordinary abilities', () => {
  const g = family(),
    s = g.state;
  modifyUnit(s, s.cards[g.refs.source!]!, s.cards[g.refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: {
      keywords: ['Grit', 'Shielded'],
      raid: 2,
      restore: 1,
      exploit: 0,
      smuggle: [{ id: 'smuggle', cost: 2, aspects: ['Cunning'] }],
      piloting: [{ id: 'pilot', cost: 3, aspects: ['Heroism'] }],
      bounties: [{ id: 'reward', effects: [{ kind: 'draw-cards', amount: 1 }] }],
      firstCombatDamage: true,
    },
  });
  const a = effectiveAbilities(s, s.cards[g.refs.spectre!]!);
  expect(a.raid).toBe(2);
  expect(a.restore).toBe(1);
  expect(a.bounties).toHaveLength(1);
  expect(a.bounties![0]!.effects).toEqual([{ kind: 'draw-cards', amount: 1 }]);
  expect(a.smuggle![0]!.cost).toBe(2);
  expect(a.piloting![0]!.cost).toBe(3);
  expect(a.firstCombatDamage).toBe(false);
  expect(keywordNames(s, s.cards[g.refs.spectre!]!)).toEqual(
    expect.arrayContaining([
      'Grit',
      'Shielded',
      'Raid',
      'Restore',
      'Exploit',
      'Bounty',
      'Smuggle',
      'Piloting',
    ]),
  );
  expect(tokens(s, g.refs.spectre!, 'shield')).toBe(0);
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('The Ghost respects keyword loss, recipient ability loss and source ability loss', () => {
  const g = family(),
    s = g.state;
  modifyUnit(s, s.cards[g.refs.source!]!, s.cards[g.refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Grit', 'Sentinel'] },
    lostKeywords: ['Sentinel'],
  });
  expect(keyword(s, g.refs.spectre!, 'Grit')).toBe(true);
  expect(keyword(s, g.refs.spectre!, 'Sentinel')).toBe(false);
  blank(s, g.refs.spectre!);
  expect(keyword(s, g.refs.spectre!, 'Grit')).toBe(false);
  blank(s, g.refs.source!);
  expect(keyword(s, g.refs.source!, 'Grit')).toBe(false);
});
test('Two copies of The Ghost do not invent keywords through their mutual sharing before uniqueness', () => {
  const p = board(ghost, false);
  p.players[1].space = [{ card: ghost, ref: 'second' }];
  const g = scenario(p),
    s = g.state;
  changeControl(s, s.cards[g.refs.second!]!, 'alice');
  expect(keywordNames(s, s.cards[g.refs.source!]!)).toEqual([]);
  expect(keywordNames(s, s.cards[g.refs.second!]!)).toEqual([]);
});
