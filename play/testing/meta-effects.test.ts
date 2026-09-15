import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
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
function playCard(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 30 && s.round === round && !s.result; n++) {
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
function trigger(s: GameState, id: string) {
  const frame = s.execution.frames[0];
  if (frame?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = frame.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}

test('v8 §7.7: temporary reductions affect power and HP, ignore Shields, stack and expire before regroup', () => {
  const p = playCard('incapacitate');
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  p.attachments = [{ card: 'shield', unit: 'unit', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const choice = step(state, 'play');
  resume(choice, choose(choice, 'target'));
  const reduced = target(choice, refs.unit!);
  expect(unitStats(reduced, reduced.cards[refs.unit!]!)).toEqual({ power: 1, hp: 5 });
  expect(reduced.cards[refs.unit!]!.damage).toBe(0);
  expect(attachedUpgrades(reduced, reduced.cards[refs.unit!]!)).toHaveLength(1);
  const restored = nextRound(reduced);
  expect(unitStats(restored, restored.cards[refs.unit!]!)).toEqual({ power: 3, hp: 7 });
  expect(restored.lastingEffects).toEqual([]);
  p.players[1].ground = [{ card: ids.marine, ref: 'unit', damage: 1 }];
  const lethal = scenario(p);
  const after = target(step(lethal.state, 'play'), lethal.refs.unit!);
  expect(after.cards[lethal.refs.unit!]!.zone).toBe('discard');
  expect(after.cards[lethal.refs.shield!]!.zone).toBe('set-aside');
});

test('Knowledge and Defense draws after its reduction and still draws with no units; Out the Airlock defeats through HP loss', () => {
  const p = playCard('knowledge-and-defense');
  p.players[0].ground = [{ card: 'ant-droid', ref: 'ant' }];
  const { state, refs } = scenario(p);
  const after = target(step(state, 'play'), refs.ant!);
  expect(after.players.alice!.hand).toHaveLength(2); // Event draw, then the defeated Ant's draw.
  expect(after.facts.filter(f => f.type === 'drawn' && f.audience === 'public')).toHaveLength(2);
  p.players[0].ground = [];
  const empty = scenario(p);
  expect(step(empty.state, 'play').players.alice!.hand).toHaveLength(1);
  const air = playCard('out-the-airlock');
  air.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  const a = scenario(air);
  expect(target(step(a.state, 'play'), a.refs.unit!).cards[a.refs.unit!]!.zone).toBe('discard');
});

test('Anakin has two independently ordered discard conditions, two optional targets, and cumulative phase reductions', () => {
  const p = playCard('anakin-skywalker--champion-of-mortis');
  p.players[0].discard = [{ card: ids.marine }, { card: ids.fighter }];
  const { state, refs } = scenario(p);
  const first = trigger(step(state, 'play'), 'discard-villainy');
  expect(first.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
    true,
  );
  const second = target(first, refs.played!);
  expect(unitStats(second, second.cards[refs.played!]!)).toEqual({ power: 2, hp: 4 });
  resume(
    second,
    choose(second, i => i.kind === 'target' && i.card === refs.played),
  );
  const after = target(second, refs.played!);
  expect(unitStats(after, after.cards[refs.played!]!)).toEqual({ power: 0, hp: 1 });
  expect(unitStats(nextRound(after), after.cards[refs.played!]!)).toEqual({ power: 5, hp: 7 });
  p.players[0].discard = [];
  const absent = scenario(p);
  expect(trigger(step(absent.state, 'play'), 'discard-villainy').execution.decision!.kind).toBe(
    'action',
  );
});

test('Cyborg Mech offers both modes, targets only the matching ground unit, and Grit reads damage before simultaneous combat', () => {
  const p = playCard('the-cyborg-mech--mysterious-threat');
  p.players[1].ground = [
    { card: ids.consular, ref: 'damaged', damage: 1 },
    { card: ids.consular, ref: 'undamaged' },
  ];
  p.players[1].space = [{ card: 'jedi-starfighter', ref: 'space', damage: 1 }];
  const { state, refs } = scenario(p);
  const modes = step(state, 'play');
  const view = new Projector(modes.gameId, { role: 'player', playerId: 'alice' }).project(modes);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  expect(view.decision!.options.map(o => o.mode)).toEqual([
    'damage-an-undamaged-unit',
    'damage-a-damaged-unit',
  ]);
  const damaged = step(modes, i => i.kind === 'choose-mode' && i.mode === 'damage-a-damaged-unit');
  expect(damaged.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.damaged! },
  ]);
  expect(target(damaged, refs.damaged!).cards[refs.damaged!]!.damage).toBe(6);
  const undamaged = step(
    modes,
    i => i.kind === 'choose-mode' && i.mode === 'damage-an-undamaged-unit',
  );
  expect(undamaged.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.undamaged! },
    { kind: 'target', card: refs.played! },
  ]);
  resume(
    undamaged,
    choose(undamaged, i => i.kind === 'target' && i.card === refs.played),
  );
  const self = target(undamaged, refs.played!);
  expect(unitStats(self, self.cards[refs.played!]!).power).toBe(5);
  p.players[0].hand = [];
  p.players[0].ground = [{ card: 'the-cyborg-mech--mysterious-threat', ref: 'mech', damage: 1 }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const combat = scenario(p);
  const after = step(combat.state, i => i.kind === 'attack' && i.defender === combat.refs.defender);
  expect(after.cards[combat.refs.defender!]!.damage).toBe(4);
  expect(after.cards[combat.refs.mech!]!.damage).toBe(4);
  expect(unitStats(after, after.cards[combat.refs.mech!]!).power).toBe(7);
});

test('Huyang can reduce only upgraded units, clamps power at zero, and the effect expires', () => {
  const p = position();
  p.players[0].ground = [{ card: 'huyang--your-aptitude-falls-short', ref: 'huyang' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'upgraded' }, { card: ids.marine }];
  p.attachments = [{ card: 'experience', unit: 'upgraded' }];
  const { state, refs } = scenario(p);
  const choice = step(state, 'attack');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.upgraded! },
    { kind: 'decline-effect' },
  ]);
  const after = target(choice, refs.upgraded!);
  expect(unitStats(after, after.cards[refs.upgraded!]!).power).toBe(0);
  expect(unitStats(nextRound(after), after.cards[refs.upgraded!]!).power).toBe(4);
});

