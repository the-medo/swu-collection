import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { db } from '../../../db';
import { previewCard } from '../../../db/schema/preview_card.ts';
import { invalidatePreviewCardCache } from '../../../lib/cards/cardListProvider.ts';
import {
  formatPreviewCardPayloadError,
  normalizePreviewCardCreateInput,
  toAdminPreviewCardRow,
  zPreviewCardCreateBody,
} from './lib.ts';

export const previewCardsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zPreviewCardCreateBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    try {
      const values = normalizePreviewCardCreateInput(c.req.valid('json'));
      const now = new Date().toISOString();
      const [created] = await db
        .insert(previewCard)
        .values({
          ...values,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      invalidatePreviewCardCache();
      return c.json({ data: toAdminPreviewCardRow(created) }, 201);
    } catch (error) {
      return c.json(
        {
          message: 'Failed to create preview card',
          error: formatPreviewCardPayloadError(error),
        },
        400,
      );
    }
  },
);
