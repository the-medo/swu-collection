import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
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

const cardChoice = (s: GameState, id?: string) => step(s, 'accept-effect', id ? [id] : []);
const allocation = (s: GameState, amounts: Record<string, number>) =>
  step(
    s,
    'accept-effect',
    Object.entries(amounts).flatMap(([id, n]) => Array.from({ length: n }, () => id)),
  );

test('Ninth Sister lets the opponent discard privately, then divides printed-cost damage with normal Shield prevention', () => {
  const p = playCard('ninth-sister--hulking-inquisitor');
  p.players[1].hand = [
    { card: 'trask-walker', ref: 'cost8' },
    { card: ids.marine, ref: 'cost2' },
  ];
  p.players[1].ground = [
    { card: ids.marine, ref: 'shielded' },
    { card: ids.marine, ref: 'unshielded' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'shielded', ref: 'shield1' },
    { card: 'shield', unit: 'shielded', ref: 'shield2' },
  ];
  const s = scenario(p),
    discard = step(s.state, 'play');
  expect(discard.execution.decision!.playerId).toBe('bob');
  const alice = new Projector(discard.gameId, { role: 'player', playerId: 'alice' }).project(
    discard,
  );
  expect(alice.decision).toBeNull();
  expect(JSON.stringify(alice)).not.toContain('trask-walker');
  resume(discard, choose(discard, 'accept-effect', [s.refs.cost8!]));
  const divide = cardChoice(discard, s.refs.cost8!);
  expect(divide.execution.decision!.playerId).toBe('alice');
  expect(divide.execution.decision!.selection).toMatchObject({
    min: 8,
    max: 8,
    allocation: { limits: { [s.refs.shielded!]: 8, [s.refs.unshielded!]: 8 } },
  });
  expect(() => allocation(divide, { [s.refs.unshielded!]: 5 })).toThrow();
  expect(() => allocation(divide, { [divide.players.bob!.base]: 8 })).toThrow();
  expect(step(divide, 'decline-effect').cards[s.refs.unshielded!]!.damage).toBe(0);
  const replace = allocation(divide, { [s.refs.shielded!]: 6, [s.refs.unshielded!]: 2 });
  expect(replace.execution.decision!.kind).toBe('replacement');
  expect(replace.cards[s.refs.unshielded!]!.damage).toBe(0);
  resume(
    replace,
    choose(replace, i => i.kind === 'target' && i.card === s.refs.shield2),
  );
  const done = target(replace, s.refs.shield2!);
  expect(done.cards[s.refs.shielded!]!.damage).toBe(0);
  expect(done.cards[s.refs.shield1!]!.zone).toBe('ground');
  expect(done.cards[s.refs.shield2!]!.zone).toBe('set-aside');
  expect(done.cards[s.refs.unshielded!]!.damage).toBe(2);
  expect(done.facts.findLast(f => f.type === 'damage')!.cards[0]!.instanceId).toBe(s.refs.played!);
});

test('Ninth Sister handles an empty hand without inventing damage', () => {
  const empty = scenario(playCard('ninth-sister--hulking-inquisitor'));
  expect(cardChoice(step(empty.state, 'play')).execution.decision!.kind).toBe('action');
});

test('0-0-0 filters Aggression cards, moves just one physical copy to the bottom, and can decline', () => {
  const p = position();
  p.players[0].ground = [{ card: '0-0-0--translation-and-torture', ref: 'attacker' }];
  p.players[0].discard = [
    { card: ids.trooper, ref: 'one' },
    { card: ids.trooper, ref: 'two' },
    { card: ids.marine, ref: 'wrong' },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.one!, s.refs.two!]);
  expect(cardChoice(choice).cards[choice.players.bob!.base]!.damage).toBe(4);
  resume(choice, choose(choice, 'accept-effect', [s.refs.two!]));
  const done = cardChoice(choice, s.refs.two!);
  expect(done.players.alice!.deck.at(-1)).toBe(s.refs.two!);
  expect(done.players.alice!.discard).toContain(s.refs.one!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
  const visible = new Projector(done.gameId, { role: 'player', playerId: 'bob' }).project(done);
  expect(
    visible.events.findLast(e => e.type === 'put-on-deck')!.cards.at(-1)!.currentCardId,
  ).toBeNull();
});

