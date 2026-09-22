import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { zDeckImportFormat } from '../../../../types/DeckImport.ts';
import { DeckBuilderError, getDeckBuilderForSource } from '../../../lib/decks/deckBuilders.ts';
import { importDeckForUser } from '../../../lib/decks/importDeck.ts';

const zDeckImportSwudbRequest = z.object({
  swudbDeckId: z.string().min(1),
  format: zDeckImportFormat,
});

export const decksImportSwudbPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckImportSwudbRequest),
  async c => {
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    try {
      const builder = getDeckBuilderForSource('swudb');
      const sourceDeck = await builder.fetchDeck(data.swudbDeckId);
      const importedDeck = await importDeckForUser({
        userId: user.id,
        builder,
        deckId: data.swudbDeckId,
        sourceDeck,
        format: data.format,
      });

      return c.json({ data: importedDeck }, 201);
    } catch (error) {
      if (error instanceof DeckBuilderError) {
        return c.json({ message: error.message }, error.status);
      }
      throw error;
    }
  },
);
