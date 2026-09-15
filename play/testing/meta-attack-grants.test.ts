import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
import { unitStats } from '../engine/attachments.ts';
import { modifyUnit } from '../engine/lasting.ts';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
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
function board(fighter: string = ids.fighter) {
  const p = position();
  p.players[0].hand = [{ card: 'trench-run', ref: 'event' }];
  p.players[0].resources = Array.from({ length: 3 }, () => ({ card: ids.marine }));
  p.players[0].space = [{ card: fighter, ref: 'fighter' }];
  p.players[1].deck = [
    { card: ids.fighter, ref: 'one' },
    { card: ids.racer, ref: 'two' },
    { card: ids.consular, ref: 'secret' },
  ];
  return p;
}
const attack = (s: GameState, fighter: string, defender = s.players.bob!.base) =>
  step(s, i => i.kind === 'attack' && i.attacker === fighter && i.defender === defender);
function risk(s: GameState) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Missing trigger batch');
  const trigger = f.triggers.find(t => t.abilityId.endsWith('trench-run-risk'))!;
  return choose(s, i => i.kind === 'trigger' && i.triggerId === trigger.id);
}
test('Trench Run requires a ready friendly Fighter in either arena and respects Sentinel', () => {
  const p = board();
  p.players[0].space!.push({ card: ids.fighter, exhausted: true, ref: 'exhausted' });
  p.players[0].ground = [
    { card: ids.marine, ref: 'nonfighter' },
    { card: ids.fighter, movedArena: true, ref: 'groundfighter' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'sentinel' }];
  p.attachments = [{ card: 'academy-graduate', unit: 'sentinel', owner: 'bob' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: s.refs.groundfighter!, defender: choice.players.bob!.base },
    { kind: 'attack', attacker: s.refs.fighter!, defender: s.refs.sentinel! },
  ]);
  resume(choice, choose(choice, 'attack'));
});
test('self-damage uses printed costs, bypasses Shields and preserves the event origin and exact attacker', () => {
  const p = board();
  p.attachments = [
    { card: 'academy-training', unit: 'fighter' },
    { card: 'shield', unit: 'fighter', ref: 'shield' },
  ];
  const s = scenario(p),
    done = attack(step(s.state, 'play'), s.refs.fighter!);
  expect(done.cards[s.refs.fighter!]!).toMatchObject({ zone: 'space', damage: 2, exhausted: true });
  expect(done.cards[s.refs.shield!]!.zone).toBe('space');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(8);
  expect(unitStats(done, done.cards[s.refs.fighter!]!).power).toBe(4);
  expect(done.attacks).toEqual([]);
  expect(done.players.bob!.discard).toEqual([s.refs.one!, s.refs.two!]);
  const v = new Projector(done.gameId, { role: 'spectator' }).project(done);
  expect(v.events.some(e => e.cards.some(c => c.cardId === 'trench-run'))).toBe(true);
  expect(
    v.events.some(e => e.type === 'damage' && e.cards.some(c => c.cardId === ids.fighter)),
  ).toBe(true);
  expect(JSON.stringify(v)).not.toContain(ids.consular);
  // A subsequent attack has neither the power bonus nor the temporary trigger.
  done.cards[s.refs.fighter!]!.exhausted = false;
  done.activePlayer = 'alice';
  done.execution.decision = null;
  settle(done);
  const again = attack(done, s.refs.fighter!);
  expect(again.cards[again.players.bob!.base]!.damage).toBe(12);
  expect(again.players.bob!.deck).toEqual([s.refs.secret!]);
});
test('lethal self-damage stops combat while an already captured native On Attack ability still resolves', () => {
  const p = board('tie-bomber');
  p.players[1].deck![1] = { card: 'rey--skywalker', ref: 'two' };
  const s = scenario(p),
    batch = attack(step(s.state, 'play'), s.refs.fighter!);
  resume(batch, risk(batch));
  const indirect = advance(batch, risk(batch)).state;
  expect(indirect.cards[s.refs.fighter!]!.zone).toBe('discard');
  expect(indirect.cards[indirect.players.bob!.base]!.damage).toBe(0);
  expect(indirect.execution.decision!.playerId).toBe('bob');
  resume(indirect, choose(indirect, 'accept-effect', Array(3).fill(indirect.players.bob!.base)));
  const done = step(indirect, 'accept-effect', Array(3).fill(indirect.players.bob!.base));
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(done.execution.decision!.kind).toBe('action');
});
test('the controller can resolve either native or granted On Attack first; equal costs cause no self-damage', () => {
  for (const firstRisk of [true, false]) {
    const p = board('tie-bomber');
    p.players[1].deck = [{ card: ids.marine }, { card: 'academy-training' }];
    const s = scenario(p),
      batch = attack(step(s.state, 'play'), s.refs.fighter!);
    const riskChoice = risk(batch) as Extract<EngineInput, { type: 'decision' }>;
    const input = firstRisk
      ? riskChoice
      : choose(
          batch,
          i =>
            i.kind === 'trigger' &&
            batch.execution.decision!.options.some(
              o =>
                o.id !== riskChoice.optionId &&
                o.intent.kind === 'trigger' &&
                o.intent.triggerId === i.triggerId,
            ),
        );
    let done = advance(batch, input).state;
    done = step(done, 'accept-effect', Array(3).fill(done.players.bob!.base));
    expect(done.cards[s.refs.fighter!]!.damage).toBe(0);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(7);
  }
});
test('fewer than two discarded cards provide no pair of costs to compare and cause no fatigue', () => {
  for (const n of [0, 1]) {
    const p = board();
    p.players[1].deck!.length = n;
    const s = scenario(p),
      done = attack(step(s.state, 'play'), s.refs.fighter!);
    expect(done.cards[s.refs.fighter!]!.damage).toBe(0);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(6);
    expect(done.players.bob!.discard).toHaveLength(n);
  }
});
test('ability loss suppresses the new granted trigger without removing the numerical bonus', () => {
  const s = scenario(board()),
    state = structuredClone(s.state);
  modifyUnit(state, state.cards[s.refs.fighter!]!, state.cards[s.refs.fighter!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  state.execution.decision = null;
  settle(state);
  const done = attack(step(state, 'play'), s.refs.fighter!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(6);
  expect(done.players.bob!.discard).toEqual([]);
});
test('checkpoints reject an event without grants or a non-discard origin for attack abilities', () => {
  const s = scenario(board('tie-bomber')),
    batch = attack(step(s.state, 'play'), s.refs.fighter!);
  for (const kind of ['identity', 'zone']) {
    const bad = structuredClone(batch);
    const origin = bad.attacks[0]!.grantedAbilities.find(o => o.profile === 'attack-grant')!;
    if (kind === 'identity') origin.card.cardId = 'incapacitate';
    else origin.card.zone = 'hand';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});
