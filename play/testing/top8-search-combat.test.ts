import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { credits, readyResourceCount } from '../engine/credits.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
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
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
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
function trigger(s: GameState, abilityId: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === abilityId)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function regroup(s: GameState) {
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

function triggers(s: GameState) {
  for (let n = 0; n < 15 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
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
function targets(s: GameState) {
  return s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
}

test('Home One discounts only with at least three opposing space units, then offers Ambush', () => {
  for (const count of [2, 3]) {
    const p = playFixture('home-one--on-my-mark');
    p.players[0].leader.card = 'lando-calrissian--full-sabacc';
    p.players[0].space = [{ card: ids.fighter }];
    p.players[1].space = Array.from({ length: count }, () => ({ card: ids.fighter }));
    const g = scenario(p),
      played = step(g.state, 'play');
    expect(readyResourceCount(played, 'alice')).toBe(20 - (count === 3 ? 6 : 9));
    expect(targets(played)).toEqual(
      played.space.filter(id => played.cards[id]!.controller === 'bob'),
    );
    const combat = target(played, targets(played)[0]!);
    expect(combat.cards[g.refs.played!]!.exhausted).toBe(true);
    expect(combat.players.bob!.discard).toHaveLength(1);
  }
});

test('Codebreaker searches only Gambits in the top eight and discounts the first Gambit each round', () => {
  const p = playFixture('the-master-codebreaker--high-stakes');
  p.players[0].leader.card = 'lando-calrissian--full-sabacc';
  p.players[0].deck = [
    { card: 'faith-in-your-friends', ref: 'gambit' },
    ...Array.from({ length: 7 }, () => ({ card: ids.marine })),
    { card: 'faith-in-your-friends', ref: 'ninth' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.gambit!]);
  const searched = randomize(step(pending, 'search', [g.refs.gambit!]));
  expect(
    searched.facts.some(
      f => f.type === 'revealed' && f.cards.some(c => c.instanceId === g.refs.gambit),
    ),
  ).toBe(true);
  const played = step(step(searched, 'pass'), 'play');
  expect(readyResourceCount(played, 'alice')).toBe(17);
  let done = randomize(step(played, 'search', []));
  if (done.execution.decision!.kind !== 'action') done = step(done, 'decline-effect');
  // The next copy has no discount; a new action phase resets the first-per-round allowance.
  const copy = playFixture('faith-in-your-friends');
  copy.players[0].leader.card = p.players[0].leader.card;
  copy.players[0].ground = [{ card: 'the-master-codebreaker--high-stakes', ref: 'breaker' }];
  copy.players[0].hand!.push(
    { card: 'faith-in-your-friends', ref: 'second' },
    { card: 'faith-in-your-friends', ref: 'third' },
  );
  const c = scenario(copy);
  let first = randomize(
    step(
      step(c.state, i => i.kind === 'play' && i.card === c.refs.played),
      'search',
      [],
    ),
  );
  if (first.execution.decision!.kind !== 'action') first = step(first, 'decline-effect');
  const second = step(step(first, 'pass'), 'play');
  expect(readyResourceCount(second, 'alice')).toBe(17);
  let secondDone = randomize(step(second, 'search', []));
  if (secondDone.execution.decision!.kind !== 'action')
    secondDone = step(secondDone, 'decline-effect');
  const nextRound = regroup(secondDone);
  const third = step(nextRound, i => i.kind === 'play' && i.card === c.refs.third);
  expect(readyResourceCount(nextRound, 'alice') - readyResourceCount(third, 'alice')).toBe(1);
});

test('Putting a Team Together searches units with any listed aspect, excluding pure Command, events, and the ninth card', () => {
  const p = playFixture('putting-a-team-together');
  p.players[0].deck = [
    { card: ids.marine, ref: 'command' },
    { card: ids.consular, ref: 'vigilance' },
    { card: ids.trooper, ref: 'aggression' },
    { card: 'the-master-codebreaker--high-stakes', ref: 'cunning' },
    { card: 'open-fire', ref: 'event' },
    ...Array.from({ length: 3 }, () => ({ card: ids.fighter })),
    { card: ids.consular, ref: 'ninth' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.selection!.cards).toEqual([
    g.refs.vigilance!,
    g.refs.aggression!,
    g.refs.cunning!,
  ]);
  expect(() => step(pending, 'search', [g.refs.event!])).toThrow();
  expect(randomize(step(pending, 'search', [g.refs.cunning!])).players.alice!.hand).toEqual([
    g.refs.cunning!,
  ]);
});

test('Faith keeps the drawn identity private; search failure still permits the separate Disclose ability', () => {
  for (const find of [false, true]) {
    const p = playFixture('faith-in-your-friends');
    p.players[0].hand!.push(
      ...Array.from({ length: 3 }, () => ({ card: 'faith-in-your-friends' })),
    );
    p.players[0].deck = [
      { card: 'hold-them-off', ref: 'secret' },
      { card: ids.marine },
      { card: ids.fighter },
    ];
    const g = scenario(p),
      pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
    resume(pending, choose(pending, 'search', find ? [g.refs.secret!] : []));
    const disclosed = randomize(step(pending, 'search', find ? [g.refs.secret!] : []));
    expect(disclosed.facts.some(f => f.type === 'revealed')).toBe(false);
    for (const viewer of [
      { role: 'spectator' } as const,
      { role: 'player', playerId: 'bob' } as const,
    ]) {
      expect(
        JSON.stringify(new Projector(disclosed.gameId, viewer).project(disclosed)),
      ).not.toContain('hold-them-off');
    }
    const selected = disclosed.players.alice!.hand.filter(
      id => disclosed.cards[id]!.cardId === 'faith-in-your-friends',
    );
    const after = step(disclosed, 'accept-effect', selected);
    expect(tokens(after, 'spy')).toHaveLength(2);
    expect(after.cards[g.refs.secret!]!.zone).toBe(find ? 'hand' : 'deck');
  }
});

test('4-LOM can attack with an exhausted Hunter, including itself, but cannot attack a base', () => {
  const p = playFixture('4-lom--devious');
  p.players[0].ground = [
    { card: 'target-tagger', ref: 'hunter', exhausted: true },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(targets(pending)).toEqual([g.refs.hunter!, g.refs.played!]);
  for (const attacker of [g.refs.hunter!, g.refs.played!]) {
    const selected = target(pending, attacker);
    expect(selected.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'attack', attacker, defender: g.refs.enemy! },
    ]);
    resume(selected, choose(selected, 'attack'));
    const after = step(selected, 'attack');
    expect(after.cards[g.refs.enemy!]!.damage).toBe(attacker === g.refs.hunter ? 3 : 4);
    expect(after.cards[attacker]!.exhausted).toBe(true);
  }
  p.players[1].ground = [];
  const none = scenario(p),
    noTarget = step(none.state, 'play');
  expect(targets(noTarget)).toEqual([]);
});

test('Target Tagger adds two power only for a ready Hunter, and excludes its newly played exhausted self', () => {
  for (const hunter of [false, true]) {
    const p = playFixture('target-tagger');
    p.players[0].ground = [
      { card: hunter ? '4-lom--devious' : ids.marine, ref: 'attacker' },
      { card: 'target-tagger', ref: 'exhausted', exhausted: true },
    ];
    const g = scenario(p),
      pending = step(g.state, 'play');
    expect(targets(pending)).toEqual([g.refs.attacker!]);
    const after = attack(
      target(pending, g.refs.attacker!),
      g.refs.attacker!,
      g.state.players.bob!.base,
    );
    expect(after.cards[g.state.players.bob!.base]!.damage).toBe(hunter ? 6 : 3);
    expect(unitStats(after, after.cards[g.refs.attacker!]!).power).toBe(hunter ? 4 : 3);
  }
});

test('Tandem waits through the complete space attack and its end triggers before offering a ground attack', () => {
  const p = playFixture('tandem-assault');
  p.players[0].space = [{ card: 'blockade-runner', ref: 'space' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  const g = scenario(p),
    pending = attack(
      target(step(g.state, 'play'), g.refs.space!),
      g.refs.space!,
      g.state.players.bob!.base,
    );
  expect(pending.cards[g.state.players.bob!.base]!.damage).toBe(4);
  expect(pending.cards[g.refs.ground!]!.exhausted).toBe(false);
  const second = step(pending, 'decline-effect');
  expect(second.attacks).toHaveLength(0);
  resume(second, choose(second, 'attack'));
  const after = attack(second, g.refs.ground!, g.state.players.bob!.base);
  expect(after.cards[g.state.players.bob!.base]!.damage).toBe(9);
  expect(after.cards[g.refs.ground!]!.exhausted).toBe(true);
});

test('Tandem gives no ground attack if no space attack occurred', () => {
  const p = playFixture('tandem-assault');
  p.players[0].space = [{ card: ids.fighter, exhausted: true }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  const g = scenario(p),
    after = step(g.state, 'play');
  expect(after.execution.decision!.playerId).toBe('bob');
  expect(after.cards[g.refs.ground!]!.exhausted).toBe(false);
});

test('Hold Them Off allocates all current power in the selected unit arena with that exact unit as damage source', () => {
  const p = playFixture('hold-them-off');
  p.players[0].ground = [{ card: ids.marine, ref: 'source' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.attachments = [{ card: 'experience', unit: 'source' }];
  const g = scenario(p),
    pending = target(step(g.state, 'play'), g.refs.source!);
  expect(pending.execution.decision!.selection!.min).toBe(4);
  expect(pending.execution.decision!.selection!.cards).not.toContain(g.refs.space!);
  expect(() => step(pending, 'accept-effect', [g.refs.one!])).toThrow();
  const input = choose(pending, 'accept-effect', [
    g.refs.one!,
    g.refs.one!,
    g.refs.two!,
    g.refs.two!,
  ]);
  resume(pending, input);
  const after = advance(pending, input).state;
  expect(after.cards[g.refs.one!]!.damage).toBe(2);
  expect(after.cards[g.refs.two!]!.damage).toBe(2);
  expect(after.facts.filter(f => f.type === 'damage')).toHaveLength(2);
  expect(
    after.facts
      .filter(f => f.type === 'damage')
      .every(f => f.cards.some(c => c.instanceId === g.refs.source)),
  ).toBe(true);
});

test('Loth-Wolf defends with Sentinel but never offers normal or mandatory granted attacks', () => {
  for (const event of ['trust-your-instincts', 'masterstroke', 'commence-the-festivities']) {
    const p = playFixture(event);
    p.players[0].force = true;
    p.players[0].ground = [
      { card: 'loth-wolf', ref: 'wolf' },
      { card: ids.marine, ref: 'marine' },
    ];
    const g = scenario(p);
    expect(
      g.state.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.attacker === g.refs.wolf,
      ),
    ).toBe(false);
    let pending = step(g.state, 'play');
    if (event === 'trust-your-instincts') pending = step(pending, 'accept-effect');
    expect(targets(pending)).toEqual([g.refs.marine!]);
  }
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'loth-wolf', ref: 'wolf' }, { card: ids.marine }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.filter(o => o.intent.kind === 'attack').map(o => o.intent),
  ).toEqual([{ kind: 'attack', attacker: g.refs.attacker!, defender: g.refs.wolf! }]);
  expect(attack(g.state, g.refs.attacker!, g.refs.wolf!).cards[g.refs.attacker!]!.zone).toBe(
    'discard',
  );
});

test('Traya readies either non-unit leader, may decline, and excludes deployed leaders', () => {
  const p = position();
  p.players[0].ground = [{ card: 'darth-traya--lord-of-betrayal', ref: 'traya' }];
  p.players[0].leader.exhausted = true;
  p.players[1].leader.exhausted = true;
  const g = scenario(p),
    pending = attack(g.state, g.refs.traya!, g.state.players.bob!.base);
  expect(targets(pending)).toEqual([g.state.players.alice!.leader, g.state.players.bob!.leader]);
  for (const player of ['alice', 'bob'])
    expect(
      target(pending, g.state.players[player]!.leader).cards[g.state.players[player]!.leader]!
        .exhausted,
    ).toBe(false);
  expect(step(pending, 'decline-effect').cards[g.state.players.alice!.leader]!.exhausted).toBe(
    true,
  );
  p.players[1].leader.deployedAs = 'unit';
  const d = scenario(p),
    deployed = attack(d.state, d.refs.traya!, d.state.players.bob!.base);
  expect(targets(deployed)).toEqual([d.state.players.alice!.leader]);
});

test('Backed by the Hutts counts the newly created Credit and remaining existing Credits for optional unit damage', () => {
  const p = playFixture('backed-by-the-hutts');
  p.players[0].credits = ['credit-a', 'credit-b'];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  // Keep both existing Credits rather than spending them on this play.
  const payment = step(g.state, 'play');
  const pending =
    payment.execution.frames[0]?.kind === 'credit-payment'
      ? step(payment, 'accept-effect', [])
      : payment;
  expect(credits(pending, 'alice')).toHaveLength(3);
  expect(target(pending, g.refs.target!).cards[g.refs.target!]!.damage).toBe(3);
  expect(step(pending, 'decline-effect').cards[g.refs.target!]!.damage).toBe(0);
});

test('The Wrong Ride selects two opposing resources, including already exhausted ones, and preserves the other ready resource', () => {
  const p = playFixture('the-wrong-ride');
  p.players[1].resources = [
    { card: ids.marine, ref: 'spent', exhausted: true },
    { card: ids.marine, ref: 'ready' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.playerId).toBe('alice');
  expect(pending.execution.decision!.selection).toEqual({
    cards: [g.refs.spent!, g.refs.ready!, g.refs.other!],
    min: 2,
    max: 2,
  });
  const after = step(pending, 'accept-effect', [g.refs.spent!, g.refs.ready!]);
  expect(after.cards[g.refs.ready!]!.exhausted).toBe(true);
  expect(after.cards[g.refs.other!]!.exhausted).toBe(false);
});

test('Evil is Everywhere counts every friendly unit Villainy icon, excluding leaders on their non-unit face and upgrades', () => {
  const p = playFixture('evil-is-everywhere');
  p.players[0].leader.card = 'boba-fett--krayt-s-claw-commander';
  p.players[0].space = [{ card: ids.fighter }, { card: ids.fighter }];
  p.players[0].ground = [{ card: ids.trooper }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'cheap' },
    { card: ids.consular, ref: 'expensive' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(targets(pending)).toContain(g.refs.cheap!);
  expect(targets(pending)).not.toContain(g.refs.expensive!);
  expect(target(pending, g.refs.cheap!).cards[g.refs.cheap!]!.zone).toBe('discard');
});

test('Helgait may distribute its last-known upgraded power exactly, with atomic rejection and recovery, or decline entirely', () => {
  const p = playFixture('get-lost');
  p.players[0].ground = [
    { card: 'helgait--dooku-was-a-visionary', ref: 'helgait' },
    { card: ids.marine, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  p.attachments = [{ card: 'experience', unit: 'helgait' }];
  const g = scenario(p),
    mode = target(step(g.state, 'play'), g.refs.helgait!);
  const pending = step(mode, i => i.kind === 'choose-mode' && i.mode === 'distribute');
  expect(pending.execution.decision!.selection!.min).toBe(7);
  expect(pending.execution.decision!.selection!.max).toBe(7);
  expect(() => step(pending, 'accept-effect', [g.refs.one!])).toThrow();
  const input = choose(pending, 'accept-effect', [g.refs.one!, ...Array(6).fill(g.refs.two!)]);
  resume(pending, input);
  const after = advance(pending, input).state;
  expect(upgrades(after, g.refs.one!)).toHaveLength(1);
  expect(upgrades(after, g.refs.two!)).toHaveLength(6);
  expect(
    upgrades(
      step(mode, i => i.kind === 'choose-mode' && i.mode === 'decline'),
      g.refs.one!,
    ),
  ).toEqual([]);
});

test('Dismantle captures all selected enemies within the shared remaining-HP budget and rejects invalid selections atomically', () => {
  const p = playFixture('dismantle-the-conspiracy');
  p.players[0].ground = [{ card: ids.marine, ref: 'guard' }];
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].ground = [
    { card: ids.consular, ref: 'one', damage: 3 },
    { card: ids.marine, ref: 'two' },
    { card: ids.consular, ref: 'large' },
  ];
  const g = scenario(p),
    pending = target(step(g.state, 'play'), g.refs.guard!);
  const encoded = encodeState(pending);
  for (const bad of [
    [g.refs.one!, g.refs.large!],
    [g.refs.one!, g.refs.one!],
    [g.state.players.bob!.leader],
    [g.refs.guard!],
  ])
    expect(() => step(pending, 'accept-effect', bad)).toThrow();
  expect(encodeState(pending)).toBe(encoded);
  const input = choose(pending, 'accept-effect', [g.refs.one!, g.refs.two!]);
  resume(pending, input);
  const after = advance(pending, input).state;
  for (const id of [g.refs.one!, g.refs.two!]) {
    expect(after.cards[id]!.zone).toBe('captured');
    expect(after.cards[id]!.capturedBy!.instanceId).toBe(g.refs.guard!);
  }
  expect(after.cards[g.refs.large!]!.zone).toBe('ground');
});

test('Loth-Wolf cannot take a supported attack after receiving its bonus; ability loss removes the restriction', () => {
  const p = position();
  p.players[0].space = [{ card: 't-6-shuttle-1974--with-a-mentor-s-dedication', ref: 'support' }];
  p.players[0].ground = [{ card: 'loth-wolf', ref: 'wolf' }];
  const g = scenario(p),
    pending = target(
      step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.support),
      g.refs.wolf!,
    );
  expect(pending.execution.decision!.kind).toBe('action');
  expect(pending.cards[g.refs.wolf!]!.exhausted).toBe(false);
  expect(unitStats(pending, pending.cards[g.refs.wolf!]!).power).toBe(5);
  const n = playFixture('galen-erso--you-ll-never-win');
  n.players[1].ground = [{ card: 'loth-wolf', ref: 'wolf' }];
  const named = scenario(n),
    naming = step(named.state, 'play');
  const input = { ...choose(naming, 'accept-effect'), namedCardId: 'loth-wolf' };
  const after = advance(naming, input).state;
  expect(effectiveAbilities(after, after.cards[named.refs.wolf!]!).cannotAttack).toBe(false);
  expect(
    after.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.attacker === named.refs.wolf,
    ),
  ).toBe(true);
});
