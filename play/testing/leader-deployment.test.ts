import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { unitIsLeader } from '../engine/attributes.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const trench = 'admiral-trench--chk-chk-chk-chk',
  bail = 'bail-organa--doing-everything-he-can',
  poe = 'poe-dameron--i-can-fly-anything';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id = trench, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].base.damage = 5;
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
function effects(s: GameState, e: CardEffect[], source = leader(s)) {
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
function completeRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 30 && s.round === round; n++) {
    const d = s.execution.decision!;
    s = step(
      s,
      d.kind === 'resource' ? 'resource' : d.kind === 'action' ? 'pass' : d.options[0]!.intent.kind,
      [],
    );
  }
  expect(s.round).toBe(round + 1);
  return s;
}
function revealChoice() {
  const p = board();
  p.players[0].deck = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.consular, ref: 'three' },
    { card: ids.trooper, ref: 'four' },
    { card: ids.fighter, ref: 'secret' },
  ];
  const g = scenario(p);
  return { ...g, pending: use(g.state, 'deploy') };
}
test('Trench front discards one exact eligible hand copy before drawing, without paying resources', () => {
  const p = board();
  p.players[0].hand = [
    { card: ids.consular, ref: 'discard' },
    { card: ids.marine, ref: 'keep' },
  ];
  const g = scenario(p),
    s = use(g.state);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.discard!]);
  resume(s, choose(s, 'accept-effect', [g.refs.discard!]));
  const done = step(s, 'accept-effect', [g.refs.discard!]);
  expect(done.cards[g.refs.discard!]!.zone).toBe('discard');
  expect(done.cards[g.refs.keep!]!.zone).toBe('hand');
  expect(done.players.alice!.hand).toHaveLength(2);
  expect(leader(done).exhausted).toBe(true);
  expect(ready(done)).toBe(12);
});
test('Trench front can exhaust without an eligible discard, producing no draw', () => {
  const p = board();
  p.players[0].hand = [{ card: ids.marine }];
  let s = use(scenario(p).state);
  if (s.execution.decision?.kind === 'effect') s = step(s, 'accept-effect', []);
  expect(leader(s).exhausted).toBe(true);
  expect(s.facts.some(f => f.type === 'drawn')).toBe(false);
});
test('Trench pays three resources and exhaustion below the six-resource condition without deploying', () => {
  const p = board();
  p.players[0].resources!.length = 5;
  const s = use(scenario(p).state, 'deploy');
  expect(ready(s)).toBe(2);
  expect(leader(s).deployedAs).toBe(null);
  expect(leader(s).exhausted).toBe(true);
});
for (const exhausted of [true, false])
  test(`Trench cannot deploy without the complete payment (${exhausted})`, () => {
    const p = board();
    if (exhausted) p.players[0].leader.exhausted = true;
    else p.players[0].resources!.forEach((r, i) => (r.exhausted = i >= 2));
    const s = scenario(p).state;
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'deploy',
      ),
    ).toBe(false);
  });
test('Trench reveals exactly four cards, gives the opponent the two-card discard, then draws the selected remaining copy', () => {
  const g = revealChoice(),
    s = g.pending;
  expect(ready(s)).toBe(9);
  expect(leader(s)).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(s.execution.decision!.selection).toMatchObject({ min: 2, max: 2 });
  const spectator = new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s);
  expect(spectator.decision).toBe(null);
  expect(
    spectator.events.filter(e => e.type === 'revealed').flatMap(e => e.cards.map(c => c.cardId)),
  ).toEqual([ids.marine, ids.marine, ids.consular, ids.trooper]);
  expect(JSON.stringify(spectator)).not.toContain(ids.fighter);
  const input = choose(s, 'accept-effect', [g.refs.one!, g.refs.three!]);
  resume(s, input);
  const next = advance(s, input).state;
  expect(next.execution.decision!.playerId).toBe('alice');
  expect(next.execution.decision!.selection!.cards).toEqual([g.refs.two!, g.refs.four!]);
  expect(next.facts.find(f => f.type === 'discarded')!.actor).toBe('bob');
  resume(next, choose(next, 'accept-effect', [g.refs.four!]));
  const done = step(next, 'accept-effect', [g.refs.four!]);
  expect(done.cards[g.refs.four!]!.zone).toBe('hand');
  expect(done.cards[g.refs.two!]!.zone).toBe('discard');
  expect(done.players.alice!.deck).toEqual([g.refs.secret!]);
  expect(done.facts.filter(f => f.type === 'drawn' && f.amount === 1).length).toBeGreaterThan(0);
});
for (const count of [0, 1, 2, 3])
  test(`Trench resolves an incomplete revealed group without exposing or choosing nonexistent cards (${count})`, () => {
    const p = board();
    p.players[0].deck!.length = count;
    let s = use(scenario(p).state, 'deploy');
    s = step(s, 'accept-effect', s.execution.decision!.selection!.cards.slice(0, 2));
    expect(s.execution.decision!.selection!.cards).toHaveLength(Math.max(0, count - 2));
    s = step(s, 'accept-effect', s.execution.decision!.selection!.cards.slice(0, 1));
    expect(s.players.alice!.hand).toHaveLength(count === 3 ? 1 : 0);
    expect(s.players.alice!.deck).toHaveLength(0);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(5);
  });