test('BT-1 publicly mills its top card and gets the optional ground damage only for Aggression', () => {
  for (const aggression of [true, false]) {
    const p = position();
    p.players[0].ground = [{ card: 'bt-1--blastomech', ref: 'attacker' }];
    p.players[0].deck = [{ card: aggression ? ids.trooper : ids.marine, ref: 'top' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
    const s = scenario(p),
      choice = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
    expect(choice.cards[s.refs.top!]!.zone).toBe('discard');
    if (aggression) {
      expect(step(choice, 'decline-effect').cards[s.refs.target!]!.damage).toBe(0);
      const done = target(choice, s.refs.target!);
      expect(done.cards[s.refs.target!]!.damage).toBe(1);
      expect(done.cards[done.players.bob!.base]!.damage).toBe(2);
    } else expect(choice.execution.decision!.kind).toBe('action');
  }
  const p = position();
  p.players[0].ground = [{ card: 'bt-1--blastomech', ref: 'attacker' }];
  p.players[0].deck = [];
  const s = scenario(p),
    done = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
  expect(done.cards[done.players.alice!.base]!.damage).toBe(0);
});

test('Beguile inspects a hand only for its controller, then returns a legal enemy without exposing later hand changes', () => {
  const p = playCard('beguile');
  p.players[1].hand = [{ card: ids.consular, ref: 'secret' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: 'ninth-sister--hulking-inquisitor', ref: 'expensive' },
  ];
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  const s = scenario(p),
    peek = step(s.state, 'play');
  const actor = new Projector(peek.gameId, { role: 'player', playerId: 'alice' }).project(peek);
  expect(actor.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.consular]);
  expect(actor.decision!.selection!.cards).toEqual([]);
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const)
    expect(new Projector(peek.gameId, viewer).project(peek).decision).toBeNull();
  resume(peek, choose(peek, 'accept-effect'));
  const choice = cardChoice(peek);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.enemy! },
  ]);
  const done = target(choice, s.refs.enemy!);
  expect(done.players.bob!.hand).toContain(s.refs.enemy!);
  const corrupt = structuredClone(peek);
  const f = corrupt.execution.frames[0];
  if (f?.kind === 'zone-inspection') f.cards = [];
  expect(() => decodeState(encodeState(corrupt))).toThrow();
});

test('Moff Gideon returns only a non-unique Imperial unit after leaving play', () => {
  const p = position();
  p.players[0].ground = [{ card: 'moff-gideon--remnant-commander', ref: 'gideon', damage: 2 }];
  p.players[0].discard = [
    { card: ids.trooper, ref: 'eligible' },
    { card: ids.marine, ref: 'wrongTrait' },
    { card: '0-0-0--translation-and-torture', ref: 'unique' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.defender);
  expect(choice.cards[s.refs.gideon!]!.zone).toBe('discard');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.eligible!]);
  resume(choice, choose(choice, 'accept-effect', [s.refs.eligible!]));
  const done = cardChoice(choice, s.refs.eligible!);
  expect(done.players.alice!.hand).toContain(s.refs.eligible!);
  expect(done.players.alice!.discard).toContain(s.refs.gideon!);
});

