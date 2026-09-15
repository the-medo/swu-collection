import { expect, test } from 'bun:test';
import { spendingPower, spendableCredits } from '../engine/credits.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { cardDefinition } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { credits, readyResourceCount } from '../engine/credits.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, abilityId: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === abilityId)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function regroup(s: GameState) {
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

function triggers(s: GameState) {
  for (let n = 0; n < 15 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
}

function randomize(s: GameState) {
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  }).state;
}
function targets(s: GameState) {
  return s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
}

function pilot(s: GameState, card: string, host: string) {
  return step(
    s,
    i => i.kind === 'play' && i.card === card && i.target === host && i.piloting === 'piloting',
  );
}
function blank(s: GameState, id: string) {
  modifyUnit(s, s.cards[s.players.alice!.leader]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
}

test('Conveyex disables enemy Credit payments without removing or spending the physical tokens', () => {
  const p = playFixture('open-fire');
  p.players[0].resources = [];
  p.players[0].credits = ['a', 'b', 'c'];
  p.players[1].ground = [{ card: 'conveyex-security-captain', ref: 'captain' }];
  const g = scenario(p);
  expect(credits(g.state, 'alice')).toHaveLength(3);
  expect(spendingPower(g.state, 'alice')).toBe(0);
  expect(g.state.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(false);
  blank(g.state, g.refs.captain!);
  expect(spendableCredits(g.state, 'alice')).toHaveLength(3);
});

test('Conveyex removes its restriction when defeated and does not disable its controller Credits', () => {
  const p = playFixture('get-lost');
  p.players[0].credits = ['credit'];
  p.players[1].credits = ['enemy-credit'];
  p.players[1].ground = [{ card: 'conveyex-security-captain', ref: 'captain' }];
  p.attachments = [{ card: 'experience', unit: 'captain', owner: 'bob' }];
  const g = scenario(p);
  expect(spendableCredits(g.state, 'bob')).toHaveLength(1);
  const pending = step(g.state, 'play');
  expect(pending.execution.frames[0]!.kind).not.toBe('credit-payment');
  const after = target(pending, g.refs.captain!);
  expect(spendableCredits(after, 'alice')).toHaveLength(1);
  expect(after.cards[g.refs.credit!]!.zone).toBe('resources');
});

test('Gorn steals a Credit without changing ownership; the new controller can spend it and recover mid-payment', () => {
  const p = playFixture('open-fire');
  p.players[0].resources = [];
  p.players[0].credits = ['own-a', 'own-b'];
  p.players[1].credits = ['stolen'];
  p.players[0].ground = [{ card: 'lieutenant-gorn--i-deserve-worse', ref: 'gorn' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'victim' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.gorn!, g.state.players.bob!.base);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.stolen),
  );
  const stolen = target(pending, g.refs.stolen!);
  expect(stolen.cards[g.refs.stolen!]!.controller).toBe('alice');
  expect(stolen.cards[g.refs.stolen!]!.owner).toBe('bob');
  expect(credits(stolen, 'bob')).toHaveLength(0);
  const payment = step(step(stolen, 'pass'), 'play');
  const choices = [g.refs['own-a']!, g.refs['own-b']!, g.refs.stolen!];
  resume(payment, choose(payment, 'accept-effect', choices));
  const paid = step(payment, 'accept-effect', choices);
  expect(paid.cards[g.refs.stolen!]!.zone).toBe('set-aside');
  expect(paid.cards[g.refs.stolen!]!.owner).toBe('bob');
  expect(target(paid, g.refs.victim!).cards[g.refs.victim!]!.damage).toBe(4);
});

test('Gorn may take a disabled enemy Credit; its payment ability follows the new controller relation', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'lieutenant-gorn--i-deserve-worse', ref: 'gorn' },
    { card: 'conveyex-security-captain' },
  ];
  p.players[1].credits = ['credit'];
  const g = scenario(p);
  expect(spendableCredits(g.state, 'bob')).toEqual([]);
  const after = target(attack(g.state, g.refs.gorn!, g.state.players.bob!.base), g.refs.credit!);
  expect(spendableCredits(after, 'alice').map(c => c.instanceId)).toEqual([g.refs.credit!]);
});

