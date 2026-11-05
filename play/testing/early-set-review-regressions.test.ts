import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { playCost } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  board,
  choose,
  defeat,
  effects,
  ids,
  play,
  resources,
  resume,
  scenario,
  step,
  target,
  targets,
} from './early-set-completion-helpers.ts';

test('Legal Authority compares enemy power with its attached host', () => {
  const p = board('legal-authority', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [
    { card: 'wampa', ref: 'large' },
    { card: 'rebel-pathfinder', ref: 'small' },
  ];
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host,
  );
  expect(targets(s)).toEqual([g.refs.small!]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.small),
  );
  s = target(s, g.refs.small!);
  expect(s.cards[g.refs.small!]!.capturedBy?.instanceId).toBe(g.refs.host!);
});

test('Aid from the Innocent charges the discounted cost of a discarded card', () => {
  const p = board('aid-from-the-innocent', true);
  p.players[0].deck = [{ card: 'for-a-cause-i-believe-in', ref: 'event' }];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.card!), 'search', [g.refs.event!]);
  expect(s.grantedPlays[0]!.free).toBe(false);
  s = step(s, 'pass');
  const ready = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  s = play(s, g.refs.event!);
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted)).toHaveLength(ready - 1);
});

test('Chopper chooses which ready enemy resource to exhaust', () => {
  const p = board('chopper--metal-menace');
  p.players[1].deck = [{ card: 'open-fire' }];
  p.players[1].resources = [
    { card: ids.marine, exhausted: true, ref: 'spent' },
    { card: ids.marine, ref: 'ready' },
  ];
  const g = scenario(p),
    s = attack(g.state, g.refs.card!);
  expect(s.execution.decision!.playerId).toBe('alice');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.ready!]);
  expect(step(s, 'accept-effect', [g.refs.ready!]).cards[g.refs.ready!]!.exhausted).toBe(true);
});

test('Rey and Kylo recognize an undeployed partner leader for their aspect exception', () => {
  for (const [id, partner, expected] of [
    ['rey--keeping-the-past', 'kylo-ren--rash-and-deadly', 7],
    ['kylo-ren--killing-the-past', 'rey--more-than-a-scavenger', 8],
  ] as const) {
    const p = board(id, true);
    p.players[0].leader = { card: partner };
    p.players[0].base = { card: 'command-center' };
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.card!]!)).toBe(expected);
  }
});

test('Wartime Profiteering requires drawing one of the inspected cards', () => {
  const p = board('wartime-profiteering', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  const s = play(defeat(g.state, g.refs.victim!), g.refs.card!);
  expect(s.execution.decision!.selection!.min).toBe(1);
  expect(() => advance(s, choose(s, 'search', []))).toThrow('Illegal Crossfire input');
  const card = s.execution.decision!.selection!.cards[0]!;
  resume(s, choose(s, 'search', [card]));
  expect(step(s, 'search', [card]).players.alice!.hand).toContain(card);
});

test('Bravado excludes enemy self-defeats and includes defeats caused by your ability', () => {
  const p = board('bravado', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  const selfDefeat = defeat(g.state, g.refs.victim!);
  expect(selfDefeat.phaseHistory.defeated[0]!.defeatedBy).toBe('bob');
  expect(playCost(selfDefeat, selfDefeat.cards[g.refs.card!]!)).toBe(5);
  const s = target(
    effects(g.state, [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        optional: false,
        bind: 'victim',
        effects: [{ kind: 'on-unit', target: 'victim', operation: { kind: 'defeat' } }],
      },
    ]),
    g.refs.victim!,
  );
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBe('alice');
  expect(playCost(s, s.cards[g.refs.card!]!)).toBe(3);
});

test('Bravado tracks each side of simultaneous combat damage', () => {
  const p = board('bravado', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.attacker!, g.refs.defender!);
  expect(s.phaseHistory.defeated.find(c => c.instanceId === g.refs.attacker)!.defeatedBy).toBe(
    'bob',
  );
  expect(s.phaseHistory.defeated.find(c => c.instanceId === g.refs.defender)!.defeatedBy).toBe(
    'alice',
  );
  expect(playCost(s, s.cards[g.refs.card!]!)).toBe(3);
});

test('HP reductions attribute defeat to the resolving ability’s controller', () => {
  const p = board('bravado', true);
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  const s = target(
    effects(g.state, [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        optional: false,
        bind: 'victim',
        effects: [
          {
            kind: 'on-unit',
            target: 'victim',
            operation: { kind: 'modify', power: 0, hp: -3, duration: 'phase' },
          },
        ],
      },
    ]),
    g.refs.victim!,
  );
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBe('alice');
});