test('Trask Walker can recover a unit or bottom it and heal, on both played and attack triggers', () => {
  for (const attack of [false, true]) {
    const p = attack ? position() : playCard('trask-walker');
    if (attack) p.players[0].ground = [{ card: 'trask-walker', ref: 'played' }];
    p.players[0].base.damage = 5;
    p.players[0].discard = [
      { card: ids.consular, ref: 'valid' },
      { card: 'trask-walker', ref: 'expensive' },
    ];
    const s = scenario(p),
      select = step(s.state, attack ? 'attack' : 'play');
    expect(select.execution.decision!.selection!.cards).toEqual([s.refs.valid!]);
    const mode = cardChoice(select, s.refs.valid!);
    resume(
      mode,
      choose(mode, i => i.kind === 'choose-mode' && i.mode === 'bottom-and-heal'),
    );
    const bottom = step(mode, i => i.kind === 'choose-mode' && i.mode === 'bottom-and-heal');
    expect(bottom.players.alice!.deck.at(-1)).toBe(s.refs.valid!);
    expect(bottom.cards[bottom.players.alice!.base]!.damage).toBe(2);
    const hand = step(mode, i => i.kind === 'choose-mode' && i.mode === 'return-to-hand');
    expect(hand.players.alice!.hand).toContain(s.refs.valid!);
    expect(hand.cards[hand.players.alice!.base]!.damage).toBe(5);
  }
});

test('Interrogation Droid requires a successful exhaust and cost at most three before the opponent chooses a discard', () => {
  for (const [exhausted, card, discards] of [
    [false, ids.marine, true],
    [true, ids.marine, false],
    [false, ids.consular, false],
  ] as const) {
    const p = playCard('interrogation-droid');
    p.players[1].ground = [{ card, exhausted, ref: 'target' }];
    p.players[1].hand = [{ card: ids.trooper, ref: 'hand' }];
    const s = scenario(p),
      choice = target(step(s.state, 'play'), s.refs.target!);
    if (discards) {
      expect(choice.execution.decision!.playerId).toBe('bob');
      expect(cardChoice(choice, s.refs.hand!).cards[s.refs.hand!]!.zone).toBe('discard');
    } else expect(choice.execution.decision!.kind).toBe('action');
  }
});

test('Merrin discards before choosing damage, and declining preserves the hand', () => {
  const p = position();
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'merrin' }];
  p.players[0].hand = [{ card: ids.trooper, ref: 'hand' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
  expect(cardChoice(choice).players.alice!.hand).toContain(s.refs.hand!);
  const targets = cardChoice(choice, s.refs.hand!);
  expect(targets.cards[s.refs.hand!]!.zone).toBe('discard');
  expect(target(targets, s.refs.target!).cards[s.refs.target!]!.damage).toBe(2);
});

test('Reckless Sacrifice rejects events as its discard and equal-or-lower cost damage targets', () => {
  const p = playCard('reckless-sacrifice');
  p.players[0].hand!.push(
    { card: ids.marine, ref: 'sacrifice' },
    { card: 'open-fire', ref: 'event' },
  );
  p.players[1].ground = [
    { card: ids.marine, ref: 'equal' },
    { card: ids.consular, ref: 'larger' },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'play' && i.card === s.refs.played);
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.sacrifice!]);
  const targets = cardChoice(choice, s.refs.sacrifice!);
  expect(targets.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.larger! },
  ]);
  const done = target(targets, s.refs.larger!);
  expect(done.cards[s.refs.larger!]!.damage).toBe(5);
  expect(done.players.alice!.discard).toContain(s.refs.sacrifice!);
});

test('Remnant Lookouts can discard an inspected enemy card and replaces it without revealing the draw', () => {
  const p = playCard('remnant-lookouts');
  p.players[1].hand = [{ card: ids.trooper, ref: 'hand' }];
  p.players[1].deck = [{ card: ids.consular, ref: 'draw' }];
  const s = scenario(p),
    peek = step(s.state, 'play');
  expect(peek.execution.decision!.playerId).toBe('alice');
  expect(cardChoice(peek).players.bob!.hand).toEqual([s.refs.hand!]);
  const done = cardChoice(peek, s.refs.hand!);
  expect(done.players.bob!.hand).toEqual([s.refs.draw!]);
  const alice = new Projector(done.gameId, { role: 'player', playerId: 'alice' }).project(done);
  expect(JSON.stringify(alice)).not.toContain(ids.consular);
  expect(JSON.stringify(alice)).not.toContain('Consular Security Force');
  expect(
    alice.events.some(e => e.type === 'discarded' && e.cards.some(c => c.cardId === ids.trooper)),
  ).toBe(true);
});