test('Tempest tracks the damage dealer including a non-unit leader ability, and damages only enemy space units', () => {
  for (const dealer of ['alice', 'bob']) {
    const p = playFixture('tempest-assault');
    p.activePlayer = dealer;
    p.players[0].space = [{ card: ids.fighter, ref: 'friendly' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
    const g = scenario(p);
    let damaged = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases');
    if (dealer === 'alice') damaged = step(damaged, 'pass');
    const after = step(damaged, 'play');
    expect(after.cards[g.refs.enemy!]!.zone).toBe(dealer === 'alice' ? 'discard' : 'space');
    expect(after.cards[g.refs.friendly!]!.zone).toBe('space');
    expect(after.cards[g.refs.ground!]!.damage).toBe(0);
  }
});

test('Tempest cannot reuse base damage from the previous action phase', () => {
  const p = playFixture('tempest-assault');
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p),
    damaged = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases');
  const next = regroup(damaged);
  expect(next.phaseHistory.enemyBaseDamaged).toEqual([]);
  expect(
    step(next, i => i.kind === 'play' && i.card === g.refs.played).cards[g.refs.enemy!]!.zone,
  ).toBe('space');
});

test('Decimator discount requires actual indirect damage, including damage to a unit instead of a base', () => {
  for (const indirect of [false, true]) {
    const p = playFixture('decimator-of-dissidents');
    p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
    p.players[0].space = [{ card: 'red-squadron-y-wing', ref: 'wing' }];
    p.players[1].space = [{ card: 'blockade-runner', ref: 'target' }];
    const g = scenario(p);
    let done = attack(g.state, indirect ? g.refs.wing! : g.refs.marine!, g.state.players.bob!.base);
    if (indirect) done = step(done, 'accept-effect', Array(3).fill(g.refs.target!));
    expect(done.phaseHistory.indirectDamage).toEqual(indirect ? ['alice'] : []);
    const after = step(step(done, 'pass'), 'play');
    expect(readyResourceCount(after, 'alice')).toBe(20 - (indirect ? 5 : 6));
  }
});

test('Mist Hunter counts a Pilot played in either role, but not a non-Hunter or a Pilot merely present', () => {
  for (const mode of ['unit', 'upgrade', 'neither']) {
    const p = playFixture(mode === 'neither' ? ids.marine : 'clone-pilot');
    p.players[0].space = [
      { card: 'mist-hunter--the-findsman-s-pursuit', ref: 'hunter' },
      { card: ids.fighter, ref: 'host' },
    ];
    p.players[0].ground = [{ card: 'clone-pilot' }];
    const g = scenario(p),
      played =
        mode === 'upgrade'
          ? pilot(g.state, g.refs.played!, g.refs.host!)
          : step(g.state, i => i.kind === 'play' && !i.piloting);
    const pending = attack(step(played, 'pass'), g.refs.hunter!, g.state.players.bob!.base);
    if (mode === 'neither') expect(pending.execution.decision!.kind).toBe('action');
    else {
      expect(
        step(pending, i => i.kind === 'choose-mode' && i.mode === 'draw').players.alice!.hand,
      ).toHaveLength(1);
      expect(
        step(pending, i => i.kind === 'choose-mode' && i.mode === 'decline').players.alice!.hand,
      ).toHaveLength(0);
    }
  }
});

test('Client leader requires a newly created token; an initial Credit is insufficient and a gained Force token qualifies', () => {
  const p = position();
  p.players[0].leader.card = 'the-client--please-lower-your-blaster';
  p.players[0].credits = ['existing'];
  p.players[0].ground = [{ card: 'acolyte-of-the-beyond', ref: 'acolyte' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  const empty = step(
    g.state,
    i => i.kind === 'use-ability' && i.abilityId === 'exhaust-after-token',
  );
  expect(empty.cards[g.refs.target!]!.exhausted).toBe(false);
  const created = attack(g.state, g.refs.acolyte!, g.state.players.bob!.base);
  expect(created.phaseHistory.tokensCreated).toEqual(['alice']);
  const pending = step(
    step(created, 'pass'),
    i => i.kind === 'use-ability' && i.abilityId === 'exhaust-after-token',
  );
  expect(target(pending, g.refs.target!).cards[g.refs.target!]!.exhausted).toBe(true);
});

test('Client deployment creates a Shield token that enables its unit attack ability in the same phase', () => {
  const p = position();
  p.players[0].leader = { card: 'the-client--please-lower-your-blaster', ref: 'client' };
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p),
    deployed = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(upgrades(deployed, g.refs.client!)).toEqual(['shield']);
  expect(deployed.phaseHistory.tokensCreated).toEqual(['alice']);
  const pending = attack(step(deployed, 'pass'), g.refs.client!, g.state.players.bob!.base);
  expect(target(pending, g.refs.target!).cards[g.refs.target!]!.exhausted).toBe(true);
});

test('Vult gains a Shield after a deck discard but not merely playing an event into discard', () => {
  for (const discard of [false, true]) {
    const p = playFixture('vult-skerris-s-defender--secret-project');
    p.players[0].ground = [{ card: 'bt-1--blastomech', ref: 'bt' }];
    p.players[0].hand!.push({ card: 'open-fire', ref: 'event' });
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    const before = discard
      ? attack(g.state, g.refs.bt!, g.state.players.bob!.base)
      : target(
          step(g.state, i => i.kind === 'play' && i.card === g.refs.event),
          g.refs.enemy!,
        );
    const after = step(step(before, 'pass'), i => i.kind === 'play' && i.card === g.refs.played);
    expect(upgrades(after, g.refs.played!)).toEqual(discard ? ['shield'] : []);
  }
});

test('Vult counts a forced self-hand discard and its attack can damage and exhaust a friendly space unit', () => {
  const p = playFixture('vult-skerris-s-defender--secret-project');
  p.activePlayer = 'bob';
  p.players[0].hand!.push({ card: ids.marine, ref: 'discard' });
  p.players[0].ground = [{ card: ids.marine, ref: 'exhausted' }];
  p.players[1].hand = [{ card: 'interrogation-droid', ref: 'droid' }];
  p.players[1].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    discard = target(step(g.state, 'play'), g.refs.exhausted!);
  const after = step(step(discard, 'accept-effect', [g.refs.discard!]), 'play');
  expect(upgrades(after, g.refs.played!)).toEqual(['shield']);
  const a = position();
  a.players[0].space = [
    { card: 'vult-skerris-s-defender--secret-project', ref: 'vult' },
    { card: 'blockade-runner', ref: 'friendly' },
  ];
  const h = scenario(a),
    attacked = target(attack(h.state, h.refs.vult!, h.state.players.bob!.base), h.refs.friendly!);
  expect(attacked.cards[h.refs.friendly!]!.damage).toBe(1);
  expect(attacked.cards[h.refs.friendly!]!.exhausted).toBe(true);
});

test('Outcast buffs its own entry and subsequent friendly units, with phase expiry', () => {
  const p = playFixture('outcast--mercenary-starship');
  p.players[0].hand!.push({ card: ids.marine, ref: 'marine' });
  const g = scenario(p),
    outcast = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
  expect(unitStats(outcast, outcast.cards[g.refs.played!]!).power).toBe(2);
  const unit = step(step(outcast, 'pass'), 'play');
  expect(unitStats(unit, unit.cards[g.refs.marine!]!).power).toBe(4);
  const next = regroup(unit);
  expect(unitStats(next, next.cards[g.refs.played!]!).power).toBe(1);
  expect(unitStats(next, next.cards[g.refs.marine!]!).power).toBe(3);
});

test('Outcast observes rescued units and token units but not Pilot upgrades', () => {
  const p = playFixture('get-lost');
  p.players[0].space = [{ card: 'outcast--mercenary-starship', ref: 'outcast' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'guard' }];
  p.attachments = [{ card: 'experience', unit: 'guard' }];
  p.captured = [{ card: ids.marine, owner: 'alice', guard: 'guard', ref: 'rescued' }];
  const g = scenario(p),
    rescued = target(step(g.state, 'play'), g.refs.guard!);
  expect(unitStats(rescued, rescued.cards[g.refs.rescued!]!).power).toBe(4);
  const token = playFixture('tantive-iv--fleeing-the-empire');
  token.players[0].space = [{ card: 'outcast--mercenary-starship' }];
  const t = scenario(token),
    created = triggers(step(t.state, 'play'));
  for (const unit of tokens(created, 'x-wing')) expect(unitStats(created, unit).power).toBe(3);
  expect(tokens(created, 'x-wing').length).toBeGreaterThan(0);
  const pilotBoard = playFixture('clone-pilot');
  pilotBoard.players[0].space = [{ card: 'outcast--mercenary-starship', ref: 'outcast' }];
  const h = scenario(pilotBoard),
    attached = pilot(h.state, h.refs.played!, h.refs.outcast!);
  expect(unitStats(attached, attached.cards[h.refs.outcast!]!).power).toBe(3);
});

test('Guerilla readies only after actual base damage from its own indirect ability, with assignment recovery', () => {
  for (const base of [false, true]) {
    const p = playFixture('guerilla-soldier');
    p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
    const g = scenario(p),
      pending = step(
        step(g.state, 'play'),
        i => i.kind === 'choose-player' && i.playerId === 'bob',
      );
    const choices = Array(3).fill(base ? g.state.players.bob!.base : g.refs.unit!);
    resume(pending, choose(pending, 'accept-effect', choices));
    const after = step(pending, 'accept-effect', choices);
    expect(after.cards[g.refs.played!]!.exhausted).toBe(!base);
    expect(after.phaseHistory.indirectDamage).toEqual(['alice']);
  }
});

test('Eviscerator grants two Advantages to other friendly units and suppresses their expiry until its abilities are lost', () => {
  const p = playFixture('eviscerator--burn-them-away');
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  const g = scenario(p),
    played = step(g.state, 'play');
  expect(upgrades(played, g.refs.marine!)).toEqual(['advantage', 'advantage']);
  expect(upgrades(played, g.refs.played!)).toEqual([]);
  const after = attack(step(played, 'pass'), g.refs.marine!, g.state.players.bob!.base);
  expect(upgrades(after, g.refs.marine!)).toHaveLength(2);
  const next = regroup(after);
  const attacking = attack(next, g.refs.played!, g.state.players.bob!.base);
  expect(upgrades(attacking, g.refs.marine!)).toHaveLength(4);
  const a = position();
  a.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  a.players[0].space = [{ card: 'eviscerator--burn-them-away', ref: 'eviscerator' }];
  a.attachments = [{ card: 'advantage', unit: 'marine' }];
  const h = scenario(a);
  blank(h.state, h.refs.eviscerator!);
  const unprotected = attack(h.state, h.refs.marine!, h.state.players.bob!.base);
  expect(upgrades(unprotected, h.refs.marine!)).toEqual([]);
  expect(unprotected.cards[h.state.players.bob!.base]!.damage).toBe(4);
});

test('Giving a token to an enemy unit records its creator separately from its owner', () => {
  const p = playFixture('darth-vader--twilight-of-the-apprentice');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p),
    after = target(target(step(g.state, 'play'), g.refs.played!), g.refs.enemy!);
  expect(after.phaseHistory.tokensCreated).toEqual(['alice']);
  const shield = attachedUpgrades(after, after.cards[g.refs.enemy!]!)[0]!;
  expect(shield.owner).toBe('bob');
  expect(shield.controller).toBe('bob');
});
