import { describe, expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

const snub = 'snub-fighter-squadron';
const onyx = 'onyx-squadron-brute';
const technician = 'superlaser-technician';
const green = 'green-leader--crynyd-s-sacrifice';
const hk = 'hk-47--exclamation--die--meatbag-';
const resources = () => Array.from({ length: 8 }, () => ({ card: ids.marine }));
function step(state: GameState, predicate: Intent['kind'] | ((intent: Intent) => boolean)) {
  return advance(state, choose(state, predicate)).state;
}
function target(state: GameState, card: string) {
  return step(state, intent => intent.kind === 'target' && intent.card === card);
}
function trigger(state: GameState, abilityId: string, source?: string) {
  const frame = state.execution.frames[0];
  if (frame?.kind !== 'trigger-batch') throw new Error('Expected a trigger batch');
  const ability = frame.triggers.find(
    t => t.abilityId === abilityId && (!source || t.source.instanceId === source),
  )!;
  return step(state, intent => intent.kind === 'trigger' && intent.triggerId === ability.id);
}
async function resume(state: GameState, input: ReturnType<typeof choose>) {
  const worker = Bun.spawn(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
  );
  worker.stdin.write(JSON.stringify({ state: encodeState(state), input }));
  worker.stdin.end();
  const [output, error, exitCode] = await Promise.all([
    new Response(worker.stdout).text(),
    new Response(worker.stderr).text(),
    worker.exited,
  ]);
  expect(exitCode).toBe(0);
  expect(error).toBe('');
  expect(JSON.parse(output)).toEqual(advance(state, input));
}

describe('v8 §§7.5.5, 7.6: Ambush and nested trigger batches', () => {
  test('When Played can cause an opponent nested defeat trigger before the older Ambush', async () => {
    const p = position();
    p.players[0].hand = [{ card: snub, ref: 'snub' }];
    p.players[0].resources = resources();
    p.players[1].space = [{ card: onyx, ref: 'onyx', damage: 2 }];
    p.players[1].base.damage = 5;
    const { state: initial, refs } = scenario(p);
    let state = step(initial, 'play');
    expect(state.execution.decision?.kind).toBe('trigger');
    expect(state.cards[refs.snub!]!.exhausted).toBe(true);
    state = trigger(state, 'when-played');
    expect(state.execution.decision?.playerId).toBe('alice');
    expect(state.execution.decision?.options).toHaveLength(2); // Both space units, including itself.
    state = target(state, refs.onyx!);
    expect(state.execution.decision?.playerId).toBe('bob');
    expect(state.execution.decision?.kind).toBe('effect');
    expect(state.cards[refs.onyx!]!.zone).toBe('discard');
    expect(
      state.execution.frames.some(
        frame =>
          frame.kind === 'trigger-batch' && frame.triggers.some(t => t.abilityId === 'ambush'),
      ),
    ).toBe(true);
    const input = choose(state, i => i.kind === 'target' && i.card === state.players.bob!.base);
    await resume(state, input);
    state = advance(decodeState(encodeState(state)), input).state;
    expect(state.cards[state.players.bob!.base]!.damage).toBe(3);
    expect(state.execution.decision?.kind).toBe('action'); // No enemy to ambush.
    expect(state.activePlayer).toBe('bob');
    expect(state.cards[refs.snub!]!.exhausted).toBe(true); // V8 never readies it.
    expect(initial.cards[refs.onyx!]!.damage).toBe(2);
    const healed = state.facts.find(fact => fact.type === 'healed')!;
    expect(healed.cards[0]!.instanceId).toBe(refs.onyx!);
    expect(healed.cards[0]!.incarnation).toBe(initial.cards[refs.onyx!]!.incarnation);
  });

  test('Ambush may attack while exhausted; nested combat finishes before the older When Played', () => {
    const p = position();
    p.players[0].hand = [{ card: snub, ref: 'snub' }];
    p.players[0].resources = resources();
    p.players[1].space = [{ card: onyx, ref: 'onyx' }];
    const { state: initial, refs } = scenario(p);
    let state = trigger(step(initial, 'play'), 'ambush');
    const intents = state.execution.decision!.options.map(o => o.intent);
    expect(intents).toEqual([{ kind: 'target', card: refs.onyx! }, { kind: 'decline-effect' }]);
    state = target(state, refs.onyx!);
    expect(state.cards[refs.snub!]!.damage).toBe(2);
    expect(state.cards[refs.snub!]!.exhausted).toBe(true);
    expect(state.execution.decision!.playerId).toBe('bob');
    state = target(state, state.players.bob!.base);
    expect(state.execution.decision!.playerId).toBe('alice');
    // The remaining printed trigger is mandatory even when the only target is itself.
    state = target(state, refs.snub!);
    expect(state.cards[refs.snub!]!.zone).toBe('discard');
    expect(state.activePlayer).toBe('bob');
  });

  test('declining Ambush still resolves the other trigger and does not ready the unit', () => {
    const p = position();
    p.players[0].resources = resources();
    p.players[0].hand = [{ card: snub, ref: 'snub' }];
    p.players[1].space = [{ card: onyx }];
    const { state: initial, refs } = scenario(p);
    let state = step(trigger(step(initial, 'play'), 'ambush'), 'decline-effect');
    state = target(state, refs.snub!);
    expect(state.cards[refs.snub!]!.exhausted).toBe(true);
    expect(state.facts.some(f => f.type === 'attacked')).toBe(false);
  });

  test('active player chooses a player, each player orders only their own batch', () => {
    const p = position();
    p.players[0].space = [
      { card: green, ref: 'green' },
      { card: ids.fighter, ref: 'fighter' },
    ];
    p.players[0].ground = [{ card: hk, ref: 'hk' }];
    p.players[1].space = [{ card: onyx, ref: 'onyx' }];
    const { state: initial, refs } = scenario(p);
    let state = step(
      initial,
      i => i.kind === 'attack' && i.attacker === refs.green && i.defender === refs.onyx,
    );
    expect(state.execution.decision?.kind).toBe('trigger-player');
    expect(state.execution.decision?.playerId).toBe('alice');
    state = step(state, i => i.kind === 'trigger-player' && i.playerId === 'alice');
    expect(state.execution.decision?.kind).toBe('trigger');
    expect(state.execution.decision?.options).toHaveLength(2); // Green and HK, not Bob's Onyx.
    state = trigger(state, 'when-defeated', refs.green);
    state = step(state, 'decline-effect');
    // HK's mandatory trigger completed, then Bob gets his base choice.
    expect(state.cards[state.players.bob!.base]!.damage).toBe(1);
    expect(state.execution.decision?.playerId).toBe('bob');
    expect(() => advance(state, { ...choose(state, 'target'), playerId: 'alice' })).toThrow();
    state = target(state, state.players.bob!.base);
    expect(state.cards[state.players.bob!.base]!.damage).toBe(0);
    expect(state.activePlayer).toBe('bob');
  });

  test('nested opponent ability finishes before returning to a selected older player batch', () => {
    const p = position();
    p.players[0].space = [{ card: green, ref: 'green' }];
    p.players[0].ground = [{ card: hk }];
    p.players[1].space = [
      { card: onyx, ref: 'first' },
      { card: onyx, ref: 'second', damage: 1 },
    ];
    p.players[1].base.damage = 4;
    const { state: initial, refs } = scenario(p);
    let state = step(initial, i => i.kind === 'attack' && i.defender === refs.first);
    state = step(state, i => i.kind === 'trigger-player' && i.playerId === 'alice');
    state = trigger(state, 'when-defeated', refs.green);
    state = target(state, refs.second!);
    expect(state.execution.decision?.kind).toBe('trigger-player'); // New HK + new Onyx layer.
    state = step(state, i => i.kind === 'trigger-player' && i.playerId === 'bob');
    state = target(state, state.players.bob!.base);
    // New HK then old HK resolve; older Onyx is still pending after that.
    expect(state.cards[state.players.bob!.base]!.damage).toBe(4);
    expect(state.execution.decision?.playerId).toBe('bob');
    state = target(state, state.players.bob!.base);
    expect(state.cards[state.players.bob!.base]!.damage).toBe(2);
  });

  test('simultaneously defeated observers both trigger; base defeat stops remaining abilities', () => {
    const p = position();
    p.players[0].ground = [{ card: hk, damage: 2, ref: 'aliceHk' }];
    p.players[1].ground = [{ card: hk, damage: 2, ref: 'bobHk' }];
    p.players[0].base.damage = 29;
    p.players[1].base.damage = 29;
    const { state: initial, refs } = scenario(p);
    let state = step(initial, i => i.kind === 'attack' && i.defender === refs.bobHk);
    expect(state.cards[refs.aliceHk!]!.zone).toBe('discard');
    expect(state.cards[refs.bobHk!]!.zone).toBe('discard');
    expect(state.execution.decision?.options).toHaveLength(2);
    state = step(state, i => i.kind === 'trigger-player' && i.playerId === 'bob');
    expect(state.result).toEqual({ winner: 'bob', reason: 'base-defeat' });
    expect(state.cards[state.players.bob!.base]!.damage).toBe(29);
    expect(state.execution.pendingTriggers).toEqual([]);
    const damage = state.facts.filter(f => f.type === 'damage').at(-1)!;
    expect(damage.actor).toBe('bob');
    expect(damage.cards[0]!.instanceId).toBe(refs.bobHk!);
  });
});

describe('uniqueness, exact source history, and recovery', () => {
  test('playing a duplicate unique unit asks which physical copy to keep before defeat triggers', async () => {
    const p = position();
    p.players[0].space = [{ card: green, ref: 'old' }];
    p.players[0].hand = [{ card: green, ref: 'new' }];
    p.players[0].resources = resources();
    p.players[1].ground = [{ card: ids.marine, ref: 'marine' }];
    const { state: initial, refs } = scenario(p);
    let state = step(initial, 'play');
    expect(state.execution.decision?.kind).toBe('unique');
    const input = choose(state, i => i.kind === 'keep-unique' && i.card === refs.old);
    await resume(state, input);
    state = advance(state, input).state;
    expect(state.cards[refs.old!]!.zone).toBe('space');
    expect(state.cards[refs.new!]!.zone).toBe('discard');
    state = target(state, refs.marine!);
    expect(state.cards[refs.marine!]!.damage).toBe(2);
    expect(state.activePlayer).toBe('bob');
    const invalid = position();
    invalid.players[0].space = [{ card: green }, { card: green }];
    expect(() => scenario(invalid)).toThrow('uniqueness');
  });

  test('Superlaser Technician returns only its own defeated copy, ready, in a new hidden incarnation', async () => {
    const p = position();
    p.players[0].ground = [
      { card: technician, ref: 'first' },
      { card: technician, ref: 'second' },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'marine' }];
    const { state: initial, refs } = scenario(p);
    let state = step(
      initial,
      i => i.kind === 'attack' && i.attacker === refs.first && i.defender === refs.marine,
    );
    expect(state.execution.decision?.kind).toBe('effect');
    const input = choose(state, 'accept-effect');
    await resume(state, input);
    state = advance(state, input).state;
    expect(state.cards[refs.first!]!.zone).toBe('resources');
    expect(state.cards[refs.first!]!.exhausted).toBe(false);
    expect(state.cards[refs.first!]!.incarnation).toBe(initial.cards[refs.first!]!.incarnation + 1);
    expect(state.cards[refs.second!]!.zone).toBe('ground');
    const spectator = new Projector(state.gameId, { role: 'spectator' });
    const view = spectator.project(state);
    expect(view.cards.filter(card => card.zone === 'resources').map(card => card.face)).toEqual([
      null,
    ]);
    const returned = view.events.find(event => event.type === 'resource-returned')!;
    expect(returned.cards[0]!.cardId).toBe(technician);
    expect(returned.cards[0]!.currentCardId).toBeNull();
    const owner = new Projector(state.gameId, { role: 'player', playerId: 'alice' }).project(state);
    expect(owner.cards.find(card => card.zone === 'resources')?.face?.cardId).toBe(technician);
  });

  test('declining the resource return leaves the card in discard', () => {
    const p = position();
    p.players[0].ground = [{ card: technician, ref: 'tech' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'marine' }];
    const { state: initial, refs } = scenario(p);
    const state = step(
      step(initial, i => i.kind === 'attack' && i.defender === refs.marine),
      'decline-effect',
    );
    expect(state.cards[refs.tech!]!.zone).toBe('discard');
    expect(state.players.alice!.resources).toHaveLength(0);
  });

  test('checkpoint and direct advance reject old bundles; corrupted source/controller/ability is rejected', () => {
    const p = position();
    p.players[0].hand = [{ card: snub }];
    p.players[0].resources = resources();
    const state = step(scenario(p).state, 'play');
    for (const corrupt of [
      (s: any) => {
        s.versions.engine = 'crossfire-0.1.0';
      },
      (s: any) => {
        s.execution.frames[0].triggers[0].source.cardId = ids.marine;
      },
      (s: any) => {
        s.execution.frames[0].triggers[0].playerId = 'bob';
      },
      (s: any) => {
        s.execution.frames[0].triggers[0].abilityId = 'invented';
      },
    ]) {
      const copy = structuredClone(state);
      corrupt(copy);
      expect(() => decodeState(encodeState(copy))).toThrow();
    }
    const old = structuredClone(state);
    (old.versions as any).engine = 'crossfire-0.1.0';
    expect(() => advance(old, choose(old, 'trigger'))).toThrow('bundle');
  });

  test('new-card command recording replays each accepted choice without shared state', () => {
    const c = config('trigger-recording');
    for (const player of c.players)
      player.deck = [
        { cardId: snub, quantity: 12 },
        { cardId: onyx, quantity: 12 },
      ];
    const game = new LocalGame(c, upper => upper - 1);
    const other = new LocalGame({ ...c, gameId: 'independent' }, upper => upper - 1);
    const untouched = other.state;
    let state = setup(game);
    for (let n = 0; n < 100 && !state.result; n++) {
      const d = state.execution.decision!;
      const option =
        d.options.find(o => o.intent.kind === 'play') ??
        d.options.find(o => o.intent.kind === 'attack') ??
        d.options.find(o => o.intent.kind === 'pass') ??
        d.options[0]!;
      state = game.submit(
        choose(
          state,
          i => i === option.intent,
          d.selection ? d.selection.cards.slice(0, d.selection.max) : [],
        ),
      );
      expect(replay(game.recording)).toEqual(state);
    }
    expect(state.facts.some(f => f.type === 'triggered')).toBe(true);
    expect(other.state).toEqual(untouched);
  }, 15_000);
});

