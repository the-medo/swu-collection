import { expect, test } from 'bun:test';
import { cardDefinition } from '../cards/catalog.ts';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { cardTraits } from '../engine/attributes.ts';
import { reference } from '../engine/state.ts';
import { matchesCard } from '../engine/inspection.ts';
import { effectFrames } from '../engine/triggers.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

const step = (
  state: GameState,
  intent: Intent['kind'] | ((intent: Intent) => boolean),
  selections: string[] = [],
) => advance(decodeState(encodeState(state)), choose(state, intent, selections)).state;
const resources = (count = 12) => Array.from({ length: count }, () => ({ card: ids.marine }));
function effects(state: GameState, source: string, list: readonly CardEffect[]) {
  const next = structuredClone(state);
  next.execution.decision = null;
  next.execution.frames = [
    ...effectFrames(next.cards[source]!.controller, next.cards[source]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(next);
  return next;
}
function played(state: GameState, source: string) {
  const definition = cardDefinition(state, state.cards[source]!.cardId);
  if (definition.kind !== 'unit') throw new Error('Expected unit');
  return effects(state, source, definition.triggers!.find(t => t.timing === 'played')!.effects);
}
function resume(state: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(state, input));
}

test('Wrecker still damages a friendly unit when the opponent has none', () => {
  const input = position();
  input.players[0].ground = [{ card: 'wrecker--wrecking-the-empire', ref: 'wrecker' }];
  const { state, refs } = scenario(input);
  const next = step(played(state, refs.wrecker!), 'target');
  expect(next.cards[refs.wrecker!]!.damage).toBe(3);
});

test.each(['crosshair--i-ve-changed', 'tech--i-thought-it-was-obvious'])(
  '%s does not trigger after lethal damage',
  card => {
    const input = position();
    input.players[0].ground = [{ card, ref: 'victim' }];
    const { state, refs } = scenario(input);
    const next = effects(state, refs.victim!, [
      { kind: 'on-unit', target: 'source', operation: { kind: 'damage', amount: 99 } },
    ]);
    expect(next.cards[refs.victim!]!.zone).toBe('discard');
    expect(next.players.alice!.hand).toHaveLength(0);
    expect(next.players.bob!.hand).toHaveLength(0);
    expect(next.execution.decision!.kind).toBe('action');
  },
);

test('Ritual Dragon readies created Beast tokens', () => {
  const input = position();
  input.players[0].ground = [{ card: 'ritual-dragon', ref: 'dragon' }];
  input.players[0].base = { card: 'dune-sea' };
  const { state, refs } = scenario(input);
  const next = effects(state, refs.dragon!, [{ kind: 'create-unit', cardId: 'beast', count: 1 }]);
  expect(next.ground.map(id => next.cards[id]!).find(c => c.cardId === 'beast')!.exhausted).toBe(
    false,
  );
});

test('Gorax opponent discards and defeats a resource as separate effects, including an empty hand', () => {
  for (const hand of [true, false]) {
    const input = position();
    input.players[0].ground = [{ card: 'giant-gorax', ref: 'gorax' }];
    input.players[1].hand = hand ? [{ card: ids.marine, ref: 'discard' }] : [];
    input.players[1].resources = [{ card: ids.marine, ref: 'resource' }];
    const { state, refs } = scenario(input);
    const definition = cardDefinition(state, 'giant-gorax');
    if (definition.kind !== 'unit') throw new Error('Expected unit');
    let next = effects(state, refs.gorax!, definition.triggers![0]!.effects);
    expect(next.execution.decision!.playerId).toBe('bob');
    next = step(next, i => i.kind === 'choose-mode' && i.mode === 'discard-and-defeat-resource');
    next = step(next, 'accept-effect', hand ? [refs.discard!] : []);
    expect(next.execution.decision!.playerId).toBe('bob');
    next = step(next, 'accept-effect', [refs.resource!]);
    expect(next.players.bob!.hand).toHaveLength(0);
    expect(next.players.bob!.resources).toHaveLength(0);
  }
});

test('Gorax controller chooses which opposing unit or base takes damage', () => {
  const input = position();
  input.players[0].ground = [{ card: 'giant-gorax', ref: 'gorax' }];
  input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(input);
  const definition = cardDefinition(state, 'giant-gorax');
  if (definition.kind !== 'unit') throw new Error('Expected unit');
  let next = effects(state, refs.gorax!, definition.triggers![0]!.effects);
  next = step(next, i => i.kind === 'choose-mode' && i.mode === 'damage');
  expect(next.execution.decision!.playerId).toBe('alice');
  expect(
    next.execution
      .decision!.options.map(o => o.intent)
      .filter(i => i.kind === 'target')
      .map(i => i.card)
      .sort(),
  ).toEqual([refs.enemy!, state.players.bob!.base].sort());
});

test("Don't Touch Anything randomizes over every enemy without asking for a subset", () => {
  const input = position();
  input.players[0].hand = [{ card: 'don-t-touch-anything', ref: 'event' }];
  input.players[0].resources = resources();
  input.players[1].ground = [{ card: ids.marine }, { card: ids.marine }];
  const { state, refs } = scenario(input);
  const next = step(state, i => i.kind === 'play' && i.card === refs.event);
  expect(next.execution.decision).toBeNull();
  expect(next.execution.random!.bounds).toEqual([2]);
  expect(decodeState(encodeState(next))).toEqual(next);
});

test('Hunter only offers opposing units for both attack selections', () => {
  const input = position();
  input.players[0].ground = [
    { card: 'hunter--everyone-get-to-cover-', ref: 'hunter' },
    { card: ids.marine, ref: 'attacker', exhausted: true },
  ];
  input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(input);
  let next = played(state, refs.hunter!);
  next = step(next, i => i.kind === 'choose-mode' && i.mode === 'attack');
  next = step(next, i => i.kind === 'target' && i.card === refs.attacker);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === state.players.bob!.base,
    ),
  ).toBe(false);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === refs.enemy,
    ),
  ).toBe(true);
});

