import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { addCard } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
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
const player = (s: GameState, id: string) =>
  step(s, i => i.kind === 'choose-player' && i.playerId === id);
function playCard(card: string) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card, ref: 'played' }];
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
  if (f?.kind !== 'trigger-batch') throw new Error('Expected triggers');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
const allocate = (s: GameState, assignments: Record<string, number>) =>
  step(
    s,
    'accept-effect',
    Object.entries(assignments).flatMap(([id, n]) => Array.from({ length: n }, () => id)),
  );

test('the Force is one public token per player and repeated creation does not accumulate tokens', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'acolyte-of-the-beyond', ref: 'first' },
    { card: 'acolyte-of-the-beyond', ref: 'second' },
  ];
  const s = scenario(p),
    first = step(s.state, i => i.kind === 'attack' && i.attacker === s.refs.first);
  const token = forceToken(first, 'alice')!;
  expect(token.zone).toBe('base');
  expect(first.players.alice!.tokens).toEqual([token.instanceId]);
  const second = step(
    step(first, 'pass'),
    i => i.kind === 'attack' && i.attacker === s.refs.second,
  );
  expect(second.players.alice!.tokens).toEqual([token.instanceId]);
  for (const viewer of [
    { role: 'player', playerId: 'alice' },
    { role: 'player', playerId: 'bob' },
    { role: 'spectator' },
  ] as const) {
    const view = new Projector(second.gameId, viewer).project(second);
    expect(gameViewSchema.safeParse(view).success).toBe(true);
    expect(view.cards.find(c => c.face?.cardId === 'the-force')!.face).toEqual({
      cardId: 'the-force',
      name: 'The Force',
      side: 'front',
      kind: 'player-token',
      printedKind: 'player-token',
      token: true,
      traits: [],
      leaderUnit: false,
      power: null,
      hp: null,
    });
  }
  const corrupt = structuredClone(second);
  addCard(corrupt, 'alice', 'the-force', 'base');
  expect(() => decodeState(encodeState(corrupt))).toThrow();
});

test('Maul pays exhaust and Force together on the leader face, then damages different units simultaneously', () => {
  const p = position();
  p.players[0].leader = { card: 'darth-maul--sith-revealed', ref: 'maul' };
  p.players[0].ground = [{ card: ids.marine, ref: 'first' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'second' }];
  const empty = scenario(p);
  expect(
    empty.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'damage-two-units',
    ),
  ).toBe(false);
  p.players[0].force = true;
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'second', ref: 'shield' + n }));
  const s = scenario(p),
    first = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'damage-two-units');
  expect(forceToken(first, 'alice')).toBeUndefined();
  expect(first.cards[s.refs.maul!]!.exhausted).toBe(true);
  expect(first.phaseHistory.forceUsed.alice).toBe(1);
  expect(first.execution.decision!.selection).toEqual({
    cards: [s.refs.first!, s.refs.second!],
    min: 2,
    max: 2,
  });
  expect(() => advance(first, choose(first, 'accept-effect', [s.refs.first!]))).toThrow();
  expect(() =>
    advance(first, choose(first, 'accept-effect', [s.refs.first!, s.refs.first!])),
  ).toThrow();
  const input = choose(first, 'accept-effect', [s.refs.first!, s.refs.second!]);
  resume(first, input);
  const prevention = advance(first, input).state;
  expect(prevention.cards[s.refs.first!]!.damage).toBe(0);
  resume(prevention, choose(prevention, 'target'));
  const end = target(prevention, s.refs.shield1!);
  expect(end.cards[s.refs.first!]!.damage).toBe(1);
  expect(end.cards[s.refs.second!]!.damage).toBe(0);
  p.players[0].leader.exhausted = true;
  expect(
    scenario(p).state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'damage-two-units',
    ),
  ).toBe(false);
});

