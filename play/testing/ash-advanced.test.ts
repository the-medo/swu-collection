import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { attackTargets } from '../engine/actions.ts';
import { playCost } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const raw = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => advance(s, choose(s, p, selection)).state;
function ordered(s: GameState): GameState {
  while (s.execution.decision?.kind === 'trigger') s = raw(s, 'trigger');
  return s;
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => ordered(raw(s, p, selection));
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const tokens = (s: GameState, id: string, kind = 'advantage') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === kind).length;
const view = (s: GameState, player?: string) =>
  new Projector(
    s.gameId,
    player ? { role: 'player', playerId: player } : { role: 'spectator' },
    'v'.repeat(32),
  ).project(s);
function board(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'source' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  return p;
}
function random(s: GameState) {
  const r = s.execution.random;
  if (!r) throw Error('Random request required');
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(() => 0),
  }).state;
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
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
test('Executor counts upgrades on other friendly units, including enemy-owned upgrades, but not itself', () => {
  const p = board('executor--final-destruction-of-the-alliance');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [
    { card: 'experience', unit: 'ally' },
    { card: 'bokken-saber', unit: 'ally', owner: 'bob' },
    { card: 'experience', unit: 'enemy', owner: 'bob' },
  ];
  const { state, refs } = scenario(p);
  const s = step(state, 'play');
  expect(tokens(s, refs.ally!)).toBe(1);
  expect(tokens(s, refs.source!)).toBe(0);
  expect(unitStats(s, s.cards[refs.source!]!).power).toBe(8);
  expect(tokens(s, refs.enemy!)).toBe(0);
});
test('Reckoning sums actual damage across both friendly arenas and ignores enemy damage', () => {
  const p = board('reckoning');
  p.players[0].ground = [{ card: ids.consular, damage: 2 }];
  p.players[0].space = [{ card: 'mercenary-fleet', damage: 3 }];
  p.players[1].ground = [{ card: ids.consular, damage: 1, ref: 'target' }];
  const { state, refs } = scenario(p);
  expect(target(step(state, 'play'), refs.target!).cards[refs.target!]!.damage).toBe(6);
});
test('Unfettered Ambition counts itself and every non-Advantage attachment, without counting existing Advantages', () => {
  const p = board('unfettered-ambition');
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [
    { card: 'advantage', unit: 'host' },
    { card: 'advantage', unit: 'host' },
    { card: 'experience', unit: 'host' },
    { card: 'shield', unit: 'host' },
  ];
  const { state, refs } = scenario(p);
  const s = step(state, i => i.kind === 'play' && i.target === refs.host);
  expect(tokens(s, refs.host!)).toBe(5);
});
for (const [card, traitCard, other] of [
  ['faith-in-the-empire', ids.trooper, ids.marine],
  ['the-way-of-the-mand-alor', 'warrior-of-clan-kryze', ids.marine],
] as const)
  test(`${card} discounts a matching host’s current traits, including an enemy host`, () => {
    const p = board(card);
    p.players[1].ground = [
      { card: traitCard, ref: 'match' },
      { card: other, ref: 'other' },
    ];
    const { state, refs } = scenario(p);
    const cardInstance = state.cards[refs.source!]!;
    expect(
      playCost(state, cardInstance, 0, undefined, state.cards[refs.other!]!) -
        playCost(state, cardInstance, 0, undefined, state.cards[refs.match!]!),
    ).toBe(1);
  });
for (const friendlyReady of [false, true])
  for (const enemyReady of [false, true])
    test(`Diplomatic Pageantry exhausts both selected units and requires two actual exhaustions (${friendlyReady}, ${enemyReady})`, () => {
      const p = board('diplomatic-pageantry');
      p.players[0].ground = [{ card: ids.consular, ref: 'ally', exhausted: !friendlyReady }];
      p.players[1].ground = [{ card: ids.consular, ref: 'enemy', exhausted: !enemyReady }];
      const { state, refs } = scenario(p);
      let s = target(step(state, 'play'), refs.ally!);
      expect(s.cards[refs.ally!]!.exhausted).toBe(!friendlyReady);
      resume(
        s,
        choose(s, i => i.kind === 'target' && i.card === refs.enemy),
      );
      s = target(s, refs.enemy!);
      expect(s.cards[refs.ally!]!.exhausted).toBe(true);
      expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
      expect(tokens(s, refs.ally!)).toBe(friendlyReady && enemyReady ? 2 : 0);
    });
