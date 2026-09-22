import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zDeckImportRequest } from '../../../../types/DeckImport.ts';
import type { AuthExtension } from '../../../auth/auth.ts';
import { DeckBuilderError, getDeckBuilderForLink } from '../../../lib/decks/deckBuilders.ts';
import { importDeckForUser } from '../../../lib/decks/importDeck.ts';

export const decksImportPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckImportRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    try {
      const { deckLink, format } = c.req.valid('json');
      const builder = getDeckBuilderForLink(deckLink);
      const sourceDeckId = builder.getDeckId(deckLink);
      const sourceDeck = await builder.fetchDeck(sourceDeckId);
      const importedDeck = await importDeckForUser({
        userId: user.id,
        builder,
        deckId: sourceDeckId,
        sourceDeck,
        format,
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
