import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { initialState } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position } from './helpers.ts';

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
function finishTriggers(s: GameState) {
  for (let n = 0; s.execution.decision?.kind !== 'action' && n < 40; n++) {
    const d = s.execution.decision!;
    const option = d.options.find(o => o.intent.kind === 'decline-effect') ?? d.options[0]!;
    s = step(s, i => i === option.intent);
  }
  expect(s.execution.decision?.kind).toBe('action');
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
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const tokens = (s: GameState, cardId: string) =>
  Object.values(s.cards).filter(
    c => c.cardId === cardId && (c.zone === 'ground' || c.zone === 'space'),
  );
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);

test('unit tokens are created exhausted, Spy has Raid 2, and deck admission rejects tokens', () => {
  const { state } = scenario(playCard('i-am-the-senate'));
  const after = step(state, 'play');
  expect(tokens(after, 'spy')).toHaveLength(5);
  expect(tokens(after, 'spy').every(c => c.exhausted)).toBe(true);
  expect(after.facts.filter(f => f.type === 'created')).toHaveLength(5);
  expect(after.facts.filter(f => f.type === 'played')).toHaveLength(1);
  const p = position();
  p.players[0].ground = [{ card: 'spy', ref: 'spy' }];
  const s = scenario(p);
  expect(unitStats(s.state, s.state.cards[s.refs.spy!]!).power).toBe(0);
  expect(step(s.state, 'attack').cards[s.state.players.bob!.base]!.damage).toBe(2);
  for (const cardId of ['spy', 'mandalorian', 'x-wing', 'advantage']) {
    const c = config();
    c.players[0].deck = [{ cardId, quantity: 24 }];
    expect(() => initialState(c)).toThrow();
  }
});

test('Pre Vizsla limits total remaining HP, excludes leaders, and creates a Shielded Mandalorian for each defeated unit', () => {
  const p = playCard('pre-vizsla--strong-willed-ruler');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly', damage: 1 }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy', damage: 3 },
    { card: ids.marine, ref: 'extra' },
  ];
  p.players[1].leader.deployedAs = 'unit';
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const { state, refs } = scenario(p),
    choice = step(state, 'play');
  expect(choice.execution.decision!.selection!.cards).not.toContain(choice.players.bob!.leader);
  expect(choice.execution.decision!.selection!.budget!.costs[refs.enemy!]).toBe(4);
  expect(() => step(choice, 'accept-effect', [refs.enemy!, refs.extra!])).toThrow();
  expect(() => step(choice, 'accept-effect', [refs.friendly!, refs.friendly!])).toThrow();
  const input = choose(choice, 'accept-effect', [refs.friendly!, refs.enemy!]);
  resume(choice, input);
  const after = finishTriggers(advance(choice, input).state);
  expect(after.cards[refs.friendly!]!.zone).toBe('discard');
  expect(after.cards[refs.enemy!]!.zone).toBe('discard');
  expect(after.cards[refs.shield!]!.zone).toBe('set-aside');
  expect(after.cards[refs.extra!]!.zone).toBe('ground');
  expect(tokens(after, 'mandalorian')).toHaveLength(2);
  for (const m of tokens(after, 'mandalorian'))
    expect(upgrades(after, m.instanceId)).toEqual(['shield']);
  const none = step(choice, 'accept-effect', []);
  expect(tokens(none, 'mandalorian')).toHaveLength(0);
  const projector = new Projector(choice.gameId, { role: 'player', playerId: 'alice' });
  const view = projector.project(choice);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  const json = JSON.stringify(view);
  for (const id of choice.execution.decision!.selection!.cards)
    expect(json).not.toContain(`"${id}"`);
  expect(new Projector(choice.gameId, { role: 'spectator' }).project(choice).decision).toBeNull();
});