test('Maul unit needs no Force for its attack trigger and one available target still takes one damage', () => {
  const p = position();
  p.players[0].leader = { card: 'darth-maul--sith-revealed', deployedAs: 'unit', ref: 'maul' };
  const s = scenario(p),
    first = step(s.state, 'attack'),
    after = step(first, 'accept-effect', [s.refs.maul!]);
  expect(after.cards[s.refs.maul!]!.damage).toBe(1);
  expect(after.phaseHistory.forceUsed).toEqual({});
  expect(after.cards[after.players.bob!.base]!.damage).toBe(
    unitStats(s.state, s.state.cards[s.refs.maul!]!).power,
  );
});

test('Talzin and Karis can decline Force use; paying applies their phase reductions through Shields', () => {
  for (const card of ['talzin-s-assassin', 'karis--we-don-t-like-strangers']) {
    const p = card === 'talzin-s-assassin' ? playCard(card) : playCard('lost-and-forgotten');
    p.players[0].force = true;
    if (card === 'karis--we-don-t-like-strangers') p.players[0].ground = [{ card, ref: 'karis' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const s = scenario(p),
      played = step(s.state, 'play'),
      pay = card === 'talzin-s-assassin' ? played : target(played, s.refs.karis!);
    expect(forceToken(step(pay, 'decline-effect'), 'alice')).toBeDefined();
    resume(pay, choose(pay, 'accept-effect'));
    const after = target(step(pay, 'accept-effect'), s.refs.enemy!);
    expect(unitStats(after, after.cards[s.refs.enemy!]!).hp).toBe(
      card === 'talzin-s-assassin' ? 4 : 5,
    );
    expect(after.cards[s.refs.enemy!]!.damage).toBe(0);
    expect(upgrades(after, s.refs.enemy!)).toEqual(['shield']);
    expect(forceToken(after, 'alice')).toBeUndefined();
  }
});

test('Shatterpoint offers both modes, but the unrestricted defeat requires actually using the Force', () => {
  const p = playCard('shatterpoint');
  p.players[1].ground = [
    { card: ids.consular, ref: 'large' },
    { card: ids.marine, ref: 'small' },
  ];
  const s = scenario(p),
    modes = step(s.state, 'play');
  const unavailable = step(modes, i => i.kind === 'choose-mode' && i.mode === 'use-the-force');
  expect(unavailable.execution.decision!.kind).toBe('action');
  expect(unavailable.cards[s.refs.large!]!.zone).toBe('ground');
  const small = step(modes, i => i.kind === 'choose-mode' && i.mode === 'defeat-small-unit');
  expect(small.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.small! },
  ]);
  p.players[0].force = true;
  const t = scenario(p),
    payment = step(
      step(t.state, 'play'),
      i => i.kind === 'choose-mode' && i.mode === 'use-the-force',
    );
  expect(target(step(payment, 'accept-effect'), t.refs.large!).cards[t.refs.large!]!.zone).toBe(
    'discard',
  );
});

test('Tyranus gains one optional Ambush only while Force is present at entry, independently ordered with Shielded', () => {
  const p = playCard('darth-tyranus--servant-of-sidious');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    noForce = step(s.state, 'play');
  expect(noForce.execution.decision!.kind).toBe('action');
  expect(upgrades(noForce, s.refs.played!)).toEqual(['shield']);
  p.players[0].force = true;
  const t = scenario(p),
    batch = step(t.state, 'play');
  expect(batch.execution.decision!.options).toHaveLength(2);
  resume(batch, choose(batch, 'trigger'));
  const shieldFirst = trigger(batch, 'shielded-played');
  const after = target(shieldFirst, t.refs.enemy!);
  expect(after.cards[t.refs.enemy!]!.zone).toBe('discard');
  expect(after.cards[t.refs.played!]!.zone).toBe('ground');
  expect(after.cards[t.refs.played!]!.damage).toBe(0);
  expect(forceToken(after, 'alice')).toBeDefined();
});

