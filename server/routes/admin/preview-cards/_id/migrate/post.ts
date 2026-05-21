import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { previewCard } from '../../../../../db/schema/preview_card.ts';
import { invalidatePreviewCardCache } from '../../../../../lib/cards/cardListProvider.ts';
import { toAdminPreviewCardRow, zPreviewCardMigrateBody } from '../../lib.ts';

const zParams = z.object({ id: z.uuid() });

export const previewCardsIdMigratePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zParams),
  zValidator('json', zPreviewCardMigrateBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { id } = c.req.valid('param');
    const { officialCardId } = c.req.valid('json');
    const [updated] = await db
      .update(previewCard)
      .set({
        status: 'migrated',
        officialCardId: officialCardId.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(previewCard.id, id))
      .returning();

    if (!updated) {
      return c.json({ message: 'Preview card not found' }, 404);
    }

    invalidatePreviewCardCache();
    return c.json({ data: toAdminPreviewCardRow(updated) });
  },
);
