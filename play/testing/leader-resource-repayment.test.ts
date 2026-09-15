import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const han = 'han-solo--audacious-smuggler';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const useBase = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.base);
const resources = (n: number) => Array.from({ length: n }, () => ({ card: ids.marine }));
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
function until(s: GameState, predicate: (s: GameState) => boolean) {
  for (let n = 0; n < 30 && !predicate(s); n++) {
    const d = s.execution.decision!;
    s = step(
      s,
      d.kind === 'resource' ? 'resource' : d.kind === 'action' ? 'pass' : d.options[0]!.intent.kind,
      [],
    );
  }
  expect(predicate(s)).toBe(true);
  return s;
}
function debtChoice(s: GameState) {
  const f = s.execution.frames[0];
  return (
    f?.kind === 'effect' && f.effect.kind === 'select-resources' && f.effect.operation === 'defeat'
  );
}
function sundari() {
  const p = position();
  p.players[0].base.card = 'sundari-palace';
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].ground = [{ card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'second' }];
  p.attachments = [{ card: 'the-darksaber--icon-of-leadership', unit: 'second' }];
  p.players[0].resources = [{ card: ids.consular, ref: 'old', exhausted: true }];
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'open-fire', ref: 'three' },
  ];
  return p;
}
test('Sundari resources an optional simultaneous group ready and owes exactly the actual number', () => {
  const g = scenario(sundari()),
    choice = useBase(g.state);
  expect(choice.execution.decision!.selection!.max).toBe(2);
  expect(choice.execution.decision!.selection!.min).toBe(0);
  expect(() => step(choice, 'accept-effect', [g.refs.one!, g.refs.two!, g.refs.three!])).toThrow();
  resume(choice, choose(choice, 'accept-effect', [g.refs.one!, g.refs.two!]));
  const done = step(choice, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(done.players.alice!.resources).toEqual([g.refs.old!, g.refs.one!, g.refs.two!]);
  expect(done.cards[g.refs.one!]!.exhausted).toBe(false);
  expect(done.cards[g.refs.two!]!.exhausted).toBe(false);
  expect(done.delayedEffects[0]).toMatchObject({
    kind: 'resources-at-regroup',
    amount: 2,
    dueRound: 1,
    target: null,
  });
  expect(step(choice, 'accept-effect', []).delayedEffects).toHaveLength(0);
  expect(step(choice, 'accept-effect', [g.refs.three!]).delayedEffects[0]).toMatchObject({
    amount: 1,
  });
});
test('Sundari repays before regroup draw using any friendly resources, including exhausted older ones', () => {
  const g = scenario(sundari());
  let s = step(useBase(g.state), 'accept-effect', [g.refs.one!, g.refs.two!]);
  s = until(s, debtChoice);
  expect(s.phase).toBe('regroup');
  expect(s.players.alice!.hand).toEqual([g.refs.three!]);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.old!, g.refs.one!, g.refs.two!]);
  expect(() => step(s, 'accept-effect', [g.refs.one!])).toThrow();
  resume(s, choose(s, 'accept-effect', [g.refs.old!, g.refs.two!]));
  const done = step(s, 'accept-effect', [g.refs.old!, g.refs.two!]);
  expect(done.players.alice!.resources).toEqual([g.refs.one!]);
  expect(done.players.alice!.discard).toEqual([g.refs.old!, g.refs.two!]);
  expect(done.delayedEffects).toHaveLength(0);
});
test('Sundari secret hand choices stay private while debt amount and timing are public', () => {
  const results = [];
  for (const secret of [ids.consular, ids.trooper]) {
    const p = sundari();
    p.players[0].hand![0]!.card = secret;
    const g = scenario(p);
    const s = step(useBase(g.state), 'accept-effect', [g.refs.one!]);
    results.push(
      ['bob', null].map(player => {
        const v = new Projector(
          s.gameId,
          player ? { role: 'player', playerId: player } : { role: 'spectator' },
          'k'.repeat(32),
        ).project(s);
        expect(gameViewSchema.parse(v)).toEqual(v);
        expect(v.scheduled[0]).toMatchObject({ kind: 'resources-at-regroup', amount: 1 });
        return v;
      }),
    );
  }
  expect(results[0]).toEqual(results[1]);
});
test('Sundari with no deployed friendly leader can spend its Epic without creating a repayment', () => {
  const p = position();
  p.players[0].base.card = 'sundari-palace';
  p.players[0].hand = resources(2);
  p.players[1].leader.deployedAs = 'unit';
  const s = useBase(scenario(p).state);
  expect(s.execution.decision!.selection!.max).toBe(0);
  expect(step(s, 'accept-effect', []).delayedEffects).toHaveLength(0);
});
for (const deployed of [false, true])
  test(`Han ${deployed ? 'unit' : 'front'} creates one ready resource and repays at next action start`, () => {
    const p = position();
    p.players[0].leader = { card: han, deployedAs: deployed ? 'unit' : null };
    p.players[0].resources = [{ card: ids.consular, ref: 'old', exhausted: true }];
    p.players[0].hand = [{ card: ids.marine, ref: 'hand' }];
    p.players[0].deck![0] = { card: 'open-fire', ref: 'top' };
    const g = scenario(p);
    let s = deployed
      ? step(g.state, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base)
      : step(
          step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
          'accept-effect',
          [g.refs.hand!],
        );
    const loan = deployed ? g.refs.top! : g.refs.hand!;
    expect(s.cards[loan]!.zone).toBe('resources');
    expect(s.cards[loan]!.exhausted).toBe(false);
    expect(s.delayedEffects[0]).toMatchObject({
      kind: 'resources-at-action',
      dueRound: 2,
      amount: 1,
    });
    s = until(s, x => x.phase === 'regroup');
    expect(s.delayedEffects).toHaveLength(1);
    expect(s.players.alice!.resources).toContain(loan);
    s = until(s, debtChoice);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('action');
    expect(s.execution.decision!.playerId).toBe('alice');
    resume(s, choose(s, 'accept-effect', [g.refs.old!]));
    const done = step(s, 'accept-effect', [g.refs.old!]);
    expect(done.cards[g.refs.old!]!.zone).toBe('discard');
    expect(done.cards[loan]!.zone).toBe('resources');
    expect(done.execution.decision!.kind).toBe('action');
  });
