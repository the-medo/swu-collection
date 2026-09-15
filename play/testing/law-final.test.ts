import { cardTraits } from '../engine/attributes.ts';
import { numericValue } from '../engine/values.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { printedUnitStats } from '../engine/printed-stats.ts';
import { move } from '../engine/state.ts';
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
  while (
    (s.execution.decision?.kind === 'trigger' &&
      !(s.execution.frames[0]?.kind === 'trigger-batch' && s.execution.frames[0].chooseAny)) ||
    s.execution.random
  ) {
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
function finishRegroup(s: GameState) {
  while (s.phase === 'regroup') {
    if (opts(s).some(i => i.kind === 'delayed')) s = step(s, 'delayed');
    else if (s.execution.decision!.kind === 'resource') s = step(s, 'resource', []);
    else throw Error('Unexpected regroup decision');
  }
  return s;
}
const refresh = (s: GameState) => {
  s.execution.decision = null;
  settle(s);
  return s;
};
const use = (s: GameState, id: string, action?: string) =>
  step(
    s,
    i => i.kind === 'use-ability' && i.card === id && (!action || i.abilityId.endsWith(action)),
  );
const snipe = (s: GameState, host: string, victim: string) => target(use(s, host, 'snipe'), victim);
const obi = 'obi-wan-kenobi--protector-of-felucia';
const rifle = 'adventurer-sniper-rifle';
const hunter = 'hunter-for-hire';
const hondo = 'hondo-ohnaka--plays-by-his-own-rules';
const fire = 'fire-across-the-galaxy';
const ship = 'vermillion--qi-ra-s-auction-house';

test('Adventurer replaces printed HP before upgrades and grants its action only to a non-Vehicle host', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'gunner' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'victim' },
    { card: ids.marine, ref: 'damaged', damage: 1 },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.attachments = [
    { card: rifle, unit: 'gunner' },
    { card: 'experience', unit: 'victim' },
  ];
  const g = scenario(p);
  let s = use(g.state, g.refs.gunner!, 'snipe');
  const targets = opts(s)
    .filter(i => i.kind === 'target')
    .map(i => i.card);
  expect(targets).toContain(g.refs.victim!);
  expect(targets).not.toContain(g.refs.damaged!);
  expect(targets).not.toContain(g.refs.space!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.victim),
  );
  s = target(s, g.refs.victim!);
  expect(s.cards[g.refs.gunner!]!.exhausted).toBe(true);
  expect(printedUnitStats(s, s.cards[g.refs.victim!]!).hp).toBe(1);
  expect(unitStats(s, s.cards[g.refs.victim!]!).hp).toBe(2);
  expect(
    numericValue(
      s,
      { source: s.cards[g.refs.victim!]! },
      { kind: 'printed-stat', target: 'source', stat: 'hp' },
    ),
  ).toBe(1);
  s = finishRegroup(step(step(s, 'pass'), 'pass'));
  expect(unitStats(s, s.cards[g.refs.victim!]!).hp).toBe(8);
  const invalid = position();
  invalid.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  invalid.attachments = [{ card: rifle, unit: 'vehicle' }];
  expect(() => scenario(invalid)).toThrow();
});
test('Obi-Wan and Sniper respect latest activation, reactivation, upgrade bonuses and immutable stat reads', () => {
  const p = position();
  p.players[0].ground = [
    { card: obi, ref: 'obi' },
    ...Array.from({ length: 6 }, (_, n) => ({ card: ids.marine, ref: `unit${n}` })),
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'gunner' }];
  p.attachments = [
    { card: rifle, unit: 'gunner' },
    { card: 'experience', unit: 'unit0' },
  ];
  const g = scenario(p);
  let s = step(g.state, 'pass');
  expect(unitStats(s, s.cards[g.refs.unit0!]!)).toEqual({ power: 8, hp: 8 });
  s = snipe(s, g.refs.gunner!, g.refs.unit0!);
  expect(unitStats(s, s.cards[g.refs.unit0!]!)).toEqual({ power: 8, hp: 2 });
  const prior = encodeState(s);
  expect(printedUnitStats(s, s.cards[g.refs.unit0!]!)).toEqual({ power: 7, hp: 1 });
  expect(encodeState(s)).toBe(prior);
  move(s, s.cards[g.refs.unit5!]!, 'hand');
  refresh(s);
  expect(unitStats(s, s.cards[g.refs.unit0!]!)).toEqual({ power: 4, hp: 2 });
  move(s, s.cards[g.refs.unit5!]!, 'ground');
  refresh(s);
  expect(unitStats(s, s.cards[g.refs.unit0!]!)).toEqual({ power: 8, hp: 8 });
  expect(decodeState(encodeState(s))).toEqual(s);
  resume(s, choose(s, 'pass'));
});
test('Obi-Wans external printed replacement survives recipient ability loss and ends when his own ability is lost', () => {
  const p = position();
  p.players[0].ground = [
    { card: obi, ref: 'obi' },
    ...Array.from({ length: 6 }, (_, n) => ({ card: ids.marine, ref: `u${n}` })),
  ];
  const g = scenario(p),
    s = g.state;
  modifyUnit(s, s.cards[g.refs.obi!]!, s.cards[g.refs.u0!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  refresh(s);
  expect(unitStats(s, s.cards[g.refs.u0!]!)).toEqual({ power: 7, hp: 7 });
  modifyUnit(s, s.cards[g.refs.u0!]!, s.cards[g.refs.obi!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  refresh(s);
  expect(unitStats(s, s.cards[g.refs.u0!]!)).toEqual({ power: 3, hp: 3 });
  expect(s.printedStatActivations).toEqual([]);
});
test('Departures retain replaced printed stats while a new incarnation returns to its normal profile', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'gunner' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  p.attachments = [{ card: rifle, unit: 'gunner' }];
  const g = scenario(p),
    s = snipe(g.state, g.refs.gunner!, g.refs.victim!);
  const old = structuredClone(s.cards[g.refs.victim!]!);
  move(s, s.cards[g.refs.victim!]!, 'hand');
  move(s, s.cards[g.refs.victim!]!, 'ground');
  refresh(s);
  expect(
    numericValue(s, { source: old }, { kind: 'printed-stat', target: 'source', stat: 'hp' }),
  ).toBe(1);
  expect(printedUnitStats(s, s.cards[g.refs.victim!]!).hp).toBe(7);
});
test('Malakili grants Underworld by control in play and by ownership to hidden faces and out-of-play Creatures', () => {
  const p = board('malakili--keeper-of-the-menagerie', true);
  for (const zone of ['hand', 'deck', 'discard', 'resources', 'ground'] as const) {
    p.players[0][zone] ??= [];
    p.players[0][zone]!.push({ card: 'womp-rat', ref: zone });
  }
  p.players[1].ground = [{ card: 'womp-rat', ref: 'enemy' }];
  const g = scenario(p),
    s = g.state;
  for (const zone of ['hand', 'deck', 'discard', 'resources', 'ground'])
    expect(cardTraits(s, s.cards[g.refs[zone]!]!)).toContain('Underworld');
  expect(cardTraits(s, s.cards[g.refs.enemy!]!)).not.toContain('Underworld');
  const creature = s.cards[g.refs.ground!]!;
  creature.controller = 'bob';
  refresh(s);
  expect(cardTraits(s, creature)).not.toContain('Underworld');
  move(s, creature, 'hand');
  refresh(s);
  expect(cardTraits(s, creature)).toContain('Underworld');
  move(s, s.cards[g.refs.source!]!, 'hand');
  refresh(s);
  expect(cardTraits(s, creature)).not.toContain('Underworld');
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('Malakilis hidden trait grant participates in Underworld deck searches without revealing other cards', () => {
  const p = board('malakili--keeper-of-the-menagerie', true);
  p.players[0].ground!.push({ card: 'maz-kanata--where-s-my-boyfriend-', ref: 'maz' });
  p.players[0].deck = [
    { card: 'womp-rat', ref: 'rat' },
    ...Array.from({ length: 7 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p),
    s = attack(g.state, g.refs.maz!, g.state.players.bob!.base);
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.rat!);
  const view = new Projector(s.gameId, { role: 'spectator' }, 'a'.repeat(32)).project(s);
  expect(JSON.stringify(view)).not.toContain('womp-rat');
  resume(s, choose(s, 'search', [g.refs.rat!]));
});
for (const first of ['alice', 'bob'])
  test(`Hunter lets ${first} pay their own Credit before control changes and the other player can hire it back`, () => {
    const p = board(hunter, true);
    p.players[0].credits = ['a'];
    p.players[1].credits = ['b'];
    const g = scenario(p);
    let s = first === 'alice' ? g.state : step(g.state, 'pass');
    s = use(s, g.refs.source!);
    expect(s.execution.decision!.playerId).toBe(first);
    expect(s.execution.decision!.selection!.cards).toEqual([
      g.refs[first === 'alice' ? 'a' : 'b']!,
    ]);
    resume(s, choose(s, 'accept-effect', [g.refs[first === 'alice' ? 'a' : 'b']!]));
    s = step(s, 'accept-effect', [g.refs[first === 'alice' ? 'a' : 'b']!]);
    expect(s.cards[g.refs.source!]!.controller).toBe(first);
    expect(credits(s, first)).toBe(0);
    const other = first === 'alice' ? 'bob' : 'alice';
    s = use(s, g.refs.source!);
    s = step(s, 'accept-effect', [g.refs[other === 'alice' ? 'a' : 'b']!]);
    expect(s.cards[g.refs.source!]!.controller).toBe(other);
    expect(s.cards[g.refs.source!]!.owner).toBe('alice');
    expect(credits(s, other)).toBe(0);
  });
test('Hunter cannot be hired using resources, opposing Credits, Force, or an Experience token', () => {
  const p = board(hunter, true);
  p.players[0].credits = ['a'];
  p.players[1].force = true;
  p.players[1].ground = [{ card: ids.marine, ref: 'other' }];
  p.attachments = [{ card: 'experience', unit: 'other' }];
  const g = scenario(p),
    s = step(g.state, 'pass');
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.source)).toBe(false);
});
test('Hondo privately exposes only his controllers current top and pays its normal cost once per round', () => {
  const p = board(hondo, true);
  p.players[0].deck = [
    { card: ids.marine, ref: 'top' },
    { card: ids.consular, ref: 'second' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p);
  let s = g.state;
  const own = new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'a'.repeat(32));
  expect(own.project(s).privateDeckTop!.face.cardId).toBe(ids.marine);
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const)
    expect(new Projector(s.gameId, viewer, 'a'.repeat(32)).project(s).privateDeckTop).toBeNull();
  s = use(s, g.refs.source!);
  const before = ready(s),
    cost = playCost(s, s.cards[g.refs.top!]!);
  expect(own.project(s).decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine]);
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(ready(s)).toBe(before - cost);
  expect(s.cards[g.refs.top!]!.zone).toBe('ground');
  expect(own.project(s).privateDeckTop!.face.cardId).toBe(ids.consular);
  s = step(s, 'pass');
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.source)).toBe(false);
  s = finishRegroup(step(s, 'pass'));
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.source)).toBe(true);
});
test('Hondo cannot consume its limit for an empty deck, unaffordable card or upgrade without a host', () => {
  for (const variant of ['empty', 'cost', 'host']) {
    const p = board(hondo, true);
    p.players[0].deck =
      variant === 'empty' ? [] : [{ card: variant === 'host' ? 'knight-s-saber' : ids.consular }];
    p.players[0].resources =
      variant === 'host' ? Array.from({ length: 20 }, () => ({ card: ids.marine })) : [];
    const g = scenario(p);
    expect(opts(g.state).some(i => i.kind === 'use-ability' && i.card === g.refs.source)).toBe(
      false,
    );
  }
});
test('Hondos look permission disappears with ability loss and cannot expose other hidden order through spectator views', () => {
  const p = board(hondo, true);
  p.players[0].deck = [{ card: ids.marine }, { card: ids.consular }];
  const g = scenario(p),
    s = g.state;
  const opponentView = (s: GameState) =>
    new Projector(s.gameId, { role: 'spectator', showRevealedHands: true }, 'a'.repeat(32)).project(
      s,
    );
  const before = opponentView(s);
  const other = structuredClone(s);
  other.players.alice!.deck.reverse();
  expect(opponentView(other)).toEqual(before);
  modifyUnit(s, s.cards[g.refs.source!]!, s.cards[g.refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  refresh(s);
  expect(
    new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'a'.repeat(32)).project(s)
      .privateDeckTop,
  ).toBeNull();
  expect(opts(s).some(i => i.kind === 'use-ability' && i.card === g.refs.source)).toBe(false);
});
const chooseTrigger = (s: GameState, source: string) =>
  step(s, i => {
    const f = s.execution.frames[0];
    return (
      i.kind === 'trigger' &&
      f?.kind === 'trigger-batch' &&
      f.triggers.some(t => t.id === i.triggerId && t.source.instanceId === source)
    );
  });
test('Fire offers only explicit friendly Spectre When Played abilities, each at most once, and permits stopping', () => {
  const p = board(fire);
  p.players[0].ground = [
    { card: 'chopper--spectre-three', ref: 'chopper' },
    { card: 'sabine-wren--spectre-five', ref: 'sabine' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: 'kanan-jarrus--spectre-one', ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g);
  const frame = s.execution.frames[0]!;
  expect(frame.kind).toBe('trigger-batch');
  if (frame.kind !== 'trigger-batch') throw Error();
  expect(frame.triggers.map(t => t.abilityId)).not.toContain('ambush');
  expect(frame.triggers.map(t => t.source.instanceId).sort()).toEqual(
    [g.refs.chopper!, g.refs.sabine!].sort(),
  );
  resume(s, choose(s, 'decline-effect'));
  s = chooseTrigger(s, g.refs.chopper!);
  expect(tokens(s, g.refs.chopper!)).toBe(2);
  const remaining = s.execution.frames[0]!;
  expect(
    remaining.kind === 'trigger-batch' && remaining.triggers.map(t => t.source.instanceId),
  ).toEqual([g.refs.sabine!]);
  s = step(s, 'decline-effect');
  expect(s.execution.decision!.kind).toBe('action');
});
test('Fire completes nested play and entry abilities before returning to its remaining pool', () => {
  const p = board(fire);
  p.players[0].ground = [{ card: 'chopper--spectre-three', ref: 'chopper' }];
  p.players[0].space = [{ card: 'phantom--spectre-shuttle', ref: 'phantom' }];
  p.players[0].hand!.push({ card: 'kanan-jarrus--spectre-one', ref: 'kanan' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = chooseTrigger(play(g), g.refs.phantom!);
  s = step(s, 'play');
  expect(s.execution.decision!.kind).toBe('effect');
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
  const pool = s.execution.frames[0]!;
  expect(pool.kind === 'trigger-batch' && pool.triggers.map(t => t.source.instanceId)).toEqual([
    g.refs.chopper!,
  ]);
  resume(s, choose(s, 'trigger'));
  s = chooseTrigger(s, g.refs.chopper!);
  expect(tokens(s, g.refs.kanan!)).toBe(1);
  expect(tokens(s, g.refs.chopper!)).toBe(2);
});
for (const deck of ['your-deck', 'opponent-deck'])
  for (const player of ['play-yourself', 'opponent-plays'])
    test(`Vermillion reveals ${deck}, lets ${player} play free, and compensates the other player`, () => {
      const p = board(ship, true);
      p.players[0].deck = [{ card: ids.marine, ref: 'a-top' }, { card: ids.consular }];
      p.players[1].deck = [{ card: ids.marine, ref: 'b-top' }, { card: ids.consular }];
      const g = scenario(p);
      let s = mode(mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), deck), player);
      const chosen = deck === 'your-deck' ? g.refs['a-top']! : g.refs['b-top']!,
        actor = player === 'play-yourself' ? 'alice' : 'bob',
        owner = deck === 'your-deck' ? 'alice' : 'bob';
      expect(s.execution.decision!.playerId).toBe(actor);
      const before = s.players[actor]!.resources.filter(id => !s.cards[id]!.exhausted).length;
      resume(s, choose(s, 'play'));
      s = step(s, 'play');
      expect(s.cards[chosen]!).toMatchObject({ zone: 'ground', controller: actor, owner });
      expect(s.players[actor]!.resources.filter(id => !s.cards[id]!.exhausted).length).toBe(before);
      expect(credits(s, actor === 'alice' ? 'bob' : 'alice')).toBe(2);
      expect(credits(s, actor)).toBe(0);
      expect(
        s.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
      ).toContain(chosen);
    });
test('Vermillion permits declining the revealed card without creating Credits', () => {
  const p = board(ship, true);
  p.players[1].deck = [{ card: ids.marine, ref: 'top' }];
  const g = scenario(p);
  const s = step(
    mode(
      mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'opponent-deck'),
      'play-yourself',
    ),
    'decline-effect',
  );
  expect(s.cards[g.refs.top!]!.zone).toBe('deck');
  expect(credits(s) + credits(s, 'bob')).toBe(0);
});
test('Vermillion can play a foreign event and an upgrade while keeping their owner and resolving choices for the chosen player', () => {
  for (const card of ['open-fire', 'academy-training']) {
    const p = board(ship, true);
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.players[1].deck = [{ card, ref: 'top' }];
    const g = scenario(p);
    let s = mode(
      mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'opponent-deck'),
      'play-yourself',
    );
    s = step(s, i => i.kind === 'play' && (card === 'open-fire' || i.target === g.refs.host));
    if (card === 'open-fire') {
      expect(s.execution.decision!.playerId).toBe('alice');
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
      expect(s.players.bob!.discard).toContain(g.refs.top!);
    } else {
      expect(s.cards[g.refs.top!]!.attachedTo?.instanceId).toBe(g.refs.host);
      expect(s.cards[g.refs.top!]!.controller).toBe('alice');
    }
    expect(s.cards[g.refs.top!]!.owner).toBe('bob');
    expect(credits(s, 'bob')).toBe(cardDefinition(card).kind === 'event' ? 3 : 2);
  }
});
test('Vermillion does not offer a reveal after combat defeats it, and empty decks create no Credits', () => {
  const p = board(ship, true),
    d = cardDefinition(ship);
  if (d.kind !== 'unit') throw Error();
  p.players[0].space![0]!.damage = d.hp - 1;
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p);
  const s = attack(g.state, g.refs.source!, g.refs.enemy!);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(opts(s).some(i => i.kind === 'choose-mode')).toBe(false);
  const empty = board(ship, true);
  empty.players[1].deck = [];
  const h = scenario(empty);
  let e = mode(
    mode(attack(h.state, h.refs.source!, h.state.players.bob!.base), 'opponent-deck'),
    'opponent-plays',
  );
  if (opts(e).some(i => i.kind === 'decline-effect')) e = step(e, 'decline-effect');
  expect(credits(e) + credits(e, 'bob')).toBe(0);
  expect(opts(e).some(i => i.kind === 'play')).toBe(false);
});
