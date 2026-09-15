import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { playCost } from '../engine/state.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const baseAttack = (s: GameState, attacker = s.players.alice!.leader) =>
  step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === s.players.bob!.base,
  );
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const units = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && c.zone === 'ground' && !c.attachedTo);
function board(leader: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: leader, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = resources();
  p.players[0].base.damage = 5;
  return p;
}
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
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
function searchDone(s: GameState, id: string) {
  s = step(s, 'search', [id]);
  const r = s.execution.random!;
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(() => 0),
  }).state;
}
function pending(s: GameState) {
  while (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
  return s;
}

test('Ahsoka Snips has no Coordinate action below three units; her attack bonus persists when the attacker is defeated', () => {
  const p = board('ahsoka-tano--snips');
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  let g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  p.players[0].space = [{ card: ids.fighter }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  g = scenario(p);
  const choice = use(g.state);
  resume(
    choice,
    choose(
      choice,
      i => i.kind === 'attack' && i.attacker === g.refs.one && i.defender === g.refs.enemy,
    ),
  );
  const done = step(
    choice,
    i => i.kind === 'attack' && i.attacker === g.refs.one && i.defender === g.refs.enemy,
  );
  expect(done.cards[g.refs.enemy!]!.damage).toBe(4);
  expect(done.cards[g.refs.one!]!.zone).toBe('discard');
});
test('Ahsoka Snips unit counts herself, including exhausted companions, and loses her bonus below three', () => {
  const p = board('ahsoka-tano--snips', true);
  p.players[0].ground = [{ card: ids.marine }, { card: ids.marine, exhausted: true }];
  let s = scenario(p).state;
  expect(unitStats(s, s.cards[s.players.alice!.leader]!).power).toBe(5);
  p.players[0].ground!.pop();
  s = scenario(p).state;
  expect(unitStats(s, s.cards[s.players.alice!.leader]!).power).toBe(3);
});
for (const deployed of [false, true])
  test(`Padme Serving the Republic ${deployed ? 'unit' : 'front'} searches only the top three Republic cards with Coordinate`, () => {
    const p = board('padm--amidala--serving-the-republic', deployed);
    p.players[0].ground = resources(deployed ? 2 : 3);
    p.players[0].deck = [
      { card: ids.marine, ref: 'wrong' },
      { card: 'inspector-s-shuttle', ref: 'right' },
      { card: ids.consular },
      { card: 'inspector-s-shuttle', ref: 'deep' },
    ];
    const g = scenario(p),
      s = pending(deployed ? baseAttack(g.state) : use(g.state));
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.right!]);
    resume(s, choose(s, 'search', [g.refs.right!]));
    const done = pending(searchDone(s, g.refs.right!));
    expect(done.players.alice!.hand).toEqual([g.refs.right!]);
    expect(ready(done)).toBe(deployed ? 12 : 11);
    if (deployed) expect(done.cards[done.players.alice!.base]!.damage).toBe(4);
  });
test('Padme Coordinate unit does not search with fewer than three, while Restore still applies', () => {
  const p = board('padm--amidala--serving-the-republic', true);
  const s = baseAttack(scenario(p).state);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
});
test('Captain Rex remembers a friendly attacker that died and creates the Clone only after paying two resources', () => {
  const p = board('captain-rex--fighting-for-his-brothers');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  expect(units(use(g.state), 'clone-trooper')).toHaveLength(0);
  let s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.enemy,
  );
  s = step(s, 'pass');
  s = use(s);
  expect(units(s, 'clone-trooper')).toHaveLength(1);
  expect(units(s, 'clone-trooper')[0]!.exhausted).toBe(true);
  expect(ready(s)).toBe(10);
});
test('Rex deployment creates a Clone and boosts only other friendly Troopers', () => {
  const p = board('captain-rex--fighting-for-his-brothers');
  p.players[1].ground = [{ card: 'clone-trooper', ref: 'enemy' }];
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const clone = units(s, 'clone-trooper').find(c => c.controller === 'alice')!;
  expect(unitStats(s, clone)).toEqual({ power: 2, hp: 3 });
  expect(unitStats(s, s.cards[g.refs.enemy!]!).hp).toBe(2);
  expect(unitStats(s, s.cards[s.players.alice!.leader]!).hp).toBe(6);
});
for (const n of [1, 2])
  test(`Nute counts ${n} friendly defeated units independently of their current discard copies`, () => {
    const p = board('nute-gunray--vindictive-viceroy');
    p.players[0].discard = Array.from({ length: n }, (_, i) => ({
      card: ids.marine,
      ref: `d${i}`,
    }));
    p.defeatedThisPhase = p.players[0].discard.map(c => c.ref!);
    const s = use(scenario(p).state);
    expect(units(s, 'battle-droid')).toHaveLength(n === 2 ? 1 : 0);
  });
