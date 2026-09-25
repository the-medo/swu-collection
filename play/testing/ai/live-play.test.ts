import { expect, test } from 'bun:test';
import { playableFixture } from './playable-fixture.ts';
import { releaseRuntime } from '../../ai/releases/runtime.ts';
import { versions } from '../../engine/model.ts';
import { scenario } from '../scenario.ts';
import { decideAiCommand } from '../../ai/live/decide.ts';
import { Projector } from '../../projection/projector.ts';
import { CommandBuilder } from '../../ai/full-game/choices.ts';
import { VisibleMemory } from '../../ai/full-game/encoding.ts';
import { defaultAiReplayLimit } from '../../ai/live/retention.ts';

const f = playableFixture();
const runtime = releaseRuntime(f.release, 'krennic', versions);
test('published lists preserve the exact trained feature layout and reject tampering', () => {
  expect(runtime.encoding.encodingContract).toEqual(f.environment.encoding.encodingContract);
  const bad = structuredClone(f.release);
  (bad.deckSnapshots!.krennic as Record<string, unknown>).leader = 'unknown';
  expect(() => releaseRuntime(bad, 'krennic', versions)).toThrow();
  expect(() => releaseRuntime(f.release, 'vader', versions)).toThrow();
  expect(() =>
    releaseRuntime({ ...f.release, interfaceHash: 'a'.repeat(64) }, 'krennic', versions),
  ).toThrow();
});
test('live AI observations match training encoding and ignore hidden opponent cards', async () => {
  const own = runtime.snapshot;
  const { state } = scenario({
    gameId: 'live-ai-view',
    initiative: { holder: 'p1' },
    activePlayer: 'p2',
    players: [
      {
        id: 'p1',
        leader: { card: 'sabine-wren--galvanized-revolutionary' },
        base: { card: 'command-center' },
        hand: [{ card: 'battlefield-marine' }],
        deck: [{ card: 'tie-ln-fighter' }],
      },
      {
        id: 'p2',
        leader: { card: own.leader },
        base: { card: own.base },
        resources: Array.from({ length: 3 }, () => ({ card: 'battlefield-marine' })),
        ground: [{ card: 'battlefield-marine' }],
        hand: [{ card: 'tie-ln-fighter' }],
      },
    ],
  });
  const projected = new Projector(state.gameId, { role: 'player', playerId: 'p2' }).project(state);
  const builder = new CommandBuilder(projected),
    memory = new VisibleMemory();
  memory.observe(projected, 'p2');
  const expected = {
    context: f.environment.encoding.encodeContext(
      projected,
      'p2',
      runtime.deckIndex,
      memory,
      builder,
    ),
    candidates: builder
      .choices()
      .map(c => f.environment.encoding.encodeCandidate(builder, c, 'p2')),
  };
  const seen: unknown[] = [];
  const input = await decideAiCommand(state, runtime, async observation => {
    seen.push(observation);
    return 0;
  });
  expect(seen[0]).toEqual(expected);
  expect(input).toMatchObject({ playerId: 'p2' });
  const altered = structuredClone(state);
  for (const c of Object.values(altered.cards))
    if (c.owner === 'p1' && ['hand', 'deck'].includes(c.zone)) c.cardId = 'death-star-stormtrooper';
  const other: unknown[] = [];
  await decideAiCommand(altered, runtime, async observation => {
    other.push(observation);
    return 0;
  });
  expect(other).toEqual(seen);
  await expect(decideAiCommand(state, runtime, async () => 999999)).rejects.toThrow(
    'Invalid AI action',
  );
});
test('replay allowance has a safe default, explicit overrides and unlimited support', () => {
  expect(defaultAiReplayLimit({})).toBe(5);
  expect(defaultAiReplayLimit({ CROSSFIRE_AI_REPLAY_LIMIT: '50' })).toBe(50);
  expect(defaultAiReplayLimit({ CROSSFIRE_AI_REPLAY_LIMIT: 'all' })).toBeNull();
  expect(() => defaultAiReplayLimit({ CROSSFIRE_AI_REPLAY_LIMIT: '-1' })).toThrow();
});
