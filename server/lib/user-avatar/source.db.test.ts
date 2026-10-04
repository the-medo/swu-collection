import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userAvatar } from '../../db/schema/user_avatar.ts';
import { userFile } from '../../db/schema/user_file.ts';
import { getUserAvatarSource, getUploadedAvatarUrl, persistUserAvatar } from './service.ts';

const enabled = process.env.SWUBASE_AVATAR_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Avatar tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'source and image update atomically, stay owner-scoped, and cascade on deletion',
  async () => {
    const id = `avatar-source-test-${crypto.randomUUID()}`;
    const source = { cardId: 'card', variantId: 'version', side: 'front' as const };
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
      expect(await getUserAvatarSource(id)).toBeNull();
      expect(await persistUserAvatar(id, 'image-one', source)).toBe(true);
      expect(await getUserAvatarSource(id)).toEqual(source);
      expect(await getUserAvatarSource('someone-else')).toBeNull();
      // A rejected metadata write must roll back the accompanying profile image.
      await expect(
        persistUserAvatar(id, 'invalid-image', { ...source, side: 'invalid' as 'front' }),
      ).rejects.toThrow();
      expect((await db.select().from(user).where(eq(user.id, id)))[0]!.image).toBe('image-one');
      const fileId = crypto.randomUUID();
      await db.insert(userFile).values({
        id: fileId,
        userId: id,
        fileName: 'source.webp',
        imageKey: `user-files/${fileId}.webp`,
        thumbnailKey: `user-files/${fileId}-thumb.webp`,
        originalByteSize: 100,
        byteSize: 80,
        thumbnailByteSize: 20,
        width: 300,
        height: 200,
      });
      expect(await getUploadedAvatarUrl(id, fileId)).toBe(
        `https://images.swubase.com/user-files/${fileId}.webp`,
      );
      expect(await getUploadedAvatarUrl('someone-else', fileId)).toBeNull();
      expect(await getUploadedAvatarUrl(id, crypto.randomUUID())).toBeNull();
      const imageKey = `user-files/${id}/${fileId}.webp`;
      await db.update(userFile).set({ imageKey }).where(eq(userFile.id, fileId));
      expect(await getUploadedAvatarUrl(id, fileId)).toBe(`https://images.swubase.com/${imageKey}`);
      expect(await getUploadedAvatarUrl('someone-else', fileId)).toBeNull();
      await persistUserAvatar(id, 'uploaded-avatar', { fileId });
      expect(await getUserAvatarSource(id)).toEqual({ fileId });
      expect(
        (await db.select().from(userAvatar).where(eq(userAvatar.userId, id)))[0],
      ).toMatchObject({
        fileId,
        cardId: null,
        variantId: null,
        side: null,
      });
      // The avatar is a separate image, so removing its source must preserve it.
      await db.delete(userFile).where(eq(userFile.id, fileId));
      expect(await getUploadedAvatarUrl(id, fileId)).toBeNull();
      expect(await getUserAvatarSource(id)).toEqual({ fileId });
      expect((await db.select().from(user).where(eq(user.id, id)))[0]!.image).toBe(
        'uploaded-avatar',
      );
      const next = { ...source, variantId: 'another-version', side: 'back' as const };
      await persistUserAvatar(id, 'image-two', next);
      expect(await getUserAvatarSource(id)).toEqual(next);
      expect(
        (await db.select().from(userAvatar).where(eq(userAvatar.userId, id)))[0]!.fileId,
      ).toBeNull();
      expect(await db.select().from(userAvatar).where(eq(userAvatar.userId, id))).toHaveLength(1);
      await db.update(user).set({ image: 'unrelated-image' }).where(eq(user.id, id));
      expect(await getUserAvatarSource(id)).toBeNull();
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
    expect(await db.select().from(userAvatar).where(eq(userAvatar.userId, id))).toHaveLength(0);
    expect(await persistUserAvatar(id, 'missing-user', source)).toBe(false);
  },
);
