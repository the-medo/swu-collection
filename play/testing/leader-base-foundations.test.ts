import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { initialState, minimumDeckSize } from '../engine/state.ts';
import { prepareDeckSnapshot } from '../admission/decks.ts';
import { Projector } from '../projection/projector.ts';
import { choose, config, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

function step(s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) {
  return advance(s, choose(s, i)).state;
}
function useBase(s: GameState) {
  return step(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.base);
}
function target(s: GameState, id: string) {
  return step(s, i => i.kind === 'target' && i.card === id);
}
function resume(s: GameState, i: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input: i })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, i));
}
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = advance(
      s,
      choose(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []),
    ).state;
  }
  expect(s.round).toBe(round + 1);
  return s;
}
const resources = (n: number) => Array.from({ length: n }, () => ({ card: ids.marine }));
const readyCount = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;

test('Thermal Oscillator reduces the practice minimum by five in engine and deck admission', () => {
  const c = config();
  c.players[0].base = 'thermal-oscillator';
  c.players[0].deck = [{ cardId: ids.marine, quantity: 1 }];
  expect(minimumDeckSize(initialState(c), c.players[0].base)).toBe(1);
  expect(() => initialState(c)).not.toThrow();
  const raw = {
    source: { deckId: '11111111-1111-4111-8111-111111111111', format: 1, kind: 'normal' as const },
    base: c.players[0].base,
    leader: ids.leader,
    leader2: null,
    mainboard: c.players[0].deck,
    sideboard: [],
    reserve: [],
  };
  const catalog = {
    'thermal-oscillator': { type: 'Base' },
    [ids.leader]: { type: 'Leader' },
    [ids.marine]: { type: 'Unit' },
  };
  expect(prepareDeckSnapshot(raw, catalog, 'core-practice').ok).toBe(true);
  raw.mainboard = [];
  expect(prepareDeckSnapshot(raw, catalog, 'core-practice').ok).toBe(false);
});

for (const base of ['pau-city', 'petranaki-arena']) {
  test(`${base}: modifies only friendly deployed leaders, including a Pilot's host`, () => {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].leader = { card: ids.leader, deployedAs: 'unit' };
    p.players[0].ground = [{ card: ids.marine, ref: 'ordinary' }];
    p.players[1].leader = { card: ids.leader, deployedAs: 'unit' };
    const s = scenario(p);
    expect(unitStats(s.state, s.state.cards[s.state.players.alice!.leader]!)).toEqual({
      power: base === 'pau-city' ? 2 : 3,
      hp: base === 'pau-city' ? 6 : 5,
    });
    expect(unitStats(s.state, s.state.cards[s.state.players.bob!.leader]!)).toEqual({
      power: 2,
      hp: 5,
    });
    expect(unitStats(s.state, s.state.cards[s.refs.ordinary!]!)).toEqual({ power: 3, hp: 3 });
    p.players[0].leader = {
      card: 'luke-skywalker--hero-of-yavin',
      deployedAs: 'upgrade',
      attachedTo: 'host',
    };
    p.players[0].space = [{ card: 'red-squadron-x-wing', ref: 'host' }];
    const pilot = scenario(p);
    expect(unitStats(pilot.state, pilot.state.cards[pilot.refs.host!]!)).toEqual({
      power: base === 'pau-city' ? 7 : 8,
      hp: base === 'pau-city' ? 10 : 9,
    });
  });
}

for (const base of ['droid-manufactory', 'shadow-collective-camp']) {
  test(`${base}: only successful friendly deployment triggers the base`, () => {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].resources = resources(4);
    let s = scenario(p).state;
    s = step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    expect(s.ground.filter(id => s.cards[id]!.cardId === 'battle-droid')).toHaveLength(
      base === 'droid-manufactory' ? 2 : 0,
    );
    expect(s.players.alice!.hand).toHaveLength(base === 'shadow-collective-camp' ? 1 : 0);
    expect(readyCount(s)).toBe(4);
    p.players[0].resources = resources(3);
    const failed = step(
      scenario(p).state,
      i => i.kind === 'use-ability' && i.abilityId === 'deploy',
    );
    expect(failed.ground).toHaveLength(0);
    expect(failed.players.alice!.hand).toHaveLength(0);
    p.activePlayer = 'bob';
    p.players[1].resources = resources(4);
    const enemy = step(
      scenario(p).state,
      i => i.kind === 'use-ability' && i.abilityId === 'deploy',
    );
    expect(enemy.ground.filter(id => enemy.cards[id]!.cardId === 'battle-droid')).toHaveLength(0);
    expect(enemy.players.alice!.hand).toHaveLength(0);
  });
}

for (const base of ['jedi-temple', 'starlight-temple']) {
  test(`${base}: friendly Force attacks grant the Force, other attacks do not`, () => {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].ground = [
      { card: 'jedi-consular', ref: 'force' },
      { card: ids.marine, ref: 'ordinary' },
    ];
    const s = scenario(p);
    const attack = (id: string) =>
      step(
        s.state,
        i => i.kind === 'attack' && i.attacker === id && i.defender === s.state.players.bob!.base,
      );
    expect(forceToken(attack(s.refs.force!), 'alice')).toBeDefined();
    expect(forceToken(attack(s.refs.ordinary!), 'alice')).toBeUndefined();
  });
}

