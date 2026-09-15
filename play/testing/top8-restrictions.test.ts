import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { keywordNames } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { nestedPlayIntents } from '../engine/play-options.ts';
import { cannotPlayCard } from '../engine/play-restrictions.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const tax = 'trade-route-taxation',
  gallius = 'gallius-rax--counselor-to-the-empire',
  leia = 'leia-organa--of-a-secret-bloodline',
  lib = 'liberated-by-darkness';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const mode = (s: GameState, m: string) => step(s, i => i.kind === 'choose-mode' && i.mode === m);
function board() {
  const p = position();
  for (const player of p.players)
    player.resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card: tax, ref: 'tax' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'fighter' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].hand = [
    { card: 'open-fire', ref: 'fire' },
    { card: ids.marine, ref: 'unit' },
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
function regroup(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 60 && s.round === round; n++) {
    const d = s.execution.decision!;
    s = step(
      s,
      d.kind === 'resource'
        ? 'resource'
        : d.options.find(o => o.intent.kind === 'pass')
          ? 'pass'
          : d.options.find(o => o.intent.kind === 'decline-effect')
            ? 'decline-effect'
            : d.options[0]!.intent.kind,
      [],
    );
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

test('Taxation counts units across both arenas, blocks only enemy events, and persists when counts later become equal', () => {
  const g = scenario(board());
  let s = step(g.state, 'play');
  expect(s.playRestrictions).toHaveLength(1);
  expect(cannotPlayCard(s, s.cards[g.refs.fire!]!, 'bob')).toBe(true);
  expect(cannotPlayCard(s, s.cards[g.refs.tax!]!, 'alice')).toBe(false);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.fire,
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.unit),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.unit);
  expect(cannotPlayCard(s, s.cards[g.refs.fire!]!, 'bob')).toBe(true);
  s = regroup(s);
  expect(s.playRestrictions).toHaveLength(0);
  expect(cannotPlayCard(s, s.cards[g.refs.fire!]!, 'bob')).toBe(false);
});
test('Taxation does not restrict on tied or lower unit counts', () => {
  for (const fewer of [false, true]) {
    const p = board();
    p.players[0].space = [];
    if (fewer) p.players[0].ground = [];
    const g = scenario(p),
      s = step(g.state, 'play');
    expect(s.playRestrictions).toHaveLength(0);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === g.refs.fire,
      ),
    ).toBe(true);
  }
});
test('Taxation blocks free nested event play from discard and leaves units playable', () => {
  const p = board();
  p.players[1].discard = [
    { card: 'open-fire', ref: 'discarded' },
    { card: ids.marine, ref: 'discarded-unit' },
  ];
  const g = scenario(p),
    s = step(g.state, 'play');
  const choices = nestedPlayIntents(
    s,
    'bob',
    { kind: 'play-card', from: 'discard', filter: {}, free: true, optional: true },
    { source: s.cards[s.players.bob!.leader]! },
  );
  expect(choices.some(i => i.kind === 'play' && i.card === g.refs.discarded)).toBe(false);
  expect(choices.some(i => i.kind === 'play' && i.card === g.refs['discarded-unit'])).toBe(true);
});
test('Taxation can be played through Plot after deployment and replaces its resource', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].resources!.push({ card: tax, ref: 'plot' });
  p.players[0].deck![0] = { card: ids.consular, ref: 'replacement' };
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  s = step(s, 'accept-effect', [g.refs.plot!]);
  const choice = s.execution.decision!;
  expect(choice.options.some(o => o.intent.kind === 'play' && o.intent.card === g.refs.plot)).toBe(
    true,
  );
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.plot),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.plot);
  expect(s.cards[g.refs.plot!]!.zone).toBe('discard');
  expect(s.cards[g.refs.replacement!]!.zone).toBe('resources');
  expect(s.playRestrictions).toHaveLength(1);
});
test('checkpoint validation rejects a forged restriction source, recipient or expired phase', () => {
  const g = scenario(board()),
    s = step(g.state, 'play');
  for (const kind of ['source', 'recipient', 'phase']) {
    const bad = structuredClone(s),
      r = bad.playRestrictions[0]!;
    if (kind === 'source') r.source.cardId = ids.marine;
    else if (kind === 'recipient') r.playerId = 'outsider';
    else r.phase = 'regroup';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});

function galliusBoard() {
  const p = board();
  p.players[0].ground = [
    { card: gallius, ref: 'gallius' },
    { card: 'independent-smuggler', ref: 'smuggler' },
    { card: 'the-stranger--no-survivors', ref: 'stranger' },
    { card: ids.marine, ref: 'plain' },
  ];
  return p;
}
test('Gallius counts different keywords, including printed Piloting and numeric Raid', () => {
  const g = scenario(galliusBoard());
  expect(keywordNames(g.state, g.state.cards[g.refs.smuggler!]!).sort()).toEqual([
    'Piloting',
    'Raid',
  ]);
  expect(unitStats(g.state, g.state.cards[g.refs.smuggler!]!)).toEqual({ power: 3, hp: 3 });
  expect(unitStats(g.state, g.state.cards[g.refs.stranger!]!)).toEqual({ power: 3, hp: 9 });
  expect(unitStats(g.state, g.state.cards[g.refs.plain!]!)).toEqual({ power: 3, hp: 3 });
  expect(unitStats(g.state, g.state.cards[g.refs.gallius!]!)).toEqual({ power: 4, hp: 7 });
});
test('Raid with different numbers remains one keyword, while a granted Raid zero is still a keyword', () => {
  const p = galliusBoard();
  p.players[0].ground!.push({ card: 'spy', ref: 'spy' });
  const g = scenario(p),
    source = g.state.cards[g.refs.gallius!]!,
    spy = g.state.cards[g.refs.spy!]!;
  modifyUnit(g.state, source, spy, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { raid: 1 },
  });
  expect(keywordNames(g.state, spy)).toEqual(['Raid']);
  expect(unitStats(g.state, spy).hp).toBe(2);
  const marine = g.state.cards[g.refs.plain!]!;
  modifyUnit(g.state, source, marine, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { raid: 0, keywords: ['Sentinel'] },
  });
  expect(keywordNames(g.state, marine).sort()).toEqual(['Raid', 'Sentinel']);
  expect(unitStats(g.state, marine)).toEqual({ power: 5, hp: 5 });
});
test('stat-only constants do not invent numeric keywords and ability loss removes Gallius eligibility', () => {
  const p = galliusBoard();
  p.players[0].space = [{ card: 'heroic-purrgil', ref: 'purrgil' }];
  const g = scenario(p);
  expect(keywordNames(g.state, g.state.cards[g.refs.purrgil!]!)).toEqual(['Ambush']);
  expect(unitStats(g.state, g.state.cards[g.refs.purrgil!]!)).toEqual({ power: 3, hp: 6 });
  blank(g.state, g.refs.smuggler!);
  expect(keywordNames(g.state, g.state.cards[g.refs.smuggler!]!)).toEqual([]);
  expect(unitStats(g.state, g.state.cards[g.refs.smuggler!]!)).toEqual({ power: 1, hp: 1 });
  blank(g.state, g.refs.gallius!);
  expect(unitStats(g.state, g.state.cards[g.refs.stranger!]!)).toEqual({ power: 1, hp: 7 });
});
test('a Pilot upgrade grants Raid but does not grant its own Piloting keyword to its host', () => {
  const p = galliusBoard();
  p.attachments = [{ card: 'independent-smuggler', unit: 'fighter', ref: 'pilot' }];
  const g = scenario(p);
  expect(keywordNames(g.state, g.state.cards[g.refs.fighter!]!)).toEqual(['Raid']);
  expect(unitStats(g.state, g.state.cards[g.refs.fighter!]!)).toEqual({ power: 3, hp: 2 });
});
test('Gallius’s aura expires through maintenance when its source leaves and a damaged beneficiary then dies', () => {
  const p = galliusBoard();
  p.players[0].hand = [{ card: 'the-will-of-the-force', ref: 'bounce' }];
  p.players[0].ground![1]!.damage = 2;
  const g = scenario(p),
    s = target(step(g.state, 'play'), g.refs.gallius!);
  expect(s.cards[g.refs.gallius!]!.zone).toBe('hand');
  expect(s.cards[g.refs.smuggler!]!.zone).toBe('discard');
});

