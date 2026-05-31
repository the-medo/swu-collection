import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { db } from '../../../../db';
import { previewCard } from '../../../../db/schema/preview_card.ts';
import { invalidatePreviewCardCache } from '../../../../lib/cards/cardListProvider.ts';
import { toAdminPreviewCardRow } from '../lib.ts';

const zParams = z.object({ id: z.uuid() });

export const previewCardsIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { id } = c.req.valid('param');
    const [updated] = await db
      .update(previewCard)
      .set({ status: 'archived', updatedAt: new Date().toISOString() })
      .where(eq(previewCard.id, id))
      .returning();

    if (!updated) {
      return c.json({ message: 'Preview card not found' }, 404);
    }

    invalidatePreviewCardCache();
    return c.json({ data: toAdminPreviewCardRow(updated) });
  },
);
