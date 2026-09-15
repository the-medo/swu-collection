import { LocalGame } from '../host/session.ts';
import { prepareDeckSnapshot } from '../admission/decks.ts';
import { config, setup } from './helpers.ts';
import { playCost, initialState } from '../engine/state.ts';
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

function randoms(s: GameState) {
  while (s.execution.random)
    s = advance(s, {
      type: 'random',
      gameId: s.gameId,
      expectedRevision: s.revision,
      requestId: s.execution.random.id,
      values: s.execution.random.bounds.map(() => 0),
    }).state;
  return s;
}
const readyCount = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;

test('Kelleran plays the revealed exact copy from the deck with a discount and no intermediate draw', () => {
  const p = playCard('kelleran-beq--the-sabered-hand');
  p.players[0].deck![0] = { card: ids.trooper, ref: 'found' };
  const s = scenario(p),
    search = step(s.state, 'play');
  resume(search, choose(search, 'search', [s.refs.found!]));
  const choice = randoms(step(search, 'search', [s.refs.found!]));
  expect(choice.searching).toEqual([s.refs.found!]);
  expect(choice.players.alice!.deck).not.toContain(s.refs.found!);
  expect(choice.players.alice!.hand).not.toContain(s.refs.found!);
  expect(
    new Projector(choice.gameId, { role: 'player', playerId: 'alice' })
      .project(choice)
      .decision!.inspectedCards.map(c => c.face.cardId),
  ).toEqual([ids.trooper]);
  expect(
    new Projector(choice.gameId, { role: 'player', playerId: 'bob' }).project(choice).decision,
  ).toBeNull();
  resume(choice, choose(choice, 'play'));
  const done = step(choice, 'play');
  expect(done.cards[s.refs.found!]!.zone).toBe('ground');
  expect(readyCount(done)).toBe(5);
  expect(done.searching).toEqual([]);
  expect(done.facts.some(f => f.type === 'drawn')).toBe(false);
});

test('a searched unit that cannot be paid for returns to the bottom; a failed search reveals nothing', () => {
  const p = playCard('kelleran-beq--the-sabered-hand');
  p.players[0].deck![0] = { card: 'devastator--hunting-the-rebellion', ref: 'expensive' };
  const s = scenario(p),
    search = step(s.state, 'play');
  const done = randoms(step(search, 'search', [s.refs.expensive!]));
  expect(done.searching).toEqual([]);
  expect(done.players.alice!.deck.at(-1)).toBe(s.refs.expensive);
  expect(readyCount(done)).toBe(5);
  const failed = randoms(step(search, 'search'));
  expect(failed.facts.some(f => f.type === 'revealed')).toBe(false);
});

test('Old Daka excludes every Old Daka, and replaying a chosen Night makes a new incarnation', () => {
  const p = playCard('old-daka--oldest-and-wisest');
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'night' }];
  p.players[1].ground = [{ card: 'old-daka--oldest-and-wisest', ref: 'otherDaka' }];
  p.attachments = [{ card: 'shield', unit: 'night', ref: 'shield' }];
  const s = scenario(p),
    pick = step(s.state, 'play');
  expect(
    pick.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: s.refs.night! }]);
  const choice = target(pick, s.refs.night!);
  expect(choice.cards[s.refs.night!]!.zone).toBe('discard');
  resume(choice, choose(choice, 'play'));
  const done = step(choice, 'play');
  expect(done.cards[s.refs.night!]!.incarnation).toBe(2);
  expect(done.cards[s.refs.night!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(readyCount(done)).toBe(3);
});

test('Old Daka cannot play a stolen unit from its opponent owner’s discard pile', () => {
  const p = playCard('old-daka--oldest-and-wisest');
  p.players[1].ground = [
    { card: 'merrin--alone-with-the-dead', ref: 'stolen', controller: 'alice' },
  ];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.stolen!);
  expect(choice.players.bob!.discard).toContain(s.refs.stolen!);
  expect(choice.execution.decision!.playerId).toBe('bob');
  expect(choice.cards[s.refs.stolen!]!.zone).toBe('discard');
});

test('Salvage pays for a Vehicle from discard and damages it before its Shielded trigger resolves', () => {
  const p = playCard('salvage');
  p.players[0].discard = [
    { card: 'black-sun-patroller', ref: 'vehicle' },
    { card: ids.marine, ref: 'notVehicle' },
  ];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'play', card: s.refs.vehicle! },
  ]);
  resume(choice, choose(choice, 'play'));
  const done = step(choice, 'play');
  expect(done.cards[s.refs.vehicle!]!.damage).toBe(1);
  expect(upgrades(done, s.refs.vehicle!)).toEqual(['shield']);
  expect(readyCount(done)).toBe(6);
  expect(done.cards[s.refs.notVehicle!]!.zone).toBe('discard');
});

