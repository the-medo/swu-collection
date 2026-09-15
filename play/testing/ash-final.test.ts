import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { gameViewSchema } from '../view/parse.ts';
import { viewCommandSchema } from '../view/wire.ts';
import { supportedCards } from '../cards/registry.ts';
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
function sense() {
  const p = board('sense-through-the-force');
  p.players[0].deck = [
    { card: ids.fighter, ref: 'drawn' },
    ...Array.from({ length: 6 }, () => ({ card: ids.marine })),
  ];
  p.players[0].ground = [
    { card: 'marrok--mysterious-warrior', ref: 'force' },
    { card: ids.marine, ref: 'not-force' },
  ];
  p.players[1].ground = [{ card: 'marrok--mysterious-warrior', ref: 'enemy-force' }];
  return scenario(p);
}
const numberInput = (s: GameState, n: number) => ({
  ...choose(s, 'accept-effect'),
  chosenNumber: n,
});
test('Sense chooses a whole number before a private top-five search, reveals the selected card and gives three Advantage to an exact Force unit', () => {
  const g = sense();
  let s = step(g.state, 'play');
  expect(view(s, 'alice').decision!.effect).toBe('choose-number');
  expect(view(s, 'alice').decision!.inspectedCards).toEqual([]);
  const projector = new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'n'.repeat(32));
  const before = projector.project(s);
  const hidden = structuredClone(s);
  hidden.cards[g.refs.drawn!]!.cardId = ids.trooper;
  expect(projector.project(hidden)).toEqual(before);
  resume(s, numberInput(s, 1));
  s = advance(s, numberInput(s, 1)).state;
  expect(view(s, 'alice').decision!.inspectedCards).toHaveLength(5);
  expect(view(s, 'bob').decision).toBeNull();
  expect(view(s).decision).toBeNull();
  expect(s.facts.find(f => f.type === 'number-chosen')).toMatchObject({
    type: 'number-chosen',
    amount: 1,
  });
  resume(s, choose(s, 'search', [g.refs.drawn!]));
  s = step(s, 'search', [g.refs.drawn!]);
  expect(s.execution.random).not.toBeNull();
  s = random(s);
  expect(s.cards[g.refs.drawn!]!.zone).toBe('hand');
  expect(view(s).events.some(e => JSON.stringify(e).includes('TIE/ln Fighter'))).toBe(true);
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => o.intent.kind === 'target' && o.intent.card),
  ).toEqual(expect.arrayContaining([g.refs.force!, g.refs['enemy-force']!]));
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs['not-force'],
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs['enemy-force']),
  );
  s = target(s, g.refs['enemy-force']!);
  expect(tokens(s, g.refs['enemy-force']!)).toBe(3);
  expect(tokens(s, g.refs.force!)).toBe(0);
});
for (const n of [0, 27, Number.MAX_SAFE_INTEGER])
  test(`Sense accepts ${n} without restricting numbers to current printed costs`, () => {
    const g = sense();
    let s = advance(step(g.state, 'play'), numberInput(step(g.state, 'play'), n)).state;
    s = step(s, 'search', [g.refs.drawn!]);
    s = random(s);
    expect(s.execution.decision!.kind).toBe('action');
    expect(tokens(s, g.refs.force!)).toBe(0);
  });
