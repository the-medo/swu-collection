import { changeControl } from '../engine/control.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { effectiveAbilities, supportOrigins } from '../engine/effective-abilities.ts';
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

test('No Glory transfers defeated-ability control but returns the unit to its owner’s discard pile', () => {
  const p = playCard('no-glory--only-results');
  p.players[0].discard = [{ card: ids.trooper, ref: 'ourDiscard' }];
  p.players[1].ground = [{ card: 'moff-gideon--remnant-commander', ref: 'gideon' }];
  p.players[1].discard = [{ card: ids.fighter, ref: 'theirDiscard' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.gideon!);
  expect(choice.cards[s.refs.gideon!]!.zone).toBe('discard');
  expect(choice.cards[s.refs.gideon!]!.controller).toBe('bob');
  expect(choice.players.bob!.discard).toContain(s.refs.gideon!);
  expect(choice.execution.decision!.playerId).toBe('alice');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.ourDiscard!]);
  resume(choice, choose(choice, 'accept-effect', [s.refs.ourDiscard!]));
  expect(step(choice, 'accept-effect', [s.refs.ourDiscard!]).players.alice!.hand).toContain(
    s.refs.ourDiscard!,
  );
  const own = playCard('no-glory--only-results');
  own.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  const o = scenario(own);
  expect(target(step(o.state, 'play'), o.refs.ours!).cards[o.refs.ours!]!.zone).toBe('discard');
});

test('a stolen unit retains damage and readiness; tokens follow its controller and ordinary upgrades stay separate', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'unit', exhausted: true, damage: 2 }];
  p.attachments = [
    { card: 'shield', unit: 'unit', owner: 'bob', ref: 'shield' },
    { card: 'academy-training', unit: 'unit', owner: 'alice', ref: 'training' },
  ];
  const s = scenario(p),
    before = structuredClone(s.state.cards[s.refs.unit!]!);
  expect(changeControl(s.state, s.state.cards[s.refs.unit!]!, 'alice')).toBe(true);
  expect(s.state.cards[s.refs.unit!]!).toMatchObject({ ...before, controller: 'alice' });
  expect(s.state.cards[s.refs.shield!]!).toMatchObject({ owner: 'alice', controller: 'alice' });
  expect(s.state.cards[s.refs.training!]!.controller).toBe('alice');
  s.state.execution.decision = null;
  settle(s.state);
  const recovered = decodeState(encodeState(s.state));
  const alice = new Projector(recovered.gameId, { role: 'player', playerId: 'alice' }).project(
    recovered,
  );
  expect(alice.cards.find(c => c.face?.cardId === ids.consular)!.controller).toBe('alice');
  expect(alice.cards.find(c => c.face?.cardId === 'shield')!.controller).toBe('alice');
});

test('changing control during an attack removes that participant even if control changes back', () => {
  for (const which of ['attacker', 'defender'] as const) {
    const p = position();
    p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    const s = scenario(p),
      pending = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.defender);
    const unit = pending.cards[s.refs[which]!]!,
      original = unit.controller;
    changeControl(pending, unit, original === 'alice' ? 'bob' : 'alice');
    changeControl(pending, unit, original);
    expect(pending.attacks[0]!.removedFromCombat).toHaveLength(1);
    resume(pending, choose(pending, 'accept-effect'));
    const done = step(pending, 'accept-effect');
    expect(done.cards[s.refs.attacker!]!.damage).toBe(0);
    expect(done.cards[s.refs.defender!]!.damage).toBe(0);
  }
});

