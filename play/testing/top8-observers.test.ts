import { expect, test } from 'bun:test';
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
test('Paz creates two Shielded Mandalorians after ability defeat, but none after lethal combat', () => {
  const p = playFixture('get-lost');
  p.players[0].ground = [{ card: 'paz-vizsla--for-a-brighter-future', ref: 'paz' }];
  p.attachments = [{ card: 'experience', unit: 'paz' }];
  const g = scenario(p),
    after = triggers(target(step(g.state, 'play'), g.refs.paz!));
  expect(tokens(after, 'mandalorian')).toHaveLength(2);
  for (const unit of tokens(after, 'mandalorian'))
    expect(upgrades(after, unit.instanceId)).toEqual(['shield']);
  const d = position();
  d.players[0].ground = [{ card: 'paz-vizsla--for-a-brighter-future', ref: 'paz', damage: 5 }];
  d.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const dead = scenario(d),
    combat = attack(dead.state, dead.refs.paz!, dead.refs.enemy!);
  expect(combat.cards[dead.refs.paz!]!.zone).toBe('discard');
  expect(tokens(combat, 'mandalorian')).toHaveLength(0);
});

test('Mandalorian captures after a defeated defender and cannot capture after dying in mutual combat', () => {
  for (const damage of [0, 6]) {
    const p = position();
    p.players[0].ground = [{ card: 'the-mandalorian--cleaning-up-nevarro', ref: 'mando', damage }];
    p.players[1].ground = [
      { card: ids.marine, ref: 'defender' },
      { card: ids.consular, ref: 'prisoner' },
    ];
    const g = scenario(p),
      pending = attack(g.state, g.refs.mando!, g.refs.defender!);
    const after = target(pending, g.refs.prisoner!);
    expect(after.cards[g.refs.prisoner!]!.zone).toBe(damage ? 'ground' : 'captured');
    if (!damage) expect(after.cards[g.refs.prisoner!]!.capturedBy!.instanceId).toBe(g.refs.mando!);
  }
});

test('Blade Three observes its own base, including damage from a friendly ability, once per damage event', () => {
  const p = position();
  p.players[0].space = [{ card: 'blade-three--bane-of-the-devastator', ref: 'own' }];
  p.players[1].space = [{ card: 'blade-three--bane-of-the-devastator', ref: 'enemy' }];
  const g = scenario(p);
  let after = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases');
  for (let n = 0; n < 10 && after.execution.decision!.kind !== 'action'; n++)
    after = step(after, i => i === after.execution.decision!.options[0]!.intent);
  expect(upgrades(after, g.refs.own!)).toEqual(['advantage']);
  expect(upgrades(after, g.refs.enemy!)).toEqual(['advantage']);
});

test('Vane gains one Advantage after friendly combat base damage, not merely noncombat damage during an attack', () => {
  for (const base of [false, true]) {
    const p = position();
    p.players[0].space = [{ card: 'vane-s-snub-fighter--brash-and-proud', ref: 'vane' }];
    p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    const g = scenario(p);
    const after = target(
      attack(g.state, g.refs.attacker!, base ? g.state.players.bob!.base : g.refs.defender!),
      g.state.players.bob!.base,
    );
    expect(upgrades(after, g.refs.vane!)).toEqual(base ? ['advantage'] : []);
  }
});

test('Ezra pays exhaustion on the leader face after three combat base damage and gives Advantage to a different unit', () => {
  const p = position();
  p.players[0].leader = { card: 'ezra-bridger--it-s-now-or-never', ref: 'ezra' };
  p.players[0].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.consular, ref: 'recipient' },
  ];
  const g = scenario(p),
    pending = attack(g.state, g.refs.attacker!, g.state.players.bob!.base);
  const choice = step(pending, 'accept-effect');
  expect(choice.cards[g.refs.ezra!]!.exhausted).toBe(true);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.recipient! },
  ]);
  expect(upgrades(target(choice, g.refs.recipient!), g.refs.recipient!)).toEqual(['advantage']);
  expect(step(pending, 'decline-effect').cards[g.refs.ezra!]!.exhausted).toBe(false);
  p.players[0].leader.deployedAs = 'unit';
  const u = scenario(p),
    unit = attack(u.state, u.refs.attacker!, u.state.players.bob!.base);
  const self = target(unit, u.refs.ezra!);
  expect(upgrades(self, u.refs.ezra!)).toEqual(['advantage']);
  expect(self.cards[u.refs.ezra!]!.exhausted).toBe(false);
});

