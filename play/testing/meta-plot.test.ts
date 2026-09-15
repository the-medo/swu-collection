import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = () => Array.from({ length: 12 }, () => ({ card: ids.marine }));
function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) {
  return advance(s, choose(s, i, selections)).state;
}
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function playCard(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function trigger(s: GameState, id: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

const deploy = (s: GameState) => step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
const plot = (s: GameState, ids: string[]) => step(s, 'accept-effect', ids);
function choosePlotTrigger(s: GameState, card: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected Plot batch');
  const t = f.triggers.find(t => t.source.instanceId === card)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function plotted(card: string) {
  const p = position();
  p.players[0].resources = [...resources(), { card, ref: 'plot' }];
  return p;
}

test('Plot declares all chosen cards before resolving them, preserves order choices and excludes replacement resources', () => {
  const p = plotted('cinta-kaz--the-struggle-comes-first');
  p.players[0].resources!.push({ card: 'jar-jar-binks--mesa-propose-', ref: 'jar' });
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[0].deck![0] = { card: 'armor-of-fortune', ref: 'replacement' };
  const s = scenario(p),
    declare = deploy(s.state);
  expect(declare.execution.frames[0]!.kind).toBe('plot-reveal');
  expect(declare.execution.decision!.selection!.cards).toEqual([s.refs.plot!, s.refs.jar!]);
  resume(declare, choose(declare, 'accept-effect', [s.refs.plot!, s.refs.jar!]));
  const batch = plot(declare, [s.refs.plot!, s.refs.jar!]);
  expect(batch.execution.decision!.options).toHaveLength(2);
  expect(batch.facts.find(f => f.type === 'shown')!.cards.map(c => c.instanceId)).toEqual([
    s.refs.plot!,
    s.refs.jar!,
  ]);
  const jarChoice = choosePlotTrigger(batch, s.refs.jar!);
  resume(jarChoice, choose(jarChoice, 'play'));
  const buff = step(jarChoice, 'play');
  expect(buff.cards[s.refs.replacement!]!.zone).toBe('resources');
  expect(buff.cards[s.refs.replacement!]!.exhausted).toBe(true);
  const cintaChoice = step(buff, 'decline-effect');
  expect(
    cintaChoice.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === s.refs.plot,
    ),
  ).toBe(true);
  const attacker = step(cintaChoice, 'play'),
    attackChoice = target(attacker, s.refs.attacker!);
  resume(
    attackChoice,
    choose(attackChoice, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base),
  );
  const done = step(
    attackChoice,
    i => i.kind === 'attack' && i.defender === s.state.players.bob!.base,
  );
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(done.players.alice!.resources).toHaveLength(14);
  expect(done.execution.decision!.playerId).toBe('bob');
  expect(
    done.facts.filter(
      f => f.type === 'triggered' && f.cards.some(c => c.instanceId === s.refs.replacement),
    ),
  ).toEqual([]);
});

test('a ready Plot card can pay part of its own cost, and its replacement enters exhausted', () => {
  const p = position();
  p.players[0].resources = [
    { card: 'jar-jar-binks--mesa-propose-', ref: 'plot' },
    { card: ids.marine },
    { card: ids.marine, exhausted: true },
    { card: ids.marine, exhausted: true },
  ];
  p.players[0].deck![0] = { card: ids.trooper, ref: 'replacement' };
  const s = scenario(p),
    choice = plot(deploy(s.state), [s.refs.plot!]);
  const buff = step(choice, 'play');
  expect(buff.players.alice!.resources).toHaveLength(4);
  expect(buff.players.alice!.resources.every(id => buff.cards[id]!.exhausted)).toBe(true);
  expect(buff.cards[s.refs.plot!]!.zone).toBe('ground');
  expect(buff.cards[s.refs.replacement!]!.exhausted).toBe(true);
});

test('Plot permits declaring none, declining a shown play and playing with an empty deck', () => {
  const p = plotted('jar-jar-binks--mesa-propose-'),
    s = scenario(p),
    declare = deploy(s.state);
  const none = plot(declare, []);
  expect(none.facts.some(f => f.type === 'shown')).toBe(false);
  expect(none.cards[s.refs.plot!]!.zone).toBe('resources');
  const skipped = step(plot(declare, [s.refs.plot!]), 'decline-effect');
  expect(skipped.cards[s.refs.plot!]!.zone).toBe('resources');
  expect(skipped.players.alice!.deck).toHaveLength(12);
  p.players[0].deck = [];
  const empty = scenario(p),
    played = step(plot(deploy(empty.state), [empty.refs.plot!]), 'play');
  expect(played.players.alice!.resources).toHaveLength(12);
  expect(played.cards[played.players.alice!.base]!.damage).toBe(0);
});

test('Plot declaration does not expose unchosen resources to players or spectators', () => {
  const p = plotted('jar-jar-binks--mesa-propose-');
  p.players[0].resources![0] = { card: 'cinta-kaz--the-struggle-comes-first', ref: 'secret' };
  const s = scenario(p),
    a = deploy(s.state);
  const q = structuredClone(p);
  q.players[0].resources![0] = { card: ids.consular, ref: 'secret' };
  const t = scenario(q),
    b = deploy(t.state);
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ])
    expect(
      new Projector(a.gameId, viewer, 'Plot privacy comparison key 1234567').project(a),
    ).toEqual(new Projector(b.gameId, viewer, 'Plot privacy comparison key 1234567').project(b));
  const shown = plot(a, [s.refs.plot!]);
  const publicView = new Projector(shown.gameId, { role: 'spectator' }).project(shown);
  expect(publicView.events.find(e => e.type === 'shown')!.cards.map(c => c.cardId)).toEqual([
    'jar-jar-binks--mesa-propose-',
  ]);
  expect(publicView.cards.filter(c => c.zone === 'resources').every(c => c.face === null)).toBe(
    true,
  );
  const corrupt = structuredClone(a);
  const f = corrupt.execution.frames[0];
  if (f?.kind === 'plot-reveal') f.cards = [];
  expect(() => decodeState(encodeState(corrupt))).toThrow();
});

