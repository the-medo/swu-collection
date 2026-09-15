import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
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
for (const [card, count] of [
  ['bank-job-fugitives', 1],
  ['unmarked-credits', 1],
  ['windfall', 3],
] as const)
  test(`${card}: creates printed Credit quantity`, () => {
    const g = scenario(board(card));
    expect(credits(play(g))).toBe(count);
  });
test('Bib Fortuna checks for another Underworld unit', () => {
  for (const ally of [false, true]) {
    const p = board('bib-fortuna--die-wanna-wanga-');
    if (ally) p.players[0].ground = [{ card: 'artful-pickpocket' }];
    expect(credits(play(scenario(p)))).toBe(ally ? 1 : 0);
  }
});
for (const [card, other] of [
  ['black-sun-cabalist', 'artful-pickpocket'],
  ['profiteering-hunter', ids.marine],
  ['val--it-s-been-a-ride--babe', ids.marine],
] as const)
  test(`${card}: its mandatory play effect targets another friendly unit`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: other, ref: 'ally' }];
    p.players[1].ground = [{ card: other, ref: 'enemy' }];
    const g = scenario(p),
      s = play(g);
    expect(opts(s)).toEqual([{ kind: 'target', card: g.refs.ally! }]);
    const after = target(s, g.refs.ally!);
    if (card === 'profiteering-hunter')
      expect(unitStats(after, after.cards[g.refs.ally!]!)).toEqual({ power: 4, hp: 4 });
    else
      expect(tokens(after, g.refs.ally!, card.startsWith('val--') ? 'shield' : 'experience')).toBe(
        1,
      );
  });
test('Chopper and Jaunty count the actual friendly aspects, including their own', () => {
  for (const card of ['chopper--spectre-three', 'jaunty-light-freighter']) {
    const p = board(card);
    p.players[0].ground = [{ card: ids.marine }, { card: 'artful-pickpocket' }];
    p.players[1].ground = [{ card: 'baze-malbus--good-luck' }];
    const g = scenario(p),
      s = play(g);
    expect(tokens(s, g.refs.source!)).toBe(card.startsWith('chopper') ? 2 : 3);
  }
});
for (const [card, trait, count] of [
  ['syndicate-spice-runner', 'Underworld', 3],
  ['undercity-hunting-team', 'Bounty Hunter', 5],
] as const)
  test(`${card}: search reveals only matching units from the bounded top`, () => {
    const chosen = trait === 'Underworld' ? 'artful-pickpocket' : 'callous-bounty-hunter',
      p = board(card);
    p.players[0].deck = [
      { card: chosen, ref: 'chosen' },
      ...Array.from({ length: count - 1 }, () => ({ card: ids.marine })),
      { card: chosen, ref: 'outside' },
    ];
    const g = scenario(p),
      s = play(g);
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.chosen!]);
    const after = step(s, 'search', [g.refs.chosen!]);
    expect(after.cards[g.refs.chosen!]!.zone).toBe('hand');
    expect(after.cards[g.refs.outside!]!.zone).toBe('deck');
  });
