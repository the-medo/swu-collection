import { playCost } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const raw = (s: GameState, p: Intent['kind'] | ((i: Intent) => boolean), selected: string[] = []) =>
  advance(s, choose(s, p, selected)).state;
function ordered(s: GameState): GameState {
  while (s.execution.decision?.kind === 'trigger' || s.execution.random) {
    if (s.execution.random)
      s = advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      }).state;
    else s = raw(s, 'trigger');
  }
  return s;
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => ordered(raw(s, p, selected));
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const mode = (s: GameState, name: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === name);
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
const tokens = (s: GameState, id: string, token = 'experience') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === token).length;
const credits = (s: GameState, p = 'alice') =>
  s.players[p]!.tokens.filter(id => s.cards[id]!.cardId === 'credit').length;
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
function board(card: string, inPlay = false) {
  const p = position(),
    d = cardDefinition(card);
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  if (inPlay && d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else p.players[0].hand = [{ card, ref: 'source' }];
  return p;
}
const play = (g: ReturnType<typeof scenario>) =>
  step(g.state, i => i.kind === 'play' && i.card === g.refs.source);
const opts = (s: GameState) => s.execution.decision!.options.map(o => o.intent);
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
test('Ben protects a ready unit as well as an exhausted one, but Sentinel remains attackable', () => {
  for (const sentinel of [false, true]) {
    const p = board('ben-solo--facing-the-light');
    p.players[0].ground = [{ card: sentinel ? 'stalwart-fleet-trooper' : ids.marine, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = target(play(g), g.refs.ally!);
    expect(s.cards[g.refs.ally!]!.exhausted).toBe(false);
    const targets = opts(s).flatMap(i => (i.kind === 'attack' ? [i.defender] : []));
    expect(targets.includes(g.refs.ally!)).toBe(sentinel);
    expect(decodeState(encodeState(s))).toEqual(s);
  }
});
test('Dengar triggers for a tied highest-cost enemy defeat, once each round', () => {
  const p = board('dengar--take-your-shot', true);
  p.players[0].hand = [
    { card: 'lost-and-forgotten', ref: 'event' },
    { card: 'lost-and-forgotten', ref: 'second' },
  ];
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
    { card: ids.marine, ref: 'cheap' },
  ];
  const g = scenario(p);
  const first = step(g.state, i => i.kind === 'play' && i.card === g.refs.event);
  expect(credits(target(first, g.refs.cheap!))).toBe(0);
  let s = target(first, g.refs.one!);
  expect(credits(s)).toBe(1);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.second);
  if (s.execution.frames[0]?.kind === 'credit-payment') s = step(s, 'accept-effect', []);
  s = target(s, g.refs.two!);
  expect(credits(s)).toBe(1);
});
test('Fear and Dead Men counts actual hand discards, including an opponent-forced discard', () => {
  const p = board('fear-and-dead-men');
  p.activePlayer = 'bob';
  p.players[0].hand!.push({ card: ids.fighter, ref: 'discard' });
  p.players[1].hand = [{ card: 'every-day--more-lies', ref: 'event' }];
  p.players[1].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  const g = scenario(p);
  const before = playCost(g.state, g.state.cards[g.refs.source!]!);
  let s = step(g.state, 'play');
  s = step(s, 'accept-effect', []);
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(playCost(s, s.cards[g.refs.source!]!)).toBe(before - 1);
  expect(s.phaseHistory.discarded[0]!.from).toBe('hand');
  expect(decodeState(encodeState(s))).toEqual(s);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.source);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
});
test('Phoenix Squadron Fighters counts damaged friendly units in both arenas only', () => {
  const p = board('phoenix-squadron-fighters');
  p.players[0].ground = [{ card: ids.consular, damage: 1 }];
  p.players[0].space = [{ card: 'igv-55-listener', damage: 1 }];
  p.players[1].ground = [{ card: ids.consular, damage: 3 }];
  const g = scenario(p),
    cost = playCost(g.state, g.state.cards[g.refs.source!]!);
  expect(cost).toBe(8);
  const s = play(g);
  expect(ready(s)).toBe(20 - cost);
});
test('Improvise plays the inspected top with its discount, or offers a discard when declined', () => {
  const p = board('improvise');
  p.players[0].deck = [{ card: ids.marine, ref: 'top' }, { card: ids.fighter }];
  const g = scenario(p);
  let s = step(play(g), 'accept-effect', [g.refs.top!]);
  const before = ready(s);
  resume(s, choose(s, 'play'));
  const played = step(s, 'play');
  expect(ready(played)).toBe(before - 1);
  expect(played.cards[g.refs.top!]!.zone).toBe('ground');
  s = mode(step(s, 'decline-effect'), 'discard');
  expect(s.cards[g.refs.top!]!.zone).toBe('discard');
});
test('Improvise still offers discard when its top card cannot be afforded', () => {
  const p = board('improvise');
  p.players[0].resources = Array.from({ length: 3 }, () => ({ card: ids.marine }));
  p.players[0].deck = [{ card: 'ben-solo--facing-the-light', ref: 'top' }];
  const g = scenario(p);
  let s = step(play(g), 'accept-effect', [g.refs.top!]);
  s = mode(s, 'leave');
  expect(s.players.alice!.deck[0]).toBe(g.refs.top!);
});
test('Intimidator returns selected resources to their owners without revealing them, then creates Credits', () => {
  const p = board('intimidator--citadel-overwatch');
  p.players[0].resources![0]!.ref = 'one';
  p.players[0].resources![1]!.ref = 'two';
  const g = scenario(p),
    choice = play(g);
  expect(choice.execution.decision!.selection!.max).toBe(20);
  resume(choice, choose(choice, 'accept-effect', [g.refs.one!, g.refs.two!]));
  const s = step(choice, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(s.players.alice!.resources).toHaveLength(18);
  expect(s.cards[g.refs.one!]!.zone).toBe('hand');
  expect(credits(s)).toBe(2);
  const publicFacts = s.facts.filter(f => f.type === 'returned-to-hand' && f.audience === 'public');
  expect(
    publicFacts.every(f =>
      f.cards.every(c => c.instanceId !== g.refs.one && c.instanceId !== g.refs.two),
    ),
  ).toBe(true);
});
test('Luke gives the opponent the mode, with damage targeting remaining Luke controller choice', () => {
  const p = board('luke-skywalker--profit-or-be-destroyed');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = play(g);
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(
    s,
    choose(s, i => i.kind === 'choose-mode' && i.mode === 'damage-five'),
  );
  const a = mode(s, 'credit-and-ready');
  expect(credits(a, 'bob')).toBe(1);
  expect(a.cards[g.refs.source!]!.exhausted).toBe(false);
  const b = mode(s, 'damage-five');
  expect(b.execution.decision!.playerId).toBe('alice');
  expect(target(b, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(5);
});
test('R2 searches for a shared friendly unit aspect, excluding leader fronts and bases', () => {
  const p = board('r2-d2--part-of-the-plan');
  p.players[0].deck = [
    { card: ids.marine, ref: 'matching' },
    { card: ids.trooper, ref: 'wrong' },
    { card: 'unmarked-credits' },
  ];
  const g = scenario(p),
    s = play(g);
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.matching!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.wrong!);
  expect(step(s, 'search', [g.refs.matching!]).cards[g.refs.matching!]!.zone).toBe('hand');
});
test('Secret Battle exhausts distinct ready enemies in the selected units arena, up to its aspect count', () => {
  const p = board('secret-battle-of-pretend');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.consular, ref: 'two' },
    { card: ids.consular, ref: 'already', exhausted: true },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.ally!);
  expect(s.execution.decision!.selection).toMatchObject({
    min: 2,
    max: 2,
    cards: [g.refs.one!, g.refs.two!],
  });
  resume(s, choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]));
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(s.cards[g.refs.one!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.two!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.space!]!.exhausted).toBe(false);
});
test('Thats a Rock triggers when discarded from a hand or deck, but not when played as an event', () => {
  for (const from of ['hand', 'deck', 'play']) {
    const p = board(
      from === 'play' ? 'that-s-a-rock' : from === 'deck' ? 'daring-delve' : 'every-day--more-lies',
    );
    if (from === 'hand') p.players[0].hand!.push({ card: 'that-s-a-rock', ref: 'rock' });
    if (from === 'deck')
      p.players[0].deck = [{ card: 'that-s-a-rock', ref: 'rock' }, { card: ids.marine }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = play(g);
    if (from === 'hand') s = step(s, 'accept-effect', [g.refs.rock!]);
    while (s.execution.frames[0]?.kind === 'zone-inspection') s = step(s, 'accept-effect', []);
    expect(opts(s).some(i => i.kind === 'decline-effect')).toBe(from !== 'play');
    s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
    expect(
      s.facts.filter(f => f.type === 'triggered' && f.cards[0]?.cardId === 'that-s-a-rock'),
    ).toHaveLength(from === 'play' ? 0 : 1);
  }
});
test('Salvaged Blaster allows its discard action only after a hand/deck discard this phase', () => {
  const p = board('every-day--more-lies');
  p.players[0].hand!.push({ card: 'salvaged-blaster', ref: 'blaster' });
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[0].discard = [{ card: 'salvaged-blaster', ref: 'old' }];
  const g = scenario(p);
  expect(opts(g.state).some(i => i.kind === 'use-ability' && i.card === g.refs.old)).toBe(false);
  let s = step(play(g), 'accept-effect', [g.refs.blaster!]);
  s = step(s, 'accept-effect', []);
  s = step(s, 'pass');
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.blaster)).toBe(true);
  s = step(s, i => i.kind === 'use-ability' && i.card === g.refs.blaster);
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(s.cards[g.refs.blaster!]!.attachedTo?.instanceId).toBe(g.refs.host!);
  expect(s.cards[g.refs.blaster!]!.resourcesPaid).toBe(2);
});
test('Weequay distinguishes real resource payments from playing entirely with Credits', () => {
  for (const useCredits of [false, true]) {
    const p = board('weequay-pirate');
    if (useCredits) p.players[0].credits = ['coin1', 'coin2', 'coin3', 'coin4'];
    const g = scenario(p);
    let s = play(g);
    if (useCredits)
      s = step(
        s,
        'accept-effect',
        s.execution.decision!.selection!.cards.slice(0, s.execution.decision!.selection!.max),
      );
    expect(tokens(s, g.refs.source!)).toBe(useCredits ? 1 : 0);
    expect(s.cards[g.refs.source!]!.resourcesPaid === 0).toBe(useCredits);
  }
});
test('You Hold This changes control before allowing four damage to another unit in that arena', () => {
  const p = board('you-hold-this');
  p.players[0].ground = [{ card: ids.marine, ref: 'gift' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'wrong' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.gift!);
  expect(s.cards[g.refs.gift!]!.controller).toBe('bob');
  expect(opts(s)).toEqual([{ kind: 'target', card: g.refs.target! }]);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.damage).toBe(4);
});
test('Aerie damages an enemy ground unit and either base during its attack', () => {
  const p = board('aerie--cloud-rider-dropship', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.enemy!);
  s = target(s, s.players.alice!.base);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
});
test('Betrayed Trust prevents attack and defense combat damage without changing power', () => {
  const p = board('betrayed-trust');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.enemy!]!).power).toBe(3);
  const ownAttack = attack(s, g.refs.enemy!, s.players.alice!.base);
  expect(ownAttack.cards[s.players.alice!.base]!.damage).toBe(0);
  s = step(s, 'pass');
  s = attack(s, g.refs.attacker!, g.refs.enemy!);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(0);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
