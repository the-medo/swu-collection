import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { keywordNames } from '../engine/effective-abilities.ts';
import { unitStats } from '../engine/attachments.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { reference } from '../engine/state.ts';
import { triggerDefinitions, defeatedAbilityChoices } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { CardInstance, GameState, Intent, EngineInput } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const bossk = 'bossk--hunting-his-prey',
  jabba = 'jabba-the-hutt--his-high-exaltedness';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState, p = 'alice') => s.cards[s.players[p]!.leader]!;
function board(id = jabba, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'friend' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}
function effects(
  s: GameState,
  e: CardEffect[],
  bindings: Record<string, ReturnType<typeof reference>> = {},
  source: CardInstance = leader(s),
) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: source.controller,
      source: structuredClone(source),
      effect,
      bindings,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
}
function refresh(s: GameState) {
  s.execution.decision = null;
  settle(s);
  return s;
}
function defeat(s: GameState, ...cards: string[]) {
  return effects(
    s,
    [{ kind: 'defeat-bound', targets: cards.map((_, n) => 'target' + n) }],
    Object.fromEntries(cards.map((id, n) => ['target' + n, reference(s.cards[id]!)])),
  );
}
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
const activate = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const paid = (s: GameState, id: string) =>
  s.facts.filter(f => f.type === 'played' && f.cards.some(c => c.instanceId === id)).at(-1)!.amount;
function chooseBounty(s: GameState, source?: string) {
  const frame = s.execution.frames[0]!;
  if (frame.kind === 'trigger-batch') {
    if (s.execution.decision!.kind === 'trigger-player')
      s = step(s, i => i.kind === 'trigger-player' && i.playerId === 'alice');
    const f = s.execution.frames[0]!;
    if (f.kind !== 'trigger-batch') return s;
    const t = f.triggers.find(
      t =>
        (!source || t.source.instanceId === source) &&
        triggerDefinitions(s, t.source, t.abilities).find(a => a.id === t.abilityId)?.timing ===
          'bounty',
    )!;
    s = step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
  }
  return s;
}
for (const deployed of [false, true])
  for (const own of [false, true])
    test(`Jabba grants a phase Bounty collected by the opposing controller (${deployed}, ${own})`, () => {
      const p = board(jabba, deployed);
      p.players[own ? 1 : 0].hand = [{ card: ids.marine, ref: 'play' }];
      if (own) p.players[1].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
      const g = scenario(p),
        chosen = g.refs[own ? 'friend' : 'enemy']!;
      let s = target(activate(g.state), chosen);
      expect(keywordNames(s, s.cards[chosen]!)).toContain('Bounty');
      s = defeat(s, chosen);
      expect(s.execution.decision!.playerId).toBe(own ? 'bob' : 'alice');
      resume(s, choose(s, 'accept-effect'));
      s = step(s, 'accept-effect');
      const m = s.playModifiers[0]!;
      expect(m.playerId).toBe(own ? 'bob' : 'alice');
      expect(m.source.controller).toBe(own ? 'alice' : 'bob');
      expect(m.discount).toBe(deployed ? 2 : 1);
      expect(decodeState(encodeState(s))).toEqual(s);
      if (s.activePlayer !== m.playerId) s = step(s, 'pass');
      s = step(s, i => i.kind === 'play' && i.card === g.refs.play);
      expect(paid(s, g.refs.play!)).toBe((own ? 2 : 4) - (deployed ? 2 : 1));
      expect(s.playModifiers).toHaveLength(0);
    });

test('Declining a Bounty creates no discount or collected history', () => {
  const g = scenario(board());
  let s = target(activate(g.state), g.refs.enemy!);
  s = defeat(s, g.refs.enemy!);
  s = step(s, 'decline-effect');
  expect(s.usedBounties).toHaveLength(0);
  expect(s.playModifiers).toHaveLength(0);
});