test('Maul filters discard by actual defeats this phase, not printed When Defeated text', () => {
  const input = position();
  input.players[0].ground = [{ card: ids.marine, ref: 'fresh' }];
  input.players[0].discard = [{ card: 'clone-x-assassin', ref: 'old' }];
  const { state, refs } = scenario(input);
  const next = effects(state, refs.fresh!, [
    { kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } },
  ]);
  const context = { source: next.cards[next.players.alice!.leader]! };
  expect(matchesCard(next, next.cards[refs.fresh!]!, { defeatedThisPhase: true }, context)).toBe(
    true,
  );
  expect(matchesCard(next, next.cards[refs.old!]!, { defeatedThisPhase: true }, context)).toBe(
    false,
  );
});

test('Osha waives Villainy but retains the missing Vigilance penalty', () => {
  const input = position();
  input.players[0].leader = { card: 'osha--haunted-by-her-past', deployedAs: 'unit' };
  input.players[0].resources = [{ card: 'clone-x-assassin', ref: 'clone' }, ...resources(3)];
  const { state, refs } = scenario(input);
  let next = step(state, i => i.kind === 'use-ability' && i.abilityId === 'resource-play');
  next = step(next, i => i.kind === 'play' && i.card === refs.clone);
  expect(next.cards[refs.clone!]!.resourcesPaid).toBe(4);
});

test('Phee responds when the opposing leader deploys', () => {
  const input = position();
  input.players[0].resources = resources();
  input.players[1].ground = [{ card: 'phee-genoa--liberator-of-ancient-wonders' }];
  const { state } = scenario(input);
  let next = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(next.execution.decision!.playerId).toBe('alice');
  next = step(next, 'decline-effect');
  expect(next.cards[next.players.alice!.leader]!.exhausted).toBe(true);
});

test('L3 can decline an event replay, then immediately replay a later event once this phase', () => {
  const input = position();
  input.players[0].ground = [{ card: 'l3-37--we-re-programmed-to-learn' }];
  input.players[0].hand = [
    { card: 'open-fire', ref: 'one' },
    { card: 'open-fire', ref: 'two' },
  ];
  input.players[0].resources = resources();
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(input);
  let next = step(state, i => i.kind === 'play' && i.card === refs.one);
  next = step(next, 'target');
  next = step(next, 'decline-effect');
  expect(next.roundHistory.triggerUses).toHaveLength(0);
  next = step(next, 'pass');
  next = step(next, i => i.kind === 'play' && i.card === refs.two);
  next = step(next, 'target');
  next = step(next, 'accept-effect');
  expect(next.roundHistory.triggerUses).toHaveLength(1);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === refs.two,
    ),
  ).toBe(true);
  next = step(next, i => i.kind === 'play' && i.card === refs.two);
  next = step(next, 'target');
  expect(next.activePlayer).toBe('bob');
  expect(next.grantedPlays).toHaveLength(0);
});

