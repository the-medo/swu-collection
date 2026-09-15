import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { credits } from '../engine/credits.ts';
import { forceToken } from '../engine/force.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const moff = 'moff-jerjerrod--we-shall-redouble-our-efforts';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!);
function board(card = 'i-am-the-senate') {
  const p = position();
  p.players[0].ground = [
    { card: moff, ref: 'moff' },
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[0].hand = [{ card, ref: 'played' }];
  for (const player of p.players) {
    player.resources = Array.from({ length: 16 }, () => ({ card: ids.marine }));
    player.deck = Array.from({ length: 24 }, () => ({ card: ids.marine }));
  }
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
test('Moff replaces creation before any tokens exist and produces the doubled exhausted group', () => {
  const g = scenario(board()),
    s = step(g.state, 'play');
  expect(s.execution.frames[0]!.kind).toBe('create-tokens');
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(tokens(s, 'spy')).toHaveLength(0);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.moff),
  );
  const after = target(s, g.refs.moff!);
  expect(tokens(after, 'spy')).toHaveLength(10);
  expect(tokens(after, 'spy').every(c => c.exhausted)).toBe(true);
  expect(after.cards[g.refs.moff!]!.zone).toBe('discard');
  expect(after.phaseHistory.defeated).toHaveLength(1);
  expect(after.facts.filter(f => f.type === 'created')).toHaveLength(10);
});
test('declining preserves Moff and creates the original number', () => {
  const g = scenario(board()),
    s = step(step(g.state, 'play'), 'decline-effect');
  expect(tokens(s, 'spy')).toHaveLength(5);
  expect(s.cards[g.refs.moff!]!.zone).toBe('ground');
  expect(s.execution.decision!.kind).toBe('action');
});
test('ability loss and an opposing Moff do not offer the replacement', () => {
  const g = scenario(board());
  modifyUnit(g.state, g.state.cards[g.refs.moff!]!, g.state.cards[g.refs.moff!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(step(g.state, 'play').execution.decision!.kind).toBe('action');
  const p = board();
  p.players[0].ground = p.players[0].ground!.filter(c => c.ref !== 'moff');
  p.players[1].ground!.push({ card: moff, ref: 'opposing' });
  const h = scenario(p),
    s = step(h.state, 'play');
  expect(tokens(s, 'spy')).toHaveLength(5);
  expect(s.cards[h.refs.opposing!]!.zone).toBe('ground');
});
test('controller owns the replacement even when the sacrificed unit has a different owner', () => {
  const p = board();
  p.players[0].ground = p.players[0].ground!.filter(c => c.ref !== 'moff');
  p.players[1].ground!.push({ card: moff, ref: 'stolen', controller: 'alice' });
  const g = scenario(p),
    s = target(step(g.state, 'play'), g.refs.stolen!);
  expect(tokens(s, 'spy').every(c => c.controller === 'alice')).toBe(true);
  expect(s.players.bob!.discard).toContain(g.refs.stolen!);
  expect(s.cards[g.refs.stolen!]!.owner).toBe('bob');
});
test('doubling Mandalorians creates four units before their individual Shielded triggers', () => {
  const g = scenario(board('stronger-together'));
  let s = target(step(g.state, 'play'), g.refs.moff!);
  expect(tokens(s, 'mandalorian')).toHaveLength(4);
  while (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
  expect(
    tokens(s, 'mandalorian').every(
      c => upgrades(s, c.instanceId).filter(u => u.cardId === 'shield').length === 1,
    ),
  ).toBe(true);
});
test('a later Shield replacement keeps both tokens on the already chosen enemy unit', () => {
  const p = board('covering-the-wing');
  p.players[1].ground!.push({ card: moff, ref: 'enemy-moff' });
  const g = scenario(p);
  let s = step(step(g.state, 'play'), 'decline-effect');
  s = target(s, g.refs.enemy!);
  expect(s.execution.decision!.playerId).toBe('alice');
  expect(
    s.execution.decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : [])),
  ).toEqual([g.refs.moff!]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.moff),
  );
  s = target(s, g.refs.moff!);
  expect(upgrades(s, g.refs.enemy!).map(c => c.cardId)).toEqual(['shield', 'shield']);
  expect(upgrades(s, g.refs.enemy!).every(c => c.owner === 'bob')).toBe(true);
  expect(upgrades(s, g.refs.one!)).toHaveLength(0);
  expect(s.phaseHistory.tokensCreated).toEqual(['alice']);
});
test('when Moff was the selected Shield recipient, sacrificing it leaves no legal attachment', () => {
  const g = scenario(board('covering-the-wing'));
  let s = target(step(step(g.state, 'play'), 'decline-effect'), g.refs.moff!);
  s = target(s, g.refs.moff!);
  expect(s.cards[g.refs.moff!]!.zone).toBe('discard');
  expect(Object.values(s.cards).filter(c => c.cardId === 'shield')).toHaveLength(0);
  expect(tokens(s, 'x-wing')).toHaveLength(1);
});
test('Covering the Wing treats both replacement-created X-Wings as the created group', () => {
  const g = scenario(board('covering-the-wing')),
    s = target(step(g.state, 'play'), g.refs.moff!);
  expect(tokens(s, 'x-wing')).toHaveLength(2);
  const choices = s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
  for (const token of tokens(s, 'x-wing')) expect(choices).not.toContain(token.instanceId);
  expect(choices).toContain(g.refs.one!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.one),
  );
});
test('doubled Credits exist before the following effect counts them', () => {
  const g = scenario(board('backed-by-the-hutts'));
  let s = step(g.state, 'play');
  expect(credits(s, 'alice')).toHaveLength(0);
  s = target(s, g.refs.moff!);
  expect(credits(s, 'alice')).toHaveLength(2);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
});
test('The Force cap is preserved when its creation is doubled, and an existing Force is ignored', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].ground!.push({ card: 'acolyte-of-the-beyond', ref: 'acolyte' });
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === g.refs.acolyte &&
      i.defender === g.state.players.bob!.base,
  );
  s = target(s, g.refs.moff!);
  expect(forceToken(s, 'alice')).toBeDefined();
  expect(s.players.alice!.tokens).toHaveLength(1);
  p.players[0].force = true;
  const h = scenario(p),
    existing = step(
      h.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === h.refs.acolyte &&
        i.defender === h.state.players.bob!.base,
    );
  expect(existing.execution.decision!.kind).toBe('action');
  expect(existing.cards[h.refs.moff!]!.zone).toBe('ground');
});
test('Crucible doubles the whole chosen recipient group, with no tokens on the sacrificed Moff', () => {
  const g = scenario(board('crucible--centuries-of-wisdom'));
  let s = step(g.state, 'play');
  const frame = s.execution.frames[0]!;
  if (frame.kind !== 'create-tokens' || frame.creation.kind !== 'upgrade')
    throw new Error('Missing group');
  expect(frame.creation.targets).toHaveLength(3);
  s = target(s, g.refs.moff!);
  for (const id of [g.refs.one!, g.refs.two!]) {
    expect(upgrades(s, id)).toHaveLength(2);
    expect(unitStats(s, s.cards[id]!).power).toBe(5);
  }
  expect(upgrades(s, g.refs.played!)).toHaveLength(0);
  expect(upgrades(s, g.refs.moff!)).toHaveLength(0);
});
test('a divided Advantage allocation is fixed before Moff doubles every assigned amount', () => {
  const p = board('chimaera--reinforcing-the-center');
  p.players[0].ground!.push({ card: 'helgait--dooku-was-a-visionary', ref: 'helgait' });
  const g = scenario(p);
  let s = target(step(g.state, 'play'), g.refs.helgait!);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'distribute');
  s = step(s, 'accept-effect', [
    g.refs.one!,
    g.refs.one!,
    g.refs.two!,
    g.refs.two!,
    g.refs.two!,
    g.refs.two!,
  ]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.moff),
  );
  s = target(s, g.refs.moff!);
  expect(upgrades(s, g.refs.one!)).toHaveLength(4);
  expect(upgrades(s, g.refs.two!)).toHaveLength(8);
});
test('the sacrifice’s granted When Defeated resolves after the replacement token creation', () => {
  const p = board();
  p.attachments = [{ card: 'creditor-s-claim', unit: 'moff' }];
  const g = scenario(p),
    s = target(step(g.state, 'play'), g.refs.moff!);
  expect(tokens(s, 'spy')).toHaveLength(10);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
    ),
  ).toBe(true);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  expect(target(s, g.refs.enemy!).cards[g.refs.enemy!]!.zone).toBe('discard');
});
test('the player and spectator views expose no future tokens or replacement controls to the opponent', () => {
  const g = scenario(board()),
    s = step(g.state, 'play');
  for (const viewer of [
    { role: 'player', playerId: 'alice' },
    { role: 'player', playerId: 'bob' },
    { role: 'spectator' },
  ] as const) {
    const v = new Projector(s.gameId, viewer, 'v'.repeat(32)).project(s);
    expect(gameViewSchema.parse(v)).toEqual(v);
    expect(v.cards.filter(c => c.face?.cardId === 'spy')).toHaveLength(0);
    expect(v.decision === null).toBe(viewer.role === 'spectator' || viewer.playerId === 'bob');
    expect(JSON.stringify(v)).not.toContain('replacements');
  }
});
test('malformed token plans reject non-token identities and unknown creators', () => {
  const g = scenario(board()),
    s = step(g.state, 'play');
  const bad = structuredClone(s),
    f = bad.execution.frames[0]!;
  if (f.kind !== 'create-tokens' || f.creation.kind !== 'unit') throw new Error('Missing creation');
  f.creation.cardId = ids.marine;
  expect(() => decodeState(encodeState(bad))).toThrow();
  const unknown = structuredClone(s),
    u = unknown.execution.frames[0]!;
  if (u.kind !== 'create-tokens') throw new Error('Missing creation');
  u.creator = 'unknown';
  expect(() => decodeState(encodeState(unknown))).toThrow();
});