test('Yaddle restores her own base and grants Restore to each other friendly Jedi until phase end', () => {
  const p = position();
  p.players[0].base.damage = 6;
  p.players[0].ground = [
    { card: 'yaddle--a-chance-to-make-things-right', ref: 'yaddle' },
    { card: 'gungi--finding-himself', ref: 'jedi' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: 'gungi--finding-himself', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const choice = step(
    state,
    i =>
      i.kind === 'attack' && i.attacker === refs.yaddle && i.defender === state.players.bob!.base,
  );
  let after = trigger(choice, 'on-attack');
  expect(after.cards[after.players.alice!.base]!.damage).toBe(5);
  expect(effectiveAbilities(after, after.cards[refs.jedi!]!).restore).toBe(1);
  expect(effectiveAbilities(after, after.cards[refs.other!]!).restore).toBe(0);
  expect(effectiveAbilities(after, after.cards[refs.enemy!]!).restore).toBe(0);
  after = step(after, 'pass');
  after = step(
    after,
    i => i.kind === 'attack' && i.attacker === refs.jedi && i.defender === after.players.bob!.base,
  );
  expect(after.cards[after.players.alice!.base]!.damage).toBe(4);
  expect(effectiveAbilities(nextRound(after), after.cards[refs.jedi!]!).restore).toBe(0);
});

test('T-6 binds its buff and optional attack to one exact unit, and expiring HP can defeat that unit before regroup draws', () => {
  const p = position();
  p.players[0].space = [{ card: 't-6-shuttle-1974--with-a-mentor-s-dedication', ref: 'shuttle' }];
  p.players[0].ground = [
    { card: ids.marine, ref: 'chosen' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const targets = step(state, i => i.kind === 'use-ability' && i.card === refs.shuttle);
  expect(
    targets.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.shuttle,
    ),
  ).toBe(false);
  const attack = target(targets, refs.chosen!);
  expect(attack.cards[refs.shuttle!]!.exhausted).toBe(true);
  expect(
    attack.execution
      .decision!.options.filter(o => o.intent.kind === 'attack')
      .every(o => o.intent.kind === 'attack' && o.intent.attacker === refs.chosen),
  ).toBe(true);
  const input = choose(attack, i => i.kind === 'attack' && i.defender === refs.enemy);
  resume(attack, input);
  const after = advance(attack, input).state;
  expect(after.cards[refs.chosen!]!.damage).toBe(3);
  expect(after.cards[refs.chosen!]!.zone).toBe('ground');
  expect(unitStats(after, after.cards[refs.other!]!)).toEqual({ power: 3, hp: 3 });
  const regroup = nextRound(after);
  expect(regroup.cards[refs.chosen!]!.zone).toBe('discard');
  const defeated = regroup.facts.findIndex(
    f => f.type === 'defeated' && f.cards[0]!.instanceId === refs.chosen,
  );
  const drawn = regroup.facts.findIndex(f => f.type === 'drawn');
  expect(defeated).toBeLessThan(drawn);
  const bad = structuredClone(attack);
  const frame = bad.execution.frames[0];
  if (frame?.kind !== 'effect') throw new Error('Expected bound attack');
  frame.bindings!.chosen!.cardId = ids.fighter;
  expect(() => decodeState(encodeState(bad))).toThrow('binding');
});

test('The Axe Forgets returns the chosen copy without its upgrades or damage and hides its new hand identity', () => {
  const p = playCard('the-axe-forgets');
  p.players[1].ground = [
    { card: ids.marine, ref: 'first', damage: 1 },
    { card: ids.marine, ref: 'second' },
  ];
  p.attachments = [{ card: 'shield', unit: 'first', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const after = target(step(state, 'play'), refs.first!);
  expect(after.cards[refs.first!]!.zone).toBe('hand');
  expect(after.cards[refs.first!]!.damage).toBe(0);
  expect(after.cards[refs.second!]!.zone).toBe('ground');
  expect(after.cards[refs.shield!]!.zone).toBe('set-aside');
  const view = new Projector(after.gameId, { role: 'player', playerId: 'alice' }).project(after);
  expect(view.cards.some(c => c.zone === 'hand' && c.owner === 'bob')).toBe(false);
  expect(view.events.find(e => e.type === 'returned-to-hand')!.cards[1]!.currentCardId).toBeNull();
});

test('The Tree Remembers removes defeat triggers, keeps upgrade abilities, and blocks later Support grants until expiry', () => {
  const p = playCard('the-tree-remembers');
  p.players[1].ground = [{ card: 'nightsister-warrior', ref: 'small' }];
  const small = scenario(p);
  const defeated = target(step(small.state, 'play'), small.refs.small!);
  expect(defeated.cards[small.refs.small!]!.zone).toBe('discard');
  expect(defeated.players.bob!.hand).toHaveLength(0);
  p.players[1].ground = [{ card: 'the-cyborg-mech--mysterious-threat', ref: 'big', damage: 1 }];
  p.players[1].hand = [{ card: 'unsanctioned-patrol', ref: 'support' }];
  p.players[1].resources = resources();
  p.players[0].ground = [
    { card: 'droid-laser-turret', ref: 'sentinel' },
    { card: ids.consular, ref: 'other' },
  ];
  p.attachments = [{ card: 'shield', unit: 'big', ref: 'shield' }];
  const large = scenario(p);
  const silenced = target(step(large.state, 'play'), large.refs.big!);
  expect(unitStats(silenced, silenced.cards[large.refs.big!]!).power).toBe(3);
  expect(attachedUpgrades(silenced, silenced.cards[large.refs.big!]!)).toHaveLength(1);
  const support = step(silenced, i => i.kind === 'play' && i.card === large.refs.support);
  const attacks = support.execution
    .decision!.options.map(o => o.intent)
    .filter(i => i.kind === 'attack');
  expect(attacks).toEqual([
    { kind: 'attack', attacker: large.refs.big!, defender: large.refs.sentinel! },
  ]);
  const restored = nextRound(step(support, 'decline-effect'));
  expect(effectiveAbilities(restored, restored.cards[large.refs.big!]!).keywords).toContain('Grit');
});

test('Ahsoka leader action compares against any friendly unit; her deployed Support trigger compares the recipient to itself', () => {
  const p = position();
  p.players[0].leader = { card: 'ahsoka-tano--trust-in-the-force', ref: 'ahsoka' };
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'fighter' }];
  p.players[0].resources = resources();
  p.players[1].ground = [{ card: ids.trooper, ref: 'equal' }];
  const { state, refs } = scenario(p);
  const leader = step(state, i => i.kind === 'use-ability' && i.abilityId === 'boost-unit');
  expect(leader.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.fighter! },
  ]);
  expect(unitStats(target(leader, refs.fighter!), state.cards[refs.fighter!]!).power).toBe(4);
  const support = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const attack = step(
    support,
    i =>
      i.kind === 'attack' && i.attacker === refs.marine && i.defender === support.players.bob!.base,
  );
  expect(attack.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.fighter! },
    { kind: 'decline-effect' },
  ]);
  const after = target(attack, refs.fighter!);
  expect(unitStats(after, after.cards[refs.fighter!]!).power).toBe(4);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(3);
});

