import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { activeAbilities } from '../engine/abilities.ts';
import { attachedUpgrades, isUnit, unitStats } from '../engine/attachments.ts';
import { isUpgrade } from '../engine/roles.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance, move } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

function fixture(pilot = 'clone-pilot', resources = 6) {
  const p = position('piloting-position');
  p.players[0].hand = [{ card: pilot, ref: 'pilot' }];
  p.players[0].resources = Array.from({ length: resources }, () => ({ card: ids.marine }));
  p.players[0].ground = [
    { card: ids.marine, ref: 'infantry' },
    { card: 'skyhopper-canyon-runner', ref: 'speeder' },
  ];
  p.players[0].space = [
    { card: ids.fighter, ref: 'fighter' },
    { card: ids.fighter, ref: 'other' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  return p;
}
function step(
  state: GameState,
  predicate: Intent['kind'] | ((i: Intent) => boolean),
  cards: string[] = [],
) {
  return advance(state, choose(state, predicate, cards)).state;
}
function pilot(state: GameState, card: string, target: string) {
  return step(
    state,
    i => i.kind === 'play' && i.card === card && i.target === target && i.piloting === 'piloting',
  );
}
function resume(state: GameState, input: unknown) {
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
  return JSON.parse(child.stdout.toString()).state;
}

test('v8 Piloting: choose unit or upgrade; eligible hosts are friendly Vehicles in either arena without a Pilot', () => {
  const p = fixture();
  p.attachments = [{ card: 'clone-pilot', unit: 'other', ref: 'occupied' }];
  const { state: initial, refs } = scenario(p);
  const options = initial.execution
    .decision!.options.map(o => o.intent)
    .filter(i => i.kind === 'play');
  expect(options).toEqual([
    { kind: 'play', card: refs.pilot! },
    { kind: 'play', card: refs.pilot!, target: refs.speeder!, piloting: 'piloting' },
    { kind: 'play', card: refs.pilot!, target: refs.fighter!, piloting: 'piloting' },
  ]);
  const played = pilot(initial, refs.pilot!, refs.fighter!);
  expect(instance(played, refs.pilot!)).toMatchObject({
    zone: 'space',
    attachedTo: { instanceId: refs.fighter!, incarnation: 1 },
    exhausted: false,
    damage: 0,
  });
  expect(isUnit(played, instance(played, refs.pilot!))).toBe(false);
  expect(isUpgrade(played, instance(played, refs.pilot!))).toBe(true);
  expect(unitStats(played, instance(played, refs.fighter!))).toEqual({ power: 4, hp: 3 });
  expect(played.players.alice!.resources.filter(id => instance(played, id).exhausted)).toHaveLength(
    2,
  );
  const unit = step(initial, i => i.kind === 'play' && i.card === refs.pilot && !i.piloting);
  expect(instance(unit, refs.pilot!)).toMatchObject({
    zone: 'ground',
    attachedTo: null,
    exhausted: true,
  });
});

test('alternate Piloting costs use their own printed cost and aspect icons', () => {
  const a = scenario(fixture('astromech-pilot', 3));
  expect(a.state.execution.decision!.options.filter(o => o.intent.kind === 'play')).toEqual([
    expect.objectContaining({ intent: { kind: 'play', card: a.refs.pilot! } }),
  ]);
  const b = scenario(fixture('astromech-pilot', 4));
  const state = pilot(b.state, b.refs.pilot!, b.refs.fighter!);
  expect(state.players.alice!.resources.every(id => instance(state, id).exhausted)).toBe(true);
  expect(state.facts.find(f => f.type === 'played')?.amount).toBe(4);
});

test('only the upgrade profile triggers Astromech healing; its exact source survives recovery and departure', () => {
  const p = fixture('astromech-pilot');
  // A ground unit is also a legal healing target, including an enemy.
  p.players[1].space = [];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 3 }];
  const { state: initial, refs } = scenario(p);
  const unit = step(initial, i => i.kind === 'play' && i.card === refs.pilot && !i.piloting);
  expect(unit.execution.decision?.kind).toBe('action');
  const state = pilot(initial, refs.pilot!, refs.fighter!);
  expect(state.execution.decision).toMatchObject({ kind: 'effect', playerId: 'alice' });
  const input = choose(state, i => i.kind === 'target' && i.card === refs.enemy);
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(instance(after, refs.enemy!).damage).toBe(1);
  const gone = structuredClone(state);
  move(gone, instance(gone, refs.pilot!), 'discard');
  const continued = advance(decodeState(encodeState(gone)), input).state;
  expect(instance(continued, refs.enemy!).damage).toBe(1);
  expect(step(state, 'decline-effect').execution.decision?.playerId).toBe('bob');
});