test('Street Gang Recruiter returns an Underworld card, including a non-unit, from discard', () => {
  const p = board('street-gang-recruiter');
  p.players[0].discard = [
    { card: 'artful-pickpocket', ref: 'chosen' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p),
    s = play(g);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.chosen!]);
  const after = step(s, 'accept-effect', [g.refs.chosen!]);
  expect(after.cards[g.refs.chosen!]!.zone).toBe('hand');
});
test('Stockpile resources itself and the deck top exhausted in new hidden incarnations', () => {
  const p = board('stockpile');
  p.players[0].deck = [{ card: ids.fighter, ref: 'top' }];
  const g = scenario(p),
    s = play(g);
  for (const id of [g.refs.source!, g.refs.top!]) {
    expect(s.cards[id]!.zone).toBe('resources');
    expect(s.cards[id]!.exhausted).toBe(true);
    expect(s.cards[id]!.incarnation).toBeGreaterThan(g.state.cards[id]!.incarnation);
  }
  expect(s.players.alice!.resources).toHaveLength(22);
});
test('Shadow Cloaking still gives a Shield when the chosen unit was already ready', () => {
  const p = board('shadow-cloaking');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = target(play(g), g.refs.enemy!);
  expect(tokens(s, g.refs.enemy!, 'shield')).toBe(1);
});
test('Combat Exercise pays through its effect only when the friendly unit actually exhausts', () => {
  for (const exhausted of [false, true]) {
    const p = board('combat-exercise');
    p.players[0].ground = [{ card: ids.marine, ref: 'ally', exhausted }];
    const g = scenario(p),
      s = target(play(g), g.refs.ally!);
    expect(tokens(s, g.refs.ally!)).toBe(exhausted ? 0 : 2);
  }
});
test('Common Cause counts distinct friendly aspects and snapshots the phase bonus', () => {
  const p = board('common-cause');
  p.players[0].ground = [{ card: ids.marine }, { card: 'artful-pickpocket' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = target(play(g), g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.enemy!]!)).toEqual({ power: 6, hp: 10 });
});
test('From a Certain Point of View ignores aspect penalties but pays printed costs', () => {
  const p = board('from-a-certain-point-of-view');
  p.players[0].hand!.push({ card: 'baze-malbus--good-luck', ref: 'nested' });
  const g = scenario(p);
  let s = play(g);
  const before = ready(s);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.nested);
  const d = cardDefinition('baze-malbus--good-luck');
  expect(ready(s)).toBe(before - ('cost' in d ? d.cost : 0));
  expect(s.cards[g.refs.nested!]!.zone).toBe('ground');
});
test('Phantom pays for a Heroism unit and gives the played copy Experience', () => {
  const p = board('phantom--spectre-shuttle');
  p.players[0].hand!.push({ card: ids.marine, ref: 'nested' }, { card: ids.trooper });
  const g = scenario(p);
  let s = play(g);
  expect(
    opts(s)
      .filter(i => i.kind === 'play')
      .map(i => i.card),
  ).toEqual([g.refs.nested!]);
  s = step(s, 'play');
  expect(tokens(s, g.refs.nested!)).toBe(1);
});
for (const [card, method] of [
  ['lady-proxima--where-s-the-money-', 'action'],
  ['criminal-contact', 'attack'],
] as const)
  test(`${card}: Credit creation uses its printed cost`, () => {
    const p = board(card, true);
    const g = scenario(p);
    let s =
      method === 'action'
        ? step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source)
        : attack(g.state, g.refs.source!, g.state.players.bob!.base);
    if (method === 'attack') s = step(s, 'accept-effect');
    expect(credits(s)).toBe(1);
    expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
    expect(ready(s)).toBe(method === 'attack' ? 18 : 20);
  });
test('Bix discards exactly the selected hand card before creating a Credit', () => {
  const p = board('bix-caleen--selling-scrap');
  p.players[0].hand!.push({ card: ids.fighter, ref: 'discard' });
  const g = scenario(p);
  let s = play(g);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(s.cards[g.refs.discard!]!.zone).toBe('discard');
  expect(credits(s)).toBe(1);
});
for (const card of ['bracca-shipbreaker', 'han-s-golden-dice'])
  test(`${card}: attack mills only the deck top and handles odd printed cost`, () => {
    const p = board(card === 'bracca-shipbreaker' ? card : ids.marine, true);
    p.players[0].deck = [
      { card: ids.fighter, ref: 'top' },
      { card: ids.marine, ref: 'second' },
    ];
    if (card !== 'bracca-shipbreaker') p.attachments = [{ card, unit: 'source' }];
    const g = scenario(p),
      s = attack(g.state, g.refs.source!, g.state.players.bob!.base);
    expect(s.cards[g.refs.top!]!.zone).toBe('discard');
    expect(s.cards[g.refs.second!]!.zone).toBe('deck');
    expect(credits(s)).toBe(card === 'bracca-shipbreaker' ? 0 : 1);
  });
