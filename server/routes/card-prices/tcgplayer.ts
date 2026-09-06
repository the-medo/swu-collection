import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { requireAdmin } from '../../auth/requireAdmin.ts';
import { fetchTcgPlayerGroups, fetchTcgPlayerProducts } from '../../lib/card-prices/tcgcsv.ts';

const groupParams = z.object({
  groupId: z.coerce.number().int().positive(),
});

export const cardPricesTcgPlayerRoute = new Hono<AuthExtension>()
  .get('/groups', async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    return c.json({ data: await fetchTcgPlayerGroups() });
  })
  .get('/groups/:groupId/products', zValidator('param', groupParams), async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { groupId } = c.req.valid('param');
    return c.json({ data: await fetchTcgPlayerProducts(groupId) });
  });
