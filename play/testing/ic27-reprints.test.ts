import { expect, test } from 'bun:test';
import printings from './fixtures/ic27-printings.json';
import reprints from '../cards/ic27/reprint-additions.json';
import { cardDefinition } from '../cards/registry.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { cannotReady, modifyUnit } from '../engine/lasting.ts';
import { effectFrames } from '../engine/triggers.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { GameState, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import {
  attack,
  choose,
  ids,
  ordered,
  play,
  position,
  resources,
  scenario,
  step,
  target,
  use,
} from './ic27-helpers.ts';

function board(card: string, inHand = true) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0][inHand ? 'hand' : 'ground'] = [{ card, ref: 'card' }];
  return p;
}
const damage = (s: GameState, who = 'alice') => s.cards[s.players[who]!.base]!.damage;
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
function effects(s: GameState, list: CardEffect[], source = s.players.alice!.leader) {
  const next = structuredClone(s);
  next.execution.decision = null;
  next.execution.frames = [
    ...effectFrames('alice', next.cards[source]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(next);
  return ordered(next);
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

// Printed text plus Comprehensive Rules v8 §§6.2–6.3, 7.6–7.7 and 8.11/8.13/8.25.
test('all 151 SWUDB IC27 identities resolve, including 22 newly implemented original-set reprints', () => {
  expect(printings.printings).toHaveLength(151);
  expect(new Set(printings.printings.map(c => c.cardId)).size).toBe(151);
  expect(reprints).toHaveLength(22);
  for (const p of printings.printings) expect(cardDefinition(p.cardId).cardId).toBe(p.cardId);
});

test('Rune requires a friendly defeat this phase and may shrink either side or decline', () => {
  for (const defeated of [false, true])
    for (const decline of [false, true]) {
      const p = board('rune-haako--scheming-second');
      p.players[0].ground = [{ card: ids.marine, ref: 'food' }];
      p.players[1].ground = [{ card: ids.trooper, ref: 'victim' }];
      const g = scenario(p);
      const start = defeated
        ? effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'friendly' } }])
        : g.state;
      let s = play(start, g.refs.card!);
      if (defeated) s = decline ? step(s, 'decline-effect') : target(s, g.refs.victim!);
      expect(s.cards[g.refs.victim!]!.zone).toBe(defeated && !decline ? 'discard' : 'ground');
    }
});

test('AT-AT Suppressor exhausts all ground units including itself and both deployed leaders, leaving space ready', () => {
  const p = board('at-at-suppressor');
  p.players[0].leader.deployedAs = 'unit';
  p.players[1].leader.deployedAs = 'unit';
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  for (const id of [
    g.refs.card!,
    g.refs.ally!,
    g.refs.enemy!,
    s.players.alice!.leader,
    s.players.bob!.leader,
  ])
    expect(s.cards[id]!.exhausted).toBe(true);
  expect(s.cards[g.refs.ship!]!.exhausted).toBe(false);
});

test('Lethal Crackdown excludes leaders and uses defeated upgraded power after attachments leave', () => {
  const p = board('lethal-crackdown');
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [
    { card: 'experience', unit: 'enemy' },
    { card: 'shield', unit: 'enemy' },
  ];
  const g = scenario(p),
    choice = play(g.state, g.refs.card!);
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === choice.players.bob!.leader,
    ),
  ).toBe(false);
  const s = target(choice, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(damage(s)).toBe(4);
});

test('Clan Wren Rescuer can give Experience to an enemy or itself', () => {
  for (const self of [false, true]) {
    const p = board('clan-wren-rescuer');
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p),
      id = g.refs[self ? 'card' : 'enemy']!;
    const s = target(play(g.state, g.refs.card!), id);
    expect(tokens(s, id)).toBe(1);
  }
});

test('Concord Dawn Interceptors has Sentinel and only gains power while defending', () => {
  const p = board('concord-dawn-interceptors');
  p.players[0].hand = [];
  p.players[0].space = [{ card: 'concord-dawn-interceptors', ref: 'card' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.activePlayer = 'bob';
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.card!]!).power).toBe(1);
  expect(g.state.execution.decision!.options.filter(o => o.intent.kind === 'attack')).toHaveLength(
    1,
  );
  const s = attack(g.state, g.refs.enemy!, g.refs.card!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.card!]!.damage).toBe(2);
  expect(unitStats(s, s.cards[g.refs.card!]!).power).toBe(1);
});