for (const [card, selected] of [
  ['daring-delve', ids.trooper],
  ['doctor-aphra--digging-for-answers', 'artful-pickpocket'],
] as const)
  test(`${card}: recovers only a matching card among those just discarded`, () => {
    const inPlay = card.startsWith('doctor'),
      p = board(card, inPlay);
    p.players[0].deck = [
      { card: selected, ref: 'chosen' },
      { card: ids.marine },
      { card: ids.marine },
    ];
    p.players[0].discard = [{ card: selected, ref: 'old' }];
    const g = scenario(p);
    let s = inPlay ? attack(g.state, g.refs.source!, g.state.players.bob!.base) : play(g);
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.chosen!]);
    s = step(s, 'accept-effect', [g.refs.chosen!]);
    expect(s.cards[g.refs.chosen!]!.zone).toBe('hand');
    expect(s.cards[g.refs.old!]!.zone).toBe('discard');
  });
test('Scavenging Sandcrawler moves the selected discard to deck bottom before making a Credit', () => {
  const p = board('scavenging-sandcrawler', true);
  p.players[0].discard = [{ card: ids.fighter, ref: 'chosen' }];
  const g = scenario(p);
  const s = step(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'accept-effect', [
    g.refs.chosen!,
  ]);
  expect(s.players.alice!.deck.at(-1)).toBe(g.refs.chosen!);
  expect(credits(s)).toBe(1);
});
test('Every Day, More Lies lets each hand owner choose their own discard', () => {
  const p = board('every-day--more-lies');
  p.players[0].hand!.push({ card: ids.marine, ref: 'own' });
  p.players[1].hand = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g);
  expect(s.execution.decision!.playerId).toBe('alice');
  s = step(s, 'accept-effect', [g.refs.own!]);
  expect(s.execution.decision!.playerId).toBe('bob');
  s = step(s, 'accept-effect', [g.refs.enemy!]);
  expect(s.cards[g.refs.own!]!.zone).toBe('discard');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
});
test('Two-faced Troig gives control before creating two Credits for its original controller', () => {
  const g = scenario(board('two-faced-troig'));
  const s = mode(play(g), 'give-control');
  expect(s.cards[g.refs.source!]!.controller).toBe('bob');
  expect(credits(s)).toBe(2);
  expect(credits(s, 'bob')).toBe(0);
});
test('Chio Fain may let both players draw, and declining draws neither card', () => {
  for (const take of [false, true]) {
    const g = scenario(board('chio-fain--four-armed-slicer', true));
    const s = mode(
      attack(g.state, g.refs.source!, g.state.players.bob!.base),
      take ? 'both-draw' : 'decline',
    );
    expect(s.players.alice!.hand).toHaveLength(take ? 1 : 0);
    expect(s.players.bob!.hand).toHaveLength(take ? 1 : 0);
  }
});
test('Rickety Quadjumper reveals a non-unit without moving it and offers another unit Experience', () => {
  const p = board('rickety-quadjumper', true);
  p.players[0].deck = [{ card: 'unmarked-credits', ref: 'top' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'reveal-top');
  s = target(s, g.refs.enemy!);
  expect(tokens(s, g.refs.enemy!)).toBe(1);
  expect(s.players.alice!.deck[0]).toBe(g.refs.top!);
});
for (const [card, amount] of [
  ['hidden-hand-supplier', 1],
  ['rookie-rocket-jumper', 1],
] as const)
  test(`${card}: optional resource payment gates its token`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    const g = scenario(p);
    let s = play(g);
    const before = ready(s);
    s = step(s, 'accept-effect');
    if (card === 'hidden-hand-supplier') s = target(s, g.refs.ally!);
    expect(ready(s)).toBe(before - amount);
    expect(
      tokens(
        s,
        card === 'hidden-hand-supplier' ? g.refs.ally! : g.refs.source!,
        card === 'hidden-hand-supplier' ? 'experience' : 'shield',
      ),
    ).toBe(1);
  });
for (const [card, ability] of [
  ['bodhi-rook--creating-a-diversion', 'Sentinel'],
  ['weazel--fighting-back', 'Raid'],
] as const)
  test(`${card}: grants its attack ability to a friendly unit`, () => {
    const p = board(card, true);
    p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
    const g = scenario(p),
      s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.ally!);
    if (ability === 'Raid') expect(effectiveAbilities(s, s.cards[g.refs.ally!]!).raid).toBe(2);
    else expect(effectiveAbilities(s, s.cards[g.refs.ally!]!).keywords).toContain('Sentinel');
  });