test('Galen’s optional controller change immediately reverses which units receive Raid and Saboteur', () => {
  const p = playCard('galen-erso--destroying-his-creation');
  p.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'theirs' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(effectiveAbilities(choice, choice.cards[s.refs.theirs!]!).raid).toBe(1);
  expect(effectiveAbilities(choice, choice.cards[s.refs.ours!]!).raid).toBe(0);
  resume(
    choice,
    choose(choice, i => i.kind === 'choose-mode' && i.mode === 'give-control'),
  );
  const done = step(choice, i => i.kind === 'choose-mode' && i.mode === 'give-control');
  expect(done.cards[s.refs.played!]!.controller).toBe('bob');
  expect(done.cards[s.refs.played!]!.exhausted).toBe(true);
  expect(effectiveAbilities(done, done.cards[s.refs.ours!]!).keywords).toContain('Saboteur');
  expect(effectiveAbilities(done, done.cards[s.refs.theirs!]!).raid).toBe(0);
  expect(
    step(choice, i => i.kind === 'choose-mode' && i.mode === 'keep-control').cards[s.refs.played!]!
      .controller,
  ).toBe('alice');
});

test('Victor’s aura and Clone Combat Squadron recalculate after departure, including cascading defeats', () => {
  const p = playCard('no-glory--only-results');
  p.players[0].space = [
    { card: 'victor-leader--leading-from-the-front', ref: 'victor' },
    { card: 'clone-combat-squadron', ref: 'clone', damage: 5 },
    { card: ids.fighter, ref: 'fighter', damage: 1 },
  ];
  const s = scenario(p);
  expect(unitStats(s.state, s.state.cards[s.refs.victor!]!)).toMatchObject({ power: 2, hp: 4 });
  expect(unitStats(s.state, s.state.cards[s.refs.clone!]!)).toMatchObject({ power: 6, hp: 6 });
  expect(unitStats(s.state, s.state.cards[s.refs.fighter!]!)).toMatchObject({ power: 3, hp: 2 });
  const done = target(step(s.state, 'play'), s.refs.victor!);
  for (const name of ['victor', 'clone', 'fighter'])
    expect(done.cards[s.refs[name]!]!.zone).toBe('discard');
});

test('Poe removes printed and granted Sentinel, which also removes Kylo’s dependent HP bonus', () => {
  const p = playCard('poe-dameron--i-ll-come-back-for-you');
  p.players[1].space = [{ card: 'kylo-ren-s-command-shuttle--icon-of-authority', ref: 'shuttle' }];
  p.players[1].ground = [
    { card: 'imperial-armored-commando', ref: 'sentinel', damage: 4 },
    { card: ids.marine, ref: 'normal' },
  ];
  const s = scenario(p);
  expect(unitStats(s.state, s.state.cards[s.refs.sentinel!]!).hp).toBe(5);
  expect(unitStats(s.state, s.state.cards[s.refs.normal!]!).hp).toBe(3);
  const done = step(s.state, 'play');
  expect(done.cards[s.refs.sentinel!]!.zone).toBe('discard');
  expect(effectiveAbilities(done, done.cards[s.refs.played!]!).keywords).not.toContain('Sentinel');
  const q = position();
  q.players[0].ground = [{ card: 'poe-dameron--i-ll-come-back-for-you', ref: 'poe' }];
  q.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  q.attachments = [{ card: 'academy-graduate', unit: 'ship', owner: 'bob', ref: 'pilot' }];
  const t = scenario(q);
  expect(effectiveAbilities(t.state, t.state.cards[t.refs.ship!]!).keywords).not.toContain(
    'Sentinel',
  );
});

test('Hidden applies only to this phase’s entries, with Sentinel overriding protection and Poe removing that override', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [
    { card: 'grand-inquisitor--you-re-right-to-be-afraid', ref: 'inquisitor' },
    { card: 'ninth-sister--hulking-inquisitor', ref: 'hidden' },
    { card: 'marrok--mysterious-warrior', ref: 'sentinel' },
  ];
  p.enteredThisPhase = ['inquisitor', 'hidden', 'sentinel'];
  const s = scenario(p);
  expect(
    s.state.execution.decision!.options.filter(o => o.intent.kind === 'attack').map(o => o.intent),
  ).toEqual([{ kind: 'attack', attacker: s.refs.attacker!, defender: s.refs.sentinel! }]);
  p.players[0].ground!.push({ card: 'poe-dameron--i-ll-come-back-for-you', ref: 'poe' });
  const t = scenario(p);
  expect(
    t.state.execution
      .decision!.options.filter(o => o.intent.kind === 'attack')
      .every(o => o.intent.kind === 'attack' && o.intent.defender === t.state.players.bob!.base),
  ).toBe(true);
  const next = nextRound(t.state);
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === t.refs.hidden,
    ),
  ).toBe(true);
});

