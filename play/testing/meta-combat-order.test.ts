import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { effectFrames } from '../engine/triggers.ts';
import { numericValue } from '../engine/values.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const pod = 'anakin-s-podracer--so-wizard-',
  han = 'han-solo--has-his-moments',
  hotshot = 'hotshot-maneuver';
const falcon = 'millennium-falcon--get-out-and-push',
  mech = 'the-cyborg-mech--mysterious-threat';
const resources = () => Array.from({ length: 14 }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const attack = (s: GameState, from: string, to: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === from && i.defender === to);
function effects(s: GameState, list: CardEffect[]) {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames('alice', state.cards[state.players.alice!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
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
function podBoard() {
  const p = position();
  p.players[0].ground = [{ card: pod, ref: 'pod' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}

test('Anakin’s Podracer defeats a unit before it can deal combat damage back', () => {
  const s = scenario(podBoard()),
    done = attack(s.state, s.refs.pod!, s.refs.enemy!);
  expect(done.cards[s.refs.pod!]!.zone).toBe('ground');
  expect(done.cards[s.refs.pod!]!.damage).toBe(0);
  expect(done.cards[s.refs.enemy!]!.zone).toBe('discard');
  expect(done.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([3]);
});

test('Podracer counts both players’ other attackers, while its own earlier attack does not disable first damage', () => {
  for (const prior of ['pod', 'enemy', 'other']) {
    const p = podBoard();
    p.players[0].ground!.push({ card: ids.marine, ref: 'other' });
    p.attackedThisPhase = [prior];
    const s = scenario(p),
      done = attack(s.state, s.refs.pod!, s.refs.enemy!);
    expect(done.cards[s.refs.pod!]!.zone).toBe(prior === 'pod' ? 'ground' : 'discard');
    expect(done.cards[s.refs.enemy!]!.zone).toBe('discard');
  }
});

test('the defending Podracer has no combat priority and losing its abilities removes attacking priority', () => {
  const p = podBoard();
  p.activePlayer = 'bob';
  const s = scenario(p),
    done = attack(s.state, s.refs.enemy!, s.refs.pod!);
  expect(done.cards[s.refs.enemy!]!.zone).toBe('discard');
  expect(done.cards[s.refs.pod!]!.zone).toBe('discard');
  const t = scenario(podBoard());
  modifyUnit(t.state, t.state.cards[t.state.players.bob!.leader]!, t.state.cards[t.refs.pod!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(attack(t.state, t.refs.pod!, t.refs.enemy!).cards[t.refs.pod!]!.zone).toBe('discard');
});

test('a surviving defender recalculates Grit after first damage; its replacement choice resumes exactly', () => {
  const p = podBoard();
  p.players[1].ground = [{ card: mech, ref: 'enemy' }];
  p.attachments = [
    { card: 'shield', unit: 'pod', ref: 's1' },
    { card: 'shield', unit: 'pod', ref: 's2' },
  ];
  const s = scenario(p),
    pending = attack(s.state, s.refs.pod!, s.refs.enemy!);
  expect(pending.cards[s.refs.enemy!]!.damage).toBe(3);
  expect(pending.execution.frames[0]).toMatchObject({
    kind: 'damage',
    assignments: [{ amount: 6, source: { instanceId: s.refs.enemy! } }],
  });
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === s.refs.s2),
  );
  const done = target(pending, s.refs.s2!);
  expect(done.cards[s.refs.pod!]!.damage).toBe(0);
  expect(done.cards[s.refs.pod!]!.zone).toBe('ground');
});

test('first-hit Shield choices retain a pending combat response, and prevention leaves defender Grit unchanged', () => {
  const p = podBoard();
  p.players[1].ground = [{ card: mech, ref: 'enemy' }];
  p.attachments = [
    { card: 'shield', unit: 'enemy', ref: 's1' },
    { card: 'shield', unit: 'enemy', ref: 's2' },
  ];
  const s = scenario(p),
    pending = attack(s.state, s.refs.pod!, s.refs.enemy!);
  expect(pending.execution.frames.some(f => f.kind === 'combat-response')).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === s.refs.s1),
  );
  const done = target(pending, s.refs.s1!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(0);
  expect(done.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([3]);
  expect(done.cards[s.refs.pod!]!.zone).toBe('discard');
});

test('Han played as a unit uses Ambush, with no upgrade attack or first-damage clause', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: han, ref: 'han' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    ambush = step(s.state, i => i.kind === 'play' && !i.piloting);
  expect(ambush.execution.frames[0]).toMatchObject({ kind: 'effect', effect: { kind: 'ambush' } });
  const done = target(ambush, s.refs.enemy!);
  expect(done.cards[s.refs.han!]!.damage).toBe(3);
  expect(done.cards[s.refs.enemy!]!.zone).toBe('discard');
});
function pilotBoard(ship = falcon, exhausted = false) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: han, ref: 'han' }];
  p.players[0].space = [{ card: ship, ref: 'ship', exhausted }];
  p.players[1].space = [
    { card: ids.fighter, ref: 'enemy' },
    { card: ids.fighter, ref: 'second' },
  ];
  return p;
}
const pilot = (s: GameState, card: string, ship: string) =>
  step(s, i => i.kind === 'play' && i.card === card && i.target === ship && !!i.piloting);

test('Han’s upgrade attack gives only Millennium Falcon first combat damage, only for that attack', () => {
  for (const ship of [falcon, ids.fighter]) {
    const s = scenario(pilotBoard(ship)),
      choice = pilot(s.state, s.refs.han!, s.refs.ship!);
    resume(
      choice,
      choose(choice, i => i.kind === 'attack' && i.defender === s.refs.enemy),
    );
    const done = attack(choice, s.refs.ship!, s.refs.enemy!);
    expect(done.cards[s.refs.ship!]!.damage).toBe(ship === falcon ? 0 : 2);
    expect(done.cards[s.refs.han!]!.attachedTo?.instanceId).toBe(s.refs.ship!);
    if (ship === falcon) {
      const again = effects(done, [
        {
          kind: 'select-unit',
          filter: { name: 'Millennium Falcon' },
          bind: 'ship',
          optional: false,
          effects: [
            { kind: 'on-unit', target: 'ship', operation: { kind: 'ready' } },
            { kind: 'attack-bound', target: 'ship', optional: false },
          ],
        },
      ]);
      const ready = target(again, s.refs.ship!),
        second = attack(ready, s.refs.ship!, s.refs.second!);
      expect(second.cards[s.refs.ship!]!.damage).toBe(2);
    }
  }
});

test('Han does not ready an exhausted host and an eligible host can decline the upgrade attack', () => {
  const s = scenario(pilotBoard(falcon, true)),
    done = pilot(s.state, s.refs.han!, s.refs.ship!);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.cards[s.refs.ship!]!.exhausted).toBe(true);
  const t = scenario(pilotBoard()),
    declined = step(pilot(t.state, t.refs.han!, t.refs.ship!), 'decline-effect');
  expect(declined.cards[t.refs.ship!]!.exhausted).toBe(false);
});
function hotshotBoard(exhausted = false) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: hotshot }];
  p.players[0].space = [{ card: 'tie-bomber', ref: 'attacker', exhausted }];
  p.players[0].leader = {
    card: 'luke-skywalker--hero-of-yavin',
    deployedAs: 'upgrade',
    attachedTo: 'attacker',
    abilityUses: { deploy: 1 },
  };
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
    { card: ids.marine, ref: 'c' },
  ];
  return p;
}