test('Sense can find no card or decline its optional reward', () => {
  for (const take of [true, false]) {
    const g = sense();
    let s = step(g.state, 'play');
    s = advance(s, numberInput(s, 1)).state;
    s = step(s, 'search', take ? [g.refs.drawn!] : []);
    s = random(s);
    if (take) s = step(s, 'decline-effect');
    expect(s.execution.decision!.kind).toBe('action');
    expect(tokens(s, g.refs.force!)).toBe(0);
    expect(s.cards[g.refs.drawn!]!.zone).toBe(take ? 'hand' : 'deck');
  }
});
test('Number choices are validated at the wire, projector and engine and cannot be added to ordinary commands', () => {
  const g = sense(),
    s = step(g.state, 'play'),
    projector = new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'n'.repeat(32)),
    v = projector.project(s);
  const cmd = {
    gameId: s.gameId,
    epoch: v.epoch,
    expectedRevision: v.revision,
    decisionId: v.decision!.id,
    optionId: v.decision!.options[0]!.id,
    selections: [],
    chosenNumber: 0,
  };
  expect(gameViewSchema.safeParse(v).success).toBe(true);
  expect(advance(s, projector.command(s, cmd)).state.execution.frames[0]!.kind).toBe('search');
  for (const bad of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    expect(viewCommandSchema.safeParse({ ...cmd, chosenNumber: bad }).success).toBe(false);
    expect(() => projector.command(s, { ...cmd, chosenNumber: bad })).toThrow();
    expect(() => advance(s, numberInput(s, bad))).toThrow();
  }
  expect(() => advance(s, choose(s, 'accept-effect'))).toThrow();
  expect(() => advance(g.state, { ...choose(g.state, 'pass'), chosenNumber: 0 })).toThrow();
});
function wipe(attacker: string = ids.consular) {
  const p = board('wipe-them-out');
  p.players[0].ground = [{ card: attacker, ref: 'attacker' }];
  p.players[1].ground = [
    { card: ids.trooper, ref: 'defender' },
    { card: ids.marine, ref: 'extra' },
    { card: ids.marine, ref: 'copy' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'other-arena' }];
  return p;
}
function wipeAttack(g: ReturnType<typeof scenario>) {
  return attack(step(g.state, 'play'), g.refs.attacker!, g.refs.defender!);
}
test('Wipe redirects only excess to an exact unit in the defender’s arena as part of simultaneous combat', () => {
  const g = scenario(wipe()),
    s = wipeAttack(g);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(0);
  expect(s.cards[g.refs.defender!]!.zone).toBe('ground');
  const v = view(s, 'alice');
  expect(v.decision!.effect).toBe('redirect-excess-damage');
  expect(v.decision!.source!.name).toBe('Wipe Them Out');
  expect(gameViewSchema.safeParse(v).success).toBe(true);
  const targets = s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
  expect(targets).toEqual(expect.arrayContaining([g.refs.extra!, g.refs.copy!, g.refs.attacker!]));
  expect(targets).not.toContain(g.refs.defender!);
  expect(targets).not.toContain(g.refs['other-arena']!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.extra),
  );
  const done = target(s, g.refs.extra!);
  expect(done.cards[g.refs.attacker!]!.damage).toBe(3);
  expect(done.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(done.cards[g.refs.extra!]!.damage).toBe(2);
  expect(done.cards[g.refs.copy!]!.damage).toBe(0);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(0);
  expect(done.phaseHistory.damagedUnits.map(c => c.instanceId)).toContain(g.refs.extra!);
  expect(
    done.facts
      .filter(f => f.type === 'damage' && f.cards[0]?.instanceId === g.refs.attacker)
      .map(f => f.amount),
  ).toEqual([1, 2]);
});
test('Wipe can be declined; a unit without Overwhelm deals its full power to the defender', () => {
  const g = scenario(wipe()),
    s = step(wipeAttack(g), 'decline-effect');
  expect(s.cards[g.refs.extra!]!.damage).toBe(0);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
  expect(
    s.facts.find(f => f.type === 'damage' && f.cards[0]?.instanceId === g.refs.attacker)?.amount,
  ).toBe(3);
});
for (const redirect of [true, false])
  test(`Wipe with Overwhelm ${redirect ? 'redirects to a unit' : 'retains the normal base destination'}`, () => {
    const g = scenario(wipe());
    modifyUnit(g.state, g.state.cards[g.refs.attacker!]!, g.state.cards[g.refs.attacker!]!, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      abilities: { keywords: ['Overwhelm'] },
    });
    let s = wipeAttack(g);
    s = redirect ? target(s, g.refs.extra!) : step(s, 'decline-effect');
    expect(s.cards[s.players.bob!.base]!.damage).toBe(redirect ? 0 : 2);
    expect(s.cards[g.refs.extra!]!.damage).toBe(redirect ? 2 : 0);
  });