test('Nute unit creates an exhausted Droid on attack without a prior defeat condition', () => {
  const s = baseAttack(scenario(board('nute-gunray--vindictive-viceroy', true)).state);
  expect(units(s, 'battle-droid')).toHaveLength(1);
  expect(units(s, 'battle-droid')[0]!.exhausted).toBe(true);
});
for (const deployed of [false, true])
  test(`Krennic ${deployed ? 'unit' : 'front'} boosts friendly damaged units only`, () => {
    const p = board('director-krennic--aspiring-to-authority', deployed);
    p.players[0].ground = [
      { card: ids.consular, damage: 1, ref: 'hurt' },
      { card: ids.consular, ref: 'healthy' },
    ];
    p.players[1].ground = [{ card: ids.consular, damage: 1, ref: 'enemy' }];
    const g = scenario(p);
    expect(unitStats(g.state, g.state.cards[g.refs.hurt!]!).power).toBe(4);
    expect(unitStats(g.state, g.state.cards[g.refs.healthy!]!).power).toBe(3);
    expect(unitStats(g.state, g.state.cards[g.refs.enemy!]!).power).toBe(3);
    if (deployed) {
      const s = baseAttack(g.state);
      expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
    }
  });
test('Leia Transports front heals one friendly unit after paying one resource', () => {
  const p = board('leia-organa--get-to-your-transports-');
  p.players[0].ground = [{ card: ids.consular, damage: 2, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, damage: 2, ref: 'enemy' }];
  const g = scenario(p),
    s = use(g.state);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
    ),
  ).toBe(false);
  const done = target(s, g.refs.own!);
  expect(done.cards[g.refs.own!]!.damage).toBe(1);
  expect(ready(done)).toBe(11);
});
test('Leia Transports unit retains the first exact copy and heals a different friendly unit', () => {
  const p = board('leia-organa--get-to-your-transports-', true);
  p.players[0].ground = [
    { card: ids.consular, damage: 2, ref: 'one' },
    { card: ids.consular, damage: 2, ref: 'two' },
  ];
  const g = scenario(p);
  const s = target(baseAttack(g.state), g.refs.one!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.one,
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.two),
  );
  const done = target(s, g.refs.two!);
  expect(done.cards[g.refs.one!]!.damage).toBe(1);
  expect(done.cards[g.refs.two!]!.damage).toBe(1);
});
test('Pryce front may ready an enemy token unit and does not select a Shield upgrade', () => {
  const p = board('governor-pryce--tyrant-of-lothal');
  p.players[1].ground = [{ card: 'clone-trooper', exhausted: true, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p),
    s = use(g.state);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.enemy! },
  ]);
  const done = target(s, g.refs.enemy!);
  expect(done.cards[g.refs.enemy!]!.exhausted).toBe(false);
  expect(ready(done)).toBe(11);
});
test('Pryce unit counts only ready friendly token units and creates an exhausted Spy on attack', () => {
  const p = board('governor-pryce--tyrant-of-lothal', true);
  p.players[0].ground = [{ card: 'clone-trooper' }, { card: 'clone-trooper', exhausted: true }];
  p.players[1].ground = [{ card: 'clone-trooper' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.state.players.alice!.leader]!).power).toBe(5);
  const done = baseAttack(g.state);
  expect(units(done, 'spy')).toHaveLength(1);
  expect(units(done, 'spy')[0]!.exhausted).toBe(true);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
});
test('Obi-Wan front can heal either player without creating his unit-side damage effect', () => {
  const p = board('obi-wan-kenobi--patient-mentor');
  p.players[1].ground = [{ card: ids.consular, damage: 2, ref: 'enemy' }];
  const g = scenario(p),
    done = target(use(g.state), g.refs.enemy!);
  expect(done.cards[g.refs.enemy!]!.damage).toBe(1);
  expect(done.execution.decision!.kind).toBe('action');
});
for (const damage of [0, 1])
  test(`Obi-Wan unit deals follow-up damage only after actually healing (${damage})`, () => {
    const p = board('obi-wan-kenobi--patient-mentor', true);
    p.players[0].ground = [{ card: ids.consular, damage, ref: 'heal' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = target(baseAttack(g.state), g.refs.heal!);
    if (damage) {
      expect(
        s.execution.decision!.options.some(
          o => o.intent.kind === 'target' && o.intent.card === g.refs.heal,
        ),
      ).toBe(false);
      s = target(s, g.refs.enemy!);
    }
    expect(s.cards[g.refs.enemy!]!.damage).toBe(damage ? 1 : 0);
    expect(s.execution.decision!.kind).toBe('action');
  });
for (const damage of [3, 4])
  test(`Mace front reevaluates five damage after its first hit (${damage})`, () => {
    const p = board('mace-windu--vaapad-form-master');
    p.players[1].ground = [{ card: ids.consular, damage, ref: 'enemy' }];
    const g = scenario(p),
      s = target(use(g.state), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(damage === 3 ? 4 : 6);
    expect(ready(s)).toBe(11);
  });
test('Mace deployment damages every already damaged enemy unit, excluding healthy and friendly units', () => {
  const p = board('mace-windu--vaapad-form-master');
  p.players[0].ground = [{ card: ids.consular, damage: 1, ref: 'own' }];
  p.players[1].ground = [
    { card: ids.consular, damage: 1, ref: 'one' },
    { card: ids.consular, damage: 2, ref: 'two' },
    { card: ids.consular, ref: 'healthy' },
  ];
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(s.cards[g.refs.one!]!.damage).toBe(3);
  expect(s.cards[g.refs.two!]!.damage).toBe(4);
  expect(s.cards[g.refs.healthy!]!.damage).toBe(0);
  expect(s.cards[g.refs.own!]!.damage).toBe(1);
});
test('Luke front selects only Heroism units he played this phase, distinguishing the opponent and old copies', () => {
  const p = board('luke-skywalker--faithful-friend');
  p.players[0].hand = [{ card: ids.marine, ref: 'mine' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'old' }];
  p.players[1].resources = resources();
  p.players[1].hand = [{ card: ids.marine, ref: 'theirs' }];
  const g = scenario(p);
  let s = step(g.state, 'play');
  s = step(s, 'play');
  s = use(s);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.mine! },
  ]);
  resume(s, choose(s, 'target'));
  s = step(s, 'target');
  expect(attachedUpgrades(s, s.cards[g.refs.mine!]!).map(c => c.cardId)).toEqual(['shield']);
});
test('Luke unit gives a Shield to another unit, including an enemy, and can decline', () => {
  const p = board('luke-skywalker--faithful-friend', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = baseAttack(g.state);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.players.alice!.leader,
    ),
  ).toBe(false);
  expect(step(s, 'decline-effect').execution.decision!.kind).toBe('action');
  const done = target(s, g.refs.enemy!);
  expect(attachedUpgrades(done, done.cards[g.refs.enemy!]!).map(c => c.cardId)).toEqual(['shield']);
});
for (const history of [false, true])
  test(`Iden front can exhaust without history but heals only after an enemy defeat (${history})`, () => {
    const p = board('iden-versio--inferno-squad-commander');
    p.players[1].discard = [{ card: ids.marine, ref: 'dead' }];
    if (history) p.defeatedThisPhase = ['dead'];
    const s = use(scenario(p).state);
    expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(history ? 4 : 5);
  });