test('Boba observes a friendly Bounty Hunter even when the attacker dies, and never a non-Hunter', () => {
  for (const hunter of [false, true]) {
    const p = position();
    p.players[0].leader = { card: 'boba-fett--krayt-s-claw-commander', ref: 'boba' };
    p.players[0].ground = [
      {
        card: hunter ? 'asajj-ventress--harden-your-heart' : ids.marine,
        ref: 'attacker',
        damage: hunter ? 4 : 0,
      },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
    const g = scenario(p);
    let pending = attack(g.state, g.refs.attacker!, g.refs.defender!);
    // Asajj has no other friendly Force unit, so its attack trigger needs no choice.
    expect(pending.cards[g.refs.attacker!]!.zone).toBe('discard');
    if (hunter) {
      resume(pending, choose(pending, 'accept-effect'));
      pending = step(pending, 'accept-effect');
    }
    expect(credits(pending, 'alice')).toHaveLength(hunter ? 1 : 0);
  }
});

test('Boba unit creates a Credit without exhaustion and his Raid counts in combat', () => {
  const p = position();
  p.players[0].leader = {
    card: 'boba-fett--krayt-s-claw-commander',
    deployedAs: 'unit',
    ref: 'boba',
  };
  p.players[1].ground = [{ card: ids.consular, ref: 'defender', damage: 3 }];
  const g = scenario(p),
    after = attack(g.state, g.refs.boba!, g.refs.defender!);
  expect(after.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(credits(after, 'alice')).toHaveLength(1);
});

test('Blockade Runner receives Experience for combat base damage and may decline it', () => {
  const p = position();
  p.players[0].space = [{ card: 'blockade-runner', ref: 'runner' }];
  const g = scenario(p);
  const pending = attack(g.state, g.refs.runner!, g.state.players.bob!.base);
  expect(pending.cards[g.state.players.bob!.base]!.damage).toBe(4);
  expect(upgrades(target(pending, g.refs.runner!), g.refs.runner!)).toEqual(['experience']);
  expect(upgrades(step(pending, 'decline-effect'), g.refs.runner!)).toEqual([]);
});

test('Stay on Target draws for noncombat and combat base damage during its attack, then loses the granted trigger', () => {
  const p = playFixture('stay-on-target');
  p.players[0].space = [{ card: 'yellow-aces-bomber', ref: 'bomber' }];
  p.attachments = [{ card: 'experience', unit: 'bomber' }];
  const g = scenario(p),
    pending = attack(step(g.state, 'play'), g.refs.bomber!, g.state.players.bob!.base);
  const after = target(pending, g.state.players.bob!.base);
  expect(after.players.alice!.hand).toHaveLength(2);
  expect(after.cards[g.state.players.bob!.base]!.damage).toBe(7);
  expect(
    effectiveAbilities(after, after.cards[g.refs.bomber!]!).triggers?.some(
      t => t.id === 'damage-draw',
    ),
  ).toBe(false);
});

test('Stay on Target borrowed damage trigger and opponent draw observer recover before combat', () => {
  const p = playFixture('stay-on-target');
  p.players[0].space = [{ card: 'yellow-aces-bomber', ref: 'bomber' }];
  p.attachments = [{ card: 'experience', unit: 'bomber' }];
  p.players[1].ground = [{ card: 'seasoned-fleet-admiral', ref: 'admiral' }];
  const g = scenario(p),
    pending = target(
      attack(step(g.state, 'play'), g.refs.bomber!, g.state.players.bob!.base),
      g.state.players.bob!.base,
    );
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(pending.attacks).toHaveLength(1);
  expect(pending.players.alice!.hand).toHaveLength(1);
  resume(pending, choose(pending, 'decline-effect'));
  let after = step(pending, 'decline-effect');
  expect(after.players.alice!.hand).toHaveLength(2);
  after = step(after, 'decline-effect');
  expect(after.attacks).toHaveLength(0);
});

test('Yoda observes his own optional Force use after healing, counts friendly units, and permits declining damage', () => {
  const p = playFixture('yoda--my-ally-is-the-force');
  p.players[0].force = true;
  p.players[0].base.damage = 7;
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    force = step(g.state, 'play');
  const heal = step(force, 'accept-effect');
  expect(forceToken(heal, 'alice')).toBeUndefined();
  const pending = target(heal, g.state.players.alice!.base);
  expect(pending.cards[g.state.players.alice!.base]!.damage).toBe(2);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(4);
  expect(step(pending, 'decline-effect').cards[g.refs.enemy!]!.damage).toBe(0);
  expect(step(force, 'decline-effect').cards[g.state.players.alice!.base]!.damage).toBe(7);
});

test('Seasoned Fleet Admiral reacts once to an opponent multi-card draw, never to its own or regroup draws', () => {
  const p = playFixture('ki-adi-mundi--we-must-push-on');
  p.players[0].force = true;
  p.players[1].ground = [{ card: 'seasoned-fleet-admiral', ref: 'admiral' }];
  const g = scenario(p),
    pending = step(step(g.state, 'play'), 'accept-effect');
  expect(pending.execution.decision!.playerId).toBe('bob');
  const after = target(pending, g.refs.admiral!);
  expect(upgrades(after, g.refs.admiral!)).toEqual(['experience']);
  expect(after.players.alice!.hand).toHaveLength(2);
  const next = regroup(after);
  expect(upgrades(next, g.refs.admiral!)).toEqual(['experience']);
  p.players[0].ground = [{ card: 'seasoned-fleet-admiral', ref: 'own' }];
  p.players[1].ground = [];
  const own = scenario(p),
    done = step(step(own.state, 'play'), 'accept-effect');
  expect(done.execution.decision!.kind).toBe('action');
});

test('Silver Angel observes actual healing from a leader ability once for two counters, and offers space-only damage', () => {
  const p = position();
  p.players[0].leader = { card: 'rose-tico--saving-what-we-love', ref: 'rose' };
  p.players[0].space = [{ card: 'silver-angel--trace-s-hope', ref: 'angel', damage: 2 }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.attackedThisPhase = ['angel'];
  const g = scenario(p),
    pending = target(
      step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'heal-vehicle'),
      g.refs.angel!,
    );
  expect(pending.cards[g.refs.angel!]!.damage).toBe(0);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.ground,
    ),
  ).toBe(false);
  const after = target(pending, g.refs.space!);
  expect(after.cards[g.refs.space!]!.zone).toBe('discard');
  expect(after.execution.decision!.kind).toBe('action');
  p.players[0].space![0]!.damage = 0;
  const none = scenario(p),
    done = target(
      step(none.state, i => i.kind === 'use-ability' && i.abilityId === 'heal-vehicle'),
      none.refs.angel!,
    );
  expect(done.execution.decision!.kind).toBe('action');
});

