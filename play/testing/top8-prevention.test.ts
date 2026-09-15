import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit, survivesZeroHp } from '../engine/lasting.ts';
import { indirectFrame, indirectSelection } from '../engine/indirect.ts';
import type { GameState, Intent, Frame } from '../engine/model.ts';
import { reference } from '../engine/state.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
const tragedy = 'the-tragedy-of-plagueis',
  deadly = 'deadly-vulnerability',
  droid = 'at-attin-safety-droid',
  shien = 'shien-flurry',
  force = 'chirrut--mwe--blind--but-not-deaf';
function board(card = tragedy) {
  const p = position();
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card, ref: 'event' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.consular, ref: 'other' },
  ];
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function damage(
  s: GameState,
  packets: { target: string; amount: number; unpreventable?: boolean }[],
) {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    {
      kind: 'damage',
      actor: 'bob',
      assignments: packets.map(p => ({
        target: reference(state.cards[p.target]!),
        amount: p.amount,
        source: structuredClone(state.cards[state.players.bob!.leader]!),
        preventedBy: null,
        ...(p.unpreventable ? { unpreventable: true } : {}),
      })),
    },
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
}
function protect(g: ReturnType<typeof scenario>) {
  return target(target(step(g.state, 'play'), g.refs.own!), g.refs.enemy!);
}
function regroup(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 60 && s.round === round; n++) {
    const d = s.execution.decision!;
    s = advance(
      s,
      choose(
        s,
        d.kind === 'resource'
          ? 'resource'
          : d.options.find(o => o.intent.kind === 'pass')
            ? 'pass'
            : d.options.find(o => o.intent.kind === 'decline-effect')
              ? 'decline-effect'
              : d.options[0]!.intent.kind,
        [],
      ),
    ).state;
  }
  expect(s.round).toBe(round + 1);
  return s;
}
function blank(s: GameState, id: string) {
  modifyUnit(s, s.cards[s.players.alice!.leader]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
}

test('Tragedy protects the chosen friendly unit before the opponent chooses its own unit to defeat', () => {
  const g = scenario(board());
  let s = target(step(g.state, 'play'), g.refs.own!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(survivesZeroHp(s, s.cards[g.refs.own!]!)).toBe(true);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.other!]!.zone).toBe('ground');
});
test('Tragedy resolves its enemy choice when there is no friendly unit, and can protect when the enemy has none', () => {
  for (const empty of [0, 1]) {
    const p = board();
    p.players[empty]!.ground = [];
    const g = scenario(p),
      s = target(step(g.state, 'play'), g.refs[empty === 0 ? 'enemy' : 'own']!);
    expect(s.execution.decision!.kind).toBe('action');
    if (empty === 0) expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
    else expect(survivesZeroHp(s, s.cards[g.refs.own!]!)).toBe(true);
  }
});
test('Tragedy permits zero and negative remaining HP and does not disappear when the unit loses abilities', () => {
  const g = scenario(board());
  let s = protect(g);
  blank(s, g.refs.own!);
  s = damage(s, [{ target: g.refs.own!, amount: 9 }]);
  expect(s.cards[g.refs.own!]!).toMatchObject({ zone: 'ground', damage: 9 });
  expect(unitStats(s, s.cards[g.refs.own!]!).hp).toBe(3);
  resume(s, choose(s, 'pass'));
  const next = regroup(s);
  expect(next.cards[g.refs.own!]!.zone).toBe('discard');
});
test('Tragedy prevents Overwhelm excess without preventing any damage and retains the separate indirect allocation limit', () => {
  const p = board();
  p.players[1].ground![1] = { card: 'maul--master-of-the-shadow-collective', ref: 'other' };
  const g = scenario(p);
  let s = protect(g);
  s = attack(s, g.refs.other!, g.refs.own!);
  expect(s.cards[g.refs.own!]!).toMatchObject({ zone: 'ground', damage: 6 });
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
  const frame = indirectFrame(s, 'bob', s.cards[g.refs.other!]!, 'alice', 12);
  expect(indirectSelection(s, frame).allocation.limits[g.refs.own!]).toBe(0);
});
test('Tragedy does not stop an explicit defeat instruction', () => {
  const g = scenario(board()),
    s = protect(g);
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    {
      kind: 'effect',
      playerId: 'bob',
      source: state.cards[state.players.bob!.leader]!,
      effect: { kind: 'on-unit', target: 'chosen', operation: { kind: 'defeat' } },
      bindings: { chosen: reference(state.cards[g.refs.own!]!) },
    },
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  expect(state.cards[g.refs.own!]!.zone).toBe('discard');
});