test('Trench can pay for and resolve deployment again after defeat and regroup', () => {
  let s = use(scenario(board()).state, 'deploy');
  for (let i = 0; i < 2; i++)
    s = step(s, 'accept-effect', s.execution.decision!.selection!.cards.slice(0, i === 0 ? 2 : 1));
  s = effects(s, [{ kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } }]);
  expect(leader(s).zone).toBe('base');
  expect(leader(s).exhausted).toBe(true);
  s = completeRound(s);
  s = use(s, 'deploy');
  expect(leader(s).deployedAs).toBe('unit');
  expect(ready(s)).toBe(9);
  expect(s.execution.decision!.playerId).toBe('bob');
});
test('Bail chooses both hand discards atomically before exhausting and deploying ready', () => {
  const p = board(bail);
  p.players[0].resources!.length = 4;
  p.players[0].resources!.forEach(r => (r.exhausted = true));
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.fighter, ref: 'keep' },
  ];
  const g = scenario(p),
    s = use(g.state, 'deploy');
  expect(leader(s).exhausted).toBe(false);
  expect(s.players.alice!.hand).toHaveLength(3);
  expect(() => advance(s, choose(s, 'accept-effect', [g.refs.one!]))).toThrow();
  resume(s, choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]));
  const done = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(leader(done)).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(done.players.alice!.hand).toEqual([g.refs.keep!]);
  expect(ready(done)).toBe(0);
});
test('Bail cannot pay with fewer than two cards, but can pay below four resources without deployment', () => {
  const p = board(bail);
  p.players[0].resources!.length = 3;
  p.players[0].hand = [{ card: ids.marine }];
  const s = scenario(p).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'deploy',
    ),
  ).toBe(false);
  p.players[0].hand.push({ card: ids.marine });
  let q = use(scenario(p).state, 'deploy');
  q = step(q, 'accept-effect', q.execution.decision!.selection!.cards);
  expect(leader(q)).toMatchObject({ deployedAs: null, exhausted: true });
  expect(q.players.alice!.hand).toHaveLength(0);
});
test('Bail front pays its costs without a defeated friendly unit; a qualifying return replaces only the chosen resource', () => {
  for (const defeated of [false, true]) {
    const p = board(bail);
    p.players[0].discard = [{ card: ids.marine, ref: 'lost' }];
    if (defeated) p.defeatedThisPhase = ['lost'];
    p.players[0].resources![0] = { card: ids.fighter, ref: 'resource' };
    p.players[0].deck![0] = { card: ids.consular, ref: 'replacement' };
    const g = scenario(p);
    let s = use(g.state);
    expect(ready(s)).toBe(11);
    expect(leader(s).exhausted).toBe(true);
    if (defeated) {
      resume(s, choose(s, 'accept-effect', [g.refs.resource!]));
      s = step(s, 'accept-effect', [g.refs.resource!]);
    }
    expect(s.cards[g.refs.resource!]!.zone).toBe(defeated ? 'hand' : 'resources');
    expect(s.cards[g.refs.replacement!]!.zone).toBe(defeated ? 'resources' : 'deck');
    expect(s.players.alice!.resources).toHaveLength(12);
  }
});
test('Bail heals for a resource play but not a hand play, using the same play observer', () => {
  for (const from of ['hand', 'resources'] as const) {
    const p = board(bail, true);
    p.players[0][from] = [...(p.players[0][from] ?? []), { card: ids.marine, ref: 'play' }];
    const g = scenario(p);
    let s = effects(g.state, [
      {
        kind: 'inspect-zone',
        zone: from,
        player: 'self',
        chooser: 'self',
        filter: {},
        min: 1,
        max: 1,
        bind: 'chosen',
        effects: [
          { kind: 'play-card', from, target: 'chosen', filter: {}, optional: false, free: true },
        ],
      },
    ]);
    s = step(s, 'accept-effect', [g.refs.play!]);
    s = step(s, i => i.kind === 'play' && i.card === g.refs.play);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(from === 'resources' ? 4 : 5);
  }
});
function poeBoard() {
  const p = board(poe);
  p.players[0].space = [
    { card: ids.fighter, ref: 'first' },
    { card: ids.fighter, ref: 'second' },
  ];
  return p;
}
test('Poe flips into an upgrade without deployment, card play, leader status on the host or Epic consumption', () => {
  const g = scenario(poeBoard()),
    s = use(g.state);
  expect(ready(s)).toBe(11);
  expect(leader(s).exhausted).toBe(true);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.first),
  );
  const done = target(s, g.refs.first!);
  expect(leader(done)).toMatchObject({
    deployedAs: 'upgrade',
    exhausted: false,
    attachedTo: { instanceId: g.refs.first },
  });
  expect(unitStats(done, done.cards[g.refs.first!]!)).toEqual({ power: 4, hp: 2 });
  expect(unitIsLeader(done, done.cards[g.refs.first!]!)).toBe(false);
  expect(leader(done).abilityUses.deploy).toBeUndefined();
  expect(done.facts.some(f => f.type === 'deployed' || f.type === 'played')).toBe(false);
});
test('Poe cannot use extra Pilot capacity to attach to a unit that already has a Pilot', () => {
  const p = poeBoard();
  p.players[0].space!.push({ card: 'millennium-falcon--get-out-and-push', ref: 'falcon' });
  p.attachments = [{ card: 'clone-pilot', owner: 'alice', unit: 'falcon' }];
  const g = scenario(p),
    s = use(g.state);
  expect(
    s.execution.decision!.options.map(o => (o.intent.kind === 'target' ? o.intent.card : null)),
  ).not.toContain(g.refs.falcon);
});
test('Poe can move once per round between eligible Vehicles, retaining his incarnation and spending one resource', () => {
  const g = scenario(poeBoard());
  let s = target(use(g.state), g.refs.first!);
  s = step(s, 'pass');
  const copy = leader(s).incarnation;
  s = use(s, 'reattach');
  expect(ready(s)).toBe(10);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.second),
  );
  s = target(s, g.refs.second!);
  expect(leader(s).incarnation).toBe(copy);
  expect(leader(s).attachedTo!.instanceId).toBe(g.refs.second!);
  expect(unitStats(s, s.cards[g.refs.first!]!).power).toBe(2);
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'reattach',
    ),
  ).toBe(false);
  s = completeRound(s);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'reattach',
    ),
  ).toBe(true);
});
test('Poe returns exhausted after host defeat and can still deploy as a unit through his unused Epic', () => {
  const g = scenario(poeBoard());
  let s = target(use(g.state), g.refs.first!);
  s = effects(
    s,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } }],
    s.cards[g.refs.first!]!,
  );
  expect(leader(s)).toMatchObject({ deployedAs: null, zone: 'base', exhausted: true });
  s = step(s, 'pass');
  s = use(s, 'deploy');
  expect(leader(s)).toMatchObject({
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
  expect(unitStats(s, leader(s))).toEqual({ power: 4, hp: 6 });
  expect(effectiveAbilities(s, leader(s)).actions).toHaveLength(0);
  expect(ready(s)).toBe(11);
});

