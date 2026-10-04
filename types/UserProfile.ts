import { z } from 'zod';
import { SwuAspect } from './enums.ts';

const cardId = z.string().trim().min(1).max(200);

// Support contributions are managed by the project, never by profile edits.
export const userProfileFavoritesInputSchema = z
  .object({
    favoriteLeaderCardId: cardId.nullable().optional(),
    favoriteCardId: cardId.nullable().optional(),
    favoriteAspects: z.array(z.enum(SwuAspect)).max(3).optional(),
  })
  .strict()
  .refine(value => Object.values(value).some(v => v !== undefined), {
    message: 'Choose a favorite to update.',
  });

export type UserProfileFavoritesInput = z.infer<typeof userProfileFavoritesInputSchema>;

export type UserProfileFavorites = {
  userId: string;
  favoriteLeaderCardId: string | null;
  favoriteCardId: string | null;
  favoriteAspects: SwuAspect[];
};
