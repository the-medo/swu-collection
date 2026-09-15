import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { unitIsLeader } from '../engine/attributes.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities, keywordNames } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const kaz = 'kazuda-xiono--best-pilot-in-the-galaxy',
  max = 'max-rebo--encore-';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
function board() {
  const p = position();
  p.players[0].leader = { card: kaz, ref: 'kaz' };
  for (const player of p.players) {
    player.resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
    player.deck = Array.from({ length: 30 }, () => ({ card: ids.marine }));
  }
  p.players[0].ground = [{ card: 'independent-smuggler', ref: 'smuggler' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].hand = [{ card: ids.marine, ref: 'play' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}
function extra(s: GameState, id: string) {
  return step(use(s, 'extra-action'), i => i.kind === 'target' && i.card === id);
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
function endPhase(s: GameState) {
  return step(step(s, 'pass'), 'pass');
}
function resourcePair(s: GameState, chooseCard = false) {
  for (let n = 0; n < 2; n++)
    s = step(s, 'resource', chooseCard ? s.execution.decision!.selection!.cards.slice(0, 1) : []);
  return s;
}
test('Kaz exhausts and blanks one exact friendly unit, then his controller takes the next action', () => {
  const g = scenario(board()),
    pending = use(g.state, 'extra-action');
  expect(pending.cards[g.refs.kaz!]!.exhausted).toBe(true);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
    ),
  ).toBe(false);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.smuggler),
  );
  const s = step(pending, i => i.kind === 'target' && i.card === g.refs.smuggler);
  expect(s.activePlayer).toBe('alice');
  expect(keywordNames(s, s.cards[g.refs.smuggler!]!)).toEqual([]);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.play),
  );
  expect(step(s, i => i.kind === 'play' && i.card === g.refs.play).activePlayer).toBe('bob');
});
test('Kaz grants the extra action even without a unit to blank', () => {
  const p = board();
  p.players[0].ground = [];
  p.players[0].space = [];
  const g = scenario(p),
    s = use(g.state, 'extra-action');
  expect(s.activePlayer).toBe('alice');
  expect(s.execution.decision!.kind).toBe('action');
  expect(step(s, 'pass').activePlayer).toBe('bob');
});
test('every standard action remains available for Kaz’s extra action, including pass and initiative', () => {
  for (const kind of ['play', 'attack', 'use-ability', 'take-initiative', 'pass'] as const) {
    const g = scenario(board()),
      s = extra(g.state, g.refs.smuggler!);
    const input = choose(s, i => i.kind === kind);
    resume(s, input);
    let done = advance(s, input).state;
    if (kind === 'use-ability')
      done = step(done, i => i.kind === 'choose-mode' && i.mode === 'deploy-unit');
    expect(done.activePlayer).toBe('bob');
    if (kind === 'take-initiative')
      expect(done.initiative).toEqual({ holder: 'alice', claimed: true });
  }
});
test('multiple extra actions survive recovery and consecutive passes by the same player do not end the phase', () => {
  const p = board();
  p.extraActions = 2;
  const g = scenario(p);
  let s = step(g.state, 'pass');
  expect(s.activePlayer).toBe('alice');
  expect(s.consecutivePasses).toBe(1);
  resume(s, choose(s, 'pass'));
  s = step(s, 'pass');
  expect(s.phase).toBe('action');
  expect(s.activePlayer).toBe('alice');
  expect(s.consecutivePasses).toBe(1);
  s = step(s, 'pass');
  expect(s.activePlayer).toBe('bob');
  expect(s.phase).toBe('action');
  s = step(s, 'pass');
  expect(s.phase).toBe('regroup');
});
test('initiative forces remaining extra actions to pass without ending the phase until the opponent passes', () => {
  const p = board();
  p.extraActions = 2;
  const g = scenario(p),
    s = step(g.state, 'take-initiative');
  expect(s.phase).toBe('action');
  expect(s.activePlayer).toBe('bob');
  expect(s.consecutivePasses).toBe(1);
  expect(step(s, 'pass').phase).toBe('regroup');
});
test('Kaz’s round effect survives deployment of its source, blocks newly granted abilities and expires at the round boundary', () => {
  const g = scenario(board());
  let s = extra(g.state, g.refs.smuggler!);
  s = step(use(s, 'deploy'), i => i.kind === 'choose-mode' && i.mode === 'deploy-unit');
  modifyUnit(s, s.cards[g.refs.kaz!]!, s.cards[g.refs.smuggler!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'round',
    abilities: { keywords: ['Sentinel'] },
  });
  expect(keywordNames(s, s.cards[g.refs.smuggler!]!)).toEqual([]);
  s = endPhase(s);
  expect(s.phase).toBe('regroup');
  expect(keywordNames(s, s.cards[g.refs.smuggler!]!)).toEqual([]);
  s = resourcePair(s);
  expect(s.round).toBe(2);
  expect(keywordNames(s, s.cards[g.refs.smuggler!]!).sort()).toEqual(['Piloting', 'Raid']);
});
test('Kaz’s deployed unit blanks any number simultaneously, including itself, without borrowing the leader action', () => {
  const p = board();
  p.players[0].leader = { card: kaz, ref: 'kaz', deployedAs: 'unit', abilityUses: { deploy: 1 } };
  const g = scenario(p),
    pending = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.kaz &&
        i.defender === g.state.players.bob!.base,
    );
  expect(effectiveAbilities(pending, pending.cards[g.refs.kaz!]!).actions).toHaveLength(0);
  expect(pending.execution.decision!.selection!.min).toBe(0);
  resume(pending, choose(pending, 'accept-effect', [g.refs.kaz!, g.refs.smuggler!]));
  const s = step(pending, 'accept-effect', [g.refs.kaz!, g.refs.smuggler!]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(effectiveAbilities(s, s.cards[g.refs.kaz!]!).triggers).toHaveLength(0);
  expect(keywordNames(s, s.cards[g.refs.smuggler!]!)).toEqual([]);
  expect(step(pending, 'accept-effect', []).lastingEffects).toHaveLength(0);
});
test('Kaz’s Pilot grants the attack choice; blanking the host preserves its direct leader status and upgrade statistics', () => {
  const p = board();
  p.players[0].leader = {
    card: kaz,
    ref: 'kaz',
    deployedAs: 'upgrade',
    attachedTo: 'host',
    abilityUses: { deploy: 1 },
  };
  const g = scenario(p),
    pending = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.host &&
        i.defender === g.state.players.bob!.base,
    );
  const s = step(pending, 'accept-effect', [g.refs.host!]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toEqual({ power: 5, hp: 4 });
  expect(unitIsLeader(s, s.cards[g.refs.host!]!)).toBe(true);
  expect(effectiveAbilities(s, s.cards[g.refs.host!]!).triggers).toHaveLength(0);
});
function maxBoard(copies = 1) {
  const p = board();
  p.players[0].leader = { card: ids.leader, ref: 'leader' };
  p.players[0].ground = [{ card: max, ref: 'max', exhausted: true }];
  if (copies === 2) p.players[1].ground = [{ card: max, ref: 'other-max', exhausted: true }];
  return p;
}
test('Max adds a complete regroup, repeating draw, resource and ready without advancing the round early', () => {
  const p = maxBoard();
  for (const player of p.players) for (const r of player.resources!) r.exhausted = true;
  const g = scenario(p);
  let s = endPhase(g.state);
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(s.round).toBe(1);
  s = resourcePair(s, true);
  expect(s.phase).toBe('regroup');
  expect(s.round).toBe(1);
  expect(s.players.alice!.hand).toHaveLength(4);
  expect(s.cards[g.refs.max!]!.exhausted).toBe(false);
  expect(s.players.alice!.resources).toHaveLength(9);
  resume(s, choose(s, 'resource', [s.players.alice!.hand[0]!]));
  s = resourcePair(s, true);
  expect(s.phase).toBe('action');
  expect(s.round).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(s.players.alice!.resources).toHaveLength(10);
  expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
});
test('one Max per player creates two additional regroups, and the next round independently repeats that count', () => {
  const g = scenario(maxBoard(2));
  let s = endPhase(g.state);
  for (let n = 0; n < 3; n++) {
    expect(s.phase).toBe('regroup');
    expect(s.round).toBe(1);
    s = resourcePair(s);
  }
  expect(s.round).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(7);
  s = endPhase(s);
  for (let n = 0; n < 3; n++) s = resourcePair(s);
  expect(s.round).toBe(3);
  expect(s.players.alice!.hand).toHaveLength(13);
});
test('each extra regroup triggers the band again while once-per-round survival uses stay spent', () => {
  const p = maxBoard();
  p.players[0].ground!.push({ card: 'the-max-rebo-band--jatz-wailers' }, { card: 'rancor-keeper' });
  p.players[0].space = [{ card: 'fireball--an-explosion-with-wings', ref: 'fireball' }];
  const g = scenario(p);
  let s = endPhase(g.state);
  // Choose the first trigger, retaining the shared player ordering until its nested choices finish.
  for (let n = 0; n < 30 && s.execution.decision!.kind !== 'resource'; n++) {
    const d = s.execution.decision!,
      frame = s.execution.frames[0]!;
    s = step(
      s,
      d.options[0]!.intent.kind,
      frame.kind === 'effect' && frame.effect.kind === 'damage-chosen-bases'
        ? [s.players.bob!.base]
        : [],
    );
  }
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  s = resourcePair(s);
  for (let n = 0; n < 30 && s.execution.decision!.kind !== 'resource'; n++)
    s = step(s, s.execution.decision!.options[0]!.intent.kind);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.cards[g.refs.fireball!]!.damage).toBe(2);
  expect(s.players.alice!.tokens.filter(id => s.cards[id]!.cardId === 'credit')).toHaveLength(2);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  s = resourcePair(s);
  expect(s.roundHistory.triggerUses).toHaveLength(0);
});
test('a Max defeated at the first regroup’s delayed window creates no additional phase', () => {
  const p = maxBoard();
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'source' }];
  p.delayed = [{ source: 'source', unit: 'max' }];
  const g = scenario(p),
    s = resourcePair(endPhase(g.state));
  expect(s.cards[g.refs.max!]!.zone).toBe('discard');
  expect(s.round).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(3);
});
test('Kaz’s round loss keeps Max inactive through regroup and restores it for the following round', () => {
  const p = maxBoard();
  p.players[0].leader = { card: kaz, ref: 'kaz' };
  const g = scenario(p);
  let s = extra(g.state, g.refs.max!);
  s = endPhase(s);
  s = resourcePair(s);
  expect(s.round).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(effectiveAbilities(s, s.cards[g.refs.max!]!).extraRegroups).toBe(1);
  s = endPhase(s);
  s = resourcePair(s);
  expect(s.round).toBe(2);
  s = resourcePair(s);
  expect(s.round).toBe(3);
});
test('round ability loss on another unit lasts through both Max regroups while phase loss ends before them', () => {
  for (const duration of ['round', 'phase'] as const) {
    const p = maxBoard();
    p.players[0].ground!.push({ card: 'independent-smuggler', ref: 'smuggler' });
    const g = scenario(p);
    modifyUnit(g.state, g.state.cards[g.refs.leader!]!, g.state.cards[g.refs.smuggler!]!, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration,
      loseAbilities: true,
    });
    let s = endPhase(g.state);
    expect(keywordNames(s, s.cards[g.refs.smuggler!]!).length).toBe(duration === 'round' ? 0 : 2);
    s = resourcePair(s);
    expect(s.round).toBe(1);
    expect(keywordNames(s, s.cards[g.refs.smuggler!]!).length).toBe(duration === 'round' ? 0 : 2);
    s = resourcePair(s);
    expect(keywordNames(s, s.cards[g.refs.smuggler!]!).sort()).toEqual(['Piloting', 'Raid']);
  }
});
test('skip-next-regroup readiness applies once, so the following extra regroup can ready the unit', () => {
  const g = scenario(maxBoard()),
    unit = g.state.cards[g.refs.max!]!;
  modifyUnit(g.state, g.state.cards[g.refs.leader!]!, unit, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'next-regroup',
    skipRegroupReady: true,
  });
  let s = resourcePair(endPhase(g.state));
  expect(s.cards[g.refs.max!]!.exhausted).toBe(true);
  s = resourcePair(s);
  expect(s.cards[g.refs.max!]!.exhausted).toBe(false);
});
test('checkpoints reject expired round effects and inconsistent pass ownership', () => {
  const g = scenario(board()),
    s = extra(g.state, g.refs.smuggler!);
  for (const variant of ['round', 'passes']) {
    const bad = structuredClone(s);
    if (variant === 'round') {
      const expiry = bad.lastingEffects[0]!.expires;
      if (expiry.kind !== 'round') throw new Error('Missing round duration');
      expiry.round++;
    } else bad.lastPassPlayer = 'outsider';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});
