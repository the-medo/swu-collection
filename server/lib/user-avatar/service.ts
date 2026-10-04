import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { UserAvatarInput } from '../../../types/UserAvatar.ts';
import { AvatarError, cropAvatar, fetchAvatarSource, resolveAvatarImage } from './image.ts';

type AvatarDependencies = {
  getCards(): Promise<CardList>;
  fetchSource(url: string): Promise<Uint8Array>;
  storageAvailable(): boolean;
  upload(key: string, body: Buffer): Promise<void>;
  updateProfile(userId: string, image: string): Promise<boolean>;
};

export function createUserAvatarService(deps: AvatarDependencies) {
  return async (userId: string, input: UserAvatarInput) => {
    if (!deps.storageAvailable()) throw new AvatarError('Avatar storage is not configured.', 503);
    const url = resolveAvatarImage(await deps.getCards(), input);
    const body = await cropAvatar(await deps.fetchSource(url), input.crop);
    const key = `user-data/${encodeURIComponent(userId)}/avatar.webp`;
    const image = `https://images.swubase.com/${key}?v=${crypto.randomUUID()}`;
    try {
      await deps.upload(key, body);
    } catch {
      throw new AvatarError('Could not save your avatar. Please try again.', 502);
    }
    // Never hold a database connection while waiting on the image host or R2.
    if (!(await deps.updateProfile(userId, image))) throw new AvatarError('User not found.', 404);
    return { image };
  };
}

export const saveUserAvatar = createUserAvatarService({
  getCards: getMergedCardList,
  fetchSource: fetchAvatarSource,
  storageAvailable: () =>
    !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
  async upload(key, body) {
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: 'swu-images',
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        // The object key is overwritten. Revalidate old profile URLs too, while
        // the new query revision immediately refreshes the saving user's image.
        CacheControl: 'public, max-age=0, must-revalidate',
      }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
  },
  async updateProfile(userId, image) {
    const rows = await db
      .update(user)
      .set({ image, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id });
    return rows.length > 0;
  },
});
