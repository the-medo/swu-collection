import { keywordNames } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move, reference } from '../engine/state.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const maul = 'maul--collective-ambition';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
function effects(s: GameState, e: CardEffect[], source: CardInstance = leader(s)) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: source.controller,
      source: structuredClone(source),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
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
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

function setup(card = 'clone-pilot', damage = 0, deployed = false, enemy = false) {
  const p = board(maul, deployed);
  p.players[enemy ? 1 : 0].ground = [{ card, damage, ref: 'chosen' }];
  return p;
}
const experience = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
const activate = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const grant = (
  s: GameState,
  id: string,
  abilities: import('../cards/definition.ts').SimpleAbilities,
) => {
  modifyUnit(s, leader(s), s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities,
    duration: 'phase',
  });
  s.execution.decision = null;
  settle(s);
};

for (const enemy of [false, true])
  test(`Maul can improve a unit with 1 remaining HP without defeating it (${enemy})`, () => {
    const g = scenario(setup('clone-pilot', 1, false, enemy));
    const pending = activate(g.state);
    resume(
      pending,
      choose(pending, i => i.kind === 'target' && i.card === g.refs.chosen),
    );
    const s = target(pending, g.refs.chosen!);
    expect(s.cards[g.refs.chosen!]!.zone).toBe('ground');
    expect(s.cards[g.refs.chosen!]!.damage).toBe(2);
    expect(unitStats(s, s.cards[g.refs.chosen!]!).hp).toBe(3);
    expect(experience(s, g.refs.chosen!)).toBe(1);
    expect(leader(s).exhausted).toBe(true);
  });

for (const n of [0, 1, 2])
  test(`Maul compares distinct keywords with Experience tokens (${n})`, () => {
    const p = setup();
    p.attachments = Array.from({ length: n }, () => ({ card: 'experience', unit: 'chosen' }));
    const g = scenario(p),
      s = target(activate(g.state), g.refs.chosen!);
    expect(experience(s, g.refs.chosen!)).toBe(n || 1);
    expect(s.cards[g.refs.chosen!]!.damage).toBe(n ? 0 : 1);
  });

test('Maul may choose a keywordless unit without giving a token or damage', () => {
  const g = scenario(setup(ids.marine)),
    s = target(activate(g.state), g.refs.chosen!);
  expect(experience(s, g.refs.chosen!)).toBe(0);
  expect(s.cards[g.refs.chosen!]!.damage).toBe(0);
});

test('Maul counts Raid zero and repeated Raid by one keyword name', () => {
  const g = scenario(setup(ids.marine));
  grant(g.state, g.refs.chosen!, { raid: 0 });
  grant(g.state, g.refs.chosen!, { raid: 2 });
  expect(keywordNames(g.state, g.state.cards[g.refs.chosen!]!)).toEqual(['Raid']);
  const s = target(activate(g.state), g.refs.chosen!);
  expect(experience(s, g.refs.chosen!)).toBe(1);
});

test('Maul counts gained keywords separately but counts duplicate names once', () => {
  const g = scenario(setup(ids.marine));
  grant(g.state, g.refs.chosen!, { keywords: ['Sentinel', 'Sentinel'], restore: 0 });
  expect(keywordNames(g.state, g.state.cards[g.refs.chosen!]!).sort()).toEqual([
    'Restore',
    'Sentinel',
  ]);
});

for (const id of ['ahsoka-tano--snips', 'padm--amidala--serving-the-republic'])
  test(`Coordinate remains a keyword with fewer than three units (${id})`, () => {
    const p = setup();
    p.players[0].ground = [];
    p.players[1].leader = { card: id, deployedAs: 'unit', ref: 'chosen' };
    const g = scenario(p);
    expect(keywordNames(g.state, g.state.cards[g.refs.chosen!]!)).toContain('Coordinate');
    const s = target(activate(g.state), g.refs.chosen!);
    expect(experience(s, g.refs.chosen!)).toBe(1);
  });