test('Anakin enters Hidden, shields another friendly unit and cannot be attacked this phase', () => {
  const p = playCard('anakin-skywalker--you-were-right-about-me');
  p.players[0].ground = [{ card: ids.marine, ref: 'ours' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.ours! },
  ]);
  const done = target(choice, s.refs.ours!);
  expect(upgrades(done, s.refs.ours!)).toEqual(['shield']);
  expect(
    done.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === s.refs.played,
    ),
  ).toBe(false);
  expect(effectiveAbilities(done, done.cards[s.refs.played!]!).keywords).toEqual([
    'Hidden',
    'Saboteur',
  ]);
});

test('Punishing One updates Raid as its attack ability damages an additional enemy unit', () => {
  const p = position();
  p.players[0].space = [{ card: 'punishing-one--takes-no-prisoners', ref: 'ship' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'damaged', damage: 1 },
    { card: ids.marine, ref: 'fresh' },
  ];
  p.players[1].space = [{ card: 'hunting-aggressor', ref: 'space', damage: 1 }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.state.players.bob!.base);
  expect(unitStats(choice, choice.cards[s.refs.ship!]!).power).toBe(5);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.fresh),
  );
  const done = target(choice, s.refs.fresh!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(6);
  expect(unitStats(done, done.cards[s.refs.ship!]!).power).toBe(3);
});

test('Vonreg cannot bootstrap Raid from five power, but gains it at six and loses the attack bonus afterward', () => {
  for (let n = 0; n <= 3; n++) {
    const p = position();
    p.players[0].space = [
      { card: 'vonreg-s-tie-interceptor--ace-of-the-first-order', ref: 'ship' },
    ];
    p.attachments = Array.from({ length: n }, (_, i) => ({
      card: 'experience',
      unit: 'ship',
      ref: 'xp' + i,
    }));
    const s = scenario(p),
      abilities = effectiveAbilities(s.state, s.state.cards[s.refs.ship!]!);
    expect(abilities.keywords?.includes('Overwhelm')).toBe(n >= 1);
    expect(abilities.raid).toBe(n === 3 ? 1 : 0);
    const done = step(
      s.state,
      i => i.kind === 'attack' && i.defender === s.state.players.bob!.base,
    );
    expect(done.cards[done.players.bob!.base]!.damage).toBe(3 + n + (n === 3 ? 1 : 0));
    expect(unitStats(done, done.cards[s.refs.ship!]!).power).toBe(3 + n);
  }
});

test('the Falcon permits a second Pilot, counts their separate power contributions and rejects a third', () => {
  const p = playCard('academy-graduate');
  p.players[0].space = [{ card: 'millennium-falcon--get-out-and-push', ref: 'falcon' }];
  p.players[0].hand!.push(
    { card: 'academy-graduate', ref: 'second' },
    { card: 'academy-graduate', ref: 'third' },
  );
  const s = scenario(p);
  const pilot = (state: GameState, id: string) =>
    step(
      state,
      i => i.kind === 'play' && i.card === id && !!i.piloting && i.target === s.refs.falcon,
    );
  const first = pilot(s.state, s.refs.played!),
    second = pilot(step(first, 'pass'), s.refs.second!);
  expect(upgrades(second, s.refs.falcon!)).toEqual(['academy-graduate', 'academy-graduate']);
  expect(unitStats(second, second.cards[s.refs.falcon!]!)).toMatchObject({ power: 7, hp: 8 });
  const third = step(second, 'pass');
  expect(
    third.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === s.refs.third && !!o.intent.piloting,
    ),
  ).toBe(false);
  expect(() => decodeState(encodeState(second))).not.toThrow();
});