test('Plot and the leader’s deployment abilities share the same timing batch', () => {
  const p = plotted('jar-jar-binks--mesa-propose-');
  p.players[0].leader = { card: 'ahsoka-tano--trust-in-the-force' };
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const s = scenario(p),
    batch = plot(deploy(s.state), [s.refs.plot!]);
  const f = batch.execution.frames[0];
  expect(f!.kind).toBe('trigger-batch');
  if (f?.kind !== 'trigger-batch') throw new Error('Missing batch');
  expect(f.triggers.some(t => t.abilityId === 'plot')).toBe(true);
  expect(f.triggers.some(t => t.abilityId === 'support-deployed')).toBe(true);
  resume(batch, choose(batch, 'trigger'));
});

test('Jar Jar buffs another friendly unit for the phase when played from hand', () => {
  const p = playCard('jar-jar-binks--mesa-propose-');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    pick = step(s.state, 'play');
  expect(
    pick.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: s.refs.ally! }]);
  const done = target(pick, s.refs.ally!);
  expect(unitStats(done, done.cards[s.refs.ally!]!)).toMatchObject({ power: 5, hp: 5 });
  expect(unitStats(nextRound(done), done.cards[s.refs.ally!]!)).toMatchObject({ power: 3, hp: 3 });
  expect(done.facts.some(f => f.type === 'shown')).toBe(false);
});