test('the Sharpshooter pays before the opponent chooses a discard, with no discard when payment is declined', () => {
  const p = playCard('mid-rim-sharpshooter');
  p.players[1].hand = [{ card: ids.trooper, ref: 'hand' }];
  const s = scenario(p),
    payment = step(s.state, 'play');
  expect(step(payment, 'decline-effect').players.bob!.hand).toEqual([s.refs.hand!]);
  const choice = step(payment, 'accept-effect');
  expect(choice.execution.decision!.playerId).toBe('bob');
  expect(cardChoice(choice, s.refs.hand!).players.bob!.discard).toContain(s.refs.hand!);
});

test('Qui-Gon leaves play before choosing a ground unit whose owner chooses top or bottom', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'qui-gon-jinn--the-negotiations-will-be-short', ref: 'qui', damage: 3 },
  ];
  p.players[1].ground = [
    { card: ids.marine, ref: 'attacked' },
    { card: ids.consular, ref: 'target' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.attacked);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.target! },
    { kind: 'decline-effect' },
  ]);
  const placement = target(choice, s.refs.target!);
  expect(placement.execution.decision!.playerId).toBe('bob');
  resume(
    placement,
    choose(placement, i => i.kind === 'choose-mode' && i.mode === 'deck-top'),
  );
  for (const [mode, index] of [
    ['deck-top', 0],
    ['deck-bottom', -1],
  ] as const) {
    const done = step(placement, i => i.kind === 'choose-mode' && i.mode === mode);
    expect(done.players.bob!.deck.at(index)).toBe(s.refs.target!);
  }
});

test('Hold for Questioning reveals the whole hand but permits only shared-aspect discards after successful exhaustion', () => {
  const p = playCard('hold-for-questioning');
  p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
  p.players[1].hand = [
    { card: ids.marine, ref: 'matching' },
    { card: ids.trooper, ref: 'different' },
  ];
  const s = scenario(p),
    peek = target(step(s.state, 'play'), s.refs.target!);
  expect(peek.execution.decision!.playerId).toBe('alice');
  expect(peek.execution.decision!.selection!.cards).toEqual([s.refs.matching!]);
  const view = new Projector(peek.gameId, { role: 'player', playerId: 'alice' }).project(peek);
  expect(view.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine, ids.trooper]);
  expect(() => cardChoice(peek, s.refs.different!)).toThrow();
  resume(peek, choose(peek, 'accept-effect', [s.refs.matching!]));
  expect(cardChoice(peek, s.refs.matching!).players.bob!.discard).toContain(s.refs.matching!);
  p.players[1].ground![0]!.exhausted = true;
  const exhausted = scenario(p);
  expect(
    target(step(exhausted.state, 'play'), exhausted.refs.target!).execution.decision!.kind,
  ).toBe('action');
});

test('secret-differential projections hide another player’s discard choice and another viewer’s hand inspection', () => {
  for (const card of ['ninth-sister--hulking-inquisitor', 'beguile']) {
    const p = playCard(card);
    p.players[1].hand = [{ card: ids.consular, ref: 'secret' }];
    const first = step(scenario(p).state, 'play');
    p.players[1].hand![0]!.card = ids.fighter;
    const second = step(scenario(p).state, 'play');
    const viewers =
      card === 'beguile'
        ? [{ role: 'spectator' } as const]
        : [{ role: 'spectator' } as const, { role: 'player', playerId: 'alice' } as const];
    for (const viewer of viewers)
      expect(new Projector(first.gameId, viewer, 'q'.repeat(32)).project(first)).toEqual(
        new Projector(second.gameId, viewer, 'q'.repeat(32)).project(second),
      );
  }
});
