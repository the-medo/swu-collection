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

test('Blue Leader changes arenas without becoming a new copy; either order of its entry abilities remains legal', () => {
  const p = playCard('blue-leader--scarif-air-support');
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.players[1].space = [{ card: 'hunting-aggressor', ref: 'space' }];
  const s = scenario(p),
    entry = step(s.state, 'play');
  const payment = trigger(entry, 'on-played');
  resume(payment, choose(payment, 'accept-effect'));
  const changed = step(payment, 'accept-effect');
  expect(changed.cards[s.refs.played!]!.zone).toBe('ground');
  expect(changed.cards[s.refs.played!]!.incarnation).toBe(entry.cards[s.refs.played!]!.incarnation);
  expect(unitStats(changed, changed.cards[s.refs.played!]!)).toMatchObject({ power: 5, hp: 5 });
  expect(changed.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.ground! },
    { kind: 'decline-effect' },
  ]);
  resume(changed, choose(changed, 'decline-effect'));
  expect(step(changed, 'decline-effect').cards[s.refs.played!]!.exhausted).toBe(true);
  const ambush = trigger(entry, 'ambush');
  const afterCombat = target(ambush, s.refs.space!);
  expect(afterCombat.cards[s.refs.played!]!.zone).toBe('discard');
  const late = step(afterCombat, 'accept-effect');
  expect(late.cards[s.refs.played!]!.zone).toBe('discard');
  expect(upgrades(late, s.refs.played!)).toEqual([]);
});

test('System Shock binds the removed upgrade host and damages only that exact surviving unit', () => {
  const p = playCard('system-shock');
  p.players[1].ground = [
    { card: ids.marine, ref: 'host' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'host', ref: 'shield' },
    { card: 'experience', unit: 'other', ref: 'experience' },
  ];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.shield!, s.refs.experience!]);
  expect(() => step(choice, 'accept-effect', [s.refs.shield!, s.refs.experience!])).toThrow();
  resume(choice, choose(choice, 'accept-effect', [s.refs.shield!]));
  const done = step(choice, 'accept-effect', [s.refs.shield!]);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(done.cards[s.refs.host!]!.damage).toBe(1);
  expect(done.cards[s.refs.other!]!.damage).toBe(0);
  p.players[1].ground![1]!.damage = 3;
  const lethal = scenario(p),
    result = step(step(lethal.state, 'play'), 'accept-effect', [lethal.refs.experience!]);
  expect(result.cards[lethal.refs.other!]!.zone).toBe('discard');
  expect(result.facts.filter(f => f.type === 'damage')).toHaveLength(0);
});

test('Pegasus can sacrifice its controller’s upgrade on an enemy unit, and can decline', () => {
  const p = playCard('pegasus-tri-wing');
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [
    { card: 'academy-training', unit: 'host', owner: 'alice', ref: 'ours' },
    { card: 'experience', unit: 'host', ref: 'theirs' },
  ];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.ours!]);
  expect(step(choice, 'accept-effect', []).cards[s.refs.played!]!.exhausted).toBe(true);
  const done = step(choice, 'accept-effect', [s.refs.ours!]);
  expect(done.cards[s.refs.played!]!.exhausted).toBe(false);
  expect(done.cards[s.refs.ours!]!.zone).toBe('discard');
  expect(done.cards[s.refs.theirs!]!.attachedTo?.instanceId).toBe(s.refs.host!);
});

test('Kit Fisto removes a chosen subset of one unit’s upgrades simultaneously and can leave them all', () => {
  const p = playCard('kit-fisto-s-aethersprite--good-hunting');
  p.players[1].ground = [
    { card: ids.marine, ref: 'host' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [
    { card: 'experience', unit: 'host', ref: 'one' },
    { card: 'experience', unit: 'host', ref: 'two' },
    { card: 'shield', unit: 'other', ref: 'otherShield' },
  ];
  p.players[1].ground![0]!.damage = 4;
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.host!);
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.one!, s.refs.two!]);
  expect(() => step(choice, 'accept-effect', [s.refs.otherShield!])).toThrow();
  resume(choice, choose(choice, 'accept-effect', [s.refs.one!, s.refs.two!]));
  expect(step(choice, 'accept-effect', []).cards[s.refs.host!]!.zone).toBe('ground');
  const done = step(choice, 'accept-effect', [s.refs.one!, s.refs.two!]);
  expect(done.cards[s.refs.host!]!.zone).toBe('discard');
  expect(done.cards[s.refs.otherShield!]!.zone).toBe('ground');
  expect(effectiveAbilities(done, done.cards[s.refs.played!]!).keywords).toContain('Saboteur');
});

test('There Is No Conflict returns other upgrades to their owners, with tokens leaving play', () => {
  const p = playCard('there-is-no-conflict');
  p.players[1].ground = [
    { card: ids.consular, ref: 'host' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [
    { card: 'academy-training', unit: 'host', owner: 'alice', ref: 'ours' },
    { card: 'shield', unit: 'host', ref: 'shield' },
    { card: 'experience', unit: 'other', ref: 'elsewhere' },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'play' && i.target === s.refs.host);
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.ours!, s.refs.shield!]);
  resume(choice, choose(choice, 'accept-effect', [s.refs.ours!, s.refs.shield!]));
  const done = step(choice, 'accept-effect', [s.refs.ours!, s.refs.shield!]);
  expect(done.players.alice!.hand).toContain(s.refs.ours!);
  expect(done.players.bob!.hand).not.toContain(s.refs.ours!);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(done.cards[s.refs.played!]!.attachedTo?.instanceId).toBe(s.refs.host!);
  expect(done.cards[s.refs.elsewhere!]!.zone).toBe('ground');
});