test('Silver Angel also observes distributed healing, with its trigger resolving after Grogu damage', () => {
  const p = position();
  p.players[0].ground = [{ card: 'grogu--mysterious-child', ref: 'grogu' }];
  p.players[0].space = [{ card: 'silver-angel--trace-s-hope', ref: 'angel', damage: 1 }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    allocated = step(
      target(
        step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'heal-damage'),
        g.refs.angel!,
      ),
      'accept-effect',
      [g.refs.angel!],
    );
  const pending = target(allocated, g.refs.ground!);
  expect(pending.cards[g.refs.ground!]!.damage).toBe(1);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.space),
  );
  expect(target(pending, g.refs.space!).cards[g.refs.space!]!.zone).toBe('discard');
});

test('Kylo reacts to a friendly played upgrade with optional Force payment, but not an opponent upgrade or created token', () => {
  const p = playFixture('preparation');
  p.players[0].force = true;
  p.players[0].ground = [{ card: 'kylo-ren--i-know-your-story', ref: 'kylo' }];
  const g = scenario(p),
    pending = trigger(
      step(g.state, i => i.kind === 'play' && i.target === g.refs.kylo),
      'upgrade-force-draw',
    );
  const after = step(pending, 'accept-effect');
  expect(forceToken(after, 'alice')).toBeUndefined();
  expect(after.players.alice!.hand).toHaveLength(1);
  expect(forceToken(step(pending, 'decline-effect'), 'alice')).toBeDefined();
  const e = playFixture('creditor-s-claim');
  e.players[1].force = true;
  e.players[1].ground = [{ card: 'kylo-ren--i-know-your-story', ref: 'kylo' }];
  const enemy = scenario(e),
    other = step(enemy.state, i => i.kind === 'play' && i.target === enemy.refs.kylo);
  expect(other.execution.decision!.kind).toBe('action');
  const t = playFixture('shield-drive-outfitter');
  t.players[0].force = true;
  t.players[0].ground = [{ card: 'kylo-ren--i-know-your-story', ref: 'kylo' }];
  const made = scenario(t),
    token = target(step(step(made.state, 'play'), 'accept-effect'), made.refs.kylo!);
  expect(token.execution.decision!.kind).toBe('action');
  expect(forceToken(token, 'alice')).toBeDefined();
});

test('Whistling Birds damages each enemy in its former host arena after Overwhelm, even if combat defeated the host', () => {
  const p = position();
  p.players[0].ground = [{ card: 'defenders-of-the-forest', ref: 'host', damage: 3 }];
  p.attachments = [{ card: 'whistling-birds', unit: 'host' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'defender' },
    { card: ids.consular, ref: 'same' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'other' }];
  const g = scenario(p),
    after = attack(g.state, g.refs.host!, g.refs.defender!);
  expect(after.cards[g.refs.host!]!.zone).toBe('discard');
  expect(after.cards[g.state.players.bob!.base]!.damage).toBe(4);
  expect(after.cards[g.refs.same!]!.damage).toBe(2);
  expect(after.cards[g.refs.other!]!.damage).toBe(0);
});