test('Jabba deployment uses another friendly guard and can capture a Bounty from either arena', () => {
  const p = board();
  p.players[1].space = [{ card: 'cartel-turncoat', ref: 'prey' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === leader(s).instanceId,
    ),
  ).toBe(false);
  resume(s, choose(s, 'target'));
  s = target(s, g.refs.friend!);
  s = target(s, g.refs.prey!);
  expect(s.cards[g.refs.prey!]!.capturedBy!.instanceId).toBe(g.refs.friend!);
  expect(s.execution.decision!.playerId).toBe('alice');
  s = step(s, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(1);
});

test('Jabba cannot capture a leader and has no deployment capture without another friendly unit', () => {
  const p = board();
  p.players[0].ground = [];
  const g = scenario(p);
  const s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(s.activePlayer).toBe('bob');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('ground');
});

for (const accept of [false, true])
  test(`Bossk's leader action damages only Bounty units and offers the exact surviving unit a phase power bonus (${accept})`, () => {
    const p = board(bossk);
    p.players[1].ground = [
      { card: 'fugitive-wookiee', ref: 'prey' },
      { card: ids.marine, ref: 'plain' },
    ];
    const g = scenario(p);
    let s = activate(g.state);
    expect(
      s.execution
        .decision!.options.filter(o => o.intent.kind === 'target')
        .map(o => o.intent.kind === 'target' && o.intent.card),
    ).toEqual([g.refs.prey!]);
    s = target(s, g.refs.prey!);
    expect(s.cards[g.refs.prey!]!.damage).toBe(1);
    resume(s, choose(s, accept ? 'target' : 'decline-effect'));
    s = accept ? target(s, g.refs.prey!) : step(s, 'decline-effect');
    expect(unitStats(s, s.cards[g.refs.prey!]!).power).toBe(accept ? 4 : 3);
  });

test('Bossk does not boost a defeated target and collects its Bounty after the action', () => {
  const p = board(bossk);
  p.players[1].ground = [{ card: 'fugitive-wookiee', damage: 2, ref: 'prey' }];
  const g = scenario(p);
  let s = target(activate(g.state), g.refs.prey!);
  expect(s.cards[g.refs.prey!]!.zone).toBe('discard');
  expect(s.execution.frames[0]!.kind).toBe('optional-trigger');
  s = step(s, 'accept-effect');
  s = target(s, g.refs.friend!);
  expect(s.cards[g.refs.friend!]!.exhausted).toBe(true);
  expect(s.usedBounties).toHaveLength(1);
});

for (const repeat of [false, true])
  test(`Bossk can repeat the collected Bounty once per round (${repeat})`, () => {
    const p = board(bossk, true);
    p.players[1].space = [
      { card: 'cartel-turncoat', ref: 'prey' },
      { card: 'cartel-turncoat', ref: 'second' },
    ];
    const g = scenario(p);
    let s = defeat(g.state, g.refs.prey!);
    s = step(s, 'accept-effect');
    expect(s.players.alice!.hand).toHaveLength(1);
    resume(s, choose(s, repeat ? 'accept-effect' : 'decline-effect'));
    s = step(s, repeat ? 'accept-effect' : 'decline-effect');
    expect(s.players.alice!.hand).toHaveLength(repeat ? 2 : 1);
    s = defeat(s, g.refs.second!);
    s = step(s, 'accept-effect');
    expect(s.players.alice!.hand).toHaveLength(repeat ? 3 : 2);
    expect(s.execution.frames[0]!.kind === 'optional-trigger').toBe(!repeat);
  });

test('Bossk repeats the same exact Bounty with a fresh target choice and preserved source controller', () => {
  const p = board(bossk, true);
  p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
  const g = scenario(p);
  let s = step(defeat(g.state, g.refs.prey!), 'accept-effect');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.friend),
  );
  s = target(s, g.refs.friend!);
  s = step(s, 'accept-effect');
  expect(s.execution.decision!.playerId).toBe('alice');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === leader(s).instanceId),
  );
  s = target(s, leader(s).instanceId);
  expect(leader(s).exhausted).toBe(true);
  expect(s.usedBounties.map(t => t.source.instanceId)).toEqual([g.refs.prey!, g.refs.prey!]);
  expect(s.usedBounties.every(t => t.source.controller === 'bob')).toBe(true);
});

test('Printed and upgrade-granted Bounties remain independent after simultaneous attachment cleanup', () => {
  const p = board();
  p.players[1].space = [{ card: 'cartel-turncoat', ref: 'prey' }];
  p.attachments = [{ card: 'death-mark', unit: 'prey', ref: 'mark', owner: 'alice' }];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.prey!);
  expect(s.cards[g.refs.mark!]!.zone).toBe('discard');
  s = chooseBounty(s, g.refs.prey!);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  s = chooseBounty(s, g.refs.prey!);
  s = step(s, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(s.usedBounties).toHaveLength(2);
});

