import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { credits } from '../engine/credits.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const lando = 'lando-calrissian--full-sabacc',
  cobb = 'cobb-vanth--let-me-handle-this';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const deploy = (s: GameState) => step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
const wager = (s: GameState) => step(s, i => i.kind === 'use-ability' && i.abilityId === 'wager');
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function landoBoard() {
  const p = position();
  p.players[0].leader = { card: lando, ref: 'lando' };
  p.players[0].resources = [{ card: ids.marine, ref: 'resource' }];
  p.players[0].deck = [
    { card: ids.fighter, ref: 'mine' },
    ...Array.from({ length: 9 }, () => ({ card: ids.marine })),
  ];
  p.players[1].deck = [
    { card: ids.marine, ref: 'theirs' },
    ...Array.from({ length: 9 }, () => ({ card: ids.marine })),
  ];
  return p;
}
test('Lando pays before choosing any of six aspects, then chooses a deck without inspecting either top card', () => {
  const s = scenario(landoBoard()),
    aspect = wager(s.state);
  expect(aspect.cards[s.refs.lando!]!.exhausted).toBe(true);
  expect(aspect.cards[s.refs.resource!]!.exhausted).toBe(true);
  expect(aspect.execution.decision!.options.map(o => o.intent)).toEqual(
    ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'].map(mode => ({
      kind: 'choose-mode',
      mode,
    })),
  );
  resume(
    aspect,
    choose(aspect, i => i.kind === 'choose-mode' && i.mode === 'Command'),
  );
  const deck = mode(aspect, 'Command');
  resume(
    deck,
    choose(deck, i => i.kind === 'choose-mode' && i.mode === 'opponent-deck'),
  );
  const view = new Projector(deck.gameId, { role: 'player', playerId: 'alice' }).project(deck);
  expect(view.decision!.inspectedCards).toEqual([]);
  expect(view.events.findLast(e => e.type === 'mode-chosen')!.mode).toBe('Command');
  expect(gameViewSchema.parse(view)).toEqual(view);
  const done = mode(deck, 'opponent-deck');
  expect(done.cards[s.refs.theirs!]!.zone).toBe('discard');
  expect(done.cards[s.refs.mine!]!.zone).toBe('deck');
  expect(credits(done, 'alice')).toHaveLength(1);
});
test('a wager matches any printed aspect, gains nothing on a miss and safely handles an empty chosen deck', () => {
  for (const chosen of ['Command', 'Heroism', 'Aggression', 'empty']) {
    const p = landoBoard();
    if (chosen === 'empty') p.players[1].deck = [];
    const s = scenario(p),
      done = mode(mode(wager(s.state), chosen === 'empty' ? 'Command' : chosen), 'opponent-deck');
    expect(credits(done, 'alice')).toHaveLength(['Command', 'Heroism'].includes(chosen) ? 1 : 0);
    expect(done.cards[s.refs.resource!]!.exhausted).toBe(true);
  }
});
test('Lando can pay using a Credit; a lost response resumes before either the Credit or exhaustion is spent', () => {
  const p = landoBoard();
  p.players[0].resources = [];
  p.players[0].credits = ['old-credit'];
  const s = scenario(p),
    payment = wager(s.state);
  expect(payment.execution.frames[0]!.kind).toBe('credit-payment');
  expect(payment.cards[s.refs.lando!]!.exhausted).toBe(false);
  const input = choose(payment, 'accept-effect', [s.refs['old-credit']!]);
  resume(payment, input);
  const choice = advance(payment, input).state;
  expect(choice.cards[s.refs.lando!]!.exhausted).toBe(true);
  expect(credits(choice, 'alice')).toHaveLength(0);
  const done = mode(mode(choice, 'Command'), 'opponent-deck');
  expect(credits(done, 'alice')).toHaveLength(1);
});
test('deploying Lando may exchange one friendly Credit for three, separately from the leader action', () => {
  for (const use of [false, true]) {
    const p = landoBoard();
    p.players[0].resources = Array.from({ length: 6 }, () => ({
      card: ids.marine,
      exhausted: true,
    }));
    p.players[0].credits = ['one', 'two'];
    p.players[1].credits = ['enemy'];
    const s = scenario(p),
      choice = deploy(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.enemy,
      ),
    ).toBe(false);
    resume(choice, choose(choice, use ? 'target' : 'decline-effect'));
    const done = use ? target(choice, s.refs.two!) : step(choice, 'decline-effect');
    expect(credits(done, 'alice')).toHaveLength(use ? 4 : 2);
    expect(done.cards[s.refs.lando!]!.deployedAs).toBe('unit');
    const next = step(done, 'pass');
    expect(
      next.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.card === s.refs.lando,
      ),
    ).toBe(false);
  }
});
test('wager choices and public logs are independent of unrevealed deck identities', () => {
  const s = scenario(landoBoard()),
    a = mode(wager(s.state), 'Command'),
    b = structuredClone(a);
  b.cards[s.refs.theirs!]!.cardId = ids.consular;
  for (const viewer of [
    { role: 'player', playerId: 'alice' } as const,
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const p = new Projector(a.gameId, viewer, 'k'.repeat(32));
    expect(p.project(a)).toEqual(p.project(b));
  }
});
function cobbBoard() {
  const p = position();
  p.players[0].ground = [{ card: cobb, ref: 'cobb' }];
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  return p;
}
test('Cobb optionally takes two damage for one Shield on the exact newly played unit and gains Grit power', () => {
  for (const accept of [true, false]) {
    const p = cobbBoard();
    p.players[0].ground!.push({ card: ids.marine, ref: 'older' });
    const s = scenario(p),
      choice = step(s.state, 'play');
    resume(
      choice,
      choose(
        choice,
        i => i.kind === 'choose-mode' && i.mode === (accept ? 'take-2-damage' : 'decline'),
      ),
    );
    const done = mode(choice, accept ? 'take-2-damage' : 'decline');
    expect(done.cards[s.refs.cobb!]!.damage).toBe(accept ? 2 : 0);
    expect(unitStats(done, done.cards[s.refs.cobb!]!).power).toBe(accept ? 4 : 2);
    expect(attachedUpgrades(done, done.cards[s.refs.played!]!).map(c => c.cardId)).toEqual(
      accept ? ['shield'] : [],
    );
    expect(attachedUpgrades(done, done.cards[s.refs.older!]!)).toEqual([]);
  }
});
test('Cobb still gives the Shield when its chosen damage defeats it or is replaced by its own Shield', () => {
  for (const shield of [true, false]) {
    const p = cobbBoard();
    if (shield) p.attachments = [{ card: 'shield', unit: 'cobb', ref: 'oldShield' }];
    else p.players[0].ground![0]!.damage = 5;
    const s = scenario(p),
      done = mode(step(s.state, 'play'), 'take-2-damage');
    expect(attachedUpgrades(done, done.cards[s.refs.played!]!).map(c => c.cardId)).toEqual([
      'shield',
    ]);
    expect(done.cards[s.refs.cobb!]!.zone).toBe(shield ? 'ground' : 'discard');
    if (shield) expect(done.cards[s.refs.cobb!]!.damage).toBe(0);
  }
});
test('Cobb can still take damage after the played unit leaves, but cannot Shield its new incarnation', () => {
  const s = scenario(cobbBoard()),
    pending = step(s.state, 'play');
  const state = structuredClone(pending),
    played = state.cards[s.refs.played!]!;
  move(state, played, 'hand');
  move(state, played, 'ground');
  resume(
    state,
    choose(state, i => i.kind === 'choose-mode' && i.mode === 'take-2-damage'),
  );
  const done = mode(state, 'take-2-damage');
  expect(done.cards[s.refs.cobb!]!.damage).toBe(2);
  expect(attachedUpgrades(done, done.cards[s.refs.played!]!)).toEqual([]);
});
test('Cobb does not trigger for itself, opposing unit plays, leader deployment or a Pilot played as an upgrade', () => {
  const own = cobbBoard();
  own.players[0].ground = [];
  own.players[0].hand = [{ card: cobb }];
  let s = scenario(own);
  expect(step(s.state, 'play').execution.decision!.playerId).toBe('bob');
  const enemy = cobbBoard();
  enemy.activePlayer = 'bob';
  enemy.players[1].hand = [{ card: ids.marine }];
  enemy.players[1].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
  s = scenario(enemy);
  expect(step(s.state, 'play').execution.decision!.playerId).toBe('alice');
  const pilot = cobbBoard();
  pilot.players[0].hand = [{ card: 'astromech-pilot', ref: 'pilot' }];
  pilot.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  s = scenario(pilot);
  let done = step(s.state, i => i.kind === 'play' && !!i.piloting);
  if (done.execution.decision!.kind === 'effect') done = step(done, 'target');
  expect(done.execution.decision!.playerId).toBe('bob');
  const leader = scenario(cobbBoard());
  done = deploy(leader.state);
  expect(done.facts.some(f => f.type === 'triggered' && f.cards.some(c => c.cardId === cobb))).toBe(
    false,
  );
});

test('Lando can wager on its own deck, and a correct Villainy guess discards the top copy before creating a Credit', () => {
  const s = scenario(landoBoard()),
    done = mode(mode(wager(s.state), 'Villainy'), 'your-deck');
  expect(done.cards[s.refs.mine!]!.zone).toBe('discard');
  expect(done.cards[s.refs.theirs!]!.zone).toBe('deck');
  expect(credits(done, 'alice')).toHaveLength(1);
  const discarded = done.facts.findIndex(f => f.type === 'discarded'),
    created = done.facts.findIndex(
      f => f.type === 'created' && f.cards.some(c => c.cardId === 'credit'),
    );
  expect(discarded).toBeGreaterThan(-1);
  expect(created).toBeGreaterThan(discarded);
});