test('Enfys Nest helmet grants another unit phase power, including enemy units', () => {
  const p = board(ids.marine, true);
  p.attachments = [{ card: 'enfys-nest-s-helmet', unit: 'source' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.enemy!]!).power).toBe(6);
});
test('Cassian damages the enemy base only after a friendly attacker defeats its defender', () => {
  const p = board('cassian-andor--everything-for-the-rebellion', true);
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.ally!, g.refs.enemy!), g.state.players.bob!.base);
  expect(s.cards[g.state.players.bob!.base]!.damage).toBe(2);
});
test('Chirrut heals another unit after actually dealing base combat damage', () => {
  const p = board('chirrut--mwe--i-don-t-need-luck', true);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally', damage: 5 });
  const g = scenario(p),
    s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.damage).toBe(1);
});
test('Beilert includes his own draw in the phase damage amount', () => {
  const p = board('beilert-valance--target--vader', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.enemy!);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
});
test('Baze reacts to actual healing, once for its entire amount', () => {
  const p = board('shadow-cloaking');
  p.players[0].ground = [{ card: 'baze-malbus--good-luck', ref: 'baze', damage: 3 }];
  p.players[0].hand = [{ card: 'nebulon-c-frigate', ref: 'source' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g);
  s = target(s, g.refs.baze!);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.baze!]!.damage).toBe(0);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
for (const [card, targetCard] of [
  ['asajj-ventress--reluctant-hunter', 'callous-bounty-hunter'],
  ['milodon-rider', ids.marine],
] as const)
  test(`${card}: its optional play effect can affect another eligible unit`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: targetCard, ref: 'ally', exhausted: true }];
    const g = scenario(p),
      s = target(play(g), g.refs.ally!);
    if (card.startsWith('asajj')) expect(s.cards[g.refs.ally!]!.exhausted).toBe(false);
    else expect(s.cards[g.refs.ally!]!.zone).toBe('hand');
  });
for (const [card, damage, exhausted] of [
  ['cutthroat-podracer', 2, true],
  ['ruthless-duo', 2, false],
] as const)
  test(`${card}: applies its gated ground damage`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.trooper }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy', exhausted }];
    const g = scenario(p),
      s = target(play(g), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(damage);
  });
