import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { move } from '../engine/state.ts';
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

const rex = 'captain-rex--into-the-firefight',
  invisible = 'the-invisible-hand--crawling-with-vultures',
  jabba = 'jabba-the-hutt--eminence-of-tatooine';
const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
function random(s: GameState) {
  while (s.execution.random) {
    const r = s.execution.random;
    s = advance(s, {
      type: 'random',
      gameId: s.gameId,
      expectedRevision: s.revision,
      requestId: r.id,
      values: r.bounds.map(() => 0),
    }).state;
  }
  return s;
}
function search(s: GameState, cards: string[]) {
  return random(step(s, 'search', cards));
}
const isSentinel = (s: GameState, id: string) =>
  effectiveAbilities(s, s.cards[id]!).keywords?.includes('Sentinel') ?? false;

test('Rex gives himself and an enemy unit Sentinel on play, with phase expiry', () => {
  const p = playCard(rex);
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const { state, refs } = scenario(p),
    pending = play(state, refs.played!);
  expect(isSentinel(pending, refs.played!)).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.enemy),
  );
  const done = target(pending, refs.enemy!);
  expect(isSentinel(done, refs.enemy!)).toBe(true);
  const next = nextRound(done);
  expect(isSentinel(next, refs.enemy!)).toBe(false);
  expect(isSentinel(next, refs.played!)).toBe(false);
  const q = playCard(rex),
    alone = scenario(q);
  expect(isSentinel(play(alone.state, alone.refs.played!), alone.refs.played!)).toBe(true);
});

test('Rex grants Sentinel when his attack ends only if he survived that attack', () => {
  const p = position();
  p.players[0].ground = [{ card: rex, ref: 'rex' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.marine, ref: 'other' },
  ];
  const live = scenario(p);
  const pending = attack(live.state, live.refs.rex!, live.state.players.bob!.base);
  expect(isSentinel(pending, live.refs.rex!)).toBe(true);
  expect(isSentinel(target(pending, live.refs.other!), live.refs.other!)).toBe(true);
  p.players[0].ground[0]!.damage = 5;
  const doomed = scenario(p),
    dead = attack(doomed.state, doomed.refs.rex!, doomed.refs.enemy!);
  expect(dead.cards[doomed.refs.rex!]!.zone).toBe('discard');
  expect(dead.execution.frames[0]!.kind).toBe('action');
  expect(isSentinel(dead, doomed.refs.other!)).toBe(false);
});