test('Security Complex targets an exact non-leader, gives its controller a Shield and consumes its Epic', () => {
  const p = position();
  p.players[0].base.card = 'security-complex';
  p.players[0].leader.deployedAs = 'unit';
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const s = scenario(p),
    choice = useBase(s.state);
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.state.players.alice!.leader,
    ),
  ).toBe(false);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.two),
  );
  const done = target(choice, s.refs.two!);
  expect(attachedUpgrades(done, done.cards[s.refs.one!]!)).toHaveLength(0);
  expect(
    attachedUpgrades(done, done.cards[s.refs.two!]!).map(c => [c.cardId, c.controller]),
  ).toEqual([['shield', 'bob']]);
  const again = step(done, 'pass');
  expect(
    again.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === again.players.alice!.base,
    ),
  ).toBe(false);
});

test('Jedha City applies negative power to the chosen non-leader until phase end', () => {
  const p = position();
  p.players[0].base.card = 'jedha-city';
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  const s = scenario(p),
    done = target(useBase(s.state), s.refs.two!);
  expect(unitStats(done, done.cards[s.refs.two!]!).power).toBe(0);
  expect(unitStats(done, done.cards[s.refs.one!]!).power).toBe(3);
  const expired = nextRound(done);
  expect(unitStats(expired, expired.cards[s.refs.two!]!).power).toBe(3);
});

test('Tarkintown excludes undamaged and leader units and deals three damage to the exact target', () => {
  const p = position();
  p.players[0].base.card = 'tarkintown';
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', damage: 1 };
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two', damage: 1 },
  ];
  const s = scenario(p),
    choice = useBase(s.state);
  expect(
    choice.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => o.intent.kind === 'target' && o.intent.card),
  ).toEqual([s.refs.two!]);
  expect(target(choice, s.refs.two!).cards[s.refs.two!]!.damage).toBe(4);
});

test('Energy Conversion Lab pays the normal cost, restricts printed cost and supplies v8 Ambush before entry triggers', () => {
  const p = position();
  p.players[0].base.card = 'energy-conversion-lab';
  p.players[0].resources = resources(12);
  p.players[0].hand = [
    { card: ids.marine, ref: 'play' },
    { card: 'devastator--hunting-the-rebellion', ref: 'expensive' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const s = scenario(p),
    choice = useBase(s.state);
  expect(
    choice.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .map(o => o.intent.kind === 'play' && o.intent.card),
  ).toEqual([s.refs.play!]);
  expect(
    new Projector(choice.gameId, { role: 'player', playerId: 'bob' }).project(choice).decision,
  ).toBeNull();
  resume(choice, choose(choice, 'play'));
  const ambush = step(choice, 'play');
  expect(readyCount(ambush)).toBe(10);
  const done = target(ambush, s.refs.enemy!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(3);
  expect(done.cards[s.refs.play!]!.zone).toBe('discard');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(0);
});

for (const base of ['aldhani-garrison', 'imperial-command-complex', 'partisan-hideout']) {
  test(`${base}: ignores only one colored penalty and still pays the villainy penalty`, () => {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].resources = resources(8);
    p.players[0].hand = [{ card: 'superlaser-technician', ref: 'play' }];
    const s = scenario(p),
      done = step(useBase(s.state), 'play');
    // Three printed resources and the missing Villainy icon; the Command
    // penalty is either absent or ignored, depending on this base's aspect.
    expect(readyCount(done)).toBe(3);
    expect(done.cards[s.refs.play!]!.zone).toBe('ground');
    expect(done.cards[done.players.alice!.base]!.abilityUses.epic).toBe(1);
  });
}

test('a base deployment trigger and revealed Plot share a recoverable choice of resolution order', () => {
  const p = position();
  p.players[0].base.card = 'droid-manufactory';
  p.players[0].resources = [...resources(6), { card: 'armor-of-fortune', ref: 'plot' }];
  const s = scenario(p);
  const reveal = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  resume(reveal, choose(reveal, 'accept-effect', [s.refs.plot!]));
  const batch = advance(reveal, choose(reveal, 'accept-effect', [s.refs.plot!])).state;
  expect(batch.execution.decision!.options.filter(o => o.intent.kind === 'trigger')).toHaveLength(
    2,
  );
  const frame = batch.execution.frames[0];
  if (frame?.kind !== 'trigger-batch') throw new Error('Expected deployment batch');
  const base = frame.triggers.find(t => t.source.cardId === 'droid-manufactory')!;
  const input = choose(batch, i => i.kind === 'trigger' && i.triggerId === base.id);
  resume(batch, input);
  const done = advance(batch, input).state;
  expect(done.ground.filter(id => done.cards[id]!.cardId === 'battle-droid')).toHaveLength(2);
  expect(
    done.ground
      .filter(id => done.cards[id]!.cardId === 'battle-droid')
      .every(id => done.cards[id]!.exhausted),
  ).toBe(true);
});

test('Pilot upgrade deployment also triggers the friendly base once without creating a unit entry', () => {
  const p = position();
  p.players[0].base.card = 'shadow-collective-camp';
  p.players[0].leader.card = 'luke-skywalker--hero-of-yavin';
  p.players[0].space = [{ card: 'red-squadron-x-wing', ref: 'host' }];
  p.players[0].resources = resources(6);
  const s = scenario(p);
  const choice = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const done = target(choice, s.refs.host!);
  expect(done.players.alice!.hand).toHaveLength(1);
  expect(done.cards[done.players.alice!.leader]!.deployedAs).toBe('upgrade');
  expect(done.ground).toHaveLength(0);
});