test('Bounty is not an explicit When Defeated ability', () => {
  const p = board();
  p.players[1].space = [{ card: 'cartel-turncoat', ref: 'prey' }];
  const g = scenario(p);
  expect(defeatedAbilityChoices(g.state, g.state.cards[g.refs.prey!]!)).toHaveLength(0);
});

test('Lost abilities remove Bounty and Bossk cannot select the blanked unit', () => {
  const p = board(bossk);
  p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
  const g = scenario(p);
  modifyUnit(g.state, leader(g.state), g.state.cards[g.refs.prey!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  refresh(g.state);
  expect(keywordNames(g.state, g.state.cards[g.refs.prey!]!)).not.toContain('Bounty');
  const s = defeat(g.state, g.refs.prey!);
  expect(s.usedBounties).toHaveLength(0);
  expect(s.execution.frames[0]!.kind).toBe('action');
});

test('A Bounty choice belongs only to its collector while its exact source is public to every viewer', () => {
  const p = board();
  p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
  const g = scenario(p);
  let s = step(defeat(g.state, g.refs.prey!), 'accept-effect');
  const alice = new Projector(
      s.gameId,
      { role: 'player', playerId: 'alice' },
      'a'.repeat(32),
    ).project(s),
    bob = new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'b'.repeat(32)).project(s),
    spectator = new Projector(s.gameId, { role: 'spectator' }, 'c'.repeat(32)).project(s);
  expect(alice.decision!.source!.cardId).toBe('fugitive-wookiee');
  expect(bob.decision).toBeNull();
  expect(spectator.decision).toBeNull();
});

for (const capture of [false, true])
  test(`A stolen unit's Bounty belongs to its controller's opponent, regardless of printed ownership (${capture})`, () => {
    const p = board();
    p.players[0].ground = [
      { card: ids.marine, ref: 'friend' },
      { card: 'fugitive-wookiee', controller: 'bob', ref: 'prey' },
    ];
    const g = scenario(p);
    let s = capture
      ? effects(g.state, [{ kind: 'capture-unit', guard: 'guard', target: 'prey' }], {
          guard: reference(g.state.cards[g.refs.friend!]!),
          prey: reference(g.state.cards[g.refs.prey!]!),
        })
      : defeat(g.state, g.refs.prey!);
    expect(s.execution.decision!.playerId).toBe('alice');
    s = step(s, 'accept-effect');
    resume(s, choose(s, 'target'));
    s = target(s, g.refs.friend!);
    expect(s.usedBounties[0]!.source.owner).toBe('alice');
    expect(s.usedBounties[0]!.source.controller).toBe('bob');
  });

test('Two identical Jabba grants are independent Bounties and their discounts stack', () => {
  const g = scenario(board());
  let s = target(activate(g.state), g.refs.enemy!);
  s = step(s, 'pass');
  leader(s).exhausted = false;
  refresh(s);
  s = target(activate(s), g.refs.enemy!);
  s = defeat(s, g.refs.enemy!);
  s = step(chooseBounty(s), 'accept-effect');
  s = step(chooseBounty(s), 'accept-effect');
  expect(s.playModifiers).toHaveLength(2);
  expect(s.usedBounties).toHaveLength(2);
});

test('Bounties and explicit When Defeated abilities share a timing window with separate controllers', () => {
  const p = board();
  p.players[1].ground = [{ card: 'superlaser-technician', ref: 'prey' }];
  p.attachments = [{ card: 'death-mark', unit: 'prey', ref: 'mark' }];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.prey!);
  expect(s.execution.decision!.kind).toBe('trigger-player');
  resume(
    s,
    choose(s, i => i.kind === 'trigger-player' && i.playerId === 'alice'),
  );
  s = chooseBounty(s);
  s = step(s, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.execution.decision!.playerId).toBe('bob');
});

test('Defeating Bossk simultaneously with the Bounty unit prevents a later repeat trigger', () => {
  const p = board(bossk, true);
  p.players[1].space = [{ card: 'cartel-turncoat', ref: 'prey' }];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.prey!, leader(g.state).instanceId);
  s = step(s, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.execution.frames[0]!.kind).toBe('action');
});