test('Nightsister Lair triggers from friendly Force-unit attacks, and Owen searches only Force units', () => {
  const p = position();
  p.players[0].base.card = 'nightsister-lair';
  p.players[0].ground = [
    { card: 'secretive-sage', ref: 'force' },
    { card: ids.marine, ref: 'other' },
  ];
  const s = scenario(p);
  expect(
    forceToken(
      step(s.state, i => i.kind === 'attack' && i.attacker === s.refs.other),
      'alice',
    ),
  ).toBeUndefined();
  expect(
    forceToken(
      step(s.state, i => i.kind === 'attack' && i.attacker === s.refs.force),
      'alice',
    ),
  ).toBeDefined();
  const q = playCard('lost-and-forgotten');
  q.players[0].ground = [{ card: 'owen-lars--devoted-uncle', ref: 'owen' }];
  q.players[0].deck = [
    { card: ids.marine, ref: 'marine' },
    { card: 'secretive-sage', ref: 'sage' },
    { card: 'shatterpoint', ref: 'event' },
    ...Array.from({ length: 4 }, () => ({ card: ids.marine })),
  ];
  const t = scenario(q),
    search = target(step(t.state, 'play'), t.refs.owen!);
  expect(search.execution.decision!.selection!.cards).toEqual([t.refs.sage!]);
  resume(search, choose(search, 'search', [t.refs.sage!]));
  const random = step(search, 'search', [t.refs.sage!]);
  const request = random.execution.random!;
  const after = advance(random, {
    type: 'random',
    gameId: random.gameId,
    expectedRevision: random.revision,
    requestId: request.id,
    values: request.bounds.map(() => 0),
  }).state;
  expect(after.players.alice!.hand).toContain(t.refs.sage!);
});

test('Constructed Lightsaber attaches only to Force units and grants abilities from the holder’s aspects', () => {
  for (const [card, keyword, value] of [
    ['gungi--finding-himself', 'restore', 2],
    ['trayus-acolyte', 'raid', 2],
    ['secretive-sage', 'Sentinel', 1],
  ] as const) {
    const p = playCard('constructed-lightsaber');
    p.players[0].ground = [
      { card, ref: 'holder' },
      { card: ids.marine, ref: 'other' },
    ];
    const s = scenario(p),
      choices = s.state.execution.decision!.options.filter(o => o.intent.kind === 'play');
    expect(choices).toHaveLength(1);
    expect(choices[0]!.intent).toEqual({
      kind: 'play',
      card: s.refs.played!,
      target: s.refs.holder!,
    });
    const after = step(s.state, 'play'),
      abilities = effectiveAbilities(after, after.cards[s.refs.holder!]!);
    if (keyword === 'Sentinel') expect(abilities.keywords).toContain('Sentinel');
    else expect(abilities[keyword]).toBe(value);
    expect(effectiveAbilities(after, after.cards[s.refs.other!]!).restore).toBe(0);
  }
});

test('named lightsabers grant only to the named character or printed Force alternative', () => {
  const p = position();
  p.players[0].leader = { card: ids.leader, deployedAs: 'unit', ref: 'sabine' };
  p.players[0].ground = [
    { card: 'luke-skywalker--answering-the-call', ref: 'luke' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.attachments = [
    { card: 'sabine-s-lightsaber--not-alone', unit: 'sabine' },
    { card: 'luke-s-jedi-lightsaber--constructed-by-hand', unit: 'luke' },
  ];
  const s = scenario(p);
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.sabine!]!).restore).toBe(2);
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.luke!]!).keywords).toContain('Sentinel');
  p.attachments = [{ card: 'sabine-s-lightsaber--not-alone', unit: 'marine' }];
  const other = scenario(p);
  expect(effectiveAbilities(other.state, other.state.cards[other.refs.marine!]!).restore).toBe(0);
  p.attachments = [{ card: 'sabine-s-lightsaber--not-alone', unit: 'luke' }];
  const force = scenario(p);
  expect(effectiveAbilities(force.state, force.state.cards[force.refs.luke!]!).restore).toBe(3);
});

