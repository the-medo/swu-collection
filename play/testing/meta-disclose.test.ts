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

const reveal = (s: GameState, cards: string[]) => step(s, 'accept-effect', cards);
const attackBase = (s: GameState, attacker: string) =>
  step(
    s,
    i =>
      i.kind === 'attack' &&
      i.attacker === attacker &&
      i.defender === s.players[s.seats.find(p => p !== s.activePlayer)!]!.base,
  );

test('Disclose counts repeated aspects across chosen cards, rejects duplicates and extra identities, and recovers', () => {
  const p = playCard('charged-with-treason');
  p.players[0].hand!.push(
    { card: 'sudden-ferocity', ref: 'one' },
    { card: 'honor-bound-partisan', ref: 'two' },
    { card: ids.marine, ref: 'extra' },
  );
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'play' && i.card === s.refs.played);
  expect(choice.execution.decision!.selection!.disclose!.required).toEqual([
    'Aggression',
    'Aggression',
  ]);
  for (const cards of [
    [],
    [s.refs.one!],
    [s.refs.one!, s.refs.one!],
    [s.refs.one!, s.refs.played!],
  ])
    expect(() => advance(choice, choose(choice, 'accept-effect', cards))).toThrow();
  resume(choice, choose(choice, 'accept-effect', [s.refs.one!, s.refs.two!, s.refs.extra!]));
  const selected = reveal(choice, [s.refs.one!, s.refs.two!, s.refs.extra!]),
    done = target(selected, s.refs.target!);
  expect(done.cards[s.refs.target!]!.damage).toBe(5);
  expect(done.players.alice!.hand).toEqual([s.refs.one!, s.refs.two!, s.refs.extra!]);
  expect(done.facts.find(f => f.type === 'revealed')!.cards).toHaveLength(3);
  expect(step(choice, 'decline-effect').facts.some(f => f.type === 'revealed')).toBe(false);
});

test('Disclose reveals only selected cards and gives no private choice to other viewers', () => {
  const p = playCard('charged-with-treason');
  p.players[0].hand!.push(
    { card: 'sudden-ferocity', ref: 'one' },
    { card: 'honor-bound-partisan', ref: 'two' },
    { card: ids.marine, ref: 'secret' },
  );
  const s = scenario(p),
    a = step(s.state, i => i.kind === 'play' && i.card === s.refs.played);
  const q = structuredClone(p);
  q.players[0].hand![3] = { card: ids.consular, ref: 'secret' };
  const t = scenario(q),
    b = step(t.state, i => i.kind === 'play' && i.card === t.refs.played);
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ])
    expect(
      new Projector(a.gameId, viewer, 'disclose privacy comparison key 1234').project(a),
    ).toEqual(new Projector(b.gameId, viewer, 'disclose privacy comparison key 1234').project(b));
  const shown = reveal(a, [s.refs.one!, s.refs.two!]);
  expect(
    new Projector(shown.gameId, { role: 'spectator' })
      .project(shown)
      .events.find(f => f.type === 'revealed')!
      .cards.map(c => c.cardId),
  ).toEqual(['sudden-ferocity', 'honor-bound-partisan']);
});

test('Condemn keeps only its attack trigger, makes the defender disclose and preserves printed stats', () => {
  const p = position();
  p.players[0].base.damage = 3;
  p.players[0].space = [{ card: 'ravager--final-imperial-command', ref: 'attacker' }];
  p.players[1].hand = [{ card: 'director-krennic--on-the-verge-of-greatness', ref: 'reveal' }];
  p.attachments = [{ card: 'condemn', unit: 'attacker', owner: 'bob', ref: 'curse' }];
  const s = scenario(p),
    choice = attackBase(s.state, s.refs.attacker!);
  expect(choice.execution.decision!.playerId).toBe('bob');
  expect(choice.execution.decision!.selection!.cards).toEqual([s.refs.reveal!]);
  expect(effectiveAbilities(choice, choice.cards[s.refs.attacker!]!).restore).toBe(0);
  expect(unitStats(choice, choice.cards[s.refs.attacker!]!).power).toBe(8);
  expect(choice.cards[choice.players.alice!.base]!.damage).toBe(3);
  resume(choice, choose(choice, 'accept-effect', [s.refs.reveal!]));
  const done = reveal(choice, [s.refs.reveal!]);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(2);
  expect(effectiveAbilities(done, done.cards[s.refs.attacker!]!).restore).toBe(2);
  expect(unitStats(done, done.cards[s.refs.attacker!]!).power).toBe(8);
  expect(step(choice, 'decline-effect').cards[done.players.bob!.base]!.damage).toBe(8);
});