test('Jyn mode choices target exact units, and mode/target choices survive recovery without leaking private hands', () => {
  const p = playCard('jyn-erso--take-the-next-chance');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const modes = step(state, 'play');
  const input = choose(modes, i => i.kind === 'choose-mode' && i.mode === 'give-experience');
  resume(modes, input);
  const after = target(advance(modes, input).state, refs.enemy!);
  expect(attachedUpgrades(after, after.cards[refs.enemy!]!).map(c => c.cardId)).toEqual([
    'experience',
  ]);
  const exhausted = target(
    step(modes, i => i.kind === 'choose-mode' && i.mode === 'exhaust-unit'),
    refs.enemy!,
  );
  expect(exhausted.cards[refs.enemy!]!.exhausted).toBe(true);
  const secret = structuredClone(modes);
  secret.cards[secret.players.alice!.deck[0]!]!.cardId = ids.fighter;
  const key = 'b'.repeat(64);
  expect(new Projector(modes.gameId, { role: 'spectator' }, key).project(modes)).toEqual(
    new Projector(secret.gameId, { role: 'spectator' }, key).project(secret),
  );
});

test('conditional entry and ready triggers evaluate their printed counts at the correct time', () => {
  for (const card of [
    'corellian-hounds',
    'rose-tico--now-it-s-worth-it',
    'special-forces-tie-fighter',
    'crackshot-v-wing',
  ]) {
    for (const condition of [false, true]) {
      const p = playCard(card);
      if (card === 'corellian-hounds' && !condition) p.players[1].ground = [{ card: ids.marine }];
      if (card === 'rose-tico--now-it-s-worth-it' && condition)
        p.players[0].ground = [{ card: ids.marine }];
      if (card === 'special-forces-tie-fighter')
        p.players[1].space = Array.from({ length: condition ? 2 : 1 }, () => ({
          card: ids.fighter,
        }));
      if (card === 'crackshot-v-wing' && !condition) p.players[0].space = [{ card: ids.fighter }];
      const { state, refs } = scenario(p);
      const after = step(state, 'play');
      if (card === 'crackshot-v-wing')
        expect(after.cards[refs.played!]!.damage).toBe(condition ? 1 : 0);
      else expect(after.cards[refs.played!]!.exhausted).toBe(!condition);
    }
  }
});

