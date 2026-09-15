import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const boba = 'boba-fett--daimyo',
  cad = 'cad-bane--he-who-needs-no-introduction',
  mando = 'the-mandalorian--sworn-to-the-creed',
  revan = 'darth-revan--scourge-of-the-old-republic',
  quinlan = 'quinlan-vos--sticking-the-landing',
  vader = 'darth-vader--unstoppable',
  lama = 'lama-su--we-modified-their-genetics',
  qui = 'qui-gon-jinn--student-of-the-living-force';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function effects(s: GameState, e: CardEffect[]) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: 'alice',
      source: structuredClone(leader(s)),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
}
const offered = (s: GameState) =>
  s.execution.decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []));
const experiences = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
for (const keyword of [true, false])
  test(`Boba front observes a played unit's active keywords (${keyword})`, () => {
    const p = board(boba);
    p.players[0].hand = [{ card: keyword ? 'imperial-armored-commando' : ids.marine, ref: 'play' }];
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    const g = scenario(p);
    let s = step(g.state, 'play');
    if (keyword) {
      if (s.execution.frames[0]?.kind === 'trigger-batch') {
        const t = s.execution.frames[0].triggers.find(t => t.abilityId === 'observe')!;
        s = step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
      }
      s = step(s, 'accept-effect');
      resume(
        s,
        choose(s, i => i.kind === 'target' && i.card === g.refs.ally),
      );
      s = target(s, g.refs.ally!);
    }
    expect(leader(s).exhausted).toBe(keyword);
    expect(unitStats(s, s.cards[g.refs.ally!]!).power).toBe(keyword ? 4 : 3);
  });
test('Boba unit buffs other friendly keyword units and responds to ability loss', () => {
  const p = board(boba, true);
  p.players[0].ground = [
    { card: 'imperial-armored-commando', ref: 'keyword' },
    { card: ids.marine, ref: 'plain' },
  ];
  const g = scenario(p);
  const original = unitStats(g.state, g.state.cards[g.refs.keyword!]!).power;
  expect(unitStats(g.state, g.state.cards[g.refs.plain!]!).power).toBe(3);
  expect(unitStats(g.state, leader(g.state)).power).toBe(4);
  const s = effects(g.state, [
    {
      kind: 'modify-units',
      filter: { controller: 'friendly', sameAs: 'source' },
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  ]);
  expect(unitStats(s, s.cards[g.refs.keyword!]!).power).toBe(original - 1);
});
for (const deployed of [false, true])
  test(`Cad's opponent chooses the damaged unit (${deployed})`, () => {
    const p = board(cad, deployed);
    p.players[0].hand = [{ card: 'devaronian-doorbuster' }];
    p.players[1].ground = [
      { card: ids.marine, ref: 'one' },
      { card: ids.marine, ref: 'two' },
    ];
    const g = scenario(p);
    let s = step(g.state, 'play');
    s = step(s, 'accept-effect');
    expect(s.execution.decision!.playerId).toBe('bob');
    expect(offered(s)).toEqual([g.refs.one!, g.refs.two!]);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.two),
    );
    s = target(s, g.refs.two!);
    expect(s.cards[g.refs.one!]!.damage).toBe(0);
    expect(s.cards[g.refs.two!]!.damage).toBe(deployed ? 2 : 1);
    expect(leader(s).exhausted).toBe(!deployed);
  });
for (const deployed of [false, true])
  test(`Mandalorian exhausts by remaining HP after an upgrade play (${deployed})`, () => {
    const p = board(mando, deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    p.players[0].hand = [{ card: 'academy-training' }];
    p.players[1].ground = [
      { card: ids.consular, damage: deployed ? 1 : 3, ref: 'eligible' },
      { card: ids.consular, damage: deployed ? 0 : 2, ref: 'ineligible' },
    ];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'play' && i.target === g.refs.host);
    s = step(s, 'accept-effect');
    expect(offered(s)).toEqual([g.refs.eligible!]);
    resume(s, choose(s, 'target'));
    s = step(s, 'target');
    expect(s.cards[g.refs.eligible!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.ineligible!]!.exhausted).toBe(false);
  });