test('an attacking unit borrowing Moff’s ability pays by defeating itself, with each replacement source used once', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].ground!.push({ card: 'acolyte-of-the-beyond', ref: 'host' });
  p.attachments = [{ card: 'improvised-identity', unit: 'host' }];
  p.players[0].deck = [
    { card: moff, ref: 'copied' },
    ...Array.from({ length: 10 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId.endsWith('-improvise'));
  s = step(s, 'search', [g.refs.copied!]);
  s = advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  }).state;
  s = step(s, i => i.kind === 'attack' && i.defender === s.players.bob!.base);
  expect(s.execution.decision!.options.filter(o => o.intent.kind === 'target')).toHaveLength(2);
  s = target(s, g.refs.moff!);
  expect(
    s.execution.decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : [])),
  ).toEqual([g.refs.host!]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.host),
  );
  s = target(s, g.refs.host!);
  expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  expect(s.cards[g.refs.moff!]!.zone).toBe('discard');
  expect(s.players.alice!.tokens).toHaveLength(1);
  expect(s.facts.filter(f => f.type === 'token-creation-replaced')).toHaveLength(2);
  expect(s.attacks).toHaveLength(0);
});
test('checkpoints reject duplicated token recipients and a replacement source that was never sacrificed', () => {
  const g = scenario(board('crucible--centuries-of-wisdom')),
    s = step(g.state, 'play');
  const duplicate = structuredClone(s),
    f = duplicate.execution.frames[0]!;
  if (f.kind !== 'create-tokens' || f.creation.kind !== 'upgrade') throw new Error('Missing group');
  f.creation.targets.push(structuredClone(f.creation.targets[0]!));
  expect(() => decodeState(encodeState(duplicate))).toThrow();
  const fake = structuredClone(s),
    frame = fake.execution.frames[0]!;
  if (frame.kind !== 'create-tokens') throw new Error('Missing creation');
  frame.replacements.push({
    ...(frame.creation.kind === 'upgrade' ? frame.creation.targets[0]!.target : frame.source),
  });
  expect(() => decodeState(encodeState(fake))).toThrow();
});