test('Hotshot counts printed and granted On Attack abilities, forces distinct targets, then offers the chosen unit’s attack', () => {
  const s = scenario(hotshotBoard());
  const pending = target(step(s.state, 'play'), s.refs.attacker!);
  expect(pending.execution.decision!.selection).toMatchObject({
    min: 2,
    max: 2,
    cards: [s.refs.a!, s.refs.b!, s.refs.c!],
  });
  expect(() => step(pending, 'accept-effect', [s.refs.a!])).toThrow();
  expect(() => step(pending, 'accept-effect', [s.refs.a!, s.refs.a!])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [s.refs.a!, s.refs.c!]));
  const ready = step(pending, 'accept-effect', [s.refs.a!, s.refs.c!]);
  expect([
    ready.cards[s.refs.a!]!.damage,
    ready.cards[s.refs.b!]!.damage,
    ready.cards[s.refs.c!]!.damage,
  ]).toEqual([2, 0, 2]);
  expect(
    ready.execution.decision!.options.every(
      o => o.intent.kind === 'attack' && o.intent.attacker === s.refs.attacker,
    ),
  ).toBe(true);
  const attacking = attack(ready, s.refs.attacker!, ready.players.bob!.base);
  expect(attacking.cards[s.refs.attacker!]!.exhausted).toBe(true);
  expect(attacking.execution.frames[0]).toMatchObject({ kind: 'trigger-batch' });
});

test('Hotshot uses every available target up to its count, and does not ready an exhausted chosen unit', () => {
  const p = hotshotBoard(true);
  p.players[1].ground!.length = 1;
  const s = scenario(p),
    pending = target(step(s.state, 'play'), s.refs.attacker!);
  expect(pending.execution.decision!.selection).toMatchObject({ min: 1, max: 1 });
  const done = step(pending, 'accept-effect', [s.refs.a!]);
  expect(done.cards[s.refs.a!]!.damage).toBe(2);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.facts.some(f => f.type === 'attacked')).toBe(false);
});

test('Hotshot excludes Restore and Saboteur keywords and still attacks with a unit having zero On Attack abilities', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: hotshot }];
  p.players[0].ground = [{ card: 'jabba-the-hutt--eminence-of-tatooine', ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p);
  modifyUnit(
    s.state,
    s.state.cards[s.state.players.alice!.leader]!,
    s.state.cards[s.refs.attacker!]!,
    { kind: 'modify', power: 0, hp: 0, abilities: { keywords: ['Saboteur'] }, duration: 'phase' },
  );
  expect(
    numericValue(
      s.state,
      { source: s.state.cards[s.refs.attacker!]! },
      { kind: 'on-attack-count', target: 'source' },
    ),
  ).toBe(0);
  const ready = target(step(s.state, 'play'), s.refs.attacker!);
  expect(ready.execution.decision!.options[0]!.intent.kind).toBe('attack');
  expect(ready.cards[s.refs.enemy!]!.damage).toBe(0);
});

test('Hotshot ignores abilities the chosen unit has lost', () => {
  const s = scenario(hotshotBoard());
  modifyUnit(
    s.state,
    s.state.cards[s.state.players.alice!.leader]!,
    s.state.cards[s.refs.attacker!]!,
    { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
  );
  const ready = target(step(s.state, 'play'), s.refs.attacker!);
  expect(ready.execution.decision!.options[0]!.intent.kind).toBe('attack');
  expect(ready.cards[s.refs.a!]!.damage).toBe(0);
});