test('Mastery checks affordability for each unique host before offering the upgrade', () => {
  const p = playCard('mastery');
  p.players[0].base = { card: 'colossus' };
  p.players[0].resources = resources().slice(0, 3);
  p.players[0].ground = [
    { card: 'neel--the-cutest-boy', ref: 'unique' },
    { card: ids.marine, ref: 'normal' },
  ];
  const s = scenario(p),
    options = s.state.execution.decision!.options.filter(o => o.intent.kind === 'play');
  expect(options.map(o => o.intent)).toEqual([
    { kind: 'play', card: s.refs.played!, target: s.refs.unique! },
  ]);
  const done = step(s.state, 'play');
  expect(readyCount(done)).toBe(0);
  expect(unitStats(done, done.cards[s.refs.unique!]!)).toMatchObject({ power: 4, hp: 7 });
});

test('GNK discounts the next unit only, excludes Piloting and expires at phase end', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].ground = [{ card: 'gnk-power-droid', ref: 'gnk' }];
  p.players[0].hand = [
    { card: ids.marine, ref: 'unit' },
    { card: 'resupply', ref: 'event' },
    { card: 'clone-pilot', ref: 'pilot' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  const s = scenario(p),
    attacked = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.gnk &&
        i.defender === s.state.players.bob!.base,
    );
  expect(playCost(attacked, attacked.cards[s.refs.unit!]!)).toBe(1);
  expect(playCost(attacked, attacked.cards[s.refs.pilot!]!, 0, 'piloting')).toBe(2);
  const turn = step(attacked, 'pass'),
    played = step(turn, i => i.kind === 'play' && i.card === s.refs.unit);
  expect(played.playModifiers).toEqual([]);
  expect(readyCount(played)).toBe(11);
  expect(nextRound(attacked).playModifiers).toEqual([]);
});

test('Honor Bound Partisan damages a chosen base and grants a discount when defeated', () => {
  const p = playCard('honor-bound-partisan');
  p.players[0].hand!.push(
    { card: 'no-glory--only-results', ref: 'kill' },
    { card: ids.marine, ref: 'unit' },
  );
  const s = scenario(p),
    done = target(
      step(s.state, i => i.kind === 'play' && i.card === s.refs.played),
      s.state.players.bob!.base,
    );
  expect(done.cards[done.players.bob!.base]!.damage).toBe(1);
  const killed = target(
    step(step(done, 'pass'), i => i.kind === 'play' && i.card === s.refs.kill),
    s.refs.played!,
  );
  expect(killed.cards[s.refs.played!]!.zone).toBe('discard');
  expect(playCost(killed, killed.cards[s.refs.unit!]!)).toBe(1);
});

test('Neel uses the printed-power erratum and the next matching unit enters ready', () => {
  const p = playCard('neel--the-cutest-boy');
  p.players[0].hand!.push(
    { card: ids.marine, ref: 'large' },
    { card: 'academy-graduate', ref: 'small' },
  );
  const s = scenario(p),
    neel = step(s.state, i => i.kind === 'play' && i.card === s.refs.played);
  expect(neel.playModifiers).toHaveLength(1);
  const large = step(step(neel, 'pass'), i => i.kind === 'play' && i.card === s.refs.large);
  expect(large.cards[s.refs.large!]!.exhausted).toBe(true);
  expect(large.playModifiers).toHaveLength(1);
  const small = step(step(large, 'pass'), i => i.kind === 'play' && i.card === s.refs.small);
  expect(small.cards[s.refs.small!]!.exhausted).toBe(false);
  expect(small.playModifiers).toEqual([]);
});

test('Krennic discounts only the first qualifying unit each round, including earlier plays before he entered', () => {
  const p = playCard('director-krennic--on-the-verge-of-greatness');
  p.players[0].hand!.push(
    { card: 'superlaser-technician', ref: 'first' },
    { card: 'superlaser-technician', ref: 'second' },
  );
  const s = scenario(p),
    krennic = step(s.state, i => i.kind === 'play' && i.card === s.refs.played);
  expect(upgrades(krennic, s.refs.played!)).toEqual(['shield']);
  expect(playCost(krennic, krennic.cards[s.refs.first!]!)).toBe(4);
  const first = step(step(krennic, 'pass'), i => i.kind === 'play' && i.card === s.refs.first);
  expect(playCost(first, first.cards[s.refs.second!]!)).toBe(5);
  expect(playCost(nextRound(first), first.cards[s.refs.second!]!)).toBe(4);
  const q = playCard('director-krennic--on-the-verge-of-greatness');
  q.players[0].hand!.push(
    { card: 'superlaser-technician', ref: 'first' },
    { card: 'superlaser-technician', ref: 'second' },
  );
  q.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  const t = scenario(q),
    before = step(t.state, i => i.kind === 'play' && i.card === t.refs.first),
    late = step(step(before, 'pass'), i => i.kind === 'play' && i.card === t.refs.played);
  expect(playCost(late, late.cards[t.refs.second!]!)).toBe(5);
});

