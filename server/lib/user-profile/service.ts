import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import type {
  UserProfileFavorites,
  UserProfileFavoritesInput,
} from '../../../types/UserProfile.ts';

export class UserProfileError extends Error {
  constructor(
    message: string,
    public status: 400 | 404,
  ) {
    super(message);
  }
}

// Explicit public projection of profile favorites.
const favoriteColumns = {
  userId: userProfile.userId,
  favoriteLeaderCardId: userProfile.favoriteLeaderCardId,
  favoriteCardId: userProfile.favoriteCardId,
  favoriteAspects: userProfile.favoriteAspects,
};

export function validateProfileCards(input: UserProfileFavoritesInput, cards: CardList) {
  if (input.favoriteLeaderCardId && cards[input.favoriteLeaderCardId]?.type !== 'Leader') {
    throw new UserProfileError('Choose a valid leader.', 400);
  }
  if (input.favoriteCardId && !Object.hasOwn(cards, input.favoriteCardId)) {
    throw new UserProfileError('Choose a valid card.', 400);
  }
}

export async function getUserProfileFavorites(userId: string): Promise<UserProfileFavorites> {
  const [row] = await db
    .select({ ...favoriteColumns, userId: user.id })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(user.id, userId));
  if (!row) throw new UserProfileError('User not found.', 404);
  return { ...row, favoriteAspects: row.favoriteAspects ?? [] };
}

export async function updateUserProfileFavorites(
  userId: string,
  input: UserProfileFavoritesInput,
): Promise<UserProfileFavorites> {
  if (input.favoriteLeaderCardId || input.favoriteCardId) {
    validateProfileCards(input, await getMergedCardList());
  }
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!owner) throw new UserProfileError('User not found.', 404);
  // Only provided fields are changed; concurrent edits to other favorites survive.
  const changes = {
    ...(input.favoriteLeaderCardId !== undefined && {
      favoriteLeaderCardId: input.favoriteLeaderCardId,
    }),
    ...(input.favoriteCardId !== undefined && { favoriteCardId: input.favoriteCardId }),
    ...(input.favoriteAspects !== undefined && { favoriteAspects: input.favoriteAspects }),
  };
  const [row] = await db
    .insert(userProfile)
    .values({ userId, ...changes })
    .onConflictDoUpdate({ target: userProfile.userId, set: changes })
    .returning(favoriteColumns);
  return row;
}
