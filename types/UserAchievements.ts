import { z } from 'zod';
import type { BestMajorFinish } from '../shared/types/UserMeleeTournaments.ts';

export const DEFAULT_ACHIEVEMENT_LIMIT = 1;

export const userAchievementInputSchema = z
  .object({
    slot: z.number().int().min(1).max(2_147_483_647),
    tournamentId: z.uuid().nullable(),
  })
  .strict();

export type UserAchievementInput = z.infer<typeof userAchievementInputSchema>;

export type UserAchievement = BestMajorFinish & {
  slot: number;
  type: string;
  typeName: string;
};

export type UserAchievements = {
  achievementLimit: number;
  connected: boolean;
  achievements: UserAchievement[];
};
