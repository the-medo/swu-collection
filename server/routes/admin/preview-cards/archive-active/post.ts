import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { db } from '../../../../db';
import { previewCard } from '../../../../db/schema/preview_card.ts';
import { invalidatePreviewCardCache } from '../../../../lib/cards/cardListProvider.ts';

export const previewCardsArchiveActivePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const archived = await db
    .update(previewCard)
    .set({ status: 'archived', updatedAt: new Date().toISOString() })
    .where(eq(previewCard.status, 'active'))
    .returning({ id: previewCard.id });

  invalidatePreviewCardCache();
  return c.json({ data: { archivedCount: archived.length } });
});