test('Diplomatic Pageantry exhausts the available friendly unit even with no enemy unit', () => {
  const p = board('diplomatic-pageantry');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const { state, refs } = scenario(p);
  const s = target(step(state, 'play'), refs.ally!);
  expect(s.cards[refs.ally!]!.exhausted).toBe(true);
  expect(tokens(s, refs.ally!)).toBe(0);
});
for (const targetKind of ['unit', 'own-base', 'enemy-base'])
  test(`Nebulon-C Frigate may heal any ${targetKind}`, () => {
    const p = board('nebulon-c-frigate');
    p.players[0].base.damage = 5;
    p.players[1].base.damage = 5;
    p.players[1].ground = [{ card: ids.consular, ref: 'unit', damage: 5 }];
    const { state, refs } = scenario(p);
    const id =
      targetKind === 'unit'
        ? refs.unit!
        : state.players[targetKind === 'own-base' ? 'alice' : 'bob']!.base;
    const s = target(step(state, 'play'), id);
    expect(s.cards[id]!.damage).toBe(2);
  });
test('Tatooine Repulsor Train counts itself once exhausted and Sentinel overrides its protection', () => {
  for (const sentinel of [false, true]) {
    const p = position();
    p.players[0].ground = [
      { card: 'tatooine-repulsor-train', ref: 'train' },
      { card: ids.marine, ref: 'ally', exhausted: true },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (sentinel) p.attachments = [{ card: 'nowhere-to-hide', unit: 'train' }];
    const { state, refs } = scenario(p);
    expect(attackTargets(state, state.cards[refs.enemy!]!)).toContain(refs.train!);
    let s = attack(state, refs.train!, state.players.bob!.base);
    s = target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.damage).toBe(4);
    expect(attackTargets(s, s.cards[refs.enemy!]!).includes(refs.train!)).toBe(sentinel);
  }
});
test('Wicket cannot attack a base even when Saboteur ignores Sentinel', () => {
  const p = position();
  p.players[0].ground = [{ card: 'wicket--yub-nub-', ref: 'wicket' }];
  p.players[1].ground = [
    { card: 'imperial-loyalist', ref: 'sentinel' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  expect(attackTargets(state, state.cards[refs.wicket!]!)).toEqual([refs.sentinel!, refs.other!]);
});
test('Red Leader can attack either arena; only Sentinels in his own arena restrict declaration', () => {
  const p = position();
  p.players[0].space = [{ card: 'red-leader--strike-the-reactor', ref: 'red' }];
  p.players[1].space = [{ card: 'graceful-purrgil', ref: 'space-sentinel' }];
  p.players[1].ground = [
    { card: 'imperial-loyalist', ref: 'ground-sentinel' },
    { card: ids.marine, ref: 'ground' },
  ];
  const first = scenario(p);
  expect(attackTargets(first.state, first.state.cards[first.refs.red!]!)).toEqual([
    first.refs['space-sentinel']!,
  ]);
  p.players[1].space = [];
  const g = scenario(p);
  expect(attackTargets(g.state, g.state.cards[g.refs.red!]!)).toContain(g.refs.ground!);
  const s = attack(g.state, g.refs.red!, g.refs.ground!);
  expect(s.cards[g.refs.ground!]!.zone).toBe('discard');
});
test('Red Leader’s Support opens the opposite arena for a ground attacker and preserves exact legal choices after recovery', () => {
  const p = board('red-leader--strike-the-reactor');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const s = step(state, 'play');
  const input = choose(
    s,
    i => i.kind === 'attack' && i.attacker === refs.attacker && i.defender === refs.defender,
  );
  resume(s, input);
  const after = ordered(advance(s, input).state);
  expect(after.cards[refs.defender!]!.zone).toBe('discard');
  expect(effectiveAbilities(after, after.cards[refs.attacker!]!).attackBothArenas).toBe(false);
});
test('Treacherous Minefield affects only units present in the chosen arena and its On Attack ability survives recovery', () => {
  const p = board('treacherous-minefield');
  p.players[0].ground = [{ card: ids.consular, ref: 'ground' }];
  p.players[0].space = [{ card: 'mercenary-fleet', ref: 'space' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].hand = [{ card: ids.marine, ref: 'late' }];
  p.players[1].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
  const { state, refs } = scenario(p);
  let s = step(step(state, 'play'), i => i.kind === 'choose-mode' && i.mode === 'ground');
  s = step(s, 'play');
  expect(effectiveAbilities(s, s.cards[refs.late!]!).triggers).toEqual([]);
  const input = choose(
    s,
    i => i.kind === 'attack' && i.attacker === refs.ground && i.defender === s.players.bob!.base,
  );
  resume(s, input);
  s = ordered(advance(s, input).state);
  expect(s.cards[refs.ground!]!.damage).toBe(2);
  expect(s.cards[refs.space!]!.damage).toBe(0);
});
test('Clan Wren Loyalist privately searches traits of current friendly units, then reveals only the chosen card', () => {
  const p = board('clan-wren-loyalist');
  p.players[0].deck = [
    { card: 'perseverance', ref: 'no-trait' },
    { card: 'ddc-defender', ref: 'not-shared' },
    { card: ids.marine, ref: 'shared' },
    { card: 'mouse-droid', ref: 'unshared' },
    ...p.players[0].deck!,
  ];
  p.players[0].ground = [{ card: ids.marine }];
  const { state, refs } = scenario(p);
  let s = step(state, 'play');
  expect(s.execution.decision!.selection!.cards).toContain(refs.shared!);
  expect(s.execution.decision!.selection!.cards).not.toContain(refs['not-shared']!);
  expect(JSON.stringify(view(s))).not.toContain('DDC Defender');
  resume(s, choose(s, 'search', [refs.shared!]));
  s = step(s, 'search', [refs.shared!]);
  s = random(s);
  expect(s.cards[refs.shared!]!.zone).toBe('hand');
  expect(s.cards[refs['not-shared']!]!.zone).toBe('deck');
});
test('Eye of Sion searches against modified power and plays its chosen unit ready for free', () => {
  const p = position();
  p.players[0].space = [{ card: 'eye-of-sion--delivered-from-exile', ref: 'eye' }];
  p.players[0].deck = [
    { card: ids.consular, ref: 'chosen' },
    { card: 'summa-verminoth', ref: 'expensive' },
    ...p.players[0].deck!,
  ];
  p.attachments = [{ card: 'experience', unit: 'eye' }];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'use-ability' && i.card === refs.eye);
  expect(s.execution.decision!.selection!.cards).toContain(refs.chosen!);
  expect(s.execution.decision!.selection!.cards).not.toContain(refs.expensive!);
  s = step(s, 'search', [refs.chosen!]);
  s = random(s);
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(s.cards[refs.chosen!]!.zone).toBe('ground');
  expect(s.cards[refs.chosen!]!.exhausted).toBe(false);
  expect(s.cards[refs.eye!]!.exhausted).toBe(true);
});
test('Dathomiri Magicks discounts itself with a Force unit, excludes Vehicles, and plays at most three discarded units', () => {
  const p = board('dathomiri-magicks');
  p.players[0].ground = [{ card: 'ezra-bridger--the-force-is-all-i-need' }];
  p.players[0].discard = [
    { card: ids.fighter, ref: 'vehicle' },
    ...['one', 'two', 'three', 'four'].map(ref => ({ card: ids.marine, ref })),
  ];
  const { state, refs } = scenario(p);
  const without = structuredClone(state);
  const force = without.ground.find(
    id => without.cards[id]!.cardId === 'ezra-bridger--the-force-is-all-i-need',
  )!;
  without.cards[force]!.cardId = ids.consular;
  expect(
    playCost(without, without.cards[refs.source!]!) - playCost(state, state.cards[refs.source!]!),
  ).toBe(1);
  let s = step(state, 'play');
  for (const name of ['one', 'two', 'three']) {
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === refs.vehicle,
      ),
    ).toBe(false);
    s = step(s, i => i.kind === 'play' && i.card === refs[name]);
  }
  expect(s.cards[refs.four!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('action');
});