test('Condemn suppresses Saboteur before its attack trigger, so a defender’s Shield prevents combat damage', () => {
  const p = position();
  p.players[0].ground = [{ card: 'anakin-skywalker--you-were-right-about-me', ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.attachments = [
    { card: 'condemn', unit: 'attacker', owner: 'bob' },
    { card: 'shield', unit: 'defender', owner: 'bob', ref: 'shield' },
  ];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.defender),
    done = step(choice, 'decline-effect');
  expect(done.cards[s.refs.defender!]!.damage).toBe(0);
  expect(done.cards[s.refs.shield!]!.zone).toBe('set-aside');
});

test('Syril lets the selected unit’s controller discard or take damage, including friendly targets', () => {
  for (const friendly of [false, true]) {
    const p = position();
    p.players[0].ground = [
      { card: 'syril-karn--where-is-he-', ref: 'syril' },
      { card: ids.consular, ref: 'friendly' },
    ];
    p.players[0].hand = [
      { card: 'syril-karn--where-is-he-', ref: 'icon1' },
      { card: 'sudden-ferocity', ref: 'icon2' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
    const s = scenario(p),
      disclose = attackBase(s.state, s.refs.syril!),
      pick = reveal(disclose, [s.refs.icon1!, s.refs.icon2!]),
      id = s.refs[friendly ? 'friendly' : 'enemy']!,
      choice = target(pick, id);
    expect(choice.execution.decision!.playerId).toBe(friendly ? 'alice' : 'bob');
    const discarded = s.refs[friendly ? 'icon1' : 'discard']!;
    resume(choice, choose(choice, 'accept-effect', [discarded]));
    const yes = reveal(choice, [discarded]);
    expect(yes.cards[id]!.damage).toBe(0);
    expect(yes.cards[discarded]!.zone).toBe('discard');
    expect(reveal(choice, []).cards[id]!.damage).toBe(2);
  }
});

test('Mina’s defeated disclosure survives source departure and draws privately', () => {
  const p = playCard('no-glory--only-results');
  p.players[0].ground = [{ card: 'mina-bonteri--stop-this-war', ref: 'mina' }];
  p.players[0].hand!.push({ card: ids.marine, ref: 'one' }, { card: 'resupply', ref: 'two' });
  p.players[0].deck![0] = { card: ids.consular, ref: 'drawn' };
  const s = scenario(p),
    choice = target(
      step(s.state, i => i.kind === 'play' && i.card === s.refs.played),
      s.refs.mina!,
    );
  expect(choice.cards[s.refs.mina!]!.zone).toBe('discard');
  resume(choice, choose(choice, 'accept-effect', [s.refs.one!, s.refs.two!]));
  const done = reveal(choice, [s.refs.one!, s.refs.two!]);
  expect(done.players.alice!.hand).toContain(s.refs.drawn!);
  expect(
    new Projector(done.gameId, { role: 'player', playerId: 'bob' })
      .project(done)
      .events.some(e => e.cards.some(c => c.cardId === ids.consular)),
  ).toBe(false);
});

test('Karis creates a ready Spy after a successful defeated disclosure', () => {
  const p = playCard('no-glory--only-results');
  p.players[0].ground = [{ card: 'karis-nemik--freedom-is-a-pure-idea', ref: 'karis' }];
  p.players[0].hand!.push({ card: 'karis-nemik--freedom-is-a-pure-idea', ref: 'icon' });
  const s = scenario(p),
    choice = target(
      step(s.state, i => i.kind === 'play' && i.card === s.refs.played),
      s.refs.karis!,
    ),
    done = reveal(choice, [s.refs.icon!]);
  const spies = done.ground.map(id => done.cards[id]!).filter(c => c.cardId === 'spy');
  expect(spies).toHaveLength(1);
  expect(spies[0]!.exhausted).toBe(false);
});

test('Typho’s defense trigger shares the attack window and heals his controller’s base', () => {
  const p = position();
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'attacker' }];
  p.players[1].ground = [{ card: 'captain-typho--all-necessary-precautions', ref: 'typho' }];
  p.players[1].base.damage = 3;
  p.players[1].hand = [{ card: ids.marine, ref: 'icon' }];
  const s = scenario(p),
    batch = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.typho);
  expect(batch.execution.decision!.kind).toBe('trigger-player');
  const defend = step(batch, i => i.kind === 'trigger-player' && i.playerId === 'bob');
  expect(defend.execution.decision!.playerId).toBe('bob');
  resume(defend, choose(defend, 'accept-effect', [s.refs.icon!]));
  const healed = reveal(defend, [s.refs.icon!]);
  expect(healed.cards[healed.players.bob!.base]!.damage).toBe(2);
  expect(healed.execution.decision!.playerId).toBe('alice');
});