test.each(['unit', 'base'])(
  "Ty Yorrick's owner controls the optional damage increase against a %s",
  target => {
    const input = position();
    input.players[0].ground = [{ card: 'ty-yorrick--monster-hunter', ref: 'ty' }];
    input.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
    const { state, refs } = scenario(input);
    let next = effects(
      state,
      refs.ty!,
      target === 'base'
        ? [{ kind: 'damage-bases', amount: 1, targets: 'enemy' }]
        : [
            {
              kind: 'select-unit',
              filter: { controller: 'enemy' },
              bind: 'victim',
              optional: false,
              effects: [{ kind: 'damage-target', target: 'victim', amount: 1 }],
            },
          ],
    );
    if (target === 'unit') next = step(next, 'target');
    expect(next.execution.decision!.playerId).toBe('alice');
    const forged = structuredClone(next);
    const damage = forged.execution.frames.find(f => f.kind === 'damage');
    if (!damage || damage.kind !== 'damage') throw new Error('Expected damage');
    damage.assignments[0]!.preventionDeclined = true;
    expect(() => decodeState(encodeState(forged))).toThrow(
      'Cannot decline mandatory damage replacement',
    );
    const declined = step(next, 'decline-effect');
    const id = target === 'base' ? state.players.bob!.base : refs.victim!;
    expect(declined.cards[id]!.damage).toBe(1);
    next = step(next, 'target');
    expect(next.cards[id]!.damage).toBe(2);
  },
);

test('Kelnacca pays for two separately targeted damage events rather than one doubled hit', () => {
  const input = position();
  input.players[0].ground = [{ card: 'kelnacca--solitary-master', ref: 'kelnacca' }];
  input.players[0].resources = resources(6);
  input.players[1].ground = [
    { card: ids.consular, ref: 'first' },
    { card: ids.consular, ref: 'second' },
  ];
  input.attachments = [{ card: 'shield', unit: 'first' }];
  const { state, refs } = scenario(input);
  let next = step(played(state, refs.kelnacca!), 'accept-effect', state.players.alice!.resources);
  next = step(next, i => i.kind === 'target' && i.card === refs.first);
  expect(next.cards[refs.first!]!.damage).toBe(0);
  next = step(next, i => i.kind === 'target' && i.card === refs.second);
  expect(next.cards[refs.second!]!.damage).toBe(4);
});

test('Overgrowth resources itself exhausted without an optional prompt', () => {
  const input = position();
  input.players[0].hand = [{ card: 'overgrowth', ref: 'event' }];
  input.players[0].resources = resources();
  const { state, refs } = scenario(input);
  const next = step(state, i => i.kind === 'play' && i.card === refs.event);
  expect(next.cards[refs.event!]!).toMatchObject({ zone: 'resources', exhausted: true });
  expect(next.execution.decision!.kind).toBe('action');
});

test.each([false, true])(
  'nested Vernestra play preserves additional costs and effect continuation (free: %s)',
  free => {
    const input = position();
    input.players[0].hand = [
      { card: 'vernestra-rwoh--we-should-handle-this-ourselves', ref: 'vernestra' },
    ];
    input.players[0].discard = [{ card: 'j-type-nubian-starship', ref: 'nubian' }];
    input.players[0].resources = resources();
    const { state, refs } = scenario(input);
    let next = effects(state, state.players.alice!.leader, [
      {
        kind: 'play-card',
        from: 'hand',
        filter: {},
        optional: false,
        free,
        ready: true,
        phaseAbilities: { keywords: ['Sentinel'] },
        effects: [{ kind: 'draw-cards', amount: 1, player: 'self' }],
      },
    ]);
    next = step(next, 'play');
    expect(next.execution.decision!.selection!.cards).toContain(refs.nubian!);
    resume(next, choose(next, 'accept-effect', [refs.nubian!]));
    next = step(next, 'accept-effect', [refs.nubian!]);
    expect(next.players.alice!.deck.at(-1)).toBe(refs.nubian!);
    expect(next.cards[refs.vernestra!]!).toMatchObject({ zone: 'ground', exhausted: false });
    expect(next.players.alice!.hand).toHaveLength(2);
  },
);

