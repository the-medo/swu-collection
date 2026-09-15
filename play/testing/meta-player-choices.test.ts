import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const shuttle = 'governor-s-shuttle',
  dedra = 'dedra-meero--not-wasting-time';
const resources = () => Array.from({ length: 12 }, () => ({ card: ids.marine }));
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const mode = (s: GameState, m: string) => step(s, i => i.kind === 'choose-mode' && i.mode === m);
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
function shuttleBoard() {
  const p = position();
  p.players[0].hand = [{ card: shuttle, ref: 'shuttle' }];
  p.players[0].resources = resources();
  p.players[0].ground = [
    { card: ids.marine, ref: 'mine' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'theirs' }];
  return p;
}
test('Governor’s Shuttle lets each player choose their own unit and defeats both only after the choices', () => {
  const s = scenario(shuttleBoard()),
    first = step(s.state, 'play');
  expect(first.execution.decision!.playerId).toBe('alice');
  expect(first.execution.decision!.options.map(o => o.intent)).toContainEqual({
    kind: 'target',
    card: s.refs.shuttle!,
  });
  const second = target(first, s.refs.mine!);
  expect(second.execution.decision!.playerId).toBe('bob');
  expect(second.cards[s.refs.mine!]!.zone).toBe('ground');
  expect(second.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.theirs! },
  ]);
  expect(() => advance(second, { ...choose(second, 'target'), playerId: 'alice' })).toThrow();
  resume(second, choose(second, 'target'));
  const done = target(second, s.refs.theirs!);
  expect(done.cards[s.refs.mine!]!.zone).toBe('discard');
  expect(done.cards[s.refs.theirs!]!.zone).toBe('discard');
  expect(done.cards[s.refs.shuttle!]!.zone).toBe('space');
});
test('the first Shuttle choice is not disclosed to the second chooser or spectators', () => {
  const s = scenario(shuttleBoard()),
    first = step(s.state, 'play');
  const a = target(first, s.refs.mine!),
    b = target(first, s.refs.other!);
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const projector = new Projector(first.gameId, viewer, 'p'.repeat(32));
    expect(projector.project(a)).toEqual(projector.project(b));
  }
});
test('Governor’s Shuttle can choose itself; an opponent with no units has no choice to make', () => {
  const p = shuttleBoard();
  p.players[0].ground = [];
  p.players[1].ground = [];
  const s = scenario(p),
    done = target(step(s.state, 'play'), s.refs.shuttle!);
  expect(done.cards[s.refs.shuttle!]!.zone).toBe('discard');
  expect(done.execution.decision!.kind).toBe('action');
});
test('Shuttle defeat observes both sides before either leaves, including simultaneous enemy defeat triggers', () => {
  const p = shuttleBoard();
  p.players[0].ground = [{ card: 'hk-47--exclamation--die--meatbag-', ref: 'mine' }];
  p.players[1].ground = [{ card: 'hk-47--exclamation--die--meatbag-', ref: 'theirs' }];
  const s = scenario(p),
    done = target(target(step(s.state, 'play'), s.refs.mine!), s.refs.theirs!);
  expect(done.cards[s.refs.mine!]!.zone).toBe('discard');
  expect(done.cards[s.refs.theirs!]!.zone).toBe('discard');
  expect(done.execution.decision!.kind).toBe('trigger-player');
  const resolved = step(done, i => i.kind === 'trigger-player' && i.playerId === 'alice');
  expect(resolved.cards[resolved.players.alice!.base]!.damage).toBe(1);
  expect(resolved.cards[resolved.players.bob!.base]!.damage).toBe(1);
});
function dedraBoard() {
  const p = position();
  p.players[0].leader = { card: dedra, ref: 'dedra' };
  p.players[0].resources = resources();
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}
const interrogate = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'interrogate');
test('Dedra pays one resource and exhausts, then the chosen unit’s controller decides damage or draw', () => {
  const s = scenario(dedraBoard()),
    select = interrogate(s.state);
  expect(select.cards[s.refs.dedra!]!.exhausted).toBe(true);
  expect(select.players.alice!.resources.filter(id => select.cards[id]!.exhausted)).toHaveLength(1);
  const choice = target(select, s.refs.enemy!);
  expect(choice.execution.decision!.playerId).toBe('bob');
  const bobView = new Projector(choice.gameId, { role: 'player', playerId: 'bob' }).project(choice);
  expect(
    bobView.decision!.options.every(
      o =>
        o.cards.length === 1 &&
        bobView.cards.find(c => c.id === o.cards[0])?.face?.cardId === ids.marine,
    ),
  ).toBe(true);
  expect(
    new Projector(choice.gameId, { role: 'player', playerId: 'alice' }).project(choice).decision,
  ).toBeNull();
  expect(() => advance(choice, { ...choose(choice, 'choose-mode'), playerId: 'alice' })).toThrow();
  resume(
    choice,
    choose(choice, i => i.kind === 'choose-mode' && i.mode === 'take-2-damage'),
  );
  const damage = mode(choice, 'take-2-damage');
  expect(damage.cards[s.refs.enemy!]!.damage).toBe(2);
  expect(damage.players.alice!.hand).toHaveLength(0);
  expect(damage.facts.find(f => f.type === 'mode-chosen')!.actor).toBe('bob');
  const draw = mode(choice, 'opponent-draws');
  expect(draw.players.alice!.hand).toHaveLength(1);
  expect(draw.cards[s.refs.enemy!]!.damage).toBe(0);
});
test('preventing Dedra’s chosen damage does not let her draw', () => {
  const p = dedraBoard();
  p.attachments = [
    { card: 'shield', unit: 'enemy', ref: 's1' },
    { card: 'shield', unit: 'enemy', ref: 's2' },
  ];
  const s = scenario(p),
    choice = target(interrogate(s.state), s.refs.enemy!),
    replace = mode(choice, 'take-2-damage');
  expect(replace.execution.decision!.kind).toBe('replacement');
  resume(
    replace,
    choose(replace, i => i.kind === 'target' && i.card === s.refs.s2),
  );
  const done = target(replace, s.refs.s2!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(0);
  expect(done.players.alice!.hand).toHaveLength(0);
});
test('Dedra’s leader action cannot activate without its costs and has no draw fallback without an enemy unit', () => {
  const p = dedraBoard();
  p.players[1].ground = [];
  const s = scenario(p),
    done = interrogate(s.state);
  expect(done.players.alice!.hand).toHaveLength(0);
  expect(done.cards[s.refs.dedra!]!.exhausted).toBe(true);
  p.players[0].resources = [];
  const empty = scenario(p);
  expect(() => interrogate(empty.state)).toThrow();
  p.players[0].resources = resources();
  p.players[0].leader.exhausted = true;
  expect(() => interrogate(scenario(p).state)).toThrow();
});
test('Dedra’s deployed face has only hand-count Raid, recalculated without exposing either hand’s faces', () => {
  for (const count of [0, 1, 2]) {
    const p = dedraBoard();
    p.players[0].leader.deployedAs = 'unit';
    p.players[0].hand = Array.from({ length: count }, () => ({ card: ids.marine }));
    p.players[1].hand = [{ card: ids.fighter }];
    const s = scenario(p),
      leader = s.state.cards[s.refs.dedra!]!;
    expect(effectiveAbilities(s.state, leader).actions).toEqual([]);
    expect(unitStats(s.state, leader).power).toBe(2);
    const done = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.dedra &&
        i.defender === s.state.players.bob!.base,
    );
    expect(done.cards[done.players.bob!.base]!.damage).toBe(count > 1 ? 4 : 2);
    const view = new Projector(s.state.gameId, { role: 'spectator' }).project(s.state);
    expect(view.cards.some(c => c.zone === 'hand')).toBe(false);
  }
});

test('an opponent choosing a protected unit does not change the source of the Shuttle’s defeat effect', () => {
  const p = shuttleBoard();
  p.players[1].ground = [{ card: 'rey--skywalker', ref: 'rey' }];
  const s = scenario(p),
    done = target(target(step(s.state, 'play'), s.refs.shuttle!), s.refs.rey!);
  expect(done.cards[s.refs.shuttle!]!.zone).toBe('discard');
  expect(done.cards[s.refs.rey!]!.zone).toBe('ground');
});
