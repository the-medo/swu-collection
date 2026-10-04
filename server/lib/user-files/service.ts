import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { userFile as files, userFileStorage as quotas } from '../../db/schema/user_file.ts';
import { userFilesPageSize, type UserFile, type UserFiles } from '../../../types/UserFile.ts';
import { UserFileError } from './errors.ts';
import { optimizeUserImage } from './optimize.ts';
import {
  createUserFileStorage,
  userFileObjectKeys,
  type UserFileObjectStorage,
} from './storage.ts';

const owned = (userId: string, id: string) => and(eq(files.userId, userId), eq(files.id, id));
function dto(row: typeof files.$inferSelect, storage: UserFileObjectStorage): UserFile {
  const { userId, imageKey, thumbnailKey, ...file } = row;
  return {
    ...file,
    url: storage.publicUrl(imageKey),
    thumbnailUrl: storage.publicUrl(thumbnailKey),
  };
}
const usageColumns = {
  usedBytes: sql<number>`coalesce(sum(${files.byteSize}::bigint + ${files.thumbnailByteSize}), 0)::float8`,
  fileCount: sql<number>`count(*)::int`,
};
export function createUserFileService(storage: UserFileObjectStorage = createUserFileStorage()) {
  return {
    async list(userId: string, page: number): Promise<UserFiles> {
      await db.insert(quotas).values({ userId }).onConflictDoNothing();
      return db.transaction(
        async tx => {
          const [quota] = await tx.select().from(quotas).where(eq(quotas.userId, userId));
          const [usage] = await tx.select(usageColumns).from(files).where(eq(files.userId, userId));
          const rows = await tx
            .select()
            .from(files)
            .where(eq(files.userId, userId))
            .orderBy(desc(files.createdAt), desc(files.id))
            .limit(userFilesPageSize + 1)
            .offset(page * userFilesPageSize);
          return {
            files: rows.slice(0, userFilesPageSize).map(row => dto(row, storage)),
            ...usage,
            quotaBytes: quota.quotaBytes,
            hasMore: rows.length > userFilesPageSize,
            uploadsEnabled: storage.available(),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async create(userId: string, file: File) {
      if (!storage.available()) throw new UserFileError('Image storage is not configured.', 503);
      const optimized = await optimizeUserImage(file);
      const id = crypto.randomUUID();
      const keys = userFileObjectKeys(userId, id);
      let attemptedUpload = false;
      try {
        return await db.transaction(async tx => {
          await tx.insert(quotas).values({ userId }).onConflictDoNothing();
          // Lock the entitlement across the quota check and both object writes.
          // Concurrent uploads and quota changes cannot overspend the allowance.
          const [quota] = await tx
            .select()
            .from(quotas)
            .where(eq(quotas.userId, userId))
            .for('update');
          const [usage] = await tx.select(usageColumns).from(files).where(eq(files.userId, userId));
          if (
            usage.usedBytes + optimized.image.length + optimized.thumbnail.length >
            quota.quotaBytes
          )
            throw new UserFileError('Storage is full. Delete some images and try again.', 409);
          attemptedUpload = true;
          await storage.put(keys.imageKey, optimized.image);
          await storage.put(keys.thumbnailKey, optimized.thumbnail);
          const [row] = await tx
            .insert(files)
            .values({
              id,
              userId,
              ...keys,
              fileName:
                file.name
                  .split(/[\\/]/)
                  .pop()!
                  .replace(/[\u0000-\u001f\u007f]/g, '')
                  .slice(0, 255) || 'image',
              originalByteSize: file.size,
              byteSize: optimized.image.length,
              thumbnailByteSize: optimized.thumbnail.length,
              width: optimized.width,
              height: optimized.height,
            })
            .returning();
          return dto(row, storage);
        });
      } catch (error) {
        // Also clean up an uncertain/partially successful object write.
        if (attemptedUpload) {
          const cleanup = await Promise.allSettled(
            Object.values(keys).map(key => storage.remove(key)),
          );
          if (cleanup.some(result => result.status === 'rejected'))
            console.error('User image upload cleanup failed', { id });
        }
        throw error;
      }
    },
    async read(id: string, thumbnail: boolean) {
      const [row] = await db
        .select({ imageKey: files.imageKey, thumbnailKey: files.thumbnailKey })
        .from(files)
        .where(eq(files.id, id));
      if (!row) throw new UserFileError('Image not found.', 404);
      return { redirect: storage.publicUrl(thumbnail ? row.thumbnailKey : row.imageKey) };
    },
    async remove(userId: string, id: string) {
      await db.transaction(async tx => {
        // Match upload lock ordering and keep metadata/quota on storage failure for retry.
        await tx.select().from(quotas).where(eq(quotas.userId, userId)).for('update');
        const [row] = await tx.select().from(files).where(owned(userId, id)).for('update');
        if (!row) throw new UserFileError('Image not found.', 404);
        for (const key of [row.imageKey, row.thumbnailKey]) await storage.remove(key);
        await tx.delete(files).where(owned(userId, id));
      });
      return { id };
    },
  };
}
export const userFileService = createUserFileService();
