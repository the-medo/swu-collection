import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function randomize(s: GameState) {
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  }).state;
}
function pilot(s: GameState, card: string, host: string) {
  return step(
    s,
    i => i.kind === 'play' && i.card === card && i.target === host && i.piloting === 'piloting',
  );
}
const profundity = 'profundity--we-fight-';
const luthen = 'luthen-s-haulcraft--countermeasures-armed';
const boshek = 'boshek--charismatic-smuggler';
const night = 'reanimated-night-trooper';
const will = 'the-will-of-the-force';
const shuttle = 'inspector-s-shuttle';
const ebon = 'ebon-hawk--cause-and-effect';
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const play = (s: GameState, id: string) =>
  step(s, i => i.kind === 'play' && i.card === id && !i.piloting);
const nameInput = (s: GameState, namedCardId: string) => ({
  ...choose(s, 'accept-effect'),
  namedCardId,
});

test('Profundity compares hand counts after the first discard and stops on a tie', () => {
  for (const count of [2, 3]) {
    const p = playFixture(profundity);
    p.players[0].hand!.push({ card: ids.marine, ref: 'held' });
    p.players[1].hand = Array.from({ length: count }, (_, i) => ({
      card: ids.fighter,
      ref: 'enemy-' + i,
    }));
    const g = scenario(p);
    let s = mode(play(g.state, g.refs.played!), 'enemy');
    expect(s.execution.decision!.playerId).toBe('bob');
    s = step(s, 'accept-effect', [g.refs['enemy-0']!]);
    if (count === 3) {
      expect(s.execution.decision!.playerId).toBe('bob');
      resume(s, choose(s, 'accept-effect', [g.refs['enemy-1']!]));
      s = step(s, 'accept-effect', [g.refs['enemy-1']!]);
    }
    expect(s.players.bob!.hand).toHaveLength(1);
    expect(s.players.alice!.hand).toHaveLength(1);
    expect(s.players.bob!.discard).toHaveLength(count - 1);
  }
});

test('Profundity can choose itself and its defeat ability belongs to the controller at defeat', () => {
  const p = playFixture(profundity);
  p.players[0].hand!.push({ card: ids.marine, ref: 'own' });
  const g = scenario(p);
  let s = mode(play(g.state, g.refs.played!), 'self');
  s = step(s, 'accept-effect', [g.refs.own!]);
  expect(s.players.alice!.hand).toHaveLength(0);
  const q = playFixture('open-fire');
  q.players[1].space = [{ card: profundity, ref: 'ship', damage: 6, controller: 'alice' }];
  q.players[1].hand = [{ card: ids.fighter, ref: 'discard' }];
  const h = scenario(q);
  s = target(play(h.state, h.refs.played!), h.refs.ship!);
  expect(s.execution.decision!.playerId).toBe('alice');
  s = mode(s, 'enemy');
  s = step(s, 'accept-effect', [h.refs.discard!]);
  expect(s.players.bob!.discard).toContain(h.refs.ship!);
});

test('Luthen discloses before the opponent chooses two simultaneous discards, with private remaining hand', () => {
  const p = playFixture('open-fire');
  p.players[0].space = [{ card: luthen, ref: 'ship' }];
  p.players[0].hand!.push(
    { card: 'open-fire', ref: 'agg' },
    { card: ids.trooper, ref: 'agg-two' },
    { card: ids.marine, ref: 'hero' },
  );
  p.players[1].hand = [
    { card: ids.fighter, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
    { card: ids.consular, ref: 'secret' },
  ];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.played!), g.refs.ship!);
  s = step(s, 'accept-effect', [g.refs.agg!, g.refs['agg-two']!, g.refs.hero!]);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(s.execution.decision!.selection).toMatchObject({ min: 2, max: 2 });
  expect(() => step(s, 'accept-effect', [g.refs.one!])).toThrow();
  expect(s.players.bob!.discard).toHaveLength(0);
  const view = (state: GameState) =>
    new Projector(state.gameId, { role: 'player', playerId: 'alice' }, 'x'.repeat(32)).project(
      state,
    );
  const changed = structuredClone(s);
  changed.cards[g.refs.secret!]!.cardId = 'independent-smuggler';
  const frame = changed.execution.frames[0]!;
  if (frame.kind === 'zone-inspection')
    frame.cards.find(c => c.instanceId === g.refs.secret)!.cardId = 'independent-smuggler';
  expect(view(changed)).toEqual(view(s));
  resume(s, choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]));
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(s.players.bob!.hand).toEqual([g.refs.secret!]);
  expect(s.players.bob!.discard).toEqual([g.refs.one!, g.refs.two!]);
  expect(s.phaseHistory.ownCardsDiscarded).toContain('bob');
  const facts = s.facts.filter(e => e.type === 'discarded' && e.actor === 'bob');
  expect(facts).toHaveLength(1);
  expect(facts[0]!.amount).toBe(2);
});

