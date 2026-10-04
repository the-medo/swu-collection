import { expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { cardList } from '../../db/lists.ts';
import { getUserProfileFavorites, updateUserProfileFavorites } from './service.ts';
import { SwuAspect } from '../../../types/enums.ts';

test.skipIf(process.env.USER_PROFILE_DB_TEST !== '1')(
  'profile persistence, monetary isolation, constraints and owner deletion',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const id = `profile-test-${crypto.randomUUID()}`;
    const leader = Object.values(cardList).find(card => card?.type === 'Leader')!;
    const card = Object.values(cardList).find(card => card?.type === 'Unit')!;
    await db.insert(user).values({
      id,
      name: id,
      displayName: id,
      email: `${id}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      expect(await getUserProfileFavorites(id)).toEqual({
        userId: id,
        favoriteLeaderCardId: null,
        favoriteCardId: null,
        favoriteAspects: [],
      });
      expect(await db.select().from(userProfile).where(eq(userProfile.userId, id))).toHaveLength(0);
      await updateUserProfileFavorites(id, { favoriteLeaderCardId: leader.cardId });
      const [defaults] = await db.select().from(userProfile).where(eq(userProfile.userId, id));
      expect(defaults.totalSupport).toBe('0.00');
      expect(defaults.activeSupporter).toBe(false);
      await db
        .update(userProfile)
        .set({ totalSupport: '123.45', activeSupporter: true })
        .where(eq(userProfile.userId, id));
      await db
        .update(userProfile)
        .set({ totalSupport: sql`${userProfile.totalSupport} + 0.10` })
        .where(eq(userProfile.userId, id));
      await Promise.all([
        updateUserProfileFavorites(id, { favoriteCardId: card.cardId }),
        updateUserProfileFavorites(id, {
          favoriteAspects: [SwuAspect.COMMAND, SwuAspect.COMMAND, SwuAspect.COMMAND],
        }),
      ]);
      expect(await getUserProfileFavorites(id)).toEqual({
        userId: id,
        favoriteLeaderCardId: leader.cardId,
        favoriteCardId: card.cardId,
        favoriteAspects: Array(3).fill(SwuAspect.COMMAND),
      });
      const [stored] = await db.select().from(userProfile).where(eq(userProfile.userId, id));
      expect(stored.totalSupport).toBe('123.55');
      expect(stored.activeSupporter).toBe(true);
      await expect(
        updateUserProfileFavorites(id, { favoriteLeaderCardId: card.cardId }),
      ).rejects.toThrow('Choose a valid leader.');
      await expect(updateUserProfileFavorites(id, { favoriteCardId: 'unknown' })).rejects.toThrow(
        'Choose a valid card.',
      );
      for (const values of [
        { favoriteAspects: Array(4).fill(SwuAspect.COMMAND) },
        { favoriteAspects: sql`ARRAY['Invalid']::text[]` },
        { favoriteAspects: sql`ARRAY[NULL]::text[]` },
        { totalSupport: '-0.01' },
        { totalSupport: 'NaN' },
      ])
        await expect(
          db.update(userProfile).set(values).where(eq(userProfile.userId, id)).execute(),
        ).rejects.toThrow();
      const cleared = await updateUserProfileFavorites(id, {
        favoriteLeaderCardId: null,
        favoriteCardId: null,
        favoriteAspects: [],
      });
      expect(cleared.favoriteAspects).toEqual([]);
      expect(cleared.favoriteLeaderCardId).toBeNull();
      expect(cleared.favoriteCardId).toBeNull();
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
    expect(await db.select().from(userProfile).where(eq(userProfile.userId, id))).toHaveLength(0);
    await expect(getUserProfileFavorites(id)).rejects.toThrow('User not found.');
    await expect(updateUserProfileFavorites(id, { favoriteAspects: [] })).rejects.toThrow(
      'User not found.',
    );
  },
);