test('Ty increase ownership survives replacement ordering, decline, and fresh-process recovery', () => {
  const input = position();
  input.players[0].ground = [{ card: 'ty-yorrick--monster-hunter', ref: 'ty' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  input.attachments = [{ card: 'shield', unit: 'victim', ref: 'shield' }];
  const { state, refs } = scenario(input);
  let next = effects(state, refs.ty!, [
    { kind: 'damage-units', filter: { controller: 'enemy' }, amount: 1 },
  ]);
  expect(next.execution.decision!.playerId).toBe('bob');
  next = step(next, i => i.kind === 'target' && i.card === refs.ty);
  expect(next.execution.decision!.playerId).toBe('alice');
  resume(next, choose(next, 'decline-effect'));
  next = step(next, 'decline-effect');
  expect(next.cards[refs.victim!]!.damage).toBe(0);
  expect(next.cards[refs.shield!]!.zone).toBe('set-aside');
});

test('additional play costs still run after Exploit and preserve recovery', () => {
  const input = position();
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].hand = [{ card: 'greater-sarlacc', ref: 'sarlacc' }];
  input.players[0].ground = [{ card: ids.marine, ref: 'fodder' }];
  input.players[0].resources = resources(4);
  const { state, refs } = scenario(input);
  let next = effects(state, state.players.alice!.leader, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {},
      optional: false,
      phaseAbilities: { exploit: 1 },
    },
  ]);
  next = step(next, 'play');
  next = step(next, 'accept-effect', [refs.fodder!]);
  expect(next.execution.frames[0]!.kind).toBe('special-play-payment');
  const selected = next.execution.decision!.selection!.cards.slice(0, 2);
  resume(next, choose(next, 'accept-effect', selected));
  next = step(next, 'accept-effect', selected);
  expect(next.cards[refs.sarlacc!]!.zone).toBe('ground');
  expect(next.cards[refs.fodder!]!.zone).toBe('discard');
});

test('completed special payments reject forged discounts when recovering a Credit prompt', () => {
  const input = position();
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].hand = [{ card: 'greater-sarlacc', ref: 'sarlacc' }];
  input.players[0].resources = resources(4);
  input.players[0].credits = ['credit'];
  const { state, refs } = scenario(input);
  let next = step(state, 'play');
  next = step(next, 'accept-effect', next.execution.decision!.selection!.cards.slice(0, 2));
  resume(next, choose(next, 'accept-effect', [refs.credit!]));
  next.playPayment!.special!.discount++;
  expect(() => decodeState(encodeState(next))).toThrow();
});

test('Marauder may damage a friendly unit and then Exploit that same unit', () => {
  const input = position();
  input.players[0].hand = [{ card: 'the-marauder--a-new-home', ref: 'ship' }];
  input.players[0].ground = [{ card: ids.marine, ref: 'fodder' }];
  input.players[0].resources = resources(3);
  input.players[0].credits = ['credit'];
  const { state, refs } = scenario(input);
  let next = effects(state, state.players.alice!.leader, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {},
      optional: false,
      phaseAbilities: { exploit: 1 },
    },
  ]);
  next = step(next, 'play');
  expect(next.execution.frames[0]!.kind).toBe('special-play-payment');
  next = step(next, 'accept-effect', [refs.fodder!]);
  expect(next.cards[refs.fodder!]!.damage).toBe(1);
  expect(next.execution.frames[0]!.kind).toBe('exploit-payment');
  resume(next, choose(next, 'accept-effect', [refs.fodder!]));
  next = step(next, 'accept-effect', [refs.fodder!]);
  resume(next, choose(next, 'accept-effect', [refs.credit!]));
  next = step(next, 'accept-effect', [refs.credit!]);
  expect(next.cards[refs.ship!]!.zone).toBe('space');
  expect(next.cards[refs.fodder!]!.zone).toBe('discard');
});