test('Mandalorian observes a Pilot played as an upgrade but not a unit play', () => {
  for (const pilot of [true, false]) {
    const p = board(mando);
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[0].hand = [{ card: pilot ? 'clone-pilot' : ids.marine }];
    p.players[1].ground = [{ card: ids.marine }];
    const g = scenario(p);
    const s = step(g.state, i => i.kind === 'play' && (pilot ? !!i.piloting : !i.piloting));
    expect(s.execution.decision!.kind).toBe(pilot ? 'effect' : 'action');
  }
});
for (const deployed of [false, true])
  test(`Revan gives Experience to the exact successful attacker (${deployed})`, () => {
    const p = board(revan, deployed);
    p.players[0].ground = [
      { card: ids.marine, ref: 'attack' },
      { card: ids.marine, ref: 'other' },
    ];
    p.players[1].ground = [{ card: ids.trooper, ref: 'defend' }];
    const g = scenario(p);
    let s = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.attack && i.defender === g.refs.defend,
    );
    s = step(s, 'accept-effect');
    expect(experiences(s, g.refs.attack!)).toBe(0);
    expect(s.cards[g.refs.attack!]!.zone).toBe('discard');
    expect(experiences(s, g.refs.other!)).toBe(0);
  });
test('Revan deployed grants its surviving attacker Experience and restores its own attack', () => {
  const p = board(revan, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'attack' }];
  p.players[1].ground = [{ card: ids.fighter, ref: 'defend' }];
  p.players[1].ground[0]!.card = ids.marine;
  p.players[1].ground[0]!.damage = 1;
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.attack && i.defender === g.refs.defend,
  );
  s = step(s, 'accept-effect');
  expect(experiences(s, g.refs.attack!)).toBe(1);
  s = step(s, 'pass');
  s = step(
    s,
    i =>
      i.kind === 'attack' &&
      i.attacker === leader(s).instanceId &&
      i.defender === s.players.bob!.base,
  );
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
});
for (const deployed of [false, true])
  test(`Quinlan uses printed costs with the correct comparison (${deployed})`, () => {
    const p = board(quinlan, deployed);
    p.players[0].hand = [{ card: ids.marine }];
    p.players[1].ground = [
      { card: ids.trooper, ref: 'cheap' },
      { card: ids.marine, ref: 'same' },
      { card: ids.consular, ref: 'expensive' },
    ];
    const g = scenario(p);
    let s = step(g.state, 'play');
    s = step(s, 'accept-effect');
    expect(offered(s)).toEqual(deployed ? [g.refs.cheap!, g.refs.same!] : [g.refs.same!]);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.same),
    );
    s = target(s, g.refs.same!);
    expect(s.cards[g.refs.same!]!.damage).toBe(1);
  });
test('Vader pays hand discard and exhaustion atomically before choosing any unit or base', () => {
  const p = board(vader);
  p.players[0].hand = [
    { card: ids.marine, ref: 'discard' },
    { card: ids.fighter, ref: 'keep' },
  ];
  const g = scenario(p);
  let s = use(g.state);
  expect(leader(s).exhausted).toBe(false);
  resume(s, choose(s, 'accept-effect', [g.refs.discard!]));
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(leader(s).exhausted).toBe(true);
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.cards[g.refs.keep!]!.zone).toBe('hand');
});
test('Vader cannot pay without a hand card; attack discards selected duplicate copies for matching damage', () => {
  expect(
    scenario(board(vader)).state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  const p = board(vader, true);
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.fighter, ref: 'keep' },
  ];
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === leader(g.state).instanceId &&
      i.defender === g.state.players.bob!.base,
  );
  resume(s, choose(s, 'accept-effect', [g.refs.one!, g.refs.two!]));
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
  expect(s.cards[g.refs.keep!]!.zone).toBe('hand');
  expect(s.facts.filter(f => f.type === 'discarded').at(-1)!.amount).toBe(2);
});
for (const deployed of [false, true])
  test(`Lama Su plays discounted upgrades on friendly non-Vehicles (${deployed})`, () => {
    const p = board(lama, deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    p.players[0][deployed ? 'discard' : 'hand'] = [{ card: 'academy-training', ref: 'upgrade' }];
    const g = scenario(p);
    let s = deployed
      ? step(
          g.state,
          i =>
            i.kind === 'attack' &&
            i.attacker === leader(g.state).instanceId &&
            i.defender === g.state.players.bob!.base,
        )
      : use(g.state);
    if (deployed) s = step(s, 'accept-effect');
    expect(
      s.execution
        .decision!.options.filter(o => o.intent.kind === 'play')
        .every(
          o =>
            o.intent.kind === 'play' &&
            (o.intent.target === g.refs.host || o.intent.target === leader(s).instanceId),
        ),
    ).toBe(true);
    resume(
      s,
      choose(s, i => i.kind === 'play' && i.target === g.refs.host),
    );
    s = step(s, i => i.kind === 'play' && i.target === g.refs.host);
    expect(s.cards[g.refs.host!]!.damage).toBe(deployed ? 0 : 1);
    expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(1);
    expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.host);
  });