test('indirect damage is assigned by the recipient, capped at unit remaining HP, and bypasses Shields', () => {
  const p = playCard('planetary-bombardment');
  p.players[1].ground = [{ card: ids.consular, ref: 'unit', damage: 3 }];
  p.attachments = [{ card: 'shield', unit: 'unit', ref: 'shield' }];
  const s = scenario(p),
    recipient = step(s.state, 'play');
  const allocation = player(recipient, 'bob');
  expect(allocation.execution.decision!.playerId).toBe('bob');
  expect(allocation.execution.decision!.selection!.allocation!.limits[s.refs.unit!]).toBe(4);
  expect(() =>
    allocate(allocation, { [s.refs.unit!]: 5, [allocation.players.bob!.base]: 3 }),
  ).toThrow();
  expect(() => allocate(allocation, { [allocation.players.bob!.base]: 7 })).toThrow();
  expect(() =>
    step(allocation, 'accept-effect', Array(8).fill(allocation.players.alice!.base)),
  ).toThrow();
  const input = choose(allocation, 'accept-effect', [
    s.refs.unit!,
    s.refs.unit!,
    ...Array(6).fill(allocation.players.bob!.base),
  ]);
  resume(allocation, input);
  const after = advance(allocation, input).state;
  expect(after.cards[s.refs.unit!]!.damage).toBe(5);
  expect(after.cards[s.refs.shield!]!.zone).toBe('ground');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(6);
  expect(
    after.facts
      .filter(f => f.type === 'damage')
      .every(f => f.cards[0]!.instanceId === s.refs.played),
  ).toBe(true);
});