test('projected trigger choices name the ability and exact historical copy, with private seat ownership', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: snub, ref: 'snub' }, { card: ids.marine }];
  const { state: initial, refs } = scenario(p);
  const state = step(initial, 'play');
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
  const view = projector.project(state);
  expect(view.decision!.options.map(o => o.ability!.id)).toEqual(['ambush', 'when-played']);
  const visible = view.cards.find(card => card.face?.cardId === snub)!;
  expect(view.decision!.options.map(o => o.ability!.source.currentCardId)).toEqual([
    visible.id,
    visible.id,
  ]);
  const option = view.decision!.options.find(o => o.ability?.id === 'when-played')!;
  const input = projector.command(state, {
    gameId: state.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: option.id,
  });
  const next = advance(state, input).state;
  expect(projector.project(next).decision?.source?.currentCardId).toBe(visible.id);
  expect(projector.project(next).decision?.effect).toBe('damage-unit');
  expect(() =>
    projector.command(next, {
      gameId: state.gameId,
      epoch: view.epoch,
      expectedRevision: view.revision,
      decisionId: view.decision!.id,
      optionId: option.id,
    }),
  ).toThrow();
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const theirView = new Projector(state.gameId, viewer).project(state);
    expect(theirView.decision).toBeNull();
    expect(JSON.stringify(theirView)).not.toContain(refs.snub! + '"');
  }
});