test('Jango exhausts an enemy unit after Shielded makes him upgraded', () => {
  const p = board('jango-fett--wily-mercenary', true);
  p.attachments = [{ card: 'shield', unit: 'source' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});
test('K-2SO may damage only a damaged ground unit during his attack', () => {
  const p = board('k-2so--locking-the-vault', true);
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy', damage: 1 },
    { card: ids.marine, ref: 'fresh' },
  ];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!, g.state.players.bob!.base);
  expect(opts(s)).toContainEqual({ kind: 'target', card: g.refs.enemy! });
  expect(opts(s)).not.toContainEqual({ kind: 'target', card: g.refs.fresh! });
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
});
test('Hounds Tooth checks its surviving source power before defeating a weaker unit', () => {
  const p = board('hound-s-tooth--hunters--approach', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.source!, g.state.players.bob!.base), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
});
test('Industrious Team checks remaining HP rather than printed HP', () => {
  const p = board('industrious-team');
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy', damage: 3 },
    { card: ids.consular, ref: 'healthy' },
  ];
  const g = scenario(p),
    s = play(g);
  expect(opts(s)).not.toContainEqual({ kind: 'target', card: g.refs.healthy! });
  expect(target(s, g.refs.enemy!).cards[g.refs.enemy!]!.zone).toBe('discard');
});
test('Overcharged Transport can defeat an upgrade on a space unit', () => {
  const p = board('overcharged-transport');
  p.players[1].space = [{ card: ids.fighter, ref: 'host' }];
  p.attachments = [{ card: 'experience', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.host!);
  s = target(s, g.refs.upgrade!);
  expect(tokens(s, g.refs.host!)).toBe(0);
});
test('Payroll Heist grants only the units currently controlled a phase Credit trigger', () => {
  const p = board('payroll-heist');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const g = scenario(p);
  let s = play(g);
  s = step(s, 'pass');
  s = attack(s, g.refs.ally!, s.players.bob!.base);
  expect(credits(s)).toBe(1);
});
test('Broken Horn independently checks hand and resource deficits', () => {
  const p = board('broken-horn--vizago-s-pride');
  p.players[1].hand = [{ card: ids.fighter }];
  p.players[1].resources = Array.from({ length: 21 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    s = play(g);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.players.alice!.resources).toHaveLength(21);
  expect(s.cards[s.players.alice!.resources.at(-1)!]!.exhausted).toBe(true);
});
test('Khetanna discounts the next Underworld unit only once', () => {
  const p = board('khetanna--upon-the-dune-sea');
  p.players[0].hand!.push({ card: 'artful-pickpocket', ref: 'nested' });
  const g = scenario(p);
  let s = play(g);
  s = step(s, 'pass');
  const before = ready(s);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.nested);
  const d = cardDefinition('artful-pickpocket');
  expect(ready(s)).toBe(before - ('cost' in d ? d.cost + 1 : 0));
});
test('Watchful privately inspects the chosen deck and may bottom its top', () => {
  const p = board(ids.marine, true);
  p.attachments = [{ card: 'watchful', unit: 'source' }];
  p.players[1].deck = [{ card: ids.fighter, ref: 'top' }, { card: ids.marine }];
  const g = scenario(p);
  let s = mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'look-enemy');
  s = step(s, 'accept-effect', [g.refs.top!]);
  expect(s.players.bob!.deck.at(-1)).toBe(g.refs.top!);
});
for (const card of [
  'scarif-lieutenant',
  'rodian-bondsman',
  'targeted-for-removal',
  'thermal-detonator',
])
  test(`${card}: defeat observes the correct host and controller`, () => {
    const p = board('lost-and-forgotten');
    p.players[1].ground = [
      { card: cardDefinition(card).kind === 'unit' ? card : ids.trooper, ref: 'victim' },
      { card: ids.marine, ref: 'ally' },
    ];
    p.players[0].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (cardDefinition(card).kind === 'upgrade') p.attachments = [{ card, unit: 'victim' }];
    const g = scenario(p);
    let s = target(play(g), g.refs.victim!);
    if (card === 'scarif-lieutenant') {
      s = target(s, g.refs.ally!);
      expect(tokens(s, g.refs.ally!)).toBe(1);
    } else if (card === 'thermal-detonator') expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
    else {
      expect(credits(s)).toBe(1);
      if (card === 'rodian-bondsman') expect(credits(s, 'bob')).toBe(1);
    }
  });