test('Luthen discards as much as possible from a one-card hand and may decline the disclosure', () => {
  for (const disclose of [true, false]) {
    const p = playFixture('open-fire');
    p.players[0].space = [{ card: luthen, ref: 'ship' }];
    p.players[0].hand!.push(
      { card: 'open-fire', ref: 'agg' },
      { card: ids.trooper, ref: 'agg-two' },
      { card: ids.marine, ref: 'hero' },
    );
    p.players[1].hand = [{ card: ids.fighter, ref: 'one' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.played!), g.refs.ship!);
    if (disclose) {
      s = step(s, 'accept-effect', [g.refs.agg!, g.refs['agg-two']!, g.refs.hero!]);
      expect(s.execution.decision!.selection).toMatchObject({ min: 1, max: 1 });
      s = step(s, 'accept-effect', [g.refs.one!]);
    } else s = step(s, 'decline-effect');
    expect(s.players.bob!.hand).toHaveLength(disclose ? 0 : 1);
  }
});

test('BoShek as a Pilot discards two cards then returns only the odd printed costs', () => {
  for (const zero of [false, true]) {
    const p = playFixture(boshek);
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[0].deck = [
      { card: zero ? 'salvage' : ids.marine, ref: 'even' },
      { card: ids.fighter, ref: 'odd' },
    ];
    const g = scenario(p);
    const s = pilot(g.state, g.refs.played!, g.refs.host!);
    expect(s.players.alice!.hand).toEqual([g.refs.odd!]);
    expect(s.players.alice!.discard).toEqual([g.refs.even!]);
    expect(s.players.alice!.deck).toHaveLength(0);
    expect(unitStats(s, s.cards[g.refs.host!]!)).toMatchObject({ power: 3, hp: 3 });
    expect(s.phaseHistory.ownCardsDiscarded).toContain('alice');
  }
});

test('BoShek can return two odd cards or resolve a short deck, while his unit face does not mill', () => {
  for (const count of [0, 1, 2]) {
    const p = playFixture(boshek);
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[0].deck = Array.from({ length: count }, (_, i) => ({
      card: ids.fighter,
      ref: 'odd-' + i,
    }));
    const g = scenario(p);
    const s = pilot(g.state, g.refs.played!, g.refs.host!);
    expect(s.players.alice!.hand).toHaveLength(count);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
  }
  const p = playFixture(boshek);
  const g = scenario(p);
  const s = play(g.state, g.refs.played!);
  expect(s.players.alice!.deck).toHaveLength(12);
  expect(s.players.alice!.discard).toHaveLength(0);
});

