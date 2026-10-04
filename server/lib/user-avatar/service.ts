import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userAvatar } from '../../db/schema/user_avatar.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { UserAvatarInput, UserAvatarSource } from '../../../types/UserAvatar.ts';
import { AvatarError, cropAvatar, fetchAvatarSource, resolveAvatarImage } from './image.ts';

type AvatarDependencies = {
  getCards(): Promise<CardList>;
  fetchSource(url: string): Promise<Uint8Array>;
  storageAvailable(): boolean;
  upload(key: string, body: Buffer): Promise<void>;
  updateProfile(userId: string, image: string, source: UserAvatarSource): Promise<boolean>;
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
    const source = { cardId: input.cardId, variantId: input.variantId, side: input.side };
    if (!(await deps.updateProfile(userId, image, source)))
      throw new AvatarError('User not found.', 404);
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
  updateProfile: persistUserAvatar,
});

export async function persistUserAvatar(userId: string, image: string, source: UserAvatarSource) {
  return db.transaction(async tx => {
    const updatedAt = new Date();
    const rows = await tx
      .update(user)
      .set({ image, updatedAt })
      .where(eq(user.id, userId))
      .returning({ id: user.id });
    if (!rows.length) return false;
    await tx
      .insert(userAvatar)
      .values({ userId, image, ...source, updatedAt })
      .onConflictDoUpdate({ target: userAvatar.userId, set: { image, ...source, updatedAt } });
    return true;
  });
}

export async function getUserAvatarSource(userId: string): Promise<UserAvatarSource | null> {
  const [source] = await db
    .select({ cardId: userAvatar.cardId, variantId: userAvatar.variantId, side: userAvatar.side })
    .from(userAvatar)
    .innerJoin(user, eq(user.id, userAvatar.userId))
    .where(and(eq(userAvatar.userId, userId), eq(userAvatar.image, user.image)));
  return source ?? null;
}
