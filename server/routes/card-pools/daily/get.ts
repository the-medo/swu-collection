import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { dailySealedDateSchema } from '../../../../shared/types/dailySealed.ts';
import { getDailySealedPool } from '../../../lib/card-pools/daily-sealed.ts';

export const dailyCardPoolGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', z.object({ date: dailySealedDateSchema.optional() })),
  async c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ data: await getDailySealedPool(c.req.valid('query').date) });
  },
);