test('Piett has separate leader and unit cost reductions, with hidden-hand failure allowed', () => {
  const p = position();
  p.players[0].leader = { card: 'admiral-piett--commanding-the-armada', ref: 'leader' };
  p.players[0].resources = resources();
  p.players[0].hand = [
    { card: 'battlefield-marine', ref: 'wrong' },
    { card: 'ravager--final-imperial-command', ref: 'capital' },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'command-capital-ship');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'play', card: s.refs.capital! },
    { kind: 'decline-effect' },
  ]);
  resume(choice, choose(choice, 'play'));
  expect(readyCount(step(choice, 'play'))).toBe(4);
  const deployed = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(playCost(deployed, deployed.cards[s.refs.capital!]!)).toBe(7);
  expect(deployed.cards[s.refs.leader!]!.deployedAs).toBe('unit');
});

test('Colossus draws five in the starting and mulligan hands without changing the opponent', () => {
  const c = config();
  c.players[0].base = 'colossus';
  const game = new LocalGame(c, () => 0);
  let s = game.submit(choose(game.state, i => i.kind === 'initiative' && i.playerId === 'alice'));
  expect(s.players.alice!.hand).toHaveLength(5);
  expect(s.players.bob!.hand).toHaveLength(6);
  s = game.submit(choose(s, i => i.kind === 'mulligan' && i.take));
  expect(s.players.alice!.hand).toHaveLength(5);
  expect(s.players.bob!.hand).toHaveLength(6);
});

test('Data Vault raises the practice deck minimum in both engine and SWUBASE admission', () => {
  const c = config();
  c.players[0].base = 'data-vault';
  c.players[0].deck = [{ cardId: ids.marine, quantity: 15 }];
  expect(() => initialState(c)).toThrow();
  c.players[0].deck[0]!.quantity = 16;
  expect(() => initialState(c)).not.toThrow();
  const raw = {
    source: { deckId: '11111111-1111-4111-8111-111111111111', format: 1, kind: 'normal' },
    base: 'data-vault',
    leader: ids.leader,
    leader2: null,
    mainboard: [{ cardId: ids.marine, quantity: 15 }],
    sideboard: [],
    reserve: [],
  };
  const catalog = {
    'data-vault': { type: 'Base' },
    [ids.leader]: { type: 'Leader' },
    [ids.marine]: { type: 'Unit' },
  };
  expect(prepareDeckSnapshot(raw, catalog, 'core-practice').ok).toBe(false);
  raw.mainboard[0]!.quantity = 16;
  expect(prepareDeckSnapshot(raw, catalog, 'core-practice').ok).toBe(true);
});

test('two next-unit discounts stack, remain after the sources leave and are consumed together', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].ground = [
    { card: 'gnk-power-droid', ref: 'first' },
    { card: 'gnk-power-droid', ref: 'second' },
  ];
  p.players[0].hand = [
    { card: 'no-glory--only-results', ref: 'kill' },
    { card: ids.marine, ref: 'unit' },
  ];
  const s = scenario(p),
    first = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.first &&
        i.defender === s.state.players.bob!.base,
    ),
    second = step(
      step(first, 'pass'),
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.second &&
        i.defender === s.state.players.bob!.base,
    );
  expect(second.playModifiers).toHaveLength(2);
  expect(playCost(second, second.cards[s.refs.unit!]!)).toBe(0);
  const killed = target(
    step(step(second, 'pass'), i => i.kind === 'play' && i.card === s.refs.kill),
    s.refs.first!,
  );
  expect(killed.cards[s.refs.first!]!.zone).toBe('discard');
  expect(killed.playModifiers).toHaveLength(2);
  const turn = step(killed, 'pass');
  resume(
    turn,
    choose(turn, i => i.kind === 'play' && i.card === s.refs.unit),
  );
  const done = step(turn, i => i.kind === 'play' && i.card === s.refs.unit);
  expect(done.playModifiers).toEqual([]);
  expect(readyCount(done)).toBe(readyCount(turn));
});

test('selected search recovery rejects an orphaned card and never exposes the unchosen cards', () => {
  const p = playCard('kelleran-beq--the-sabered-hand');
  p.players[0].deck![0] = { card: ids.trooper, ref: 'chosen' };
  const s = scenario(p),
    choice = randoms(step(step(s.state, 'play'), 'search', [s.refs.chosen!]));
  const q = structuredClone(p);
  q.players[0].deck![1] = { card: ids.consular };
  const t = scenario(q),
    other = randoms(step(step(t.state, 'play'), 'search', [t.refs.chosen!]));
  const viewer = { role: 'player' as const, playerId: 'bob' },
    secret = 'search privacy comparison secret 1234';
  expect(new Projector(choice.gameId, viewer, secret).project(choice)).toEqual(
    new Projector(other.gameId, viewer, secret).project(other),
  );
  const corrupt = structuredClone(choice);
  corrupt.execution.frames = corrupt.execution.frames.filter(
    f => f.kind !== 'finish-searched-play',
  );
  expect(() => decodeState(encodeState(corrupt))).toThrow('Invalid selected search cards');
});
