import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const { id } = c.req.valid('param');
    // TODO: delete if not used, otherwise archive
    return c.json(
      {
        data: { id },
        note: 'Not implemented yet. Deletes the card pool if unused, otherwise archives it.',
      },
      501,
    );
  },
);
