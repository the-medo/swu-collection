import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { db } from '../../../../db';
import { previewCard } from '../../../../db/schema/preview_card.ts';
import { invalidatePreviewCardCache } from '../../../../lib/cards/cardListProvider.ts';
import {
  formatPreviewCardPayloadError,
  normalizePreviewCardUpdateInput,
  toAdminPreviewCardRow,
  zPreviewCardUpdateBody,
} from '../lib.ts';

const zParams = z.object({ id: z.uuid() });

export const previewCardsIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zPreviewCardUpdateBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    try {
      const { id } = c.req.valid('param');
      const updates = normalizePreviewCardUpdateInput(c.req.valid('json'));
      const [updated] = await db
        .update(previewCard)
        .set(updates)
        .where(eq(previewCard.id, id))
        .returning();

      if (!updated) {
        return c.json({ message: 'Preview card not found' }, 404);
      }

      invalidatePreviewCardCache();
      return c.json({ data: toAdminPreviewCardRow(updated) });
    } catch (error) {
      return c.json(
        {
          message: 'Failed to update preview card',
          error: formatPreviewCardPayloadError(error),
        },
        400,
      );
    }
  },
);