test('Deadly Vulnerability plays on an enemy unit and doubles ability damage including unpreventable damage', () => {
  for (const unpreventable of [false, true]) {
    const g = scenario(board(deadly));
    let s = step(
      g.state,
      i => i.kind === 'play' && i.card === g.refs.event && i.target === g.refs.other,
    );
    s = damage(s, [{ target: g.refs.other!, amount: 2, unpreventable }]);
    expect(s.cards[g.refs.other!]!.damage).toBe(4);
  }
});
test('multiple Deadly Vulnerabilities each double damage once', () => {
  const p = board();
  p.attachments = [
    { card: deadly, unit: 'other', ref: 'one' },
    { card: deadly, unit: 'other', ref: 'two' },
  ];
  const g = scenario(p);
  let s = damage(g.state, [{ target: g.refs.other!, amount: 1 }]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.two),
  );
  s = target(s, g.refs.two!);
  expect(s.cards[g.refs.other!]!.damage).toBe(4);
});
test('Deadly removes attacking Overwhelm, even through host ability loss or a new Overwhelm grant', () => {
  const p = board('flash-the-vents');
  p.players[0].ground![0] = { card: ids.consular, ref: 'own' };
  p.attachments = [{ card: deadly, unit: 'enemy' }];
  const g = scenario(p);
  blank(g.state, g.refs.enemy!);
  const s = attack(target(step(g.state, 'play'), g.refs.own!), g.refs.own!, g.refs.enemy!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
  expect(s.cards[g.refs.own!]!.zone).toBe('ground');
  expect(
    s.facts
      .filter(f => f.type === 'damage' && f.cards.at(-1)?.instanceId === g.refs.enemy)
      .map(f => f.amount),
  ).toEqual([10]);
});
test('blanking the upgrade itself disables Deadly damage doubling and Overwhelm suppression', () => {
  const p = board('flash-the-vents');
  p.players[0].ground![0] = { card: ids.consular, ref: 'own' };
  p.attachments = [{ card: deadly, unit: 'enemy', ref: 'deadly' }];
  const g = scenario(p);
  g.state.namedEffects.push({
    id: 'blank-deadly',
    source: structuredClone(g.state.cards[g.state.players.alice!.leader]!),
    name: 'Deadly Vulnerability',
    restriction: 'lose-abilities',
    playerId: 'alice',
    appliesTo: 'each',
    expires: { kind: 'phase', phase: g.state.phase as 'action', round: g.state.round },
  });
  const s = attack(target(step(g.state, 'play'), g.refs.own!), g.refs.own!, g.refs.enemy!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(s.cards[g.refs.own!]!.zone).toBe('discard');
});
test('the affected controller may choose a Shield before or after mandatory damage doubling', () => {
  for (const first of ['deadly', 'shield']) {
    const p = board();
    p.attachments = [
      { card: deadly, unit: 'other', ref: 'deadly' },
      { card: 'shield', unit: 'other', ref: 'shield' },
    ];
    const g = scenario(p);
    let s = damage(g.state, [{ target: g.refs.other!, amount: 3 }]);
    expect(s.execution.decision!.playerId).toBe('bob');
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs[first]),
    );
    s = target(s, g.refs[first]!);
    expect(s.cards[g.refs.other!]!.damage).toBe(0);
    expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
    expect(s.facts.filter(f => f.type === 'damage-prevented').at(-1)!.amount).toBe(
      first === 'deadly' ? 6 : 3,
    );
  }
});

