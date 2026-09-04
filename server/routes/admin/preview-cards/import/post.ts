import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import {
  buildImportedPreviewCard,
  fetchImportResponse,
  fetchRemote,
  MAX_REMOTE_IMAGE_BYTES,
  PreviewCardImportError,
  zPreviewCardImportDefinition,
} from '../../../../lib/cards/previewCardImport.ts';
import { storePreviewCardImage } from '../../../../lib/cards/previewCardImageStorage.ts';
import { normalizePreviewCardPayload } from '../../../../lib/cards/previewCardPayload.ts';

const zBody = z.object({
  sourceUrl: z.string().url(),
  definition: zPreviewCardImportDefinition,
});

export const previewCardsImportPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    try {
      const { sourceUrl, definition } = c.req.valid('json');
      const response = await fetchImportResponse(definition, sourceUrl);
      const imported = buildImportedPreviewCard(definition, sourceUrl, response);
      const variant = Object.values(imported.payload.variants)[0];
      if (!variant) return c.json({ message: 'Imported payload has no variant' }, 400);

      for (const remoteImage of imported.images) {
        const fetched = await fetchRemote(remoteImage.url, {}, MAX_REMOTE_IMAGE_BYTES);
        const stored = await storePreviewCardImage({
          ...fetched,
          filenameBase: variant.variantId,
          side: remoteImage.side,
        });
        variant.image[remoteImage.side] = stored.image;
        variant[remoteImage.side] = { horizontal: stored.horizontal };
        if (remoteImage.side === 'front') imported.payload.front.horizontal = stored.horizontal;
        if (remoteImage.side === 'back') {
          imported.payload.back ??= { type: imported.payload.type };
          imported.payload.back.horizontal = stored.horizontal;
        }
      }

      return c.json({ data: normalizePreviewCardPayload(imported.payload) });
    } catch (error) {
      if (error instanceof PreviewCardImportError || error instanceof z.ZodError) {
        return c.json({ message: error.message }, 400);
      }
      console.error('Failed to import preview card:', error);
      return c.json({ message: 'Failed to import preview card' }, 502);
    }
  },
);