test('Koska uses current-phase defeat history and gains Sentinel only while a token unit is in play', () => {
  for (const happened of [false, true]) {
    const p = playCard('koska-reeves--warrior-of-mandalore');
    p.players[0].discard = [{ card: ids.marine, ref: 'dead' }];
    p.defeatedThisPhase = happened ? ['dead'] : [];
    const s = scenario(p),
      after = step(s.state, 'play');
    expect(tokens(after, 'mandalorian')).toHaveLength(happened ? 1 : 0);
    expect(
      effectiveAbilities(after, after.cards[s.refs.played!]!).keywords?.includes('Sentinel'),
    ).toBe(happened);
  }
  const p = playCard('the-axe-forgets');
  p.players[1].ground = [
    { card: 'koska-reeves--warrior-of-mandalore', ref: 'koska' },
    { card: 'spy', ref: 'spy' },
  ];
  const s = scenario(p),
    after = target(step(s.state, 'play'), s.refs.spy!);
  expect(after.cards[s.refs.spy!]!.zone).toBe('set-aside');
  expect(after.players.bob!.hand).toHaveLength(0);
  expect(effectiveAbilities(after, after.cards[s.refs.koska!]!).keywords).not.toContain('Sentinel');
  const invalid = structuredClone(s.state);
  invalid.phaseHistory.defeated.push({
    ...invalid.cards[s.refs.koska!]!,
    traits: [],
    incarnation: 999,
    leaderUnit: false,
  });
  expect(() => decodeState(encodeState(invalid))).toThrow();
});

test('Marrok replaces Sentinel with Saboteur while upgraded and regains Sentinel after removal', () => {
  const p = playCard('outer-rim-constable');
  p.players[1].ground = [{ card: 'marrok--mysterious-warrior', ref: 'marrok' }];
  p.attachments = [{ card: 'experience', unit: 'marrok', ref: 'upgrade' }];
  const s = scenario(p);
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.marrok!]!).keywords).toEqual([
    'Saboteur',
  ]);
  const after = target(step(s.state, 'play'), s.refs.upgrade!);
  expect(effectiveAbilities(after, after.cards[s.refs.marrok!]!).keywords).toEqual(['Sentinel']);
});

test('Greef leader may exhaust for the exact played unit; the payment and subject survive recovery', () => {
  const p = playCard(ids.marine);
  p.players[0].leader = { card: 'greef-karga--gracious-magistrate', ref: 'greef' };
  p.players[0].ground = [{ card: ids.marine, ref: 'older' }];
  const s = scenario(p),
    payment = step(s.state, 'play');
  resume(payment, choose(payment, 'accept-effect'));
  const after = step(payment, 'accept-effect');
  expect(after.cards[s.refs.greef!]!.exhausted).toBe(true);
  expect(upgrades(after, s.refs.played!)).toEqual(['advantage']);
  expect(upgrades(after, s.refs.older!)).toEqual([]);
  const declined = step(payment, 'decline-effect');
  expect(declined.cards[s.refs.greef!]!.exhausted).toBe(false);
  p.players[0].leader.exhausted = true;
  expect(upgrades(finishTriggers(step(scenario(p).state, 'play')), s.refs.played!)).toEqual([]);
  const event = playCard('i-am-the-senate');
  event.players[0].leader = p.players[0].leader;
  const created = finishTriggers(step(scenario(event).state, 'play'));
  expect(tokens(created, 'spy')).toHaveLength(5);
  expect(tokens(created, 'spy').every(c => upgrades(created, c.instanceId).length === 0)).toBe(
    true,
  );
});