test('Iden deploys with a Shield and heals her base when a later enemy unit is defeated', () => {
  const p = board('iden-versio--inferno-squad-commander');
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(attachedUpgrades(s, s.cards[s.players.alice!.leader]!).map(c => c.cardId)).toEqual([
    'shield',
  ]);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'attack' && i.attacker === g.refs.own && i.defender === g.refs.enemy);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
});
function afterPlay(leader: string, card: string, deployed = false) {
  const p = board(leader, deployed);
  p.players[0].hand = [{ card }];
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(g.state, 'play');
  s = pending(s);
  s = step(s, 'pass');
  return { ...g, state: s };
}
test('Vader front needs a Villainy play before independently damaging a unit and a chosen base', () => {
  const empty = use(scenario(board('darth-vader--dark-lord-of-the-sith')).state);
  expect(empty.execution.decision!.kind).toBe('action');
  expect(ready(empty)).toBe(11);
  const g = afterPlay('darth-vader--dark-lord-of-the-sith', ids.fighter);
  const s = target(use(g.state), g.refs.enemy!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === s.players.alice!.base),
  );
  const done = target(s, s.players.alice!.base);
  expect(done.cards[g.refs.enemy!]!.damage).toBe(1);
  expect(done.cards[done.players.alice!.base]!.damage).toBe(6);
});
test('Vader unit deals optional two damage before its five combat damage', () => {
  const p = board('darth-vader--dark-lord-of-the-sith', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    done = target(baseAttack(g.state), g.refs.enemy!);
  expect(done.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
});
for (const event of [false, true])
  test(`Asajj front attack bonus requires an event played this phase (${event})`, () => {
    const g = afterPlay('asajj-ventress--unparalleled-adversary', event ? 'resupply' : ids.fighter);
    const done = step(
      use(g.state),
      i => i.kind === 'attack' && i.attacker === g.refs.own && i.defender === g.refs.enemy,
    );
    expect(done.cards[g.refs.enemy!]!.damage).toBe(event ? 4 : 3);
  });
for (const event of [false, true])
  test(`Asajj unit uses first combat damage after an event (${event})`, () => {
    const p = board('asajj-ventress--unparalleled-adversary', true);
    p.players[0].hand = [{ card: event ? 'resupply' : ids.fighter }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = step(step(g.state, 'play'), 'pass');
    s = step(
      s,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.players.alice!.leader &&
        i.defender === g.refs.enemy,
    );
    expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
    expect(s.cards[s.players.alice!.leader]!.damage).toBe(event ? 0 : 3);
  });
test('Phasma front can damage a base after a First Order play, including a space unit', () => {
  const g = afterPlay('captain-phasma--chrome-dome', 'first-order-tie-fighter');
  const s = target(use(g.state), g.state.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
});
test('Phasma unit damage replaced by a Shield still satisfies if-you-do under v8 8.9.2', () => {
  const p = board('captain-phasma--chrome-dome', true);
  p.players[0].hand = [{ card: 'first-order-tie-fighter' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), 'pass');
  s = target(baseAttack(s), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});
for (const deployed of [false, true])
  test(`Jyn Time to Fight ${deployed ? 'unit' : 'front'} privately draws after a friendly Rebel defeat`, () => {
    const p = board('jyn-erso--time-to-fight', deployed);
    p.players[0].discard = [{ card: ids.marine, ref: 'rebel' }];
    p.defeatedThisPhase = ['rebel'];
    p.players[0].deck![1] = { card: 'open-fire', ref: 'selected' };
    const g = scenario(p),
      s = deployed ? baseAttack(g.state) : use(g.state);
    resume(s, choose(s, 'search', [g.refs.selected!]));
    const done = searchDone(s, g.refs.selected!);
    expect(done.players.alice!.hand).toEqual([g.refs.selected!]);
    expect(
      done.facts.some(
        f => f.type === 'revealed' && f.cards.some(c => c.instanceId === g.refs.selected),
      ),
    ).toBe(false);
    const v = new Projector(done.gameId, { role: 'spectator' }).project(done);
    expect(JSON.stringify(v)).not.toContain('open-fire');
  });

for (const deployed of [false, true])
  test(`Nala Se ${deployed ? 'unit' : 'front'} ignores Clone unit penalties but preserves Pilot penalties and other costs`, () => {
    const p = board('nala-se--clone-engineer', deployed);
    p.players[0].base.card = 'kestro-city';
    p.players[0].hand = [
      { card: 'clone-pilot', ref: 'clone' },
      { card: ids.marine, ref: 'other' },
    ];
    const g = scenario(p);
    const clone = g.state.cards[g.refs.clone!]!;
    expect(playCost(g.state, clone)).toBe(2);
    expect(playCost(g.state, clone, 0, 'piloting')).toBe(4);
    expect(playCost(g.state, clone, 0, undefined, undefined, true)).toBe(2);
    expect(playCost(g.state, g.state.cards[g.refs.other!]!)).toBe(6);
    const done = step(g.state, i => i.kind === 'play' && i.card === g.refs.clone && !i.piloting);
    expect(ready(done)).toBe(10);
    expect(done.cards[g.refs.clone!]!.zone).toBe('ground');
    if (deployed) {
      const leader = g.state.cards[g.state.players.alice!.leader]!;
      modifyUnit(g.state, leader, leader, {
        kind: 'modify',
        power: 0,
        hp: 0,
        loseAbilities: true,
        duration: 'phase',
      });
      expect(playCost(g.state, clone)).toBe(4);
    }
  });
for (const deployed of [false, true])
  test(`Nala Se grants Clone defeat healing only on her unit face (${deployed})`, () => {
    const p = board('nala-se--clone-engineer', deployed);
    p.players[0].ground = [{ card: 'clone-trooper', ref: 'clone' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = step(
        g.state,
        i => i.kind === 'attack' && i.attacker === g.refs.clone && i.defender === g.refs.enemy,
      );
    expect(s.cards[g.refs.clone!]!.zone).toBe('set-aside');
    expect(s.cards[s.players.alice!.base]!.damage).toBe(deployed ? 3 : 5);
  });
for (const deployed of [false, true])
  test(`Hera Spectre Two ${deployed ? 'unit' : 'front'} waives all Spectre roles and keeps non-Spectre penalties`, () => {
    const p = board('hera-syndulla--spectre-two', deployed);
    p.players[0].hand = [
      { card: 'kanan-jarrus--spectre-one', ref: 'kanan' },
      { card: 'hera-syndulla--we-ve-lost-enough', ref: 'pilot' },
      { card: ids.consular, ref: 'other' },
    ];
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.kanan!]!)).toBe(4);
    expect(playCost(g.state, g.state.cards[g.refs.pilot!]!, 0, 'piloting')).toBe(2);
    expect(playCost(g.state, g.state.cards[g.refs.other!]!)).toBe(6);
    const s = step(g.state, i => i.kind === 'play' && i.card === g.refs.kanan);
    expect(ready(s)).toBe(8);
  });
test('Hera Spectre Two can give Experience to another unique enemy unit but not herself or a nonunique copy', () => {
  const p = board('hera-syndulla--spectre-two', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'nonunique' }];
  p.players[1].ground = [{ card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'unique' }];
  const g = scenario(p),
    s = baseAttack(g.state);
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: g.refs.unique! }]);
  const done = target(s, g.refs.unique!);
  expect(attachedUpgrades(done, done.cards[g.refs.unique!]!).map(c => c.cardId)).toEqual([
    'experience',
  ]);
});
for (const deployed of [false, true])
  test(`Hera Not Fighting Alone ${deployed ? 'unit' : 'front'} counts units before play, with herself counting only when deployed`, () => {
    const p = board('hera-syndulla--not-fighting-alone', deployed);
    p.players[0].hand = [{ card: ids.consular, ref: 'play' }];
    p.players[0].ground = resources(deployed ? 0 : 1);
    let g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.play!]!)).toBe(6);
    p.players[0].ground.push({ card: ids.marine });
    g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.play!]!)).toBe(4);
    const done = step(g.state, 'play');
    expect(ready(done)).toBe(8);
    if (deployed) {
      const s = baseAttack(g.state);
      expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
    }
  });
