import { expect, test } from 'bun:test';
import {
  abilities,
  attack,
  blank,
  board,
  choose,
  damage,
  effects,
  ids,
  play,
  resume,
  scenario,
  stats,
  step,
  target,
  tokens,
} from './early-set-completion-helpers.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { GameState } from '../engine/model.ts';
function affect(s: GameState, id: string, effect: CardEffect, player = 'bob') {
  const pending = effects(
    s,
    [{ kind: 'select-unit', filter: {}, bind: 'victim', optional: false, effects: [effect] }],
    s.players[player]!.leader,
  );
  return target(pending, id);
}
const hit = (s: GameState, id: string, amount: number, player = 'bob', unpreventable = false) =>
  affect(
    s,
    id,
    { kind: 'on-unit', target: 'victim', operation: { kind: 'damage', amount, unpreventable } },
    player,
  );

test('Entrenched forbids base attacks even when the host loses abilities, and stops when the upgrade loses abilities', () => {
  const p = board('entrenched');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'entrenched', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  for (const blankHost of [false, true]) {
    let s = structuredClone(g.state);
    if (blankHost) blank(s, g.refs.host!);
    s = effects(s, []);
    expect(
      s.execution.decision!.options.some(
        o =>
          o.intent.kind === 'attack' &&
          o.intent.attacker === g.refs.host &&
          o.intent.defender === s.players.bob!.base,
      ),
    ).toBe(false);
  }
  const s = structuredClone(g.state);
  blank(s, g.refs.upgrade!);
  expect(damage(attack(effects(s, []), g.refs.host!))).toBe(6);
});
test('Imprisoned suppresses printed and newly granted abilities while retaining attachment stats', () => {
  const p = board('imprisoned');
  p.players[0].ground = [{ card: 'cell-block-guard', ref: 'host' }];
  p.attachments = [
    { card: 'imprisoned', unit: 'host', ref: 'prison' },
    { card: 'academy-training', unit: 'host', ref: 'training' },
  ];
  const g = scenario(p);
  expect(abilities(g.state, g.refs.host!).keywords).not.toContain('Sentinel');
  expect(stats(g.state, g.refs.host!)).toEqual({ power: 5, hp: 5 });
  let s = effects(
    g.state,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: {
          kind: 'modify',
          power: 0,
          hp: 0,
          duration: 'phase',
          abilities: { keywords: ['Saboteur'] },
        },
      },
    ],
    g.refs.host!,
  );
  expect(abilities(s, g.refs.host!).keywords).not.toContain('Saboteur');
  blank(s, g.refs.prison!);
  expect(abilities(s, g.refs.host!).keywords).toContain('Sentinel');
  expect(abilities(s, g.refs.host!).keywords).toContain('Saboteur');
});
test('Boba Fett’s Armor prevents two per packet only on Boba and survives host ability loss', () => {
  for (const boba of [false, true]) {
    const p = board('boba-fett-s-armor');
    p.players[0].ground = [{ card: boba ? 'boba-fett--disintegrator' : ids.consular, ref: 'host' }];
    p.attachments = [{ card: 'boba-fett-s-armor', unit: 'host', ref: 'armor' }];
    const g = scenario(p);
    blank(g.state, g.refs.host!);
    const s = hit(hit(g.state, g.refs.host!, 3), g.refs.host!, 2);
    expect(s.cards[g.refs.host!]!.damage).toBe(boba ? 1 : 5);
  }
});
test('Shadowed Intentions prevents enemy capture, defeat and return, but host ability loss removes the granted protection', () => {
  const p = board('shadowed-intentions');
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'shadowed-intentions', unit: 'host' }];
  const g = scenario(p);
  for (const kind of ['defeat', 'return-to-hand'] as const) {
    const s = affect(g.state, g.refs.host!, {
      kind: 'on-unit',
      target: 'victim',
      operation: { kind },
    });
    expect(s.cards[g.refs.host!]!.zone).toBe('ground');
  }
  const capture: CardEffect = { kind: 'capture-unit', guard: 'own-base', target: 'victim' };
  expect(affect(g.state, g.refs.host!, capture).cards[g.refs.host!]!.zone).toBe('ground');
  const blanked = structuredClone(g.state);
  blank(blanked, g.refs.host!);
  expect(affect(blanked, g.refs.host!, capture).cards[g.refs.host!]!.zone).toBe('captured');
  expect(hit(g.state, g.refs.host!, 2).cards[g.refs.host!]!.damage).toBe(2);
});
test('Lurking TIE Phantom prevents enemy ability damage but permits friendly and unpreventable damage', () => {
  const g = scenario(board('lurking-tie-phantom'));
  expect(hit(g.state, g.refs.card!, 2).cards[g.refs.card!]!.damage).toBe(0);
  expect(hit(g.state, g.refs.card!, 1, 'alice').cards[g.refs.card!]!.damage).toBe(1);
  expect(hit(g.state, g.refs.card!, 1, 'bob', true).cards[g.refs.card!]!.damage).toBe(1);
  expect(
    affect(g.state, g.refs.card!, { kind: 'capture-unit', guard: 'own-base', target: 'victim' })
      .cards[g.refs.card!]!.zone,
  ).toBe('space');
  expect(
    affect(g.state, g.refs.card!, {
      kind: 'on-unit',
      target: 'victim',
      operation: { kind: 'defeat' },
    }).cards[g.refs.card!]!.zone,
  ).toBe('space');
});
test('Finn’s phase prevention applies to every packet and survives loss of the chosen unit’s abilities', () => {
  const p = board('finn--on-the-run');
  p.players[0].ground!.push(
    { card: 'kanan-jarrus--revealed-jedi', ref: 'unique' },
    { card: ids.consular, ref: 'ordinary' },
  );
  const g = scenario(p),
    pending = attack(g.state, g.refs.card!);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.ordinary,
    ),
  ).toBe(false);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.unique),
  );
  let s = target(pending, g.refs.unique!);
  blank(s, g.refs.unique!);
  s = hit(hit(s, g.refs.unique!, 2), g.refs.unique!, 2);
  expect(s.cards[g.refs.unique!]!.damage).toBe(2);
});
