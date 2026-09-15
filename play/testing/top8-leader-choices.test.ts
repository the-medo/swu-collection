import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const kylo = 'kylo-ren--we-re-not-done-yet',
  sabe = 'sab---queen-s-shadow';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
function board(leader = kylo) {
  const p = position();
  p.players[0].leader = { card: leader, ref: 'leader' };
  for (const player of p.players)
    player.resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
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

test('Kylo discards the selected hand card and draws only for a printed upgrade, not a Pilot unit', () => {
  for (const card of ['academy-training', 'astromech-pilot', ids.marine]) {
    const p = board();
    p.players[0].hand = [
      { card, ref: 'discard' },
      { card: ids.fighter, ref: 'keep' },
    ];
    p.players[0].deck![0] = { card: 'open-fire', ref: 'draw' };
    const g = scenario(p),
      pending = use(g.state, 'upgrade-recovery');
    resume(pending, choose(pending, 'accept-effect', [g.refs.discard!]));
    const s = step(pending, 'accept-effect', [g.refs.discard!]);
    expect(s.cards[g.refs.discard!]!.zone).toBe('discard');
    expect(s.cards[g.refs.draw!]!.zone).toBe(card === 'academy-training' ? 'hand' : 'deck');
    expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
    expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
  }
});
test('Kylo can exhaust with an empty hand but cannot invent a discard or draw', () => {
  const g = scenario(board()),
    s = use(g.state, 'upgrade-recovery');
  expect(s.cards[g.refs.leader!]!.exhausted).toBe(true);
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.facts.some(f => f.type === 'discarded' || f.type === 'drawn')).toBe(false);
});
function kyloDeployment() {
  const p = board();
  p.players[0].discard = [
    { card: 'nimble-prowess', ref: 'first' },
    { card: 'cybernetic-enhancements', ref: 'second' },
    { card: 'academy-training', ref: 'third' },
    { card: 'astromech-pilot', ref: 'pilot' },
    { card: 'open-fire', ref: 'event' },
  ];
  p.players[0].leader.exhausted = true;
  const g = scenario(p);
  return { ...g, pending: use(g.state, 'deploy') };
}
test('Kylo deploys ready without a resource payment and may stop before playing any discard upgrades', () => {
  const g = kyloDeployment(),
    s = g.pending;
  expect(s.cards[g.refs.leader!]!).toMatchObject({
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
  expect(unitStats(s, s.cards[g.refs.leader!]!)).toEqual({ power: 5, hp: 5 });
  expect(effectiveAbilities(s, s.cards[g.refs.leader!]!).keywords).toContain('Sentinel');
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
  ).toEqual([
    { kind: 'play', card: g.refs.first!, target: g.refs.leader! },
    { kind: 'play', card: g.refs.second!, target: g.refs.leader! },
    { kind: 'play', card: g.refs.third!, target: g.refs.leader! },
  ]);
  expect(
    step(s, 'decline-effect').players.alice!.resources.every(id => !s.cards[id]!.exhausted),
  ).toBe(true);
});
test('Kylo resolves each upgrade’s nested triggers before offering the next paid play, preserving exact copies through recovery', () => {
  const g = kyloDeployment();
  let s = g.pending;
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.first),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.first);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
    ),
  ).toBe(true);
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs.enemy);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.second),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.second);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(4);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.third);
  expect(attachedUpgrades(s, s.cards[g.refs.leader!]!).map(c => c.cardId)).toEqual([
    'nimble-prowess',
    'cybernetic-enhancements',
    'academy-training',
  ]);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(6);
});
test('Kylo recomputes affordability after every play instead of admitting an unpaid final upgrade', () => {
  const p = board();
  p.players[0].resources = Array.from({ length: 7 }, (_, n) => ({
    card: ids.marine,
    exhausted: n > 2,
  }));
  p.players[0].discard = [
    { card: 'cybernetic-enhancements', ref: 'paid' },
    { card: 'academy-training', ref: 'unpaid' },
  ];
  const g = scenario(p),
    s = step(use(g.state, 'deploy'), i => i.kind === 'play' && i.card === g.refs.paid);
  expect(s.cards[g.refs.paid!]!.attachedTo?.instanceId).toBe(g.refs.leader);
  expect(s.cards[g.refs.unpaid!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('action');
});
test('Kylo stops the sequence when his host role disappears and does not attach to the returned leader face', () => {
  const p = board();
  p.players[0].discard = Array.from({ length: 5 }, (_, n) => ({
    card: 'kill-switch',
    ref: `switch-${n}`,
  }));
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  for (let n = 0; n < 5; n++)
    s = step(s, i => i.kind === 'play' && i.card === g.refs[`switch-${n}`]);
  expect(s.cards[g.refs.leader!]!).toMatchObject({
    zone: 'base',
    deployedAs: null,
    exhausted: true,
    abilityUses: { deploy: 1 },
  });
  expect(attachedUpgrades(s, s.cards[g.refs.leader!]!)).toHaveLength(0);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.discard).toHaveLength(5);
});
function sabeBoard() {
  const p = board(sabe);
  p.players[1].deck = [
    { card: 'open-fire', ref: 'first' },
    { card: 'academy-training', ref: 'second' },
    { card: 'cybernetic-enhancements', ref: 'third' },
  ];
  p.players[1].hand = [
    { card: 'nimble-prowess', ref: 'hand-a' },
    { card: 'kill-switch', ref: 'hand-b' },
  ];
  return p;
}
function hitBase(s: GameState, attacker: string) {
  return step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === s.players.bob!.base,
  );
}
test('Sabé’s front may exhaust after friendly combat base damage, then must discard exactly one of the top two', () => {
  const g = scenario(sabeBoard()),
    cost = hitBase(g.state, g.refs.own!);
  expect(cost.cards[g.refs.leader!]!.exhausted).toBe(false);
  expect(cost.cards[cost.players.bob!.base]!.damage).toBe(3);
  expect(step(cost, 'decline-effect').cards[g.refs.first!]!.zone).toBe('deck');
  const pending = step(cost, 'accept-effect');
  expect(pending.cards[g.refs.leader!]!.exhausted).toBe(true);
  expect(pending.execution.decision!.selection).toEqual({
    cards: [g.refs.first!, g.refs.second!],
    min: 1,
    max: 1,
  });
  expect(() => step(pending, 'accept-effect', [])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [g.refs.second!]));
  const s = step(pending, 'accept-effect', [g.refs.second!]);
  expect(s.players.bob!.deck).toEqual([g.refs.first!, g.refs.third!]);
  expect(s.cards[g.refs.second!]!.zone).toBe('discard');
});
test('Sabé’s mandatory deck discard handles one or zero remaining cards without fatigue', () => {
  for (const n of [0, 1]) {
    const p = sabeBoard();
    p.players[1].deck = p.players[1].deck!.slice(0, n);
    const g = scenario(p),
      pending = step(hitBase(g.state, g.refs.own!), 'accept-effect');
    const s = n ? step(pending, 'accept-effect', [g.refs.first!]) : pending;
    expect(s.players.bob!.deck).toHaveLength(0);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  }
});
test('Sabé’s deck inspection is private, while the chosen discard becomes public and the remainder stays hidden', () => {
  const g = scenario(sabeBoard()),
    pending = step(hitBase(g.state, g.refs.own!), 'accept-effect');
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const view = new Projector(pending.gameId, viewer, 'v'.repeat(32)).project(pending);
    expect(JSON.stringify(view)).not.toContain('open-fire');
    expect(JSON.stringify(view)).not.toContain('academy-training');
  }
  const s = step(pending, 'accept-effect', [g.refs.second!]);
  const view = new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s);
  expect(JSON.stringify(view)).toContain('academy-training');
  expect(JSON.stringify(view)).not.toContain('open-fire');
});
test('Sabé ignores ability base damage and attacks which damage only a unit, and an exhausted front cannot pay again', () => {
  const p = sabeBoard();
  p.players[0].hand = [{ card: 'honor-bound-partisan', ref: 'event' }];
  const ability = scenario(p),
    played = step(
      step(ability.state, 'play'),
      i => i.kind === 'target' && i.card === ability.state.players.bob!.base,
    );
  expect(played.cards[played.players.bob!.base]!.damage).toBe(1);
  expect(played.cards[ability.refs.leader!]!.exhausted).toBe(false);
  expect(played.execution.decision!.kind).toBe('action');
  const g = scenario(sabeBoard()),
    combat = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.own && i.defender === g.refs.enemy,
    );
  expect(combat.cards[g.refs.leader!]!.exhausted).toBe(false);
  expect(combat.execution.decision!.kind).toBe('action');
  const exhausted = sabeBoard();
  exhausted.players[0].leader.exhausted = true;
  const e = scenario(exhausted),
    s = hitBase(e.state, e.refs.own!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[e.refs.first!]!.zone).toBe('deck');
});
test('Sabé’s unit face has Raid and privately inspects the defending hand; only a chosen discard causes a replacement draw', () => {
  const p = sabeBoard();
  p.players[0].leader = {
    card: sabe,
    ref: 'leader',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  const g = scenario(p),
    pending = hitBase(g.state, g.refs.leader!);
  expect(pending.cards[pending.players.bob!.base]!.damage).toBe(4);
  expect(pending.execution.frames[0]!.kind).toBe('zone-inspection');
  expect(pending.execution.decision!.selection).toEqual({
    cards: [g.refs['hand-a']!, g.refs['hand-b']!],
    min: 0,
    max: 1,
  });
  expect(step(pending, 'accept-effect', []).cards[g.refs.first!]!.zone).toBe('deck');
  resume(pending, choose(pending, 'accept-effect', [g.refs['hand-b']!]));
  const s = step(pending, 'accept-effect', [g.refs['hand-b']!]);
  expect(s.cards[g.refs['hand-b']!]!.zone).toBe('discard');
  expect(s.cards[g.refs.first!]!.zone).toBe('hand');
  expect(s.players.bob!.hand).toHaveLength(2);
});
test('Sabé still inspects the defending hand after dying in an Overwhelm attack that damages the base', () => {
  const p = sabeBoard();
  p.players[0].leader = {
    card: sabe,
    ref: 'leader',
    deployedAs: 'unit',
    damage: 3,
    abilityUses: { deploy: 1 },
  };
  // A temporary Overwhelm grant lets this lethal unit attack damage the base.
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const g = scenario(p);
  // Phase grant is authoritative scenario state; both units die to combat.
  modifyUnit(g.state, g.state.cards[g.refs.leader!]!, g.state.cards[g.refs.leader!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Overwhelm'] },
  });
  const s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.leader && i.defender === g.refs.enemy,
  );
  expect(s.cards[g.refs.leader!]!.zone).toBe('base');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  expect(s.execution.frames[0]!.kind).toBe('zone-inspection');
});