function leiaBoard() {
  const p = board();
  p.players[0].leader = { card: leia, ref: 'leia' };
  p.players[0].hand = [
    { card: lib, ref: 'disclosed' },
    { card: ids.marine, ref: 'extra' },
  ];
  p.players[0].ground = [
    { card: ids.marine, ref: 'own' },
    { card: 'independent-smuggler', ref: 'cunning' },
  ];
  p.players[1].ground = [
    { card: ids.trooper, ref: 'villain' },
    { card: ids.consular, ref: 'enemy' },
  ];
  return p;
}
function training(s: GameState) {
  return mode(
    step(s, i => i.kind === 'use-ability' && i.abilityId === 'disclose-training'),
    'cunning',
  );
}
test('Leia pays one resource and exhausts on her leader face, then checks all aspects on the revealed card', () => {
  const g = scenario(leiaBoard()),
    pending = training(g.state);
  expect(pending.cards[g.refs.leia!]!.exhausted).toBe(true);
  expect(pending.players.alice!.resources.filter(id => pending.cards[id]!.exhausted)).toHaveLength(
    1,
  );
  resume(pending, choose(pending, 'accept-effect', [g.refs.disclosed!]));
  const revealed = step(pending, 'accept-effect', [g.refs.disclosed!]);
  expect(revealed.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.own! },
    { kind: 'target', card: g.refs.enemy! },
  ]);
  resume(
    revealed,
    choose(revealed, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const s = target(revealed, g.refs.enemy!);
  expect(attachedUpgrades(s, s.cards[g.refs.enemy!]!).map(c => c.cardId)).toEqual(['experience']);
});
test('Leia retains every disclosed card, so optional extra reveals also constrain aspect sharing', () => {
  const g = scenario(leiaBoard()),
    s = step(training(g.state), 'accept-effect', [g.refs.disclosed!, g.refs.extra!]);
  expect(s.execution.decision!.kind).toBe('action');
  expect(
    s.facts
      .filter(f => f.type === 'revealed')
      .at(-1)!
      .cards.map(c => c.instanceId),
  ).toEqual([g.refs.disclosed!, g.refs.extra!]);
  expect(Object.values(s.cards).some(c => c.cardId === 'experience')).toBe(false);
});
test('Leia can decline disclosure after paying, and the opponent cannot inspect unrevealed alternatives', () => {
  const g = scenario(leiaBoard()),
    pending = training(g.state);
  const view = new Projector(
    pending.gameId,
    { role: 'player', playerId: 'bob' },
    'v'.repeat(32),
  ).project(pending);
  expect(JSON.stringify(view)).not.toContain(lib);
  const s = step(pending, 'decline-effect');
  expect(s.facts.some(f => f.type === 'revealed')).toBe(false);
  expect(s.cards[g.refs.leia!]!.exhausted).toBe(true);
});
test('Leia’s deployed face has optional On Attack disclosure and can give Experience to herself before combat', () => {
  const p = leiaBoard();
  p.players[0].leader = { card: leia, ref: 'leia', deployedAs: 'unit', abilityUses: { deploy: 1 } };
  const g = scenario(p);
  const pending = step(
    g.state,
    i =>
      i.kind === 'attack' && i.attacker === g.refs.leia && i.defender === g.state.players.bob!.base,
  );
  expect(pending.execution.frames[0]!.kind).toBe('optional-trigger');
  const disclosed = step(mode(step(pending, 'accept-effect'), 'cunning'), 'accept-effect', [
    g.refs.disclosed!,
  ]);
  const s = target(disclosed, g.refs.leia!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(unitStats(s, s.cards[g.refs.leia!]!)).toEqual({ power: 5, hp: 8 });
  expect(step(pending, 'decline-effect').cards[pending.players.bob!.base]!.damage).toBe(4);
});
test('Leia’s regular Epic deployment needs six resources and is distinct from the paid exhausted action', () => {
  const p = leiaBoard();
  p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine, exhausted: true }));
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'disclose-training',
    ),
  ).toBe(false);
  const s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(s.cards[g.refs.leia!]!).toMatchObject({
    zone: 'ground',
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
});