test('A Shield on the defender stops all damage and leaves the potential excess target’s Shield unused', () => {
  const p = wipe();
  p.attachments = [
    { card: 'shield', unit: 'defender', owner: 'bob' },
    { card: 'shield', unit: 'extra', owner: 'bob' },
  ];
  const g = scenario(p),
    s = wipeAttack(g);
  expect(s.execution.decision!.kind).toBe('action');
  expect(tokens(s, g.refs.defender!, 'shield')).toBe(0);
  expect(tokens(s, g.refs.extra!, 'shield')).toBe(1);
  expect(s.cards[g.refs.defender!]!.damage).toBe(0);
  expect(s.cards[g.refs.extra!]!.damage).toBe(0);
});
test('The redirected packet uses the destination’s Shield choices and recovers before simultaneous damage', () => {
  const p = wipe();
  p.attachments = [
    { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield1' },
    { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield2' },
  ];
  const g = scenario(p);
  const s = target(wipeAttack(g), g.refs.extra!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(s.cards[g.refs.defender!]!.zone).toBe('ground');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.shield2),
  );
  const done = target(s, g.refs.shield2!);
  expect(done.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(done.cards[g.refs.extra!]!.damage).toBe(0);
  expect(tokens(done, g.refs.extra!, 'shield')).toBe(1);
});
test('Wipe can redirect to the attacker without replacing the defender’s separate retaliation packet', () => {
  const g = scenario(wipe());
  const s = target(wipeAttack(g), g.refs.attacker!);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(5);
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
});
test('Wipe produces no excess while the defender survives zero remaining HP', () => {
  const p = wipe();
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.attacker!]!, g.state.cards[g.refs.defender!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    surviveZeroHp: true,
  });
  const s = wipeAttack(g);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.defender!]!.zone).toBe('ground');
  expect(s.cards[g.refs.defender!]!.damage).toBe(3);
});
test('Wipe respects readiness, Sentinel, bases and a missing attacker', () => {
  const p = wipe();
  p.players[1].ground!.push({ card: 'marrok--mysterious-warrior', ref: 'sentinel' });
  const g = scenario(p),
    s = step(g.state, 'play');
  expect(
    s.execution.decision!.options.every(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.sentinel,
    ),
  ).toBe(true);
  const empty = wipe();
  empty.players[0].ground = [];
  expect(step(scenario(empty).state, 'play').execution.decision!.kind).toBe('action');
  const tired = wipe();
  tired.players[0].ground![0]!.exhausted = true;
  expect(step(scenario(tired).state, 'play').facts.some(f => f.type === 'attacked')).toBe(false);
  const b = scenario(wipe());
  const done = attack(step(b.state, 'play'), b.refs.attacker!, b.state.players.bob!.base);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(done.execution.decision!.kind).toBe('action');
});
test('Every canonical card with an ASH printing has an explicit supported definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const ash = Object.entries(catalog)
    .filter(([, c]) =>
      Object.values((c as { variants: Record<string, { set: string }> }).variants).some(
        v => v.set === 'ash',
      ),
    )
    .map(([id]) => id);
  expect(ash).toHaveLength(267);
  expect(ash.filter(id => !supportedCards.some(c => c.cardId === id))).toEqual([]);
});
test('Wipe calculates excess after defender-first damage changes the attacker’s Grit power', () => {
  const g = scenario(wipe('the-stranger--no-survivors'));
  let s = wipeAttack(g);
  expect(s.execution.frames[0]!.kind).toBe('combat-order');
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'defender-first');
  expect(s.cards[g.refs.attacker!]!.damage).toBe(3);
  expect(view(s, 'alice').decision!.effect).toBe('redirect-excess-damage');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.extra),
  );
  s = target(s, g.refs.extra!);
  expect(s.cards[g.refs.extra!]!.zone).toBe('discard');
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
});
test('Wipe has no combat damage if the defender’s first strike defeats the attacker', () => {
  const p = wipe('the-stranger--no-survivors');
  p.players[0].ground![0]!.damage = 5;
  const g = scenario(p);
  let s = wipeAttack(g);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'defender-first');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(s.cards[g.refs.extra!]!.damage).toBe(0);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Wipe routes all combat power when an On Attack ability defeats the original defender', () => {
  const g = scenario(wipe('migs-mayfeld--how-about-a-toast-'));
  let s = wipeAttack(g);
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(view(s, 'alice').decision!.effect).toBe('redirect-excess-damage');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.extra),
  );
  s = target(s, g.refs.extra!);
  expect(s.cards[g.refs.extra!]!.damage).toBe(2);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(0);
});
test('Wipe checkpoints reject forged permission and routing incarnations', () => {
  const g = scenario(wipe()),
    s = wipeAttack(g);
  for (const mutate of [
    (s: GameState) => {
      s.attacks[0]!.excessToUnit!.source.cardId = 'open-fire';
    },
    (s: GameState) => {
      const f = s.execution.frames[0]!;
      if (f.kind === 'damage') f.assignments[0]!.excessRoute!.arena = 'space';
    },
  ]) {
    const forged = structuredClone(s);
    mutate(forged);
    expect(() => decodeState(encodeState(forged))).toThrow();
  }
});
test('Wipe uses the defender’s arena when Red Leader attacks across arenas', () => {
  const p = wipe();
  p.players[0].ground = [];
  p.players[0].space = [{ card: 'red-leader--strike-the-reactor', ref: 'attacker' }];
  const g = scenario(p);
  const s = wipeAttack(g);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.extra,
    ),
  ).toBe(true);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs['other-arena'],
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.extra),
  );
  expect(target(s, g.refs.extra!).cards[g.refs.extra!]!.zone).toBe('discard');
});
test('Wipe computes excess after partial prevention and does not consume prevention on an unused destination', () => {
  const p = wipe();
  p.attachments = [{ card: 'shield', unit: 'extra', owner: 'bob' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.defender!]!, g.state.cards[g.refs.defender!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    preventNextDamage: 3,
  });
  const s = wipeAttack(g);
  expect(s.cards[g.refs.defender!]!.damage).toBe(0);
  expect(tokens(s, g.refs.extra!, 'shield')).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Wipe retains damage doubling history while the redirected destination chooses a Shield', () => {
  const p = wipe();
  p.attachments = [
    { card: 'deadly-vulnerability', unit: 'defender' },
    { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield1' },
    { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield2' },
  ];
  const g = scenario(p);
  let s = target(wipeAttack(g), g.refs.extra!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.shield2),
  );
  s = target(s, g.refs.shield2!);
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(s.cards[g.refs.extra!]!.damage).toBe(0);
  expect(
    s.facts
      .filter(f => f.type === 'damage-prevented' && f.cards[1]?.instanceId === g.refs.extra)
      .map(f => f.amount),
  ).toEqual([5]);
});
