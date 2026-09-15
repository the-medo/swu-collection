import { expect, test } from 'bun:test';
import { workerConfig } from '../worker/config.ts';
test('worker cache configuration preserves agreed expiry/spacing and rejects unsafe limits before listening', () => {
  expect(workerConfig({}).replay).toMatchObject({
    idleMs: 240_000,
    checkpointActions: 5,
    maxGames: 32,
  });
  expect(
    workerConfig({ CROSSFIRE_REPLAY_MAX_MIB: '64', CROSSFIRE_REPLAY_GAME_MIB: '16' }).replay
      .maxBytes,
  ).toBe(64 * 1024 * 1024);
  for (const config of [
    { CROSSFIRE_REPLAY_IDLE_MS: '0' },
    { CROSSFIRE_REPLAY_CHECKPOINT_ACTIONS: '3' },
    { CROSSFIRE_REPLAY_MAX_GAMES: '500' },
    { CROSSFIRE_REPLAY_MAX_MIB: '16', CROSSFIRE_REPLAY_GAME_MIB: '64' },
  ])
    expect(() => workerConfig(config)).toThrow();
});