test('The Invisible Hand draws a searched Droid before its optional free unit play, with private search and recovery', () => {
  const p = playCard(invisible);
  p.players[0].deck = [
    { card: 'gnk-power-droid', ref: 'small' },
    { card: ids.marine, ref: 'secret' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const { state, refs } = scenario(p);
  const pending = play(state, refs.played!);
  expect(pending.execution.decision!.selection!.cards).toEqual([refs.small!]);
  const spectator = new Projector(pending.gameId, { role: 'spectator' }, 'k'.repeat(32)).project(
    pending,
  );
  expect(spectator.decision).toBeNull();
  expect(JSON.stringify(spectator)).not.toContain('gnk-power-droid');
  resume(pending, choose(pending, 'search', [refs.small!]));
  const selected = search(pending, [refs.small!]);
  expect(selected.cards[refs.small!]!.zone).toBe('hand');
  expect(selected.players.alice!.hand).toEqual([refs.small!]);
  resume(
    selected,
    choose(selected, i => i.kind === 'play' && i.card === refs.small),
  );
  const ready = selected.players.alice!.resources.filter(
    id => !selected.cards[id]!.exhausted,
  ).length;
  const done = play(selected, refs.small!);
  expect(done.cards[refs.small!]!.zone).toBe('ground');
  expect(done.players.alice!.resources.filter(id => !done.cards[id]!.exhausted)).toHaveLength(
    ready,
  );
  const kept = step(selected, 'decline-effect');
  expect(kept.cards[refs.small!]!.zone).toBe('hand');
});

test('The Invisible Hand may draw an expensive Droid or find nothing without playing it', () => {
  const p = playCard(invisible);
  p.players[0].deck = [
    { card: 'droid-laser-turret', ref: 'expensive' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const { state, refs } = scenario(p),
    pending = play(state, refs.played!);
  const found = search(pending, [refs.expensive!]);
  expect(found.cards[refs.expensive!]!.zone).toBe('hand');
  expect(found.execution.frames[0]!.kind).toBe('action');
  const none = search(pending, []);
  expect(none.players.alice!.hand).toHaveLength(0);
  expect(none.players.alice!.deck).toHaveLength(9);
});

test('The Invisible Hand repeats its printed search after surviving an attack and skips it after combat defeat', () => {
  const p = position();
  p.players[0].space = [{ card: invisible, ref: 'ship' }];
  p.players[0].deck = [{ card: 'ant-droid', ref: 'droid' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const live = attack(state, refs.ship!, refs.enemy!);
  expect(live.execution.frames[0]!.kind).toBe('search');
  const drawn = search(live, [refs.droid!]);
  expect(drawn.cards[refs.droid!]!.zone).toBe('hand');
  p.players[0].space[0]!.damage = 5;
  const dead = scenario(p),
    done = attack(dead.state, dead.refs.ship!, dead.refs.enemy!);
  expect(done.cards[dead.refs.ship!]!.zone).toBe('discard');
  expect(done.players.alice!.deck).toHaveLength(1);
  expect(done.execution.frames[0]!.kind).toBe('action');
});

test('Jabba returns an owned upgrade from an enemy host and can replay the exact card for free on a new host', () => {
  const p = playCard(jabba);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'academy-training', unit: 'enemy', owner: 'alice', ref: 'upgrade' }];
  const { state, refs } = scenario(p),
    pending = play(state, refs.played!);
  const returned = step(pending, 'accept-effect', [refs.upgrade!]);
  expect(returned.cards[refs.upgrade!]!.zone).toBe('hand');
  expect(unitStats(returned, returned.cards[refs.enemy!]!).power).toBe(3);
  const input = choose(
    returned,
    i => i.kind === 'play' && i.card === refs.upgrade && i.target === refs.played,
  );
  resume(returned, input);
  const done = advance(returned, input).state;
  expect(done.cards[refs.upgrade!]!.attachedTo?.instanceId).toBe(refs.played!);
  expect(done.cards[refs.upgrade!]!.incarnation).toBe(2);
  expect(unitStats(done, done.cards[refs.played!]!).power).toBe(4);
  expect(step(returned, 'decline-effect').cards[refs.upgrade!]!.zone).toBe('hand');
});

test('Jabba cannot replay an upgrade returned to the opponent or a token that leaves play', () => {
  for (const kind of ['enemy', 'token']) {
    const p = playCard(jabba);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [
      {
        card: kind === 'enemy' ? 'academy-training' : 'shield',
        unit: 'enemy',
        owner: kind === 'enemy' ? 'bob' : 'alice',
        ref: 'upgrade',
      },
    ];
    const { state, refs } = scenario(p);
    const done = step(play(state, refs.played!), 'accept-effect', [refs.upgrade!]);
    expect(done.cards[refs.upgrade!]!.zone).toBe(kind === 'enemy' ? 'hand' : 'set-aside');
    expect(done.players.alice!.hand).toHaveLength(0);
    expect(done.execution.frames[0]!.kind).toBe('action');
  }
});

test('Retaliation selects the exact unit that dealt combat damage to a base, including either controller', () => {
  const p = position();
  p.players[0].ground = [
    { card: ids.marine, ref: 'hit' },
    { card: ids.marine, ref: 'untouched' },
  ];
  p.players[1].hand = [{ card: 'retaliation', ref: 'event' }];
  p.players[1].resources = resources();
  const { state, refs } = scenario(p);
  const hit = attack(state, refs.hit!, state.players.bob!.base);
  const pending = play(hit, refs.event!);
  expect(
    pending.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => (o.intent as any).card),
  ).toEqual([refs.hit!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.hit),
  );
  const done = target(pending, refs.hit!);
  expect(done.cards[refs.hit!]!.zone).toBe('discard');
  expect(done.cards[refs.untouched!]!.zone).toBe('ground');
  const q = position();
  q.players[0].hand = [{ card: 'retaliation', ref: 'event' }];
  q.players[0].resources = resources();
  q.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  q.dealtBaseDamageThisPhase = ['own'];
  const own = scenario(q);
  expect(target(play(own.state, own.refs.event!), own.refs.own!).cards[own.refs.own!]!.zone).toBe(
    'discard',
  );
});

test('Retaliation tracks non-combat unit damage to a base, but not event damage, and expires next phase', () => {
  const p = position();
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].leader.ref = 'sabine';
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const hit = attack(state, refs.sabine!, refs.enemy!);
  expect(hit.phaseHistory.baseDamageSources.map(r => r.instanceId)).toEqual([refs.sabine!]);
  expect(nextRound(hit).phaseHistory.baseDamageSources).toHaveLength(0);
  const q = playCard('operation-cinder'),
    event = scenario(q);
  const done = play(event.state, event.refs.played!);
  expect(done.cards[done.players.alice!.base]!.damage).toBe(5);
  expect(done.phaseHistory.baseDamageSources).toHaveLength(0);
});

test('Jabba may leave every upgrade in place and restores two on his own attack', () => {
  const p = playCard(jabba);
  p.players[0].base.damage = 4;
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', owner: 'alice', ref: 'upgrade' }];
  const { state, refs } = scenario(p);
  const done = step(play(state, refs.played!), 'accept-effect');
  expect(done.cards[refs.upgrade!]!.attachedTo?.instanceId).toBe(refs.host!);
  const next = nextRound(done);
  const hit = attack(next, refs.played!, next.players.bob!.base);
  expect(hit.cards[hit.players.alice!.base]!.damage).toBe(2);
});

test('Returning and replaying a base-damaging unit does not retain Retaliation eligibility', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'hit' }];
  p.players[0].resources = resources();
  p.players[1].resources = resources();
  p.players[1].hand = [{ card: 'retaliation', ref: 'event' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.hit!, state.players.bob!.base);
  // Compose the same zone transition used by return effects, preserving history.
  move(s, s.cards[refs.hit!]!, 'hand');
  s.execution.decision = null;
  settle(s);
  s = play(step(s, 'pass'), refs.hit!);
  expect(s.cards[refs.hit!]!.incarnation).toBe(state.cards[refs.hit!]!.incarnation + 1);
  expect(s.phaseHistory.baseDamageSources[0]!.incarnation).toBe(
    state.cards[refs.hit!]!.incarnation,
  );
  expect(decodeState(encodeState(s))).toEqual(s);
  const done = play(s, refs.event!);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(done.cards[refs.hit!]!.zone).toBe('ground');
});