test('Chancellor Palpatine creates exactly two temporary Sentinel Spies only with a friendly leader unit', () => {
  for (const deployed of [false, true]) {
    const p = playCard('chancellor-palpatine--i-am-the-senate');
    p.players[0].leader.deployedAs = deployed ? 'unit' : null;
    p.players[0].ground = [{ card: 'spy', ref: 'existing' }];
    const s = scenario(p),
      done = step(s.state, 'play'),
      spies = done.ground.map(id => done.cards[id]!).filter(c => c.cardId === 'spy');
    expect(spies).toHaveLength(deployed ? 3 : 1);
    expect(
      spies.filter(c => effectiveAbilities(done, c).keywords?.includes('Sentinel')),
    ).toHaveLength(deployed ? 2 : 0);
    if (deployed) {
      const next = nextRound(done);
      expect(
        spies.every(
          c => !effectiveAbilities(next, next.cards[c.instanceId]!).keywords?.includes('Sentinel'),
        ),
      ).toBe(true);
    }
  }
});

test('Naboo’s aura grants Raid and Overwhelm to friendly leader units only', () => {
  const p = position();
  p.players[0].leader.deployedAs = 'unit';
  p.players[1].leader.deployedAs = 'unit';
  p.players[0].space = [{ card: 'naboo-royal-starship--fit-for-a-queen', ref: 'ship' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'normal' }];
  const s = scenario(p),
    leader = s.state.cards[s.state.players.alice!.leader]!;
  expect(effectiveAbilities(s.state, leader).raid).toBe(2);
  expect(effectiveAbilities(s.state, leader).keywords).toContain('Overwhelm');
  expect(effectiveAbilities(s.state, s.state.cards[s.state.players.bob!.leader]!).raid).toBe(0);
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.normal!]!).raid).toBe(0);
  const done = step(
    s.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === leader.instanceId &&
      i.defender === s.state.players.bob!.base,
  );
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
});

test('Plot plays upgrades with their printed modifiers on the chosen exact host', () => {
  for (const [card, power, hp] of [
    ['sudden-ferocity', 6, 3],
    ['armor-of-fortune', 3, 6],
  ] as const) {
    const p = plotted(card);
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    const s = scenario(p),
      choice = plot(deploy(s.state), [s.refs.plot!]);
    const input = choose(choice, i => i.kind === 'play' && i.target === s.refs.host);
    resume(choice, input);
    const done = advance(choice, input).state;
    expect(done.cards[s.refs.plot!]!.attachedTo!.instanceId).toBe(s.refs.host!);
    expect(unitStats(done, done.cards[s.refs.host!]!)).toMatchObject({ power, hp });
    expect(done.players.alice!.resources).toHaveLength(13);
  }
});

test('Topple played using Plot damages only damaged units through normal Shield replacement', () => {
  const p = plotted('topple-the-summit');
  p.players[0].ground = [{ card: ids.consular, ref: 'ours', damage: 1 }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'fresh' },
    { card: ids.marine, ref: 'shielded', damage: 1 },
    { card: ids.marine, ref: 'doomed', damage: 1 },
  ];
  p.attachments = [{ card: 'shield', unit: 'shielded', owner: 'bob', ref: 'shield' }];
  const s = scenario(p),
    done = step(plot(deploy(s.state), [s.refs.plot!]), 'play');
  expect(done.cards[s.refs.plot!]!.zone).toBe('discard');
  expect(done.cards[s.refs.ours!]!.damage).toBe(4);
  expect(done.cards[s.refs.fresh!]!.damage).toBe(0);
  expect(done.cards[s.refs.shielded!]!.damage).toBe(1);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(done.cards[s.refs.doomed!]!.zone).toBe('discard');
  expect(done.players.alice!.resources).toHaveLength(13);
});

test('Lurking Snub Fighter offers any unit to exhaust and can decline', () => {
  const p = playCard('lurking-snub-fighter');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.played,
    ),
  ).toBe(true);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.enemy),
  );
  const done = target(choice, s.refs.enemy!);
  expect(done.cards[s.refs.enemy!]!.exhausted).toBe(true);
  expect(step(choice, 'decline-effect').cards[s.refs.enemy!]!.exhausted).toBe(false);
});
