import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { previewCard } from '../../../../../db/schema/preview_card.ts';
import { transformToId } from '../../../../../../lib/swu-resources/lib/transformToId.ts';

const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const MAX_WEBP_DIMENSION = 419;
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

const zParams = z.object({ id: z.uuid() });
const zImageSide = z.enum(['front', 'back']);

export const previewCardsIdImagePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zParams),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { id } = c.req.valid('param');
    const [row] = await db.select().from(previewCard).where(eq(previewCard.id, id)).limit(1);
    if (!row) {
      return c.json({ message: 'Preview card not found' }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get('image');
    const sideInput = formData.get('side');
    const variantInput = formData.get('variantId');

    if (!file || !(file instanceof File)) {
      return c.json({ message: 'No image file provided' }, 400);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ message: 'Invalid file type. Allowed: PNG, JPEG, WebP' }, 400);
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json({ message: 'File too large. Max 8MB' }, 400);
    }

    const sideResult = zImageSide.safeParse(typeof sideInput === 'string' ? sideInput : 'front');
    if (!sideResult.success) {
      return c.json({ message: 'Invalid image side. Allowed: front, back' }, 400);
    }

    if (!r2Endpoint || !accessKeyId || !secretAccessKey) {
      return c.json({ message: 'R2 image storage is not configured' }, 500);
    }

    const side = sideResult.data;
    const variantId = typeof variantInput === 'string' ? variantInput : '';

    try {
      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(inputBuffer).metadata();
      const horizontal = (metadata.width ?? 0) > (metadata.height ?? 0);
      const webpBuffer = await sharp(inputBuffer)
        .resize({
          width: MAX_WEBP_DIMENSION,
          height: MAX_WEBP_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const filenameVariantId = transformToId(variantId || row.cardId);
      const filename = `${filenameVariantId}-${side}-${Date.now()}.webp`;
      const image = `preview/${filename}`;
      const key = `cards/${image}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: webpBuffer,
          ContentType: 'image/webp',
        }),
      );

      return c.json({
        data: {
          image,
          horizontal,
        },
      });
    } catch (error) {
      console.error('Failed to upload preview card image:', error);
      return c.json(
        {
          message: 'Failed to upload preview card image',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