test('Sneak Attack preserves Vernestra additional costs, readiness, and delayed defeat', () => {
  const input = position();
  input.players[0].hand = [
    { card: 'sneak-attack', ref: 'sneak' },
    { card: 'vernestra-rwoh--we-should-handle-this-ourselves', ref: 'vernestra' },
  ];
  input.players[0].discard = [{ card: 'j-type-nubian-starship', ref: 'nubian' }];
  input.players[0].resources = resources();
  const { state, refs } = scenario(input);
  let next = step(state, i => i.kind === 'play' && i.card === refs.sneak);
  next = step(next, 'play');
  resume(next, choose(next, 'accept-effect', [refs.nubian!]));
  next = step(next, 'accept-effect', [refs.nubian!]);
  expect(next.cards[refs.vernestra!]!).toMatchObject({ zone: 'ground', exhausted: false });
  expect(next.players.alice!.deck.at(-1)).toBe(refs.nubian!);
  expect(
    next.delayedEffects.some(
      d => d.kind === 'defeat-at-regroup' && d.target.instanceId === refs.vernestra,
    ),
  ).toBe(true);
});

test('a free-copy play still offers Marauder damage choices', () => {
  const input = position();
  input.players[0].space = [{ card: 'the-marauder--a-new-home', ref: 'ship' }];
  input.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  const { state, refs } = scenario(input);
  let next = effects(state, refs.ship!, [
    { kind: 'return-unit-with-upgrades', target: 'source', upgrades: 'none', freeNextCopy: true },
  ]);
  next = step(next, 'play');
  next = step(next, i => i.kind === 'choose-mode' && i.mode === 'play-for-free');
  expect(next.execution.frames[0]!.kind).toBe('special-play-payment');
  next = step(next, 'accept-effect', [refs.marine!]);
  expect(next.cards[refs.ship!]!.zone).toBe('space');
  expect(next.cards[refs.marine!]!.damage).toBe(1);
});

test('Ritual Dragon also readies rescued units', () => {
  const input = position();
  input.players[0].base = { card: 'dune-sea' };
  input.players[0].ground = [{ card: 'ritual-dragon', ref: 'dragon' }];
  input.players[1].ground = [{ card: ids.marine, ref: 'guard' }];
  input.captured = [{ card: ids.marine, owner: 'alice', guard: 'guard', ref: 'rescued' }];
  const { state, refs } = scenario(input);
  const next = effects(state, refs.guard!, [
    { kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } },
  ]);
  expect(next.cards[refs.rescued!]!).toMatchObject({ zone: 'ground', exhausted: false });
});

test('Nute damage sequences skip departed dealers and reject forged saved pools', () => {
  const input = position();
  input.players[0].ground = [
    { card: 'nute-gunray--perfectly-legal', ref: 'nute' },
    { card: ids.marine, ref: 'dealer' },
  ];
  input.players[1].ground = [
    { card: ids.consular, ref: 'first' },
    { card: ids.consular, ref: 'second' },
  ];
  const { state, refs } = scenario(input);
  let next = played(state, refs.nute!);
  for (const change of ['amount', 'dealer', 'target', 'index']) {
    const bad = structuredClone(next);
    const frame = bad.execution.frames[0]!;
    if (frame.kind !== 'different-unit-damage') throw new Error('Expected sequence');
    if (change === 'amount') frame.amount = 99;
    if (change === 'dealer') frame.dealers[0] = reference(bad.cards[refs.first!]!);
    if (change === 'target') frame.targets[0] = reference(bad.cards[refs.dealer!]!);
    if (change === 'index') frame.index = 99;
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
  next.execution.decision = null;
  next.execution.frames.unshift(
    ...effectFrames('alice', next.cards[refs.nute!]!, [
      { kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } },
    ]),
  );
  settle(next);
  expect(next.cards[refs.nute!]!.zone).toBe('discard');
  resume(
    next,
    choose(next, i => i.kind === 'target' && i.card === refs.first),
  );
  next = step(next, i => i.kind === 'target' && i.card === refs.first);
  expect(next.cards[refs.first!]!.damage).toBe(1);
  expect(next.cards[refs.second!]!.damage).toBe(0);
  expect(next.execution.decision!.kind).toBe('action');
});