test('Devastator assigns opponents’ damage; Hunting Aggressor stacks its increase only against opponents', () => {
  const p = playCard('devastator--hunting-the-rebellion');
  p.players[0].space = [{ card: 'hunting-aggressor' }, { card: 'hunting-aggressor' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const s = scenario(p),
    allocation = step(s.state, 'play');
  expect(allocation.execution.decision!.playerId).toBe('alice');
  expect(allocation.execution.decision!.selection!.min).toBe(6);
  const after = allocate(allocation, { [s.refs.unit!]: 6 });
  expect(after.cards[s.refs.unit!]!.damage).toBe(6);
  const q = playCard('planetary-bombardment');
  q.players[0].space = p.players[0].space;
  const t = scenario(q),
    choosePlayer = step(t.state, 'play'),
    own = player(choosePlayer, 'alice');
  expect(own.execution.decision!.selection!.min).toBe(8);
  const enemy = player(choosePlayer, 'bob');
  expect(enemy.execution.decision!.selection!.min).toBe(10);
});

test('indirect allocation projections expose opaque quantities only to the allocator, and accept repeated handles as damage points', () => {
  const s = scenario(playCard('planetary-bombardment')),
    allocation = player(step(s.state, 'play'), 'bob');
  const projector = new Projector(allocation.gameId, { role: 'player', playerId: 'bob' }),
    view = projector.project(allocation);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  const handle = view.cards.find(c => c.controller === 'bob' && c.face?.kind === 'base')!.id;
  expect(view.decision!.selection!.allocation!.limits).toEqual({ [handle]: 8 });
  const command = {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
    selections: Array(8).fill(handle),
  };
  const after = advance(allocation, projector.command(allocation, command)).state;
  expect(after.cards[after.players.bob!.base]!.damage).toBe(8);
  expect(
    new Projector(allocation.gameId, { role: 'player', playerId: 'alice' }).project(allocation)
      .decision,
  ).toBeNull();
  expect(
    new Projector(allocation.gameId, { role: 'spectator' }).project(allocation).decision,
  ).toBeNull();
  const json = JSON.stringify(view);
  for (const id of allocation.execution.decision!.selection!.cards)
    expect(json).not.toContain(`"${id}"`);
  const pick = projector.project(allocation);
  expect(pick.decision!.source!.cardId).toBe('planetary-bombardment');
  const first = scenario(playCard('planetary-bombardment'));
  const choices = new Projector(first.state.gameId, { role: 'player', playerId: 'alice' }).project(
    step(first.state, 'play'),
  );
  expect(choices.decision!.options.map(o => o.playerId)).toEqual(['alice', 'bob']);
});

test('Pryde observes indirect damage to either player’s unit and removes only its non-unique upgrades', () => {
  const p = playCard('planetary-bombardment');
  p.players[0].ground = [{ card: 'allegiant-general-pryde--ruthless-and-loyal', ref: 'pryde' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'unit' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'unit', ref: 'shield' },
    { card: 'sabine-s-lightsaber--not-alone', unit: 'unit', ref: 'unique' },
    { card: 'shield', unit: 'other', ref: 'elsewhere' },
  ];
  const s = scenario(p),
    allocation = player(step(s.state, 'play'), 'bob'),
    removal = allocate(allocation, { [s.refs.unit!]: 1, [allocation.players.bob!.base]: 7 });
  expect(removal.execution.decision!.playerId).toBe('alice');
  expect(removal.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.shield! },
    { kind: 'decline-effect' },
  ]);
  const after = target(removal, s.refs.shield!);
  expect(after.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(after.cards[s.refs.unit!]!.damage).toBe(1);
  expect(after.cards[s.refs.unique!]!.zone).toBe('ground');
});

test('TIE Bomber and Red Squadron Y-Wing deal indirect damage before combat to the defending player', () => {
  for (const card of ['tie-bomber', 'red-squadron-y-wing']) {
    const p = position();
    p.players[0].space = [{ card, ref: 'source' }];
    const s = scenario(p),
      allocation = step(s.state, 'attack');
    expect(allocation.execution.decision!.playerId).toBe('bob');
    expect(allocation.cards[allocation.players.bob!.base]!.damage).toBe(0);
    const after = allocate(allocation, { [allocation.players.bob!.base]: 3 });
    expect(after.cards[after.players.bob!.base]!.damage).toBe(
      3 + unitStats(s.state, s.state.cards[s.refs.source!]!).power,
    );
  }
});

test('defeated sources retain responsibility and their controller chooses who receives indirect damage', () => {
  for (const [card, n] of [
    ['droid-missile-platform', 3],
    ['zygerrian-starhopper', 2],
    ['first-order-stormtrooper', 1],
  ] as const) {
    const p = playCard('lost-and-forgotten');
    if (card === 'first-order-stormtrooper') p.players[0].ground = [{ card, ref: 'source' }];
    else p.players[0].space = [{ card, ref: 'source' }];
    const s = scenario(p),
      choosePlayer = target(step(s.state, 'play'), s.refs.source!);
    expect(choosePlayer.cards[s.refs.source!]!.zone).toBe('discard');
    const allocation = player(choosePlayer, 'bob');
    resume(
      allocation,
      choose(allocation, 'accept-effect', Array(n).fill(allocation.players.bob!.base)),
    );
    const after = allocate(allocation, { [allocation.players.bob!.base]: n });
    expect(after.facts.filter(f => f.type === 'damage').at(-1)!.cards[0]!.instanceId).toBe(
      s.refs.source!,
    );
  }
});

test('Fett’s Firespray checks a controlled Boba and Planetary Bombardment checks a friendly Capital Ship', () => {
  const p = playCard('fett-s-firespray--feared-silhouette');
  const s = scenario(p),
    small = player(step(s.state, 'play'), 'bob');
  expect(small.execution.decision!.selection!.min).toBe(1);
  p.players[0].ground = [{ card: 'boba-fett--for-a-price' }];
  const t = scenario(p),
    big = player(step(t.state, 'play'), 'bob');
  expect(big.execution.decision!.selection!.min).toBe(2);
  const q = playCard('planetary-bombardment');
  q.players[0].space = [{ card: 'devastator--hunting-the-rebellion' }];
  const u = scenario(q),
    twelve = player(step(u.state, 'play'), 'bob');
  expect(twelve.execution.decision!.selection!.min).toBe(12);
  expect(twelve.execution.decision!.playerId).toBe('alice');
});