for (const deployed of [false, true])
  test(`Qui-Gon returns a unit then plays a strictly cheaper non-Villainy unit free (${deployed})`, () => {
    const p = board(qui, deployed);
    p.players[0].force = true;
    p.players[0].ground = [{ card: ids.consular, ref: 'return' }];
    p.players[0].hand = [
      { card: ids.marine, ref: 'cheaper' },
      { card: ids.consular, ref: 'equal' },
      { card: ids.fighter, ref: 'villain' },
    ];
    const g = scenario(p);
    let s = deployed
      ? step(
          g.state,
          i =>
            i.kind === 'attack' &&
            i.attacker === leader(g.state).instanceId &&
            i.defender === g.state.players.bob!.base,
        )
      : use(g.state);
    if (deployed) s = step(s, 'accept-effect');
    s = target(s, g.refs.return!);
    const plays = s.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'play' ? [o.intent.card] : [],
    );
    expect(plays).toEqual([g.refs.cheaper!]);
    expect(s.cards[g.refs.return!]!.zone).toBe('hand');
    resume(s, choose(s, 'play'));
    s = step(s, 'play');
    expect(s.cards[g.refs.cheaper!]!.zone).toBe('ground');
    expect(s.players.alice!.resources.some(id => s.cards[id]!.exhausted)).toBe(false);
  });
test('Qui-Gon cannot activate without the Force and cannot return a leader unit', () => {
  const p = board(qui);
  p.players[0].ground = [{ card: ids.marine }];
  let s = scenario(p).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  p.players[0].force = true;
  p.players[1].leader.deployedAs = 'unit';
  s = use(scenario(p).state);
  expect(offered(s)).not.toContain(s.players.bob!.leader);
});