test('Tantive IV and Partisan U-wing observe an earlier friendly defeat in the same phase', () => {
  for (const card of ['tantive-iv--carrying-hope', 'partisan-u-wing']) {
    const p = board(card);
    p.activePlayer = 'bob';
    p.players[0].base.damage = 5;
    p.players[0].ground = [{ card: ids.trooper, ref: 'victim' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.attacker!, g.refs.victim!);
    s = step(s, i => i.kind === 'play' && i.card === g.refs.source);
    if (card === 'partisan-u-wing') expect(credits(s)).toBe(1);
    else expect(s.cards[s.players.alice!.base]!.damage).toBe(1);
  }
});
test('Rhydonium lets both players save a unit before defeating all remaining non-leaders', () => {
  const p = board('rhydonium-detonation');
  p.players[0].ground = [
    { card: ids.marine, ref: 'save' },
    { card: ids.marine, ref: 'die' },
  ];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy' },
    { card: ids.trooper, ref: 'other' },
  ];
  const g = scenario(p);
  let s = target(play(g), g.refs.save!);
  expect(s.execution.decision!.playerId).toBe('bob');
  s = target(s, g.refs.enemy!);
  for (const id of [g.refs.save!, g.refs.enemy!]) expect(s.cards[id]!.zone).toBe('hand');
  for (const id of [g.refs.die!, g.refs.other!]) expect(s.cards[id]!.zone).toBe('discard');
});
test('The Ghost gives one Experience and one Shield to each of up to two distinct units', () => {
  const p = board('the-ghost--home-of-the-spectres');
  p.players[0].ground = [{ card: 'baze-malbus--good-luck', ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = mode(play(g), 'two-units');
  s = step(s, 'accept-effect', [g.refs.ally!, g.refs.enemy!]);
  for (const id of [g.refs.ally!, g.refs.enemy!]) {
    expect(tokens(s, id)).toBe(1);
    expect(tokens(s, id, 'shield')).toBe(1);
  }
});
test('L3 searches ten cards and enforces a combined printed cost budget of five', () => {
  const p = board('l3-37--radical-instigator');
  p.players[0].deck = [
    { card: 'n5-sentry-droid', ref: 'one' },
    { card: 'k-2so--locking-the-vault', ref: 'two' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p),
    s = play(g);
  expect(s.execution.decision!.selection!.budget?.max).toBe(5);
  const after = step(step(s, 'search', [g.refs.one!]), 'play');
  expect(after.cards[g.refs.one!]!.zone).toBe('ground');
  expect(after.cards[g.refs.one!]!.exhausted).toBe(true);
});
test('Staccato Lightning deals one damage to each chosen ground unit', () => {
  const p = board('-staccato-lightning--repeater');
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.consular, ref: 'other' },
  ];
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.source && i.target === g.refs.host,
  );
  s = step(s, 'accept-effect', [g.refs.enemy!, g.refs.other!]);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
  expect(s.cards[g.refs.other!]!.damage).toBe(1);
  expect(s.cards[g.refs.host!]!.damage).toBe(0);
});
test('Attack from All Sides offers five damage only with four distinct friendly aspects', () => {
  const p = board('attack-from-all-sides');
  p.players[0].ground = [
    { card: ids.marine },
    { card: ids.trooper },
    { card: 'artful-pickpocket' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.enemy!);
  expect(opts(s)).toContainEqual({ kind: 'choose-mode', mode: 'deal-five' });
  s = mode(s, 'deal-five');
  expect(s.cards[g.refs.enemy!]!.damage).toBe(5);
  expect(decodeState(encodeState(s))).toEqual(s);
});

test('Cassian can choose the friendly base; Rhydonium lets either player return an enemy unit', () => {
  const p = board('cassian-andor--everything-for-the-rebellion', true);
  p.players[0].ground!.push({ card: ids.marine, ref: 'attacker' });
  p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
  const g = scenario(p),
    s = target(attack(g.state, g.refs.attacker!, g.refs.defender!), g.state.players.alice!.base);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
  const q = board('rhydonium-detonation');
  q.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const h = scenario(q),
    after = target(play(h), h.refs.enemy!);
  expect(after.cards[h.refs.enemy!]!.zone).toBe('hand');
});
test('Rickety reveal cannot create an Experience from an empty deck; a non-unit makes the token mandatory', () => {
  for (const empty of [false, true]) {
    const p = board('rickety-quadjumper', true);
    p.players[0].deck = empty ? [] : [{ card: 'unmarked-credits' }];
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    const g = scenario(p);
    const s = mode(attack(g.state, g.refs.source!, g.state.players.bob!.base), 'reveal-top');
    if (empty) expect(s.execution.decision!.kind).toBe('action');
    else expect(opts(s)).toEqual([{ kind: 'target', card: g.refs.ally! }]);
  }
});
test('L3 plays every searched selection with independent entry abilities and checkpoint recovery', () => {
  const p = board('l3-37--radical-instigator');
  p.players[0].deck = [
    { card: 'n5-sentry-droid', ref: 'one' },
    { card: 'astromech-pilot', ref: 'two' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p);
  let s = step(play(g), 'search', [g.refs.one!, g.refs.two!]);
  s = step(s, i => i.kind === 'play' && i.card === g.refs.one);
  const input = choose(s, 'play'),
    child = Bun.spawnSync(
      [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
      {
        stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
  s = step(s, 'play');
  expect(s.cards[g.refs.one!]!.zone).toBe('ground');
  expect(s.cards[g.refs.two!]!.zone).toBe('ground');
});