for (const card of ['moisture-farmer', 'eta-2-light-interceptor'])
  test(`${card} heals two on attack`, () => {
    const p = board(card, false);
    p.players[0].base.damage = 4;
    if (card === 'eta-2-light-interceptor') {
      p.players[0].space = p.players[0].ground;
      p.players[0].ground = [];
    }
    const g = scenario(p),
      s = attack(g.state, g.refs.card!);
    expect(damage(s)).toBe(2);
  });

test('Resilient adds three HP without adding power', () => {
  const p = board('resilient');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toMatchObject({ power: 3, hp: 6 });
});

test('Inspiring Mentor excludes Vehicles and grants both attack and defeated abilities to its host', () => {
  const p = board('inspiring-mentor');
  p.players[0].ground = [
    { card: ids.marine, ref: 'host' },
    { card: ids.marine, ref: 'ally' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o =>
        o.intent.kind === 'play' &&
        o.intent.card === g.refs.card &&
        o.intent.target === g.refs.vehicle,
    ),
  ).toBe(false);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host,
  );
  s = step(s, 'pass');
  s = attack(s, g.refs.host!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.host,
    ),
  ).toBe(false);
  s = target(s, g.refs.ally!);
  expect(tokens(s, g.refs.ally!)).toBe(1);
  s = effects(
    s,
    [
      {
        kind: 'defeat-units',
        filter: { controller: 'friendly', name: 'Battlefield Marine', otherThan: 'source' },
      },
    ],
    g.refs.ally!,
  );
  s = target(s, g.refs.ally!);
  expect(tokens(s, g.refs.ally!)).toBe(2);
});

test('Savage counts himself when deciding whether to ready', () => {
  for (const count of [0, 1, 2]) {
    const p = board('savage-opress--monster');
    p.players[1].ground = Array.from({ length: count }, () => ({ card: ids.marine }));
    const g = scenario(p),
      s = play(g.state, g.refs.card!);
    expect(s.cards[g.refs.card!]!.exhausted).toBe(count <= 1);
  }
});

test('Frozen in Carbonite exhausts a non-leader and blocks readying even when its host loses abilities', () => {
  const p = board('frozen-in-carbonite');
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o =>
        o.intent.kind === 'play' &&
        o.intent.card === g.refs.card &&
        o.intent.target === g.state.players.bob!.leader,
    ),
  ).toBe(false);
  let s = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.host,
  );
  expect(s.cards[g.refs.host!]!.exhausted).toBe(true);
  modifyUnit(s, s.cards[g.refs.card!]!, s.cards[g.refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(cannotReady(s, s.cards[g.refs.host!]!)).toBe(true);
  expect(cannotReady(s, s.cards[g.refs.host!]!, true)).toBe(true);
  s = effects(s, [{ kind: 'ready-units', filter: { controller: 'enemy' } }]);
  expect(s.cards[g.refs.host!]!.exhausted).toBe(true);
  s = effects(s, [{ kind: 'defeat-upgrade', optional: false }]);
  s = target(s, g.refs.card!);
  s = effects(s, [{ kind: 'ready-units', filter: { controller: 'enemy' } }]);
  expect(s.cards[g.refs.host!]!.exhausted).toBe(false);
});

test('Grogu pays exhaustion and may exhaust an enemy in either arena', () => {
  const p = board('grogu--irresistible', false);
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p),
    s = target(use(g.state, g.refs.card!), g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});

test('Hidden Sharpshooter uses v8 Ambush while exhausted and may decline it', () => {
  for (const decline of [false, true]) {
    const p = board('hidden-sharpshooter');
    p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
    s = decline ? step(s, 'decline-effect') : target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(decline ? 'ground' : 'discard');
  }
});

test('Shoot First chooses only attackers that can attack, kills before retaliation, and expires', () => {
  const p = board('shoot-first');
  p.players[0].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.marine, ref: 'tired', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.tired,
    ),
  ).toBe(false);
  s = target(s, g.refs.attacker!);
  s = attack(s, g.refs.attacker!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.attacker!]!.damage).toBe(0);
  expect(unitStats(s, s.cards[g.refs.attacker!]!).power).toBe(3);
});

for (const upgrade of [false, true])
  test(`${upgrade ? "Infiltrator's Skill" : 'Breaking In'} grants Saboteur through Sentinel and Shields`, () => {
    const p = board(upgrade ? 'infiltrator-s-skill' : 'breaking-in');
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].ground = [
      { card: 'consular-security-force', ref: 'enemy' },
      { card: 'imperial-armored-commando', ref: 'sentinel' },
    ];
    p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
    const g = scenario(p);
    let s: GameState;
    if (upgrade) {
      s = step(
        g.state,
        i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.attacker,
      );
      s = step(s, 'pass');
    } else s = target(play(g.state, g.refs.card!), g.refs.attacker!);
    s = attack(s, g.refs.attacker!, g.refs.enemy!);
    expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
    expect(s.cards[g.refs.enemy!]!.damage).toBe(upgrade ? 4 : 5);
    expect(
      effectiveAbilities(s, s.cards[g.refs.attacker!]!).keywords?.includes('Saboteur') ?? false,
    ).toBe(upgrade);
  });

