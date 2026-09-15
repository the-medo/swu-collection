import type { CrossfireExit } from './crossfire.ts';
import { z } from 'zod';
export const matchReadySchema = z.strictObject({
  kind: z.enum(['next', 'rematch']),
  ready: z.boolean(),
  mainboard: z
    .array(
      z.strictObject({
        cardId: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(120),
      }),
    )
    .max(120)
    .optional(),
});
export type MatchReady = z.infer<typeof matchReadySchema>;
export type MatchView = {
  exit?: CrossfireExit | null;
  id: string;
  bestOf: 1 | 3;
  currentLobbyId: string;
  number: number;
  mySeat: 'p1' | 'p2';
  status: 'playing' | 'finishing' | 'sideboarding' | 'complete';
  score: { p1: number; p2: number };
  games: { number: number; lobbyId: string; winner: string | null; finished: boolean }[];
  ready: { p1: boolean; p2: boolean };
  rematchReady: { p1: boolean; p2: boolean };
  rematchLobbyId: string | null;
  // These fields always describe only the authenticated player's frozen pool.
  deck: {
    minimumMain: number;
    leader: string;
    base: string;
    mainboard: { cardId: string; quantity: number }[];
    pool: { cardId: string; quantity: number }[];
    unsupported: string[];
  };
};