test('Watch This remembers the returned unit’s arena and affects only the other enemy units there', () => {
  const p = playCard('watch-this');
  p.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.consular, ref: 'other' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.leader,
    ),
  ).toBe(false);
  const done = target(choice, s.refs.first!);
  expect(done.cards[s.refs.first!]!.zone).toBe('hand');
  expect(done.cards[s.refs.other!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.ours!]!.exhausted).toBe(false);
  expect(done.cards[s.refs.space!]!.exhausted).toBe(false);
  const own = target(choice, s.refs.ours!);
  expect(own.cards[s.refs.ours!]!.zone).toBe('hand');
  expect(own.cards[s.refs.first!]!.exhausted).toBe(true);
});

test('Sabine Spectre Five can remove a unique upgrade only with the required friendly aspect unit', () => {
  for (const friendly of [false, true]) {
    const p = playCard('sabine-wren--spectre-five');
    p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
    if (friendly) p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    p.attachments = [
      { card: 'luke-s-jedi-lightsaber--constructed-by-hand', unit: 'host', ref: 'unique' },
      { card: 'shield', unit: 'host', ref: 'shield' },
    ];
    const s = scenario(p),
      choice = trigger(step(s.state, 'play'), 'on-played');
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.unique,
      ),
    ).toBe(friendly);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.shield,
      ),
    ).toBe(true);
  }
});

test('Commence grants Saboteur before target selection and checks total resource counts for its attack bonus', () => {
  for (const fewer of [false, true]) {
    const p = playCard('commence-the-festivities');
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].ground = [{ card: 'imperial-armored-commando', ref: 'sentinel' }];
    p.players[1].resources = Array.from({ length: fewer ? 13 : 12 }, () => ({ card: ids.marine }));
    const s = scenario(p),
      choice = target(step(s.state, 'play'), s.refs.attacker!);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === choice.players.bob!.base,
      ),
    ).toBe(true);
    resume(
      choice,
      choose(choice, i => i.kind === 'attack' && i.defender === choice.players.bob!.base),
    );
    const done = step(choice, i => i.kind === 'attack' && i.defender === choice.players.bob!.base);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(fewer ? 5 : 3);
    expect(effectiveAbilities(done, done.cards[s.refs.attacker!]!).keywords).not.toContain(
      'Saboteur',
    );
  }
});

test('Masterstroke counts the defender’s units in the attacking unit’s current arena', () => {
  const p = playCard('masterstroke');
  p.players[0].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.marine, ref: 'ally' },
  ];
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.attacker!);
  const done = step(choice, i => i.kind === 'attack' && i.defender === choice.players.bob!.base);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
  expect(unitStats(done, done.cards[s.refs.attacker!]!).power).toBe(3);
});

test('the Sheathipede’s opponent chooses which resource to ready and its identity stays private', () => {
  const p = position();
  p.players[0].space = [{ card: 'emissary-s-sheathipede', ref: 'ship', damage: 1 }];
  p.players[1].space = [{ card: 'hunting-aggressor', ref: 'enemy' }];
  p.players[1].resources = [
    { card: ids.consular, ref: 'resource', exhausted: true },
    { card: ids.trooper, ref: 'ready', exhausted: false },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.enemy);
  expect(choice.execution.decision!.playerId).toBe('bob');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.resource!]);
  expect(step(choice, 'accept-effect', []).cards[s.refs.resource!]!.exhausted).toBe(true);
  resume(choice, choose(choice, 'accept-effect', [s.refs.resource!]));
  const done = step(choice, 'accept-effect', [s.refs.resource!]);
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(false);
  const other = new Projector(done.gameId, { role: 'player', playerId: 'alice' }).project(done);
  expect(JSON.stringify(other)).not.toContain(ids.consular);
  expect(JSON.stringify(other)).not.toContain('Consular Security Force');
});

test('Emergency Powers spends only selected ready resources and gives exactly that many Experience tokens', () => {
  const p = playCard('emergency-powers');
  p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.target!);
  const available = choice.execution.decision!.selection!.cards;
  expect(available).toHaveLength(7); // one printed cost plus missing Vigilance and Villainy penalties
  expect(step(choice, 'accept-effect', []).cards[s.refs.target!]!.damage).toBe(0);
  const selected = available.slice(0, 3);
  resume(choice, choose(choice, 'accept-effect', selected));
  const done = step(choice, 'accept-effect', selected);
  expect(upgrades(done, s.refs.target!)).toEqual(['experience', 'experience', 'experience']);
  expect(unitStats(done, done.cards[s.refs.target!]!)).toMatchObject({ power: 6, hp: 6 });
  expect(done.players.alice!.resources.filter(id => !done.cards[id]!.exhausted)).toHaveLength(4);
});

test('Ravager observes itself and other played units, using the played copy’s power and arena', () => {
  const p = playCard('ravager--final-imperial-command');
  p.players[1].space = [{ card: 'ravager--final-imperial-command', ref: 'target' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.ground,
    ),
  ).toBe(false);
  const done = target(choice, s.refs.target!);
  expect(done.cards[s.refs.target!]!.damage).toBe(8);
  const damage = done.facts.findLast(f => f.type === 'damage')!;
  expect(damage.cards[0]!.instanceId).toBe(s.refs.played!);
  const q = playCard(ids.marine);
  q.players[0].space = [{ card: 'ravager--final-imperial-command', ref: 'ravager' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const t = scenario(q),
    next = step(t.state, 'play');
  resume(
    next,
    choose(next, i => i.kind === 'target' && i.card === t.refs.target),
  );
  const hit = target(next, t.refs.target!);
  expect(hit.cards[t.refs.target!]!.damage).toBe(3);
  expect(hit.facts.findLast(f => f.type === 'damage')!.cards[0]!.instanceId).toBe(t.refs.played!);
});