test('Shifty Suspects blocks both bases healing for the phase, including Restore and event heals', () => {
  const p = board('shifty-suspects', true);
  p.players[0].base.damage = 5;
  p.players[1].base.damage = 5;
  p.players[1].ground = [{ card: 'vigilant-scouts', ref: 'restore' }];
  p.players[0].hand = [{ card: 'nebulon-c-frigate', ref: 'healer' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!, g.state.players.bob!.base),
    damaged = s.cards[s.players.bob!.base]!.damage;
  s = attack(s, g.refs.restore!, s.players.alice!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(damaged);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.healer);
  const own = s.cards[s.players.alice!.base]!.damage;
  s = target(s, s.players.alice!.base);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(own);
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('Patient Hunter grants Experience but prevents readying through the current regroup only', () => {
  const p = board('patient-hunter', true);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally', exhausted: true });
  const g = scenario(p);
  let s = step(step(g.state, 'pass'), 'pass');
  expect(s.phase).toBe('regroup');
  s = target(s, g.refs.ally!);
  expect(tokens(s, g.refs.ally!)).toBe(1);
  while (s.phase === 'regroup') {
    if (s.execution.decision?.kind === 'resource') s = step(s, 'resource', []);
    else throw Error('Unexpected regroup choice');
  }
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
  expect(s.lastingEffects.some(e => e.cannotReady)).toBe(false);
});

test('Salvaged discard permission expires at the phase boundary and cannot bypass payment', () => {
  const p = board('every-day--more-lies');
  p.players[0].hand!.push({ card: 'salvaged-blaster', ref: 'blaster' });
  p.players[0].ground = [{ card: ids.marine }];
  const g = scenario(p);
  let s = step(play(g), 'accept-effect', [g.refs.blaster!]);
  s = step(s, 'accept-effect', []);
  s = step(s, 'pass');
  const broke = decodeState(encodeState(s));
  for (const id of broke.players.alice!.resources) broke.cards[id]!.exhausted = true;
  // Rebuild the legal decision from this controlled fixture rather than retaining its stale options.
  broke.execution.decision = null;
  settle(broke);
  expect(opts(broke).some(i => i.kind === 'use-ability' && i.card === g.refs.blaster)).toBe(false);
  s = step(s, 'pass');
  while (s.phase === 'regroup') s = step(s, 'resource', []);
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.blaster)).toBe(false);
});
test('Intimidator may return no resources without creating any Credits', () => {
  const g = scenario(board('intimidator--citadel-overwatch')),
    s = step(play(g), 'accept-effect', []);
  expect(s.players.alice!.resources).toHaveLength(20);
  expect(credits(s)).toBe(0);
});