test('Gauntlet’s granted defeated triggers survive its simultaneous defeat and exclude token units', () => {
  const p = playCard('turbolaser-salvo');
  p.players[0].space = [{ card: 'ravager--final-imperial-command', ref: 'gunner' }];
  p.players[1].space = [
    { card: 'bo-katan-s-gauntlet--reinforce-from-above', ref: 'gauntlet' },
    { card: ids.fighter, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
    { card: 'x-wing', ref: 'token' },
  ];
  const s = scenario(p),
    arena = step(s.state, 'play');
  const chooseSpace = step(arena, i => i.kind === 'choose-mode' && i.mode === 'space');
  const batch = target(chooseSpace, s.refs.gunner!);
  expect(batch.cards[s.refs.gauntlet!]!.zone).toBe('discard');
  expect(batch.cards[s.refs.token!]!.zone).toBe('set-aside');
  expect(batch.execution.decision!.kind).toBe('trigger');
  expect(batch.execution.decision!.options).toHaveLength(2);
  resume(batch, choose(batch, 'trigger'));
  const done = step(batch, 'trigger');
  const tokens = done.ground.map(id => done.cards[id]!).filter(c => c.cardId === 'mandalorian');
  expect(tokens).toHaveLength(2);
  expect(
    tokens.every(c => c.controller === 'bob' && upgrades(done, c.instanceId).includes('shield')),
  ).toBe(true);
});

test('a generic granted attack retains its checkpoint during a different On Attack decision', () => {
  const p = playCard('commence-the-festivities');
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'attacker' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.attacker!);
  const batch = step(choice, i => i.kind === 'attack' && i.defender === choice.players.bob!.base);
  const pending = trigger(batch, 'on-attack');
  expect(pending.execution.decision!.kind).toBe('effect');
  resume(pending, choose(pending, 'accept-effect'));
  const done = step(pending, 'accept-effect');
  expect(effectiveAbilities(done, done.cards[s.refs.attacker!]!).keywords).not.toContain(
    'Saboteur',
  );
});

test('Black One’s attack ability recognizes the implemented Poe unit', () => {
  const p = position();
  p.players[0].ground = [{ card: 'poe-dameron--i-ll-come-back-for-you', ref: 'poe' }];
  p.players[0].space = [{ card: 'black-one--straight-at-them', ref: 'black' }];
  const s = scenario(p),
    choice = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.black &&
        i.defender === s.state.players.bob!.base,
    );
  expect(choice.execution.decision!.kind).toBe('effect');
  const done = target(choice, s.refs.poe!);
  expect(done.cards[s.refs.poe!]!.damage).toBe(1);
});

test('Support borrows an aura with the attacking host as its relative source', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'merrin--alone-with-the-dead', ref: 'borrower' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[0].space = [{ card: 'bo-katan-s-gauntlet--reinforce-from-above', ref: 'original' }];
  const s = scenario(p),
    pending = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.borrower &&
        i.defender === s.state.players.bob!.base,
    );
  pending.attacks[0]!.grantedAbilities.push(
    ...supportOrigins(pending, pending.cards[s.refs.original!]!),
  );
  const defeatedTriggers = (id: string) =>
    effectiveAbilities(pending, pending.cards[id]!).triggers!.filter(t => t.timing === 'defeated');
  expect(defeatedTriggers(s.refs.borrower!)).toHaveLength(1);
  expect(defeatedTriggers(s.refs.original!)).toHaveLength(1);
  expect(defeatedTriggers(s.refs.other!)).toHaveLength(2);
  resume(pending, choose(pending, 'accept-effect'));
});