test('Night Trooper privately looks at either deck and can discard or keep its top card', () => {
  for (const owner of ['self', 'enemy'])
    for (const discard of [true, false]) {
      const p = playFixture('open-fire');
      p.players[0].ground = [{ card: night, ref: 'trooper' }];
      p.players[0].deck = [{ card: ids.marine, ref: 'own-top' }];
      p.players[1].deck = [{ card: ids.fighter, ref: 'enemy-top' }];
      const g = scenario(p);
      let s = mode(target(play(g.state, g.refs.played!), g.refs.trooper!), owner);
      const id = owner === 'self' ? g.refs['own-top']! : g.refs['enemy-top']!;
      expect(s.execution.decision!.playerId).toBe('alice');
      const view = new Projector(
        s.gameId,
        { role: 'player', playerId: 'alice' },
        'x'.repeat(32),
      ).project(s);
      expect(view.decision!.inspectedCards).toHaveLength(1);
      expect(
        new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'x'.repeat(32)).project(s)
          .decision,
      ).toBeNull();
      resume(s, choose(s, 'accept-effect', discard ? [id] : []));
      s = step(s, 'accept-effect', discard ? [id] : []);
      expect(s.cards[id]!.zone).toBe(discard ? 'discard' : 'deck');
    }
});

test('Night Trooper inspection checkpoints verify the deck owner and do not trigger opposing Podracer', () => {
  const p = playFixture('open-fire');
  p.players[0].ground = [{ card: night, ref: 'trooper' }];
  p.players[1].ground = [
    { card: 'sebulba-s-podracer--taking-the-lead', ref: 'pod', exhausted: true },
  ];
  const g = scenario(p);
  let s = mode(target(play(g.state, g.refs.played!), g.refs.trooper!), 'enemy');
  const changed = structuredClone(s);
  const f = changed.execution.frames[0]!;
  if (f.kind === 'arrange-deck') f.owner = 'alice';
  expect(() => decodeState(encodeState(changed))).toThrow();
  s = step(s, 'accept-effect', [s.players.bob!.deck[0]!]);
  expect(s.cards[g.refs.pod!]!.exhausted).toBe(true);
  expect(s.roundHistory.triggerUses).toHaveLength(0);
});

test('The Will of the Force returns a unit, then the server randomly discards from its owner hand', () => {
  const p = playFixture(will);
  p.players[0].force = true;
  p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  p.players[1].hand = [{ card: ids.fighter, ref: 'held' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.played!), g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.zone).toBe('hand');
  s = step(s, 'accept-effect');
  expect(s.execution.random!.bounds).toEqual([2]);
  expect(forceToken(s, 'alice')).toBeUndefined();
  for (const index of [0, 1]) {
    const input = {
      type: 'random' as const,
      gameId: s.gameId,
      expectedRevision: s.revision,
      requestId: s.execution.random!.id,
      values: [index],
    };
    resume(s, input);
    const done = advance(s, input).state;
    expect(done.players.bob!.discard).toEqual([index === 0 ? g.refs.held! : g.refs.unit!]);
    expect(done.players.bob!.hand).toHaveLength(1);
  }
});

test('The Will of the Force follows ownership of a stolen unit and can decline the Force use', () => {
  for (const useForce of [true, false]) {
    const p = playFixture(will);
    p.players[0].force = true;
    p.players[1].ground = [{ card: ids.marine, ref: 'unit', controller: 'alice' }];
    p.players[1].hand = [{ card: ids.fighter }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.played!), g.refs.unit!);
    s = step(s, useForce ? 'accept-effect' : 'decline-effect');
    if (useForce) {
      expect(s.execution.frames[0]).toMatchObject({
        kind: 'random-discard',
        owner: 'bob',
        playerId: 'alice',
      });
      s = randomize(s);
    }
    expect(s.players.bob!.hand).toHaveLength(useForce ? 1 : 2);
    expect(!!forceToken(s, 'alice')).toBe(!useForce);
  }
});

test('random discard checkpoints retain the exact hand without exposing its identities to the other player', () => {
  const p = playFixture(will);
  p.players[0].force = true;
  p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  p.players[1].hand = [{ card: ids.fighter, ref: 'secret' }];
  const g = scenario(p);
  const s = step(target(play(g.state, g.refs.played!), g.refs.unit!), 'accept-effect');
  const changed = structuredClone(s);
  changed.cards[g.refs.secret!]!.cardId = 'independent-smuggler';
  const f = changed.execution.frames[0]!;
  if (f.kind === 'random-discard')
    f.cards.find(c => c.instanceId === g.refs.secret)!.cardId = 'independent-smuggler';
  const view = (state: GameState) =>
    new Projector(state.gameId, { role: 'player', playerId: 'alice' }, 'x'.repeat(32)).project(
      state,
    );
  expect(view(changed)).toEqual(view(s));
  expect(() => decodeState(encodeState(changed))).not.toThrow();
  const broken = structuredClone(s);
  broken.players.bob!.hand.reverse();
  expect(() => decodeState(encodeState(broken))).toThrow();
});

