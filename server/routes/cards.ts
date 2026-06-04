import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { fetchCardDecksData } from '../lib/cards/card-decks.ts';
import {
  buildCardListUpdateSection,
  buildPreviewCardListUpdateSection,
  getOfficialCardList,
  getOfficialCardListVersion,
} from '../lib/cards/cardListProvider.ts';
import { getKarabastUnimplementedMap } from '../lib/karabast/unimplementedCardsCache.ts';
import type { KarabastUnimplementedMap } from '../lib/karabast/unimplementedCards.ts';
import type { AuthExtension } from '../auth/auth.ts';

// Re-exported for backward compatibility with any code still importing from here.
export const cardListLastUpdated = getOfficialCardListVersion();

const clientVersionSchema = z.object({
  officialLastUpdated: z.string().optional(),
  previewLastUpdated: z.string().optional(),
  // Legacy field: treated as officialLastUpdated when officialLastUpdated is absent.
  lastUpdated: z.string().optional(),
});

const cardDecksQuerySchema = z.object({
  tournamentId: z.string().optional(),
  tournamentGroupId: z.string().optional(),
  metaId: z.coerce.number().optional(),
  leaderCardId: z.string().optional(),
  baseCardId: z.string().optional(),
});

async function getKarabastUnimplementedMapForResponse(): Promise<KarabastUnimplementedMap> {
  try {
    return await getKarabastUnimplementedMap();
  } catch (error) {
    console.error('Error fetching Karabast unimplemented card map:', error);
    return {};
  }
}

export const cardsRoute = new Hono<AuthExtension>()
  .get('/:id/decks', zValidator('query', cardDecksQuerySchema), async c => {
    const cardId = c.req.param('id');
    const { tournamentId, tournamentGroupId, metaId, leaderCardId, baseCardId } =
      c.req.valid('query');

    if (!tournamentId && !tournamentGroupId && !metaId) {
      return c.json(
        { error: 'Either tournamentId, tournamentGroupId or metaId must be provided' },
        400,
      );
    }

    try {
      const data = await fetchCardDecksData({
        cardId,
        tournamentId,
        tournamentGroupId,
        metaId,
        leaderCardId,
        baseCardId,
      });

      return c.json({ data });
    } catch (error) {
      console.error('Error fetching card decks:', error);
      return c.json({ error: 'Failed to fetch card decks' }, 500);
    }
  })
  .post('/', zValidator('json', clientVersionSchema), async c => {
    const { officialLastUpdated, previewLastUpdated, lastUpdated } = c.req.valid('json');

    // Resolve effective official version from the client: prefer the new field, fall
    // back to the legacy `lastUpdated` field so old clients keep working.
    const effectiveOfficialLastUpdated = officialLastUpdated ?? lastUpdated;
    const officialVersion = getOfficialCardListVersion();
    const [preview, karabastUnimplemented] = await Promise.all([
      buildPreviewCardListUpdateSection(previewLastUpdated),
      getKarabastUnimplementedMapForResponse(),
    ]);

    return c.json({
      official: buildCardListUpdateSection(
        effectiveOfficialLastUpdated,
        officialVersion,
        getOfficialCardList(),
      ),
      preview,
      karabast_unimplemented: karabastUnimplemented,
    });
  });
