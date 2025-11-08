import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  public: z.boolean().default(false),
});

export const cardPoolsIdDecksPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    // TODO: create new deck associated with the given card pool
    return c.json(
      {
        data: { deckId: '00000000-0000-0000-0000-000000000000', poolId: id, ...body },
        note: 'Not implemented yet. Should create a new deck for the given card pool.',
      },
      501,
    );
  },
);