test('Rampart protection validates its saved sources and cannot sacrifice one unit twice', () => {
  const input = position();
  input.players[0].base = { card: ids.base, ref: 'base' };
  input.players[0].ground = [
    { card: 'vice-admiral-rampart--a-new-era-of-safety', ref: 'rampart' },
    { card: ids.marine, ref: 'marine' },
  ];
  input.attachments = [
    { card: 'alliance-shield-generator', unit: 'base', ref: 'first' },
    { card: 'alliance-shield-generator', unit: 'base', ref: 'second' },
  ];
  const { state, refs } = scenario(input);
  let next = effects(state, state.players.bob!.leader, [
    {
      kind: 'select-upgrades',
      filter: { controller: 'enemy' },
      min: 'all',
      max: 'all',
      bind: 'upgrades',
      effects: [{ kind: 'move-upgrades', group: 'upgrades', to: 'discard' }],
    },
  ]);
  const bad = structuredClone(next);
  const frame = bad.execution.frames[0]!;
  if (frame.kind !== 'base-upgrade-protection') throw new Error('Expected protection');
  frame.protectors = [structuredClone(bad.cards[refs.marine!]!)];
  expect(() => decodeState(encodeState(bad))).toThrow();
  resume(
    next,
    choose(next, i => i.kind === 'target' && i.card === refs.rampart),
  );
  next = step(next, i => i.kind === 'target' && i.card === refs.rampart);
  expect(next.cards[refs.rampart!]!.zone).toBe('discard');
  expect([refs.first!, refs.second!].map(id => next.cards[id]!.zone).sort()).toEqual([
    'base',
    'discard',
  ]);
  expect(next.execution.decision!.kind).toBe('action');
});

test('Smuggling Greater Sarlacc permits its resource-defeat discount and replaces the resource', () => {
  const input = position();
  input.players[0].ground = [{ card: 'tech--source-of-insight' }];
  input.players[0].leader = { card: 'han-solo--audacious-smuggler' };
  input.players[0].resources = [
    { card: 'greater-sarlacc', ref: 'sarlacc', exhausted: true },
    ...resources(5),
  ];
  const { state, refs } = scenario(input);
  let next = step(state, i => i.kind === 'play' && i.card === refs.sarlacc);
  expect(next.execution.decision!.selection!.cards).not.toContain(refs.sarlacc!);
  next = step(next, 'accept-effect', next.execution.decision!.selection!.cards.slice(0, 4));
  expect(next.cards[refs.sarlacc!]!.zone).toBe('ground');
  expect(next.players.alice!.resources).toHaveLength(2);
});

test('Radiant VII offers its entire self-damage effect optionally', () => {
  const input = position();
  input.players[0].hand = [{ card: 'radiant-vii--negotiating-for-naboo', ref: 'ship' }];
  input.players[0].resources = resources();
  const { state, refs } = scenario(input);
  let next = step(state, i => i.kind === 'play' && i.card === refs.ship);
  expect(next.cards[refs.ship!]!.damage).toBe(0);
  next = step(next, 'decline-effect');
  expect(next.cards[refs.ship!]!.damage).toBe(0);
});

test('Jar Jar is not enabled by creating a Beast rather than giving a token upgrade', () => {
  const input = position();
  input.players[0].leader = { card: 'jar-jar-binks--bombad-general' };
  input.players[0].resources = resources();
  const { state } = scenario(input);
  const next = effects(state, state.players.alice!.leader, [
    { kind: 'create-unit', cardId: 'beast', count: 1 },
  ]);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'bombad',
    ),
  ).toBe(false);
});

