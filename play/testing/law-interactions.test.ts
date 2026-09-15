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
function finishRegroup(s: GameState) {
  while (s.phase === 'regroup') {
    if (opts(s).some(i => i.kind === 'delayed')) s = step(s, 'delayed');
    else if (s.execution.decision!.kind === 'resource') s = step(s, 'resource', []);
    else throw Error('Unexpected regroup decision');
  }
  return s;
}
test('Double Cross exchanges both units and compensates the recipient of the cheaper one', () => {
  for (const expensiveFriendly of [false, true]) {
    const p = board('double-cross');
    p.players[0].ground = [{ card: expensiveFriendly ? ids.consular : ids.marine, ref: 'first' }];
    p.players[1].ground = [{ card: expensiveFriendly ? ids.marine : ids.consular, ref: 'second' }];
    const g = scenario(p);
    let s = target(play(g), g.refs.first!);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.second),
    );
    s = target(s, g.refs.second!);
    expect(s.cards[g.refs.first!]!.controller).toBe('bob');
    expect(s.cards[g.refs.second!]!.controller).toBe('alice');
    const a = cardDefinition(ids.consular),
      b = cardDefinition(ids.marine);
    expect(credits(s, expensiveFriendly ? 'alice' : 'bob')).toBe(
      ('cost' in a ? a.cost : 0) - ('cost' in b ? b.cost : 0),
    );
    expect(credits(s, expensiveFriendly ? 'bob' : 'alice')).toBe(0);
  }
});
test('Cad defeats only the selected friendly Credits and gains that much Experience before combat', () => {
  const p = board('cad-bane--now-it-s-my-turn', true);
  p.players[0].credits = ['coin1', 'coin2', 'coin3'];
  p.players[1].credits = ['enemy-coin'];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!, g.state.players.bob!.base);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs['enemy-coin']!);
  resume(s, choose(s, 'accept-effect', [g.refs.coin1!, g.refs.coin2!]));
  s = step(s, 'accept-effect', [g.refs.coin1!, g.refs.coin2!]);
  expect(credits(s)).toBe(1);
  expect(credits(s, 'bob')).toBe(1);
  expect(tokens(s, g.refs.source!)).toBe(2);
  const d = cardDefinition('cad-bane--now-it-s-my-turn');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(d.kind === 'unit' ? d.power + 2 : 0);
});
for (const amount of [0, 2, 5])
  test(`Choke assigns ${amount} damage to one unit and heals only damage actually dealt when it survives`, () => {
    const p = board('choke-on-aspirations');
    p.players[0].base.damage = 8;
    p.players[0].ground = [
      { card: ids.consular, ref: 'unit' },
      { card: ids.marine, ref: 'other' },
    ];
    const g = scenario(p);
    let s = target(play(g), g.refs.unit!);
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.unit!]);
    s = step(
      s,
      'accept-effect',
      Array.from({ length: amount }, () => g.refs.unit!),
    );
    expect(s.cards[g.refs.unit!]!.damage).toBe(amount);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(8 - amount);
  });