test('Ability loss removes printed Piloting from the keyword comparison', () => {
  const g = scenario(setup());
  modifyUnit(g.state, leader(g.state), g.state.cards[g.refs.chosen!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  const s = target(activate(g.state), g.refs.chosen!);
  expect(experience(s, g.refs.chosen!)).toBe(0);
});

test('An attached Pilot does not give its Piloting keyword to the host', () => {
  const p = setup(ids.fighter);
  p.players[0].space = p.players[0].ground;
  p.players[0].ground = [];
  p.attachments = [{ card: 'clone-pilot', unit: 'chosen' }];
  const g = scenario(p),
    s = target(activate(g.state), g.refs.chosen!);
  expect(experience(s, g.refs.chosen!)).toBe(0);
});

for (const timing of ['deployed', 'attack'])
  test(`Maul's unit face resolves the ${timing} ability`, () => {
    const g = scenario(setup('clone-pilot', 0, timing === 'attack'));
    const s =
      timing === 'deployed'
        ? step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy')
        : step(
            g.state,
            i =>
              i.kind === 'attack' &&
              i.attacker === leader(g.state).instanceId &&
              i.defender === g.state.players.bob!.base,
          );
    const done = target(s, g.refs.chosen!);
    expect(experience(done, g.refs.chosen!)).toBe(1);
    expect(done.cards[g.refs.chosen!]!.damage).toBe(1);
    expect(
      done.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
      ),
    ).toBe(false);
  });

function shielded() {
  const p = setup();
  p.attachments = [
    { card: 'shield', unit: 'chosen', ref: 'shield-a' },
    { card: 'shield', unit: 'chosen', ref: 'shield-b' },
  ];
  const g = scenario(p);
  return { refs: g.refs, state: target(activate(g.state), g.refs.chosen!) };
}

test('Shield replacement waits before either part of Maul’s effect is committed', () => {
  const g = shielded();
  expect(experience(g.state, g.refs.chosen!)).toBe(0);
  expect(g.state.cards[g.refs.chosen!]!.damage).toBe(0);
  const input = choose(g.state, i => i.kind === 'target' && i.card === g.refs['shield-b']);
  resume(g.state, input);
  const s = advance(g.state, input).state;
  expect(experience(s, g.refs.chosen!)).toBe(1);
  expect(s.cards[g.refs.chosen!]!.damage).toBe(0);
  expect(s.cards[g.refs['shield-b']!]!.zone).toBe('set-aside');
  expect(s.cards[g.refs['shield-a']!]!.attachedTo).not.toBeNull();
});

function doubled(self = false) {
  const moff = 'moff-jerjerrod--we-shall-redouble-our-efforts';
  const p = setup(self ? moff : 'clone-pilot');
  if (!self) p.players[0].ground!.push({ card: moff, ref: 'moff' });
  const g = scenario(p);
  if (self) grant(g.state, g.refs.chosen!, { keywords: ['Sentinel'] });
  return { refs: g.refs, state: target(activate(g.state), g.refs.chosen!) };
}

for (const accept of [false, true])
  test(`Jerjerrod can double the Experience creation without doubling damage (${accept})`, () => {
    const g = doubled();
    const input = choose(
      g.state,
      accept ? i => i.kind === 'target' && i.card === g.refs.moff : 'decline-effect',
    );
    resume(g.state, input);
    const s = advance(g.state, input).state;
    expect(experience(s, g.refs.chosen!)).toBe(accept ? 2 : 1);
    expect(s.cards[g.refs.chosen!]!.damage).toBe(1);
  });

test('If the chosen Jerjerrod replaces token creation by defeating himself, neither part targets a departed unit', () => {
  const g = doubled(true),
    s = target(g.state, g.refs.chosen!);
  expect(s.cards[g.refs.chosen!]!.zone).toBe('discard');
  expect(experience(s, g.refs.chosen!)).toBe(0);
});

test('Attachment triggers capture the completed Experience and damage event', () => {
  const g = scenario(setup('sabine-wren--i-learned-the-hard-way'));
  const s = target(activate(g.state), g.refs.chosen!);
  const frame = s.execution.frames[0]!;
  if (frame.kind !== 'effect') throw new Error('Expected attachment trigger choice');
  expect(frame.source.damage).toBe(1);
  expect(experience(s, g.refs.chosen!)).toBe(1);
  resume(s, choose(s, 'decline-effect'));
});

for (const corruption of ['target', 'amount', 'creator', 'source', 'context', 'skip-replacement'])
  test(`Compound damage checkpoints reject forged ${corruption}`, () => {
    const g = shielded(),
      s = g.state,
      frame = s.execution.frames[0]!;
    if (frame.kind !== 'damage' || !frame.tokens) throw new Error('Expected compound damage');
    if (corruption === 'target') frame.tokens.simultaneousDamage!.target = reference(leader(s));
    if (corruption === 'amount') frame.tokens.simultaneousDamage!.amount = 2;
    if (corruption === 'creator') frame.tokens.creator = 'bob';
    if (corruption === 'source')
      frame.tokens.source = structuredClone(s.cards[s.players.bob!.leader]!);
    if (corruption === 'context')
      frame.tokens.bindings = { chosen: { ...reference(leader(s)), incarnation: 9999 } };
    if (corruption === 'skip-replacement')
      frame.tokens.creation = { kind: 'credits', recipient: 'alice', count: 2 };
    expect(() => decodeState(encodeState(s))).toThrow();
  });