test('Academy Graduate grants Sentinel only while attached; upgrade removal drops its stats and permits base attacks', () => {
  const p = fixture('academy-graduate');
  p.players[1].hand = [{ card: 'outer-rim-constable', ref: 'removal' }];
  p.players[1].resources = [{ card: ids.marine }, { card: ids.marine }];
  const { state: initial, refs } = scenario(p);
  let state = pilot(initial, refs.pilot!, refs.fighter!);
  expect(activeAbilities(state, instance(state, refs.pilot!)).keywords).toBeUndefined();
  expect(
    state.execution.decision!.options.filter(o => o.intent.kind === 'attack').map(o => o.intent),
  ).toEqual([{ kind: 'attack', attacker: refs.enemy!, defender: refs.fighter! }]);
  state = step(state, i => i.kind === 'play' && i.card === refs.removal);
  expect(
    state.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.pilot,
    ),
  ).toBe(true);
  state = step(state, i => i.kind === 'target' && i.card === refs.pilot);
  expect(instance(state, refs.pilot!).zone).toBe('discard');
  state = step(state, 'pass');
  expect(
    state.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === state.players.alice!.base,
    ),
  ).toBe(true);
  expect(unitStats(state, instance(state, refs.fighter!))).toEqual({ power: 2, hp: 1 });
});

test('losing a Pilot can defeat its host through lost HP; attached Pilots never take damage or attack as units', () => {
  const p = fixture();
  p.players[0].hand = [
    { card: 'open-fire', ref: 'damage' },
    { card: 'outer-rim-constable', ref: 'remove' },
  ];
  p.players[0].space![0]!.damage = 2;
  p.attachments = [
    { card: 'clone-pilot', unit: 'fighter', ref: 'pilot' },
    { card: 'shield', unit: 'fighter', ref: 'shield' },
  ];
  const { state: initial, refs } = scenario(p);
  expect(
    initial.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.attacker === refs.pilot,
    ),
  ).toBe(false);
  const damage = step(initial, i => i.kind === 'play' && i.card === refs.damage);
  expect(
    damage.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.pilot,
    ),
  ).toBe(false);
  let state = step(initial, i => i.kind === 'play' && i.card === refs.remove);
  state = step(state, i => i.kind === 'target' && i.card === refs.pilot);
  expect(instance(state, refs.fighter!).zone).toBe('discard');
  expect(instance(state, refs.shield!).zone).toBe('set-aside');
  expect(instance(state, refs.pilot!).zone).toBe('discard');
  expect(instance(state, refs.pilot!).attachedTo).toBeNull();
});