test('Inspector Shuttle names titles without subtitles and publicly reveals the complete opposing hand', () => {
  const p = playFixture(shuttle);
  p.players[1].hand = [
    { card: 'sabine-wren--spectre-five', ref: 'one' },
    { card: 'sabine-wren--i-learned-the-hard-way', ref: 'two' },
    { card: ids.fighter, ref: 'other' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.played!);
  resume(s, nameInput(s, 'sabine-wren--spectre-five'));
  s = advance(s, nameInput(s, 'sabine-wren--spectre-five')).state;
  expect(upgrades(s, g.refs.played!)).toEqual(['experience', 'experience']);
  const view = new Projector(s.gameId, { role: 'spectator' }, 'x'.repeat(32)).project(s);
  const reveal = view.events.find(e => e.type === 'revealed');
  expect(reveal?.cards.map(c => c.cardId)).toEqual([
    'sabine-wren--spectre-five',
    'sabine-wren--i-learned-the-hard-way',
    ids.fighter,
  ]);
  expect(s.players.bob!.hand).toHaveLength(3);
});

test('Inspector Shuttle can name an absent card without gaining Experience', () => {
  const p = playFixture(shuttle);
  p.players[1].hand = [{ card: ids.fighter }];
  const g = scenario(p);
  const s = play(g.state, g.refs.played!);
  const done = advance(s, nameInput(s, ids.marine)).state;
  expect(upgrades(done, g.refs.played!)).toHaveLength(0);
});

test('Ebon Hawk can disclose either aspect, both, or neither with attack-only modifiers', () => {
  for (const choice of ['heroism', 'villainy', 'both', 'decline']) {
    const p = playFixture(ids.marine);
    p.players[0].hand = [
      { card: ids.marine, ref: 'hero' },
      { card: ids.fighter, ref: 'vill' },
    ];
    p.players[0].space = [{ card: ebon, ref: 'hawk' }];
    p.players[1].space = [{ card: 'blockade-runner', ref: 'defender' }];
    const g = scenario(p);
    let s = mode(attack(g.state, g.refs.hawk!, g.refs.defender!), choice);
    if (choice !== 'decline') {
      const selected =
        choice === 'both'
          ? [g.refs.hero!, g.refs.vill!]
          : [choice === 'heroism' ? g.refs.hero! : g.refs.vill!];
      resume(s, choose(s, 'accept-effect', selected));
      s = step(s, 'accept-effect', selected);
    }
    const hero = choice === 'both' || choice === 'heroism',
      vill = choice === 'both' || choice === 'villainy';
    expect(s.cards[g.refs.hawk!]!.zone).toBe(vill ? 'space' : 'discard');
    expect(s.cards[g.refs.defender!]!.zone).toBe(hero ? 'discard' : 'space');
    if (vill) expect(unitStats(s, s.cards[g.refs.hawk!]!).power).toBe(3);
    if (!hero) expect(unitStats(s, s.cards[g.refs.defender!]!).power).toBe(4);
  }
});

test('chosen card payment checkpoints reject an injected legacy cost target', () => {
  const p = position();
  p.players[0].leader = { card: 'chewbacca--hero-of-kessel' };
  p.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  const g = scenario(p);
  const s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'break-free');
  const frame = s.execution.frames[0]!;
  if (frame.kind !== 'ability-payment' || frame.intent.kind !== 'use-ability')
    throw new Error('Expected chosen cost');
  frame.intent.costTarget = s.players.alice!.resources[0]!;
  expect(() => decodeState(encodeState(s))).toThrow('Unavailable ability activation');
});