for (const deployed of [false, true])
  test(`Mon Mothma ${deployed ? 'unit' : 'front'} waives non-Villainy Officials only`, () => {
    const p = board('mon-mothma--forming-a-coalition', deployed);
    p.players[0].hand = [
      { card: 'bail-organa--responding-to-catastrophe', ref: 'bail' },
      { card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'moff' },
      { card: ids.consular, ref: 'other' },
    ];
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.bail!]!)).toBe(2);
    expect(playCost(g.state, g.state.cards[g.refs.moff!]!)).toBe(4);
    expect(playCost(g.state, g.state.cards[g.refs.other!]!)).toBe(6);
    expect(ready(step(g.state, i => i.kind === 'play' && i.card === g.refs.bail))).toBe(10);
  });
test('Mon Mothma unit boosts other friendly Officials even when they have Villainy', () => {
  const p = board('mon-mothma--forming-a-coalition', true);
  p.players[0].ground = [
    { card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'own' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'enemy' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.own!]!).hp).toBe(4);
  expect(unitStats(g.state, g.state.cards[g.refs.enemy!]!).hp).toBe(3);
  expect(unitStats(g.state, g.state.cards[g.refs.other!]!).hp).toBe(3);
  expect(unitStats(g.state, g.state.cards[g.state.players.alice!.leader]!).hp).toBe(7);
});
for (const history of [false, true])
  test(`Bo-Katan Princess front checks a friendly Mandalorian attack (${history})`, () => {
    const p = board('bo-katan-kryze--princess-in-exile');
    p.players[0].ground = [{ card: 'mandalorian', ref: 'mando' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (history) p.attackedThisPhase = ['mando'];
    const g = scenario(p);
    let s = use(g.state);
    if (history) s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(history ? 1 : 0);
    expect(s.execution.decision!.kind).toBe('action');
  });
for (const history of [false, true])
  test(`Bo-Katan Princess unit excludes her own attack and resolves two damage instructions separately (${history})`, () => {
    const p = board('bo-katan-kryze--princess-in-exile', true);
    p.players[0].ground = [{ card: 'mandalorian', ref: 'mando' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
    if (history) p.attackedThisPhase = ['mando'];
    const g = scenario(p);
    let s = target(baseAttack(g.state), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
    expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
    if (history) {
      resume(s, choose(s, 'target'));
      s = target(s, g.refs.enemy!);
    }
    expect(s.cards[g.refs.enemy!]!.damage).toBe(history ? 1 : 0);
    expect(s.execution.decision!.kind).toBe('action');
  });
test('Played-card conditions use event-time controller and role, then clear at the phase boundary', () => {
  const p = board('asajj-ventress--unparalleled-adversary');
  p.players[0].hand = [{ card: 'resupply' }];
  let s = step(scenario(p).state, 'play');
  expect(
    conditionMatches(
      s,
      'alice',
      { kind: 'played-card-this-phase', filter: { kind: 'event' } },
      { source: s.cards[s.players.alice!.leader]! },
    ),
  ).toBe(true);
  expect(
    conditionMatches(
      s,
      'bob',
      { kind: 'played-card-this-phase', filter: { kind: 'event' } },
      { source: s.cards[s.players.alice!.leader]! },
    ),
  ).toBe(false);
  s = step(step(s, 'pass'), 'pass');
  expect(
    conditionMatches(
      s,
      'alice',
      { kind: 'played-card-this-phase', filter: { kind: 'event' } },
      { source: s.cards[s.players.alice!.leader]! },
    ),
  ).toBe(false);
});
test('Piloting a Heroism unit does not make it eligible for Luke or a unit-play history condition', () => {
  const p = board('luke-skywalker--faithful-friend');
  p.players[0].hand = [{ card: 'hera-syndulla--we-ve-lost-enough', ref: 'pilot' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'play' && i.piloting === 'piloting');
  s = step(s, 'pass');
  expect(
    conditionMatches(
      s,
      'alice',
      { kind: 'played-card-this-phase', filter: { kind: 'upgrade' } },
      { source: s.cards[s.players.alice!.leader]! },
    ),
  ).toBe(true);
  expect(
    conditionMatches(
      s,
      'alice',
      { kind: 'played-card-this-phase', filter: { kind: 'unit' } },
      { source: s.cards[s.players.alice!.leader]! },
    ),
  ).toBe(false);
  s = use(s);
  expect(s.execution.decision!.kind).toBe('action');
  expect(attachedUpgrades(s, s.cards[g.refs.host!]!).map(c => c.cardId)).toEqual([
    'hera-syndulla--we-ve-lost-enough',
  ]);
});