test('I Am Your Father gives the enemy the choice; Shield prevention does not cause a draw', () => {
  for (const no of [false, true]) {
    const p = board('i-am-your-father');
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.card!), g.refs.enemy!);
    expect(s.execution.decision!.playerId).toBe('bob');
    const input = choose(
      s,
      i => i.kind === 'choose-mode' && i.mode === (no ? 'no' : 'take-7-damage'),
    );
    resume(s, input);
    s = ordered(advance(s, input).state);
    expect(s.players.alice!.hand).toHaveLength(no ? 3 : 0);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  }
});

test('R2-D2 privately leaves or bottoms the exact top card on play and attack', () => {
  for (const inHand of [false, true])
    for (const bottom of [false, true]) {
      const p = board('r2-d2--ignoring-protocol', inHand);
      p.players[0].deck = [
        { card: ids.marine, ref: 'top' },
        { card: ids.fighter, ref: 'next' },
      ];
      const g = scenario(p);
      let s = inHand ? play(g.state, g.refs.card!) : attack(g.state, g.refs.card!);
      const other = new Projector(s.gameId, { role: 'player', playerId: 'bob' }).project(s);
      expect(other.decision?.inspectedCards ?? []).toHaveLength(0);
      if (inHand && bottom) resume(s, choose(s, 'accept-effect', [g.refs.top!]));
      s = step(s, 'accept-effect', bottom ? [g.refs.top!] : []);
      expect(s.players.alice!.deck).toEqual(
        bottom ? [g.refs.next!, g.refs.top!] : [g.refs.top!, g.refs.next!],
      );
      expect(s.players.alice!.hand).toHaveLength(0);
    }
});

test('C-3PO names before looking and optionally reveals/draws only a matching printed cost', () => {
  for (const number of [2, 3])
    for (const draw of [false, true])
      for (const inHand of [false, true]) {
        const p = board('c-3po--protocol-droid', inHand);
        p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
        const g = scenario(p);
        let s = inHand ? play(g.state, g.refs.card!) : attack(g.state, g.refs.card!);
        const before = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
        expect(before.decision?.inspectedCards ?? []).toHaveLength(0);
        s = ordered(
          advance(decodeState(encodeState(s)), {
            ...choose(s, 'accept-effect'),
            chosenNumber: number,
          }).state,
        );
        if (inHand && number === 2 && draw) resume(s, choose(s, 'accept-effect', [g.refs.top!]));
        if (number !== 2) expect(s.execution.decision!.selection!.cards).toHaveLength(0);
        s = step(s, 'accept-effect', number === 2 && draw ? [g.refs.top!] : []);
        expect(s.cards[g.refs.top!]!.zone).toBe(number === 2 && draw ? 'hand' : 'deck');
        expect(
          s.facts.some(
            f => f.type === 'revealed' && f.cards?.some(c => c.instanceId === g.refs.top),
          ),
        ).toBe(number === 2 && draw);
      }
});

test('You’re My Only Hope discounts aspect-adjusted cost or plays free at five remaining HP', () => {
  for (const remaining of [5, 6])
    for (const decline of [false, true]) {
      const p = board('you-re-my-only-hope');
      p.players[0].base.damage = 30 - remaining;
      p.players[0].deck = [{ card: 'at-at-suppressor', ref: 'top' }];
      const g = scenario(p);
      let s = play(g.state, g.refs.card!);
      s = step(s, 'accept-effect', [g.refs.top!]);
      if (remaining === 5) s = step(s, i => i.kind === 'choose-mode' && i.mode === 'play-free');
      if (!decline)
        resume(
          s,
          choose(s, i => i.kind === 'play' && i.card === g.refs.top),
        );
      s = decline ? step(s, 'decline-effect') : play(s, g.refs.top!);
      expect(s.cards[g.refs.top!]!.zone).toBe(decline ? 'deck' : 'ground');
      // Heroism is provided; AT-AT is 8 + missing Vigilance/Villainy, minus five.
      const spent = s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
      expect(spent).toBe(3 + (decline || remaining === 5 ? 0 : 7));
    }
});

