import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, canAttach, unitStats } from '../engine/attachments.ts';
import { unitIsLeader } from '../engine/attributes.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const r2 = 'r2-d2--artooooooooo-',
  armorer = 'the-armorer--steel-shapes-us',
  han = 'han-solo--never-tell-me-the-odds';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
function board() {
  const p = position();
  for (const player of p.players)
    player.resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy-vehicle' }];
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
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

test('R2 can join an occupied friendly Vehicle, adds stats and permits a second Pilot when first', () => {
  for (const occupied of [false, true]) {
    const p = board();
    p.players[0].hand = [
      { card: r2, ref: 'r2' },
      { card: 'academy-graduate', ref: 'pilot' },
    ];
    if (occupied) p.attachments = [{ card: 'astromech-pilot', unit: 'vehicle', ref: 'existing' }];
    const g = scenario(p),
      s = step(
        g.state,
        i => i.kind === 'play' && i.card === g.refs.r2 && i.target === g.refs.vehicle,
      );
    expect(s.cards[g.refs.r2!]!.attachedTo?.instanceId).toBe(g.refs.vehicle);
    expect(unitStats(s, s.cards[g.refs.vehicle!]!)).toEqual(
      occupied ? { power: 4, hp: 5 } : { power: 3, hp: 2 },
    );
    expect(canAttach(s, s.cards[g.refs.pilot!]!, s.cards[g.refs.vehicle!]!)).toBe(!occupied);
    expect(effectiveAbilities(s, s.cards[g.refs.vehicle!]!).extraPilotSlots).toBe(1);
  }
});
test('R2 remains an ordinary unit when played as a unit and cannot pilot an enemy or non-Vehicle', () => {
  const p = board();
  p.players[0].hand = [{ card: r2, ref: 'r2' }];
  const g = scenario(p);
  const options = g.state.execution
    .decision!.options.map(o => o.intent)
    .filter(i => i.kind === 'play');
  expect(options).toEqual([
    { kind: 'play', card: g.refs.r2! },
    { kind: 'play', card: g.refs.r2!, target: g.refs.vehicle!, piloting: 'pilot' },
  ]);
  const s = step(g.state, i => i.kind === 'play' && !i.target);
  expect(unitStats(s, s.cards[g.refs.r2!]!)).toEqual({ power: 1, hp: 4 });
  expect(s.cards[g.refs.r2!]!.exhausted).toBe(true);
});
test('host ability loss suppresses R2’s granted capacity without removing either attached Pilot', () => {
  const p = board();
  p.players[0].hand = [{ card: 'academy-graduate', ref: 'pilot' }];
  p.attachments = [{ card: r2, unit: 'vehicle', ref: 'r2' }];
  const g = scenario(p);
  blank(g.state, g.refs.vehicle!);
  expect(canAttach(g.state, g.state.cards[g.refs.pilot!]!, g.state.cards[g.refs.vehicle!]!)).toBe(
    false,
  );
  expect(attachedUpgrades(g.state, g.state.cards[g.refs.vehicle!]!)).toHaveLength(1);
  expect(unitStats(g.state, g.state.cards[g.refs.vehicle!]!)).toEqual({ power: 3, hp: 2 });
});
function armorerBoard() {
  const p = board();
  p.players[0].leader = { card: armorer, ref: 'armorer' };
  p.players[0].resources = [
    { card: 'academy-training', ref: 'upgrade' },
    { card: ids.marine, ref: 'payment' },
  ];
  p.players[0].deck![0] = { card: 'open-fire', ref: 'replacement' };
  p.enteredThisPhase = ['enemy', 'vehicle'];
  return p;
}
function forge(s: GameState, id: string) {
  return step(use(s, 'forge-upgrade'), 'accept-effect', [id]);
}
test('Armorer’s front can upgrade an enemy that entered this phase, uses that resource to pay, and replaces it exhausted', () => {
  const g = scenario(armorerBoard()),
    pending = forge(g.state, g.refs.upgrade!);
  expect(
    pending.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
  ).toEqual([
    { kind: 'play', card: g.refs.upgrade!, target: g.refs.enemy! },
    { kind: 'play', card: g.refs.upgrade!, target: g.refs.vehicle! },
  ]);
  resume(
    pending,
    choose(pending, i => i.kind === 'play' && i.target === g.refs.enemy),
  );
  const s = step(pending, i => i.kind === 'play' && i.target === g.refs.enemy);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.enemy);
  expect(s.cards[g.refs.payment!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.replacement!]!).toMatchObject({ zone: 'resources', exhausted: true });
  expect(s.players.alice!.resources).toHaveLength(2);
  expect(unitStats(s, s.cards[g.refs.enemy!]!)).toEqual({ power: 5, hp: 5 });
});
test('Armorer can play a Pilot as an upgrade from resources, with the Pilot cost and friendly Vehicle restriction', () => {
  const p = armorerBoard();
  p.players[0].resources![0] = { card: r2, ref: 'upgrade' };
  const g = scenario(p),
    pending = forge(g.state, g.refs.upgrade!);
  expect(
    pending.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
  ).toEqual([{ kind: 'play', card: g.refs.upgrade!, target: g.refs.vehicle!, piloting: 'pilot' }]);
  const s = step(pending, 'play'); // Heroism penalty: both resources, including R2.
  expect(s.cards[g.refs.payment!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.vehicle);
});
test('Armorer pays exhaustion even when there is no eligible host, and declining play does not replace a resource', () => {
  for (const missing of [false, true]) {
    const p = armorerBoard();
    if (missing) p.enteredThisPhase = [];
    const g = scenario(p),
      pending = forge(g.state, g.refs.upgrade!);
    const s = missing ? pending : step(pending, 'decline-effect');
    expect(s.cards[g.refs.armorer!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.upgrade!]!.zone).toBe('resources');
    expect(s.cards[g.refs.replacement!]!.zone).toBe('deck');
    expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
  }
});
test('Armorer’s private resource inspection recovers without exposing faces to the opponent or spectator', () => {
  const g = scenario(armorerBoard()),
    pending = use(g.state, 'forge-upgrade');
  resume(pending, choose(pending, 'accept-effect', [g.refs.upgrade!]));
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const view = new Projector(pending.gameId, viewer, 'v'.repeat(32)).project(pending);
    expect(JSON.stringify(view)).not.toContain('academy-training');
    expect(JSON.stringify(view)).not.toContain('open-fire');
  }
});
test('Armorer’s attack-ended ability survives her defeat, uses any friendly host and can be declined', () => {
  const p = armorerBoard();
  p.enteredThisPhase = [];
  p.players[0].leader = {
    card: armorer,
    ref: 'armorer',
    deployedAs: 'unit',
    damage: 3,
    abilityUses: { deploy: 1 },
  };
  const g = scenario(p),
    pending = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.armorer && i.defender === g.refs.enemy,
    );
  expect(pending.cards[g.refs.armorer!]!.zone).toBe('base');
  expect(pending.execution.frames[0]!.kind).toBe('optional-trigger');
  expect(step(pending, 'decline-effect').cards[g.refs.upgrade!]!.zone).toBe('resources');
  const inspecting = step(pending, 'accept-effect');
  const selecting = step(inspecting, 'accept-effect', [g.refs.upgrade!]);
  expect(
    selecting.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .every(
        o => o.intent.kind === 'play' && [g.refs.own, g.refs.vehicle].includes(o.intent.target),
      ),
  ).toBe(true);
  const s = step(selecting, i => i.kind === 'play' && i.target === g.refs.own);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.own);
});
test('Armorer’s Epic counts exhausted resources without spending them and has no front action after deployment', () => {
  const p = armorerBoard();
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine, exhausted: true }));
  p.players[0].leader.exhausted = true;
  const g = scenario(p),
    s = use(g.state, 'deploy');
  expect(s.cards[g.refs.armorer!]!).toMatchObject({
    zone: 'ground',
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
  expect(unitStats(s, s.cards[g.refs.armorer!]!)).toEqual({ power: 4, hp: 6 });
  expect(effectiveAbilities(s, s.cards[g.refs.armorer!]!).actions).toHaveLength(0);
});
function hanBoard() {
  const p = board();
  p.players[0].leader = { card: han, ref: 'han' };
  p.players[0].ground = [
    { card: ids.trooper, ref: 'odd' },
    { card: ids.marine, ref: 'even' },
    { card: ids.consular, ref: 'higher' },
    { card: ids.trooper, ref: 'exhausted', exhausted: true },
  ];
  p.players[0].deck![0] = { card: 'open-fire', ref: 'reveal' };
  return p;
}
test('Han reveals before choosing a ready attacker, retains the deck order and resumes with the exact revealed identity', () => {
  const g = scenario(hanBoard()),
    before = [...g.state.players.alice!.deck],
    pending = use(g.state, 'different-odds');
  expect(pending.players.alice!.deck).toEqual(before);
  expect(pending.facts.findLast(f => f.type === 'revealed')!.cards[0]!.instanceId).toBe(
    g.refs.reveal!,
  );
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.exhausted,
    ),
  ).toBe(false);
  expect(pending.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
    false,
  );
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.odd),
  );
  const selected = target(pending, g.refs.odd!);
  resume(
    selected,
    choose(selected, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base),
  );
  const s = step(selected, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  expect(unitStats(s, s.cards[g.refs.odd!]!).power).toBe(3);
  expect(s.players.alice!.deck).toEqual(before);
});
test('Han gives no attack bonus for equal odd costs, an even attacker, an even reveal or an empty deck', () => {
  for (const variant of ['equal', 'attacker-even', 'reveal-even', 'empty']) {
    const p = hanBoard();
    if (variant === 'equal') p.players[0].deck![0] = { card: ids.trooper };
    if (variant === 'reveal-even') p.players[0].deck![0] = { card: ids.marine };
    if (variant === 'empty') p.players[0].deck = [];
    const g = scenario(p),
      selected = target(
        use(g.state, 'different-odds'),
        g.refs[variant === 'attacker-even' ? 'even' : 'odd']!,
      );
    const s = step(selected, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  }
});
test('Han reveals even if no unit can attack and public logs show only the revealed top card', () => {
  const p = hanBoard();
  p.players[0].ground = [];
  p.players[0].space = [];
  p.players[0].deck![1] = { card: 'academy-training', ref: 'hidden' };
  const g = scenario(p),
    s = use(g.state, 'different-odds');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.han!]!.exhausted).toBe(true);
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const view = new Projector(s.gameId, viewer, 'v'.repeat(32)).project(s);
    expect(JSON.stringify(view)).toContain('open-fire');
    expect(JSON.stringify(view)).not.toContain('academy-training');
    expect(view.cards.some(c => c.face?.cardId === 'open-fire')).toBe(false);
  }
});
test('Han’s upgrade deployment counts odd printed costs of each friendly unit and upgrade once, including Han', () => {
  const p = hanBoard();
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine, exhausted: true }));
  p.players[0].ground = [
    { card: ids.trooper, ref: 'odd' },
    { card: ids.marine, ref: 'even' },
  ];
  p.attachments = [
    { card: r2, unit: 'vehicle', ref: 'r2' },
    { card: 'astromech-pilot', unit: 'enemy-vehicle', owner: 'bob' },
    { card: 'academy-training', unit: 'odd', ref: 'even-upgrade' },
  ];
  const g = scenario(p),
    choice = use(g.state, 'deploy');
  const s = step(choice, i => i.kind === 'target' && i.card === g.refs.vehicle);
  // TIE/ln (1), trooper (1), R2 (printed 1, Pilot 0), Han (5).
  expect(s.execution.decision!.selection!.max).toBe(4);
  expect(s.execution.decision!.selection!.min).toBe(1);
  expect(unitIsLeader(s, s.cards[g.refs.vehicle!]!)).toBe(true);
  expect(unitStats(s, s.cards[g.refs.vehicle!]!)).toEqual({ power: 6, hp: 6 });
  const chosen = s.players.alice!.resources.slice(0, 4);
  resume(s, choose(s, 'accept-effect', chosen));
  const ready = step(s, 'accept-effect', chosen);
  expect(ready.players.alice!.resources.filter(id => !ready.cards[id]!.exhausted)).toHaveLength(4);
  // Repeated foreach choices may designate the same resource; one distinct card is legal.
  const repeated = step(s, 'accept-effect', [chosen[0]!]);
  expect(
    repeated.players.alice!.resources.filter(id => !repeated.cards[id]!.exhausted),
  ).toHaveLength(1);
});
test('Han’s ordinary unit deployment has no ready-resource trigger and shares the Epic limit with his upgrade choice', () => {
  const p = hanBoard();
  p.players[0].leader.exhausted = true;
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine, exhausted: true }));
  const g = scenario(p),
    choice = use(g.state, 'deploy'),
    s = step(choice, i => i.kind === 'choose-mode' && i.mode === 'deploy-unit');
  expect(s.cards[g.refs.han!]!).toMatchObject({
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
  expect(unitStats(s, s.cards[g.refs.han!]!)).toEqual({ power: 3, hp: 7 });
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
});

test('Armorer resources after playing the upgrade but before its nested When Played ability', () => {
  const p = armorerBoard();
  p.players[0].resources = [
    { card: 'boshek--charismatic-smuggler', ref: 'upgrade' },
    ...Array.from({ length: 3 }, () => ({ card: ids.marine })),
  ];
  p.players[0].deck![1] = { card: ids.marine, ref: 'milled-even' };
  p.players[0].deck![2] = { card: ids.trooper, ref: 'milled-odd' };
  const g = scenario(p),
    s = step(forge(g.state, g.refs.upgrade!), 'play');
  expect(s.cards[g.refs.replacement!]!.zone).toBe('resources');
  expect(s.cards[g.refs['milled-even']!]!.zone).toBe('discard');
  expect(s.cards[g.refs['milled-odd']!]!.zone).toBe('hand');
  const played = s.facts.findIndex(f => f.type === 'played');
  const resourced = s.facts.findIndex(f => f.type === 'resourced');
  const discarded = s.facts.findIndex(f => f.type === 'discarded');
  expect(played).toBeLessThan(resourced);
  expect(resourced).toBeLessThan(discarded);
});