test('Cantwell’s source-bound restriction prevents regroup readiness and ends when the cruiser leaves', () => {
  const p = playCard('cantwell-arrestor-cruiser');
  p.players[0].hand!.push(
    { card: 'director-krennic--on-the-verge-of-greatness', ref: 'one' },
    { card: 'mastery', ref: 'two' },
    { card: 'no-glory--only-results', ref: 'kill' },
  );
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  const s = scenario(p),
    disclose = step(s.state, i => i.kind === 'play' && i.card === s.refs.played),
    done = target(reveal(disclose, [s.refs.one!, s.refs.two!]), s.refs.victim!);
  expect(done.cards[s.refs.victim!]!.exhausted).toBe(true);
  const next = nextRound(done);
  expect(next.cards[s.refs.victim!]!.exhausted).toBe(true);
  const killed = target(
    step(next, i => i.kind === 'play' && i.card === s.refs.kill),
    s.refs.played!,
  );
  expect(nextRound(killed).cards[s.refs.victim!]!.exhausted).toBe(false);
});

test('Screeching TIE removes granted Raid and Overwhelm but retains ordinary attack abilities', () => {
  const p = position();
  p.players[0].space = [{ card: 'screeching-tie-fighter', ref: 'screech' }];
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].space = [{ card: 'naboo-royal-starship--fit-for-a-queen', ref: 'naboo' }];
  const s = scenario(p),
    leader = s.state.players.bob!.leader,
    done = target(attackBase(s.state, s.refs.screech!), leader);
  expect(effectiveAbilities(done, done.cards[leader]!).raid).toBe(0);
  expect(effectiveAbilities(done, done.cards[leader]!).keywords).not.toContain('Overwhelm');
  const attacked = attackBase(done, leader);
  expect(attacked.cards[attacked.players.alice!.base]!.damage).toBe(3);
  expect(effectiveAbilities(nextRound(attacked), attacked.cards[leader]!).raid).toBe(2);
});

test('a unit that lost keywords cannot bypass Sentinel with a newly granted Saboteur attack', () => {
  const p = position();
  p.players[0].space = [{ card: 'screeching-tie-fighter', ref: 'screech' }];
  p.players[0].ground = [{ card: 'marrok--mysterious-warrior', ref: 'sentinel' }];
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].hand = [{ card: 'commence-the-festivities', ref: 'event' }];
  p.players[1].resources = resources();
  const s = scenario(p),
    leader = s.state.players.bob!.leader,
    done = target(attackBase(s.state, s.refs.screech!), leader),
    attack = target(
      step(done, i => i.kind === 'play' && i.card === s.refs.event),
      leader,
    );
  expect(
    attack.execution.decision!.options.filter(o => o.intent.kind === 'attack').map(o => o.intent),
  ).toEqual([{ kind: 'attack', attacker: leader, defender: s.refs.sentinel! }]);
});

