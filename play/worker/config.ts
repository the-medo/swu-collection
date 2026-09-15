import { z } from 'zod';
const number = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
const schema = z
  .object({
    CROSSFIRE_MAX_GAMES: number(1, 1000, 128),
    CROSSFIRE_REPLAY_IDLE_MS: number(180_000, 240_000, 240_000),
    CROSSFIRE_REPLAY_CHECKPOINT_ACTIONS: number(5, 10, 5),
    CROSSFIRE_REPLAY_MAX_GAMES: number(1, 128, 32),
    CROSSFIRE_REPLAY_MAX_MIB: number(8, 1024, 256),
    CROSSFIRE_REPLAY_GAME_MIB: number(1, 256, 64),
  })
  .refine(v => v.CROSSFIRE_REPLAY_GAME_MIB <= v.CROSSFIRE_REPLAY_MAX_MIB, {
    message: 'Per-game replay budget must fit the total budget',
    path: ['CROSSFIRE_REPLAY_GAME_MIB'],
  });
export function workerConfig(environment: Record<string, string | undefined>) {
  const value = schema.parse(environment);
  return {
    games: { maxGames: value.CROSSFIRE_MAX_GAMES },
    replay: {
      idleMs: value.CROSSFIRE_REPLAY_IDLE_MS,
      checkpointActions: value.CROSSFIRE_REPLAY_CHECKPOINT_ACTIONS,
      maxGames: value.CROSSFIRE_REPLAY_MAX_GAMES,
      maxBytes: value.CROSSFIRE_REPLAY_MAX_MIB * 1024 * 1024,
      maxGameBytes: value.CROSSFIRE_REPLAY_GAME_MIB * 1024 * 1024,
    },
  };
}