test('Han still schedules repayment when his attack finds an empty deck', () => {
  const p = position();
  p.players[0].leader = { card: han, deployedAs: 'unit' };
  p.players[0].deck = [];
  p.players[0].resources = resources(1);
  const g = scenario(p);
  const s = step(g.state, i => i.kind === 'attack' && i.defender === g.state.players.bob!.base);
  expect(s.delayedEffects[0]).toMatchObject({ amount: 1, kind: 'resources-at-action' });
  expect(s.players.alice!.resources).toHaveLength(1);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});
test('Han repayment survives his defeat and remains bound to the original player', () => {
  const p = position();
  p.players[0].leader = { card: han, deployedAs: 'unit', damage: 5 };
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'attack' && i.defender === g.refs.defender);
  expect(s.cards[s.players.alice!.leader]!.deployedAs).toBeNull();
  expect(s.delayedEffects).toHaveLength(1);
  s = until(s, debtChoice);
  resume(s, choose(s, 'accept-effect', [s.players.alice!.resources[0]!]));
  expect(step(s, 'accept-effect', [s.players.alice!.resources[0]!]).delayedEffects).toHaveLength(0);
});

test('Han front schedules repayment even with no hand card and can owe multiple resources from separate faces', () => {
  const empty = position();
  empty.players[0].leader.card = han;
  empty.players[0].resources = resources(1);
  let s = step(
    scenario(empty).state,
    i => i.kind === 'use-ability' && i.abilityId === 'leader-action',
  );
  s = step(s, 'accept-effect', []);
  expect(s.delayedEffects[0]).toMatchObject({ amount: 1 });
  const p = position();
  p.players[0].leader.card = han;
  p.players[0].resources = resources(5);
  p.players[0].hand = [{ card: ids.marine }];
  const g = scenario(p);
  s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
  s = step(s, 'accept-effect', [s.players.alice!.hand[0]!]);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'attack' && i.defender === s.players.bob!.base);
  expect(s.delayedEffects).toHaveLength(2);
  expect(s.players.alice!.resources).toHaveLength(7);
  s = until(s, debtChoice);
  s = step(s, 'accept-effect', [s.players.alice!.resources[0]!]);
  s = until(s, debtChoice);
  s = step(s, 'accept-effect', [s.players.alice!.resources[0]!]);
  expect(s.players.alice!.resources).toHaveLength(5);
  expect(s.delayedEffects).toHaveLength(0);
});
test('repayment checkpoints reject an unrelated source and invented repayment timing', () => {
  const g = scenario(sundari()),
    s = step(useBase(g.state), 'accept-effect', [g.refs.one!]);
  const wrong = structuredClone(s);
  wrong.delayedEffects[0]!.source = structuredClone(wrong.cards[wrong.players.alice!.leader]!);
  expect(() => decodeState(JSON.stringify(wrong))).toThrow();
  const timing = structuredClone(s);
  timing.delayedEffects[0]!.kind = 'resources-at-action';
  expect(() => decodeState(JSON.stringify(timing))).toThrow();
});
