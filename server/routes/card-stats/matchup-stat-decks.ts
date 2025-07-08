import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../db';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { cardStatMatchupInfo } from '../../db/schema/card_stat_matchup_schema.ts';
import { decompressMatchupInfo } from '../../lib/card-statistics/matchup-stats/utils.ts';
import { fetchDecksByIds } from '../../lib/decks/fetchDecksByIds.ts';

// Define query parameters schema for matchup-stats-decks endpoint
const zMatchupStatsDecksQueryParams = z.object({
  overviewId: z.string().uuid(),
  key: z.string(),
});

export const matchupStatDecksRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zMatchupStatsDecksQueryParams),
  async c => {
    const { overviewId, key } = c.req.valid('query');

    // Fetch the compressed data from cardStatMatchupInfo
    const matchupInfo = await db
      .select({ info: cardStatMatchupInfo.info })
      .from(cardStatMatchupInfo)
      .where(eq(cardStatMatchupInfo.id, overviewId))
      .then(rows => rows[0]);

    if (!matchupInfo) {
      return c.json({ error: 'Matchup info not found' }, 404);
    }

    // Decompress the data
    const decompressedData = decompressMatchupInfo(matchupInfo.info);
    const { deckIntegerMap, cardDeckMap } = decompressedData;

    // Parse the key parameter by splitting it by "|"
    const keyParts = key.split('|');

    // Navigate through the decompressed data using the key parts
    let currentData = cardDeckMap;
    for (const part of keyParts) {
      if (currentData === undefined) {
        console.log('Part: ', part, ' - NOT FOUND');
        return c.json({ error: 'Invalid key path' }, 400);
      }
      console.log('Part: ', part, ' - OK');
      console.log({ currentData });
      currentData = currentData[part];
    }

    if (!currentData || !Array.isArray(currentData)) {
      return c.json({ error: 'No deck numbers found for the given key' }, 404);
    }

    // Map deck numbers to deck IDs
    const deckIds = currentData
      .map(deckNumber => {
        // Find the deck ID for this deck number in the deckIntegerMap
        for (const [deckId, number] of Object.entries(deckIntegerMap)) {
          if (number === deckNumber) {
            return deckId;
          }
        }
        return null;
      })
      .filter(Boolean) as string[]; // Remove null values

    // Fetch full deck data using the deck IDs
    const decks = await fetchDecksByIds(deckIds);

    // Return the full deck data
    return c.json({
      data: {
        decks,
      },
    });
  },
);