test('Cody gives Experience on another friendly Republic entry, including token creation, but not his own entry', () => {
  const p = board('clone-commander-cody--loyal-to-the-republic');
  p.players[0].hand!.push({ card: 'phase-i-clone-trooper', ref: 'clone' });
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(tokens(s, g.refs.card!)).toBe(0);
  s = step(s, 'pass');
  s = play(s, g.refs.clone!);
  expect(tokens(s, g.refs.clone!)).toBe(1);
  s = effects(s, [{ kind: 'create-unit', cardId: 'clone-trooper', count: 1 }]);
  const token = Object.values(s.cards).find(c => c.cardId === 'clone-trooper')!;
  expect(tokens(s, token.instanceId)).toBe(1);
});

test('Jyn readies at most three units totaling seven cost and grants Saboteur even to a unit that cannot ready', () => {
  const p = board('jyn-erso--her-father-s-revenge');
  p.players[0].ground = [
    { card: ids.marine, ref: 'one', exhausted: true },
    { card: ids.marine, ref: 'two', exhausted: true },
    { card: ids.consular, ref: 'expensive', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy', exhausted: true }];
  p.attachments = [{ card: 'frozen-in-carbonite', unit: 'one', owner: 'bob' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(() => step(s, 'accept-effect', [g.refs.one!, g.refs.two!, g.refs.expensive!])).toThrow();
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!, g.refs.enemy!]);
  expect(s.cards[g.refs.one!]!.exhausted).toBe(true);
  for (const id of [g.refs.two!, g.refs.enemy!]) expect(s.cards[id]!.exhausted).toBe(false);
  for (const id of [g.refs.one!, g.refs.two!, g.refs.enemy!])
    expect(effectiveAbilities(s, s.cards[id]!).keywords).toContain('Saboteur');
});

test('K-2SO damages both enemy arenas and base in one batch with resumable Shield replacements', () => {
  const p = board('k-2so--evacuate-the-vault-door', false);
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.players[1].ground = [{ card: ids.consular, ref: 'shielded' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  p.attachments = [
    { card: 'shield', unit: 'shielded', ref: 'shield1' },
    { card: 'shield', unit: 'shielded', ref: 'shield2' },
  ];
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'defeat-units', filter: { name: 'K-2SO' } }]);
  expect(damage(s, 'bob')).toBe(0);
  expect(s.cards[g.refs.ship!]!.damage).toBe(0);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.shield1),
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs.shield1);
  expect(damage(s, 'bob')).toBe(5);
  expect(damage(s)).toBe(0);
  expect(s.cards[g.refs.ship!]!.zone).toBe('discard');
  expect(s.cards[g.refs.shielded!]!.damage).toBe(0);
  expect(s.cards[g.refs.ally!]!.damage).toBe(0);
});

test('Cassian Blending In cannot be attacked during the phase he entered, then becomes attackable', () => {
  const p = board('cassian-andor--blending-in');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.card,
    ),
  ).toBe(false);
  s = step(s, 'pass');
  s = step(s, 'pass');
  while (s.execution.decision?.kind === 'resource') s = step(s, 'resource', []);
  expect(s.round).toBe(2);
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.card,
    ),
  ).toBe(true);
});

test('C-3PO mismatch and declined match have identical opponent and spectator views', () => {
  const states = [ids.marine, ids.consular].map(card => {
    const p = board('c-3po--protocol-droid');
    p.players[0].deck = [{ card, ref: 'top' }];
    const g = scenario(p);
    const s = play(g.state, g.refs.card!);
    return ordered(advance(s, { ...choose(s, 'accept-effect'), chosenNumber: 2 }).state);
  });
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const views = states.map(s =>
      new Projector(s.gameId, viewer, 'ic27-reprint-differential-secret-32').project(s),
    );
    expect(views[0]).toEqual(views[1]);
    const after = states.map(s => step(s, 'accept-effect', []));
    expect(
      new Projector(after[0]!.gameId, viewer, 'ic27-reprint-differential-secret-32').project(
        after[0]!,
      ),
    ).toEqual(
      new Projector(after[1]!.gameId, viewer, 'ic27-reprint-differential-secret-32').project(
        after[1]!,
      ),
    );
  }
});