test('BD-1’s bonus persists across phases, ends on departure and does not revive on replaying that physical card', () => {
  const p = playCard('bd-1--beep-boo-boo-bweep');
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[0].hand!.push({ card: 'the-axe-forgets', ref: 'bounce' });
  const s = scenario(p),
    done = target(
      step(s.state, i => i.kind === 'play' && i.card === s.refs.played),
      s.refs.one!,
    );
  expect(unitStats(done, done.cards[s.refs.one!]!).power).toBe(4);
  const next = nextRound(done);
  expect(unitStats(next, next.cards[s.refs.one!]!).power).toBe(4);
  const bounced = target(
    step(next, i => i.kind === 'play' && i.card === s.refs.bounce),
    s.refs.played!,
  );
  expect(unitStats(bounced, bounced.cards[s.refs.one!]!).power).toBe(3);
  const played = target(
    step(step(bounced, 'pass'), i => i.kind === 'play' && i.card === s.refs.played),
    s.refs.two!,
  );
  expect(played.cards[s.refs.played!]!.incarnation).toBe(2);
  expect(unitStats(played, played.cards[s.refs.one!]!).power).toBe(3);
  expect(unitStats(played, played.cards[s.refs.two!]!).power).toBe(4);
});

test('Darth Maul’s Lightsaber grants an optional unit-only attack with temporary Overwhelm', () => {
  const p = playCard('darth-maul-s-lightsaber');
  p.players[0].leader = { card: 'darth-maul--sith-revealed', deployedAs: 'unit', ref: 'maul' };
  p.players[0].ground = [{ card: ids.marine, ref: 'normal' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    choice = step(s.state, i => i.kind === 'play' && i.target === s.refs.maul);
  expect(
    choice.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === s.state.players.bob!.base,
    ),
  ).toBe(false);
  resume(
    choice,
    choose(choice, i => i.kind === 'attack' && i.defender === s.refs.enemy),
  );
  const attack = step(choice, i => i.kind === 'attack' && i.defender === s.refs.enemy);
  expect(effectiveAbilities(attack, attack.cards[s.refs.maul!]!).keywords).toContain('Overwhelm');
  const done = step(attack, 'accept-effect', [s.refs.normal!, s.refs.enemy!]);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(7);
  expect(effectiveAbilities(done, done.cards[s.refs.maul!]!).keywords).not.toContain('Overwhelm');
  const normal = step(s.state, i => i.kind === 'play' && i.target === s.refs.normal);
  expect(normal.execution.decision!.playerId).toBe('bob');
});

test('Condemn removes the attacker’s own HP ability but preserves external aura modifiers', () => {
  for (const external of [false, true]) {
    const p = position();
    p.players[0].space = [
      { card: 'clone-combat-squadron', ref: 'clone', damage: 3 },
      { card: external ? 'victor-leader--leading-from-the-front' : ids.fighter, ref: 'other' },
    ];
    p.attachments = [{ card: 'condemn', unit: 'clone', owner: 'bob' }];
    const s = scenario(p),
      choice = attackBase(s.state, s.refs.clone!);
    expect(choice.cards[s.refs.clone!]!.zone).toBe(external ? 'space' : 'discard');
    if (external)
      expect(unitStats(choice, choice.cards[s.refs.clone!]!)).toMatchObject({ power: 4, hp: 4 });
    resume(choice, choose(choice, 'decline-effect'));
  }
});

test('Support copies abilities without copying an external aura’s numeric bonus', () => {
  const p = position();
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'attacker' }];
  p.players[0].space = [
    { card: 'clone-combat-squadron', ref: 'source' },
    { card: 'victor-leader--leading-from-the-front' },
    { card: ids.fighter },
  ];
  const s = scenario(p),
    choice = attackBase(s.state, s.refs.attacker!);
  expect(unitStats(choice, choice.cards[s.refs.source!]!)).toMatchObject({ power: 6, hp: 6 });
  choice.attacks[0]!.grantedAbilities.push(
    ...supportOrigins(choice, choice.cards[s.refs.source!]!),
  );
  expect(unitStats(choice, choice.cards[s.refs.attacker!]!)).toMatchObject({ power: 5, hp: 8 });
  resume(choice, choose(choice, 'accept-effect'));
});
