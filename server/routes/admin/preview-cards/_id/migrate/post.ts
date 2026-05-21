import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { invalidatePreviewCardCache } from '../../../../../lib/cards/cardListProvider.ts';
import { toAdminPreviewCardRow, zPreviewCardMigrateBody } from '../../lib.ts';
import {
  migratePreviewCardToOfficial,
  PreviewCardMigrationError,
} from '../../../../../lib/cards/previewCardMigration.ts';

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

    try {
      const result = await migratePreviewCardToOfficial(id, officialCardId);
      invalidatePreviewCardCache();

      return c.json({
        data: toAdminPreviewCardRow(result.previewCard),
        migration: result.migration,
      });
    } catch (error) {
      if (error instanceof PreviewCardMigrationError) {
        return c.json({ message: error.message }, error.statusCode as 400 | 404);
      }

      console.error('Failed to migrate preview card:', error);
      return c.json(
        {
          message: 'Failed to migrate preview card',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