test('Sneak Attack can play a Pilot only as a unit; search-for-upgrade excludes Piloting cards', () => {
  const p = fixture();
  p.players[0].hand!.push({ card: 'sneak-attack', ref: 'sneak' });
  const a = scenario(p);
  const state = step(a.state, i => i.kind === 'play' && i.card === a.refs.sneak);
  expect(state.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'play', card: a.refs.pilot! },
    { kind: 'decline-effect' },
  ]);
  const played = step(state, 'play');
  expect(isUnit(played, instance(played, a.refs.pilot!))).toBe(true);
  expect(instance(played, a.refs.pilot!).exhausted).toBe(false);
  const search = fixture('greef-karga--affable-commissioner');
  search.players[0].deck = [
    { card: 'clone-pilot', ref: 'pilot' },
    { card: 'academy-training', ref: 'upgrade' },
  ];
  search.players[0].hand![0]!.ref = 'searcher';
  const b = scenario(search);
  const looking = step(b.state, i => i.kind === 'play' && i.card === b.refs.searcher);
  expect(looking.execution.decision?.selection?.cards).toEqual([b.refs.upgrade!]);
});

test('Pilot projections expose the runtime upgrade, both exact-copy play choices and no hidden faces', () => {
  const { state: initial, refs } = scenario(fixture());
  const player = new Projector(initial.gameId, { role: 'player', playerId: 'alice' });
  const before = player.project(initial);
  const host = before.cards.find(c => c.face?.cardId === ids.fighter && c.controller === 'alice')!;
  const option = before.decision!.options.find(
    o => o.piloting === 'piloting' && o.cards.includes(host.id),
  )!;
  const input = player.command(initial, {
    gameId: initial.gameId,
    epoch: before.epoch,
    expectedRevision: before.revision,
    decisionId: before.decision!.id,
    optionId: option.id,
    selections: [],
  });
  const state = advance(initial, input).state;
  const view = player.project(state);
  const attachment = view.cards.find(c => c.face?.cardId === 'clone-pilot')!;
  expect(attachment).toMatchObject({
    face: { kind: 'upgrade', printedKind: 'unit', power: 2, hp: 2 },
    attachedTo: host.id,
  });
  expect(view.events.find(f => f.type === 'attached')?.cards.map(c => c.currentCardId)).toEqual([
    attachment.id,
    host.id,
  ]);
  expect(attachedUpgrades(state, instance(state, refs.fighter!))).toHaveLength(1);
  const other = fixture('academy-graduate');
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    expect(new Projector(initial.gameId, viewer, 'p'.repeat(32)).project(initial)).toEqual(
      new Projector(initial.gameId, viewer, 'p'.repeat(32)).project(scenario(other).state),
    );
  }
});

test('scenario attachments enforce eligibility and checkpoints reject a unit masquerading as an upgrade', () => {
  for (const unit of ['infantry', 'enemy', 'pilot']) {
    const p = fixture();
    p.attachments = [{ card: 'clone-pilot', unit, owner: 'alice' }];
    expect(() => scenario(p)).toThrow();
  }
  const p = fixture();
  p.attachments = [1, 2].map(() => ({ card: 'clone-pilot', unit: 'fighter' }));
  expect(() => scenario(p)).toThrow();
  const { state, refs } = scenario(fixture());
  instance(state, refs.infantry!).attachedTo = { instanceId: refs.fighter!, incarnation: 1 };
  expect(() => decodeState(encodeState(state))).toThrow('Unsupported attached role');
});

// This correctness check replays every prefix of 130 inputs; it is not a benchmark.
test('Piloting games replay every input with independent upgrade and unit appearances', () => {
  const c = config('pilot-recording');
  for (const player of c.players)
    player.deck = [
      { cardId: ids.fighter, quantity: 6 },
      { cardId: 'clone-pilot', quantity: 9 },
      { cardId: 'astromech-pilot', quantity: 9 },
    ];
  const game = new LocalGame(c, upper => upper - 1);
  let state = setup(game);
  for (let n = 0; n < 130 && !state.result; n++) {
    const d = state.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'play' && o.intent.piloting) ??
      d.options.find(o => o.intent.kind === 'play') ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(0, d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(state.facts.some(f => f.type === 'attached' && f.cards[0]?.cardId === 'clone-pilot')).toBe(
    true,
  );
  expect(
    state.facts.some(f => f.type === 'played' && f.cards[0]?.cardId === 'astromech-pilot'),
  ).toBe(true);
}, 30_000);