test('Death Space Skirmisher needs another friendly space unit, and Blue Ace readies only an exhausted enemy unit', () => {
  const p = playCard('death-space-skirmisher');
  const empty = scenario(p);
  expect(step(empty.state, 'play').execution.decision!.kind).toBe('action');
  p.players[0].space = [{ card: ids.fighter }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const enabled = scenario(p);
  const choice = step(enabled.state, 'play');
  expect(choice.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
    true,
  );
  expect(target(choice, enabled.refs.enemy!).cards[enabled.refs.enemy!]!.exhausted).toBe(true);
  const b = position();
  b.players[0].space = [
    { card: 'blue-ace--colorful-racer', ref: 'blue' },
    { card: ids.fighter, exhausted: true },
  ];
  b.players[1].ground = [{ card: ids.marine, exhausted: true, ref: 'enemy' }, { card: ids.marine }];
  const blue = scenario(b);
  const ready = step(blue.state, 'attack');
  expect(ready.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: blue.refs.enemy! },
  ]);
  expect(target(ready, blue.refs.enemy!).cards[blue.refs.enemy!]!.exhausted).toBe(false);
});

test('Kill Switch exhausts its attached unit; Piercing Shot removes all its Shields before dealing damage', () => {
  const p = playCard('kill-switch');
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const { state, refs } = scenario(p);
  expect(step(state, 'play').cards[refs.unit!]!.exhausted).toBe(true);
  const q = playCard('piercing-shot');
  q.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  q.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'unit', ref: `shield${n}` }));
  const shields = scenario(q);
  const after = target(step(shields.state, 'play'), shields.refs.unit!);
  expect(after.cards[shields.refs.unit!]!.damage).toBe(3);
  expect(attachedUpgrades(after, after.cards[shields.refs.unit!]!)).toHaveLength(0);
});
