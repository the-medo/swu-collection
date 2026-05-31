import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { db } from '../../../db';
import { previewCard } from '../../../db/schema/preview_card.ts';
import { createPreviewCardPayloadTemplate } from '../../../lib/cards/previewCardPayload.ts';
import { toAdminPreviewCardRow } from './lib.ts';

export const previewCardsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const rows = await db.select().from(previewCard).orderBy(desc(previewCard.updatedAt));

  return c.json({
    data: rows.map(toAdminPreviewCardRow),
    template: createPreviewCardPayloadTemplate(),
  });
});