test('private top-card abilities on empty decks neither draw nor cause fatigue', () => {
  for (const card of ['c-3po--protocol-droid', 'r2-d2--ignoring-protocol', 'you-re-my-only-hope']) {
    const p = board(card);
    p.players[0].deck = [];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    if (card.startsWith('c-3po'))
      s = ordered(advance(s, { ...choose(s, 'accept-effect'), chosenNumber: 0 }).state);
    while (s.execution.frames[0]?.kind === 'zone-inspection') s = step(s, 'accept-effect', []);
    expect(damage(s)).toBe(0);
    expect(s.players.alice!.hand).toHaveLength(0);
    expect(s.execution.decision!.kind).toBe('action');
  }
});

test('You’re My Only Hope may still use the discount at five remaining HP on a 25-HP base', () => {
  const p = board('you-re-my-only-hope');
  p.players[0].base = { card: 'energy-conversion-lab', damage: 20 };
  p.players[0].deck = [{ card: 'at-at-suppressor', ref: 'top' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.top!]);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'play-discounted');
  s = play(s, g.refs.top!);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(10);
});

test('Cody ignores enemy and non-Republic entries and loses his observer when blanked', () => {
  const p = board('clone-commander-cody--loyal-to-the-republic', false);
  const g = scenario(p);
  let s = effects(g.state, [
    { kind: 'create-unit', cardId: 'clone-trooper', count: 1, player: 'enemy' },
    { kind: 'create-unit', cardId: 'battle-droid', count: 1 },
  ]);
  expect(Object.values(s.cards).some(c => c.cardId === 'experience')).toBe(false);
  modifyUnit(s, s.cards[g.refs.card!]!, s.cards[g.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  s = effects(s, [{ kind: 'create-unit', cardId: 'clone-trooper', count: 1 }]);
  expect(Object.values(s.cards).some(c => c.cardId === 'experience')).toBe(false);
});

test('K-2SO assigns lethal base and unit damage together before base-defeat maintenance', () => {
  const p = board('k-2so--evacuate-the-vault-door', false);
  p.players[1].base.damage = 25;
  p.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  const g = scenario(p),
    s = effects(g.state, [{ kind: 'defeat-units', filter: { name: 'K-2SO' } }]);
  expect(s.result).not.toBeNull();
  expect(damage(s, 'bob')).toBe(30);
  expect(s.cards[g.refs.ship!]!.damage).toBe(5);
  expect(s.cards[g.refs.ship!]!.zone).toBe('space');
});

test('You’re My Only Hope hides affordability both before and after declining the top card', () => {
  const states = [ids.marine, ids.consular].map(card => {
    const p = board('you-re-my-only-hope');
    p.players[0].resources = resources(3);
    p.players[0].deck = [{ card, ref: 'top' }];
    const g = scenario(p);
    return step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.top!]);
  });
  expect(states[0]!.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(true);
  expect(states[1]!.execution.decision!.options.map(o => o.intent.kind)).toEqual([
    'decline-effect',
  ]);
  resume(states[1]!, choose(states[1]!, 'decline-effect'));
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const project = (s: GameState) =>
      new Projector(s.gameId, viewer, 'ic27-reprint-differential-secret-32').project(s);
    expect(project(states[0]!)).toEqual(project(states[1]!));
    expect(project(step(states[0]!, 'decline-effect'))).toEqual(
      project(step(states[1]!, 'decline-effect')),
    );
  }
});

test('Jyn counts a deployed leader’s printed cost and zero-cost tokens within the same budget', () => {
  const p = board('jyn-erso--her-father-s-revenge');
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].leader.exhausted = true;
  p.players[0].ground = [
    { card: 'clone-trooper', ref: 'token', exhausted: true },
    { card: 'super-battle-droid', ref: 'marine', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'expensive', exhausted: true }];
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  expect(() => step(s, 'accept-effect', [s.players.alice!.leader, g.refs.expensive!])).toThrow();
  s = step(s, 'accept-effect', [s.players.alice!.leader, g.refs.token!, g.refs.marine!]);
  for (const id of [s.players.alice!.leader, g.refs.token!, g.refs.marine!]) {
    expect(s.cards[id]!.exhausted).toBe(false);
    expect(effectiveAbilities(s, s.cards[id]!).keywords).toContain('Saboteur');
  }
});

test('Cody gives Experience to a Republic leader entering play by deployment', () => {
  const p = board('clone-commander-cody--loyal-to-the-republic', false);
  p.players[0].leader = { card: 'mace-windu--here-with-backup', ref: 'leader' };
  const g = scenario(p),
    s = use(g.state, g.refs.leader!, 'deploy');
  expect(s.cards[g.refs.leader!]!.deployedAs).toBe('unit');
  expect(tokens(s, g.refs.leader!)).toBe(1);
  expect(tokens(s, g.refs.card!)).toBe(0);
});
