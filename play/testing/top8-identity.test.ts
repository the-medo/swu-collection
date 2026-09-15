import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities, keywordNames } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const identity = 'improvised-identity',
  owl = 'honorable-nite-owl',
  migs = 'migs-mayfeld--how-about-a-toast-';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId.endsWith('-improvise'));
const randomInput = (s: GameState): EngineInput => ({
  type: 'random',
  gameId: s.gameId,
  expectedRevision: s.revision,
  requestId: s.execution.random!.id,
  values: s.execution.random!.bounds.map(() => 0),
});
const random = (s: GameState) => (s.execution.random ? advance(s, randomInput(s)).state : s);
function board(card = owl) {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[0].hand = [];
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  p.players[0].deck = [
    { card, ref: 'chosen' },
    { card: ids.fighter, ref: 'space-card' },
    { card: 'open-fire', ref: 'event-card' },
    ...Array.from({ length: 15 }, () => ({ card: ids.marine })),
  ];
  p.attachments = [{ card: identity, unit: 'host', ref: 'identity' }];
  return p;
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
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function search(g: ReturnType<typeof scenario>) {
  return random(step(use(g.state), 'search', [g.refs.chosen!]));
}
function hasAction(s: GameState) {
  return s.execution.decision!.options.some(
    o => o.intent.kind === 'use-ability' && o.intent.abilityId.endsWith('-improvise'),
  );
}
test('Identity attaches only to ground units, including opposing ones, and grants +0/+3', () => {
  const p = board();
  p.attachments = [];
  p.players[0].hand = [{ card: identity }];
  const g = scenario(p),
    options = g.state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'play' ? [o.intent.target] : [],
    );
  expect(options).toContain(g.refs.host!);
  expect(options).toContain(g.refs.enemy!);
  expect(options).not.toContain(g.refs.space!);
  const s = step(g.state, i => i.kind === 'play' && i.target === g.refs.host);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toMatchObject({ power: 3, hp: 6 });
});
test('the top-three search is private and discards the ground unit without drawing it', () => {
  const g = scenario(board()),
    s = use(g.state);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.chosen!]);
  expect(s.roundHistory.actionUses).toHaveLength(1);
  for (const playerId of ['alice', 'bob']) {
    const v = new Projector(s.gameId, { role: 'player', playerId }, 'v'.repeat(32)).project(s);
    expect(gameViewSchema.parse(v)).toEqual(v);
    expect(v.decision === null).toBe(playerId === 'bob');
    expect(JSON.stringify(v)).not.toContain('actionUses');
  }
  resume(s, choose(s, 'search', [g.refs.chosen!]));
  const pending = step(s, 'search', [g.refs.chosen!]);
  resume(pending, randomInput(pending));
  const after = random(pending);
  expect(after.cards[g.refs.chosen!]!.zone).toBe('discard');
  expect(after.players.alice!.hand).toHaveLength(0);
  expect(after.players.alice!.deck.slice(-2).sort()).toEqual(
    [g.refs['space-card']!, g.refs['event-card']!].sort(),
  );
  expect(after.phaseHistory.ownCardsDiscarded).toContain('alice');
  expect(after.facts.some(f => f.type === 'drawn')).toBe(false);
});
test('the attack gains Raid, but does not copy stats or trigger Support on entry', () => {
  const g = scenario(board()),
    pending = search(g);
  resume(
    pending,
    choose(pending, i => i.kind === 'attack' && i.defender === pending.players.bob!.base),
  );
  const s = step(pending, i => i.kind === 'attack' && i.defender === pending.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toMatchObject({ power: 3, hp: 6 });
  expect(effectiveAbilities(s, s.cards[g.refs.host!]!).raid).toBe(0);
  expect(s.phaseHistory.entered).toHaveLength(0);
  expect(s.cards[g.refs.host!]!.exhausted).toBe(true);
});
test('an empty or declined search still offers the optional ordinary attack', () => {
  const g = scenario(board());
  const s = random(step(use(g.state), 'search', []));
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'attack')).toBe(true);
  expect(
    step(s, i => i.kind === 'attack' && i.defender === s.players.bob!.base).cards[
      s.players.bob!.base
    ]!.damage,
  ).toBe(3);
  const p = board();
  p.players[0].deck = [];
  const h = scenario(p),
    empty = use(h.state);
  expect(empty.execution.decision!.options.some(o => o.intent.kind === 'attack')).toBe(true);
  expect(step(empty, 'decline-effect').roundHistory.actionUses).toHaveLength(1);
});
test('an exhausted host can search and discard, but cannot attack', () => {
  const p = board();
  p.players[0].ground![0]!.exhausted = true;
  const g = scenario(p),
    s = search(g);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.activePlayer).toBe('bob');
  expect(s.cards[g.refs.chosen!]!.zone).toBe('discard');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
});
test('declining the attack spends this copy’s round use, and a new round restores it', () => {
  const g = scenario(board());
  let s = step(search(g), 'decline-effect');
  s = step(s, 'pass');
  expect(hasAction(s)).toBe(false);
  s = step(s, 'pass');
  s = step(step(s, 'resource', []), 'resource', []);
  expect(s.round).toBe(2);
  expect(s.roundHistory.actionUses).toHaveLength(0);
  expect(hasAction(s)).toBe(true);
});
test('two attached copies have independent round limits and losing abilities hides both', () => {
  const p = board();
  p.attachments!.push({ card: identity, unit: 'host', ref: 'second-identity' });
  const g = scenario(p);
  let s = step(step(search(g), 'decline-effect'), 'pass');
  expect(
    s.execution.decision!.options.filter(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId.endsWith('-improvise'),
    ),
  ).toHaveLength(1);
  s = random(step(use(s), 'search', []));
  s = step(step(s, 'decline-effect'), 'pass');
  expect(hasAction(s)).toBe(false);
  modifyUnit(g.state, g.state.cards[g.refs.host!]!, g.state.cards[g.refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  // A fresh settled scenario is not required to test effective grants.
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.host!]!).actions).toHaveLength(0);
});
test('a copied On Attack ability refers to the host and preserves Support during the attack', () => {
  const p = board(migs);
  p.attachments!.push(
    { card: 'shield', unit: 'enemy', ref: 'shield-one' },
    { card: 'shield', unit: 'enemy', ref: 'shield-two' },
  );
  const g = scenario(p),
    s = step(search(g), i => i.kind === 'attack' && i.defender === g.refs.enemy);
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(effectiveAbilities(s, s.cards[g.refs.host!]!).keywords).toContain('Support');
  const grant = s.attacks[0]!.grantedAbilities[0]!;
  expect(grant.card.instanceId).toBe(g.refs.chosen!);
  expect(grant.withoutSupport).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs['shield-one']),
  );
  let after = step(s, i => i.kind === 'target' && i.card === g.refs['shield-one']);
  // The remaining mandatory Shield is automatic during combat.
  expect(after.attacks).toHaveLength(0);
  expect(attachedUpgrades(after, after.cards[g.refs.enemy!]!)).toHaveLength(0);
  expect(effectiveAbilities(after, after.cards[g.refs.host!]!).keywords).not.toContain('Support');
});
test('discarded When Defeated is borrowed only for a real defeat of the attacker', () => {
  const p = board('ant-droid');
  p.players[0].ground![0]!.damage = 4;
  const g = scenario(p),
    s = step(search(g), i => i.kind === 'attack' && i.defender === g.refs.enemy);
  expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.cards[g.refs.chosen!]!.zone).toBe('discard');
  expect(s.phaseHistory.defeated.filter(c => c.instanceId === g.refs.chosen)).toHaveLength(0);
});
test('copied Piloting is an ability while the attack is active', () => {
  const p = board('r2-d2--artooooooooo-');
  p.attachments!.push(
    { card: 'shield', unit: 'enemy', ref: 'one' },
    { card: 'shield', unit: 'enemy', ref: 'two' },
  );
  const g = scenario(p),
    s = step(search(g), i => i.kind === 'attack' && i.defender === g.refs.enemy);
  expect(keywordNames(s, s.cards[g.refs.host!]!)).toContain('Piloting');
});
test('round limits follow the exact granted origin, and a replayed upgrade is a new ability', () => {
  const p = board();
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const g = scenario(p);
  let s = step(search(g), 'decline-effect');
  const upgrade = s.cards[g.refs.identity!]!;
  move(s, upgrade, 'hand');
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.identity && i.target === g.refs.host);
  s = step(s, 'pass');
  expect(hasAction(s)).toBe(true);
  expect(s.roundHistory.actionUses).toHaveLength(1);
  resume(
    s,
    choose(s, i => i.kind === 'use-ability' && i.abilityId.endsWith('-improvise')),
  );
});
test('checkpoints reject invalid action origins and invalid copied ability roles', () => {
  const g = scenario(board());
  const s = use(g.state);
  const bad = structuredClone(s);
  bad.roundHistory.actionUses[0]!.origin.incarnation = 999;
  expect(() => decodeState(encodeState(bad))).toThrow();
  const p = board(migs);
  p.attachments!.push({ card: 'shield', unit: 'enemy' }, { card: 'shield', unit: 'enemy' });
  const h = scenario(p),
    attack = step(search(h), i => i.kind === 'attack' && i.defender === h.refs.enemy);
  attack.attacks[0]!.grantedAbilities[0]!.card.zone = 'hand';
  expect(() => decodeState(encodeState(attack))).toThrow();
});
test('borrowed Saboteur bypasses Sentinel during declaration and defeats Shields in combat', () => {
  const p = board('bith-brute');
  p.players[1].ground = [
    { card: 'imperial-armored-commando', ref: 'sentinel' },
    { card: ids.consular, ref: 'other' },
  ];
  p.attachments!.push({ card: 'shield', unit: 'other', ref: 'shield' });
  const g = scenario(p),
    s = search(g);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.other,
    ),
  ).toBe(true);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === s.players.bob!.base,
    ),
  ).toBe(true);
  const after = step(s, i => i.kind === 'attack' && i.defender === g.refs.other);
  expect(after.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(after.cards[g.refs.other!]!.damage).toBe(3);
});
test('the discarded unit’s attack prohibitions apply before declaring an attack', () => {
  for (const card of ['loth-wolf', 'oggdo-bogdo--bogano-brute']) {
    const g = scenario(board(card)),
      s = search(g);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.activePlayer).toBe('bob');
  }
  const p = board('oggdo-bogdo--bogano-brute');
  p.players[0].ground![0]!.damage = 1;
  const g = scenario(p),
    s = search(g);
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'attack')).toBe(true);
});
test('action projections and logs identify the exact attached copy providing the action', () => {
  const p = board();
  p.attachments!.push({ card: identity, unit: 'host', ref: 'second' });
  const g = scenario(p),
    view = new Projector(
      g.state.gameId,
      { role: 'player', playerId: 'alice' },
      'v'.repeat(32),
    ).project(g.state);
  const actions = view.decision!.options.filter(o => o.action?.id === 'improvise');
  expect(actions).toHaveLength(2);
  expect(actions.every(o => o.action?.limit === 'once-per-round')).toBe(true);
  expect(new Set(actions.map(o => o.action!.grantedBy!.currentCardId)).size).toBe(2);
  expect(gameViewSchema.parse(view)).toEqual(view);
  const s = use(g.state),
    fact = s.facts.find(f => f.type === 'ability-used')!;
  expect(fact.cards.map(c => c.instanceId)).toEqual([g.refs.host!, g.refs.identity!]);
});
