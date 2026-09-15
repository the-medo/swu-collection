import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const mando = 'the-mandalorian--let-s-see-the-puck',
  anakin = 'anakin-skywalker--prescient-podracer';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean), sel: string[] = []) =>
  advance(s, choose(s, i, sel)).state;
const mode = (s: GameState, mode: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === mode);
const shields = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'shield').length;
const attack = (s: GameState, attacker: string, defender = s.players.bob!.base) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
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
function randomInput(s: GameState): EngineInput {
  return {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  };
}
function board(card = mando) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
test('Mandalorian’s own played draw grants one Shield; an empty deck deals fatigue but grants none', () => {
  for (const empty of [false, true]) {
    const p = board();
    if (empty) p.players[0].deck = [];
    const s = scenario(p);
    resume(s.state, choose(s.state, 'play'));
    const done = step(s.state, 'play');
    expect(shields(done, s.refs.played!)).toBe(empty ? 0 : 1);
    expect(done.cards[done.players.alice!.base]!.damage).toBe(empty ? 3 : 0);
  }
});
test('drawing several selected search cards is one draw event and one Shield, including fresh-process shuffle recovery', () => {
  const p = board('remnant-reserves');
  p.players[0].ground = [{ card: mando, ref: 'mando' }];
  const s = scenario(p),
    looking = step(s.state, 'play'),
    ids = looking.execution.decision!.selection!.cards.slice(0, 3);
  resume(looking, choose(looking, 'search', ids));
  const pending = step(looking, 'search', ids);
  resume(pending, randomInput(pending));
  const done = advance(pending, randomInput(pending)).state;
  expect(done.players.alice!.hand).toHaveLength(3);
  expect(shields(done, s.refs.mando!)).toBe(1);
  const emptyPending = step(looking, 'search', []),
    none = advance(emptyPending, randomInput(emptyPending)).state;
  expect(shields(none, s.refs.mando!)).toBe(0);
});
test('opponent-controlled search draws trigger only that player’s Mandalorian, without leaking inspected cards', () => {
  const p = board('elzar-mann--haunted-by-a-vision');
  p.players[0].ground = [{ card: mando, ref: 'mine' }];
  p.players[1].ground = [{ card: mando, ref: 'theirs' }];
  p.players[1].deck![0] = { card: 'incapacitate', ref: 'found' };
  const s = scenario(p),
    looking = step(step(s.state, 'play'), 'accept-effect', [s.refs.mine!]);
  expect(looking.execution.decision!.playerId).toBe('bob');
  expect(
    new Projector(looking.gameId, { role: 'player', playerId: 'alice' }).project(looking).decision,
  ).toBeNull();
  const pending = step(looking, 'search', [s.refs.found!]);
  resume(pending, randomInput(pending));
  const done = advance(pending, randomInput(pending)).state;
  expect(shields(done, s.refs.mine!)).toBe(0);
  expect(shields(done, s.refs.theirs!)).toBe(1);
});
test('regroup draws do not trigger Mandalorian; consecutive action-phase draws each grant a Shield', () => {
  const p = board('knowledge-and-defense');
  p.players[0].hand!.push({ card: 'knowledge-and-defense' });
  p.players[0].ground = [{ card: mando, ref: 'mando' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const s = scenario(p),
    one = step(step(s.state, 'play'), 'target'),
    two = step(step(step(one, 'pass'), 'play'), 'target');
  expect(shields(two, s.refs.mando!)).toBe(2);
  const regroup = step(step(two, 'pass'), 'pass');
  expect(regroup.phase).toBe('regroup');
  expect(shields(regroup, s.refs.mando!)).toBe(2);
  expect(regroup.execution.pendingTriggers).toEqual([]);
});
function pilotBoard() {
  const p = position();
  p.players[0].base.damage = 7;
  p.players[0].ground = [
    { card: anakin, ref: 'anakin' },
    { card: ids.marine, ref: 'attacker' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  return p;
}
test('Anakin can return the exact first attacker and heal two, or leave it in play', () => {
  const s = scenario(pilotBoard()),
    choice = attack(s.state, s.refs.attacker!);
  resume(
    choice,
    choose(choice, i => i.kind === 'choose-mode' && i.mode === 'return-attacker'),
  );
  const returned = mode(choice, 'return-attacker');
  expect(returned.cards[s.refs.attacker!]!.zone).toBe('hand');
  expect(returned.cards[returned.players.alice!.base]!.damage).toBe(5);
  const declined = mode(choice, 'leave-attacker');
  expect(declined.cards[s.refs.attacker!]!.zone).toBe('ground');
  expect(declined.cards[declined.players.alice!.base]!.damage).toBe(7);
});
test('Anakin counts previous attacks by either player; repeated attacks by the same incarnation remain eligible', () => {
  for (const earlier of ['attacker', 'anakin', 'enemy']) {
    const p = pilotBoard();
    p.attackedThisPhase = [earlier];
    const s = scenario(p),
      done = attack(s.state, s.refs.attacker!);
    expect(done.execution.decision!.kind).toBe(earlier === 'attacker' ? 'effect' : 'action');
    expect(done.cards[done.players.alice!.base]!.damage).toBe(7);
  }
});
test('an observer defeated in its own attack still triggered, but the defeated attacker cannot return or heal', () => {
  const p = pilotBoard();
  p.players[0].ground![0]!.damage = 2;
  const s = scenario(p),
    choice = attack(s.state, s.refs.anakin!, s.refs.enemy!);
  expect(choice.cards[s.refs.anakin!]!.zone).toBe('discard');
  expect(choice.execution.decision!.options.some(o => o.intent.kind === 'choose-mode')).toBe(true);
  resume(choice, choose(choice, 'choose-mode'));
  const done = mode(choice, 'return-attacker');
  expect(done.cards[done.players.alice!.base]!.damage).toBe(7);
});
test('a dead friendly attacker cannot be returned, and replacing a living attacker does not retarget the old trigger', () => {
  const s = scenario(pilotBoard()),
    dead = attack(s.state, s.refs.attacker!, s.refs.enemy!);
  expect(dead.cards[s.refs.attacker!]!.zone).toBe('discard');
  expect(mode(dead, 'return-attacker').cards[dead.players.alice!.base]!.damage).toBe(7);
  const choice = attack(s.state, s.refs.attacker!);
  move(choice, choice.cards[s.refs.attacker!]!, 'hand');
  move(choice, choice.cards[s.refs.attacker!]!, 'ground');
  choice.execution.decision = null;
  settle(choice);
  resume(choice, choose(choice, 'choose-mode'));
  const done = mode(choice, 'return-attacker');
  expect(done.cards[s.refs.attacker!]!.zone).toBe('ground');
  expect(done.cards[done.players.alice!.base]!.damage).toBe(7);
});
test('returning a leader is replaced by defeat and still satisfies If you do; a returned token is set aside', () => {
  for (const kind of ['leader', 'token']) {
    const p = pilotBoard();
    if (kind === 'leader')
      p.players[0].leader = {
        card: ids.leader,
        deployedAs: 'unit',
        abilityUses: { deploy: 1 },
        ref: 'subject',
      };
    else p.players[0].ground!.push({ card: 'mandalorian', ref: 'subject' });
    const s = scenario(p),
      choice = attack(s.state, s.refs.subject!),
      done = mode(choice, 'return-attacker');
    expect(done.cards[s.refs.subject!]!.zone).toBe(kind === 'leader' ? 'base' : 'set-aside');
    expect(done.cards[done.players.alice!.base]!.damage).toBe(5);
  }
});
test('a combat observer snapshot and its eventual return choice survive Shield replacement recovery', () => {
  const p = pilotBoard();
  p.attachments = [
    { card: 'shield', unit: 'enemy' },
    { card: 'shield', unit: 'enemy' },
  ];
  const s = scenario(p),
    combat = attack(s.state, s.refs.anakin!, s.refs.enemy!);
  expect(combat.execution.decision!.kind).toBe('replacement');
  resume(combat, choose(combat, 'target'));
  const choice = step(combat, 'target');
  resume(choice, choose(choice, 'choose-mode'));
  const bad = structuredClone(combat);
  bad.attacks[0]!.ending!.observers[0]!.source.controller = 'bob';
  expect(() => decodeState(encodeState(bad))).toThrow();
});