test('Greef unit grants Advantage to every created unit; deployment and event play do not trigger him', () => {
  const p = playCard('i-am-the-senate');
  p.players[0].leader = {
    card: 'greef-karga--gracious-magistrate',
    deployedAs: 'unit',
    ref: 'greef',
  };
  const s = scenario(p),
    after = finishTriggers(step(s.state, 'play'));
  expect(tokens(after, 'spy')).toHaveLength(5);
  for (const c of tokens(after, 'spy'))
    expect(upgrades(after, c.instanceId)).toEqual(['advantage']);
  expect(upgrades(after, s.refs.greef!)).toEqual([]);
  p.players[0].leader.deployedAs = null;
  const leader = scenario(p),
    deployed = step(leader.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(upgrades(deployed, leader.refs.greef!)).toEqual([]);
});

test('Advantage contributes power to attacking and defending, then defeats itself at combat end', () => {
  for (const defending of [false, true]) {
    const p = position();
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    p.attachments = [
      { card: 'advantage', unit: defending ? 'defender' : 'attacker', ref: 'advantage' },
    ];
    const s = scenario(p),
      after = step(s.state, i => i.kind === 'attack' && i.defender === s.refs.defender);
    expect(after.cards[s.refs.attacker!]!.damage).toBe(defending ? 4 : 3);
    expect(after.cards[s.refs.defender!]!.damage).toBe(defending ? 3 : 4);
    expect(after.cards[s.refs.advantage!]!.zone).toBe('set-aside');
    expect(unitStats(after, after.cards[s.refs.attacker!]!).power).toBe(3);
  }
});

test('Justifier grants Advantage only after its damage defeats that exact unit, including Shield prevention', () => {
  for (const shielded of [false, true]) {
    const p = playCard('justifier--relentless');
    p.players[1].ground = [
      { card: ids.trooper, ref: 'victim' },
      { card: ids.trooper, ref: 'other' },
    ];
    if (shielded) p.attachments = [{ card: 'shield', unit: 'victim' }];
    const s = scenario(p),
      choice = target(step(s.state, 'play'), s.refs.victim!);
    if (shielded) {
      expect(choice.execution.decision!.kind).toBe('action');
      expect(choice.cards[s.refs.victim!]!.damage).toBe(0);
    } else {
      resume(
        choice,
        choose(choice, i => i.kind === 'target' && i.card === s.refs.played),
      );
      const after = target(choice, s.refs.played!);
      expect(upgrades(after, s.refs.played!)).toEqual(['advantage']);
      expect(after.cards[s.refs.victim!]!.zone).toBe('discard');
      expect(after.cards[s.refs.other!]!.zone).toBe('ground');
    }
  }
});

test('Chimaera can sacrifice itself in the simultaneous pair and still observes the enemy defeat', () => {
  const p = playCard('chimaera--a-frightening-reality');
  p.players[0].base.damage = 6;
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].leader.deployedAs = 'unit';
  const s = scenario(p),
    first = step(s.state, 'play'),
    enemy = target(first, s.refs.played!);
  expect(enemy.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.enemy! },
  ]);
  resume(enemy, choose(enemy, 'target'));
  const after = target(enemy, s.refs.enemy!);
  expect(after.cards[s.refs.played!]!.zone).toBe('discard');
  expect(after.cards[s.refs.enemy!]!.zone).toBe('discard');
  expect(after.cards[after.players.alice!.base]!.damage).toBe(4);
  expect(step(first, 'decline-effect').cards[s.refs.enemy!]!.zone).toBe('ground');
});

test('Marrok fighter borrows its conditional power through Support using the recipient and only a damaged unit defender', () => {
  for (const damaged of [false, true]) {
    const p = playCard('marrok-s-fiend-fighter--formidable-pursuer');
    p.players[0].ground = [{ card: ids.marine, ref: 'receiver' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: damaged ? 1 : 0 }];
    p.players[1].base.damage = 1;
    const s = scenario(p),
      support = step(s.state, 'play');
    const after = step(support, i => i.kind === 'attack' && i.defender === s.refs.enemy);
    expect(after.cards[s.refs.enemy!]!.damage).toBe(damaged ? 6 : 3);
    const base = step(
      support,
      i => i.kind === 'attack' && i.defender === support.players.bob!.base,
    );
    expect(base.cards[base.players.bob!.base]!.damage).toBe(4);
  }
});

test('Battered Haulcraft damages itself even without an enemy, and its target is an enemy space unit', () => {
  const p = playCard('battered-haulcraft');
  const empty = scenario(p),
    noEnemy = step(empty.state, 'play');
  expect(noEnemy.cards[empty.refs.played!]!.damage).toBe(1);
  p.players[1].ground = [{ card: ids.marine }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.enemy! },
  ]);
  const after = target(choice, s.refs.enemy!);
  expect(after.cards[s.refs.played!]!.damage).toBe(1);
  expect(after.cards[s.refs.enemy!]!.zone).toBe('discard');
});

test('Haymaker uses the increased power and exact friendly source; Protect the Pod uses remaining HP', () => {
  const p = playCard('haymaker');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'other' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.ally!);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.enemy! },
  ]);
  const after = target(choice, s.refs.enemy!);
  expect(after.cards[s.refs.enemy!]!.damage).toBe(4);
  expect(upgrades(after, s.refs.ally!)).toEqual(['experience']);
  expect(after.facts.find(f => f.type === 'damage')!.cards[0]!.instanceId).toBe(s.refs.ally!);
  const q = playCard('protect-the-pod');
  q.players[0].ground = [{ card: ids.consular, ref: 'ally', damage: 2 }];
  q.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const t = scenario(q),
    allies = step(t.state, 'play');
  expect(allies.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: t.refs.ally! },
  ]);
  const enemies = target(allies, t.refs.ally!);
  resume(enemies, choose(enemies, 'target'));
  expect(target(enemies, t.refs.enemy!).cards[t.refs.enemy!]!.damage).toBe(5);
});