function droidBoard() {
  const p = board();
  p.players[0].ground = [{ card: droid, ref: 'droid' }];
  return p;
}
test('At Attin caps each base damage packet at four, while unpreventable damage bypasses the cap', () => {
  const g = scenario(droidBoard());
  let s = damage(g.state, [
    { target: g.state.players.alice!.base, amount: 6 },
    { target: g.state.players.alice!.base, amount: 5 },
  ]);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(8);
  s = damage(s, [{ target: s.players.alice!.base, amount: 7, unpreventable: true }]);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(15);
});
test('At Attin protects a simultaneous base hit even if the same event defeats the Droid', () => {
  const g = scenario(droidBoard()),
    s = damage(g.state, [
      { target: g.refs.droid!, amount: 5 },
      { target: g.state.players.alice!.base, amount: 9 },
    ]);
  expect(s.cards[g.refs.droid!]!.zone).toBe('discard');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
});
test('At Attin caps Overwhelm excess, and multiple copies do not reduce below four', () => {
  const p = droidBoard();
  p.activePlayer = 'bob';
  p.players[0].ground!.push({ card: droid, ref: 'second' }, { card: ids.trooper, ref: 'defender' });
  p.players[1].ground = [{ card: 'maul--master-of-the-shadow-collective', ref: 'maul' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.maul!, g.refs.defender!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
  s = step(s, 'decline-effect');
  expect(s.cards[g.refs.droid!]!.zone).toBe('ground');
});
test('At Attin’s damage cap is lost with its abilities', () => {
  const g = scenario(droidBoard());
  blank(g.state, g.refs.droid!);
  const s = damage(g.state, [{ target: g.state.players.alice!.base, amount: 6 }]);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(6);
});

function shienGame() {
  const p = board(shien);
  p.players[0].ground = [];
  p.players[0].hand!.push({ card: force, ref: 'force' });
  return scenario(p);
}
function shienPlay(g: ReturnType<typeof scenario>) {
  return step(
    step(g.state, i => i.kind === 'play' && i.card === g.refs.event),
    i => i.kind === 'play' && i.card === g.refs.force,
  );
}
test('Shien separately pays for a Force unit and grants Ambush plus prevention before its played triggers', () => {
  const g = shienGame();
  const pending = shienPlay(g);
  expect(pending.execution.frames[0]).toMatchObject({ kind: 'effect', effect: { kind: 'ambush' } });
  expect(pending.facts.filter(f => f.type === 'played').map(f => f.amount)).toEqual([3, 6]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.force!]!).toMatchObject({ zone: 'ground', damage: 1 });
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(effectiveAbilities(s, s.cards[g.refs.force!]!).keywords).toContain('Ambush');
});
test('Shien filters non-Force cards and leaves an unaffordable Force card in hand', () => {
  const p = board(shien);
  p.players[0].resources = Array.from({ length: 3 }, () => ({ card: ids.marine }));
  p.players[0].hand!.push({ card: force, ref: 'force' }, { card: ids.marine, ref: 'ordinary' });
  const h = scenario(p),
    s = step(h.state, i => i.kind === 'play' && i.card === h.refs.event);
  expect(s.cards[h.refs.force!]!.zone).toBe('hand');
  expect(s.execution.decision!.kind).toBe('action');
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  const j = scenario(p),
    choice = step(j.state, i => i.kind === 'play' && i.card === j.refs.event);
  expect(
    choice.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
  ).toEqual([{ kind: 'play', card: j.refs.force! }]);
});
test('choosing a Shield first preserves Shien’s one-use prevention for later damage', () => {
  const g = shienGame();
  let s = step(shienPlay(g), 'decline-effect');
  // Add legal physical tokens through a settled scenario-free engine effect.
  s.execution.decision = null;
  s.execution.frames = [
    {
      kind: 'effect',
      playerId: 'alice',
      source: s.cards[s.players.alice!.leader]!,
      effect: {
        kind: 'on-unit',
        target: 'unit',
        operation: { kind: 'give-token', token: 'shield', count: 1 },
      },
      bindings: { unit: reference(s.cards[g.refs.force!]!) },
    },
    { kind: 'action' },
  ];
  settle(s);
  const shield = Object.values(s.cards).find(
    c => c.cardId === 'shield' && c.attachedTo?.instanceId === g.refs.force,
  )!;
  s = damage(s, [{ target: g.refs.force!, amount: 3 }]);
  s = target(s, shield.instanceId);
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(true);
  s = damage(s, [{ target: g.refs.force!, amount: 3 }]);
  expect(s.cards[g.refs.force!]!.damage).toBe(1);
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
});
test('partial prevention and damage doubling resolve in the affected player’s chosen order', () => {
  for (const first of ['event', 'deadly']) {
    const p = board();
    p.players[0].ground = [{ card: force, ref: 'unit' }];
    p.attachments = [{ card: deadly, unit: 'unit', ref: 'deadly' }];
    p.players[0].hand = [];
    p.players[0].discard = [{ card: shien, ref: 'event' }];
    const h = scenario(p);
    modifyUnit(h.state, h.state.cards[h.refs.event!]!, h.state.cards[h.refs.unit!]!, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      preventNextDamage: 2,
    });
    let s = damage(h.state, [{ target: h.refs.unit!, amount: 3 }]);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === h.refs[first]),
    );
    s = target(s, h.refs[first]!);
    expect(s.cards[h.refs.unit!]!.damage).toBe(first === 'event' ? 2 : 4);
    expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
  }
});
test('Shien prevention survives ability loss and unpreventable damage, then expires with the phase', () => {
  const g = shienGame();
  let s = step(shienPlay(g), 'decline-effect');
  blank(s, g.refs.force!);
  s = damage(s, [{ target: g.refs.force!, amount: 1, unpreventable: true }]);
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(true);
  s = damage(s, [{ target: g.refs.force!, amount: 1 }]);
  expect(s.cards[g.refs.force!]!.damage).toBe(1);
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
  const h = shienGame(),
    done = regroup(step(shienPlay(h), 'decline-effect'));
  expect(done.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
});
test('checkpoint validation rejects repeated damage transformations or forged partial amounts', () => {
  const p = board();
  p.attachments = [
    { card: deadly, unit: 'other', ref: 'deadly' },
    { card: 'shield', unit: 'other', ref: 'one' },
    { card: 'shield', unit: 'other', ref: 'two' },
  ];
  const g = scenario(p);
  const s = target(damage(g.state, [{ target: g.refs.other!, amount: 2 }]), g.refs.deadly!);
  expect(decodeState(encodeState(s))).toEqual(s);
  for (const corruption of ['amount', 'repeat']) {
    const bad = structuredClone(s),
      f = bad.execution.frames[0] as Extract<Frame, { kind: 'damage' }>;
    if (corruption === 'amount') f.assignments[0]!.amount++;
    else f.assignments[0]!.replacements!.push(f.assignments[0]!.replacements![0]!);
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});

test('partial prevention stops Overwhelm excess when its defender survives, without redirecting the prevented damage', () => {
  const p = board();
  p.activePlayer = 'bob';
  p.players[0].hand = [];
  p.players[0].discard = [{ card: shien, ref: 'shien' }];
  p.players[0].ground = [{ card: force, ref: 'unit' }];
  p.players[1].ground = [{ card: 'maul--master-of-the-shadow-collective', ref: 'maul' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.shien!]!, g.state.cards[g.refs.unit!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    preventNextDamage: 2,
  });
  const s = attack(g.state, g.refs.maul!, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!).toMatchObject({ zone: 'ground', damage: 3 });
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});
test('partial prevention can reduce a hit to zero before a Shield is consumed', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].discard = [{ card: shien, ref: 'shien' }];
  p.attachments = [{ card: 'shield', unit: 'own', ref: 'shield' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.shien!]!, g.state.cards[g.refs.own!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    preventNextDamage: 2,
  });
  const pending = damage(g.state, [{ target: g.refs.own!, amount: 2 }]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.shien),
  );
  const s = target(pending, g.refs.shien!);
  expect(s.cards[g.refs.own!]!.damage).toBe(0);
  expect(s.cards[g.refs.shield!]!.attachedTo?.instanceId).toBe(g.refs.own);
  expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
});