test('Trench can replace only his resource payment with a Credit, still requiring six controlled resources and readiness', () => {
  const p = board();
  p.players[0].resources!.length = 6;
  p.players[0].resources!.forEach((r, i) => (r.exhausted = i >= 2));
  p.players[0].credits = ['credit'];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  expect(leader(s).exhausted).toBe(false);
  expect(ready(s)).toBe(2);
  resume(s, choose(s, 'accept-effect', [g.refs.credit!]));
  s = step(s, 'accept-effect', [g.refs.credit!]);
  expect(leader(s)).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(ready(s)).toBe(0);
  expect(s.players.alice!.resources).toHaveLength(6);
});
test('Bail can deploy again after defeat with a new pair of hand discards', () => {
  const p = board(bail);
  p.players[0].hand = Array.from({ length: 4 }, () => ({ card: ids.marine }));
  let s = use(scenario(p).state, 'deploy');
  s = step(s, 'accept-effect', s.execution.decision!.selection!.cards.slice(0, 2));
  s = effects(s, [{ kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } }]);
  s = completeRound(s);
  s = use(s, 'deploy');
  s = step(s, 'accept-effect', s.execution.decision!.selection!.cards.slice(0, 2));
  expect(leader(s)).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(s.facts.filter(f => f.type === 'deployed')).toHaveLength(2);
});
test('Bail heals when his deployment lets an upgrade be played using Plot from resources', () => {
  const p = board(bail);
  p.players[0].resources![0] = { card: 'sudden-ferocity', ref: 'plot' };
  p.players[0].hand = [{ card: ids.marine }, { card: ids.marine }];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  s = step(s, 'accept-effect', s.execution.decision!.selection!.cards);
  s = step(s, 'accept-effect', [g.refs.plot!]);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.target === s.players.alice!.leader),
  );
  s = step(s, i => i.kind === 'play' && i.target === s.players.alice!.leader);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
  expect(s.players.alice!.resources).toHaveLength(12);
  expect(unitStats(s, leader(s)).power).toBe(6);
});
test('Poe remains controlled by his owner on an enemy-controlled host and only that owner can reattach him', () => {
  const g = scenario(poeBoard());
  let s = target(use(g.state), g.refs.first!);
  s = effects(
    s,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'take-control', player: 'enemy' } }],
    s.cards[g.refs.first!]!,
  );
  expect(s.cards[g.refs.first!]!.controller).toBe('bob');
  expect(leader(s).controller).toBe('alice');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === s.players.alice!.leader,
    ),
  ).toBe(false);
  s = step(s, 'pass');
  s = use(s, 'reattach');
  s = target(s, g.refs.second!);
  expect(leader(s).attachedTo!.instanceId).toBe(g.refs.second!);
});
test('Poe can pay his front action without an eligible Vehicle while leaving his Epic unused', () => {
  const s = use(scenario(board(poe)).state);
  expect(leader(s)).toMatchObject({ deployedAs: null, exhausted: true });
  expect(ready(s)).toBe(11);
  expect(leader(s).abilityUses.deploy).toBeUndefined();
});

test('Trench rejects the wrong chooser, unrevealed fifth card and a forged recovered inspection', () => {
  const g = revealChoice(),
    s = g.pending;
  const good = choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(() => advance(s, { ...good, playerId: 'alice' } as EngineInput)).toThrow();
  expect(() => advance(s, choose(s, 'accept-effect', [g.refs.one!, g.refs.secret!]))).toThrow();
  const forged = JSON.parse(encodeState(s));
  forged.execution.frames[0].cards.push({ ...forged.cards[g.refs.secret!] });
  expect(() => decodeState(JSON.stringify(forged))).toThrow();
});
test('Bail resource-return selections do not disclose private resource identities to spectators', () => {
  const make = (card: string) => {
    const p = board(bail);
    p.players[0].discard = [{ card: ids.marine, ref: 'lost' }];
    p.defeatedThisPhase = ['lost'];
    p.players[0].resources![0] = { card };
    return use(scenario(p).state);
  };
  const a = make(ids.fighter),
    b = make(ids.consular);
  const view = (s: GameState) =>
    new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s);
  expect(view(a)).toEqual(view(b));
});