test('Covering the Wing excludes its created token; Contempt still creates a Spy with no damage target', () => {
  const p = playCard('covering-the-wing');
  p.players[1].ground = [{ card: ids.marine, ref: 'other' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(tokens(choice, 'x-wing')).toHaveLength(1);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.other! },
    { kind: 'decline-effect' },
  ]);
  expect(upgrades(target(choice, s.refs.other!), s.refs.other!)).toEqual(['shield']);
  const t = scenario(playCard('contempt-for-culture'));
  expect(tokens(step(t.state, 'play'), 'spy')).toHaveLength(1);
});

test('Crucible grants Experience to other friendly units both entering and departing; Luke counts himself for four units', () => {
  const p = playCard('crucible--centuries-of-wisdom');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    after = step(s.state, 'play');
  expect(upgrades(after, s.refs.ally!)).toEqual(['experience']);
  expect(upgrades(after, s.refs.played!)).toEqual([]);
  expect(upgrades(after, s.refs.enemy!)).toEqual([]);
  const death = playCard('direct-hit');
  death.players[0].space = [{ card: 'crucible--centuries-of-wisdom', ref: 'crucible' }];
  death.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const died = scenario(death),
    departed = target(step(died.state, 'play'), died.refs.crucible!);
  expect(upgrades(departed, died.refs.ally!)).toEqual(['experience']);
  for (const count of [2, 3]) {
    const q = playCard('luke-skywalker--answering-the-call');
    q.players[0].ground = Array.from({ length: count }, () => ({ card: ids.marine }));
    q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const t = scenario(q),
      end = step(t.state, 'play');
    expect(end.cards[t.refs.enemy!]!.damage).toBe(count === 3 ? 3 : 0);
  }
});

test('Finn excludes unique units, Ezra excludes himself and requires Creature or Spectre, and Dedra creates a Spy during Ambush', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'finn--looking-closer', ref: 'finn' },
    { card: ids.marine, ref: 'marine' },
  ];
  const s = scenario(p),
    shields = step(s.state, i => i.kind === 'attack' && i.attacker === s.refs.finn);
  expect(shields.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.marine! },
    { kind: 'decline-effect' },
  ]);
  expect(upgrades(target(shields, s.refs.marine!), s.refs.marine!)).toEqual(['shield']);
  const q = position();
  q.players[0].ground = [
    { card: 'ezra-bridger--attuned-with-life', ref: 'ezra' },
    { card: ids.marine },
  ];
  q.players[1].ground = [{ card: 'corellian-hounds', ref: 'creature' }];
  const t = scenario(q),
    experience = step(t.state, 'attack');
  expect(experience.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: t.refs.creature! },
    { kind: 'decline-effect' },
  ]);
  expect(upgrades(target(experience, t.refs.creature!), t.refs.creature!)).toEqual(['experience']);
  const r = playCard('dedra-meero--with-verifiable-data');
  r.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const u = scenario(r),
    attack = target(step(u.state, 'play'), u.refs.enemy!);
  expect(tokens(attack, 'spy')).toHaveLength(1);
  expect(attack.cards[u.refs.played!]!.exhausted).toBe(true);
  expect(attack.cards[u.refs.enemy!]!.damage).toBe(5);
});

test('Nimble Prowess restricts its exhaust choice to the host arena; Craving Power reads the attached unit after its bonus', () => {
  const p = playCard('nimble-prowess');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: 'x-wing', ref: 'space' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.host! },
    { kind: 'target', card: s.refs.enemy! },
    { kind: 'decline-effect' },
  ]);
  expect(target(choice, s.refs.enemy!).cards[s.refs.enemy!]!.exhausted).toBe(true);
  p.players[0].hand = [{ card: 'craving-power', ref: 'played' }];
  const t = scenario(p),
    damage = step(t.state, 'play');
  resume(
    damage,
    choose(damage, i => i.kind === 'target' && i.card === t.refs.enemy),
  );
  expect(target(damage, t.refs.enemy!).cards[t.refs.enemy!]!.damage).toBe(5);
});

test('a ready Greef leader can pay for only one of five simultaneous token creation triggers', () => {
  const p = playCard('i-am-the-senate');
  p.players[0].leader = { card: 'greef-karga--gracious-magistrate', ref: 'greef' };
  const s = scenario(p),
    choices = step(s.state, 'play');
  const payment = trigger(choices, 'on-friendly-created');
  resume(payment, choose(payment, 'accept-effect'));
  const after = finishTriggers(step(payment, 'accept-effect'));
  expect(
    tokens(after, 'spy').filter(c => upgrades(after, c.instanceId).includes('advantage')),
  ).toHaveLength(1);
  expect(after.cards[s.refs.greef!]!.exhausted).toBe(true);
});