test('Boga discard permission preserves its discount when paying with a Credit', () => {
  const input = position();
  input.players[0].ground = [{ card: 'boga--loyal-varactyl', ref: 'boga' }];
  input.players[0].discard = [{ card: ids.marine, ref: 'marine' }];
  input.players[0].credits = ['credit'];
  const { state, refs } = scenario(input);
  state.grantedPlays.push({
    scope: 'bound-card',
    recipient: 'self',
    free: false,
    discount: 1,
    ignoreAspectPenalties: false,
    source: structuredClone(state.cards[refs.boga!]!),
    target: reference(state.cards[refs.marine!]!),
    playerId: 'alice',
    round: state.round,
    phase: 'action',
  });
  state.execution.decision = null;
  settle(state);
  let next = step(state, i => i.kind === 'play' && i.card === refs.marine);
  expect(next.execution.decision!.selection).toMatchObject({ min: 1, max: 1 });
  next = step(next, 'accept-effect', [refs.credit!]);
  expect(next.cards[refs.marine!]!.zone).toBe('ground');
});

test.each(['shield', 'experience', 'advantage', 'weakness'])(
  'Boss Lyonie copies a selected %s token',
  token => {
    const input = position();
    input.players[0].ground = [
      { card: 'boss-lyonie--hypnotized', ref: 'lyonie' },
      { card: ids.consular, ref: 'host' },
    ];
    input.attachments = [{ card: token, unit: 'host', ref: 'token' }];
    const { state, refs } = scenario(input);
    let next = played(state, refs.lyonie!);
    next = step(next, i => i.kind === 'target' && i.card === refs.host);
    resume(next, choose(next, 'accept-effect', [refs.token!]));
    next = step(next, 'accept-effect', [refs.token!]);
    expect(
      Object.values(next.cards).filter(
        c => c.cardId === token && c.attachedTo?.instanceId === refs.host,
      ),
    ).toHaveLength(2);
  },
);

test('The First Legion removes the chosen enemy trait for this phase', () => {
  const input = position();
  input.players[0].ground = [
    { card: 'the-first-legion--vader-s-fist', ref: 'legion' },
    { card: ids.marine, ref: 'friendly' },
  ];
  input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(input);
  const definition = cardDefinition(state, 'the-first-legion--vader-s-fist');
  if (definition.kind !== 'unit') throw new Error('Expected unit');
  let next = effects(state, refs.legion!, definition.triggers![0]!.effects);
  resume(
    next,
    choose(next, i => i.kind === 'choose-mode' && i.mode === 'trooper'),
  );
  next = step(next, i => i.kind === 'choose-mode' && i.mode === 'trooper');
  expect(cardTraits(next, next.cards[refs.enemy!]!)).not.toContain('Trooper');
  expect(cardTraits(next, next.cards[refs.friendly!]!)).toContain('Trooper');
  expect(decodeState(encodeState(next))).toEqual(next);
});

test('Tarkin defeats the selected low-HP base at regroup', () => {
  const input = position();
  input.players[0].leader = {
    card: 'grand-moff-tarkin--tyrant-of-the-outer-rim',
    deployedAs: 'unit',
  };
  input.players[1].base = { card: ids.base, damage: 20 };
  const { state } = scenario(input);
  const definition = cardDefinition(state, 'grand-moff-tarkin--tyrant-of-the-outer-rim');
  if (definition.kind !== 'leader') throw new Error('Expected leader');
  let next = effects(
    state,
    state.players.alice!.leader,
    definition.faces.unit!.triggers![0]!.effects,
  );
  resume(
    next,
    choose(next, i => i.kind === 'target' && i.card === state.players.bob!.base),
  );
  next = step(next, i => i.kind === 'target' && i.card === state.players.bob!.base);
  expect(next.result).toMatchObject({ winner: 'alice' });
});
test('Nute recovers between dealers without reusing a selected target', () => {
  const input = position();
  input.players[0].ground = [
    { card: 'nute-gunray--perfectly-legal', ref: 'nute' },
    { card: ids.marine },
  ];
  input.players[1].ground = [
    { card: ids.consular, ref: 'first' },
    { card: ids.consular, ref: 'second' },
  ];
  const { state, refs } = scenario(input);
  let next = step(played(state, refs.nute!), i => i.kind === 'target' && i.card === refs.first);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.first,
    ),
  ).toBe(false);
  resume(
    next,
    choose(next, i => i.kind === 'target' && i.card === refs.second),
  );
  next = step(next, i => i.kind === 'target' && i.card === refs.second);
  expect(next.cards[refs.first!]!.damage).toBe(1);
  expect(next.cards[refs.second!]!.damage).toBe(1);
});
