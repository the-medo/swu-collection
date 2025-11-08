import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';

// Returns necessary info from `decks`, `card_pool_decks` and `card_pool_deck_cards`
const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });

export const cardPoolsIdDecksDeckIdGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const { id, deckId } = c.req.valid('param');
    // TODO: join and return data from required tables for given deckId within card pool id
    return c.json(
      {
        data: { poolId: id, deckId, deck: null, card_pool_decks: null, card_pool_deck_cards: [] },
        note: 'Not implemented yet. Should return deck info with pool/deck relations and cards.',
      },
      501,
    );
  },
);
