import { Hono } from 'hono';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../../../db';
import { team as teamTable } from '../../../../db/schema/team.ts';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';

const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export const teamsIdLogoPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));

  // Check ownership
  const membership = await getTeamMembership(teamId, user.id);

  if (!membership || membership.role !== 'owner') {
    return c.json({ message: 'Only team owners can upload a logo' }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get('logo');

  if (!file || !(file instanceof File)) {
    return c.json({ message: 'No logo file provided' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ message: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' }, 400);
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return c.json({ message: 'File too large. Max 2MB' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type.split('/')[1].replace('svg+xml', 'svg');
  const key = `teams/logos/${teamId}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  const logoUrl = `https://images.swubase.com/${key}`;

  const [updated] = await db
    .update(teamTable)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(teamTable.id, teamId))
    .returning();

  return c.json({ data: updated });
});
