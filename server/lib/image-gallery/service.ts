import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { imageGallery as images } from '../../db/schema/image_gallery.ts';
import {
  imageGalleryPageSize,
  recommendedHeaderImageWidth,
  type GalleryImage,
  type ImageGallery,
} from '../../../types/ImageGallery.ts';
import { maxUserFileBytes } from '../../../types/UserFile.ts';
import { UserFileError } from '../user-files/errors.ts';
import { optimizeUserImage } from '../user-files/optimize.ts';
import { createUserFileStorage, type UserFileObjectStorage } from '../user-files/storage.ts';

function dto(row: typeof images.$inferSelect, storage: UserFileObjectStorage): GalleryImage {
  const { imageKey, thumbnailKey, ...image } = row;
  return {
    ...image,
    url: storage.publicUrl(imageKey),
    thumbnailUrl: storage.publicUrl(thumbnailKey),
  };
}

export async function optimizeGalleryImage(file: File) {
  // Keep high-resolution artwork, with the same format, EXIF and decode safeguards as uploads.
  const result = await optimizeUserImage(file, {
    maxDimension: 8192,
    quality: 90,
    preserveWidth: recommendedHeaderImageWidth,
  });
  if (result.image.length > maxUserFileBytes)
    throw new UserFileError('The processed image exceeds 10 MB. Choose a smaller image.', 413);
  return result;
}

export function createImageGalleryService(
  storage: UserFileObjectStorage = createUserFileStorage(),
) {
  return {
    async list(page: number): Promise<ImageGallery> {
      const rows = await db
        .select()
        .from(images)
        .orderBy(desc(images.createdAt), desc(images.id))
        .limit(imageGalleryPageSize + 1)
        .offset(page * imageGalleryPageSize);
      return {
        images: rows.slice(0, imageGalleryPageSize).map(row => dto(row, storage)),
        hasMore: rows.length > imageGalleryPageSize,
        uploadsEnabled: storage.available(),
      };
    },
    async create(title: string, file: File): Promise<GalleryImage> {
      if (!storage.available()) throw new UserFileError('Image storage is not configured.', 503);
      const optimized = await optimizeGalleryImage(file);
      const id = crypto.randomUUID();
      const keys = {
        imageKey: `image-gallery/${id}.webp`,
        thumbnailKey: `image-gallery/${id}-thumb.webp`,
      };
      try {
        await storage.put(keys.imageKey, optimized.image);
        await storage.put(keys.thumbnailKey, optimized.thumbnail);
        const [row] = await db
          .insert(images)
          .values({ id, title, ...keys, width: optimized.width, height: optimized.height })
          .returning();
        return dto(row, storage);
      } catch (error) {
        const cleanup = await Promise.allSettled(
          Object.values(keys).map(key => storage.remove(key)),
        );
        if (cleanup.some(result => result.status === 'rejected'))
          console.error('Gallery upload cleanup failed', { id });
        throw error;
      }
    },
    async remove(id: string) {
      await db.transaction(async tx => {
        const [row] = await tx.select().from(images).where(eq(images.id, id)).for('update');
        if (!row) throw new UserFileError('Gallery image not found.', 404);
        for (const key of [row.imageKey, row.thumbnailKey]) await storage.remove(key);
        await tx.delete(images).where(eq(images.id, id));
      });
      return { id };
    },
  };
}

export const imageGalleryService = createImageGalleryService();
