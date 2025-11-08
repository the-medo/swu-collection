import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  // Full replacement of card pool contents: array of entries { cardId, cardPoolNumber }
  cards: z
    .array(
      z.object({
        cardId: z.string(),
        cardPoolNumber: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const cardPoolsIdCardsPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    // TODO: replace card pool contents if no deck has been created from this pool
    return c.json(
      {
        data: { poolId: id, replacedWith: body.cards.length },
        note: 'Not implemented yet. Replaces cards for the card pool when allowed.',
      },
      501,
    );
  },
);
