import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { imageGallery } from '../../db/schema/image_gallery.ts';
import { createImageGalleryService, optimizeGalleryImage } from './service.ts';
import { UserFileError } from '../user-files/errors.ts';

async function image(width: number, height = 800) {
  const bytes = await sharp({ create: { width, height, channels: 3, background: '#abc' } })
    .png()
    .toBuffer();
  return new File([new Uint8Array(bytes)], 'artwork.png', { type: 'image/png' });
}

test('gallery accepts small images, preserves high-resolution art and rejects invalid sources', async () => {
  const result = await optimizeGalleryImage(await image(4000));
  expect(result).toMatchObject({ width: 4000, height: 800 });
  expect((await sharp(result.image).metadata()).format).toBe('webp');
  expect((await sharp(result.thumbnail).metadata()).width).toBe(400);
  expect((await sharp(result.image).metadata()).exif).toBeUndefined();
  const tall = await optimizeGalleryImage(await image(1600, 9000));
  expect(tall.width).toBeGreaterThanOrEqual(1500);
  expect(tall.height).toBeGreaterThan(8192);
  expect(await optimizeGalleryImage(await image(1499))).toMatchObject({ width: 1499, height: 800 });
  expect(await optimizeGalleryImage(await image(30, 20))).toMatchObject({ width: 30, height: 20 });
  await expect(optimizeGalleryImage(new File(['<svg/>'], 'fake.png'))).rejects.toMatchObject({
    status: 400,
  });
});

test.skipIf(process.env.IMAGE_GALLERY_DB_TEST !== '1')(
  'gallery upload, public projection, failed-write cleanup and retryable deletion use isolated storage',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const objects = new Map<string, Uint8Array>();
    let failPut = false,
      failRemove = false;
    const ids: string[] = [];
    const service = createImageGalleryService({
      available: () => true,
      publicUrl: key => `https://images.example.com/${key}`,
      async put(key, bytes) {
        objects.set(key, bytes);
        if (failPut && key.includes('-thumb')) throw new UserFileError('Upload failed.', 502);
      },
      async remove(key) {
        if (failRemove) throw new UserFileError('Delete failed.', 502);
        objects.delete(key);
      },
    });
    try {
      const file = await image(600, 400);
      failPut = true;
      await expect(service.create('Failed artwork', file)).rejects.toMatchObject({ status: 502 });
      expect(objects.size).toBe(0);
      failPut = false;
      const saved = await service.create('Gallery fixture', file);
      ids.push(saved.id);
      expect(saved).toMatchObject({ title: 'Gallery fixture', width: 600, height: 400 });
      expect(saved).not.toHaveProperty('imageKey');
      expect(saved).not.toHaveProperty('fileName');
      expect(saved.url).toEndWith(`/image-gallery/${saved.id}.webp`);
      expect((await service.list(0)).images.some(image => image.id === saved.id)).toBe(true);
      expect(objects.size).toBe(2);
      failRemove = true;
      await expect(service.remove(saved.id)).rejects.toMatchObject({ status: 502 });
      expect(
        (await db.select().from(imageGallery).where(eq(imageGallery.id, saved.id))).length,
      ).toBe(1);
      failRemove = false;
      await service.remove(saved.id);
      expect(objects.size).toBe(0);
      await expect(service.remove(saved.id)).rejects.toMatchObject({ status: 404 });
    } finally {
      for (const id of ids) await db.delete(imageGallery).where(eq(imageGallery.id, id));
    }
  },
);