test('conditional Raid counts only while its condition is true, alongside a granted keyword', () => {
  for (const token of [false, true]) {
    const p = galliusBoard();
    p.players[0].space = [{ card: 'first-order-tie-fighter', ref: 'first-order' }];
    if (token) p.players[0].ground!.push({ card: 'spy' });
    const g = scenario(p),
      unit = g.state.cards[g.refs['first-order']!]!;
    modifyUnit(g.state, g.state.cards[g.refs.gallius!]!, unit, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      abilities: { keywords: ['Sentinel'] },
    });
    expect(keywordNames(g.state, unit).sort()).toEqual(token ? ['Raid', 'Sentinel'] : ['Sentinel']);
    expect(unitStats(g.state, unit)).toEqual(token ? { power: 4, hp: 3 } : { power: 2, hp: 1 });
  }
});
test('losing keywords removes Gallius’s bonus even when other abilities remain', () => {
  const g = scenario(galliusBoard()),
    unit = g.state.cards[g.refs.stranger!]!;
  modifyUnit(g.state, g.state.cards[g.refs.gallius!]!, unit, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseKeywords: true,
  });
  expect(keywordNames(g.state, unit)).toEqual([]);
  expect(unitStats(g.state, unit)).toEqual({ power: 1, hp: 7 });
});