test('a played trigger still resolves after its source dies during its earlier Ambush', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: snub, ref: 'snub' }];
  p.players[1].space = [
    { card: green, ref: 'green' },
    { card: onyx, ref: 'onyx' },
  ];
  const { state: initial, refs } = scenario(p);
  let state = target(trigger(step(initial, 'play'), 'ambush'), refs.green!);
  expect(state.cards[refs.snub!]!.zone).toBe('discard');
  state = step(state, 'decline-effect'); // Green's nested trigger.
  expect(state.execution.decision?.playerId).toBe('alice');
  const view = new Projector(state.gameId, { role: 'player', playerId: 'alice' }).project(state);
  expect(view.decision?.source?.cardId).toBe(snub);
  state = target(state, refs.onyx!);
  expect(state.cards[refs.onyx!]!.damage).toBe(1);
  expect(state.cards[refs.snub!]!.zone).toBe('discard');
});

test('secrets do not change other viewer payloads while a target choice is suspended', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: snub }, { card: ids.marine }];
  const a = trigger(step(scenario(p).state, 'play'), 'when-played');
  const b = structuredClone(a);
  b.cards[b.players.alice!.hand[0]!]!.cardId = ids.fighter;
  b.cards[b.players.alice!.deck[0]!]!.cardId = ids.racer;
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const key = 'a'.repeat(64);
    expect(new Projector(a.gameId, viewer, key).project(a)).toEqual(
      new Projector(b.gameId, viewer, key).project(b),
    );
  }
});