test('Bossk can finish an already triggered repeat after leaving play', () => {
  const p = board(bossk, true);
  p.players[1].space = [{ card: 'cartel-turncoat', ref: 'prey' }];
  const g = scenario(p);
  let s = step(defeat(g.state, g.refs.prey!), 'accept-effect');
  s = defeat(s, leader(s).instanceId);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(2);
});

test('Jabba Bounties expire with the phase and cannot be collected on a later defeat', () => {
  const g = scenario(board());
  let s = target(activate(g.state), g.refs.enemy!);
  for (let i = 0; i < 10 && s.round === 1; i++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(2);
  expect(keywordNames(s, s.cards[g.refs.enemy!]!)).not.toContain('Bounty');
  s = defeat(s, g.refs.enemy!);
  expect(s.usedBounties).toHaveLength(0);
});

test('A token can have a Bounty, and capture collects it even though the token leaves the game', () => {
  const p = board();
  p.players[1].ground = [{ card: 'battle-droid', ref: 'prey' }];
  const g = scenario(p);
  let s = target(activate(g.state), g.refs.prey!);
  s = effects(s, [{ kind: 'capture-unit', guard: 'guard', target: 'prey' }], {
    guard: reference(s.cards[g.refs.friend!]!),
    prey: reference(s.cards[g.refs.prey!]!),
  });
  expect(s.cards[g.refs.prey!]!.zone).toBe('set-aside');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.playModifiers[0]!.playerId).toBe('alice');
});

for (const change of ['collector', 'context', 'repeat'] as const)
  test(`Bounty checkpoints reject a forged ${change}`, () => {
    const p = board(bossk, true);
    p.players[1].ground = [{ card: 'fugitive-wookiee', ref: 'prey' }];
    const g = scenario(p);
    let s = step(defeat(g.state, g.refs.prey!), 'accept-effect');
    if (change === 'collector') s.usedBounties[0]!.playerId = 'bob';
    else if (change === 'context') {
      const f = s.execution.frames[0]!;
      if (f.kind !== 'effect') throw new Error('Expected Bounty effect');
      f.values!['bounty-context'] = 999;
    } else {
      s = target(s, g.refs.friend!);
      const f = s.execution.frames[0]!;
      if (f.kind !== 'optional-trigger') throw new Error('Expected repeat');
      f.trigger.values!['used-bounty'] = 999;
    }
    expect(() => decodeState(encodeState(s))).toThrow();
  });

test('Bossk can repeat another Bounty in a later round', () => {
  const p = board(bossk, true);
  p.players[1].space = [
    { card: 'cartel-turncoat', ref: 'first' },
    { card: 'cartel-turncoat', ref: 'second' },
  ];
  const g = scenario(p);
  let s = step(step(defeat(g.state, g.refs.first!), 'accept-effect'), 'accept-effect');
  for (let i = 0; i < 10 && s.round === 1; i++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(2);
  const count = s.players.alice!.hand.length;
  s = step(step(defeat(s, g.refs.second!), 'accept-effect'), 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(count + 2);
});

test('Bounty calculations use the collector while keeping the defeated unit as their source', () => {
  const p = board();
  p.players[0].hand = [{ card: ids.marine }, { card: ids.marine }];
  const g = scenario(p);
  modifyUnit(g.state, leader(g.state), g.state.cards[g.refs.enemy!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: {
      bounties: [
        {
          id: 'draw-hand-size',
          effects: [
            { kind: 'draw-cards', amount: { kind: 'zone-size', zone: 'hand', player: 'self' } },
          ],
        },
      ],
    },
  });
  refresh(g.state);
  let s = step(defeat(g.state, g.refs.enemy!), 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(4);
  expect(s.players.bob!.hand).toHaveLength(0);
  expect(s.usedBounties[0]!.source.controller).toBe('bob');
});

test('A deployed leader can carry Jabba’s Bounty and its return to base preserves the reward', () => {
  const p = board();
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit' };
  const g = scenario(p),
    id = leader(g.state, 'bob').instanceId;
  let s = target(activate(g.state), id);
  s = defeat(s, id);
  expect(s.cards[id]!.zone).toBe('base');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.playModifiers[0]!.playerId).toBe('alice');
});
