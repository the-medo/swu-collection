import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userFile } from '../../db/schema/user_file.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { imageGallery } from '../../db/schema/image_gallery.ts';
import {
  createUserHeaderService,
  resolveHeaderSource,
  persistUserHeader,
  getUserHeader,
  getUserHeaderSettings,
} from './service.ts';
import { createUserFileService } from '../user-files/service.ts';
import { createImageGalleryService } from '../image-gallery/service.ts';
import { updateUserProfileFavorites } from '../user-profile/service.ts';
import { SwuAspect } from '../../../types/enums.ts';

test.skipIf(process.env.USER_HEADER_DB_TEST !== '1')(
  'header ownership, concurrent saves, favorites and deletion of original sources',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select isolated worktree DB');
    const users = [0, 1].map(() => 'header-test-' + crypto.randomUUID());
    const fileId = crypto.randomUUID(),
      galleryImageId = crypto.randomUUID();
    const objects = new Map<string, Uint8Array>();
    const storage = {
      available: () => true,
      publicUrl: (key: string) => 'https://images.swubase.com/' + key,
      async put(key: string, body: Uint8Array) {
        objects.set(key, body);
      },
      async remove(key: string) {
        objects.delete(key);
      },
    };
    const bytes = await sharp({
      create: { width: 2000, height: 800, channels: 3, background: '#abc' },
    })
      .webp()
      .toBuffer();
    const save = createUserHeaderService({
      storage,
      resolveSource: resolveHeaderSource,
      persist: persistUserHeader,
      async fetchSource() {
        return bytes;
      },
    });
    const crop = { left: 100, top: 100, width: 1600, height: 400 };
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Header fixture',
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(userFile).values({
        id: fileId,
        userId: users[0],
        fileName: 'Private header art',
        imageKey: 'header-fixture/art.webp',
        thumbnailKey: 'header-fixture/thumb.webp',
        width: 2000,
        height: 800,
        originalByteSize: bytes.length,
        byteSize: bytes.length,
        thumbnailByteSize: 100,
      });
      await db.insert(imageGallery).values({
        id: galleryImageId,
        title: 'Header gallery fixture',
        imageKey: 'header-fixture/gallery.webp',
        thumbnailKey: 'header-fixture/gallery-thumb.webp',
        width: 2000,
        height: 800,
      });
      expect(await getUserHeader(users[0])).toMatchObject({ source: 'battlefield', image: null });
      await db
        .insert(userProfile)
        .values({ userId: users[0], favoriteAspects: [SwuAspect.COMMAND] });
      await expect(save(users[1], { source: 'upload', fileId, crop })).rejects.toMatchObject({
        status: 404,
      });
      expect(objects.size).toBe(0);
      const large = await save(users[0], {
        source: 'upload',
        fileId,
        crop: { left: 0, top: 0, width: 2000, height: 500 },
      });
      expect(await getUserHeader(users[0])).toMatchObject({
        width: 2000,
        height: 500,
        image: large.image,
      });
      const small = await save(users[0], {
        source: 'upload',
        fileId,
        crop: { left: 0, top: 0, width: 800, height: 200 },
      });
      expect(await getUserHeader(users[0])).toMatchObject({
        width: 800,
        height: 200,
        image: small.image,
      });
      const uploaded = await save(users[0], { source: 'upload', fileId, crop });
      expect(await getUserHeader(users[0])).toEqual(uploaded);
      expect(await getUserHeaderSettings(users[0])).toMatchObject({
        selection: { source: { source: 'upload', fileId } },
        crop,
      });
      const publicData = await getUserHeader(users[0]);
      expect(Object.keys(publicData).sort()).toEqual(['height', 'image', 'source', 'width']);
      expect(
        (await db.select().from(userProfile).where(eq(userProfile.userId, users[0])))[0]
          .favoriteAspects,
      ).toEqual([SwuAspect.COMMAND]);
      // Stored dimensions outside current rules must not block reads or preference updates.
      const legacyCrop = { ...crop, width: 3, height: 1 };
      await db
        .update(userProfile)
        .set({ headerWidth: legacyCrop.width, headerHeight: legacyCrop.height })
        .where(eq(userProfile.userId, users[0]));
      const legacyHeader = { ...uploaded, width: legacyCrop.width, height: legacyCrop.height };
      expect(await getUserHeader(users[0])).toEqual(legacyHeader);
      await updateUserProfileFavorites(users[0], { favoriteAspects: [SwuAspect.CUNNING] });
      expect(await getUserHeader(users[0])).toEqual(legacyHeader);
      await expect(
        save(users[0], { source: 'upload', fileId, crop: legacyCrop }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await getUserHeader(users[0])).toEqual(legacyHeader);
      await db
        .update(userProfile)
        .set({ headerWidth: crop.width, headerHeight: crop.height })
        .where(eq(userProfile.userId, users[0]));
      expect(await getUserHeader(users[0])).toEqual(uploaded);
      await createUserFileService(storage).remove(users[0], fileId);
      expect((await getUserHeaderSettings(users[0])).selection).toBeNull();
      expect(await getUserHeader(users[0])).toEqual(uploaded);
      expect(objects.size).toBe(1);
      await Promise.all(
        [0, 1].map(top =>
          save(users[0], { source: 'gallery', galleryImageId, crop: { ...crop, top } }),
        ),
      );
      expect(objects.size).toBe(1);
      const galleryHeader = await getUserHeader(users[0]);
      expect(galleryHeader.source).toBe('gallery');
      await createImageGalleryService(storage).remove(galleryImageId);
      expect((await getUserHeaderSettings(users[0])).selection).toBeNull();
      expect(await getUserHeader(users[0])).toEqual(galleryHeader);
      expect(objects.size).toBe(1);
      await save(users[0], { source: 'battlefield' });
      expect(objects.size).toBe(0);
      expect(await getUserHeader(users[0])).toMatchObject({ source: 'battlefield', image: null });
      expect(
        (await db.select().from(userProfile).where(eq(userProfile.userId, users[0])))[0]
          .favoriteAspects,
      ).toEqual([SwuAspect.CUNNING]);
      await expect(getUserHeader('missing-' + crypto.randomUUID())).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      await db.delete(imageGallery).where(eq(imageGallery.id, galleryImageId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);