test('Boba observes a keyword granted by the play instruction and his phase bonus expires', () => {
  const p = board(boba);
  p.players[0].hand = [{ card: ids.marine, ref: 'play' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { kind: 'unit' },
      free: true,
      optional: false,
      phaseAbilities: { keywords: ['Hidden'] },
    },
  ]);
  s = step(s, 'play');
  s = step(s, 'accept-effect');
  s = target(s, g.refs.ally!);
  expect(unitStats(s, s.cards[g.refs.ally!]!).power).toBe(4);
  const first = s.round;
  for (let n = 0; n < 20 && s.round === first; n++)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass');
  expect(s.round).toBe(first + 1);
  expect(unitStats(s, s.cards[g.refs.ally!]!).power).toBe(3);
});
test('Cad can decline his deployed trigger then use it on a later play, once per round', () => {
  const p = board(cad, true);
  p.players[0].hand = Array.from({ length: 3 }, () => ({ card: 'devaronian-doorbuster' }));
  p.players[1].ground = [{ card: ids.consular }];
  let s = scenario(p).state;
  s = step(s, 'play');
  s = step(s, 'decline-effect');
  s = step(s, 'pass');
  s = step(s, 'play');
  s = step(s, 'accept-effect');
  s = step(s, 'target');
  s = step(s, 'pass');
  s = step(s, 'play');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[s.ground.find(id => s.cards[id]!.controller === 'bob')!]!.damage).toBe(2);
});
test('Mandalorian does not trigger from creating token upgrades', () => {
  const p = board(mando);
  p.players[0].ground = [{ card: ids.marine }];
  let s = scenario(p).state;
  s = effects(s, [
    {
      kind: 'each-unit',
      filter: { controller: 'friendly' },
      bind: 'unit',
      effects: [
        {
          kind: 'on-unit',
          target: 'unit',
          operation: { kind: 'give-token', token: 'shield', count: 1 },
        },
      ],
    },
  ]);
  expect(leader(s).exhausted).toBe(false);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Quinlan retains the played card cost after that exact unit leaves before his trigger resolves', () => {
  const p = board(quinlan);
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'same' },
    { card: ids.trooper, ref: 'cheap' },
  ];
  const g = scenario(p);
  let s = step(g.state, 'play');
  s = effects(s, [
    { kind: 'defeat-units', filter: { controller: 'friendly', name: 'Battlefield Marine' } },
  ]);
  expect(s.cards[g.refs.played!]!.zone).toBe('discard');
  s = step(s, 'accept-effect');
  expect(offered(s)).toEqual([g.refs.same!]);
  resume(s, choose(s, 'target'));
  s = step(s, 'target');
  expect(s.cards[g.refs.same!]!.damage).toBe(1);
});
test('Vader hand selections conceal unchosen identities and allow choosing zero cards', () => {
  const pending = (card: string) => {
    const p = board(vader, true);
    p.players[0].hand = [{ card }];
    const s = scenario(p).state;
    return step(
      s,
      i =>
        i.kind === 'attack' &&
        i.attacker === leader(s).instanceId &&
        i.defender === s.players.bob!.base,
    );
  };
  const a = pending(ids.fighter),
    b = pending(ids.consular);
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ])
    expect(new Projector(a.gameId, viewer, 'v'.repeat(32)).project(a)).toEqual(
      new Projector(b.gameId, viewer, 'v'.repeat(32)).project(b),
    );
  resume(a, choose(a, 'accept-effect', []));
  const s = step(a, 'accept-effect', []);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(6);
  expect(s.facts.some(f => f.type === 'discarded')).toBe(false);
});
test('Lama Su damages the selected host before the upgrade When Played choice', () => {
  const p = board(lama);
  p.players[0].force = true;
  p.players[0].hand = [{ card: 'yoda-s-lightsaber' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  const g = scenario(p);
  let s = use(g.state);
  s = step(s, i => i.kind === 'play' && i.target === g.refs.host);
  expect(s.execution.decision!.kind).toBe('effect');
  expect(s.cards[g.refs.host!]!.damage).toBe(1);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  s = target(s, s.players.alice!.base);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
});
for (const id of [lama, qui])
  test(`${id} has no attack-end play after failing to survive`, () => {
    const p = board(id, true);
    p.players[0].leader.damage = 4;
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    p.players[0].discard = [{ card: 'academy-training' }];
    p.players[0].hand = [{ card: ids.marine }];
    const g = scenario(p);
    const s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === leader(g.state).instanceId &&
        i.defender === g.refs.enemy,
    );
    expect(leader(s).zone).toBe('base');
    expect(s.execution.decision!.kind).toBe('action');
  });
test('Qui-Gon may return a unit even when no eligible hand play remains', () => {
  const p = board(qui);
  p.players[0].force = true;
  p.players[0].ground = [{ card: ids.marine, ref: 'return' }];
  p.players[0].hand = [{ card: ids.consular }];
  const g = scenario(p);
  let s = use(g.state);
  s = target(s, g.refs.return!);
  expect(s.cards[g.refs.return!]!.zone).toBe('hand');
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(false);
  if (s.execution.decision!.kind === 'effect') s = step(s, 'decline-effect');
  expect(leader(s).exhausted).toBe(true);
});