test('Choke heals nothing after a Shield prevents its damage or its target is defeated', () => {
  for (const shield of [false, true]) {
    const p = board('choke-on-aspirations');
    p.players[0].base.damage = 8;
    p.players[0].ground = [{ card: shield ? ids.consular : ids.marine, ref: 'unit' }];
    if (shield)
      p.attachments = [
        { card: 'shield', unit: 'unit', ref: 'one' },
        { card: 'shield', unit: 'unit', ref: 'two' },
      ];
    const g = scenario(p);
    let s = target(play(g), g.refs.unit!);
    s = step(
      s,
      'accept-effect',
      Array.from({ length: 5 }, () => g.refs.unit!),
    );
    if (shield) {
      resume(
        s,
        choose(s, i => i.kind === 'target' && i.card === g.refs.two),
      );
      s = target(s, g.refs.two!);
    }
    expect(s.cards[s.players.alice!.base]!.damage).toBe(8);
    expect(s.cards[g.refs.unit!]!.zone).toBe(shield ? 'ground' : 'discard');
  }
});
test('Defiant Hammerhead waits for all attack-end triggers before its scheduled defeat', () => {
  const p = board('defiant-hammerhead', true);
  p.players[0].ground = [{ card: 'cassian-andor--everything-for-the-rebellion' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'defender' }];
  const g = scenario(p);
  let s = mode(attack(g.state, g.refs.source!, g.refs.defender!), 'boost-and-defeat');
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(s.cards[g.refs.source!]!.zone).toBe('space');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === s.players.bob!.base),
  );
  s = target(s, s.players.bob!.base);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
});
test('Defiant cannot take the boost against a base and may decline it against a unit', () => {
  const p = board('defiant-hammerhead', true);
  p.players[1].space = [{ card: ids.fighter, ref: 'defender' }];
  const g = scenario(p);
  expect(attack(g.state, g.refs.source!, g.state.players.bob!.base).execution.decision!.kind).toBe(
    'action',
  );
  const s = mode(attack(g.state, g.refs.source!, g.refs.defender!), 'decline');
  expect(s.cards[g.refs.source!]!.zone).toBe('space');
});
test('Display Piece puts a defeated stolen unit into its controllers resources while retaining ownership', () => {
  const p = board('display-piece');
  p.players[0].hand!.push({ card: 'you-hold-this', ref: 'give' });
  p.players[0].ground = [{ card: ids.marine, ref: 'gift' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'other' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'play' && i.card === g.refs.give);
  s = target(target(s, g.refs.gift!), g.refs.other!);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.source);
  s = target(s, g.refs.gift!);
  expect(s.cards[g.refs.gift!]!).toMatchObject({
    zone: 'resources',
    owner: 'alice',
    controller: 'bob',
    exhausted: true,
    damage: 0,
  });
  expect(s.players.bob!.resources).toContain(g.refs.gift!);
  expect(s.players.alice!.resources).not.toContain(g.refs.gift!);
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('Rio gives the bounced cards owner a free replay of that exact copy with Shielded', () => {
  const p = board('rio-durant--beckett-s-right-hands');
  p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  p.players[1].hand = [{ card: ids.marine, ref: 'other-copy' }];
  const g = scenario(p);
  let s = target(play(g), g.refs.unit!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(
    opts(s)
      .filter(i => i.kind === 'play')
      .map(i => i.card),
  ).toEqual([g.refs.unit!]);
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.cards[g.refs.unit!]!.controller).toBe('bob');
  expect(tokens(s, g.refs.unit!, 'shield')).toBe(1);
  expect(s.cards[g.refs['other-copy']!]!.zone).toBe('hand');
});
test('Rio permits its owner to keep the returned card in hand instead', () => {
  const p = board('rio-durant--beckett-s-right-hands');
  p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(p),
    s = step(target(play(g), g.refs.unit!), 'decline-effect');
  expect(s.cards[g.refs.unit!]!.zone).toBe('hand');
  expect(s.execution.decision!.playerId).toBe('bob');
});
test('Salvaged Materials discounts an Item upgrade and defeats its exact incarnation next regroup', () => {
  const p = board('salvaged-materials');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[0].discard = [
    { card: 'han-s-golden-dice', ref: 'upgrade' },
    { card: 'watchful', ref: 'condition' },
  ];
  const g = scenario(p);
  let s = play(g);
  expect(
    opts(s)
      .filter(i => i.kind === 'play')
      .map(i => i.card),
  ).toEqual([g.refs.upgrade!]);
  const before = ready(s);
  s = step(s, 'play');
  expect(ready(s)).toBe(before);
  expect(s.delayedEffects).toHaveLength(1);
  s = step(s, 'pass');
  resume(s, choose(s, 'pass'));
  s = step(s, 'pass');
  s = finishRegroup(s);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
});
test('Maz plays the searched Underworld unit ready and bottoms it at regroup without defeating it', () => {
  const p = board('maz-kanata--where-s-my-boyfriend-', true);
  p.players[0].deck = [
    { card: 'artful-pickpocket', ref: 'chosen' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!, g.state.players.bob!.base);
  s = step(s, 'search', [g.refs.chosen!]);
  s = step(s, 'play');
  expect(s.cards[g.refs.chosen!]!.exhausted).toBe(false);
  expect(s.delayedEffects).toHaveLength(1);
  s = step(s, 'pass');
  resume(s, choose(s, 'pass'));
  s = step(s, 'pass');
  s = finishRegroup(s);
  expect(s.cards[g.refs.chosen!]!.zone).toBe('deck');
  expect(s.players.alice!.deck.at(-1)).toBe(g.refs.chosen!);
  expect(
    s.facts.some(f => f.type === 'defeated' && f.cards.some(c => c.instanceId === g.refs.chosen)),
  ).toBe(false);
});