test('An expiring HP bonus causes defeat without a responsible player', () => {
  const p = board('bravado', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  let s = effects(
    g.state,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: { kind: 'modify', power: 0, hp: 3, duration: 'phase' },
      },
    ],
    g.refs.victim!,
  );
  s.cards[g.refs.victim!]!.damage = 4;
  s.execution.decision = null;
  s.execution.frames = [{ kind: 'expire-phase' }, { kind: 'action' }];
  settle(s);
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBeNull();
  expect(playCost(s, s.cards[g.refs.card!]!)).toBe(5);
});

test('Clear the Field returns all matching units before a rescued Clone chooses a copy', () => {
  const p = board('clear-the-field', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'guard' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'other' },
    { card: 'echo-base-defender', ref: 'remaining' },
  ];
  p.captured = [{ card: 'clone', owner: 'bob', guard: 'guard', ref: 'clone' }];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.guard!);
  expect(pending.cards[g.refs.guard!]!.zone).toBe('hand');
  expect(pending.cards[g.refs.other!]!.zone).toBe('hand');
  expect(targets(pending)).toEqual([g.refs.remaining!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.remaining),
  );
  expect(target(pending, g.refs.remaining!).cards[g.refs.clone!]!.copiedCardId).toBe(
    'echo-base-defender',
  );
});

test('Smoke and Cinders keeps both hands intact and earlier selections private until both choose', () => {
  const p = board('smoke-and-cinders', true);
  p.players[0].hand!.push(...[0, 1, 2].map(n => ({ card: ids.marine, ref: `a${n}` })));
  p.players[1].hand = [0, 1, 2].map(n => ({ card: ids.fighter, ref: `b${n}` }));
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  const first = step(pending, 'accept-effect', [g.refs.a0!]);
  const alternate = step(pending, 'accept-effect', [g.refs.a1!]);
  expect(first.players.alice!.hand).toHaveLength(3);
  expect(first.players.bob!.hand).toHaveLength(3);
  for (const viewer of [
    { role: 'spectator' as const },
    { role: 'player' as const, playerId: 'bob' },
  ]) {
    expect(new Projector(first.gameId, viewer, 'k'.repeat(32)).project(first)).toEqual(
      new Projector(alternate.gameId, viewer, 'k'.repeat(32)).project(alternate),
    );
  }
  resume(first, choose(first, 'accept-effect', [g.refs.b0!]));
  const s = step(first, 'accept-effect', [g.refs.b0!]);
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.players.bob!.hand).toHaveLength(2);
  expect(s.phaseHistory.ownCardsDiscarded).toEqual(['alice', 'bob']);
});

for (const timing of ['played', 'attack'] as const)
  test(`Xanadu Blood's ${timing} ability lets its controller exhaust a ready enemy resource`, () => {
    const p = board('xanadu-blood--cad-bane-s-reward', timing === 'played');
    p.players[0].ground = [{ card: 'pyke-sentinel', ref: 'ally' }];
    p.players[1].resources = [
      { card: ids.marine, exhausted: true, ref: 'spent' },
      { card: ids.marine, ref: 'ready' },
    ];
    const g = scenario(p);
    let s = timing === 'played' ? play(g.state, g.refs.card!) : attack(g.state, g.refs.card!);
    s = step(target(s, g.refs.ally!), i => i.kind === 'choose-mode' && i.mode === 'resource');
    expect(s.execution.decision!.playerId).toBe('alice');
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.ready!]);
    expect(step(s, 'accept-effect', [g.refs.ready!]).cards[g.refs.ready!]!.exhausted).toBe(true);
  });

test('Zorii’s delayed discard retains its origin after the source leaves play', () => {
  const p = board('zorii-bliss--valiant-smuggler');
  const g = scenario(p);
  let s = defeat(attack(g.state, g.refs.card!), g.refs.card!);
  s = step(step(s, 'pass'), 'pass');
  const selected = s.execution.decision!.selection!.cards.slice(0, 1);
  resume(s, choose(s, 'accept-effect', selected));
  s = step(s, 'accept-effect', selected);
  expect(s.cards[selected[0]!]!.zone).toBe('discard');
});

test('Wanted Insurgents credits its Bounty collector with the damage defeat', () => {
  const p = board('wanted-insurgents');
  p.players[0].ground!.push({ card: ids.trooper, ref: 'victim' });
  p.players[1].hand = [{ card: 'bravado', ref: 'bravado' }];
  const g = scenario(p);
  let s = step(defeat(g.state, g.refs.card!), 'accept-effect');
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.victim),
  );
  s = target(s, g.refs.victim!);
  expect(s.phaseHistory.defeated.find(c => c.instanceId === g.refs.victim)!.defeatedBy).toBe('bob');
  expect(playCost(s, s.cards[g.refs.bravado!]!)).toBe(3);
});

