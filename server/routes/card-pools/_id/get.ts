import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const { id } = c.req.valid('param');
    // TODO: fetch single card pool if user has rights
    return c.json(
      {
        data: { id },
        note: 'Not implemented yet. Returns info about a single card pool if user can see it.',
      },
      501,
    );
  },
);
