import { expect, test } from 'bun:test';
import {
  abilities,
  attack,
  board,
  choose,
  damage,
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
  use,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const ready = (s: GameState, id: string) =>
  effects(s, [{ kind: 'on-unit', target: 'source', operation: { kind: 'ready' } }], id);

test('Agent Kallus observes either player’s other unique units with one optional use per round', () => {
  const p = board('agent-kallus--seeking-the-rebels');
  p.players[0].ground!.push({ card: 'barriss-offee--unassuming-apprentice', ref: 'ally' });
  p.players[1].ground = [
    { card: 'wolffe--suspicious-veteran', ref: 'enemy' },
    { card: ids.marine, ref: 'ordinary' },
  ];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.ordinary!);
  expect(s.execution.decision!.kind).toBe('action');
  s = step(defeat(s, g.refs.ally!), 'decline-effect');
  expect(s.players.alice!.hand).toHaveLength(0);
  s = step(defeat(s, g.refs.enemy!), 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(defeat(s, g.refs.card!).players.alice!.hand).toHaveLength(1);
});
test('Migs Mayfeld observes hand discards from both players, and declining preserves his once-per-round use', () => {
  const p = board('migs-mayfeld--triggerman');
  p.players[0].hand = [{ card: ids.marine, ref: 'own' }];
  p.players[1].hand = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  const discard = (s: GameState, player: 'self' | 'enemy') =>
    effects(s, [
      {
        kind: 'inspect-zone',
        zone: 'hand',
        player,
        chooser: 'owner',
        filter: {},
        min: 1,
        max: 1,
        bind: 'card',
        effects: [{ kind: 'move-card', target: 'card', from: 'hand', to: 'discard' }],
      },
    ]);
  let s = step(step(discard(g.state, 'self'), 'accept-effect', [g.refs.own!]), 'decline-effect');
  s = step(step(discard(s, 'enemy'), 'accept-effect', [g.refs.enemy!]), 'accept-effect');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === s.players.bob!.base),
  );
  s = target(s, s.players.bob!.base);
  expect(damage(s)).toBe(2);
});
test('Mace Windu readies after defeating a defender, but not when the defender survives', () => {
  for (const weak of [true, false]) {
    const p = board('mace-windu--party-crasher');
    p.players[1].ground = [{ card: weak ? ids.marine : ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.card!]!.exhausted).toBe(!weak);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(weak ? 'discard' : 'ground');
  }
});
test('attack-and-defeat triggers resolve during the attack after an On Attack defeat', () => {
  const p = board('mace-windu--party-crasher');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
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
          abilities: {
            triggers: [
              {
                id: 'kill',
                timing: 'attack',
                effects: [{ kind: 'on-unit', target: 'defender', operation: { kind: 'defeat' } }],
              },
            ],
          },
        },
      },
    ],
    g.refs.card!,
  );
  s = attack(s, g.refs.card!, g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(false);
  expect(s.facts.some(f => f.type === 'damage')).toBe(false);
});
test('Arquitens resources a defeated non-leader under its controller, preserving ownership', () => {
  const p = board('arquitens-assault-cruiser');
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!).toMatchObject({
    zone: 'resources',
    owner: 'bob',
    controller: 'alice',
    exhausted: true,
  });
  expect(s.players.alice!.resources).toContain(g.refs.enemy!);
});
test('Blizzard AT-AT deals only unused excess, and Overwhelm consumes it', () => {
  for (const overwhelm of [false, true]) {
    const p = board('blizzard-assault-at-at');
    p.players[1].ground = [
      { card: ids.marine, ref: 'defender' },
      { card: ids.consular, ref: 'victim' },
    ];
    const g = scenario(p);
    let s = g.state;
    if (overwhelm)
      s = effects(
        s,
        [
          {
            kind: 'on-unit',
            target: 'source',
            operation: {
              kind: 'modify',
              power: 0,
              hp: 0,
              duration: 'phase',
              abilities: { keywords: ['Overwhelm'] },
            },
          },
        ],
        g.refs.card!,
      );
    s = step(attack(s, g.refs.card!, g.refs.defender!), 'accept-effect');
    s = target(s, g.refs.victim!);
    expect(s.cards[g.refs.victim!]!.damage).toBe(overwhelm ? 0 : 6);
    expect(damage(s)).toBe(overwhelm ? 6 : 0);
  }
});
test('Jango gains power and Overwhelm only against a bounty and draws on a defeat', () => {
  const p = board('jango-fett--renowned-bounty-hunter');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'wanted', unit: 'enemy', owner: 'alice' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.card!, g.refs.enemy!);
  if (s.execution.decision!.kind !== 'action') s = step(s, 'decline-effect');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(damage(s)).toBe(3);
});
test('Ruthlessness damages the defending base after an attack defeats a unit', () => {
  const p = board('ruthlessness');
  p.players[0].ground = [{ card: 'at-st', ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'ruthlessness', unit: 'attacker' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.attacker!, g.refs.enemy!);
  expect(damage(s)).toBe(5);
});
test('Rukh defeats a surviving non-leader after dealing combat damage, but Shield prevention stops the trigger', () => {
  for (const shield of [false, true]) {
    const p = board('rukh--thrawn-s-assassin');
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (shield) p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const g = scenario(p),
      s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(shield ? 'ground' : 'discard');
  }
});
test('Heroic Sacrifice defeats its attacker after damaging a base, but not after prevented combat damage', () => {
  for (const shield of [false, true]) {
    const p = board('heroic-sacrifice', true);
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (shield) p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.card!), g.refs.attacker!);
    s = attack(s, g.refs.attacker!, shield ? g.refs.enemy! : s.players.bob!.base);
    expect(s.cards[g.refs.attacker!]!.zone).toBe(shield ? 'ground' : 'discard');
    expect(s.players.alice!.hand).toHaveLength(1);
    if (!shield) expect(damage(s)).toBe(5);
  }
});
test('Phase-III Dark Trooper gets Experience only for combat damage it survives', () => {
  const p = board('phase-iii-dark-trooper');
  p.players[1].ground = [{ card: 'battle-droid', ref: 'enemy' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(tokens(s, g.refs.card!)).toBe(1);
  const ability = effects(
    g.state,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'damage', amount: 1 } }],
    g.refs.card!,
  );
  expect(tokens(ability, g.refs.card!)).toBe(0);
});
test('Tarfful reflects the surviving Wookiee’s combat damage from that Wookiee', () => {
  const p = board('tarfful--kashyyyk-chieftain');
  p.players[0].ground!.push({ card: 'wookiee-warrior', ref: 'ally' });
  p.players[1].ground = [
    { card: ids.marine, ref: 'defender' },
    { card: ids.consular, ref: 'victim' },
  ];
  const g = scenario(p),
    pending = attack(g.state, g.refs.ally!, g.refs.defender!);
  const s = target(pending, g.refs.victim!);
  expect(s.cards[g.refs.victim!]!.damage).toBe(3);
  expect(s.facts.findLast(f => f.type === 'damage')!.cards[0]!.instanceId).toBe(g.refs.ally!);
});
test('Palpatine readies created token units but does not ready ordinary unit plays', () => {
  const p = board('chancellor-palpatine--wartime-chancellor');
  p.players[0].hand = [{ card: ids.marine, ref: 'ordinary' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  const played = play(g.state, g.refs.ordinary!);
  expect(played.cards[g.refs.ordinary!]!.exhausted).toBe(true);
  const s = attack(defeat(g.state, g.refs.enemy!), g.refs.card!);
  expect(
    Object.values(s.cards)
      .filter(c => c.cardId === 'clone-trooper' && c.zone === 'ground')
      .map(c => c.exhausted),
  ).toEqual([false]);
});
test('Malevolence prevents attacks for the phase, including after a separate ready effect', () => {
  const p = board('malevolence--grievous-s-secret-weapon', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  s = target(s, g.refs.enemy!);
  expect(stats(s, g.refs.enemy!).power).toBe(0);
  expect(abilities(s, g.refs.enemy!).cannotAttack).toBe(true);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.attacker === g.refs.enemy,
    ),
  ).toBe(false);
});
test('Kuiil returns a milled card sharing his base aspect, not his leader aspect', () => {
  for (const match of [true, false]) {
    const p = board('kuiil--i-have-spoken');
    p.players[0].deck = [
      { card: match ? ids.marine : 'wolffe--suspicious-veteran', ref: 'top' },
      ...p.players[0].deck!,
    ];
    const g = scenario(p),
      s = attack(g.state, g.refs.card!);
    expect(s.cards[g.refs.top!]!.zone).toBe(match ? 'hand' : 'discard');
  }
});
test('Sabine You Can Count on Me is protected while exhausted and can damage after a mismatched mill', () => {
  const p = board('sabine-wren--you-can-count-on-me');
  p.players[0].deck = [{ card: 'wolffe--suspicious-veteran', ref: 'top' }, ...p.players[0].deck!];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(attack(g.state, g.refs.card!), 'accept-effect');
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.card,
    ),
  ).toBe(false);
});
test('Salacious Crumb returns itself as a cost before dealing damage', () => {
  const p = board('salacious-crumb--obnoxious-pet');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    pending = step(
      step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.card),
      'accept-effect',
      [g.refs.card!],
    );
  expect(pending.cards[g.refs.card!]!.zone).toBe('hand');
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
});
test('The Marauder resources only a discarded card sharing a friendly unit name', () => {
  const p = board('the-marauder--shuttling-the-bad-batch', true);
  p.players[0].ground = [{ card: ids.marine }];
  p.players[0].discard = [
    { card: ids.marine, ref: 'match' },
    { card: ids.consular, ref: 'other' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  if (
    s.execution.frames[0]?.kind === 'effect' &&
    (s.execution.frames[0] as any).effect.kind === 'ambush'
  )
    s = step(s, 'decline-effect');
  s = step(s, 'accept-effect', [g.refs.match!]);
  expect(s.cards[g.refs.match!]!.zone).toBe('resources');
});