test('Snoke defeats a newly entering enemy unit through his continuous HP reduction', () => {
  const p = board('supreme-leader-snoke--shadow-ruler');
  p.players[0].hand = [{ card: 'bravado', ref: 'bravado' }];
  p.players[1].hand = [{ card: ids.fighter, ref: 'victim' }];
  p.players[1].resources = resources();
  p.activePlayer = 'bob';
  const g = scenario(p),
    s = play(g.state, g.refs.victim!);
  expect(s.cards[g.refs.victim!]!.zone).toBe('discard');
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBe('alice');
  expect(playCost(s, s.cards[g.refs.bravado!]!)).toBe(3);
});

test('Blanking Chirrut at zero remaining HP attributes his defeat to the blanking ability', () => {
  const p = board('bravado', true);
  p.players[1].leader = {
    card: 'chirrut--mwe--one-with-the-force',
    damage: 9,
    deployedAs: 'unit',
    ref: 'victim',
  };
  const g = scenario(p);
  const s = target(
    effects(g.state, [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        optional: false,
        bind: 'victim',
        effects: [
          {
            kind: 'on-unit',
            target: 'victim',
            operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
          },
        ],
      },
    ]),
    g.refs.victim!,
  );
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBe('alice');
});

test('Nonlethal unit damage does not claim a later defeat caused by an expiring HP bonus', () => {
  const p = board('bravado', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'dealer' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  let s = effects(
    g.state,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: { kind: 'modify', power: 0, hp: 3, duration: 'phase' },
      },
    ],
    g.refs.victim!,
  );
  s = target(
    effects(
      s,
      [
        {
          kind: 'select-unit',
          filter: { controller: 'enemy' },
          optional: false,
          bind: 'victim',
          effects: [{ kind: 'damage-target', target: 'victim', amount: 4 }],
        },
      ],
      g.refs.dealer!,
    ),
    g.refs.victim!,
  );
  expect(s.cards[g.refs.victim!]!.zone).toBe('ground');
  s.execution.decision = null;
  s.execution.frames = [{ kind: 'expire-phase' }, { kind: 'action' }];
  settle(s);
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBeNull();
});

test('Huyang leaving play expires his HP bonus without crediting a defeat to the player returning him', () => {
  const p = board('huyang--enduring-instructor', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'boosted' }];
  p.players[1].hand = [{ card: 'bravado', ref: 'bravado' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.boosted!);
  s = target(
    effects(
      s,
      [
        {
          kind: 'select-unit',
          filter: { name: 'Battlefield Marine' },
          optional: false,
          bind: 'victim',
          effects: [{ kind: 'damage-target', target: 'victim', amount: 4 }],
        },
      ],
      s.players.bob!.leader,
    ),
    g.refs.boosted!,
  );
  expect(s.cards[g.refs.boosted!]!.zone).toBe('ground');
  const pending = effects(
    s,
    [
      {
        kind: 'select-unit',
        filter: { name: 'Huyang' },
        optional: false,
        bind: 'chosen',
        effects: [{ kind: 'on-unit', target: 'chosen', operation: { kind: 'return-to-hand' } }],
      },
    ],
    s.players.bob!.leader,
  );
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.card),
  );
  s = target(pending, g.refs.card!);
  expect(s.cards[g.refs.boosted!]!.zone).toBe('discard');
  expect(s.phaseHistory.defeated[0]!.defeatedBy).toBeNull();
  expect(playCost(s, s.cards[g.refs.bravado!]!)).toBe(5);
});

test('Marauder can damage a surviving zero-HP unit, Exploit it, and resume its remaining payment', () => {
  const p = board('the-marauder--a-new-home', true);
  p.players[0].leader = {
    card: 'cassian-andor--climb-',
    deployedAs: 'unit',
    damage: 1,
    ref: 'fodder',
  };
  p.players[0].resources = resources(3);
  p.players[0].credits = ['credit'];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {},
      optional: false,
      phaseAbilities: { exploit: 1 },
    },
  ]);
  s = step(play(s, g.refs.card!), 'accept-effect', [g.refs.fodder!]);
  expect(s.cards[g.refs.fodder!]!.damage).toBe(2);
  expect(s.cards[g.refs.fodder!]!.zone).toBe('ground');
  s = step(s, 'accept-effect', [g.refs.fodder!]);
  resume(s, choose(s, 'accept-effect', [g.refs.credit!]));
  s = step(s, 'accept-effect', [g.refs.credit!]);
  expect(s.cards[g.refs.card!]!.zone).toBe('space');
  expect(s.cards[g.refs.fodder!]!.zone).toBe('base');
});
